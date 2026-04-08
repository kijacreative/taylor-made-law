/**
 * Notifications service — CircleNotification, Popup, PopupImpression.
 *
 * Popup/PopupImpression reads and writes support dual providers via content_read flag.
 * CircleNotification remains Base44-only (real-time subscription).
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// CircleNotification (Base44 only — real-time subscription)
// ---------------------------------------------------------------------------

export function subscribeCircleNotifications(callback) {
  return base44.entities.CircleNotification.subscribe(callback);
}

export function filterNotifications(query, sort) {
  return base44.entities.CircleNotification.filter(query, sort);
}

export function updateNotification(id, data) {
  return base44.entities.CircleNotification.update(id, data);
}

// ---------------------------------------------------------------------------
// Popup — dual provider
// ---------------------------------------------------------------------------

export async function listPopups(sort = '-created_date') {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'listPopups');
    const sb = getSupabase();
    if (sb) {
      const ascending = !sort.startsWith('-');
      const column = sort.replace(/^-/, '').replace('created_date', 'created_at');
      const { data, error } = await sb
        .from('popups')
        .select('*')
        .order(column, { ascending });
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('content_read', 'listPopups', 'base44');
  return base44.entities.Popup.list(sort);
}

export async function filterPopups(query) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'filterPopups');
    const sb = getSupabase();
    if (sb) {
      let q = sb.from('popups').select('*');
      if (query && typeof query === 'object') {
        for (const [key, value] of Object.entries(query)) {
          q = q.eq(key, value);
        }
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('content_read', 'filterPopups', 'base44');
  return base44.entities.Popup.filter(query);
}

export async function createPopup(data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'createPopup');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('popups')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'createPopup', 'base44');
  return base44.entities.Popup.create(data);
}

export async function updatePopup(id, data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'updatePopup');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('popups')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'updatePopup', 'base44');
  return base44.entities.Popup.update(id, data);
}

export async function deletePopup(id) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'deletePopup');
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('popups').delete().eq('id', id);
      if (error) throw error;
      return;
    }
  }
  logProvider('content_read', 'deletePopup', 'base44');
  return base44.entities.Popup.delete(id);
}

// ---------------------------------------------------------------------------
// PopupImpression — dual provider
// ---------------------------------------------------------------------------

export async function listImpressions(sort = '-created_date') {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'listImpressions');
    const sb = getSupabase();
    if (sb) {
      const ascending = !sort.startsWith('-');
      const column = sort.replace(/^-/, '').replace('created_date', 'created_at');
      const { data, error } = await sb
        .from('popup_impressions')
        .select('*')
        .order(column, { ascending })
        .limit(500);
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('content_read', 'listImpressions', 'base44');
  return base44.entities.PopupImpression.list(sort);
}

export async function filterImpressions(query) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'filterImpressions');
    const sb = getSupabase();
    if (sb) {
      let q = sb.from('popup_impressions').select('*');
      if (query && typeof query === 'object') {
        for (const [key, value] of Object.entries(query)) {
          q = q.eq(key, value);
        }
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('content_read', 'filterImpressions', 'base44');
  return base44.entities.PopupImpression.filter(query);
}

export async function createImpression(data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'createImpression');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('popup_impressions')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'createImpression', 'base44');
  return base44.entities.PopupImpression.create(data);
}

export async function updateImpression(id, data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'updateImpression');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('popup_impressions')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'updateImpression', 'base44');
  return base44.entities.PopupImpression.update(id, data);
}
