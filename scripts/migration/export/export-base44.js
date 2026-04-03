#!/usr/bin/env node
/**
 * Export all entities from Base44 to JSON files.
 *
 * Usage:
 *   node scripts/migration/export/export-base44.js
 *
 * Requires: Running Base44 connection (VITE_USE_MOCKS=false, valid Base44 env vars)
 *
 * Output: scripts/migration/export/data/{EntityName}.json per entity
 *
 * This script uses the Base44 SDK's .list() method with service role
 * to export all records for each entity. It does NOT modify source data.
 */

import fs from 'fs';
import path from 'path';
import { ENTITY_MAP, PATHS, logFile } from '../config.js';

// ---------------------------------------------------------------------------
// NOTE: This script requires the Base44 SDK to be importable from Node.
// If the SDK only works in browser context, replace this with a manual
// export from the Base44 dashboard, or use a headless browser script.
//
// For now, this serves as the documented export procedure.
// The expected output format is one JSON file per entity:
//   { "entity": "User", "exported_at": "...", "count": N, "records": [...] }
// ---------------------------------------------------------------------------

const exportDir = PATHS.exportDir;

async function exportEntity(entityName) {
  // Placeholder: In practice, call Base44 SDK or API here
  // const records = await base44.asServiceRole.entities[entityName].list('-created_date', 10000);
  console.log(`[export] Would export: ${entityName}`);
  return [];
}

async function main() {
  fs.mkdirSync(exportDir, { recursive: true });

  const log = fs.createWriteStream(logFile('export'), { flags: 'a' });

  console.log(`\n=== Base44 Export ===`);
  console.log(`Output: ${exportDir}\n`);

  for (const { base44: entityName } of ENTITY_MAP) {
    const startTime = Date.now();

    try {
      const records = await exportEntity(entityName);
      const outFile = path.join(exportDir, `${entityName}.json`);

      const payload = {
        entity: entityName,
        exported_at: new Date().toISOString(),
        count: records.length,
        records,
      };

      fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));

      const entry = {
        entity: entityName,
        count: records.length,
        duration_ms: Date.now() - startTime,
        status: 'ok',
      };
      log.write(JSON.stringify(entry) + '\n');
      console.log(`  ✓ ${entityName}: ${records.length} records (${entry.duration_ms}ms)`);
    } catch (err) {
      const entry = {
        entity: entityName,
        error: err.message,
        duration_ms: Date.now() - startTime,
        status: 'error',
      };
      log.write(JSON.stringify(entry) + '\n');
      console.error(`  ✗ ${entityName}: ${err.message}`);
    }
  }

  log.end();
  console.log(`\nExport complete. Log: ${logFile('export')}`);
}

main().catch(console.error);
