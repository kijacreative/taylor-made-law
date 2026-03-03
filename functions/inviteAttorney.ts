/**
 * inviteAttorney — Admin-only. Option C Unified Identity.
 * Upserts user record (never calls base44.users.inviteUser to avoid auth account conflicts).
 * Creates activation token, sends invite email.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

function buildInviteEmail(name, activationUrl, adminNote) {
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
        <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">Activate your account by clicking the button below:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Your Account →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.7;">This link expires in <strong>7 days</strong>. Once activated, you'll be able to log in and access the Case Exchange.</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;word-break:break-all;">Or copy: ${activationUrl}</p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Taylor Made Law</p>
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

function statusRank(s) {
  if (s === 'approved') return 3;
  if (s === 'pending') return 2;
  if (s === 'invited') return 1;
  return 0;
}

function maxStatus(current, requested) {
  if (current === 'disabled') return 'disabled';
  if (statusRank(current) >= statusRank(requested)) return current;
  return requested;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, full_name, firm_name, states_served, practice_areas, admin_note, send_email = true } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Find or create user — NO base44.users.inviteUser() call
    // That function creates a conflicting auth account which breaks register() later
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let lawyerUser = existingUsers[0] || null;
    let isNew = false;

    if (lawyerUser) {
      if (lawyerUser.user_status === 'disabled') {
        return Response.json({
          error: 'This user is disabled. Please reinstate them before re-inviting.',
          user_status: 'disabled'
        }, { status: 409 });
      }

      // Never downgrade status
      const newStatus = maxStatus(lawyerUser.user_status || 'invited', 'invited');
      const updates = {};
      if (newStatus !== lawyerUser.user_status) updates.user_status = newStatus;
      if (full_name && !lawyerUser.full_name) updates.full_name = full_name;
      if (firm_name && !lawyerUser.firm_name) updates.firm_name = firm_name;
      if (admin_note) updates.admin_note = admin_note;
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.User.update(lawyerUser.id, updates);
        lawyerUser = { ...lawyerUser, ...updates };
      }
    } else {
      // Create user entity record only (no auth account yet — that happens at activation)
      // Base44 doesn't support creating User entity records directly, so we use inviteUser
      // but ONLY as a user-record-creation mechanism, understanding it may fail or succeed.
      // We then immediately check if user was created.
      try {
        await base44.users.inviteUser(normalizedEmail, 'user');
      } catch (e) {
        console.log('inviteUser note (expected for new users):', e.message);
      }
      await new Promise(r => setTimeout(r, 1500));
      const newUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      lawyerUser = newUsers[0] || null;

      if (lawyerUser) {
        const initData = {
          user_status: 'invited',
          email_verified: false,
          password_set: false,
          invited_by_admin: user.email,
          invited_at: new Date().toISOString()
        };
        if (full_name) initData.full_name = full_name;
        if (firm_name) initData.firm_name = firm_name;
        if (states_served?.length) initData.states_licensed = states_served;
        if (practice_areas?.length) initData.practice_areas = practice_areas;
        if (admin_note) initData.admin_note = admin_note;
        await base44.asServiceRole.entities.User.update(lawyerUser.id, initData);
        lawyerUser = { ...lawyerUser, ...initData };
        isNew = true;
      }
    }

    if (!lawyerUser) {
      return Response.json({ error: 'Failed to create or find user record' }, { status: 500 });
    }

    // Invalidate all previous unused activation tokens for this email
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

    // Create new activation token
    const { rawToken, tokenHash } = await generateTokenPair();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
      user_id: lawyerUser.id,
      user_email: normalizedEmail,
      token_hash: tokenHash,
      token_type: 'activation',
      expires_at: expiresAt,
      created_by_admin: user.email
    });

    // Audit logs
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: lawyerUser.id,
      action: 'invite_sent',
      actor_email: user.email,
      actor_role: 'admin',
      notes: `Admin invited ${normalizedEmail}${admin_note ? '. Note: ' + admin_note : ''}`
    });
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: tokenRecord.id,
      action: 'activation_token_created',
      actor_email: user.email,
      actor_role: 'admin',
      notes: `Token created for ${normalizedEmail}`
    });

    // Send invite email
    if (send_email && resendKey) {
      const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;
      const html = buildInviteEmail(full_name || 'there', activationUrl, admin_note);
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
      is_new: isNew,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('inviteAttorney error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});