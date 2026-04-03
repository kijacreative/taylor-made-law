/**
 * Admin service — AuditLog, ConsentLog, and admin-only User + team operations.
 */
import { base44 } from '@/api/base44Client';

// ---------------------------------------------------------------------------
// AuditLog (write-only from frontend; read in admin detail pages)
// ---------------------------------------------------------------------------

export function createAuditLog(data) {
  // Fire-and-forget pattern — callers should .catch(() => {})
  return base44.entities.AuditLog.create(data);
}

export function filterAuditLogs(query) {
  return base44.entities.AuditLog.filter(query);
}

// ---------------------------------------------------------------------------
// ConsentLog (write-only)
// ---------------------------------------------------------------------------

export function createConsentLog(data) {
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
