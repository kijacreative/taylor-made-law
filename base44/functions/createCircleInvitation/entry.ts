import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { circle_id, invitee_email, invitee_name, invitee_user_id, message, circle_name } = await req.json();

    if (!circle_id || !invitee_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check the inviting user is actually a member of this circle
    const members = await base44.asServiceRole.entities.LegalCircleMember.filter({
      circle_id,
      user_id: user.id,
      status: 'active'
    });

    if (!members || members.length === 0) {
      return Response.json({ error: 'You are not a member of this circle' }, { status: 403 });
    }

    // Check if already a member
    const existing = await base44.asServiceRole.entities.LegalCircleMember.filter({
      circle_id,
      user_email: invitee_email,
      status: 'active'
    });

    if (existing && existing.length > 0) {
      return Response.json({ error: 'This attorney is already a member of this circle' }, { status: 400 });
    }

    // Create the invitation
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const invitation = await base44.asServiceRole.entities.LegalCircleInvitation.create({
      circle_id,
      inviter_user_id: user.id,
      inviter_name: user.full_name || user.email,
      invitee_email,
      invitee_name: invitee_name || '',
      token,
      message: message || '',
      status: 'pending',
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Fire-and-forget: in-app notification
    if (invitee_user_id) {
      base44.asServiceRole.entities.CircleNotification.create({
        user_id: invitee_user_id,
        user_email: invitee_email,
        circle_id,
        type: 'invite',
        title: `You've been invited to join a Legal Circle`,
        body: `${user.full_name || user.email} invited you to join "${circle_name || 'a circle'}" on TML Network.`,
        link: '/GroupInvitations',
        is_read: false
      }).catch(() => {});
    }

    // Fire-and-forget: email
    base44.functions.invoke('sendCircleInviteEmail', {
      invitee_email,
      invitee_name,
      circle_name: circle_name || 'Legal Circle',
      circle_id,
      message,
      is_network_member: true
    }).catch(() => {});

    return Response.json({ success: true, invitation_id: invitation.id });
  } catch (error) {
    console.error('createCircleInvitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});