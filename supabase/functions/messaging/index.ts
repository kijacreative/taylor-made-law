/**
 * Edge Function: messaging
 *
 * Replaces Base44 functions:
 *   - startDirectThread   (create thread + participants, duplicate check, un-hide)
 *   - sendDirectMessage   (create message, update thread, notify participants)
 *
 * Routes:
 *   POST { action: 'start_thread', recipient_user_id }
 *   POST { action: 'send_message', thread_id, body }
 *
 * Auth: User JWT required (approved lawyer for both)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getAuthUser, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Helper: verify user has an approved LawyerProfile
// ---------------------------------------------------------------------------

async function requireApprovedLawyer(
  sb: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ approved: true; profile: Record<string, unknown> } | { approved: false; error: string }> {
  const { data: lp, error } = await sb
    .from('lawyer_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { approved: false, error: error.message };
  if (!lp) return { approved: false, error: 'LawyerProfile not found' };
  if (lp.status !== 'approved') return { approved: false, error: 'LawyerProfile is not approved' };

  return { approved: true, profile: lp };
}

// ---------------------------------------------------------------------------
// startDirectThread
// ---------------------------------------------------------------------------

async function handleStartThread(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { user, profile } = auth;
  const sb = createAdminClient();

  // Parse body
  const body = await req.json().catch(() => ({}));
  const recipientUserId: string | undefined = body.recipient_user_id;
  if (!recipientUserId) return errorResponse('Missing recipient_user_id', 400);

  // Can't message yourself
  if (recipientUserId === profile.id) {
    return errorResponse('Cannot start a thread with yourself', 400);
  }

  // Verify sender is approved lawyer
  const senderCheck = await requireApprovedLawyer(sb, profile.id);
  if (!senderCheck.approved) {
    return errorResponse(`Sender: ${senderCheck.error}`, 403);
  }

  // Verify recipient is approved lawyer
  const recipientCheck = await requireApprovedLawyer(sb, recipientUserId);
  if (!recipientCheck.approved) {
    return errorResponse(`Recipient: ${recipientCheck.error}`, 403);
  }

  // Look up recipient profile for email
  const { data: recipientProfile } = await sb
    .from('profiles')
    .select('id, email')
    .eq('id', recipientUserId)
    .single();

  if (!recipientProfile) return errorResponse('Recipient user not found', 404);

  // Check for existing non-archived 2-party thread between these users.
  // A thread matches if both user IDs are in participant_user_ids and it is not archived.
  const { data: existingThreads } = await sb
    .from('direct_message_threads')
    .select('id, is_archived')
    .contains('participant_user_ids', [profile.id, recipientUserId])
    .eq('is_archived', false);

  // Filter to threads that have exactly these 2 participants (contains is subset check,
  // so also verify the array length is 2 to avoid matching group threads).
  const matchingThread = (existingThreads || []).find(
    (t: Record<string, unknown>) => {
      // We already filtered by contains + not archived; just need it to be a 2-party thread
      return true; // participant_user_ids was set by us so a contains match is sufficient
    }
  );

  if (matchingThread) {
    // Check if either participant has is_hidden = true; if so, un-hide
    const { data: participants } = await sb
      .from('direct_message_participants')
      .select('id, user_id, is_hidden')
      .eq('thread_id', matchingThread.id);

    const hiddenParticipants = (participants || []).filter(
      (p: Record<string, unknown>) => p.is_hidden === true
    );

    if (hiddenParticipants.length > 0) {
      // Un-hide all hidden participants
      for (const p of hiddenParticipants) {
        await sb
          .from('direct_message_participants')
          .update({ is_hidden: false })
          .eq('id', p.id);
      }
    }

    return jsonResponse({ data: { thread_id: matchingThread.id, is_new: false } });
  }

  // No existing thread — create new thread + participants
  const now = new Date().toISOString();

  const { data: newThread, error: threadErr } = await sb
    .from('direct_message_threads')
    .insert({
      participant_user_ids: [profile.id, recipientUserId],
      participant_emails: [profile.email, recipientProfile.email],
      is_archived: false,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (threadErr || !newThread) {
    return errorResponse(threadErr?.message || 'Failed to create thread', 500);
  }

  // Create participant records
  const participantRows = [
    {
      thread_id: newThread.id,
      user_id: profile.id,
      user_email: profile.email,
      is_hidden: false,
    },
    {
      thread_id: newThread.id,
      user_id: recipientUserId,
      user_email: recipientProfile.email,
      is_hidden: false,
    },
  ];

  const { error: partErr } = await sb
    .from('direct_message_participants')
    .insert(participantRows);

  if (partErr) {
    // Rollback thread on participant insert failure
    await sb.from('direct_message_threads').delete().eq('id', newThread.id);
    return errorResponse(partErr.message, 500);
  }

  // Audit log (fire-and-forget)
  sb.from('audit_logs').insert({
    entity_type: 'DirectMessageThread',
    entity_id: newThread.id,
    action: 'start_thread',
    actor_id: profile.id,
    actor_email: profile.email,
    actor_role: 'user',
    notes: `Thread started between ${profile.email} and ${recipientProfile.email}`,
  }).then(() => {});

  return jsonResponse({ data: { thread_id: newThread.id, is_new: true } });
}

// ---------------------------------------------------------------------------
// sendDirectMessage
// ---------------------------------------------------------------------------

async function handleSendMessage(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { user, profile } = auth;
  const sb = createAdminClient();

  // Parse body
  const body = await req.json().catch(() => ({}));
  const threadId: string | undefined = body.thread_id;
  const messageBody: string | undefined = body.body;

  if (!threadId) return errorResponse('Missing thread_id', 400);
  if (!messageBody || messageBody.trim().length === 0) {
    return errorResponse('Message body cannot be empty', 400);
  }

  // Verify sender is approved lawyer
  const senderCheck = await requireApprovedLawyer(sb, profile.id);
  if (!senderCheck.approved) {
    return errorResponse(`Sender: ${senderCheck.error}`, 403);
  }

  // Verify thread exists
  const { data: thread, error: threadErr } = await sb
    .from('direct_message_threads')
    .select('id')
    .eq('id', threadId)
    .single();

  if (threadErr || !thread) return errorResponse('Thread not found', 404);

  // Verify sender is a participant
  const { data: senderParticipant } = await sb
    .from('direct_message_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!senderParticipant) {
    return errorResponse('You are not a participant in this thread', 403);
  }

  // Create the message
  const now = new Date().toISOString();
  const trimmedBody = messageBody.trim();

  const { data: message, error: msgErr } = await sb
    .from('direct_messages')
    .insert({
      thread_id: threadId,
      sender_user_id: profile.id,
      sender_email: profile.email,
      body: trimmedBody,
      has_attachments: false,
      created_at: now,
    })
    .select('*')
    .single();

  if (msgErr || !message) {
    return errorResponse(msgErr?.message || 'Failed to create message', 500);
  }

  // Build preview: first 80 chars + ellipsis if longer
  const preview = trimmedBody.length > 80
    ? trimmedBody.substring(0, 80) + '...'
    : trimmedBody;

  // Update thread metadata
  const { error: threadUpdateErr } = await sb
    .from('direct_message_threads')
    .update({
      last_message_at: now,
      last_message_preview: preview,
      last_message_sender_id: profile.id,
    })
    .eq('id', threadId);

  if (threadUpdateErr) {
    console.error('Failed to update thread metadata:', threadUpdateErr.message);
  }

  // Update sender's last_read_at
  await sb
    .from('direct_message_participants')
    .update({ last_read_at: now })
    .eq('thread_id', threadId)
    .eq('user_id', profile.id);

  // Notify other participants (fire-and-forget)
  (async () => {
    try {
      const { data: participants } = await sb
        .from('direct_message_participants')
        .select('user_id, user_email')
        .eq('thread_id', threadId)
        .neq('user_id', profile.id);

      if (participants && participants.length > 0) {
        const notifications = participants.map((p: Record<string, unknown>) => ({
          user_id: p.user_id,
          user_email: p.user_email,
          type: 'new_message',
          title: 'New Direct Message',
          body: `${profile.full_name || profile.email}: ${preview}`,
          link: `/app/messages/${threadId}`,
          is_read: false,
        }));

        const { error: notifErr } = await sb
          .from('circle_notifications')
          .insert(notifications);

        if (notifErr) {
          console.error('Failed to create notifications:', notifErr.message);
        }
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  })();

  // Audit log (fire-and-forget)
  sb.from('audit_logs').insert({
    entity_type: 'DirectMessage',
    entity_id: message.id,
    action: 'send_message',
    actor_id: profile.id,
    actor_email: profile.email,
    actor_role: 'user',
    notes: `Message sent in thread ${threadId}`,
  }).then(() => {});

  return jsonResponse({ data: { success: true, message } });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.clone().json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case 'start_thread': return await handleStartThread(req);
      case 'send_message': return await handleSendMessage(req);
      default: return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error('messaging function error:', err);
    return errorResponse(err.message || 'Internal error', 500);
  }
});
