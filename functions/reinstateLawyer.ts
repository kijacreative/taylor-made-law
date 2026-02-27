/**
 * reinstateLawyer — Admin-only. Reinstates a disabled lawyer back to their previous status.
 * Sends a "Your Access Has Been Restored" email.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

function buildReinstatedEmail(firstName, loginUrl) {
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
        <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Your Access Has Been Restored</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Taylor Made Law Network</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">Your access to the Taylor Made Law Network has been restored. You can now log in.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
          <tr><td align="center">
            <a href="${loginUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Log In →</a>
          </td></tr>
        </table>
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { user_id, reinstate_to_status = 'pending' } = body;

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const lawyerUser = users[0];
    if (!lawyerUser) return Response.json({ error: 'User not found' }, { status: 404 });
    if (lawyerUser.user_status !== 'disabled') {
      return Response.json({ error: 'User is not disabled' }, { status: 400 });
    }

    const validStatus = ['approved', 'pending', 'invited'].includes(reinstate_to_status) ? reinstate_to_status : 'pending';

    await base44.asServiceRole.entities.User.update(user_id, {
      user_status: validStatus,
      reinstated_at: new Date().toISOString(),
      reinstated_by: adminUser.email,
      disabled_at: null,
      disabled_by: null,
      disabled_reason: null
    });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    let emailSent = false;
    if (resendKey) {
      const firstName = (lawyerUser.full_name || '').split(' ')[0] || 'there';
      const loginUrl = `${BASE_URL}/LawyerLogin`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [lawyerUser.email],
          subject: 'Your Access Has Been Restored — Taylor Made Law',
          html: buildReinstatedEmail(firstName, loginUrl)
        })
      });
      emailSent = res.ok;
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: user_id,
      action: 'lawyer_reinstated',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Reinstated to ${validStatus} by ${adminUser.email}`
    });

    return Response.json({ success: true, new_status: validStatus, email_sent: emailSent });
  } catch (error) {
    console.error('reinstateLawyer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});