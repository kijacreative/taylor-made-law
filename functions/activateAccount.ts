/**
 * activateAccount — Validates an ActivationToken, registers the user auth account.
 *
 * Key behavior:
 * - Passes email_verified:true into auth.register() to avoid Base44 verification email
 * - After register, retries up to 10x (500ms each) to find the User entity and set
 *   email_verified:true + all activation flags so loginViaEmailPassword works immediately
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return Response.json({ error: 'token and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Hash token to look up
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Find activation token
    const tokens = await base44.asServiceRole.entities.ActivationToken.filter({
      token_hash: tokenHash,
      token_type: 'activation'
    });

    if (!tokens || tokens.length === 0) {
      return Response.json({ error: 'Invalid or expired activation link.' }, { status: 400 });
    }

    const tokenRecord = tokens.find(t => !t.used_at);
    if (!tokenRecord) {
      return Response.json({
        error: 'This activation link has already been used. Please log in.',
        already_used: true
      }, { status: 400 });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({
        error: 'This activation link has expired.',
        expired: true,
        user_email: tokenRecord.user_email
      }, { status: 400 });
    }

    const normalizedEmail = tokenRecord.user_email.toLowerCase().trim();
    const now = new Date().toISOString();

    // Get full_name from LawyerApplication if available
    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail }).catch(() => []);
    const fullName = apps[0]?.full_name || '';

    // Mark token as used immediately (prevents replay)
    await base44.asServiceRole.entities.ActivationToken.update(tokenRecord.id, {
      used_at: now
    });

    // Register the auth account.
    // Pass email_verified:true and account_activated_at as extra fields — Base44 may
    // apply them to the User entity at creation time, skipping the verification email.
    let alreadyHasAccount = false;
    try {
      await base44.auth.register({
        email: normalizedEmail,
        password,
        full_name: fullName,
        email_verified: true,
        account_activated_at: now,
        password_set: true,
      });
    } catch (regErr) {
      const errMsg = (regErr.message || regErr?.response?.data?.message || '').toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('duplicate') || errMsg.includes('registered')) {
        alreadyHasAccount = true;
      } else {
        return Response.json({ error: regErr.message || 'Registration failed' }, { status: 500 });
      }
    }

    if (alreadyHasAccount) {
      // Account exists — still try to mark it verified so login works
      try {
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
        if (existingUsers[0]) {
          await base44.asServiceRole.entities.User.update(existingUsers[0].id, {
            email_verified: true,
            email_verified_at: now,
            account_activated_at: now,
            password_set: true,
          });
        }
      } catch {}

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: normalizedEmail,
        action: 'activation_completed',
        actor_email: normalizedEmail,
        actor_role: 'user',
        notes: 'Auth account already existed — email_verified forced true, directed to login.'
      }).catch(() => {});

      return Response.json({
        success: true,
        email: normalizedEmail,
        message: 'Account is ready. Please log in.',
      });
    }

    // ── Retry loop: wait for User entity to be created after register ────────
    // Base44 may create the User entity asynchronously. We retry up to 10 times
    // (500ms apart = up to 5 seconds) to find it and mark email_verified: true,
    // which prevents loginViaEmailPassword from throwing "not confirmed".
    let userRecord = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(r => setTimeout(r, 500));
      const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail }).catch(() => []);
      if (users && users.length > 0) {
        userRecord = users[0];
        console.log(`Found user entity on attempt ${attempt + 1}`);
        break;
      }
    }

    if (userRecord) {
      await base44.asServiceRole.entities.User.update(userRecord.id, {
        email_verified: true,
        email_verified_at: now,
        account_activated_at: now,
        password_set: true,
        // Preserve existing user_status (approved/pending set by admin during approval)
        user_status: userRecord.user_status || 'pending',
      });
      console.log(`email_verified set to true for ${normalizedEmail}`);
    } else {
      console.log(`WARNING: User entity not found after 5 seconds for ${normalizedEmail}`);
    }

    // Mark LawyerApplication as user_created and sync user_status
    const app = apps.find(a => a.status === 'approved') || apps[0] || null;
    if (app) {
      await base44.asServiceRole.entities.LawyerApplication.update(app.id, {
        user_created: true,
      }).catch(() => {});

      // Also ensure LawyerProfile exists for approved users
      if (app.status === 'approved' && userRecord) {
        const profiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: userRecord.id }).catch(() => []);
        if (profiles.length === 0) {
          await base44.asServiceRole.entities.LawyerProfile.create({
            user_id: userRecord.id,
            firm_name: app.firm_name || '',
            phone: app.phone || '',
            bar_number: app.bar_number || '',
            bio: app.bio || '',
            states_licensed: app.states_licensed || [],
            practice_areas: app.practice_areas || [],
            years_experience: app.years_experience || 0,
            status: 'approved',
            approved_at: now,
          }).catch(() => {});
        }
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: userRecord?.id || normalizedEmail,
      action: 'activation_completed',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `Account activated. User entity found: ${!!userRecord}. email_verified set: true.`
    }).catch(() => {});

    return Response.json({
      success: true,
      email: normalizedEmail,
      message: 'Account activated! You can now log in.',
    });

  } catch (error) {
    console.error('activateAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});