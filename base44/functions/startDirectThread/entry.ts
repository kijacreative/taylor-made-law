import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// POST { recipient_user_id }
// Returns { thread_id, is_new }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only approved lawyers can start threads
    const myProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: user.id });
    const myProfile = myProfiles[0];
    if (!myProfile || myProfile.status !== 'approved') {
      return Response.json({ error: 'Only approved attorneys may send direct messages.' }, { status: 403 });
    }

    const { recipient_user_id } = await req.json();
    if (!recipient_user_id) return Response.json({ error: 'Missing recipient_user_id' }, { status: 400 });
    if (recipient_user_id === user.id) return Response.json({ error: 'Cannot message yourself' }, { status: 400 });

    // Verify recipient is approved lawyer
    const recipientProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: recipient_user_id });
    const recipientProfile = recipientProfiles[0];
    if (!recipientProfile || recipientProfile.status !== 'approved') {
      return Response.json({ error: 'Recipient is not an approved attorney.' }, { status: 403 });
    }

    // Get recipient user info
    const recipientUsers = await base44.asServiceRole.entities.User.filter({ id: recipient_user_id });
    const recipientUser = recipientUsers[0];

    // Check if a thread between these two already exists
    const existingThreads = await base44.asServiceRole.entities.DirectMessageThread.filter({
      participant_user_ids: user.id
    });

    const existing = existingThreads.find(t =>
      t.participant_user_ids?.includes(recipient_user_id) &&
      t.participant_user_ids?.length === 2 &&
      !t.is_archived
    );

    if (existing) {
      // Un-hide for both participants if hidden
      const parts = await base44.asServiceRole.entities.DirectMessageParticipant.filter({ thread_id: existing.id });
      for (const p of parts) {
        if (p.is_hidden) {
          await base44.asServiceRole.entities.DirectMessageParticipant.update(p.id, { is_hidden: false });
        }
      }
      return Response.json({ thread_id: existing.id, is_new: false });
    }

    // Create new thread
    const thread = await base44.asServiceRole.entities.DirectMessageThread.create({
      participant_user_ids: [user.id, recipient_user_id],
      participant_emails: [user.email, recipientUser?.email || ''],
      is_archived: false
    });

    // Create participant records
    await base44.asServiceRole.entities.DirectMessageParticipant.create({
      thread_id: thread.id,
      user_id: user.id,
      user_email: user.email,
      is_hidden: false
    });
    await base44.asServiceRole.entities.DirectMessageParticipant.create({
      thread_id: thread.id,
      user_id: recipient_user_id,
      user_email: recipientUser?.email || '',
      is_hidden: false
    });

    // Audit
    base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'DirectMessageThread',
      entity_id: thread.id,
      action: 'direct_thread_created',
      actor_email: user.email,
      notes: `Thread started with ${recipientUser?.email || recipient_user_id}`
    }).catch(() => {});

    return Response.json({ thread_id: thread.id, is_new: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});