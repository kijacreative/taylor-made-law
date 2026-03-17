/**
 * approveLawyer — Admin-only. Approves a lawyer user by user_id.
 * Updates User + LawyerProfile status to 'approved'.
 * Sends "You're Approved — Log In" email.
 *
 * No activation tokens. No set-password links.
 * Lawyers already created their account + password at signup.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

function buildApprovedEmail(firstName, loginUrl, freeTrialMonths) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE — No payment required during your trial.</p>
      </div>`
    : '';
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Approved — Cases Are Now Unlocked</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Welcome to the Taylor Made Law Network</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">You've been <strong>approved</strong> for the Taylor Made Law Network. You now have full access to case details and can accept cases in the Case Exchange.</p>
    ${trialBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${loginUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Log In to Your Dashboard →</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">We're glad to have you as part of the TML attorney network.</p>
  `);
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

    // Upsert LawyerProfile
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

    // Send "You're Approved" email
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const firstName = (lawyerUser.full_name || '').split(' ')[0] || 'there';
    let emailSent = false;

    if (resendKey) {
      const loginUrl = `${BASE_URL}/login`;
      const html = buildApprovedEmail(firstName, loginUrl, free_trial_months);
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