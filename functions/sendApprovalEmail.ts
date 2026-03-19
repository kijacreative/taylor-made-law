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

function buildAccessGrantedEmail(name, loginUrl) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Approved!</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Congratulations, ${name}! Your application to join the Taylor Made Law Network has been reviewed and approved.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">You now have full access to the case marketplace, referral network, and all attorney resources.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${loginUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Sign In to Your Dashboard →</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">We're glad to have you as part of the Taylor Made Law network.</p>
  `);
}

function buildActivateAccountEmail(name, activationUrl) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Approved — Activate Your Account</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">One step left — set your password to get started.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Your application to the Taylor Made Law Network has been <strong>approved</strong>. To access the platform and begin reviewing case opportunities, please activate your account by setting your password:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Set Your Password &amp; Activate Account →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">After activation, you'll be able to:</p>
    <ul style="margin:0 0 20px;padding-left:20px;color:#333333;font-size:15px;line-height:1.8;">
      <li>Access the Case Exchange</li>
      <li>Accept case opportunities</li>
      <li>Manage your attorney profile</li>
      <li>Participate in the TML attorney network</li>
    </ul>
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">This link expires in 7 days.</p>
  `);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.user_type !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { lawyer_profile_id, has_password } = body;

    const profile = await base44.asServiceRole.entities.LawyerProfile.get(lawyer_profile_id);
    if (!profile) {
      return Response.json({ error: 'Lawyer profile not found' }, { status: 404 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: profile.user_id });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const lawyerUser = users[0];

    if (has_password) {
      const loginUrl = `https://app.taylormadelaw.com/LawyerLogin`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lawyerUser.email,
        subject: "You're Approved — You Can Now Access Cases",
        body: buildAccessGrantedEmail(lawyerUser.full_name || 'there', loginUrl)
      });
    } else {
      const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
      const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await base44.asServiceRole.entities.AttorneyInvitation.create({
        inviter_admin_user_id: user.id,
        inviter_name: user.full_name,
        invitee_email: lawyerUser.email,
        invitee_name: lawyerUser.full_name,
        token_hash: tokenHash,
        status: 'sent',
        expires_at: expiresAt.toISOString(),
        invitation_type: 'approval_activation'
      });

      const activationUrl = `https://app.taylormadelaw.com/activate?token=${token}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lawyerUser.email,
        subject: "You're Approved — Activate Your TML Account",
        body: buildActivateAccountEmail(lawyerUser.full_name || 'there', activationUrl)
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerProfile',
      entity_id: lawyer_profile_id,
      action: 'approval_email_sent',
      actor_email: user.email,
      actor_role: user.role,
      notes: `Sent approval email to ${lawyerUser.email} (has_password: ${has_password})`
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error sending approval email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});