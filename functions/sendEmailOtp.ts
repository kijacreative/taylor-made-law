import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Rate limit: max 5 OTP requests per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const allOtps = await base44.asServiceRole.entities.EmailVerificationOtp.filter({ email: normalizedEmail });
    const recentOtps = allOtps.filter(o => o.created_date >= oneHourAgo);

    if (recentOtps.length >= 5) {
      return Response.json({ error: 'Too many code requests. Please wait before requesting another.' }, { status: 429 });
    }

    // Generate 6-digit OTP
    const randomBytes = crypto.getRandomValues(new Uint8Array(4));
    const randomNum = (randomBytes[0] * 16777216 + randomBytes[1] * 65536 + randomBytes[2] * 256 + randomBytes[3]);
    const code = (100000 + (randomNum % 900000)).toString();

    // Hash the OTP
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(code));
    const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.EmailVerificationOtp.create({
      email: normalizedEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts_count: 0
    });

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Taylor Made Law <noreply@taylormadelaw.com>',
        to: [normalizedEmail],
        subject: 'Your Taylor Made Law Verification Code',
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 50px;" />
            </div>
            <h2 style="color: #3a164d; font-size: 22px; margin-bottom: 16px;">Email Verification</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your verification code is:</p>
            <div style="background: #f5f0fa; border: 2px solid #3a164d; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #3a164d; font-variant-numeric: tabular-nums;">${code}</span>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              This code expires in <strong>10 minutes</strong>.<br>
              If you did not request this code, you can safely ignore this email.
            </p>
            <div style="margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
            </div>
          </div>
        `
      })
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json();
      console.error('Resend error:', errData);
      return Response.json({ error: 'Failed to send email. Please try again.' }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Verification code sent' });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});