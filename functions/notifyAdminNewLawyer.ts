import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { lawyerName, lawyerEmail, firmName, states, practiceAreas, profileId } = body;

    if (!lawyerEmail) {
      return Response.json({ error: 'Missing lawyer info' }, { status: 400 });
    }

    // Get all admin users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    const adminLink = `${req.headers.get('origin') || 'https://app.base44.com'}/admin-lawyers`;

    const emailBody = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf8f5;">
        <div style="text-align: center; margin-bottom: 28px;">
          <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 48px;" />
        </div>
        <div style="background: white; border-radius: 16px; padding: 36px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);">
          <div style="background: #fef3c7; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; display: inline-block;">
            <span style="font-size: 18px;">⚖️</span>
            <span style="font-weight: 700; color: #92400e; font-size: 13px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.06em;">Action Required</span>
          </div>
          <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 6px;">New Attorney Application</h2>
          <p style="color: #6b7280; font-size: 15px; margin: 0 0 28px;">A new attorney has completed onboarding and is awaiting your approval.</p>
          
          <div style="background: #f5f0fa; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
            <p style="color: #3a164d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 14px;">Applicant Details</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
              <tr><td style="padding: 5px 0; color: #6b7280; width: 35%;">Name</td><td style="padding: 5px 0; font-weight: 600;">${lawyerName}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Email</td><td style="padding: 5px 0; font-weight: 600;">${lawyerEmail}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Firm</td><td style="padding: 5px 0; font-weight: 600;">${firmName || '—'}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">States</td><td style="padding: 5px 0; font-weight: 600;">${(states || []).join(', ') || '—'}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Practice Areas</td><td style="padding: 5px 0; font-weight: 600;">${(practiceAreas || []).join(', ') || '—'}</td></tr>
            </table>
          </div>

          <a href="${adminLink}" style="display: block; background: #3a164d; color: white; text-align: center; padding: 14px 24px; border-radius: 50px; font-weight: 700; font-size: 15px; text-decoration: none; margin-bottom: 16px;">
            Review & Approve in Admin Dashboard →
          </a>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Or paste this link: ${adminLink}
          </p>
        </div>
        <div style="margin-top: 28px; text-align: center; color: #9ca3af; font-size: 11px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
        </div>
      </div>
    `;

    for (const admin of adminUsers) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        from_name: 'Taylor Made Law Alerts',
        subject: `New Attorney Requested Access — Approval Needed: ${lawyerName}`,
        body: emailBody
      });
    }

    return Response.json({ success: true, admins_notified: adminUsers.length });
  } catch (error) {
    console.error('Error notifying admins:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});