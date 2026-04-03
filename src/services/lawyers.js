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

export function listProfiles(sort = '-created_date', limit = 500) {
  return base44.entities.LawyerProfile.list(sort, limit);
}

export function createProfile(data) {
  return base44.entities.LawyerProfile.create(data);
}

export function updateProfile(id, data) {
  return base44.entities.LawyerProfile.update(id, data);
}

// ---------------------------------------------------------------------------
// LawyerApplication
// ---------------------------------------------------------------------------

export function listApplications(sort = '-created_date') {
  return base44.entities.LawyerApplication.list(sort);
}

export function filterApplications(query) {
  return base44.entities.LawyerApplication.filter(query);
}

export function updateApplication(id, data) {
  return base44.entities.LawyerApplication.update(id, data);
}

// ---------------------------------------------------------------------------
// User entity (admin-facing read/write)
// ---------------------------------------------------------------------------

export function listUsers(sort = '-created_date') {
  return base44.entities.User.list(sort);
}

export function updateUser(id, data) {
  return base44.entities.User.update(id, data);
}

export function deleteUser(id) {
  return base44.entities.User.delete(id);
}

// ---------------------------------------------------------------------------
// Admin actions (backend functions)
// ---------------------------------------------------------------------------

export function approveLawyer(payload) {
  return base44.functions.invoke('approveLawyer', payload);
}

export function approveLawyerApplication(payload) {
  return base44.functions.invoke('approveLawyerApplication', payload);
}

export function rejectLawyerApplication(payload) {
  return base44.functions.invoke('rejectLawyerApplication', payload);
}

export function reviewLawyerApplication(payload) {
  return base44.functions.invoke('reviewLawyerApplication', payload);
}

export function disableLawyer(payload) {
  return base44.functions.invoke('disableLawyer', payload);
}

export function reinstateLawyer(payload) {
  return base44.functions.invoke('reinstateLawyer', payload);
}

export function requestMoreInfo(payload) {
  return base44.functions.invoke('requestMoreInfo', payload);
}

export function inviteAttorney(payload) {
  return base44.functions.invoke('inviteAttorney', payload);
}

export function resendActivation(payload) {
  return base44.functions.invoke('resendActivation', payload);
}

export function generateLegacyReport(payload) {
  return base44.functions.invoke('generateLegacyReport', payload);
}

export function searchNetworkAttorneys(query) {
  return base44.functions.invoke('searchNetworkAttorneys', { query });
}
