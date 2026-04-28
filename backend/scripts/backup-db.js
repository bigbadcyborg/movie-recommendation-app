#!/usr/bin/env node
/**
 * Copies backend/data/movies.db to backend/data/backups/movies-<ISO-ish stamp>.db
 * Safe to run when DB is missing (no-op, exit 0).
 */
const fs = require('fs');
const path = require('path');
const { MOVIES_DB_PATH, BACKUPS_DIR } = require('../src/db/dbPaths');

function timestampForFilename() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

function main() {
  if (!fs.existsSync(MOVIES_DB_PATH)) {
    console.log('[backup-db] No database at', MOVIES_DB_PATH, '- nothing to back up.');
    process.exit(0);
  }

  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const dest = path.join(BACKUPS_DIR, `movies-${timestampForFilename()}.db`);
  fs.copyFileSync(MOVIES_DB_PATH, dest);
  console.log('[backup-db] Wrote', dest);
}

main();
