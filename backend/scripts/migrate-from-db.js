#!/usr/bin/env node
/**
 * One-time migration of user-scoped data from an older movies.db into the current one.
 * Remaps users by email and movies by title (see README Database operations).
 *
 * Usage:
 *   node scripts/migrate-from-db.js --from path/to/old/movies.db
 *   node scripts/migrate-from-db.js --from path/to/old/movies.db --dry-run
 */
'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { MOVIES_DB_PATH } = require('../src/db/dbPaths');
const { run, getOne, getAll, saveDatabase, openDatabase } = require('../src/db/scriptDb');

function parseArgs() {
  let fromPath = null;
  let dryRun = false;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') {
      fromPath = argv[++i];
    } else if (argv[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return {
    fromPath: fromPath ? path.resolve(fromPath) : null,
    dryRun
  };
}

function resolveMovieId(targetDb, title, warnings) {
  const rows = getAll(targetDb, 'SELECT id FROM movies WHERE title = ? ORDER BY id ASC', [title]);
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    warnings.push(`Duplicate movie title "${title}" — using smallest id ${rows[0].id}`);
  }
  return rows[0].id;
}

async function main() {
  const { fromPath, dryRun } = parseArgs();

  if (!fromPath || !fs.existsSync(fromPath)) {
    console.error('Usage: node scripts/migrate-from-db.js --from <path/to/old/movies.db> [--dry-run]');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const sourceDb = new SQL.Database(fs.readFileSync(fromPath));

  let targetDb;
  if (dryRun) {
    targetDb = fs.existsSync(MOVIES_DB_PATH)
      ? new SQL.Database(fs.readFileSync(MOVIES_DB_PATH))
      : new SQL.Database();
  } else {
    targetDb = await openDatabase(MOVIES_DB_PATH);
  }

  sourceDb.run('PRAGMA foreign_keys=ON');
  targetDb.run('PRAGMA foreign_keys=ON');

  const warnings = [];
  const stats = {
    usersNew: 0,
    ratingsUpserted: 0,
    ratingsSkipped: 0,
    commentsInserted: 0,
    commentsSkipped: 0,
    favoritesInserted: 0,
    favoritesSkipped: 0,
    recommendationsInserted: 0,
    recommendationsSkipped: 0,
    logsInserted: 0,
    logsSkipped: 0
  };

  const sourceUsers = getAll(sourceDb, 'SELECT * FROM users');

  for (const u of sourceUsers) {
    const existed = getOne(targetDb, 'SELECT id FROM users WHERE email = ?', [u.email]);
    const onboarding =
      u.onboarding_completed !== undefined && u.onboarding_completed !== null
        ? u.onboarding_completed
        : 0;
    const isAdmin = u.is_admin !== undefined && u.is_admin !== null ? u.is_admin : 0;

    run(
      targetDb,
      `INSERT OR IGNORE INTO users (username, email, password_hash, preferred_genres, watch_history, is_admin, onboarding_completed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [
        u.username,
        u.email,
        u.password_hash,
        u.preferred_genres != null ? String(u.preferred_genres) : '[]',
        u.watch_history != null ? String(u.watch_history) : '[]',
        isAdmin,
        onboarding,
        u.created_at != null ? u.created_at : null
      ]
    );

    if (!existed && getOne(targetDb, 'SELECT id FROM users WHERE email = ?', [u.email])) {
      stats.usersNew += 1;
    }
  }

  const userIdMap = {};
  for (const u of sourceUsers) {
    const row = getOne(targetDb, 'SELECT id FROM users WHERE email = ?', [u.email]);
    if (row) userIdMap[u.id] = row.id;
    else warnings.push(`No target user for source user id ${u.id} (${u.email})`);
  }

  // Ratings
  const ratingRows = getAll(
    sourceDb,
    `SELECT r.user_id AS uid, r.movie_id AS mid, r.rating, r.created_at, m.title
     FROM ratings r JOIN movies m ON r.movie_id = m.id`
  );

  for (const r of ratingRows) {
    const newUserId = userIdMap[r.uid];
    const newMovieId = resolveMovieId(targetDb, r.title, warnings);
    if (!newUserId || !newMovieId) {
      stats.ratingsSkipped += 1;
      continue;
    }
    run(
      targetDb,
      `INSERT INTO ratings (user_id, movie_id, rating, created_at)
       VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
       ON CONFLICT(user_id, movie_id) DO UPDATE SET
         rating = excluded.rating,
         created_at = excluded.created_at`,
      [newUserId, newMovieId, r.rating, r.created_at != null ? r.created_at : null]
    );
    stats.ratingsUpserted += 1;
  }

  // Comments
  const commentRows = getAll(
    sourceDb,
    `SELECT c.user_id AS uid, c.movie_id AS mid, c.comment_text, c.created_at, m.title
     FROM comments c JOIN movies m ON c.movie_id = m.id`
  );

  for (const c of commentRows) {
    const newUserId = userIdMap[c.uid];
    const newMovieId = resolveMovieId(targetDb, c.title, warnings);
    if (!newUserId || !newMovieId) {
      stats.commentsSkipped += 1;
      continue;
    }
    run(
      targetDb,
      `INSERT INTO comments (user_id, movie_id, comment_text, created_at)
       VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [
        newUserId,
        newMovieId,
        c.comment_text,
        c.created_at != null ? c.created_at : null
      ]
    );
    stats.commentsInserted += 1;
  }

  // Favorites
  const favRows = getAll(
    sourceDb,
    `SELECT f.user_id AS uid, f.movie_id AS mid, f.added_at, m.title
     FROM favorites f JOIN movies m ON f.movie_id = m.id`
  );

  for (const f of favRows) {
    const newUserId = userIdMap[f.uid];
    const newMovieId = resolveMovieId(targetDb, f.title, warnings);
    if (!newUserId || !newMovieId) {
      stats.favoritesSkipped += 1;
      continue;
    }
    run(
      targetDb,
      `INSERT OR IGNORE INTO favorites (user_id, movie_id, added_at)
       VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [newUserId, newMovieId, f.added_at != null ? f.added_at : null]
    );
    stats.favoritesInserted += 1;
  }

  // Recommendations (optional columns — skip if table missing in source)
  try {
    const recRows = getAll(
      sourceDb,
      `SELECT rec.user_id AS uid, rec.movie_id AS mid, rec.score, rec.explanation, rec.created_at, m.title
       FROM recommendations rec JOIN movies m ON rec.movie_id = m.id`
    );
    for (const rec of recRows) {
      const newUserId = userIdMap[rec.uid];
      const newMovieId = resolveMovieId(targetDb, rec.title, warnings);
      if (!newUserId || !newMovieId) {
        stats.recommendationsSkipped += 1;
        continue;
      }
      run(
        targetDb,
        `INSERT INTO recommendations (user_id, movie_id, score, explanation, created_at)
         VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        [
          newUserId,
          newMovieId,
          rec.score,
          rec.explanation != null ? rec.explanation : null,
          rec.created_at != null ? rec.created_at : null
        ]
      );
      stats.recommendationsInserted += 1;
    }
  } catch (e) {
    warnings.push(`recommendations table skipped: ${e.message}`);
  }

  // Interaction logs (movie_id nullable)
  try {
    const logRows = getAll(sourceDb, 'SELECT * FROM interaction_logs');
    for (const row of logRows) {
      const newUserId = userIdMap[row.user_id];
      if (!newUserId) {
        stats.logsSkipped += 1;
        continue;
      }
      let newMovieId = null;
      if (row.movie_id != null) {
        const movieRow = getOne(sourceDb, 'SELECT title FROM movies WHERE id = ?', [row.movie_id]);
        if (!movieRow) {
          stats.logsSkipped += 1;
          continue;
        }
        newMovieId = resolveMovieId(targetDb, movieRow.title, warnings);
        if (!newMovieId) {
          stats.logsSkipped += 1;
          continue;
        }
      }
      run(
        targetDb,
        `INSERT INTO interaction_logs (user_id, movie_id, action_type, "filter", created_at)
         VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        [
          newUserId,
          newMovieId,
          row.action_type,
          row.filter != null ? row.filter : null,
          row.created_at != null ? row.created_at : null
        ]
      );
      stats.logsInserted += 1;
    }
  } catch (e) {
    warnings.push(`interaction_logs table skipped: ${e.message}`);
  }

  sourceDb.close();

  console.log('[migrate-from-db] Summary');
  console.log(JSON.stringify(stats, null, 2));
  if (warnings.length) {
    console.log('[migrate-from-db] Warnings:');
    warnings.slice(0, 50).forEach(w => console.log('  -', w));
    if (warnings.length > 50) console.log(`  ... and ${warnings.length - 50} more`);
  }

  if (dryRun) {
    console.log('[migrate-from-db] Dry-run: target file was not modified.');
    targetDb.close();
  } else {
    saveDatabase(targetDb, MOVIES_DB_PATH);
    targetDb.close();
    console.log('[migrate-from-db] Wrote', MOVIES_DB_PATH);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
