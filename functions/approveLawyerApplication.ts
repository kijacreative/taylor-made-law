import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
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
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Taylor Made Law</p>
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">This is an automated message from the Taylor Made Law Network.</p>
        <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildApprovalEmail(name, dashboardUrl, freeTrialMonths) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE Membership — No payment required during your trial.</p>
        </td></tr>
      </table>`
    : '';

  return emailWrapper(`
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td align="center">
        <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;display:inline-block;text-align:center;line-height:64px;font-size:28px;margin-bottom:12px;">🎉</div>
      </td></tr>
    </table>
    <h1 style="margin:0 0 8px;text-align:center;color:#111827;font-size:26px;font-weight:700;">You're Approved!</h1>
    <p style="margin:0 0 28px;text-align:center;color:#6b7280;font-size:15px;">Welcome to the Taylor Made Law Network</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Your application to join the Taylor Made Law Network has been <strong>approved</strong>.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">You will receive a <strong>separate email</strong> shortly with a link to set up your account password. Once your password is set, click below to access the attorney portal:</p>
    ${trialBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${dashboardUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Access Attorney Portal →</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Questions? Contact us at <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;">support@taylormadelaw.com</a></p>
  `);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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

    const normalizedEmail = application.email.toLowerCase().trim();

    // Mark application as approved
    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'approved',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
      activation_token_used: false,
      user_created: true,
    });

    // Invite the user via Base44 — this sends them a password-setup email
    // and creates their auth account. The invite email is the primary onboarding flow.
    try {
      await base44.users.inviteUser(normalizedEmail, 'user');
    } catch (inviteErr) {
      console.log('inviteUser note (may already exist):', inviteErr.message);
    }

    // Small delay to allow Base44 to create the User entity after invite
    await new Promise(r => setTimeout(r, 1000));

    // Create or update the User record with approved status and application data
    const profileData = {
      user_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.email,
      full_name: application.full_name,
      firm_name: application.firm_name,
      phone: application.phone || '',
      bar_number: application.bar_number || '',
      states_licensed: application.states_licensed || [],
      practice_areas: application.practice_areas || [],
      years_experience: application.years_experience || 0,
      bio: application.bio || '',
      free_trial_months: parseInt(free_trial_months) || 0,
    };

    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (existingUsers && existingUsers.length > 0) {
      await base44.asServiceRole.entities.User.update(existingUsers[0].id, profileData);
    } else {
      // Create the User entity record so the dashboard works on first login
      await base44.asServiceRole.entities.User.create({
        email: normalizedEmail,
        ...profileData,
        password_set: false,
        email_verified: false,
      });
    }

    // Send a separate branded approval notification email
    const dashboardUrl = 'https://app.taylormadelaw.com/LawyerDashboard';
    const resendKey = Deno.env.get('RESEND_API_KEY');
    let emailSent = false;
    if (resendKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [application.email],
          subject: "You're Approved — Welcome to the Taylor Made Law Network",
          html: buildApprovalEmail(application.full_name, dashboardUrl, free_trial_months)
        })
      });
      emailSent = emailRes.ok;
    }

    return Response.json({ success: true, email_sent: emailSent });

  } catch (error) {
    console.error('Error approving application:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});