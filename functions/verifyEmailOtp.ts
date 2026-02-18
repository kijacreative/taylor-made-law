import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return Response.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Find all OTPs for this email
    const allOtps = await base44.asServiceRole.entities.EmailVerificationOtp.filter({
      email: normalizedEmail
    });

    // Get the most recent unused OTP
    const unusedOtps = allOtps
      .filter(o => !o.used_at)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    if (!unusedOtps.length) {
      return Response.json({
        error: 'No active verification code found. Please request a new one.'
      }, { status: 400 });
    }

    const otp = unusedOtps[0];

    // Check expiry
    if (new Date(otp.expires_at) < new Date()) {
      await base44.asServiceRole.entities.EmailVerificationOtp.update(otp.id, {
        used_at: new Date().toISOString()
      });
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'EmailVerificationOtp',
        entity_id: normalizedEmail,
        action: 'code_expired',
        actor_email: normalizedEmail,
        actor_role: 'public',
        notes: `Expired OTP attempted for ${normalizedEmail}`
      });
      return Response.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    // Check max attempts
    if ((otp.attempts_count || 0) >= 5) {
      return Response.json({
        error: 'Too many attempts — please request a new code.'
      }, { status: 429 });
    }

    // Hash submitted code and compare
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(code));
    const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (codeHash !== otp.code_hash) {
      const newAttempts = (otp.attempts_count || 0) + 1;
      await base44.asServiceRole.entities.EmailVerificationOtp.update(otp.id, {
        attempts_count: newAttempts
      });
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'EmailVerificationOtp',
        entity_id: normalizedEmail,
        action: 'verification_attempt_failed',
        actor_email: normalizedEmail,
        actor_role: 'public',
        notes: `Failed OTP attempt #${newAttempts} for ${normalizedEmail}`
      });
      const remaining = 5 - newAttempts;
      return Response.json({
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many attempts — please request a new code.'
      }, { status: 400 });
    }

    // ✅ Success — mark as used
    await base44.asServiceRole.entities.EmailVerificationOtp.update(otp.id, {
      used_at: new Date().toISOString(),
      attempts_count: (otp.attempts_count || 0) + 1
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'EmailVerificationOtp',
      entity_id: normalizedEmail,
      action: 'verification_success',
      actor_email: normalizedEmail,
      actor_role: 'public',
      notes: `Email verified: ${normalizedEmail}`
    });

    return Response.json({
      success: true,
      verified: true,
      verified_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});