/**
 * notifyAdminNewLawyer — Sends an alert email to all admin users when a new lawyer registers.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { lawyerName, lawyerEmail, firmName, states, practiceAreas } = body;

    if (!lawyerEmail) {
      return Response.json({ error: 'Missing lawyer info' }, { status: 400 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Correct admin route: /AdminLawyers
    const adminLink = `${BASE_URL}/AdminLawyers`;

    const emailBody = `<!DOCTYPE html>
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
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          <tr><td>
            <span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:6px 12px;border-radius:6px;">⚖️ Action Required</span>
          </td></tr>
        </table>
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">New Attorney Application</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">A new attorney has completed onboarding and is awaiting your approval.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0fa;border-radius:10px;padding:20px;margin-bottom:28px;">
          <tr><td>
            <p style="margin:0 0 14px;color:#3a164d;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Applicant Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
              <tr><td style="padding:5px 0;color:#6b7280;width:35%;">Name</td><td style="padding:5px 0;font-weight:600;">${lawyerName}</td></tr>
              <tr><td style="padding:5px 0;color:#6b7280;">Email</td><td style="padding:5px 0;font-weight:600;">${lawyerEmail}</td></tr>
              <tr><td style="padding:5px 0;color:#6b7280;">Firm</td><td style="padding:5px 0;font-weight:600;">${firmName || '—'}</td></tr>
              <tr><td style="padding:5px 0;color:#6b7280;">States</td><td style="padding:5px 0;font-weight:600;">${(states || []).join(', ') || '—'}</td></tr>
              <tr><td style="padding:5px 0;color:#6b7280;">Practice Areas</td><td style="padding:5px 0;font-weight:600;">${(practiceAreas || []).join(', ') || '—'}</td></tr>
            </table>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
          <tr><td align="center">
            <a href="${adminLink}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Review &amp; Approve in Admin Dashboard →</a>
          </td></tr>
        </table>
        <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;word-break:break-all;">Or paste: ${adminLink}</p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Taylor Made Law Admin Alerts</p>
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">This is an automated message from the Taylor Made Law Network.</p>
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    let adminsNotified = 0;
    if (resendKey) {
      for (const admin of adminUsers) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
            to: [admin.email],
            subject: `New Attorney Requested Access — Approval Needed: ${lawyerName}`,
            html: emailBody
          })
        });
        adminsNotified++;
      }
    }

    return Response.json({ success: true, admins_notified: adminsNotified });
  } catch (error) {
    console.error('notifyAdminNewLawyer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});