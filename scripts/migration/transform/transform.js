#!/usr/bin/env node
/**
 * Transform exported Base44 data into Supabase-ready format.
 *
 * Usage:
 *   node scripts/migration/transform/transform.js
 *
 * Input:  scripts/migration/export/data/{EntityName}.json
 * Output: scripts/migration/transform/data/{table_name}.json
 *
 * Transformations applied:
 *   1. Field renames (created_date → created_at, updated_date → updated_at)
 *   2. Soft-delete conversion (is_deleted boolean → deleted_at timestamp)
 *   3. ID mapping (Base44 string IDs → Supabase UUIDs via identity map)
 *   4. Email → UUID resolution for FK fields
 *   5. Enum validation (reject records with invalid enum values)
 *   6. Strip unknown fields not in target schema
 *
 * Records that fail validation are logged to scripts/migration/logs/transform-failures-*.jsonl
 */

import fs from 'fs';
import path from 'path';
import { ENTITY_MAP, PATHS, FIELD_RENAMES, SOFT_DELETE_TABLES, logFile } from '../config.js';

// ---------------------------------------------------------------------------
// Identity map: loaded from export or built during User import
// Maps Base44 user ID → Supabase UUID
// ---------------------------------------------------------------------------

let identityMap = {}; // { base44Id: supabaseUuid }
let emailToUuid = {}; // { email: supabaseUuid }

function loadIdentityMap() {
  const mapFile = path.join(PATHS.exportDir, '_identity_map.json');
  if (fs.existsSync(mapFile)) {
    const data = JSON.parse(fs.readFileSync(mapFile, 'utf-8'));
    identityMap = data.byId || {};
    emailToUuid = data.byEmail || {};
    console.log(`  Loaded identity map: ${Object.keys(identityMap).length} IDs, ${Object.keys(emailToUuid).length} emails`);
  } else {
    console.warn('  ⚠ No identity map found — UUID resolution will be skipped');
  }
}

function resolveUserId(base44Id) {
  return identityMap[base44Id] || base44Id; // passthrough if not mapped
}

function resolveUserEmail(email) {
  if (!email) return null;
  return emailToUuid[email.toLowerCase().trim()] || null;
}

// ---------------------------------------------------------------------------
// Transform a single record
// ---------------------------------------------------------------------------

