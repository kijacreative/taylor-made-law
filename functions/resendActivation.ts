/**
 * resendActivation — Admin-only OR self-serve (public with email param).
 * Creates a new activation token and sends the activation email.
 * Can be called by admin (with user_id) or publicly with just email (rate-limited by UI).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

function buildActivationEmail(firstName, activationUrl) {
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
        <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Activate Your Taylor Made Law Account</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">New activation link</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">Here is your new activation link. Click below to verify your email and set your password:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Account →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">This link expires in 7 days.</p>
        <p style="margin:0;color:#9ca3af;font-size:11px;word-break:break-all;">Or copy: ${activationUrl}</p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function generateTokenPair() {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { rawToken, tokenHash };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user_id, email } = body;

    if (!user_id && !email) {
      return Response.json({ error: 'user_id or email is required' }, { status: 400 });
    }

    let lawyerUser = null;

    if (user_id) {
      // Admin resending for specific user
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required to resend by user_id' }, { status: 403 });
      }
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      lawyerUser = users[0];
    } else {
      // Self-serve: by email (for expired link page)
      const normalizedEmail = email.toLowerCase().trim();
      const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      lawyerUser = users[0];
    }

    if (!lawyerUser) {
      // Don't reveal whether user exists — just say email sent
      return Response.json({ success: true, message: 'If an account exists, an activation email has been sent.' });
    }

    if (lawyerUser.user_status === 'disabled') {
      return Response.json({ error: 'Account is disabled. Please contact support@taylormadelaw.com.' }, { status: 403 });
    }

    if (lawyerUser.password_set && lawyerUser.email_verified) {
      return Response.json({ error: 'Account is already activated. Please log in.' }, { status: 400 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const { rawToken, tokenHash } = await generateTokenPair();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
      user_id: lawyerUser.id,
      user_email: lawyerUser.email,
      token_hash: tokenHash,
      token_type: 'activation',
      expires_at: expiresAt,
      created_by_admin: user_id ? 'admin-resend' : null
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: lawyerUser.id,
      action: 'activation_resent',
      actor_email: user_id ? 'admin' : lawyerUser.email,
      actor_role: user_id ? 'admin' : 'system',
      notes: `Activation resent to ${lawyerUser.email}`
    });
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: tokenRecord.id,
      action: 'activation_token_created',
      actor_email: user_id ? 'admin' : lawyerUser.email,
      actor_role: user_id ? 'admin' : 'system',
      notes: `Resend token for ${lawyerUser.email}`
    });

    if (resendKey) {
      const firstName = (lawyerUser.full_name || '').split(' ')[0] || 'there';
      const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [lawyerUser.email],
          subject: 'Your New Activation Link — Taylor Made Law',
          html: buildActivationEmail(firstName, activationUrl)
        })
      });
    }

    return Response.json({ success: true, message: 'Activation email sent.' });
  } catch (error) {
    console.error('resendActivation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});