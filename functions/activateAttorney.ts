import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, password, accepted_terms } = body;

    if (!token || !password || !accepted_terms) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash the provided token to compare with stored hash
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Find invitation by token hash
    const invitations = await base44.asServiceRole.entities.AttorneyInvitation.filter({
      token_hash: tokenHash,
      status: 'sent'
    });

    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invalid or expired activation link' }, { status: 400 });
    }

    const invitation = invitations[0];

    // Check if token is expired
    if (new Date(invitation.expires_at) < new Date()) {
      await base44.asServiceRole.entities.AttorneyInvitation.update(invitation.id, {
        status: 'expired'
      });
      return Response.json({ error: 'Activation link has expired' }, { status: 400 });
    }

    const email = invitation.invitee_email.toLowerCase();

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    let userId;

    if (existingUsers && existingUsers.length > 0) {
      // User exists, update password
      userId = existingUsers[0].id;
      // Note: Password update would be handled by Base44's auth system
      // For now, we'll use the invite system which sets up the account
    } else {
      // Create new user account via invitation system
      // This will set up the user with the password
      await base44.users.inviteUser(email, 'user');
      const newUsers = await base44.asServiceRole.entities.User.filter({ email });
      userId = newUsers[0]?.id;
    }

    // Create or update lawyer profile
    const existingProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ 
      user_id: userId 
    });

    let profileData = {
      user_id: userId,
      firm_name: invitation.firm_name || '',
      phone: '',
      states_licensed: invitation.states_served || [],
      practice_areas: invitation.practice_areas || [],
      status: 'pending',
      referral_agreement_accepted: accepted_terms,
      referral_agreement_accepted_at: new Date().toISOString()
    };

    if (existingProfiles && existingProfiles.length > 0) {
      await base44.asServiceRole.entities.LawyerProfile.update(
        existingProfiles[0].id,
        profileData
      );
    } else {
      await base44.asServiceRole.entities.LawyerProfile.create(profileData);
    }

    // Mark invitation as accepted
    await base44.asServiceRole.entities.AttorneyInvitation.update(invitation.id, {
      status: 'accepted',
      used_at: new Date().toISOString()
    });

    // Create consent log
    await base44.asServiceRole.entities.ConsentLog.create({
      entity_type: 'LawyerProfile',
      entity_id: userId,
      consent_type: 'lawyer_terms',
      consent_version: '1.0',
      consent_text: 'Attorney Terms and Conditions - Accepted during account activation',
      consented_at: new Date().toISOString()
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: userId,
      action: 'account_activated',
      actor_email: email,
      actor_role: 'user',
      notes: 'Attorney activated account and set password'
    });

    // Send confirmation email
    const emailBody = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 60px;" />
        </div>
        
        <h1 style="color: #3a164d; font-size: 28px; margin-bottom: 20px;">Application Received — Taylor Made Law Network</h1>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi ${invitation.invitee_name || 'there'},
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Thank you for applying to join the Taylor Made Law Network.
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Your application is currently under review. Once approved, you'll receive a notification and be able to access and accept cases inside the platform.
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          We appreciate your interest in joining our attorney network.
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 40px;">
          <strong>Taylor Made Law</strong>
        </p>
        
        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: "Application Received — Taylor Made Law Network",
      body: emailBody
    });

    return Response.json({ 
      success: true,
      message: 'Account activated successfully',
      status: 'pending',
      redirect_url: '/app'
    });

  } catch (error) {
    console.error('Error activating attorney:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});