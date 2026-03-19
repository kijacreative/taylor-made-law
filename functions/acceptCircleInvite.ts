import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invitation_id, circle_id, inviter_user_id } = await req.json();

    if (!invitation_id || !circle_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update invitation status
    await base44.entities.LegalCircleInvitation.update(invitation_id, {
      status: 'accepted',
      accepted_at: new Date().toISOString()
    });

    // Add user as circle member
    await base44.entities.LegalCircleMember.create({
      circle_id,
      user_id: user.id,
      user_email: user.email,
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
      invited_by: inviter_user_id
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});