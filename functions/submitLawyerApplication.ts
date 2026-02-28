/**
 * submitLawyerApplication — Public endpoint, no auth required.
 * Creates/updates user record via upsert logic (status=pending),
 * sends activation email immediately (so they can activate while waiting for approval),
 * notifies admins.
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

function buildApplicationReceivedEmail(firstName, activationUrl) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#111827;font-size:26px;font-weight:700;">Application Received!</h1>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">You're in the approval queue.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Thank you for applying to the Taylor Made Law Network. Our team will review your credentials within <strong>2–3 business days</strong>.</p>
    <p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;"><strong>While you wait</strong>, you can activate your account by setting your password. This way you'll be ready to log in the moment you're approved:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${activationUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Activate Your Account →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">This link expires in 7 days.</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:16px 20px;margin-top:24px;">
      <p style="margin:0 0 8px;color:#3a164d;font-size:14px;font-weight:600;">What happens next:</p>
      <p style="margin:0 0 4px;color:#374151;font-size:14px;">✓ Activate your account (set your password above)</p>
      <p style="margin:0 0 4px;color:#374151;font-size:14px;">✓ Admin reviews your application (2–3 business days)</p>
      <p style="margin:0;color:#374151;font-size:14px;">✓ Upon approval — full access to Case Exchange unlocks</p>
    </div>
  `);
}

function buildAdminAlertEmail(fullName, email, firmName, states, practiceAreas, adminLink) {
  return emailWrapper(`
    <div style="background:#fef3c7;border-radius:8px;padding:10px 16px;margin-bottom:20px;display:inline-block;">
      <span style="font-weight:700;color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">⚖️ Action Required</span>
    </div>
    <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">New Lawyer Application — Approval Needed</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">A new lawyer submitted an application and is waiting for approval.</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:18px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
        <tr><td style="padding:5px 0;color:#6b7280;width:35%;font-weight:500;">Name</td><td style="padding:5px 0;font-weight:600;">${fullName}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Email</td><td style="padding:5px 0;font-weight:600;">${email}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Firm</td><td style="padding:5px 0;font-weight:600;">${firmName}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">States</td><td style="padding:5px 0;font-weight:600;">${(states || []).join(', ') || '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Practice Areas</td><td style="padding:5px 0;font-weight:600;">${(practiceAreas || []).join(', ') || '—'}</td></tr>
      </table>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
      <tr><td align="center">
        <a href="${adminLink}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Review &amp; Approve in Admin Dashboard →</a>
      </td></tr>
    </table>
  `);
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
      years_experience, states_licensed, practice_areas,
      bio, referrals, consent_terms, consent_referral
    } = body;

    if (!full_name || !email || !firm_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Upsert user with status=pending (won't downgrade approved/disabled)
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let lawyerUser = existingUsers[0] || null;

    const profileFields = {
      firm_name: firm_name || '',
      phone: phone || '',
      bar_number: bar_number || '',
      bio: bio || '',
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      years_experience: years_experience ? parseInt(years_experience) : 0,
      referral_agreement_accepted: !!consent_referral,
      consent_terms_at: consent_terms ? new Date().toISOString() : null
    };
    if (consent_referral) profileFields.referral_agreement_accepted_at = new Date().toISOString();

    if (lawyerUser) {
      if (lawyerUser.user_status === 'disabled') {
        return Response.json({ 
          error: 'Your account has been disabled. Please contact support@taylormadelaw.com.' 
        }, { status: 403 });
      }

      const newStatus = maxStatus(lawyerUser.user_status || 'invited', 'pending');
      const updates = {
        user_status: newStatus,
        ...profileFields
      };
      await base44.asServiceRole.entities.User.update(lawyerUser.id, updates);
      lawyerUser = { ...lawyerUser, ...updates };
    } else {
      // Create a pending LawyerApplication record to store the submission
      // The actual user account will be created when admin approves OR we use the platform invite
      // Store application in LawyerApplication entity first, then try to create user
      const appData = {
        full_name,
        email: normalizedEmail,
        phone: phone || '',
        firm_name,
        bar_number: bar_number || '',
        years_experience: years_experience ? parseInt(years_experience) : 0,
        states_licensed: states_licensed || [],
        practice_areas: practice_areas || [],
        bio: bio || '',
        referrals: referrals || [],
        consent_terms: !!consent_terms,
        consent_referral: !!consent_referral,
        email_verified: false,
        status: 'pending'
      };

      // Note: User creation via invite requires admin auth context which isn't available in public submissions.
      // The application is stored in LawyerApplication entity; admin will approve via AdminLawyerApplications.
      // After approval, approveLawyerApplication creates the user record and sends the activation email.
      lawyerUser = null;

      if (lawyerUser) {
        const initData = {
          user_status: 'pending',
          email_verified: false,
          password_set: false,
          ...profileFields
        };
        await base44.asServiceRole.entities.User.update(lawyerUser.id, initData);
        lawyerUser = { ...lawyerUser, ...initData };
      }

      // Store application record regardless (for admin review UI)
      const application = await base44.asServiceRole.entities.LawyerApplication.create(appData);

      // Even if we can't create user right now, fall back gracefully
      if (!lawyerUser) {
        // Send emails using application record only (no activation token without user ID)
        const firstName = full_name.split(' ')[0] || 'there';
        if (resendKey) {
          const adminLink = `${BASE_URL}/AdminLawyerApplications`;
          const adminUsersList = await base44.asServiceRole.entities.User.list();
          const admins = adminUsersList.filter(u => u.role === 'admin');
          for (const admin of admins) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
                to: [admin.email],
                subject: `New Lawyer Application — Approval Needed`,
                html: buildAdminAlertEmail(full_name, normalizedEmail, firm_name, states_licensed, practice_areas, adminLink)
              })
            });
          }
          // Send confirmation to applicant — link goes to For Lawyers page since no user exists yet
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Taylor Made Law <noreply@taylormadelaw.com>',
              to: [normalizedEmail],
              subject: 'Application Received — Taylor Made Law Network',
              html: buildApplicationReceivedEmail(firstName, `${BASE_URL}/ForLawyers`)
            })
          });
        }
        await base44.asServiceRole.entities.AuditLog.create({
          entity_type: 'LawyerApplication',
          entity_id: application.id,
          action: 'application_submitted',
          actor_email: normalizedEmail,
          actor_role: 'system',
          notes: `Application submitted (no user created yet) by ${full_name} from ${firm_name}`
        });
        return Response.json({ 
          success: true, 
          application_id: application.id,
          user_id: null,
          fallback: true,
          message: 'Application received. You will receive an email when approved.'
        });
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
      actor_role: 'system',
      notes: `Application submitted by ${full_name} from ${firm_name}`
    });

    // Create activation token and send activation email immediately
    let activationSent = false;
    if (!lawyerUser.email_verified || !lawyerUser.password_set) {
      const { rawToken, tokenHash } = await generateTokenPair();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const tokenRecord = await base44.asServiceRole.entities.ActivationToken.create({
        user_id: lawyerUser.id,
        user_email: normalizedEmail,
        token_hash: tokenHash,
        token_type: 'activation',
        expires_at: expiresAt,
        created_by_admin: null
      });

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'ActivationToken',
        entity_id: tokenRecord.id,
        action: 'activation_token_created',
        actor_email: normalizedEmail,
        actor_role: 'system',
        notes: `Self-apply token for ${normalizedEmail}`
      });

      if (resendKey) {
        const firstName = full_name.split(' ')[0] || 'there';
        const activationUrl = `${BASE_URL}/Activate?token=${rawToken}`;
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [normalizedEmail],
            subject: 'Application Received — Activate Your Taylor Made Law Account',
            html: buildApplicationReceivedEmail(firstName, activationUrl)
          })
        });
        activationSent = emailRes.ok;
      }
    }

    // Notify admins
    const adminLink = `${BASE_URL}/AdminLawyers`;
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    for (const admin of adminUsers) {
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
            to: [admin.email],
            subject: `New Lawyer Application — Approval Needed`,
            html: buildAdminAlertEmail(full_name, normalizedEmail, firm_name, states_licensed, practice_areas, adminLink)
          })
        });
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: lawyerUser.id,
      action: 'admin_alert_sent',
      actor_email: normalizedEmail,
      actor_role: 'system',
      notes: `Admin alert sent for application from ${normalizedEmail}`
    });

    // Send referral invites (non-blocking)
    if (referrals && referrals.length > 0 && resendKey) {
      const validRefs = referrals.filter(r => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
      for (const ref of validRefs) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [ref.email],
            subject: `${full_name} Invites You to Join Taylor Made Law`,
            html: `<p>Hi${ref.name ? ' ' + ref.name : ''},</p><p><strong>${full_name}</strong> thinks you'd be a great fit for the Taylor Made Law attorney network. <a href="${BASE_URL}/ForLawyers">Apply here →</a></p>`
          })
        });
      }
    }

    return Response.json({ 
      success: true, 
      user_id: lawyerUser.id,
      user_status: lawyerUser.user_status,
      activation_email_sent: activationSent
    });

  } catch (error) {
    console.error('submitLawyerApplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});