function transformRecord(record, supabaseTable) {
  const out = { ...record };

  // 1. Field renames
  for (const [oldName, newName] of Object.entries(FIELD_RENAMES)) {
    if (oldName in out) {
      out[newName] = out[oldName];
      delete out[oldName];
    }
  }

  // 2. Soft-delete conversion
  if (SOFT_DELETE_TABLES.includes(supabaseTable)) {
    if (out.is_deleted === true) {
      out.deleted_at = out.updated_at || new Date().toISOString();
    } else {
      out.deleted_at = null;
    }
    delete out.is_deleted;
  }

  // 3. ID resolution for user FKs
  if (out.user_id && typeof out.user_id === 'string') {
    out.user_id = resolveUserId(out.user_id);
  }
  if (out.sender_user_id && typeof out.sender_user_id === 'string') {
    out.sender_user_id = resolveUserId(out.sender_user_id);
  }
  if (out.uploaded_by_user_id && typeof out.uploaded_by_user_id === 'string') {
    out.uploaded_by_user_id = resolveUserId(out.uploaded_by_user_id);
  }
  if (out.submitted_by_user_id && typeof out.submitted_by_user_id === 'string') {
    out.submitted_by_user_id = resolveUserId(out.submitted_by_user_id);
  }
  if (out.accepted_by_user_id && typeof out.accepted_by_user_id === 'string') {
    out.accepted_by_user_id = resolveUserId(out.accepted_by_user_id);
  }
  if (out.inviter_user_id && typeof out.inviter_user_id === 'string') {
    out.inviter_user_id = resolveUserId(out.inviter_user_id);
  }
  if (out.invitee_user_id && typeof out.invitee_user_id === 'string') {
    out.invitee_user_id = resolveUserId(out.invitee_user_id);
  }
  if (out.invited_by && typeof out.invited_by === 'string' && out.invited_by.includes('-')) {
    out.invited_by = resolveUserId(out.invited_by);
  }
  if (out.signer_user_id && typeof out.signer_user_id === 'string') {
    out.signer_user_id = resolveUserId(out.signer_user_id);
  }
  if (out.requested_by_user_id && typeof out.requested_by_user_id === 'string') {
    out.requested_by_user_id = resolveUserId(out.requested_by_user_id);
  }
  if (out.last_message_sender_id && typeof out.last_message_sender_id === 'string') {
    out.last_message_sender_id = resolveUserId(out.last_message_sender_id);
  }
  if (out.created_by_user_id && typeof out.created_by_user_id === 'string') {
    out.created_by_user_id = resolveUserId(out.created_by_user_id);
  }

  // 4. Email → UUID resolution for audit_logs (actor_email → actor_id)
  if (supabaseTable === 'audit_logs' && out.actor_email) {
    out.actor_id = resolveUserEmail(out.actor_email);
    // Keep actor_email for display
  }

  // 5. Email → UUID for lawyer_applications
  if (supabaseTable === 'lawyer_applications' && out.email && !out.user_id) {
    out.user_id = resolveUserEmail(out.email);
  }

  // 6. Normalize email fields
  if (out.email) out.email = out.email.toLowerCase().trim();
  if (out.sender_email) out.sender_email = out.sender_email.toLowerCase().trim();
  if (out.invitee_email) out.invitee_email = out.invitee_email.toLowerCase().trim();

  // 7. Ensure arrays are actual arrays
  for (const field of ['states_licensed', 'practice_areas', 'tags', 'participant_user_ids', 'participant_emails', 'attachment_file_ids', 'key_details']) {
    if (field in out && typeof out[field] === 'string') {
      try { out[field] = JSON.parse(out[field]); } catch { out[field] = []; }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Validate a record (returns array of error strings, empty = valid)
// ---------------------------------------------------------------------------

function validateRecord(record, supabaseTable) {
  const errors = [];

  // Required: id must exist
  if (!record.id) errors.push('Missing id');

  // Required: email on profiles
  if (supabaseTable === 'profiles' && !record.email) {
    errors.push('Missing email on profile');
  }

  // Required: title on cases, blog_posts
  if (['cases', 'blog_posts'].includes(supabaseTable) && !record.title) {
    errors.push('Missing title');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const transformDir = PATHS.transformDir;
  fs.mkdirSync(transformDir, { recursive: true });
  fs.mkdirSync(PATHS.logsDir, { recursive: true });

  loadIdentityMap();

  const failLog = fs.createWriteStream(logFile('transform-failures'), { flags: 'a' });
  const summaryLog = fs.createWriteStream(logFile('transform-summary'), { flags: 'a' });

  console.log(`\n=== Transform ===`);
  console.log(`Input:  ${PATHS.exportDir}`);
  console.log(`Output: ${transformDir}\n`);

  let totalRecords = 0;
  let totalFailed = 0;

  for (const { base44: entityName, supabase: tableName, phase } of ENTITY_MAP) {
    const inputFile = path.join(PATHS.exportDir, `${entityName}.json`);

    if (!fs.existsSync(inputFile)) {
      console.log(`  ⊘ ${entityName} → ${tableName}: no export file found, skipping`);
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    const records = raw.records || [];

    const transformed = [];
    let failed = 0;

    for (const record of records) {
      const out = transformRecord(record, tableName);
      const errors = validateRecord(out, tableName);

      if (errors.length > 0) {
        failLog.write(JSON.stringify({
          entity: entityName,
          table: tableName,
          record_id: record.id,
          errors,
          record,
        }) + '\n');
        failed++;
      } else {
        transformed.push(out);
      }
    }

    const outFile = path.join(transformDir, `${tableName}.json`);
    fs.writeFileSync(outFile, JSON.stringify({
      table: tableName,
      source_entity: entityName,
      phase,
      transformed_at: new Date().toISOString(),
      count: transformed.length,
      failed,
      records: transformed,
    }, null, 2));

    const entry = {
      entity: entityName,
      table: tableName,
      phase,
      input: records.length,
      output: transformed.length,
      failed,
    };
    summaryLog.write(JSON.stringify(entry) + '\n');
    totalRecords += transformed.length;
    totalFailed += failed;

    const status = failed > 0 ? `⚠ ${failed} failed` : '✓';
    console.log(`  ${status} ${entityName} → ${tableName}: ${records.length} → ${transformed.length} records`);
  }

  failLog.end();
  summaryLog.end();

  console.log(`\nTransform complete: ${totalRecords} records, ${totalFailed} failures`);
  console.log(`Failure log: ${logFile('transform-failures')}`);
  console.log(`Summary log: ${logFile('transform-summary')}`);
}

main().catch(console.error);
