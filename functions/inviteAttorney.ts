import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.user_type !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      email, 
      full_name, 
      firm_name, 
      states_served, 
      practice_areas, 
      admin_note,
      send_email = true
    } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate secure token (32 bytes = 64 hex chars)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Hash token for storage
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const invitation = await base44.asServiceRole.entities.AttorneyInvitation.create({
      inviter_admin_user_id: user.id,
      inviter_name: user.full_name,
      invitee_email: email.toLowerCase(),
      invitee_name: full_name || '',
      firm_name: firm_name || '',
      states_served: states_served || [],
      practice_areas: practice_areas || [],
      admin_note: admin_note || '',
      token_hash: tokenHash,
      status: 'sent',
      expires_at: expiresAt.toISOString(),
      invitation_type: 'admin_invite'
    });

    // Create the user account via platform invite (so they can actually log in)
    try {
      await base44.auth.inviteUser(email.toLowerCase(), 'user');
    } catch (inviteErr) {
      // User may already exist — that's fine, continue
      console.log('User invite note:', inviteErr.message);
    }

    // Send invitation email
    if (send_email) {
      const activationUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/activate?token=${token}`;
      
      const emailBody = `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 60px;" />
          </div>
          
          <h1 style="color: #3a164d; font-size: 28px; margin-bottom: 20px;">You're Invited to Join the Taylor Made Law Network</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${full_name || 'there'},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            You've been invited to join the Taylor Made Law Network — a private attorney platform designed to connect trusted legal professionals and distribute vetted case opportunities.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            To get started, please activate your account by setting your password using the link below:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${activationUrl}" style="background: linear-gradient(135deg, #3a164d 0%, #993333 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block;">
              Activate Your Account
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            This secure link will expire in 7 days.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Once activated, you'll be able to log in, complete your profile, and (once approved) access available cases inside the Case Exchange.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
            If you have any questions, please contact us at <a href="mailto:support@taylormadelaw.com" style="color: #3a164d;">support@taylormadelaw.com</a>.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 40px;">
            Welcome to the network,<br>
            <strong>Taylor Made Law</strong>
          </p>
          
          <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: "You're Invited to Join the Taylor Made Law Network",
        body: emailBody
      });
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'AttorneyInvitation',
      entity_id: invitation.id,
      action: 'invite_created',
      actor_email: user.email,
      actor_role: user.role,
      notes: `Invited ${email} to join TML network`
    });

    return Response.json({ 
      success: true, 
      invitation_id: invitation.id,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error inviting attorney:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});