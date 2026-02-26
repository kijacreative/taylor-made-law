import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const YEAR = new Date().getFullYear();

function buildInviteEmail(name, activationUrl, adminNote) {
  const noteBlock = adminNote
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#f5f0fa;border-left:4px solid #3a164d;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0 0 4px;color:#3a164d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Note from the TML Team</p>
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${adminNote}</p>
        </td></tr>
      </table>`
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
        <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">You're Invited to Join the Taylor Made Law Network</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">A private attorney platform for trusted legal professionals.</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${name},</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">You've been personally invited to join the <strong>Taylor Made Law Network</strong> — a private attorney platform designed to connect trusted legal professionals and distribute vetted case opportunities.</p>
        ${noteBlock}
        <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">To get started, activate your account by clicking the button below:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Your Account →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.7;">This secure link will expire in <strong>7 days</strong>. Once activated, you'll be able to log in, complete your attorney profile, and access available cases in the Case Exchange.</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;word-break:break-all;">Or copy: ${activationUrl}</p>
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.user_type !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, full_name, firm_name, states_served, practice_areas, admin_note, send_email = true } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await base44.asServiceRole.entities.AttorneyInvitation.create({
      inviter_admin_user_id: user.id,
      inviter_name: user.full_name,
      invitee_email: email.toLowerCase(),
      invitee_name: full_name || '',
      firm_name: firm_name || '',
      states_served: states_served || [],
      practice_areas: practice_areas || [],
      admin_note: admin_note || '',
      token_hash: tokenHash,
      status: 'sent',
      expires_at: expiresAt.toISOString(),
      invitation_type: 'admin_invite'
    });

    try {
      await base44.auth.inviteUser(email.toLowerCase(), 'user');
    } catch (inviteErr) {
      console.log('User invite note:', inviteErr.message);
    }

    if (send_email) {
      const activationUrl = `https://app.taylormadelaw.com/activate?token=${token}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: "You're Invited to Join the Taylor Made Law Network",
        body: buildInviteEmail(full_name || 'there', activationUrl, admin_note)
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'AttorneyInvitation',
      entity_id: invitation.id,
      action: 'invite_created',
      actor_email: user.email,
      actor_role: user.role,
      notes: `Invited ${email} to join TML network`
    });

    return Response.json({ success: true, invitation_id: invitation.id, message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('Error inviting attorney:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});