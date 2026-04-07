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

// Case entity — writes (Base44 only)
export function createCase(data) {
  return base44.entities.Case.create(data);
}

export function updateCase(id, data) {
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

// Lead entity — writes (Base44 only)
export function createLead(data) {
  return base44.entities.Lead.create(data);
}

export function updateLead(id, data) {
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
