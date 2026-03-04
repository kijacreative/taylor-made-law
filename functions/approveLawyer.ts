/**
 * approveLawyer — Admin-only. Approves a lawyer user.
 * If not yet activated → sends activation email (they'll activate then log in approved).
 * If already activated → sends "You're Approved" email with login link.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

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
        <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildApprovedWithLoginEmail(firstName, loginUrl, freeTrialMonths) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE — No payment required during your trial.</p>
      </div>`
    : '';

  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Approved — Cases Are Now Unlocked</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Welcome to the Taylor Made Law Network</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">You've been <strong>approved</strong> for the Taylor Made Law Network. You can now access full case details and accept cases in the Case Exchange.</p>
    ${trialBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${loginUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Log In →</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">We're glad to have you as part of the TML attorney network.</p>
  `);
}

function buildApprovedWithActivationEmail(firstName, activationUrl, freeTrialMonths) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE — No payment required during your trial.</p>
      </div>`
    : '';

  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Approved — Activate to Access Cases</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">One step left — set your password to get started.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Your application to the Taylor Made Law Network has been <strong>approved</strong>. Click below to verify your email and set your password — you'll then have full access to the Case Exchange.</p>
    ${trialBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Account &amp; Access Cases →</a>
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { user_id, free_trial_months = 0 } = body;

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const lawyerUser = users[0];

    if (!lawyerUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (lawyerUser.user_status === 'disabled') {
      return Response.json({ error: 'Cannot approve a disabled user. Please reinstate first.' }, { status: 400 });
    }

    if (lawyerUser.user_status === 'approved') {
      return Response.json({ success: true, message: 'User is already approved', already_approved: true });
    }

    const updateData = {
      user_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminUser.email,
    };

    if (parseInt(free_trial_months) > 0) {
      updateData.subscription_status = 'trial';
      updateData.free_trial_months = parseInt(free_trial_months);
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + parseInt(free_trial_months));
      updateData.trial_ends_at = trialEnd.toISOString();
    } else {
      updateData.subscription_status = 'active';
    }

    await base44.asServiceRole.entities.User.update(user_id, updateData);

    // Upsert LawyerProfile so the dashboard works immediately after approval
    const existingProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id });
    if (existingProfiles.length === 0) {
      await base44.asServiceRole.entities.LawyerProfile.create({
        user_id,
        firm_name: lawyerUser.firm_name || '',
        phone: lawyerUser.phone || '',
        bar_number: lawyerUser.bar_number || '',
        bio: lawyerUser.bio || '',
        states_licensed: lawyerUser.states_licensed || [],
        practice_areas: lawyerUser.practice_areas || [],
        years_experience: lawyerUser.years_experience || 0,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email,
        ...(parseInt(free_trial_months) > 0 ? {
          subscription_status: 'trial',
          free_trial_months: parseInt(free_trial_months),
          trial_ends_at: updateData.trial_ends_at
        } : { subscription_status: 'active' })
      });
    } else {
      await base44.asServiceRole.entities.LawyerProfile.update(existingProfiles[0].id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email,
        ...(parseInt(free_trial_months) > 0 ? {
          subscription_status: 'trial',
          free_trial_months: parseInt(free_trial_months),
          trial_ends_at: updateData.trial_ends_at
        } : { subscription_status: 'active' })
      });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const firstName = (lawyerUser.full_name || '').split(' ')[0] || 'there';
    let emailSent = false;

    if (lawyerUser.password_set) {
      // Already activated — just send "you're approved, log in" email
      const loginUrl = `${BASE_URL}/LawyerLogin`;
      const html = buildApprovedWithLoginEmail(firstName, loginUrl, free_trial_months);
      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [lawyerUser.email],
            subject: "You're Approved — Cases Are Now Unlocked",
            html
          })
        });
        emailSent = res.ok;
      }
    } else {
      // Not yet activated — send activation link
      const { rawToken, tokenHash } = await generateTokenPair();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
        user_id: lawyerUser.id,
        user_email: lawyerUser.email,
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
        notes: `Approval activation token for ${lawyerUser.email}`
      });

      const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;
      const html = buildApprovedWithActivationEmail(firstName, activationUrl, free_trial_months);
      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [lawyerUser.email],
            subject: "You're Approved — Activate Your TML Account",
            html
          })
        });
        emailSent = res.ok;
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: user_id,
      action: 'application_approved',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Approved by ${adminUser.email}. Trial: ${free_trial_months} months. Email sent: ${emailSent}`
    });

    return Response.json({ success: true, email_sent: emailSent });

  } catch (error) {
    console.error('approveLawyer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});