/**
 * approveLawyerApplication — Admin-only.
 * 1. Marks LawyerApplication.status = 'approved'
 * 2. Updates User entity with user_status='approved'
 * 3. Upserts LawyerProfile
 * 4. Sends "You're Approved — Log In" email
 * 5. If applicant was invited to a circle, auto-adds them as a member
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

function buildApprovedEmail(firstName, loginUrl, freeTrialMonths, circleName) {
  const trialBanner = parseInt(freeTrialMonths) > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">🎁 ${freeTrialMonths} Month${parseInt(freeTrialMonths) > 1 ? 's' : ''} FREE Membership — No payment required during your trial.</p>
        </td></tr>
      </table>`
    : '';

  const circleBanner = circleName
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="background:#f5f0fa;border-left:4px solid #3a164d;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#3a164d;font-size:14px;font-weight:600;">🎉 You've been added to the <strong>${circleName}</strong> Legal Circle!</p>
          <p style="margin:6px 0 0;color:#5a2a6d;font-size:13px;">You can access your circle from the Groups section of your dashboard.</p>
        </td></tr>
      </table>`
    : '';

  return emailWrapper(`
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td align="center">
        <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;display:inline-block;text-align:center;line-height:64px;font-size:28px;">🎉</div>
      </td></tr>
    </table>
    <h1 style="margin:0 0 8px;text-align:center;color:#111827;font-size:26px;font-weight:700;">You're Approved!</h1>
    <p style="margin:0 0 28px;text-align:center;color:#6b7280;font-size:15px;">Welcome to the Taylor Made Law Attorney Network</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.7;">Your application to join the <strong>Taylor Made Law Network</strong> has been <strong>approved</strong>. You now have full access to case details and can accept cases in the Case Exchange.</p>
    ${trialBanner}
    ${circleBanner}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr><td align="center">
        <a href="${loginUrl}" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Log In to Your Dashboard →</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">We're glad to have you as part of the TML attorney network.</p>
  `);
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

    if (!application_id) {
      return Response.json({ error: 'application_id is required' }, { status: 400 });
    }

    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ id: application_id });
    if (!apps || apps.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }
    const application = apps[0];

    const normalizedEmail = application.email.toLowerCase().trim();
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const firstName = (application.full_name || '').split(' ')[0] || 'there';

    // 1. Mark application approved
    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'approved',
      reviewed_by: adminUser.email,
      reviewed_at: new Date().toISOString(),
    });

    // 2. Update User entity
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let lawyerUser = existingUsers[0] || null;

    const trialUpdateData = parseInt(free_trial_months) > 0 ? {
      subscription_status: 'trial',
      free_trial_months: parseInt(free_trial_months),
      trial_ends_at: new Date(Date.now() + parseInt(free_trial_months) * 30 * 24 * 60 * 60 * 1000).toISOString(),
    } : {};

    if (lawyerUser) {
      if (lawyerUser.user_status === 'disabled') {
        return Response.json({ error: 'Cannot approve a disabled user. Please reinstate first.' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.update(lawyerUser.id, {
        user_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email,
        firm_name: lawyerUser.firm_name || application.firm_name || '',
        phone: lawyerUser.phone || application.phone || '',
        bar_number: lawyerUser.bar_number || application.bar_number || '',
        bio: lawyerUser.bio || application.bio || '',
        states_licensed: lawyerUser.states_licensed?.length ? lawyerUser.states_licensed : (application.states_licensed || []),
        practice_areas: lawyerUser.practice_areas?.length ? lawyerUser.practice_areas : (application.practice_areas || []),
        years_experience: lawyerUser.years_experience || application.years_experience || 0,
        ...trialUpdateData,
      });
    }

    // 3. Upsert LawyerProfile
    if (lawyerUser) {
      const existingProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: lawyerUser.id });
      const profileData = {
        user_id: lawyerUser.id,
        full_name: application.full_name || '',
        firm_name: application.firm_name || '',
        phone: application.phone || '',
        bar_number: application.bar_number || '',
        bio: application.bio || '',
        states_licensed: application.states_licensed || [],
        practice_areas: application.practice_areas || [],
        years_experience: application.years_experience || 0,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email,
        ...trialUpdateData,
      };
      if (existingProfiles.length > 0) {
        await base44.asServiceRole.entities.LawyerProfile.update(existingProfiles[0].id, profileData).catch(() => {});
      } else {
        await base44.asServiceRole.entities.LawyerProfile.create(profileData).catch(() => {});
      }
    }

    // 4. Handle circle invitation — auto-add to circle on approval
    let addedToCircle = false;
    let circleName = null;

    // Check for circle token on the application
    const circleInviteToken = application.circle_token;
    const circleId = application.circle_id;

    if (circleInviteToken && circleId && lawyerUser) {
      try {
        // Find the invitation by token
        const invitations = await base44.asServiceRole.entities.LegalCircleInvitation.filter({
          token: circleInviteToken,
          status: 'pending'
        });
        const invitation = invitations[0] || null;

        if (invitation) {
          // Look up circle name
          const circles = await base44.asServiceRole.entities.LegalCircle.filter({ id: circleId }).catch(() => []);
          const circle = circles[0] || null;
          circleName = circle?.name || 'Legal Circle';

          // Check not already a member
          const existingMembers = await base44.asServiceRole.entities.LegalCircleMember.filter({
            circle_id: circleId,
            user_id: lawyerUser.id,
            status: 'active'
          }).catch(() => []);

          if (existingMembers.length === 0) {
            await base44.asServiceRole.entities.LegalCircleMember.create({
              circle_id: circleId,
              user_id: lawyerUser.id,
              user_email: normalizedEmail,
              user_name: application.full_name || lawyerUser.full_name || '',
              role: 'member',
              status: 'active',
              joined_at: new Date().toISOString(),
              invited_by: invitation.inviter_user_id
            });
            addedToCircle = true;
          }

          // Mark invitation as accepted
          await base44.asServiceRole.entities.LegalCircleInvitation.update(invitation.id, {
            status: 'accepted',
            accepted_at: new Date().toISOString()
          });
        }
      } catch (circleErr) {
        console.error('Non-fatal: failed to add to circle:', circleErr.message);
      }
    } else if (lawyerUser) {
      // Also check for any pending circle invitations by email (for existing network member invites)
      try {
        const emailInvitations = await base44.asServiceRole.entities.LegalCircleInvitation.filter({
          invitee_email: normalizedEmail,
          status: 'pending'
        }).catch(() => []);

        for (const invite of emailInvitations) {
          const existingMembers = await base44.asServiceRole.entities.LegalCircleMember.filter({
            circle_id: invite.circle_id,
            user_id: lawyerUser.id,
            status: 'active'
          }).catch(() => []);

          if (existingMembers.length === 0) {
            const circles = await base44.asServiceRole.entities.LegalCircle.filter({ id: invite.circle_id }).catch(() => []);
            const circle = circles[0] || null;
            if (!circleName) circleName = circle?.name || 'Legal Circle';

            await base44.asServiceRole.entities.LegalCircleMember.create({
              circle_id: invite.circle_id,
              user_id: lawyerUser.id,
              user_email: normalizedEmail,
              user_name: application.full_name || lawyerUser.full_name || '',
              role: 'member',
              status: 'active',
              joined_at: new Date().toISOString(),
              invited_by: invite.inviter_user_id
            });

            await base44.asServiceRole.entities.LegalCircleInvitation.update(invite.id, {
              status: 'accepted',
              accepted_at: new Date().toISOString()
            });
            addedToCircle = true;
          }
        }
      } catch (emailInviteErr) {
        console.error('Non-fatal: failed to check email circle invites:', emailInviteErr.message);
      }
    }

    // 5. Send approval email
    let emailSent = false;
    if (resendKey) {
      const loginUrl = `${BASE_URL}/login`;
      const html = buildApprovedEmail(firstName, loginUrl, free_trial_months, addedToCircle ? circleName : null);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: addedToCircle ? `You're Approved & Added to ${circleName}!` : "You're Approved — Cases Are Now Unlocked",
          html
        })
      });
      emailSent = res.ok;
    }

    // 6. Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerApplication',
      entity_id: application_id,
      action: 'application_approved',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Approved by ${adminUser.email}. Trial: ${free_trial_months} months. Email sent: ${emailSent}. Added to circle: ${addedToCircle ? circleName : 'no'}.`
    });

    return Response.json({ success: true, email_sent: emailSent, user_id: lawyerUser?.id, added_to_circle: addedToCircle, circle_name: circleName });

  } catch (error) {
    console.error('Error approving application:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});