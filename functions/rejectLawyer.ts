/**
 * rejectLawyer — Admin-only. Disables a user account and sends rejection email.
 */
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
        <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildRejectionEmail(firstName, reason) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">Update on Your Taylor Made Law Access</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;"> </p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">After review, we're unable to keep your account active in the Taylor Made Law Network at this time.</p>
    ${reason ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:12px 16px;margin:16px 0;"><p style="margin:0;color:#991b1b;font-size:14px;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
    <p style="margin:16px 0;color:#333333;font-size:15px;line-height:1.7;">Your access has been removed. If you believe this is an error, please contact support.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="mailto:support@taylormadelaw.com" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Contact Support</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#9ca3af;font-size:13px;">— Taylor Made Law</p>
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
    const { user_id, rejection_reason } = body;

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const now = new Date().toISOString();

    // Get target user
    const targetUsers = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const targetUser = targetUsers[0];

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Disable the user
    await base44.asServiceRole.entities.User.update(user_id, {
      user_status: 'disabled',
      review_status: 'rejected',
      disabled_at: now,
      disabled_by: adminUser.email,
      disabled_reason: rejection_reason || 'Did not meet network requirements'
    });

    // Also update LawyerProfile if exists
    try {
      const profiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id });
      if (profiles[0]) {
        await base44.asServiceRole.entities.LawyerProfile.update(profiles[0].id, {
          status: 'restricted'
        });
      }
    } catch (e) {
      console.error('LawyerProfile update error (non-fatal):', e.message);
    }

    // Send rejection email
    if (resendKey && targetUser.email) {
      const firstName = (targetUser.full_name || targetUser.email).split(' ')[0];
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [targetUser.email],
          subject: 'Update on Your Taylor Made Law Access',
          html: buildRejectionEmail(firstName, rejection_reason)
        })
      });
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: user_id,
      action: 'lawyer_rejected',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Rejected by ${adminUser.email}. Reason: ${rejection_reason || 'none'}`
    });

    return Response.json({ success: true, message: 'Lawyer rejected and disabled. Rejection email sent.' });

  } catch (error) {
    console.error('rejectLawyer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});