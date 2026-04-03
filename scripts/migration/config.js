/**
 * Migration pipeline configuration.
 *
 * Controls paths, Supabase connection, and the entity→table mapping.
 * All scripts import from here — single source of truth.
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const PATHS = {
  exportDir:    path.join(__dirname, 'export', 'data'),
  transformDir: path.join(__dirname, 'transform', 'data'),
  logsDir:      path.join(__dirname, 'logs'),
};

// ---------------------------------------------------------------------------
// Supabase connection (uses service_role key for migration — bypasses RLS)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function getSupabaseAdmin() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for migration.\n' +
      'Run `npx supabase start` and copy the service_role key from the output.'
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Entity → Table mapping (import order respects FK dependencies)
// ---------------------------------------------------------------------------

export const ENTITY_MAP = [
  // Phase 1: Core identity (no FK deps)
  { base44: 'User',                    supabase: 'profiles',                    phase: 1 },
  { base44: 'LawyerProfile',           supabase: 'lawyer_profiles',             phase: 1 },

  // Phase 2: Standalone tables (no FK deps)
  { base44: 'Lead',                    supabase: 'leads',                       phase: 2 },
  { base44: 'BlogPost',               supabase: 'blog_posts',                  phase: 2 },
  { base44: 'ContentPost',            supabase: 'content_posts',               phase: 2 },
  { base44: 'Resource',               supabase: 'resources',                   phase: 2 },
  { base44: 'MassTort',               supabase: 'mass_torts',                  phase: 2 },
  { base44: 'Popup',                  supabase: 'popups',                      phase: 2 },
  { base44: 'EmailVerificationOtp',   supabase: 'email_verification_otps',     phase: 2 },

  // Phase 3: Tables with FK to profiles
  { base44: 'LegalCircle',            supabase: 'legal_circles',               phase: 3 },
  { base44: 'Case',                   supabase: 'cases',                       phase: 3 },
  { base44: 'LawyerApplication',      supabase: 'lawyer_applications',         phase: 3 },
  { base44: 'ActivationToken',        supabase: 'activation_tokens',           phase: 3 },
  { base44: 'AttorneyInvitation',     supabase: 'attorney_invitations',        phase: 3 },
  { base44: 'DirectMessageThread',    supabase: 'direct_message_threads',      phase: 3 },

  // Phase 4: Tables with FK to phase 2-3 tables
  { base44: 'LegalCircleMember',      supabase: 'legal_circle_members',        phase: 4 },
  { base44: 'LegalCircleInvitation',  supabase: 'legal_circle_invitations',    phase: 4 },
  { base44: 'LegalCircleCase',        supabase: 'legal_circle_cases',          phase: 4 },
  { base44: 'DirectMessageParticipant', supabase: 'direct_message_participants', phase: 4 },
  { base44: 'DirectMessage',          supabase: 'direct_messages',             phase: 4 },
  { base44: 'CircleMessage',          supabase: 'circle_messages',             phase: 4 },
  { base44: 'CircleDocument',         supabase: 'circle_documents',            phase: 4 },
  { base44: 'CircleNotification',     supabase: 'circle_notifications',        phase: 4 },
  { base44: 'ResourceEvent',          supabase: 'resource_events',             phase: 4 },
  { base44: 'PopupImpression',        supabase: 'popup_impressions',           phase: 4 },
  { base44: 'ConsentLog',             supabase: 'consent_logs',                phase: 4 },
  { base44: 'Invitation',             supabase: 'invitations',                 phase: 4 },
  { base44: 'AuditLog',               supabase: 'audit_logs',                  phase: 4 },

  // Phase 5: Tables with FK to phase 4 tables
  { base44: 'DirectMessageFile',      supabase: 'direct_message_files',        phase: 5 },
  { base44: 'CircleFile',             supabase: 'circle_files',                phase: 5 },
  { base44: 'DocumentVersion',        supabase: 'document_versions',           phase: 5 },
  { base44: 'DocumentSignature',      supabase: 'document_signatures',         phase: 5 },
];

// ---------------------------------------------------------------------------
// Field renames applied during transform (Base44 name → Supabase name)
// ---------------------------------------------------------------------------

export const FIELD_RENAMES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

// ---------------------------------------------------------------------------
// Soft-delete conversion (is_deleted boolean → deleted_at timestamp)
// ---------------------------------------------------------------------------

export const SOFT_DELETE_TABLES = [
  'direct_messages',
  'direct_message_files',
  'circle_messages',
  'circle_files',
];

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export function logFile(name) {
  return path.join(PATHS.logsDir, `${name}-${new Date().toISOString().slice(0,10)}.jsonl`);
}
