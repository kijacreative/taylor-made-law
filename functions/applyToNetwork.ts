/**
 * applyToNetwork — Public endpoint. No authentication required.
 * Option C Unified Identity:
 *  1. Creates/updates LawyerApplication record
 *  2. Upserts User entity (user_status=pending, never downgrade)
 *  3. Creates ActivationToken + sends activation email immediately
 *     (so user can activate and log in before admin review)
 *  4. Sends admin alert
 *
 * If user already has an active account (password_set), returns already_activated=true.
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

function buildApplicationReceivedEmail(firstName) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Application Received!</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">We've received your application to the Taylor Made Law Network.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Thank you for applying to the <strong>Taylor Made Law Network</strong>. You will receive a separate email shortly with a link to set up your account password.</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:16px 18px;margin:24px 0 0;">
      <p style="margin:0 0 6px;color:#3a164d;font-weight:600;font-size:14px;">What happens next?</p>
      <ul style="margin:0;padding-left:18px;color:#4b5563;font-size:14px;line-height:1.8;">
        <li>Check your inbox for an account setup email</li>
        <li>Click the link to set your password and access your dashboard</li>
        <li>Our team reviews your application (2–3 business days)</li>
        <li>You'll receive a separate email when approved for full access</li>
      </ul>
    </div>
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
  return statusRank(current) >= statusRank(requested) ? current : requested;
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

    if (existingApp?.status === 'approved') {
      // Already approved — check if they have an active account
      const approvedUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      const approvedUser = approvedUsers[0];
      if (approvedUser?.password_set) {
        return Response.json({ success: true, already_activated: true });
      }
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

    // ── 2. Upsert User entity (user_status = pending, never downgrade) ────────

    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let userEntity = existingUsers[0] || null;

    if (userEntity) {
      if (userEntity.user_status === 'disabled') {
        return Response.json({
          success: false,
          error: 'This account has been disabled. Please contact support@taylormadelaw.com.'
        }, { status: 403 });
      }
      const newStatus = maxStatus(userEntity.user_status || 'pending', 'pending');
      const updates = {
        firm_name: firm_name || userEntity.firm_name || '',
        phone: phone || userEntity.phone || '',
        bar_number: bar_number || userEntity.bar_number || '',
        bio: bio || userEntity.bio || '',
        states_licensed: states_licensed?.length ? states_licensed : (userEntity.states_licensed || []),
        practice_areas: practice_areas?.length ? practice_areas : (userEntity.practice_areas || []),
      };
      if (full_name) updates.full_name = full_name;
      if (newStatus !== userEntity.user_status) updates.user_status = newStatus;
      await base44.asServiceRole.entities.User.update(userEntity.id, updates);
      userEntity = { ...userEntity, ...updates };
    } else {
      // Try direct create first
      try {
        userEntity = await base44.asServiceRole.entities.User.create({
          email: normalizedEmail,
          user_status: 'pending',
          email_verified: false,
          password_set: false,
          full_name: full_name || '',
          firm_name: firm_name || '',
          phone: phone || '',
          bar_number: bar_number || '',
          bio: bio || '',
          states_licensed: states_licensed || [],
          practice_areas: practice_areas || [],
        });
      } catch (createErr) {
        console.log('Direct User.create failed, falling back to inviteUser:', createErr.message);
        await base44.users.inviteUser(normalizedEmail, 'user').catch(() => {});
        await new Promise(r => setTimeout(r, 1500));
        const found = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
        userEntity = found[0] || null;
        if (userEntity) {
          await base44.asServiceRole.entities.User.update(userEntity.id, {
            user_status: 'pending',
            email_verified: false,
            password_set: false,
            full_name: full_name || '',
            firm_name: firm_name || '',
            phone: phone || '',
            bar_number: bar_number || '',
            bio: bio || '',
            states_licensed: states_licensed || [],
            practice_areas: practice_areas || [],
          });
        }
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: userEntity?.id || normalizedEmail,
      action: 'user_upserted',
      actor_email: normalizedEmail,
      actor_role: 'system',
      notes: `User upserted via apply. Status: ${userEntity?.user_status}`
    }).catch(() => {});

    // ── 3. Send activation email (if not already activated) ──────────────────

    if (userEntity?.password_set) {
      // Already activated — just alert admins, no activation email needed
      if (resendKey) {
        const allAdmins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }).catch(() => []);
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
          }).catch(() => {});
        }
      }
      return Response.json({ success: true, already_activated: true });
    }

    if (userEntity) {
      // Invite user via platform — this creates a verified auth account and sends
      // the platform's password-setup email. No custom activation token needed.
      await base44.users.inviteUser(normalizedEmail, 'user').catch((e) => {
        console.log('inviteUser result (may be ok if already exists):', e?.message);
      });

      // Mark user as email_verified since platform handles it
      await base44.asServiceRole.entities.User.update(userEntity.id, {
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      }).catch(() => {});

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: userEntity.id,
        action: 'invite_sent',
        actor_email: normalizedEmail,
        actor_role: 'system',
        notes: `Platform invite sent to ${normalizedEmail} via apply`
      }).catch(() => {});

      // Send application confirmation email
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [normalizedEmail],
            subject: 'Application Received — Taylor Made Law Network',
            html: buildApplicationReceivedEmail(firstName)
          })
        }).catch(() => {});
      }
    }

    // ── 4. Admin alert ────────────────────────────────────────────────────────

    if (resendKey) {
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
        }).catch(() => {});
      }

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'LawyerApplication',
        entity_id: application.id,
        action: 'admin_alert_sent',
        actor_email: normalizedEmail,
        actor_role: 'system',
        notes: `Admin alert sent for ${normalizedEmail}`
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