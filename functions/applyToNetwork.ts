/**
 * applyToNetwork — Public endpoint. No authentication required.
 * Creates a LawyerApplication record and notifies admins.
 * User account creation happens at approval time.
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

function buildConfirmationEmail(firstName) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Application Received!</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Thank you for applying to the Taylor Made Law Network.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">We've received your application to join the <strong>Taylor Made Law Network</strong>. Our team will review your application and get back to you within 2–3 business days.</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:18px 20px;margin:24px 0;">
      <p style="margin:0 0 6px;color:#3a164d;font-weight:600;font-size:14px;">What happens next?</p>
      <ul style="margin:0;padding-left:18px;color:#4b5563;font-size:14px;line-height:1.8;">
        <li>Our team reviews your application</li>
        <li>You'll receive an email with next steps once approved</li>
        <li>Upon approval, you'll get a link to set up your account and access the Case Exchange</li>
      </ul>
    </div>
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">If you have any questions in the meantime, don't hesitate to reach out to <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;">support@taylormadelaw.com</a>.</p>
  `);
}

function buildAdminAlertEmail(fullName, email, firmName, barNumber, states, practiceAreas) {
  const adminLink = `${BASE_URL}/AdminLawyerApplications`;
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
        <a href="${adminLink}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Review in Admin Dashboard →</a>
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
      states_licensed, practice_areas, years_experience, bio,
      referrals, consent_terms, consent_referral
    } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!firm_name) {
      return Response.json({ error: 'Firm name is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Check for duplicate application
    const existingApps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail });
    const existingApp = existingApps[0] || null;

    if (existingApp && existingApp.status === 'approved') {
      return Response.json({
        success: true,
        already_approved: true,
        message: 'Your application has already been approved. Please log in.'
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
      referrals: referrals || [],
      consent_terms: consent_terms || false,
      consent_referral: consent_referral || false,
      email_verified: true,
      status: 'pending'
    };

    let application;
    if (existingApp) {
      // Re-application: update existing record
      await base44.asServiceRole.entities.LawyerApplication.update(existingApp.id, applicationData);
      application = { ...existingApp, ...applicationData };
    } else {
      application = await base44.asServiceRole.entities.LawyerApplication.create(applicationData);
    }

    // Send emails
    if (resendKey) {
      const firstName = (full_name || '').split(' ')[0] || 'there';

      // Confirmation email to applicant
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: 'Your Application Has Been Received — Taylor Made Law',
          html: buildConfirmationEmail(firstName)
        })
      });

      // Admin alert
      const allAdmins = (await base44.asServiceRole.entities.User.list()).filter(u => u.role === 'admin');
      for (const admin of allAdmins) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
            to: [admin.email],
            subject: `New Attorney Application — ${full_name || normalizedEmail}`,
            html: buildAdminAlertEmail(full_name, normalizedEmail, firm_name, bar_number, states_licensed, practice_areas)
          })
        });
      }
    }

    return Response.json({
      success: true,
      application_id: application.id,
      message: 'Application submitted successfully. Check your email for confirmation.'
    });

  } catch (error) {
    console.error('applyToNetwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});