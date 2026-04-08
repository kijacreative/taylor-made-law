/**
 * Messaging service — DirectMessage threads, messages, files, subscriptions.
 *
 * Supports dual providers (Base44 / Supabase) via VITE_PROVIDER_MESSAGING_READ flag.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// DirectMessage entity (for subscribe + soft-delete)
// ---------------------------------------------------------------------------

export function subscribeDirectMessages(callback) {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'subscribeDirectMessages');
    const sb = getSupabase();
    if (sb) {
      const channel = sb.channel('direct-messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, callback)
        .subscribe();
      return () => sb.removeChannel(channel);
    }
  }
  return base44.entities.DirectMessage.subscribe(callback);
}

export async function updateDirectMessage(id, data) {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'updateDirectMessage');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('direct_messages')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  return base44.entities.DirectMessage.update(id, data);
}

// ---------------------------------------------------------------------------
// DirectMessageParticipant (for subscribe)
// ---------------------------------------------------------------------------

export function subscribeDirectMessageParticipants(callback) {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'subscribeDirectMessageParticipants');
    const sb = getSupabase();
    if (sb) {
      const channel = sb.channel('dm-participants')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_message_participants' }, callback)
        .subscribe();
      return () => sb.removeChannel(channel);
    }
  }
  return base44.entities.DirectMessageParticipant.subscribe(callback);
}

// ---------------------------------------------------------------------------
// Backend functions
// ---------------------------------------------------------------------------

export async function getDirectInbox() {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'getDirectInbox');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('messaging', {
      body: { action: 'get_inbox' },
    });
    if (error) throw error;
    return data?.data || data;
  }
  logProvider('messaging_read', 'getDirectInbox', 'base44');
  return base44.functions.invoke('getDirectInbox', {});
}

export async function getDirectThread(threadId) {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'getDirectThread');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('messaging', {
      body: { action: 'get_thread', thread_id: threadId },
    });
    if (error) throw error;
    return data?.data || data;
  }
  logProvider('messaging_read', 'getDirectThread', 'base44');
  return base44.functions.invoke('getDirectThread', { thread_id: threadId });
}

export async function sendDirectMessage(payload) {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'sendDirectMessage');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('messaging', {
      body: { action: 'send_message', ...payload },
    });
    if (error) throw error;
    return data?.data || data;
  }
  logProvider('messaging_read', 'sendDirectMessage', 'base44');
  return base44.functions.invoke('sendDirectMessage', payload);
}

export async function startDirectThread(recipientUserId) {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'startDirectThread');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('messaging', {
      body: { action: 'start_thread', recipient_user_id: recipientUserId },
    });
    if (error) throw error;
    return data?.data || data;
  }
  logProvider('messaging_read', 'startDirectThread', 'base44');
  return base44.functions.invoke('startDirectThread', { recipient_user_id: recipientUserId });
}

export async function uploadDirectMessageFile(formData) {
  if (useSupabase('messaging_read')) {
    logProvider('messaging_read', 'uploadDirectMessageFile');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    // Upload to Supabase Storage documents bucket
    const file = formData.get ? formData.get('file') : formData.file;
    if (!file) throw new Error('No file provided');
    const ext = file.name?.split('.').pop() || 'bin';
    const path = `dm/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data: uploadData, error: uploadErr } = await sb.storage.from('documents').upload(path, file);
    if (uploadErr) throw uploadErr;
    const { data: urlData } = sb.storage.from('documents').getPublicUrl(uploadData.path);
    return { file_url: urlData.publicUrl, file_name: file.name, file_size: file.size };
  }
  logProvider('messaging_read', 'uploadDirectMessageFile', 'base44');
  return base44.functions.invoke('uploadDirectMessageFile', formData);
}
