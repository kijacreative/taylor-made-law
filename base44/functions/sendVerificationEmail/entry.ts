import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, name } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Generate a secure random token
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store token in EmailVerificationOtp entity (reusing it for link-based verification)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await base44.asServiceRole.entities.EmailVerificationOtp.create({
      email: normalizedEmail,
      code_hash: tokenHash,
      expires_at: expiresAt,
      attempts_count: 0
    });

    // Build verification link - this links back to the ForLawyers page with a verified param
    const appUrl = req.headers.get('origin') || 'https://app.base44.com';
    const verifyUrl = `${appUrl}/for-lawyers?email_verified=1&email=${encodeURIComponent(normalizedEmail)}&token=${token}`;

    // Send email via admin notification email (sends to admin, who then processes)
    // Use the built-in SendEmail which will work since we're sending FROM the app
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'info@taylormadelaw.com',  // Send to admin
      from_name: 'Taylor Made Law Network',
      subject: `Email Verification Request from ${name || normalizedEmail}`,
      body: `
A new attorney has requested email verification.

Name: ${name || 'Not provided'}
Email: ${normalizedEmail}

Verification link (click to verify their email):
${verifyUrl}

This link expires in 24 hours.
      `
    });

    return Response.json({ success: true, message: 'Verification email sent' });

  } catch (error) {
    console.error('Error sending verification email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});