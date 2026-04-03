#!/usr/bin/env node
/**
 * Import transformed data into Supabase.
 *
 * Usage:
 *   node scripts/migration/import/import-supabase.js [--phase N] [--table TABLE] [--dry-run]
 *
 * Options:
 *   --phase N     Import only tables in phase N (1-5)
 *   --table TABLE Import only a specific table
 *   --dry-run     Validate data shapes without inserting
 *
 * Input: scripts/migration/transform/data/{table_name}.json
 *
 * Uses Supabase service_role key (bypasses RLS) for bulk insert.
 * Inserts in batches of 500 records to avoid timeout.
 * Does NOT delete existing data — upserts on primary key.
 */

import fs from 'fs';
import path from 'path';
import { ENTITY_MAP, PATHS, getSupabaseAdmin, logFile } from '../config.js';

const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const phaseFilter = args.includes('--phase') ? parseInt(args[args.indexOf('--phase') + 1]) : null;
const tableFilter = args.includes('--table') ? args[args.indexOf('--table') + 1] : null;
const dryRun = args.includes('--dry-run');

// ---------------------------------------------------------------------------
// Import a single table
// ---------------------------------------------------------------------------

async function importTable(supabase, tableName, records, log) {
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < totalBatches; i++) {
    const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

    if (dryRun) {
      imported += batch.length;
      continue;
    }

    const { data, error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      // Log the entire failed batch for debugging
      log.write(JSON.stringify({
        table: tableName,
        batch: i + 1,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        sample_record: batch[0],
        batch_size: batch.length,
      }) + '\n');
      failed += batch.length;
      console.error(`    Batch ${i + 1}/${totalBatches}: ERROR — ${error.message}`);
    } else {
      imported += batch.length;
    }
  }

  return { imported, failed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabase = dryRun ? null : getSupabaseAdmin();

  fs.mkdirSync(PATHS.logsDir, { recursive: true });
  const log = fs.createWriteStream(logFile('import'), { flags: 'a' });

  console.log(`\n=== Supabase Import ${dryRun ? '(DRY RUN)' : ''} ===`);
  if (phaseFilter) console.log(`Phase filter: ${phaseFilter}`);
  if (tableFilter) console.log(`Table filter: ${tableFilter}`);
  console.log(`Input: ${PATHS.transformDir}\n`);

  const tables = ENTITY_MAP
    .filter(e => !phaseFilter || e.phase === phaseFilter)
    .filter(e => !tableFilter || e.supabase === tableFilter);

  let totalImported = 0;
  let totalFailed = 0;

  for (const { base44: entityName, supabase: tableName, phase } of tables) {
    const inputFile = path.join(PATHS.transformDir, `${tableName}.json`);

    if (!fs.existsSync(inputFile)) {
      console.log(`  ⊘ ${tableName}: no transform file found, skipping`);
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    const records = raw.records || [];

    if (records.length === 0) {
      console.log(`  ⊘ ${tableName}: 0 records, skipping`);
      continue;
    }

    const startTime = Date.now();
    const { imported, failed } = await importTable(supabase, tableName, records, log);
    const duration = Date.now() - startTime;

    totalImported += imported;
    totalFailed += failed;

    const status = failed > 0 ? `⚠ ${failed} failed` : '✓';
    console.log(`  ${status} ${tableName} (phase ${phase}): ${imported}/${records.length} imported (${duration}ms)`);

    log.write(JSON.stringify({
      table: tableName,
      entity: entityName,
      phase,
      total: records.length,
      imported,
      failed,
      duration_ms: duration,
      dry_run: dryRun,
    }) + '\n');
  }

  log.end();
  console.log(`\nImport complete: ${totalImported} imported, ${totalFailed} failed`);
  console.log(`Log: ${logFile('import')}`);
}

main().catch(console.error);
