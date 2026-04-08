/**
 * Cases service — Case and Lead entity operations + marketplace functions.
 *
 * Read functions support dual providers (Base44 / Supabase) via feature flags.
 * Write functions and backend function invocations remain on Base44.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { supabaseQuery } from './supabase-helpers';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// Case entity — reads
// ---------------------------------------------------------------------------

export function listCases(sort = '-created_date') {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'listCases');
    return supabaseQuery('cases', { sort });
  }
  logProvider('cases_read', 'listCases', 'base44');
  return base44.entities.Case.list(sort);
}

export function filterCases(query) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'filterCases');
    return supabaseQuery('cases', { filters: query });
  }
  logProvider('cases_read', 'filterCases', 'base44');
  return base44.entities.Case.filter(query);
}

// Case entity — writes (dual provider)
export async function createCase(data) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'createCase');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('cases')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('cases_read', 'createCase', 'base44');
  return base44.entities.Case.create(data);
}

export async function updateCase(id, data) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'updateCase');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('cases')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('cases_read', 'updateCase', 'base44');
  return base44.entities.Case.update(id, data);
}

// ---------------------------------------------------------------------------
// Lead entity — reads
// ---------------------------------------------------------------------------

export function listLeads(sort = '-created_date') {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'listLeads');
    return supabaseQuery('leads', { sort });
  }
  logProvider('cases_read', 'listLeads', 'base44');
  return base44.entities.Lead.list(sort);
}

export function filterLeads(query) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'filterLeads');
    return supabaseQuery('leads', { filters: query });
  }
  logProvider('cases_read', 'filterLeads', 'base44');
  return base44.entities.Lead.filter(query);
}

// Lead entity — writes (dual provider)
export async function createLead(data) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'createLead');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('leads')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('cases_read', 'createLead', 'base44');
  return base44.entities.Lead.create(data);
}

export async function updateLead(id, data) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'updateLead');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('leads')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('cases_read', 'updateLead', 'base44');
  return base44.entities.Lead.update(id, data);
}

// ---------------------------------------------------------------------------
// Public lead intake (no auth — calls edge function)
// ---------------------------------------------------------------------------

export async function submitPublicLead(payload) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'submitPublicLead');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('cases', {
      body: { action: 'submit_lead', ...payload },
    });
    if (error) throw error;
    return data;
  }
  // Base44 fallback: create lead + return it
  logProvider('cases_read', 'submitPublicLead', 'base44');
  return base44.entities.Lead.create(payload);
}

// ---------------------------------------------------------------------------
// Backend functions
// ---------------------------------------------------------------------------

export async function getCasesForLawyer() {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'getCasesForLawyer');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('cases', {
      body: { action: 'list' },
    });
    if (error) throw error;
    return data?.data || data;
  }
  logProvider('cases_read', 'getCasesForLawyer', 'base44');
  return base44.functions.invoke('getCasesForLawyer', {});
}

export async function acceptCase(payload) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'acceptCase');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('cases', {
      body: { action: 'accept', ...payload },
    });
    if (error) throw error;
    return data?.data || data;
  }
  logProvider('cases_read', 'acceptCase', 'base44');
  return base44.functions.invoke('acceptCase', payload);
}

export function submitCase(payload) {
  return base44.functions.invoke('submitCase', payload);
}

export function sendApplicationEmails(payload) {
  return base44.functions.invoke('sendApplicationEmails', payload);
}

export function retrySyncLead(payload) {
  return base44.functions.invoke('retrySyncLead', payload);
}

/**
 * Send a notification email to all site admins (+ optional extra recipient).
 * Uses the cases edge function's send_notification action via Resend.
 */
export async function sendAdminNotification({ subject, body_text, body_html, to_email }) {
  if (useSupabase('cases_read')) {
    logProvider('cases_read', 'sendAdminNotification');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('cases', {
      body: { action: 'send_notification', subject, body_text, body_html, to_email },
    });
    if (error) throw error;
    return data?.data || data;
  }
  // Base44 fallback
  return base44.functions.invoke('sendApplicationEmails', { subject, body: body_text || body_html, to: to_email });
}
