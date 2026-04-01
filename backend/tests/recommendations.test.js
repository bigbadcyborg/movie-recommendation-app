jest.mock('../src/db/database');
const { __resetDb } = require('../src/db/database');
const { setupTestDb } = require('./setupDb');
const { seedTestData } = require('./helpers/seed');
const request = require('supertest');
const app = require('./testApp');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../src/middleware/auth');

let db;
let ids;

beforeAll(async () => {
  db = await setupTestDb();
  __resetDb(db);
  ids = await seedTestData(db);
});

afterAll(() => {
  if (db) db.close();
});

function createUser(username, email) {
  const hash = bcrypt.hashSync('Password123', 10);
  db.run('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, 0)',
    [username, email, hash]);
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const uid = stmt.getAsObject().id;
  stmt.free();
  const token = generateToken({ id: uid, username, email, is_admin: 0 });
  return { id: uid, token };
}

// ---------------------------------------------------------------------------
// GET /api/recommendations
// ---------------------------------------------------------------------------
describe('GET /api/recommendations', () => {
  test('401 without token', async () => {
    const res = await request(app).get('/api/recommendations');
    expect(res.status).toBe(401);
  });

  test('new user with no activity returns empty array', async () => {
    const u = createUser('recnewuser', 'recnew@test.com');
    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('after rating movieA, recommendations do not include movieA', async () => {
    const u = createUser('recuser1', 'recuser1@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [u.id, ids.movieA]);

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    const returnedIds = res.body.map(m => m.id);
    expect(returnedIds).not.toContain(ids.movieA);
  });

  test('each result has recommendationScore (number) and explanation (string)', async () => {
    const u = createUser('recuser2', 'recuser2@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [u.id, ids.movieA]);

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      for (const rec of res.body) {
        expect(typeof rec.recommendationScore).toBe('number');
        expect(typeof rec.explanation).toBe('string');
        expect(rec.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  test('after rating movieA (similar to movieB), movieB appears in recommendations', async () => {
    const u = createUser('recuser3', 'recuser3@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [u.id, ids.movieA]);

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    const returnedIds = res.body.map(m => m.id);
    expect(returnedIds).toContain(ids.movieB);
  });

  test('?limit=1 returns at most 1 result', async () => {
    const u = createUser('recuser4', 'recuser4@test.com');
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [u.id, ids.movieA]);

    const res = await request(app)
      .get('/api/recommendations?limit=1')
      .set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });

  test('collaborative: userY gets movieC recommended because userX rated both movieA and movieC', async () => {
    const userX = createUser('collabX', 'collabx@test.com');
    const userY = createUser('collabY', 'collaBy@test.com');

    // Both rate movieA with 5 (creates cosine similarity)
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [userX.id, ids.movieA]);
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [userY.id, ids.movieA]);

    // userX also rates movieC with 5
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
      [userX.id, ids.movieC]);

    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${userY.token}`);
    expect(res.status).toBe(200);
    const returnedIds = res.body.map(m => m.id);
    expect(returnedIds).toContain(ids.movieC);
  });
});
