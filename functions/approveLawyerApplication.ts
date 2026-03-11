/**
 * approveLawyerApplication — Admin-only.
 * Approves a pending LawyerApplication, upserts the user record to 'approved'
 * via upsertUserByEmail, then sends the activation email.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

function buildApprovalEmail(name, activateUrl, freeTrialMonths) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE Membership — No payment required during your trial.</p>
        </td></tr>
      </table>`
    : '';

  return emailWrapper(`
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td align="center">
        <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;display:inline-block;text-align:center;line-height:64px;font-size:28px;margin-bottom:12px;">🎉</div>
      </td></tr>
    </table>
    <h1 style="margin:0 0 8px;text-align:center;color:#111827;font-size:26px;font-weight:700;">You're Approved!</h1>
    <p style="margin:0 0 28px;text-align:center;color:#6b7280;font-size:15px;">Welcome to the Taylor Made Law Network</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Your application has been approved. Click the button below to set your password and access the attorney portal.</p>
    ${trialBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${activateUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Set Your Password &amp; Access Portal →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;text-align:center;">This link expires in 7 days.</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;word-break:break-all;">Or copy: ${activateUrl}</p>
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

    const adminUser = await base44.auth.me();
    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { application_id, free_trial_months = 0 } = body;

    if (!application_id) return Response.json({ error: 'application_id is required' }, { status: 400 });

    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ id: application_id });
    if (!apps || apps.length === 0) return Response.json({ error: 'Application not found' }, { status: 404 });

    const application = apps[0];
    if (application.status !== 'pending') {
      return Response.json({ error: 'Application is not in pending status' }, { status: 400 });
    }

    const normalizedEmail = application.email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // ── 1. Upsert user to 'approved' via shared identity service ────
    const now = new Date().toISOString();
    const upsertResult = await base44.functions.invoke('upsertUserByEmail', {
      email: normalizedEmail,
      requested_status: 'approved',
      entry_source: 'apply',
      create_if_missing: true,
      actor_email: adminUser.email,
      actor_role: 'admin',
      profile: {
        full_name: application.full_name || '',
        firm_name: application.firm_name || '',
        phone: application.phone || '',
        bar_number: application.bar_number || '',
        bio: application.bio || '',
        states_licensed: application.states_licensed || [],
        practice_areas: application.practice_areas || [],
        years_experience: application.years_experience || 0,
        referral_agreement_accepted: application.consent_referral || false,
        referral_agreement_accepted_at: application.consent_referral ? now : undefined,
        approved_at: now,
        approved_by: adminUser.email,
        free_trial_months: parseInt(free_trial_months) || 0,
      }
    });

    if (upsertResult.data?.blocked) {
      return Response.json({
        error: 'User is disabled. Please reinstate before approving.',
        blocked: true
      }, { status: 409 });
    }

    if (!upsertResult.data?.success) {
      return Response.json({ error: 'Failed to upsert user to approved status' }, { status: 500 });
    }

    // ── 1b. Create / update LawyerProfile ─────────────────────────
    const createdUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const newUser = createdUsers[0];
    if (newUser) {
      const existingProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: newUser.id });
      const profileData = {
        user_id: newUser.id,
        firm_name: application.firm_name || '',
        phone: application.phone || '',
        bar_number: application.bar_number || '',
        bio: application.bio || '',
        states_licensed: application.states_licensed || [],
        practice_areas: application.practice_areas || [],
        years_experience: application.years_experience || 0,
        status: 'approved',
        approved_at: now,
        approved_by: adminUser.email,
        ...(parseInt(free_trial_months) > 0 ? {
          subscription_status: 'trial',
          free_trial_months: parseInt(free_trial_months),
          trial_ends_at: new Date(Date.now() + parseInt(free_trial_months) * 30 * 24 * 60 * 60 * 1000).toISOString()
        } : { subscription_status: 'active' })
      };
      if (existingProfiles.length === 0) {
        await base44.asServiceRole.entities.LawyerProfile.create(profileData);
      } else {
        await base44.asServiceRole.entities.LawyerProfile.update(existingProfiles[0].id, profileData);
      }
    }

    // ── 2. Generate & store activation token ───────────────────────
    const { rawToken, tokenHash } = await generateTokenPair();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Invalidate previous unused tokens
    const existingTokens = await base44.asServiceRole.entities.ActivationToken.filter({
      user_email: normalizedEmail,
      token_type: 'activation'
    });
    for (const t of existingTokens) {
      if (!t.used_at) {
        await base44.asServiceRole.entities.ActivationToken.update(t.id, { used_at: now });
      }
    }

    const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
      token_hash: tokenHash,
      token_type: 'activation',
      user_email: normalizedEmail,
      expires_at: expiresAt,
      created_by_admin: adminUser.email,
    });

    // ── 3. Mark application approved ──────────────────────────────
    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'approved',
      reviewed_by: adminUser.email,
      reviewed_at: now,
      activation_token_hash: tokenHash,
      activation_token_expires_at: expiresAt,
      activation_token_used: false,
      user_created: false,
    });

    // ── 4. Send approval + activation email ────────────────────────
    const activateUrl = `https://app.taylormadelaw.com/Activate?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    let emailSent = false;
    if (resendKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: "You're Approved — Set Up Your Taylor Made Law Account",
          html: buildApprovalEmail(application.full_name, activateUrl, free_trial_months)
        })
      });
      emailSent = emailRes.ok;
    }

    // ── Phase 8: Comprehensive audit logging ──────────────────────
    // Log application approval
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerApplication',
      entity_id: application_id,
      action: 'application_approved',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Application approved. Free trial: ${free_trial_months} months. Activation email: ${emailSent}. User action: ${upsertResult.data?.action}.`
    });

    // Log activation token creation
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'ActivationToken',
      entity_id: tokenRecord.id,
      action: 'activation_token_created',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Activation token created for ${normalizedEmail}. Expires: ${expiresAt}.`
    });

    // Log admin alert sent
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'System',
      entity_id: 'admin_alerts',
      action: 'admin_alert_sent',
      actor_email: 'system',
      actor_role: 'system',
      notes: `Admin approval notification. Application: ${application_id}, Lawyer: ${application.full_name}.`
    });

    return Response.json({ success: true, email_sent: emailSent });

  } catch (error) {
    console.error('approveLawyerApplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});