import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.user_type !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { lawyer_profile_id, has_password } = body;

    // Get lawyer profile
    const profile = await base44.asServiceRole.entities.LawyerProfile.get(lawyer_profile_id);
    if (!profile) {
      return Response.json({ error: 'Lawyer profile not found' }, { status: 404 });
    }

    // Get user
    const users = await base44.asServiceRole.entities.User.filter({ id: profile.user_id });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const lawyerUser = users[0];

    if (has_password) {
      // Send "You're approved - access now" email
      const loginUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/login`;
      
      const emailBody = `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 60px;" />
          </div>
          
          <h1 style="color: #3a164d; font-size: 28px; margin-bottom: 20px;">You're Approved — You Can Now Access Cases</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${lawyerUser.full_name || 'there'},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Your account has been approved.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            You can now log in and begin reviewing available cases inside the Taylor Made Law platform.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${loginUrl}" style="background: linear-gradient(135deg, #3a164d 0%, #993333 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block;">
              Log In
            </a>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 40px;">
            We're glad to have you as part of the network.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            <strong>Taylor Made Law</strong>
          </p>
          
          <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lawyerUser.email,
        subject: "You're Approved — You Can Now Access Cases",
        body: emailBody
      });

    } else {
      // Send "You're approved - activate account" email with token
      
      // Generate secure token
      const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const encoder = new TextEncoder();
      const tokenData = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create activation invitation
      await base44.asServiceRole.entities.AttorneyInvitation.create({
        inviter_admin_user_id: user.id,
        inviter_name: user.full_name,
        invitee_email: lawyerUser.email,
        invitee_name: lawyerUser.full_name,
        token_hash: tokenHash,
        status: 'sent',
        expires_at: expiresAt.toISOString(),
        invitation_type: 'approval_activation'
      });

      const activationUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/activate?token=${token}`;
      
      const emailBody = `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 60px;" />
          </div>
          
          <h1 style="color: #3a164d; font-size: 28px; margin-bottom: 20px;">You're Approved — Activate Your TML Account</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${lawyerUser.full_name || 'there'},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Your application to the Taylor Made Law Network has been approved.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            To access the platform and begin reviewing case opportunities, please activate your account by setting your password:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${activationUrl}" style="background: linear-gradient(135deg, #3a164d 0%, #993333 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block;">
              Set Your Password & Activate Account
            </a>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            After activation, you will be able to:
          </p>
          
          <ul style="color: #333; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
            <li>Access the Case Exchange</li>
            <li>Accept case opportunities</li>
            <li>Manage your profile</li>
            <li>Participate in the TML attorney network</li>
          </ul>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 40px;">
            We look forward to working with you.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            <strong>Taylor Made Law</strong>
          </p>
          
          <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lawyerUser.email,
        subject: "You're Approved — Activate Your TML Account",
        body: emailBody
      });
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerProfile',
      entity_id: lawyer_profile_id,
      action: 'approval_email_sent',
      actor_email: user.email,
      actor_role: user.role,
      notes: `Sent approval email to ${lawyerUser.email} (has_password: ${has_password})`
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error sending approval email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});