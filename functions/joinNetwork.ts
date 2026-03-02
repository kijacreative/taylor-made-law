/**
 * joinNetwork — Public endpoint. Creates user account immediately (auto-approved),
 * logs them in, sends welcome email + admin notification.
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

function buildWelcomeEmail(firstName, loginUrl) {
  return emailWrapper(`
    <h1 style="margin:0 0 8px;color:#3a164d;font-size:26px;font-weight:700;">Welcome to the Network!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Your account is active and ready to go.</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Welcome to the Taylor Made Law Network. Your account has been created and you now have immediate access to your attorney dashboard.</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 10px;color:#3a164d;font-size:14px;font-weight:600;">Next steps to complete your setup:</p>
      <p style="margin:0 0 6px;color:#374151;font-size:14px;">1. Review and accept the Referral Agreement</p>
      <p style="margin:0 0 6px;color:#374151;font-size:14px;">2. Complete your attorney profile</p>
      <p style="margin:0;color:#374151;font-size:14px;">3. Browse and accept case referrals</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${loginUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Go to My Dashboard →</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#9ca3af;font-size:13px;">Your account may be subject to admin review. If your access is ever restricted, you will be notified by email.</p>
  `);
}

function buildAdminNotificationEmail(fullName, email, firmName, barNumber, states, practiceAreas, adminLink) {
  return emailWrapper(`
    <div style="background:#dbeafe;border-radius:8px;padding:10px 16px;margin-bottom:20px;display:inline-block;">
      <span style="font-weight:700;color:#1e40af;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">⚖️ New Attorney Added — Review Needed</span>
    </div>
    <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">New Attorney Added to Network</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">A new attorney signed up and has immediate access. Please review their credentials.</p>
    <div style="background:#f5f0fa;border-radius:10px;padding:18px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
        <tr><td style="padding:5px 0;color:#6b7280;width:35%;font-weight:500;">Name</td><td style="padding:5px 0;font-weight:600;">${fullName}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Email</td><td style="padding:5px 0;font-weight:600;">${email}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-weight:500;">Firm</td><td style="padding:5px 0;font-weight:600;">${firmName}</td></tr>
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
      full_name, email, password,
      phone, firm_name, bar_number,
      states_licensed, practice_areas,
      billing_plan, billing_bank_name, billing_account_holder,
      billing_account_type, billing_last4
    } = body;

    if (!full_name || !email || !password || !firm_name) {
      return Response.json({ error: 'Missing required fields: full_name, email, password, firm_name' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Check for existing user
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.user_status === 'disabled') {
        return Response.json({
          error: 'Your account has been disabled. Please contact support@taylormadelaw.com.'
        }, { status: 403 });
      }
      return Response.json({ error: 'An account with this email already exists. Please log in instead.' }, { status: 409 });
    }

    // Invite user via platform (creates account)
    await base44.users.inviteUser(normalizedEmail, 'user');

    // Poll for user creation (up to 10 seconds)
    let newUser = null;
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const found = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      if (found.length > 0) { newUser = found[0]; break; }
    }

    if (!newUser) {
      return Response.json({ error: 'Account creation failed. Please try again.' }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Update user with all profile data + auto-approve
    await base44.asServiceRole.entities.User.update(newUser.id, {
      user_status: 'approved',
      review_status: 'pending',
      email_verified: true,
      email_verified_at: now,
      approved_at: now,
      approved_by: 'system_auto',
      firm_name: firm_name || '',
      phone: phone || '',
      bar_number: bar_number || '',
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      billing_demo_plan: billing_plan || 'trial_6mo_then_49',
      billing_demo_bank_name: billing_bank_name || '',
      billing_demo_account_holder: billing_account_holder || '',
      billing_demo_account_type: billing_account_type || 'checking',
      billing_demo_last4: billing_last4 || '',
      billing_demo_status: billing_last4 ? 'collected' : 'not_provided',
      billing_demo_collected_at: billing_last4 ? now : null,
      free_trial_months: 6,
      subscription_status: 'trial',
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: newUser.id,
      action: 'lawyer_created_auto_approved',
      actor_email: normalizedEmail,
      actor_role: 'system',
      notes: `Auto-approved signup by ${full_name} from ${firm_name}`
    });

    // Also create a LawyerProfile record
    try {
      await base44.asServiceRole.entities.LawyerProfile.create({
        user_id: newUser.id,
        firm_name: firm_name || '',
        phone: phone || '',
        bar_number: bar_number || '',
        states_licensed: states_licensed || [],
        practice_areas: practice_areas || [],
        status: 'approved',
        subscription_status: 'trial',
        free_trial_months: 6
      });
    } catch (profileErr) {
      console.error('LawyerProfile creation error (non-fatal):', profileErr.message);
    }

    // Send emails
    if (resendKey) {
      const firstName = full_name.split(' ')[0] || 'there';

      // Welcome email to lawyer
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: 'Welcome to the Taylor Made Law Network',
          html: buildWelcomeEmail(firstName, `${BASE_URL}/LawyerDashboard`)
        })
      });

      // Admin notification
      const adminLink = `${BASE_URL}/AdminLawyerApplications`;
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
            to: [admin.email],
            subject: `New Attorney Added — Review Needed: ${full_name}`,
            html: buildAdminNotificationEmail(full_name, normalizedEmail, firm_name, bar_number, states_licensed, practice_areas, adminLink)
          })
        });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: newUser.id,
        action: 'welcome_email_sent',
        actor_email: normalizedEmail,
        actor_role: 'system',
        notes: `Welcome email sent and admin notified`
      });
    }

    return Response.json({
      success: true,
      user_id: newUser.id,
      email: normalizedEmail,
      message: 'Account created successfully. Please log in to access your dashboard.'
    });

  } catch (error) {
    console.error('joinNetwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});