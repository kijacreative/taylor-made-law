/**
 * approveLawyerApplication — Admin-only.
 * 1. Marks LawyerApplication.status = 'approved_pending_activation'
 * 2. Upserts User entity with user_status='approved' + profile data
 * 3. Creates an ActivationToken (single-use, 7-day link)
 * 4. Sends ONE branded TML approval email with link to /VerifyEmail?email=...&token=...
 *    (The ActivationToken is the ONLY security gate — no custom TML OTP codes)
 * 5. If user already activated (password_set): sends "You're Approved, Log In" email
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

function buildApprovedActivateEmail(firstName, activationUrl, freeTrialMonths) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE Membership — No payment required during your trial.</p>
        </td></tr>
      </table>`
    : '';
  return emailWrapper(`
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td align="center">
        <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;display:inline-block;text-align:center;line-height:64px;font-size:28px;">🎉</div>
      </td></tr>
    </table>
    <h1 style="margin:0 0 8px;text-align:center;color:#111827;font-size:26px;font-weight:700;">You're Approved!</h1>
    <p style="margin:0 0 28px;text-align:center;color:#6b7280;font-size:15px;">Welcome to the Taylor Made Law Network</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Your application to join the <strong>Taylor Made Law Network</strong> has been <strong>approved</strong>.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">To activate your account, click the button below. You will be asked to enter the verification code sent to your email and then create your password. Once complete, you'll be able to log in and finish setting up your lawyer profile.</p>
    ${trialBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Your Account →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;text-align:center;">This link expires in 7 days. If it expires, contact support to request a new one.</p>
  `);
}

function buildApprovedLoginEmail(firstName, loginUrl, freeTrialMonths) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE — No payment required during your trial.</p>
        </td></tr>
      </table>`
    : '';
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Approved — Cases Are Now Unlocked</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Welcome to the Taylor Made Law Network</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">You've been <strong>approved</strong> for the Taylor Made Law Network. You now have full access to case details and can accept cases in the Case Exchange.</p>
    ${trialBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${loginUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Log In →</a>
      </td></tr>
    </table>
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

    if (!['pending', 'approved'].includes(application.status)) {
      return Response.json({ error: 'Application is not in a pending status' }, { status: 400 });
    }

    const normalizedEmail = application.email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const firstName = (application.full_name || '').split(' ')[0] || 'there';

    // ── 1. Mark application as approved_pending_activation ───────────────────

    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'approved_pending_activation',
      reviewed_by: adminUser.email,
      reviewed_at: new Date().toISOString(),
    });

    // ── 2. Upsert User entity with user_status=approved ───────────────────────

    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let lawyerUser = existingUsers[0] || null;

    const trialUpdateData = parseInt(free_trial_months) > 0 ? {
      subscription_status: 'trial',
      free_trial_months: parseInt(free_trial_months),
      trial_ends_at: new Date(Date.now() + parseInt(free_trial_months) * 30 * 24 * 60 * 60 * 1000).toISOString(),
    } : {};

    if (lawyerUser) {
      if (lawyerUser.user_status === 'disabled') {
        return Response.json({ error: 'Cannot approve a disabled user. Please reinstate first.' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.update(lawyerUser.id, {
        user_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email,
        firm_name: lawyerUser.firm_name || application.firm_name || '',
        phone: lawyerUser.phone || application.phone || '',
        bar_number: lawyerUser.bar_number || application.bar_number || '',
        bio: lawyerUser.bio || application.bio || '',
        states_licensed: lawyerUser.states_licensed?.length ? lawyerUser.states_licensed : (application.states_licensed || []),
        practice_areas: lawyerUser.practice_areas?.length ? lawyerUser.practice_areas : (application.practice_areas || []),
        years_experience: lawyerUser.years_experience || application.years_experience || 0,
        ...trialUpdateData,
      });
      lawyerUser = { ...lawyerUser, user_status: 'approved' };
    }

    // Also upsert LawyerProfile for backward compatibility
    if (lawyerUser) {
      const existingProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: lawyerUser.id });
      const profileData = {
        user_id: lawyerUser.id,
        firm_name: application.firm_name || '',
        phone: application.phone || '',
        bar_number: application.bar_number || '',
        bio: application.bio || '',
        states_licensed: application.states_licensed || [],
        practice_areas: application.practice_areas || [],
        years_experience: application.years_experience || 0,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email,
        ...trialUpdateData,
      };
      if (existingProfiles.length > 0) {
        await base44.asServiceRole.entities.LawyerProfile.update(existingProfiles[0].id, profileData).catch(() => {});
      } else {
        await base44.asServiceRole.entities.LawyerProfile.create(profileData).catch(() => {});
      }
    }

    // ── 3. Send email: login (already activated) or approval+activation link ──

    let emailSent = false;
    const isActivated = lawyerUser?.password_set;

    if (isActivated) {
      // Already has password — send "You're approved, log in" email
      const loginUrl = `${BASE_URL}/LawyerLogin`;
      const html = buildApprovedLoginEmail(firstName, loginUrl, free_trial_months);
      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [normalizedEmail],
            subject: "You're Approved — Cases Are Now Unlocked",
            html
          })
        });
        emailSent = res.ok;
      }
    } else {
      // Not yet activated — generate activation token, link goes to /VerifyEmail
      // The ActivationToken is the ONLY security gate. No custom OTP codes are generated.
      const { rawToken, tokenHash } = await generateTokenPair();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
        user_id: lawyerUser?.id || '',
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
        notes: `Approval activation token created for ${normalizedEmail}`
      });

      // Approval email links to /SetPassword (Step 1: set password → triggers Base44 verification code email)
      // After setting password, user is redirected to /VerifyEmail (Step 2: enter Base44 code)
      const activationUrl = `${BASE_URL}/SetPassword?email=${encodeURIComponent(normalizedEmail)}&token=${rawToken}`;
      const html = buildApprovedActivateEmail(firstName, activationUrl, free_trial_months);

      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [normalizedEmail],
            subject: "You're Approved — Activate Your Taylor Made Law Account",
            html
          })
        });
        emailSent = res.ok;
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerApplication',
      entity_id: application_id,
      action: 'application_approved',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Application approved by ${adminUser.email}. Trial: ${free_trial_months} months. Email sent: ${emailSent}. User activated: ${isActivated}`
    });

    return Response.json({ success: true, email_sent: emailSent, user_id: lawyerUser?.id });

  } catch (error) {
    console.error('Error approving application:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});