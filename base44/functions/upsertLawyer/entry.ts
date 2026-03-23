/**
 * upsertLawyer — Core unified identity function.
 * Used by: inviteAttorney, submitLawyerApplication, resendActivation
 *
 * Status precedence: approved > pending > invited
 * disabled overrides all (cannot be changed here — use disableLawyer / reinstateLawyer)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

function statusRank(s) {
  if (s === 'approved') return 3;
  if (s === 'pending') return 2;
  if (s === 'invited') return 1;
  return 0;
}

function maxStatus(current, requested) {
  if (current === 'disabled') return 'disabled'; // never upgrade/downgrade disabled here
  if (statusRank(current) >= statusRank(requested)) return current;
  return requested;
}

function emailWrapper(content) {
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
        ${content}
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

function buildActivationEmail(firstName, activationUrl) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Activate Your Taylor Made Law Account</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Verify your email and set your password to get started.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">To access the Taylor Made Law Network, please activate your account by verifying your email and setting your password:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Account →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">This link expires in 7 days.</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;word-break:break-all;">Or copy: ${activationUrl}</p>
  `);
}

async function generateTokenPair() {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { rawToken, tokenHash };
}

async function sendActivationEmailViaResend(resendKey, toEmail, firstName, rawToken) {
  const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;
  const html = buildActivationEmail(firstName || 'there', activationUrl);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Taylor Made Law <noreply@taylormadelaw.com>',
      to: [toEmail],
      subject: 'Activate Your Taylor Made Law Account',
      html
    })
  });
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      email,
      requested_status, // 'invited' | 'pending'
      profile_fields = {}, // firm_name, phone, bar_number, bio, etc.
      send_activation_email = true,
      admin_note = '',
      called_by_admin = false // caller must be authenticated admin if true
    } = body;

    if (!email || !requested_status) {
      return Response.json({ error: 'email and requested_status are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Find existing user
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let user = existingUsers[0] || null;

    let isNew = false;

    if (user) {
      // Apply status precedence — never downgrade, never override disabled without explicit reinstate
      const newStatus = maxStatus(user.user_status || 'invited', requested_status);

      if (user.user_status === 'disabled') {
        // Do not touch disabled users from this function
        return Response.json({
          success: false,
          user_id: user.id,
          user_status: 'disabled',
          message: 'User is disabled. Must be reinstated by an admin before re-inviting or re-applying.'
        });
      }

      // Update profile fields + status if changed
      const updates = { ...profile_fields };
      if (newStatus !== user.user_status) updates.user_status = newStatus;
      if (admin_note) updates.admin_note = admin_note;

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.User.update(user.id, updates);
        user = { ...user, ...updates };
      }
    } else {
      // Create new user via invite
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: normalizedEmail,
          subject: 'placeholder-skip',
          body: '<p>skip</p>'
        });
      } catch (_) { /* ignore */ }

      // Invite via base44 auth
      try {
        await base44.users.inviteUser(normalizedEmail, 'user');
      } catch (inviteErr) {
        console.log('inviteUser note:', inviteErr.message);
      }

      // Wait briefly for user creation
      await new Promise(r => setTimeout(r, 800));

      const newUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      user = newUsers[0] || null;

      if (user) {
        const updates = {
          user_status: requested_status,
          email_verified: false,
          password_set: false,
          ...profile_fields
        };
        if (admin_note) updates.admin_note = admin_note;
        await base44.asServiceRole.entities.User.update(user.id, updates);
        user = { ...user, ...updates };
        isNew = true;
      }
    }

    if (!user) {
      return Response.json({ error: 'Failed to create or find user record' }, { status: 500 });
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: user.id,
      action: isNew ? 'user_upserted_created' : 'user_upserted_updated',
      actor_email: called_by_admin ? 'admin' : normalizedEmail,
      actor_role: called_by_admin ? 'admin' : 'system',
      notes: `Status: ${user.user_status}, requested: ${requested_status}, email: ${normalizedEmail}`
    });

    // Send activation email if user is not yet activated
    let activationTokenId = null;
    if (send_activation_email && (!user.email_verified || !user.password_set)) {
      const { rawToken, tokenHash } = await generateTokenPair();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
        user_id: user.id,
        user_email: normalizedEmail,
        token_hash: tokenHash,
        token_type: 'activation',
        expires_at: expiresAt,
        created_by_admin: called_by_admin ? 'admin' : null
      });
      activationTokenId = tokenRecord.id;

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'ActivationToken',
        entity_id: tokenRecord.id,
        action: 'activation_token_created',
        actor_email: called_by_admin ? 'admin' : normalizedEmail,
        actor_role: called_by_admin ? 'admin' : 'system',
        notes: `Token created for ${normalizedEmail}`
      });

      const firstName = (user.full_name || profile_fields.full_name || '').split(' ')[0] || 'there';
      if (resendKey) {
        await sendActivationEmailViaResend(resendKey, normalizedEmail, firstName, rawToken);
        await base44.asServiceRole.entities.AuditLog.create({
          entity_type: 'User',
          entity_id: user.id,
          action: isNew ? 'invite_sent' : 'activation_resent',
          actor_email: called_by_admin ? 'admin' : normalizedEmail,
          actor_role: called_by_admin ? 'admin' : 'system',
          notes: `Activation email sent to ${normalizedEmail}`
        });
      }
    }

    return Response.json({
      success: true,
      user_id: user.id,
      user_status: user.user_status,
      is_new: isNew,
      activation_token_id: activationTokenId,
      email_verified: user.email_verified || false,
      password_set: user.password_set || false
    });

  } catch (error) {
    console.error('upsertLawyer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});