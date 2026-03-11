/**
 * activateAccount — Option C Unified Identity.
 * Works for ALL flows: invite, apply+approve, apply-immediate.
 * Does NOT require a LawyerApplication — just a valid ActivationToken.
 *
 * Flow:
 *  1. Hash token → find ActivationToken record (not used, not expired)
 *  2. Get user email from token
 *  3. Try base44.auth.register(email, password) to create auth account
 *  4. If "already exists" → user was created via inviteUser() → return use_forgot_password
 *  5. If success → find/update User entity: email_verified=true, password_set=true
 *  6. Copy profile fields from LawyerApplication if available and User fields are empty
 *  7. Mark token used, audit log
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

    // Find existing User entity (may or may not exist)
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const existingUser = existingUsers[0] || null;

    // Get best available full_name
    let fullName = existingUser?.full_name || '';
    if (!fullName) {
      const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail });
      fullName = apps[0]?.full_name || '';
    }

    // Mark token as used immediately (prevents replay)
    await base44.asServiceRole.entities.ActivationToken.update(tokenRecord.id, {
      used_at: new Date().toISOString()
    });

    // Try to register the auth account
    let registrationSuccess = false;
    let usesForgotPassword = false;
    try {
      await base44.auth.register({
        email: normalizedEmail,
        password,
        full_name: fullName,
      });
      registrationSuccess = true;
    } catch (regErr) {
      const errMsg = (regErr.message || regErr.response?.data?.message || '').toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('duplicate') || errMsg.includes('registered')) {
        // User has an existing auth account (was created via inviteUser or registered before).
        // They need to use Forgot Password to set their password.
        usesForgotPassword = true;
      } else {
        console.error('register error:', regErr.message);
        // Still mark email as verified since they opened the link
        usesForgotPassword = true;
      }
    }

    // If user already has auth account → verify email, send to forgot-password
    if (usesForgotPassword) {
      if (existingUser) {
        await base44.asServiceRole.entities.User.update(existingUser.id, {
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        }).catch(() => {});
      }
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: existingUser?.id || normalizedEmail,
        action: 'activation_completed',
        actor_email: normalizedEmail,
        actor_role: 'user',
        notes: 'Email verified via token. Auth account already exists — directed to forgot-password to set password.'
      }).catch(() => {});
      return Response.json({
        success: false,
        use_forgot_password: true,
        message: 'Your email has been verified. Please use Forgot Password to set your password.',
      });
    }

    // Registration succeeded — wait briefly for User entity to sync
    await new Promise(r => setTimeout(r, 900));

    // Find the User entity (may be newly created by register())
    const newUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const userEntity = newUsers[0] || null;

    if (userEntity) {
      const updateData = {
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        password_set: true,
        // Ensure platform-level verification is bypassed
        skip_email_verification: true,
      };

      // Copy profile fields from LawyerApplication if User is missing them
      const applications = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail });
      // Prefer approved app, fallback to any
      const app = applications.find(a => a.status === 'approved') || applications[0] || null;

      if (app) {
        if (!userEntity.firm_name && app.firm_name) updateData.firm_name = app.firm_name;
        if (!userEntity.phone && app.phone) updateData.phone = app.phone;
        if (!userEntity.bar_number && app.bar_number) updateData.bar_number = app.bar_number;
        if (!userEntity.bio && app.bio) updateData.bio = app.bio;
        if ((!userEntity.states_licensed?.length) && app.states_licensed?.length) {
          updateData.states_licensed = app.states_licensed;
        }
        if ((!userEntity.practice_areas?.length) && app.practice_areas?.length) {
          updateData.practice_areas = app.practice_areas;
        }
        if (!userEntity.years_experience && app.years_experience) {
          updateData.years_experience = app.years_experience;
        }
        // If application was approved, carry that status forward to the user
        if (app.status === 'approved' && (!userEntity.user_status || userEntity.user_status === 'pending' || userEntity.user_status === 'invited')) {
          updateData.user_status = 'approved';
          if (app.reviewed_by) updateData.approved_by = app.reviewed_by;
          if (app.reviewed_at) updateData.approved_at = app.reviewed_at;
        }
        // Mark application user_created
        await base44.asServiceRole.entities.LawyerApplication.update(app.id, {
          user_created: true,
        }).catch(() => {});
      }

      await base44.asServiceRole.entities.User.update(userEntity.id, updateData);
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: userEntity?.id || normalizedEmail,
      action: 'activation_completed',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: 'Account activated and password set successfully.'
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Account activated! You can now log in.',
    });

  } catch (error) {
    console.error('activateAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});