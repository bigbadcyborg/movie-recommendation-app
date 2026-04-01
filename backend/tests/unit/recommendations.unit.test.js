// Unit tests for the private recommendation scoring functions using rewire.
// We use rewire.__set__ to inject controlled db functions directly,
// bypassing Jest's module system for the rewired module.

jest.mock('../../src/db/database');
const { __resetDb } = require('../../src/db/database');
const { setupTestDb } = require('../setupDb');
const { seedTestData } = require('../helpers/seed');
const bcrypt = require('bcryptjs');

const rewire = require('rewire');

let db;
let ids;
let recommendationsModule;
let getContentBasedScores;
let getCollaborativeScores;
let getSimilarMovieScores;

// Helpers that delegate to the live db instance (set after beforeAll)
function makeDbHelpers() {
  function runQuery(sql, params = []) {
    db.run(sql, params || []);
  }

  function getOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params || []);
    let result = null;
    if (stmt.step()) result = stmt.getAsObject();
    stmt.free();
    return result;
  }

  function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params || []);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  }

  return { runQuery, getOne, getAll };
}

beforeAll(async () => {
  db = await setupTestDb();
  __resetDb(db);
  ids = await seedTestData(db);

  // Load the recommendations module via rewire
  recommendationsModule = rewire('../../src/routes/recommendations');

  // Inject db helper functions into the module's scope
  const helpers = makeDbHelpers();
  recommendationsModule.__set__('runQuery', helpers.runQuery);
  recommendationsModule.__set__('getOne', helpers.getOne);
  recommendationsModule.__set__('getAll', helpers.getAll);

  // Extract private functions
  getContentBasedScores = recommendationsModule.__get__('getContentBasedScores');
  getCollaborativeScores = recommendationsModule.__get__('getCollaborativeScores');
  getSimilarMovieScores = recommendationsModule.__get__('getSimilarMovieScores');
});

afterAll(() => {
  if (db) db.close();
});

function insertUser(username, email) {
  const hash = bcrypt.hashSync('Password123', 10);
  db.run('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, 0)',
    [username, email, hash]);
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const uid = stmt.getAsObject().id;
  stmt.free();
  return uid;
}

// ---------------------------------------------------------------------------
// getContentBasedScores
// ---------------------------------------------------------------------------
describe('getContentBasedScores', () => {
  test('returns {} when user has no ratings and no favorites', () => {
    const uid = insertUser('cbu1', 'cbu1@test.com');
    const scores = getContentBasedScores(uid);
    expect(scores).toEqual({});
  });

  test('scores for movieB (Action) > 0 when user rated movieA (Action, Sci-Fi) with 5', () => {
    const uid = insertUser('cbu2', 'cbu2@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [uid, ids.movieA]);

    const scores = getContentBasedScores(uid);
    // movieB shares Action genre with movieA
    expect(scores[ids.movieB]).toBeGreaterThan(0);
  });

  test('movieA is excluded from scores (user already rated it)', () => {
    const uid = insertUser('cbu3', 'cbu3@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [uid, ids.movieA]);

    const scores = getContentBasedScores(uid);
    expect(scores[ids.movieA]).toBeUndefined();
  });

  test('returned score values are between 0 and 1', () => {
    const uid = insertUser('cbu4', 'cbu4@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [uid, ids.movieA]);

    const scores = getContentBasedScores(uid);
    for (const score of Object.values(scores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// getCollaborativeScores
// ---------------------------------------------------------------------------
describe('getCollaborativeScores', () => {
  test('returns {} when user has no ratings', () => {
    const uid = insertUser('cfb1', 'cfb1@test.com');
    const scores = getCollaborativeScores(uid);
    expect(scores).toEqual({});
  });

  test('returns {} when no other users share rated movies', () => {
    const uid = insertUser('cfb2', 'cfb2@test.com');
    // Insert a unique movie so no other user can share it
    db.run("INSERT INTO movies (title, release_year) VALUES ('Unique CF Movie', 2000)");
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const uniqueMovieId = stmt.getAsObject().id;
    stmt.free();

    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 4)',
      [uid, uniqueMovieId]);

    const scores = getCollaborativeScores(uid);
    expect(scores).toEqual({});
  });

  test('userY gets movieC recommended when userX rated both movieA and movieC', () => {
    const userX = insertUser('cfX', 'cfx@test.com');
    const userY = insertUser('cfY', 'cfy@test.com');

    // Both rate movieA (establishes similarity)
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [userX, ids.movieA]);
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [userY, ids.movieA]);

    // userX also rates movieC
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [userX, ids.movieC]);

    const scores = getCollaborativeScores(userY);
    // movieC should have a positive collaborative score for userY
    expect(scores[ids.movieC]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getSimilarMovieScores
// ---------------------------------------------------------------------------
describe('getSimilarMovieScores', () => {
  test('returns {} when user has no ratings and no favorites', () => {
    const uid = insertUser('smb1', 'smb1@test.com');
    const scores = getSimilarMovieScores(uid);
    expect(scores).toEqual({});
  });

  test('movieB appears in scores when user rated movieA (A↔B similarity)', () => {
    const uid = insertUser('smb2', 'smb2@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [uid, ids.movieA]);

    const scores = getSimilarMovieScores(uid);
    expect(scores[ids.movieB]).toBeGreaterThan(0);
  });

  test('movieA excluded from scores (already rated)', () => {
    const uid = insertUser('smb3', 'smb3@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [uid, ids.movieA]);

    const scores = getSimilarMovieScores(uid);
    expect(scores[ids.movieA]).toBeUndefined();
  });

  test('score for movieB is > 0 and <= 1', () => {
    const uid = insertUser('smb4', 'smb4@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [uid, ids.movieA]);

    const scores = getSimilarMovieScores(uid);
    expect(scores[ids.movieB]).toBeGreaterThan(0);
    expect(scores[ids.movieB]).toBeLessThanOrEqual(1);
  });
});
