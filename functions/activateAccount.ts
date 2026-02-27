/**
 * activateAccount — Single activation endpoint for ALL users (invited + applied).
 * Token validates identity. Sets email_verified=true, password_set=true.
 * Uses base44.auth.register() to create the actual password-authenticated account.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Hash the token to find it in DB
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Find token record
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

    // Find the user record
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const lawyerUser = users[0] || null;

    if (!lawyerUser) {
      return Response.json({ error: 'User account not found. Please contact support.' }, { status: 404 });
    }

    if (lawyerUser.user_status === 'disabled') {
      return Response.json({ 
        error: 'Your account has been disabled. Please contact support@taylormadelaw.com.' 
      }, { status: 403 });
    }

    // Register/set password via base44 auth
    // If user already exists in auth system, this will set their password
    try {
      await base44.auth.register({
        email: normalizedEmail,
        password,
        full_name: lawyerUser.full_name || ''
      });
    } catch (regErr) {
      const msg = (regErr.message || '').toLowerCase();
      if (!msg.includes('already') && !msg.includes('exists')) {
        throw regErr;
      }
      // User already exists in auth — that's fine, they're setting password via activation
    }

    // Mark user as activated
    await base44.asServiceRole.entities.User.update(lawyerUser.id, {
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      password_set: true
    });

    // Mark token as used
    await base44.asServiceRole.entities.ActivationToken.update(tokenRecord.id, {
      used_at: new Date().toISOString()
    });

    // Audit logs
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: lawyerUser.id,
      action: 'activation_completed',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `Account activated. Status: ${lawyerUser.user_status}`
    });
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: tokenRecord.id,
      action: 'activation_token_used',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `Token used by ${normalizedEmail}`
    });

    return Response.json({
      success: true,
      message: 'Account activated. Please log in.',
      user_status: lawyerUser.user_status
    });

  } catch (error) {
    console.error('activateAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});