#!/usr/bin/env node
/**
 * Build identity map from exported Base44 User data.
 *
 * Usage:
 *   node scripts/migration/transform/build-identity-map.js
 *
 * Input:  scripts/migration/export/data/User.json
 * Output: scripts/migration/export/data/_identity_map.json
 *
 * The identity map is used by transform.js to resolve Base44 user IDs
 * to Supabase UUIDs across all entity FK fields.
 *
 * Strategy:
 *   - For each Base44 User record, generate a deterministic UUID
 *     (or use the Base44 ID as-is if it's already UUID format)
 *   - Build two lookup tables: byId and byEmail
 *   - The import step will create auth.users + profiles with these UUIDs
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PATHS } from '../config.js';

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function deterministicUuid(base44Id) {
  // If already a UUID, keep it
  if (isUuid(base44Id)) return base44Id;
  // Otherwise, generate a v5-like UUID from the Base44 ID
  const hash = crypto.createHash('sha256').update(`tml-migration:${base44Id}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16), // version 4
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // variant
    hash.slice(20, 32),
  ].join('-');
}

function main() {
  const userFile = path.join(PATHS.exportDir, 'User.json');

  if (!fs.existsSync(userFile)) {
    console.error('User.json not found in export/data/. Run export first.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(userFile, 'utf-8'));
  const users = raw.records || [];

  const byId = {};
  const byEmail = {};
  const conflicts = [];

  for (const user of users) {
    const base44Id = user.id;
    const supabaseId = deterministicUuid(base44Id);
    const email = (user.email || '').toLowerCase().trim();

    if (!base44Id) {
      conflicts.push({ user, error: 'Missing id' });
      continue;
    }
    if (!email) {
      conflicts.push({ user, error: 'Missing email' });
      continue;
    }

    // Check for email conflicts (two Base44 users with same email)
    if (byEmail[email] && byEmail[email] !== supabaseId) {
      conflicts.push({
        user,
        error: `Duplicate email: ${email} already mapped to ${byEmail[email]}`,
      });
      continue;
    }

    byId[base44Id] = supabaseId;
    byEmail[email] = supabaseId;
  }

  const outFile = path.join(PATHS.exportDir, '_identity_map.json');
  fs.writeFileSync(outFile, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_users: users.length,
    mapped: Object.keys(byId).length,
    conflicts: conflicts.length,
    byId,
    byEmail,
  }, null, 2));

  console.log(`\n=== Identity Map ===`);
  console.log(`  Users exported: ${users.length}`);
  console.log(`  Mapped: ${Object.keys(byId).length}`);
  console.log(`  Conflicts: ${conflicts.length}`);
  console.log(`  Output: ${outFile}`);

  if (conflicts.length > 0) {
    const conflictFile = path.join(PATHS.logsDir, 'identity-conflicts.json');
    fs.mkdirSync(PATHS.logsDir, { recursive: true });
    fs.writeFileSync(conflictFile, JSON.stringify(conflicts, null, 2));
    console.log(`  Conflict details: ${conflictFile}`);
  }
}

main();
