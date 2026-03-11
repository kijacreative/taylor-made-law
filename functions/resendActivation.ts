/**
 * resendActivation — Admin-only (by user_id) or public (by email).
 * Calls upsertUserByEmail to normalize & check the user before resending.
 * Invalidates previous tokens, creates new one, sends activation email.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    // Admin path: requires authentication
    let isAdminCall = false;
    let actorEmail = 'public';
    if (user_id) {
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      isAdminCall = true;
      actorEmail = adminUser.email;
    }

    if (!user_id && !email) {
      return Response.json({ error: 'user_id or email is required' }, { status: 400 });
    }

    // ── Resolve target user ────────────────────────────────────────
    let targetUser = null;
    if (user_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      targetUser = users[0] || null;
    } else {
      const normalizedEmail = email.toLowerCase().trim();
      const [byEmail, byNorm] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ email: normalizedEmail }),
        base44.asServiceRole.entities.User.filter({ email_normalized: normalizedEmail }),
      ]);
      const seen = new Set();
      const candidates = [...byEmail, ...byNorm].filter(u => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
      targetUser = candidates[0] || null;
    }

    // Return generic success to not reveal account existence on public calls
    if (!targetUser) {
      return Response.json({ success: true, message: 'If an account exists, an activation email has been sent.' });
    }

    const { user_status, password_set, email_verified, full_name } = targetUser;
    const targetEmail = (targetUser.email_normalized || targetUser.email || '').toLowerCase().trim();

    if (user_status === 'disabled' || user_status === 'cancelled') {
      return Response.json({ error: 'Account is disabled. Please contact support.' }, { status: 403 });
    }
    if (password_set && email_verified) {
      return Response.json({ error: 'Account is already activated. Please log in.' }, { status: 400 });
    }

    // ── Normalize email via upsert (idempotent touch) ──────────────
    await base44.functions.invoke('upsertUserByEmail', {
      email: targetEmail,
      requested_status: user_status || 'invited',
      entry_source: 'invite',
      create_if_missing: false,
      actor_email: actorEmail,
      actor_role: isAdminCall ? 'admin' : 'user',
      profile: { email_normalized: targetEmail }
    });

    // ── Invalidate previous tokens ─────────────────────────────────
    const existingTokens = await base44.asServiceRole.entities.ActivationToken.filter({
      user_email: targetEmail,
      token_type: 'activation'
    });
    for (const t of existingTokens) {
      if (!t.used_at) {
        await base44.asServiceRole.entities.ActivationToken.update(t.id, {
          used_at: new Date().toISOString(),
          invalidated_reason: 'superseded_by_resend'
        });
      }
    }

    // ── Create new token ───────────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const { rawToken, tokenHash } = await generateTokenPair();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
      user_id: targetUser.id,
      user_email: targetEmail,
      token_hash: tokenHash,
      token_type: 'activation',
      expires_at: expiresAt,
      created_by_admin: isAdminCall ? actorEmail : null
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: tokenRecord.id,
      action: 'activation_token_created',
      actor_email: actorEmail,
      actor_role: isAdminCall ? 'admin' : 'user',
      notes: `Activation token resent for ${targetEmail}`
    });

    if (resendKey) {
      const firstName = (full_name || '').split(' ')[0] || 'there';
      const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [targetEmail],
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