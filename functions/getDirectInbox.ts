import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// GET - returns inbox: threads with metadata and unread counts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get my participant records
    const myParticipants = await base44.asServiceRole.entities.DirectMessageParticipant.filter({
      user_id: user.id,
      is_hidden: false
    });

    if (!myParticipants.length) {
      return Response.json({ threads: [], total_unread: 0 });
    }

    const threadIds = myParticipants.map(p => p.thread_id);

    // Fetch all threads
    const allThreads = await base44.asServiceRole.entities.DirectMessageThread.list();
    const myThreads = allThreads.filter(t => threadIds.includes(t.id) && !t.is_archived);

    // Fetch all participants for these threads (to get other person's info)
    const allParts = await base44.asServiceRole.entities.DirectMessageParticipant.list();
    const threadPartsMap = {};
    for (const p of allParts) {
      if (!threadPartsMap[p.thread_id]) threadPartsMap[p.thread_id] = [];
      threadPartsMap[p.thread_id].push(p);
    }

    // Build result with unread counts
    let totalUnread = 0;
    const threads = myThreads
      .sort((a, b) => new Date(b.last_message_at || b.created_date) - new Date(a.last_message_at || a.created_date))
      .map(thread => {
        const myPart = myParticipants.find(p => p.thread_id === thread.id);
        const otherPart = (threadPartsMap[thread.id] || []).find(p => p.user_id !== user.id);
        
        const lastMsgAt = thread.last_message_at ? new Date(thread.last_message_at) : null;
        const lastReadAt = myPart?.last_read_at ? new Date(myPart.last_read_at) : null;
        const isUnread = lastMsgAt && thread.last_message_sender_id !== user.id &&
          (!lastReadAt || lastMsgAt > lastReadAt);
        
        if (isUnread) totalUnread++;

        return {
          thread_id: thread.id,
          other_user_id: otherPart?.user_id || '',
          other_user_name: otherPart?.user_name || 'Unknown Attorney',
          other_user_email: otherPart?.user_email || '',
          last_message_at: thread.last_message_at || thread.created_date,
          last_message_preview: thread.last_message_preview || '',
          last_message_sender_id: thread.last_message_sender_id || '',
          is_unread: isUnread,
          my_participant_id: myPart?.id
        };
      });

    return Response.json({ threads, total_unread: totalUnread });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});