import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// POST { thread_id, body }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only approved lawyers
    const myProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: user.id });
    const myProfile = myProfiles[0];
    if (!myProfile || myProfile.status !== 'approved') {
      return Response.json({ error: 'Only approved attorneys may send messages.' }, { status: 403 });
    }

    const { thread_id, body } = await req.json();
    if (!thread_id || !body?.trim()) {
      return Response.json({ error: 'Missing thread_id or body' }, { status: 400 });
    }

    // Verify thread exists and user is a participant
    const threads = await base44.asServiceRole.entities.DirectMessageThread.filter({ id: thread_id });
    const thread = threads[0];
    if (!thread) return Response.json({ error: 'Thread not found' }, { status: 404 });
    if (!thread.participant_user_ids?.includes(user.id)) {
      return Response.json({ error: 'Not a participant in this thread' }, { status: 403 });
    }

    // Create message
    const message = await base44.asServiceRole.entities.DirectMessage.create({
      thread_id,
      sender_user_id: user.id,
      sender_name: user.full_name || myProfile.full_name || user.email,
      sender_email: user.email,
      body: body.trim(),
      has_attachments: false,
      is_deleted: false
    });

    // Update thread's last_message_at and preview
    const preview = body.trim().slice(0, 80) + (body.trim().length > 80 ? '…' : '');
    await base44.asServiceRole.entities.DirectMessageThread.update(thread_id, {
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
      last_message_sender_id: user.id
    });

    // Update sender's last_read_at (they just sent, so they've read up to now)
    const myPart = await base44.asServiceRole.entities.DirectMessageParticipant.filter({
      thread_id,
      user_id: user.id
    });
    if (myPart[0]) {
      await base44.asServiceRole.entities.DirectMessageParticipant.update(myPart[0].id, {
        last_read_at: new Date().toISOString()
      });
    }

    // Audit
    base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'DirectMessage',
      entity_id: message.id,
      action: 'direct_message_sent',
      actor_email: user.email,
      notes: `Message sent in thread ${thread_id}`
    }).catch(() => {});

    return Response.json({ success: true, message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});