/**
 * applyToNetwork — Public endpoint. Option C Unified Identity.
 * Upserts user as status=pending (never downgrades invited/approved).
 * Sends activation email + admin alert. No password collected here.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Complete Your Application — Activate Your Account</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">One step left — verify your email and set your password.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Thank you for applying to the <strong>Taylor Made Law Network</strong>. Your application has been received and is pending review.</p>
    <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">Click below to verify your email and set your password. You'll be able to log in and track your application status right away.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Verify Email &amp; Set Password →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">This link expires in <strong>7 days</strong>. Our team typically reviews applications within 2–3 business days.</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;word-break:break-all;">Or copy: ${activationUrl}</p>
  `);
}

function buildAdminAlertEmail(fullName, email, firmName, barNumber, states, practiceAreas) {
  const adminLink = `${BASE_URL}/AdminLawyers`;
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

async function generateTokenPair() {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { rawToken, tokenHash };
}

function statusRank(s) {
  if (s === 'approved') return 3;
  if (s === 'pending') return 2;
  if (s === 'invited') return 1;
  return 0;
}

function maxStatus(current, requested) {
  if (current === 'disabled') return 'disabled';
  if (statusRank(current) >= statusRank(requested)) return current;
  return requested;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      full_name, email, phone, firm_name, bar_number,
      states_licensed, practice_areas, years_experience, bio
    } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!firm_name) {
      return Response.json({ error: 'Firm name is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Upsert user by email
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let lawyerUser = existingUsers[0] || null;
    let isNew = false;
    let alreadyActivated = false;

    if (lawyerUser) {
      if (lawyerUser.user_status === 'disabled') {
        return Response.json({
          error: 'This account has been disabled. Please contact support@taylormadelaw.com.'
        }, { status: 403 });
      }

      alreadyActivated = !!(lawyerUser.password_set && lawyerUser.email_verified);

      // Never downgrade status, fill in profile data
      const newStatus = maxStatus(lawyerUser.user_status || 'pending', 'pending');
      const updates = { user_status: newStatus };
      if (full_name) updates.full_name = full_name;
      if (phone) updates.phone = phone;
      if (firm_name) updates.firm_name = firm_name;
      if (bar_number) updates.bar_number = bar_number;
      if (states_licensed?.length) updates.states_licensed = states_licensed;
      if (practice_areas?.length) updates.practice_areas = practice_areas;
      if (years_experience) updates.years_experience = years_experience;
      if (bio) updates.bio = bio;
      updates.applied_at = new Date().toISOString();
      await base44.asServiceRole.entities.User.update(lawyerUser.id, updates);
      lawyerUser = { ...lawyerUser, ...updates };
    } else {
      // Create auth account with a random temp password.
      // The user will set their real password via the activation link.
      const tempPassword = 'TMLTemp!' + Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16)).join('');
      await base44.auth.register({
        email: normalizedEmail,
        password: tempPassword,
        full_name: full_name || ''
      });

      await new Promise(r => setTimeout(r, 1500));
      const newUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      lawyerUser = newUsers[0] || null;

      if (lawyerUser) {
        const initData = {
          user_status: 'pending',
          email_verified: false,
          password_set: false, // false until they activate with their chosen password
          applied_at: new Date().toISOString()
        };
        if (full_name) initData.full_name = full_name;
        if (phone) initData.phone = phone;
        if (firm_name) initData.firm_name = firm_name;
        if (bar_number) initData.bar_number = bar_number;
        if (states_licensed?.length) initData.states_licensed = states_licensed;
        if (practice_areas?.length) initData.practice_areas = practice_areas;
        if (years_experience) initData.years_experience = years_experience;
        if (bio) initData.bio = bio;
        await base44.asServiceRole.entities.User.update(lawyerUser.id, initData);
        lawyerUser = { ...lawyerUser, ...initData };
        isNew = true;
      }
    }

    if (!lawyerUser) {
      return Response.json({ error: 'Failed to create user record. Please try again.' }, { status: 500 });
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: lawyerUser.id,
      action: 'application_submitted',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `Applied from ${firm_name || 'unknown firm'}. Status: ${lawyerUser.user_status}`
    });

    // If already activated, just let them know to log in
    if (alreadyActivated) {
      return Response.json({
        success: true,
        already_activated: true,
        message: 'Your account already exists. Please log in to check your application status.'
      });
    }

    // Invalidate old activation tokens
    const existingTokens = await base44.asServiceRole.entities.ActivationToken.filter({
      user_email: normalizedEmail,
      token_type: 'activation'
    });
    for (const t of existingTokens) {
      if (!t.used_at) {
        await base44.asServiceRole.entities.ActivationToken.update(t.id, {
          used_at: new Date().toISOString(),
          invalidated_reason: 'superseded_by_application'
        });
      }
    }

    // Create activation token
    const { rawToken, tokenHash } = await generateTokenPair();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.ActivationToken.create({
      user_id: lawyerUser.id,
      user_email: normalizedEmail,
      token_hash: tokenHash,
      token_type: 'activation',
      expires_at: expiresAt,
      created_by_admin: null
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: lawyerUser.id,
      action: 'activation_token_created',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `Token created on application for ${normalizedEmail}`
    });

    // Send emails
    if (resendKey) {
      const firstName = (full_name || '').split(' ')[0] || 'there';
      const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;

      // Activation email to applicant
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: 'Complete Your Application — Activate Your Account',
          html: buildActivationEmail(firstName, activationUrl)
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

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: lawyerUser.id,
        action: 'admin_alert_sent',
        actor_email: normalizedEmail,
        actor_role: 'system',
        notes: `Admin alerted about new application from ${normalizedEmail}`
      });
    }

    return Response.json({
      success: true,
      is_new: isNew,
      user_status: lawyerUser.user_status,
      message: 'Application submitted. Check your email to activate your account.'
    });

  } catch (error) {
    console.error('applyToNetwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});