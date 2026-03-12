/**
 * activateAccount — Validates an ActivationToken, registers the user auth account.
 * Does NOT call User.filter() — just uses auth.register() and updates LawyerApplication.
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

    // Get full_name from LawyerApplication if available
    let fullName = '';
    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail }).catch(() => []);
    fullName = apps[0]?.full_name || '';

    // Mark token as used immediately (prevents replay)
    await base44.asServiceRole.entities.ActivationToken.update(tokenRecord.id, {
      used_at: new Date().toISOString()
    });

    // Try to register the auth account
    let alreadyHasAccount = false;
    try {
      await base44.auth.register({
        email: normalizedEmail,
        password,
        full_name: fullName,
      });
    } catch (regErr) {
      const errMsg = (regErr.message || regErr?.response?.data?.message || '').toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('duplicate') || errMsg.includes('registered')) {
        alreadyHasAccount = true;
      } else {
        // Unknown registration error — return it
        return Response.json({ error: regErr.message || 'Registration failed' }, { status: 500 });
      }
    }

    if (alreadyHasAccount) {
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: normalizedEmail,
        action: 'activation_completed',
        actor_email: normalizedEmail,
        actor_role: 'user',
        notes: 'Auth account already exists — directed to forgot-password.'
      }).catch(() => {});
      return Response.json({
        success: false,
        use_forgot_password: true,
        message: 'An account for this email already exists. Please use Forgot Password to set your password.',
      });
    }

    // Mark LawyerApplication as user_created and carry approval status
    const app = apps.find(a => a.status === 'approved') || apps[0] || null;
    if (app) {
      await base44.asServiceRole.entities.LawyerApplication.update(app.id, {
        user_created: true,
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: normalizedEmail,
      action: 'activation_completed',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: 'Account activated and password set successfully.'
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