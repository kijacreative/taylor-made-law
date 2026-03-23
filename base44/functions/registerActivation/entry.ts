/**
 * registerActivation — Validates ActivationToken and creates the Base44 auth account.
 * Called from the VerifyEmail page (Step 1) when the user sets their password.
 * After this returns success, Base44 will have sent a verification code email.
 * The frontend then uses base44.auth.verifyOtp(email, code) to complete verification.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, password, email } = body;

    if (!token || !password || !email) {
      return Response.json({ error: 'token, email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Hash token to look up ActivationToken record
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const tokens = await base44.asServiceRole.entities.ActivationToken.filter({
      token_hash: tokenHash,
      token_type: 'activation'
    });

    if (!tokens || tokens.length === 0) {
      return Response.json({ error: 'Invalid or expired activation link.' }, { status: 400 });
    }

    const tokenRecord = tokens.find(t => !t.used_at);
    if (!tokenRecord) {
      return Response.json({ error: 'This activation link has already been used. Please log in or contact support.', already_used: true }, { status: 400 });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({ error: 'This activation link has expired.', expired: true, user_email: tokenRecord.user_email }, { status: 400 });
    }

    const normalizedEmail = tokenRecord.user_email.toLowerCase().trim();

    // Make sure the email in the request matches the token
    if (email.toLowerCase().trim() !== normalizedEmail) {
      return Response.json({ error: 'Email does not match activation link.' }, { status: 400 });
    }

    // Get full_name from LawyerApplication
    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail }).catch(() => []);
    const fullName = apps[0]?.full_name || '';

    // Mark token as used immediately to prevent replay
    await base44.asServiceRole.entities.ActivationToken.update(tokenRecord.id, {
      used_at: new Date().toISOString()
    });

    // Check if account already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail }).catch(() => []);
    const userExists = existingUsers.length > 0;

    if (userExists) {
      // Account exists — don't re-register, just signal that verification should proceed
      // The user can use resendOtp to get a new code if needed
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: normalizedEmail,
        action: 'activation_registration_skipped',
        actor_email: normalizedEmail,
        actor_role: 'user',
        notes: 'Account already exists. Skipping register, proceeding to verification.'
      }).catch(() => {});

      return Response.json({ success: true, email: normalizedEmail, account_existed: true });
    }

    // Register the auth account — Base44 will send a verification code email automatically
    try {
      await base44.auth.register({
        email: normalizedEmail,
        password,
        full_name: fullName,
      });
    } catch (regErr) {
      const errMsg = (regErr.message || regErr?.response?.data?.message || '').toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('duplicate') || errMsg.includes('registered')) {
        // Already registered — proceed, user needs to verify
        return Response.json({ success: true, email: normalizedEmail, account_existed: true });
      }
      // Re-mark token as unused so user can retry
      await base44.asServiceRole.entities.ActivationToken.update(tokenRecord.id, { used_at: null }).catch(() => {});
      return Response.json({ error: regErr.message || 'Registration failed. Please try again.' }, { status: 500 });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: normalizedEmail,
      action: 'activation_registered',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `Account registered via activation flow. Awaiting email verification.`
    }).catch(() => {});

    return Response.json({ success: true, email: normalizedEmail });

  } catch (error) {
    console.error('registerActivation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});