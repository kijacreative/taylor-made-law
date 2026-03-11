/**
 * inviteAttorney — Admin-only.
 * Creates or updates the ONE user record for this email via upsertUserByEmail.
 * Never creates a duplicate. Status precedence enforced (no downgrade).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

function buildInviteEmail(name, activateUrl, adminNote) {
  const noteBlock = adminNote
    ? `<div style="background:#f5f0fa;border-left:4px solid #3a164d;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0 0 4px;color:#3a164d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Note from the TML Team</p>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${adminNote}</p>
      </div>`
    : '';

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
        <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Invited to the Taylor Made Law Network</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">A private platform for trusted legal professionals.</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${name},</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">You've been personally invited to join the <strong>Taylor Made Law Network</strong> — a private attorney platform connecting trusted legal professionals with vetted case opportunities.</p>
        ${noteBlock}
        <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">Click the button below to set your password and activate your account:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="${activateUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Your Account →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;text-align:center;">This link expires in 7 days.</p>
        <p style="margin:0 0 16px;color:#9ca3af;font-size:11px;text-align:center;word-break:break-all;">Or copy: ${activateUrl}</p>
        <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
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

    const adminUser = await base44.auth.me();
    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, full_name, firm_name, states_served, practice_areas, admin_note, send_email = true } = body;

    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // ── Upsert the ONE user record via the shared identity service ──
    const upsertResult = await base44.functions.invoke('upsertUserByEmail', {
      email: normalizedEmail,
      requested_status: 'invited',
      entry_source: 'invite',
      create_if_missing: true,
      actor_email: adminUser.email,
      actor_role: 'admin',
      profile: {
        full_name: full_name || '',
        firm_name: firm_name || '',
        states_licensed: states_served || [],
        practice_areas: practice_areas || [],
        admin_note: admin_note || '',
        invited_by_admin: adminUser.email,
      }
    });

    if (!upsertResult.data?.success) {
      return Response.json({
        error: upsertResult.data?.error || upsertResult.data?.reason || 'Failed to upsert user',
        blocked: upsertResult.data?.blocked
      }, { status: upsertResult.data?.blocked ? 409 : 500 });
    }

    const lawyerUser = upsertResult.data.user;
    if (!lawyerUser) {
      return Response.json({ error: 'Failed to create or find user record' }, { status: 500 });
    }

    // ── Create activation token ─────────────────────────────────────
    // Invalidate previous unused tokens first
    const existingTokens = await base44.asServiceRole.entities.ActivationToken.filter({
      user_email: normalizedEmail,
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

    const { rawToken, tokenHash } = await generateTokenPair();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
      user_id: lawyerUser.id,
      user_email: normalizedEmail,
      token_hash: tokenHash,
      token_type: 'activation',
      expires_at: expiresAt,
      created_by_admin: adminUser.email
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: tokenRecord.id,
      action: 'activation_token_created',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Invite token created for ${normalizedEmail} by admin ${adminUser.email}`
    });

    // ── Send invite email ───────────────────────────────────────────
    if (send_email && resendKey) {
      const activateUrl = `${BASE_URL}/Activate?token=${rawToken}`;
      const html = buildInviteEmail(full_name || 'there', activateUrl, admin_note);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: "You're Invited to Join the Taylor Made Law Network",
          html
        })
      });
    }

    return Response.json({
      success: true,
      user_id: lawyerUser.id,
      user_status: lawyerUser.user_status,
      action: upsertResult.data.action,
      status_changed: upsertResult.data.status_changed,
      message: 'Invitation processed successfully'
    });

  } catch (error) {
    console.error('inviteAttorney error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});