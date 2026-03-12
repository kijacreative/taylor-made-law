/**
 * activateAccount — Validates the TML activation token and marks it used.
 * Does NOT call base44.auth.register() — that is done client-side so the browser
 * receives an auto-session immediately, bypassing Base44's login-time verification check.
 *
 * Flow:
 *  1. Hash token → find ActivationToken record (not used, not expired)
 *  2. Check if user already has password_set=true → return use_forgot_password
 *  3. Mark token used
 *  4. Return { success: true, email, full_name } so frontend can call register()
 *
 * Entity sync (email_verified, user_status, profile data) is handled by postActivationSync
 * which is called from the frontend after register() completes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return Response.json({ error: 'token is required' }, { status: 400 });
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
        error: 'This activation link has already been used. Please log in or use Forgot Password.',
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

    // Check if user already fully activated (has a real auth account with password set)
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const existingUser = existingUsers[0] || null;

    if (existingUser?.password_set) {
      return Response.json({
        use_forgot_password: true,
        message: 'This account already has a password set. Please use Forgot Password to access your account.'
      });
    }

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

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: tokenRecord.id,
      action: 'activation_token_validated',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: 'Token validated. Frontend will call register() to create auth account.'
    }).catch(() => {});

    return Response.json({
      success: true,
      email: normalizedEmail,
      full_name: fullName,
    });

  } catch (error) {
    console.error('activateAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});