/**
 * Circles service — LegalCircle, members, invitations, cases, documents, files.
 *
 * Read functions support dual providers (Base44 / Supabase) via feature flags.
 * Write functions, subscriptions, and backend function invocations remain on Base44.
 */
import { base44 } from '@/api/base44Client';
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

// CircleMessage — writes + subscriptions (Base44 only)
export function createCircleMessage(data) {
  return base44.entities.CircleMessage.create(data);
}

export function updateCircleMessage(id, data) {
  return base44.entities.CircleMessage.update(id, data);
}

export function subscribeCircleMessages(callback) {
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

export function notifyCircleMessage(payload) {
  return base44.functions.invoke('notifyCircleMessage', payload);
}

export function uploadCircleFile(formData) {
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
