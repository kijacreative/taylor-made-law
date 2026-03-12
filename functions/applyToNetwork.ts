/**
 * applyToNetwork — Public endpoint. No authentication required.
 * Creates LawyerApplication, generates ActivationToken, sends activation email.
 * Does NOT call inviteUser() or User.filter() — those don't work in backend functions.
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

function buildActivationEmail(firstName, activationUrl) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Set Up Your Account</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">You're one step away from accessing the Taylor Made Law Network.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">Thank you for applying to the <strong>Taylor Made Law Network</strong>. Click the button below to set your password and access your attorney dashboard.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td align="center">
        <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate My Account →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">Or copy this link into your browser:</p>
    <p style="margin:0 0 24px;color:#3a164d;font-size:12px;word-break:break-all;text-align:center;">${activationUrl}</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:16px 18px;margin:0;">
      <p style="margin:0 0 6px;color:#3a164d;font-weight:600;font-size:14px;">What happens next?</p>
      <ul style="margin:0;padding-left:18px;color:#4b5563;font-size:14px;line-height:1.8;">
        <li>Set your password using the link above (expires in 7 days)</li>
        <li>Log in and explore your attorney dashboard</li>
        <li>Our team reviews your application within 2–3 business days</li>
        <li>You'll be notified when you're approved for full access</li>
      </ul>
    </div>
  `);
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

async function generateTokenPair() {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { rawToken, tokenHash };
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
    const firstName = (full_name || '').split(' ')[0] || 'there';

    // ── 1. Create / update LawyerApplication ─────────────────────────────────
    const existingApps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail });
    const existingApp = existingApps[0] || null;

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
      status: existingApp?.status === 'approved' ? 'approved' : 'pending'
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

    // ── 2. Generate ActivationToken and send activation email ─────────────────
    const { rawToken, tokenHash } = await generateTokenPair();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Invalidate old unused tokens for this email
    const oldTokens = await base44.asServiceRole.entities.ActivationToken.filter({
      user_email: normalizedEmail,
      token_type: 'activation'
    }).catch(() => []);
    for (const t of oldTokens) {
      if (!t.used_at) {
        await base44.asServiceRole.entities.ActivationToken.update(t.id, {
          used_at: new Date().toISOString()
        }).catch(() => {});
      }
    }

    await base44.asServiceRole.entities.ActivationToken.create({
      user_email: normalizedEmail,
      token_hash: tokenHash,
      token_type: 'activation',
      expires_at: expiresAt,
    });

    const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: 'Activate Your Taylor Made Law Account',
          html: buildActivationEmail(firstName, activationUrl)
        })
      }).catch(() => {});
    }

    // ── 3. Admin alert ────────────────────────────────────────────────────────
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
      message: 'Application submitted. Check your email to activate your account.'
    });

  } catch (error) {
    console.error('applyToNetwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});