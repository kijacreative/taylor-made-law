/**
 * Messaging service — DirectMessage threads, messages, files, subscriptions.
 */
import { base44 } from '@/api/base44Client';

// ---------------------------------------------------------------------------
// DirectMessage entity (for subscribe + soft-delete)
// ---------------------------------------------------------------------------

export function subscribeDirectMessages(callback) {
  return base44.entities.DirectMessage.subscribe(callback);
}

export function updateDirectMessage(id, data) {
  return base44.entities.DirectMessage.update(id, data);
}

// ---------------------------------------------------------------------------
// DirectMessageParticipant (for subscribe)
// ---------------------------------------------------------------------------

export function subscribeDirectMessageParticipants(callback) {
  return base44.entities.DirectMessageParticipant.subscribe(callback);
}

// ---------------------------------------------------------------------------
// Backend functions
// ---------------------------------------------------------------------------

export function getDirectInbox() {
  return base44.functions.invoke('getDirectInbox', {});
}

export function getDirectThread(threadId) {
  return base44.functions.invoke('getDirectThread', { thread_id: threadId });
}

export function sendDirectMessage(payload) {
  return base44.functions.invoke('sendDirectMessage', payload);
}

export function startDirectThread(recipientUserId) {
  return base44.functions.invoke('startDirectThread', { recipient_user_id: recipientUserId });
}

export function uploadDirectMessageFile(formData) {
  return base44.functions.invoke('uploadDirectMessageFile', formData);
}
