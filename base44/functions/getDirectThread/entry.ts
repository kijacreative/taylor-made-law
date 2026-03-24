import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// POST { thread_id } - returns messages and marks as read
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { thread_id } = await req.json();
    if (!thread_id) return Response.json({ error: 'Missing thread_id' }, { status: 400 });

    // Verify thread and membership
    const threads = await base44.asServiceRole.entities.DirectMessageThread.filter({ id: thread_id });
    const thread = threads[0];
    if (!thread) return Response.json({ error: 'Thread not found' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isParticipant =
      thread.participant_user_ids?.includes(user.id) ||
      thread.participant_emails?.includes(user.email);
    if (!isAdmin && !isParticipant) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all participant records
    const participants = await base44.asServiceRole.entities.DirectMessageParticipant.filter({ thread_id });
    const otherPart = participants.find(p => p.user_id !== user.id);
    const myPart = participants.find(p => p.user_id === user.id);

    // Get messages
    const messages = await base44.asServiceRole.entities.DirectMessage.filter(
      { thread_id, is_deleted: false },
      'created_date',
      200
    );

    // Get file attachments for messages with attachments
    const msgsWithFiles = messages.filter(m => m.has_attachments && m.attachment_file_ids?.length);
    let fileMap = {};
    if (msgsWithFiles.length > 0) {
      const allFiles = await base44.asServiceRole.entities.DirectMessageFile.filter({ thread_id, is_deleted: false });
      for (const f of allFiles) {
        if (!fileMap[f.message_id]) fileMap[f.message_id] = [];
        fileMap[f.message_id].push(f);
      }
    }

    // Mark as read (update last_read_at)
    if (myPart && !isAdmin) {
      await base44.asServiceRole.entities.DirectMessageParticipant.update(myPart.id, {
        last_read_at: new Date().toISOString()
      });
      // Audit
      base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'DirectMessageThread',
        entity_id: thread_id,
        action: 'direct_message_read',
        actor_email: user.email
      }).catch(() => {});
    }

    return Response.json({
      thread,
      other_participant: otherPart || null,
      messages: messages.map(m => ({
        ...m,
        attachments: fileMap[m.id] || []
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});