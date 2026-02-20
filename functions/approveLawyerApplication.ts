import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require admin auth
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { application_id, free_trial_months = 0 } = body;

    if (!application_id) {
      return Response.json({ error: 'application_id is required' }, { status: 400 });
    }

    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ id: application_id });
    if (!apps || apps.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }
    const application = apps[0];

    if (application.status !== 'pending') {
      return Response.json({ error: 'Application is not in pending status' }, { status: 400 });
    }

    // Generate activation token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Hash the token for storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Update application to approved with token
    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'approved',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
      activation_token_hash: tokenHash,
      activation_token_expires_at: expiresAt,
      activation_token_used: false
    });

    // Build activation URL
    const origin = req.headers.get('origin') || 'https://app.taylormadelaw.com';
    const activateUrl = `${origin}/activate?token=${token}&email=${encodeURIComponent(application.email)}`;

    // Send approval + password setup email
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Taylor Made Law <noreply@taylormadelaw.com>',
        to: [application.email],
        subject: "You're Approved — Set Your Password to Access TML",
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf8f5;">
            <div style="text-align: center; margin-bottom: 28px;">
              <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 48px;" />
            </div>
            <div style="background: white; border-radius: 16px; padding: 36px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);">
              <div style="text-align: center; margin-bottom: 28px;">
                <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 28px;">🎉</div>
                <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px;">You're Approved!</h1>
                <p style="color: #6b7280; margin: 0;">Welcome to the Taylor Made Law Network</p>
              </div>
              <p style="color: #374151; font-size: 15px; line-height: 1.7;">Hi ${application.full_name},</p>
              <p style="color: #374151; font-size: 15px; line-height: 1.7;">Your attorney profile has been approved for the Taylor Made Law Network. Set your password to access the platform and begin reviewing case opportunities.</p>
              ${parseInt(free_trial_months) > 0 ? `<div style="background:#f5f0fa;border-radius:10px;padding:16px;margin:20px 0;"><p style="color:#3a164d;font-weight:700;margin:0 0 6px;">🎁 ${free_trial_months} Months FREE Membership</p><p style="color:#374151;font-size:14px;margin:0;">No payment required during your trial period.</p></div>` : ''}
              <p style="color:#374151;font-size:15px;line-height:1.7;">Click the magic link below to verify your email and set your password — then you'll be taken directly to the attorney login page.</p>
              <a href="${activateUrl}" style="display:block;background:#3a164d;color:white;text-align:center;padding:16px 24px;border-radius:50px;font-weight:700;font-size:16px;text-decoration:none;margin:28px 0;">Verify Email &amp; Set Password →</a>
              <p style="color:#9ca3af;font-size:12px;text-align:center;">This magic link expires in 7 days. If you did not apply, ignore this email.</p>
              <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:8px;">Or paste: ${activateUrl}</p>
            </div>
            <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:24px;">© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
          </div>
        `
      })
    });

    return Response.json({ success: true, email_sent: emailRes.ok });

  } catch (error) {
    console.error('Error approving application:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});