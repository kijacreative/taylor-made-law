import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const YEAR = new Date().getFullYear();

function buildOtpEmail(code) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f1ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ee;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="text-align:center;padding-bottom:28px;">
        <img src="${LOGO}" width="200" alt="Taylor Made Law" style="width:200px;max-width:200px;height:auto;display:block;margin:0 auto;" />
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:16px;padding:40px 48px;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;line-height:1.3;">Email Verification</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Enter the code below to verify your email address.</p>
        <p style="margin:0 0 20px;color:#333333;font-size:15px;line-height:1.7;">Your 6-digit verification code is:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td align="center">
            <div style="display:inline-block;background:#f5f0fa;border:2px solid #3a164d;border-radius:12px;padding:24px 32px;text-align:center;">
              <span style="font-size:44px;font-weight:800;letter-spacing:14px;color:#3a164d;font-variant-numeric:tabular-nums;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${code}</span>
            </div>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;color:#4b5563;font-size:14px;line-height:1.7;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.7;">If you did not request this code, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Taylor Made Law</p>
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">This is an automated message from the Taylor Made Law Network.</p>
        <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

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

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Taylor Made Law <noreply@taylormadelaw.com>',
        to: [normalizedEmail],
        subject: 'Your Taylor Made Law Verification Code',
        html: buildOtpEmail(code)
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