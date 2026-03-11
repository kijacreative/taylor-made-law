/**
 * sendPasswordReset — Public endpoint.
 * Generates a secure password-reset token, stores it, sends a TML-branded email via Resend.
 * Always returns success to prevent email enumeration.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

function buildResetEmail(firstName, resetUrl) {
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
        <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Reset Your Password</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Taylor Made Law Attorney Portal</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">We received a request to reset the password for your Taylor Made Law account. Click the button below to choose a new password.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="${resetUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Reset My Password →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">This link expires in 1 hour.</p>
        <p style="margin:0 0 16px;color:#9ca3af;font-size:11px;word-break:break-all;">Or copy: ${resetUrl}</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
        <p style="margin:0;color:#9ca3af;font-size:13px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Look up user — always return success even if not found (prevent enumeration)
    const [byEmail, byNorm] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ email: normalizedEmail }),
      base44.asServiceRole.entities.User.filter({ email_normalized: normalizedEmail }),
    ]);
    const seen = new Set();
    const candidates = [...byEmail, ...byNorm].filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; });
    const user = candidates[0] || null;

    if (user && (user.user_status === 'disabled' || user.user_status === 'cancelled')) {
      // Don't help disabled users reset — silently succeed
      return Response.json({ success: true });
    }

    if (user) {
      // Invalidate any previous unused reset tokens
      const existing = await base44.asServiceRole.entities.ActivationToken.filter({
        user_email: normalizedEmail,
        token_type: 'password_reset'
      });
      for (const t of existing) {
        if (!t.used_at) {
          await base44.asServiceRole.entities.ActivationToken.update(t.id, {
            used_at: new Date().toISOString(),
            invalidated_reason: 'superseded'
          });
        }
      }

      // Create new reset token (1 hour expiry)
      const { rawToken, tokenHash } = await generateTokenPair();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.ActivationToken.create({
        user_id: user.id,
        user_email: normalizedEmail,
        token_hash: tokenHash,
        token_type: 'password_reset',
        expires_at: expiresAt,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: user.id,
        action: 'password_reset_requested',
        actor_email: normalizedEmail,
        actor_role: 'user',
        notes: `Password reset token issued for ${normalizedEmail}`
      });

      if (resendKey) {
        const firstName = (user.full_name || '').split(' ')[0] || 'there';
        const resetUrl = `${BASE_URL}/ResetPassword?token=${rawToken}`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [normalizedEmail],
            subject: 'Reset Your Taylor Made Law Password',
            html: buildResetEmail(firstName, resetUrl)
          })
        });
      }
    }

    // Always return success to prevent email enumeration
    return Response.json({ success: true });

  } catch (error) {
    console.error('sendPasswordReset error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});