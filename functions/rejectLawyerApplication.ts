import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const YEAR = new Date().getFullYear();

function buildRejectionEmail(name, rejectionReason) {
  const reasonBlock = rejectionReason
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#fef9f0;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0 0 4px;color:#92400e;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Reason Provided</p>
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${rejectionReason}</p>
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
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">Application Status Update</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">An update regarding your Taylor Made Law application.</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${name},</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Thank you for your interest in joining the Taylor Made Law attorney network. After carefully reviewing your application, we are unable to approve your membership at this time.</p>
        ${reasonBlock}
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">If you have questions about this decision or believe this was made in error, please contact our team:</p>
        <p style="margin:0;color:#333333;font-size:15px;line-height:1.7;"><a href="mailto:support@taylormadelaw.com" style="color:#3a164d;font-weight:600;text-decoration:none;">support@taylormadelaw.com</a></p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Taylor Made Law</p>
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">This is an automated message from the Taylor Made Law Network.</p>
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
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { application_id, rejection_reason } = body;

    if (!application_id) {
      return Response.json({ error: 'application_id is required' }, { status: 400 });
    }

    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ id: application_id });
    if (!apps || apps.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }
    const application = apps[0];

    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'rejected',
      rejection_reason: rejection_reason || '',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString()
    });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Taylor Made Law <noreply@taylormadelaw.com>',
        to: [application.email],
        subject: 'Update on Your Taylor Made Law Application',
        html: buildRejectionEmail(application.full_name, rejection_reason)
      })
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error rejecting application:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});