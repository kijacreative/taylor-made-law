/**
 * Admin service — AuditLog, ConsentLog, and admin-only User + team operations.
 *
 * Supports dual providers (Base44 / Supabase) via feature flags.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// AuditLog (write-only from frontend; read in admin detail pages)
// ---------------------------------------------------------------------------

export async function createAuditLog(data) {
  // Fire-and-forget pattern — callers should .catch(() => {})
  if (useSupabase('auth')) {
    logProvider('auth', 'createAuditLog');
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('audit_logs').insert(data);
      if (error) throw error;
      return;
    }
  }
  logProvider('auth', 'createAuditLog', 'base44');
  return base44.entities.AuditLog.create(data);
}

export function filterAuditLogs(query) {
  return base44.entities.AuditLog.filter(query);
}

// ---------------------------------------------------------------------------
// ConsentLog (write-only)
// ---------------------------------------------------------------------------

export async function createConsentLog(data) {
  if (useSupabase('auth')) {
    logProvider('auth', 'createConsentLog');
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('consent_logs').insert(data);
      if (error) throw error;
      return;
    }
  }
  logProvider('auth', 'createConsentLog', 'base44');
  return base44.entities.ConsentLog.create(data);
}

// ---------------------------------------------------------------------------
// Invitation (generic — used in FindLawyer attorney referral)
// ---------------------------------------------------------------------------

export function createInvitation(data) {
  return base44.entities.Invitation.create(data);
}

// ---------------------------------------------------------------------------
// Admin team operations (backend functions)
// ---------------------------------------------------------------------------

export function inviteAdminUser(payload) {
  return base44.functions.invoke('inviteAdminUser', payload);
}

// ---------------------------------------------------------------------------
// Email (Core.SendEmail — used in ForgotPassword, AdminLeadDetail, AdminTeam)
// ---------------------------------------------------------------------------

export function sendEmail(params) {
  return base44.integrations.Core.SendEmail(params);
}
