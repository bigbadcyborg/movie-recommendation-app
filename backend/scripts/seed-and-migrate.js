#!/usr/bin/env node
/**
 * Runs `npm run seed` (backup + fetch-posters + seed), then migrates user-scoped data
 * from a SQLite source into the current movies.db.
 *
 * Default: `--from` is the newest *.db file in backend/data/backups/ (by mtime).
 * Override: `--from <path>` or `--from latest` (explicit automatic pick).
 *
 * Usage (from backend/):
 *   npm run seed:migrate
 *   npm run seed:migrate -- --dry-run
 *   npm run seed:migrate -- --from ./path/to/other.db
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { BACKUPS_DIR } = require('../src/db/dbPaths');

function resolveLatestBackup() {
  if (!fs.existsSync(BACKUPS_DIR)) return null;
  const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.db'));
  if (files.length === 0) return null;

  let bestPath = null;
  let bestTime = 0;
  for (const name of files) {
    const full = path.join(BACKUPS_DIR, name);
    const st = fs.statSync(full);
    if (st.mtimeMs >= bestTime) {
      bestTime = st.mtimeMs;
      bestPath = full;
    }
  }
  return bestPath;
}

function parseArgs(argv) {
  let fromArg = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') {
      fromArg = argv[++i];
      if (fromArg === undefined) {
        console.error('[seed-and-migrate] --from requires a value or `latest`');
        process.exit(1);
      }
    } else if (argv[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { fromArg, dryRun };
}

function resolveMigrateFrom(fromArg, cwd) {
  if (fromArg === undefined || fromArg === null || fromArg === 'latest') {
    return resolveLatestBackup();
  }
  const resolved = path.resolve(cwd, fromArg);
  return resolved;
}

function main() {
  const cwd = path.join(__dirname, '..');
  const { fromArg, dryRun } = parseArgs(process.argv.slice(2));

  const seedResult = spawnSync('npm run seed', {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: process.env
  });

  if (seedResult.status !== 0) {
    process.exit(seedResult.status ?? 1);
  }

  const migrateFrom = resolveMigrateFrom(fromArg, process.cwd());

  if (!migrateFrom) {
    console.log(
      '[seed-and-migrate] No backup file found (nothing under data/backups/*.db). Skipping migrate.'
    );
    process.exit(0);
  }

  if (fromArg && fromArg !== 'latest' && !fs.existsSync(migrateFrom)) {
    console.error('[seed-and-migrate] Source DB does not exist:', migrateFrom);
    process.exit(1);
  }

  console.log('[seed-and-migrate] Migrating from:', migrateFrom);

  const migrateScript = path.join(__dirname, 'migrate-from-db.js');
  const args = [migrateScript, '--from', migrateFrom];
  if (dryRun) args.push('--dry-run');

  const mig = spawnSync(process.execPath, args, {
    cwd,
    stdio: 'inherit',
    env: process.env
  });

  process.exit(mig.status ?? 1);
}

main();
