/**
 * reviewLawyerApplication — Admin-only action on a lawyer application.
 * Actions: approve | disable | request_info
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const emailHtml = (body) => `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9f9f9;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e5e5;">
<img src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png" alt="Taylor Made Law" style="height:48px;margin-bottom:24px;">
${body}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:12px;color:#999;">Taylor Made Law — support@taylormadelaw.com</p>
</div></body></html>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });

  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, application_id, email, name, reason, message } = await req.json();

    if (!action || !application_id) {
      return Response.json({ error: 'Missing action or application_id' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Update LawyerApplication status
      await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
        status: 'active',
        reviewed_by: user.email,
        reviewed_at: now,
      });

      // Find user by email and update user_status
      if (email) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, { user_status: 'active' });
        }
      }

      // Send approval notification
      if (email) {
        await resend.emails.send({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: email,
          subject: 'Your TML Network Application Has Been Approved',
          html: emailHtml(`
            <h2 style="color:#3a164d;margin-bottom:8px;">Your Application Has Been Approved!</h2>
            <p style="color:#555;">Congratulations${name ? `, ${name}` : ''}! Your application to join the Taylor Made Law Network has been reviewed and approved.</p>
            <p style="color:#555;">You now have full access to the case marketplace, referral network, and all attorney resources.</p>
            <a href="${Deno.env.get('APP_URL') || 'https://app.taylormadelaw.com'}/login" 
               style="display:inline-block;background:#3a164d;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;margin-top:12px;">
               Sign In to Your Dashboard
            </a>
          `),
        }).catch(() => {});
      }

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'LawyerApplication', entity_id: application_id,
        action: 'application_approved', actor_email: user.email, actor_role: 'admin',
        notes: `Application approved by ${user.email}`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    if (action === 'disable') {
      // Update LawyerApplication
      await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
        status: 'disabled',
        rejection_reason: reason || '',
        reviewed_by: user.email,
        reviewed_at: now,
      });

      // Find user by email and set disabled
      if (email) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, { user_status: 'disabled' });
        }
      }

      // Send disable notification
      if (email) {
        await resend.emails.send({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: email,
          subject: 'Taylor Made Law Network — Account Update',
          html: emailHtml(`
            <h2 style="color:#c00;margin-bottom:8px;">Account Disabled</h2>
            <p style="color:#555;">Hello${name ? ` ${name}` : ''},</p>
            <p style="color:#555;">Your Taylor Made Law Network account has been disabled by our team.</p>
            ${reason ? `<p style="color:#555;"><strong>Reason:</strong> ${reason}</p>` : ''}
            <p style="color:#555;">If you believe this is a mistake, please contact our support team.</p>
            <a href="mailto:support@taylormadelaw.com"
               style="display:inline-block;background:#3a164d;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;margin-top:12px;">
               Contact Support
            </a>
          `),
        }).catch(() => {});
      }

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'LawyerApplication', entity_id: application_id,
        action: 'account_disabled', actor_email: user.email, actor_role: 'admin',
        notes: `Account disabled by ${user.email}. Reason: ${reason || 'none'}`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    if (action === 'request_info') {
      // Update application with a note
      await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
        rejection_reason: `[Info Requested ${new Date().toLocaleDateString()}]: ${message}`,
        reviewed_by: user.email,
        reviewed_at: now,
      });

      // Send email
      if (email && message) {
        await resend.emails.send({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: email,
          subject: 'Additional Information Needed — Taylor Made Law Network',
          html: emailHtml(`
            <h2 style="color:#3a164d;margin-bottom:8px;">Additional Information Required</h2>
            <p style="color:#555;">Hello,</p>
            <p style="color:#555;">Our team is reviewing your application and needs some additional information:</p>
            <div style="background:#f5f0fa;border-left:4px solid #3a164d;padding:16px;border-radius:4px;margin:16px 0;">
              <p style="color:#3a164d;margin:0;">${message}</p>
            </div>
            <p style="color:#555;">Please reply to this email or contact our support team directly.</p>
            <a href="mailto:support@taylormadelaw.com"
               style="display:inline-block;background:#3a164d;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;margin-top:12px;">
               Reply to Support
            </a>
          `),
        }).catch(() => {});
      }

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'LawyerApplication', entity_id: application_id,
        action: 'info_requested', actor_email: user.email, actor_role: 'admin',
        notes: `Info requested: ${message}`,
      }).catch(() => {});

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});