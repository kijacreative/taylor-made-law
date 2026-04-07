/**
 * Lawyers service — LawyerProfile, LawyerApplication, and admin attorney operations.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// LawyerProfile
// ---------------------------------------------------------------------------

export async function getProfileByUserId(userId) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'getProfileByUserId');
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('lawyer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }
  }
  logProvider('profile_read', 'getProfileByUserId', 'base44');
  return base44.entities.LawyerProfile.filter({ user_id: userId }).then(r => r[0] || null);
}

export async function listProfiles(sort = '-created_date', limit = 500) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'listProfiles');
    const sb = getSupabase();
    if (sb) {
      const ascending = !sort.startsWith('-');
      const column = sort.replace(/^-/, '').replace('created_date', 'created_at');
      const { data, error } = await sb
        .from('lawyer_profiles')
        .select('*')
        .order(column, { ascending })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('profile_read', 'listProfiles', 'base44');
  return base44.entities.LawyerProfile.list(sort, limit);
}

export async function createProfile(data) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'createProfile');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('lawyer_profiles')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('profile_read', 'createProfile', 'base44');
  return base44.entities.LawyerProfile.create(data);
}

export async function updateProfile(id, data) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'updateProfile');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('lawyer_profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('profile_read', 'updateProfile', 'base44');
  return base44.entities.LawyerProfile.update(id, data);
}

// ---------------------------------------------------------------------------
// LawyerApplication
// ---------------------------------------------------------------------------

export async function listApplications(sort = '-created_date') {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'listApplications');
    const sb = getSupabase();
    if (sb) {
      const ascending = !sort.startsWith('-');
      const column = sort.replace(/^-/, '').replace('created_date', 'created_at');
      const { data, error } = await sb
        .from('lawyer_applications')
        .select('*')
        .order(column, { ascending });
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('profile_read', 'listApplications', 'base44');
  return base44.entities.LawyerApplication.list(sort);
}

export async function filterApplications(query) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'filterApplications');
    const sb = getSupabase();
    if (sb) {
      let q = sb.from('lawyer_applications').select('*');
      for (const [key, value] of Object.entries(query)) {
        q = q.eq(key, value);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('profile_read', 'filterApplications', 'base44');
  return base44.entities.LawyerApplication.filter(query);
}

export async function updateApplication(id, data) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'updateApplication');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('lawyer_applications')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('profile_read', 'updateApplication', 'base44');
  return base44.entities.LawyerApplication.update(id, data);
}

// ---------------------------------------------------------------------------
// User entity (admin-facing read/write) — maps to profiles table in Supabase
// ---------------------------------------------------------------------------

export async function listUsers(sort = '-created_date') {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'listUsers');
    const sb = getSupabase();
    if (sb) {
      const ascending = !sort.startsWith('-');
      const column = sort.replace(/^-/, '').replace('created_date', 'created_at');
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .order(column, { ascending });
      if (error) throw error;
      return data || [];
    }
  }
  logProvider('profile_read', 'listUsers', 'base44');
  return base44.entities.User.list(sort);
}

export async function updateUser(id, data) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'updateUser');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('profile_read', 'updateUser', 'base44');
  return base44.entities.User.update(id, data);
}

export function deleteUser(id) {
  return base44.entities.User.delete(id);
}

// ---------------------------------------------------------------------------
// Admin actions (backend functions)
// ---------------------------------------------------------------------------

/** Helper: invoke admin-lawyers edge function */
async function invokeAdminLawyers(action, payload = {}) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', action);
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.functions.invoke('admin-lawyers', {
        body: { action, ...payload },
      });
      if (error) throw error;
      return data?.data || data;
    }
  }
  // Base44 fallback — map action names to Base44 function names
  const fnMap = {
    approve_lawyer: 'approveLawyer',
    approve_application: 'approveLawyerApplication',
    reject: 'rejectLawyerApplication',
    review_application: 'reviewLawyerApplication',
    disable: 'disableLawyer',
    reinstate: 'reinstateLawyer',
    request_info: 'requestMoreInfo',
    invite_attorney: 'inviteAttorney',
  };
  return base44.functions.invoke(fnMap[action] || action, payload);
}

export function approveLawyer(payload) {
  return invokeAdminLawyers('approve_lawyer', payload);
}

export function approveLawyerApplication(payload) {
  return invokeAdminLawyers('approve_application', payload);
}

export function rejectLawyerApplication(payload) {
  return invokeAdminLawyers('reject', payload);
}

export function reviewLawyerApplication(payload) {
  return invokeAdminLawyers('review_application', payload);
}

export function disableLawyer(payload) {
  return invokeAdminLawyers('disable', payload);
}

export function reinstateLawyer(payload) {
  return invokeAdminLawyers('reinstate', payload);
}

export function requestMoreInfo(payload) {
  return invokeAdminLawyers('request_info', payload);
}

export function inviteAttorney(payload) {
  return invokeAdminLawyers('invite_attorney', payload);
}

export function resendActivation(payload) {
  return base44.functions.invoke('resendActivation', payload);
}

export function generateLegacyReport(payload) {
  return base44.functions.invoke('generateLegacyReport', payload);
}

export async function searchNetworkAttorneys(query) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'searchNetworkAttorneys');
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('lawyer_profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,firm_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  }
  return base44.functions.invoke('searchNetworkAttorneys', { query });
}
