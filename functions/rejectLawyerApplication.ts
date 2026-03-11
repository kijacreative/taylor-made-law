/**
 * rejectLawyerApplication — Admin-only.
 * Rejects a pending LawyerApplication, sends a rejection email,
 * and optionally disables the associated user account.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
        <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">Update on Your Taylor Made Law Application</h1>
        <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">An update regarding your application.</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${name},</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Thank you for your interest in the Taylor Made Law Network. At this time, we're unable to approve your application.</p>
        ${reasonBlock}
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">If you believe this is an error or would like more information, please contact our support team:</p>
        <p style="margin:0;color:#333333;font-size:15px;"><a href="mailto:support@taylormadelaw.com" style="color:#3a164d;font-weight:600;text-decoration:none;">support@taylormadelaw.com</a></p>
        <p style="margin:24px 0 0;color:#4b5563;font-size:14px;">— Taylor Made Law</p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
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

    const now = new Date().toISOString();

    // ── 1. Mark application as rejected ───────────────────────────
    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'rejected',
      rejection_reason: rejection_reason || '',
      reviewed_by: user.email,
      reviewed_at: now,
    });

    // ── 2. Disable the user account if it exists ──────────────────
    const normalizedEmail = application.email.toLowerCase().trim();
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (existingUsers.length > 0) {
      await base44.asServiceRole.entities.User.update(existingUsers[0].id, {
        user_status: 'disabled',
        disabled_reason: `Application rejected by ${user.email}. ${rejection_reason || ''}`.trim(),
      });
    }

    // ── 3. Send rejection email ────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY');
    let emailSent = false;
    if (resendKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [application.email],
          subject: 'Update on Your Taylor Made Law Application',
          html: buildRejectionEmail(application.full_name || 'there', rejection_reason)
        })
      });
      emailSent = emailRes.ok;
    }

    // ── 4. Audit logs ──────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerApplication',
      entity_id: application_id,
      action: 'lawyer_rejected',
      actor_email: user.email,
      actor_role: 'admin',
      notes: `Application rejected by ${user.email}. Reason: ${rejection_reason || '(none)'}. Email sent: ${emailSent}.`
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerApplication',
      entity_id: application_id,
      action: 'rejection_email_sent',
      actor_email: 'system',
      actor_role: 'system',
      notes: `Rejection email ${emailSent ? 'sent' : 'failed'} to ${application.email}.`
    });

    return Response.json({ success: true, email_sent: emailSent });

  } catch (error) {
    console.error('rejectLawyerApplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});