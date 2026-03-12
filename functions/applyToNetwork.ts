/**
 * applyToNetwork — Public endpoint. No authentication required.
 * Creates LawyerApplication and sends admin alert ONLY.
 * Does NOT send any activation email to the lawyer at this stage.
 * Activation email is sent by approveLawyerApplication after admin review.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
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

function buildAdminAlertEmail(fullName, email, firmName, barNumber, states, practiceAreas) {
  return emailWrapper(`
    <div style="background:#dbeafe;border-radius:8px;padding:10px 16px;margin-bottom:20px;display:inline-block;">
      <span style="font-weight:700;color:#1e40af;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">⚖️ New Attorney Application</span>
    </div>
    <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">New Application Submitted</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">An attorney has applied and is pending your review.</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:18px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
        <tr><td style="padding:5px 0;color:#6b7280;width:35%;font-weight:500;">Name</td><td style="padding:5px 0;font-weight:600;">${fullName || '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Email</td><td style="padding:5px 0;font-weight:600;">${email}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Firm</td><td style="padding:5px 0;font-weight:600;">${firmName || '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Bar #</td><td style="padding:5px 0;font-weight:600;">${barNumber || '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">States</td><td style="padding:5px 0;font-weight:600;">${(states || []).join(', ') || '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Practice Areas</td><td style="padding:5px 0;font-weight:600;">${(practiceAreas || []).join(', ') || '—'}</td></tr>
      </table>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
      <tr><td align="center">
        <a href="${BASE_URL}/AdminLawyers" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Review in Admin Dashboard →</a>
      </td></tr>
    </table>
  `);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      full_name, email, phone, firm_name, bar_number,
      states_licensed, practice_areas, years_experience, bio
    } = body;

    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });
    if (!firm_name) return Response.json({ error: 'Firm name is required' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // ── 1. Create / update LawyerApplication ─────────────────────────────────
    const existingApps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail });
    const existingApp = existingApps[0] || null;

    // If already approved, don't re-open the application
    if (existingApp?.status === 'approved') {
      return Response.json({
        success: true,
        already_approved: true,
        message: 'An application for this email is already approved. Check your email for the activation link or contact support.',
      });
    }

    const applicationData = {
      full_name: full_name || '',
      email: normalizedEmail,
      phone: phone || '',
      firm_name: firm_name || '',
      bar_number: bar_number || '',
      years_experience: years_experience || 0,
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      bio: bio || '',
      email_verified: false,
      status: 'pending',
    };

    let application;
    if (existingApp) {
      await base44.asServiceRole.entities.LawyerApplication.update(existingApp.id, applicationData);
      application = { ...existingApp, ...applicationData };
    } else {
      application = await base44.asServiceRole.entities.LawyerApplication.create(applicationData);
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerApplication',
      entity_id: application.id,
      action: 'application_submitted',
      actor_email: normalizedEmail,
      actor_role: 'system',
      notes: `Application submitted by ${normalizedEmail}`
    }).catch(() => {});

    // ── 2. Send admin alert only — no activation email to lawyer ──────────────
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
          to: ['admin@taylormadelaw.com'],
          subject: `New Attorney Application — ${full_name || normalizedEmail}`,
          html: buildAdminAlertEmail(full_name, normalizedEmail, firm_name, bar_number, states_licensed, practice_areas)
        })
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      application_id: application.id,
      message: 'Application received. Our team will review it within 24–48 hours.',
    });

  } catch (error) {
    console.error('applyToNetwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});