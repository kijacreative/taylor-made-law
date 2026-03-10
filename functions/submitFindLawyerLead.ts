/**
 * submitFindLawyerLead — Public endpoint.
 * Handles all find-a-lawyer lead submission logic server-side:
 * 1. Validate payload
 * 2. Create local Lead record
 * 3. Create ConsentLog
 * 4. Send to Lead Docket via server-side HTTP (credentials never exposed to browser)
 * 5. Update lead with sync result
 * 6. Send confirmation email to user
 * 7. Notify admins
 * 8. Handle optional attorney invitation
 * 9. Write audit logs throughout
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();
const CONSENT_VERSION = '1.0.0';
const CONSENT_TEXT = `By submitting this form, I consent to Taylor Made Law collecting my personal information to facilitate connecting me with a qualified attorney. I understand that my information will be shared with attorneys in the Taylor Made Law network who practice in the relevant area and jurisdiction. I may be contacted by phone, email, or text message regarding my legal matter. Submitting this form does not create an attorney-client relationship. This consent can be withdrawn at any time by contacting us.`;

// Lead Docket webhook URL — set LEAD_DOCKET_WEBHOOK_URL env var to override
const LEAD_DOCKET_URL = Deno.env.get('LEAD_DOCKET_WEBHOOK_URL') || 'https://taylormadelaw.leaddocket.com/opportunities/form/1';

function buildConfirmationEmail(firstName, practiceArea, state, urgency) {
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
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td align="center">
            <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;display:inline-block;text-align:center;line-height:64px;font-size:28px;">✓</div>
          </td></tr>
        </table>
        <h1 style="margin:0 0 8px;text-align:center;color:#111827;font-size:26px;font-weight:700;">Thank You, ${firstName}!</h1>
        <p style="margin:0 0 28px;text-align:center;color:#6b7280;font-size:15px;">Your request has been submitted successfully.</p>
        <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Our team is reviewing your information and will work to match you with a qualified attorney in our network. You can expect to hear from us within <strong>24–48 hours</strong>.</p>
        <div style="background:#f5f0fa;border-left:4px solid #3a164d;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
          <p style="margin:0 0 10px;color:#3a164d;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Your Submission</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
            <tr><td style="padding:4px 0;color:#6b7280;width:40%;">Practice Area</td><td style="padding:4px 0;font-weight:500;">${practiceArea}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">State</td><td style="padding:4px 0;font-weight:500;">${state}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Urgency</td><td style="padding:4px 0;font-weight:500;text-transform:capitalize;">${urgency}</td></tr>
          </table>
        </div>
        <p style="margin:0 0 10px;color:#333333;font-weight:600;font-size:15px;">What happens next?</p>
        <ul style="margin:0 0 24px;padding-left:0;list-style:none;">
          <li style="padding:5px 0;color:#374151;font-size:14px;display:flex;gap:10px;"><span style="color:#3a164d;font-weight:700;">✓</span> Our team reviews your case details</li>
          <li style="padding:5px 0;color:#374151;font-size:14px;display:flex;gap:10px;"><span style="color:#3a164d;font-weight:700;">✓</span> We match you with qualified attorneys in our network</li>
          <li style="padding:5px 0;color:#374151;font-size:14px;display:flex;gap:10px;"><span style="color:#3a164d;font-weight:700;">✓</span> You'll be contacted within 24–48 hours</li>
        </ul>
        <p style="margin:0;color:#9ca3af;font-size:13px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildAdminAlertEmail(data, leadId) {
  const adminLink = `${BASE_URL}/AdminLeads`;
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
        <span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:6px 12px;border-radius:6px;margin-bottom:20px;">🔔 New Lead</span>
        <h2 style="margin:0 0 6px;color:#111827;font-size:20px;font-weight:700;">New Lead Submitted</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Lead ID: ${leadId}</p>
        <div style="background:#f9fafb;border-radius:8px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 10px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Client</p>
          <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#6b7280;width:35%;">Name</td><td style="padding:4px 0;font-weight:600;">${data.first_name} ${data.last_name}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;"><a href="mailto:${data.email}" style="color:#3a164d;">${data.email}</a></td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Phone</td><td style="padding:4px 0;"><a href="tel:${data.phone}" style="color:#3a164d;">${data.phone}</a></td></tr>
          </table>
        </div>
        <div style="background:#f5f0fa;border-radius:8px;padding:18px;margin-bottom:24px;">
          <p style="margin:0 0 10px;color:#3a164d;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Case</p>
          <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#6b7280;width:35%;">Practice Area</td><td style="padding:4px 0;font-weight:600;">${data.practice_area}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">State</td><td style="padding:4px 0;font-weight:600;">${data.state}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Urgency</td><td style="padding:4px 0;font-weight:600;text-transform:capitalize;">${data.urgency}</td></tr>
          </table>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${adminLink}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Review Lead in Dashboard →</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
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
    const body = await req.json();
    const {
      first_name, last_name, email, phone,
      practice_area, state, description, urgency, consent,
      invite_attorney_email, invite_attorney_name, invite_message
    } = body;

    // ── 1. Validate required fields ────────────────────────────────
    if (!first_name || !last_name || !email || !phone || !practice_area || !state) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!consent) {
      return Response.json({ error: 'Consent is required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const now = new Date().toISOString();

    // ── 2. Create lead locally first ───────────────────────────────
    const lead = await base44.asServiceRole.entities.Lead.create({
      first_name,
      last_name,
      email,
      phone,
      practice_area,
      state,
      description: description || '',
      urgency: urgency || 'medium',
      consent_given: true,
      consent_version: CONSENT_VERSION,
      status: 'new',
      source: 'website',
      sync_status: 'pending',
      last_sync_attempt_at: now,
    });

    // ── 3. Create consent log ──────────────────────────────────────
    await base44.asServiceRole.entities.ConsentLog.create({
      entity_type: 'Lead',
      entity_id: lead.id,
      consent_type: 'intake_terms',
      consent_version: CONSENT_VERSION,
      consent_text: CONSENT_TEXT,
      consented_at: now,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'lead_created',
      actor_email: email,
      actor_role: 'public',
      notes: `Lead created from website. Practice area: ${practice_area}, State: ${state}`,
    });

    // ── 4. Send to Lead Docket server-side ─────────────────────────
    let syncStatus = 'failed';
    let syncError = null;
    let leadDocketId = null;

    try {
      const ldRes = await fetch(LEAD_DOCKET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, email, phone, state, practice_area, description, urgency }),
      });

      if (ldRes.ok) {
        syncStatus = 'sent';
        try {
          const ldBody = await ldRes.text();
          const ldData = ldBody ? JSON.parse(ldBody) : {};
          leadDocketId = ldData?.id || ldData?.lead_id || ldData?.opportunity_id || null;
        } catch {}
      } else {
        const errText = await ldRes.text().catch(() => '');
        syncError = `HTTP ${ldRes.status}: ${ldRes.statusText}${errText ? ' — ' + errText.slice(0, 200) : ''}`;
      }
    } catch (ldErr) {
      syncError = ldErr.message;
    }

    // ── 5. Update lead with sync result ────────────────────────────
    const syncUpdate = {
      sync_status: syncStatus,
      last_sync_attempt_at: new Date().toISOString(),
    };
    if (leadDocketId) syncUpdate.lead_docket_id = leadDocketId;
    if (syncError) syncUpdate.sync_error_message = syncError;

    await base44.asServiceRole.entities.Lead.update(lead.id, syncUpdate);

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Lead',
      entity_id: lead.id,
      action: syncStatus === 'sent' ? 'lead_sent_to_lead_docket' : 'lead_sync_failed',
      actor_email: 'system',
      actor_role: 'system',
      notes: syncStatus === 'sent'
        ? `Lead Docket sync successful. External ID: ${leadDocketId || 'not returned'}`
        : `Lead Docket sync failed: ${syncError}`,
    });

    // ── 6. Send confirmation email to user ─────────────────────────
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [email],
          subject: 'We Received Your Request — Taylor Made Law',
          html: buildConfirmationEmail(first_name, practice_area, state, urgency || 'medium'),
        }),
      });

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'Lead',
        entity_id: lead.id,
        action: 'confirmation_email_sent',
        actor_email: 'system',
        actor_role: 'system',
        notes: `Confirmation email sent to ${email}`,
      });
    }

    // ── 7. Notify admins ───────────────────────────────────────────
    if (resendKey) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const adminUsers = allUsers.filter(u => u.role === 'admin');
      for (const admin of adminUsers) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
            to: [admin.email],
            subject: `🔔 New Lead: ${first_name} ${last_name} — ${practice_area}`,
            html: buildAdminAlertEmail({ first_name, last_name, email, phone, practice_area, state, urgency }, lead.id),
          }),
        });
      }
    }

    // ── 8. Handle optional attorney invitation ─────────────────────
    if (invite_attorney_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite_attorney_email)) {
      await base44.asServiceRole.entities.Invitation.create({
        inviter_email: email,
        inviter_name: `${first_name} ${last_name}`,
        invitee_email: invite_attorney_email,
        invitee_name: invite_attorney_name || '',
        message: invite_message || 'I thought you might be interested in joining the Taylor Made Law network.',
        token: crypto.randomUUID(),
        status: 'pending',
        sent_at: now,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [invite_attorney_email],
            subject: `${first_name} ${last_name} Invites You to Join Taylor Made Law`,
            html: `<p>Hi${invite_attorney_name ? ' ' + invite_attorney_name : ''},</p><p>${first_name} ${last_name} thinks you'd be a great fit for the Taylor Made Law attorney network.</p><p><a href="${BASE_URL}/JoinNetwork">Apply here →</a></p>`,
          }),
        });
      }
    }

    return Response.json({
      success: true,
      lead_id: lead.id,
      sync_status: syncStatus,
    });

  } catch (error) {
    console.error('submitFindLawyerLead error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});