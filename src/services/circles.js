/**
 * Circles service — LegalCircle, members, invitations, cases, documents, files.
 *
 * Read functions support dual providers (Base44 / Supabase) via feature flags.
 * Write functions, subscriptions, and backend function invocations remain on Base44.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { supabaseQuery } from './supabase-helpers';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// LegalCircle — reads
// ---------------------------------------------------------------------------

export function listCircles() {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'listCircles');
    return supabaseQuery('legal_circles');
  }
  logProvider('circles_read', 'listCircles', 'base44');
  return base44.entities.LegalCircle.list();
}

export function filterCircles(query) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'filterCircles');
    return supabaseQuery('legal_circles', { filters: query });
  }
  logProvider('circles_read', 'filterCircles', 'base44');
  return base44.entities.LegalCircle.filter(query);
}

// LegalCircle — writes (Base44 only)
export function createCircle(data) {
  return base44.entities.LegalCircle.create(data);
}

export function updateCircle(id, data) {
  return base44.entities.LegalCircle.update(id, data);
}

// ---------------------------------------------------------------------------
// LegalCircleMember — reads
// ---------------------------------------------------------------------------

export function listMembers(sort = '-created_date') {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'listMembers');
    return supabaseQuery('legal_circle_members', { sort });
  }
  logProvider('circles_read', 'listMembers', 'base44');
  return base44.entities.LegalCircleMember.list(sort);
}

export function filterMembers(query) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'filterMembers');
    return supabaseQuery('legal_circle_members', { filters: query });
  }
  logProvider('circles_read', 'filterMembers', 'base44');
  return base44.entities.LegalCircleMember.filter(query);
}

// LegalCircleMember — writes (Base44 only)
export function createMember(data) {
  return base44.entities.LegalCircleMember.create(data);
}

export function updateMember(id, data) {
  return base44.entities.LegalCircleMember.update(id, data);
}

// ---------------------------------------------------------------------------
// LegalCircleInvitation — reads
// ---------------------------------------------------------------------------

export function filterInvitations(query) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'filterInvitations');
    return supabaseQuery('legal_circle_invitations', { filters: query });
  }
  logProvider('circles_read', 'filterInvitations', 'base44');
  return base44.entities.LegalCircleInvitation.filter(query);
}

export function listInvitations() {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'listInvitations');
    return supabaseQuery('legal_circle_invitations');
  }
  logProvider('circles_read', 'listInvitations', 'base44');
  return base44.entities.LegalCircleInvitation.list();
}

// LegalCircleInvitation — writes (Base44 only)
export function updateInvitation(id, data) {
  return base44.entities.LegalCircleInvitation.update(id, data);
}

// ---------------------------------------------------------------------------
// LegalCircleCase — reads
// ---------------------------------------------------------------------------

export function filterCircleCases(query, sort = '-created_date') {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'filterCircleCases');
    return supabaseQuery('legal_circle_cases', { filters: query, sort });
  }
  logProvider('circles_read', 'filterCircleCases', 'base44');
  return base44.entities.LegalCircleCase.filter(query, sort);
}

export function listCircleCases(sort = '-created_date') {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'listCircleCases');
    return supabaseQuery('legal_circle_cases', { sort });
  }
  logProvider('circles_read', 'listCircleCases', 'base44');
  return base44.entities.LegalCircleCase.list(sort);
}

// LegalCircleCase — writes (Base44 only)
export function updateCircleCase(id, data) {
  return base44.entities.LegalCircleCase.update(id, data);
}

// ---------------------------------------------------------------------------
// CircleMessage — reads
// ---------------------------------------------------------------------------

export function filterCircleMessages(query, sort, limit) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'filterCircleMessages');
    return supabaseQuery('circle_messages', { filters: query, sort, limit });
  }
  logProvider('circles_read', 'filterCircleMessages', 'base44');
  return base44.entities.CircleMessage.filter(query, sort, limit);
}

export function listCircleMessages(sort = '-created_date', limit) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'listCircleMessages');
    return supabaseQuery('circle_messages', { sort, limit });
  }
  logProvider('circles_read', 'listCircleMessages', 'base44');
  return base44.entities.CircleMessage.list(sort, limit);
}

// CircleMessage — writes + subscriptions
export async function createCircleMessage(data) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'createCircleMessage');
    const sb = getSupabase();
    if (sb) {
      // Map Base44 field names to Supabase column names
      const row = {
        circle_id: data.circle_id,
        sender_user_id: data.sender_user_id,
        sender_email: data.sender_email,
        body: data.message_text || data.body || '',
        has_attachments: data.has_attachments || false,
      };
      const { data: record, error } = await sb.from('circle_messages').insert(row).select().single();
      if (error) throw error;
      return record;
    }
  }
  return base44.entities.CircleMessage.create(data);
}

export async function updateCircleMessage(id, data) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'updateCircleMessage');
    const sb = getSupabase();
    if (sb) {
      // Map is_deleted to deleted_at
      const updates = { ...data };
      if (updates.is_deleted) {
        updates.deleted_at = new Date().toISOString();
        delete updates.is_deleted;
      }
      const { data: record, error } = await sb.from('circle_messages').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return record;
    }
  }
  return base44.entities.CircleMessage.update(id, data);
}

export function subscribeCircleMessages(callback) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'subscribeCircleMessages');
    const sb = getSupabase();
    if (sb) {
      const channel = sb.channel('circle-messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'circle_messages' }, (payload) => {
          // Normalize to Base44-like shape for existing callbacks
          const event = {
            type: payload.eventType === 'INSERT' ? 'create' : payload.eventType === 'UPDATE' ? 'update' : 'delete',
            id: payload.new?.id || payload.old?.id,
            data: payload.new || payload.old,
          };
          // Map body → message_text for compatibility
          if (event.data) {
            event.data.message_text = event.data.body;
            event.data.created_date = event.data.created_at;
          }
          callback(event);
        })
        .subscribe();
      return () => sb.removeChannel(channel);
    }
  }
  return base44.entities.CircleMessage.subscribe(callback);
}

// ---------------------------------------------------------------------------
// CircleFile — reads
// ---------------------------------------------------------------------------

export function filterCircleFiles(query, sort, limit) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'filterCircleFiles');
    return supabaseQuery('circle_files', { filters: query, sort, limit });
  }
  logProvider('circles_read', 'filterCircleFiles', 'base44');
  return base44.entities.CircleFile.filter(query, sort, limit);
}

// CircleFile — writes (Base44 only)
export function createCircleFile(data) {
  return base44.entities.CircleFile.create(data);
}

// ---------------------------------------------------------------------------
// CircleDocument — reads
// ---------------------------------------------------------------------------

export function filterDocuments(query, sort, limit) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'filterDocuments');
    return supabaseQuery('circle_documents', { filters: query, sort, limit });
  }
  logProvider('circles_read', 'filterDocuments', 'base44');
  return base44.entities.CircleDocument.filter(query, sort, limit);
}

// ---------------------------------------------------------------------------
// Backend functions (Base44 only — need Edge Functions for Supabase)
// ---------------------------------------------------------------------------

export function createCircleInvitation(payload) {
  return base44.functions.invoke('createCircleInvitation', payload);
}

export function acceptCircleInvite(payload) {
  return base44.functions.invoke('acceptCircleInvite', payload);
}

export function sendCircleInviteEmail(payload) {
  return base44.functions.invoke('sendCircleInviteEmail', payload);
}

export async function notifyCircleMessage(payload) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'notifyCircleMessage');
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.functions.invoke('circles', {
        body: { action: 'notify_message', ...payload },
      });
      if (error) throw error;
      return data?.data || data;
    }
  }
  return base44.functions.invoke('notifyCircleMessage', payload);
}

export async function uploadCircleFile(formData) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'uploadCircleFile');
    const sb = getSupabase();
    if (sb) {
      const file = formData.get ? formData.get('file') : formData.file;
      const circleId = formData.get ? formData.get('circle_id') : formData.circle_id;
      const messageId = formData.get ? formData.get('message_id') : formData.message_id;
      if (!file) throw new Error('No file');
      const ext = file.name?.split('.').pop() || 'bin';
      const path = `circles/${circleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data: uploadData, error: uploadErr } = await sb.storage.from('documents').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = sb.storage.from('documents').getPublicUrl(uploadData.path);
      // Get current user for uploaded_by fields
      const { data: { session } } = await sb.auth.getSession();
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      // Create circle_files record
      const { data: fileRecord, error: fileErr } = await sb.from('circle_files').insert({
        circle_id: circleId,
        message_id: messageId || null,
        uploaded_by_user_id: userId,
        uploaded_by_email: userEmail,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: urlData.publicUrl,
      }).select().single();
      if (fileErr) throw fileErr;
      return { data: { file: fileRecord } };
    }
  }
  return base44.functions.invoke('uploadCircleFile', formData);
}

export function deleteCircleFile(payload) {
  return base44.functions.invoke('deleteCircleFile', payload);
}

export function uploadCircleDocument(formData) {
  return base44.functions.invoke('uploadCircleDocument', formData);
}

export function getDocumentHistory(payload) {
  return base44.functions.invoke('getDocumentHistory', payload);
}

export function requestDocumentSignatures(payload) {
  return base44.functions.invoke('requestDocumentSignatures', payload);
}

// ---------------------------------------------------------------------------
// Circle join / membership management
// ---------------------------------------------------------------------------

export async function requestJoinCircle(circleId) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'requestJoinCircle');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('circles', {
      body: { action: 'request_join', circle_id: circleId },
    });
    if (error) throw error;
    return data?.data || data;
  }
  return base44.functions.invoke('requestJoinCircle', { circle_id: circleId });
}

export async function approveMember(circleId, memberId) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'approveMember');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('circles', {
      body: { action: 'approve_member', circle_id: circleId, member_id: memberId },
    });
    if (error) throw error;
    return data?.data || data;
  }
  return base44.functions.invoke('approveMember', { circle_id: circleId, member_id: memberId });
}

export async function denyMember(circleId, memberId) {
  if (useSupabase('circles_read')) {
    logProvider('circles_read', 'denyMember');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('circles', {
      body: { action: 'deny_member', circle_id: circleId, member_id: memberId },
    });
    if (error) throw error;
    return data?.data || data;
  }
  return base44.functions.invoke('denyMember', { circle_id: circleId, member_id: memberId });
}
