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
// A second user used in some tests to avoid cross-test pollution
let user2Token;
let user2Id;

beforeAll(async () => {
  db = await setupTestDb();
  __resetDb(db);
  ids = await seedTestData(db);

  // Insert a second regular user for isolation
  const hash = bcrypt.hashSync('Password123', 10);
  db.run(
    "INSERT INTO users (username, email, password_hash, is_admin) VALUES ('testuser2', 'test2@test.com', ?, 0)",
    [hash]
  );
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  user2Id = stmt.getAsObject().id;
  stmt.free();
  user2Token = generateToken({ id: user2Id, username: 'testuser2', email: 'test2@test.com', is_admin: 0 });

  // Pre-rate movieA with 5 stars using user2 so avgRating tests are meaningful
  db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 5)',
    [user2Id, ids.movieA]);
});

afterAll(() => {
  if (db) db.close();
});

// ---------------------------------------------------------------------------
// POST /api/interactions/rate
// ---------------------------------------------------------------------------
describe('POST /api/interactions/rate', () => {
  afterEach(() => {
    // Clean up any rating inserted by testuser for movieA after each test
    db.run('DELETE FROM ratings WHERE user_id = ? AND movie_id = ?', [ids.userId, ids.movieA]);
  });

  test('200 + { rating, avgRating } when rating a movie', async () => {
    const res = await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA, rating: 4 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rating', 4);
    expect(res.body).toHaveProperty('avgRating');
    expect(typeof res.body.avgRating).toBe('number');
  });

  test('re-rating same movie updates rating', async () => {
    await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA, rating: 4 });

    const res = await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA, rating: 3 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(3);
  });

  test('400 when rating is 0', async () => {
    const res = await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA, rating: 0 });
    expect(res.status).toBe(400);
  });

  test('400 when rating is 6', async () => {
    const res = await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA, rating: 6 });
    expect(res.status).toBe(400);
  });

  test('400 when movieId missing', async () => {
    const res = await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ rating: 4 });
    expect(res.status).toBe(400);
  });

  test('404 when movieId is 99999', async () => {
    const res = await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: 99999, rating: 4 });
    expect(res.status).toBe(404);
  });

  test('401 without token', async () => {
    const res = await request(app)
      .post('/api/interactions/rate')
      .send({ movieId: ids.movieA, rating: 4 });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/interactions/favorite
// ---------------------------------------------------------------------------
describe('POST /api/interactions/favorite', () => {
  beforeEach(() => {
    // Ensure no existing favorite for testuser on movieB before each test
    db.run('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?', [ids.userId, ids.movieB]);
  });

  test('first call returns { isFavorite: true }', async () => {
    const res = await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieB });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isFavorite', true);
  });

  test('second call on same movie returns { isFavorite: false }', async () => {
    // First add
    await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieB });

    // Then remove
    const res = await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieB });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isFavorite', false);
  });

  test('400 when movieId missing', async () => {
    const res = await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('404 when movieId is 99999', async () => {
    const res = await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: 99999 });
    expect(res.status).toBe(404);
  });

  test('401 without token', async () => {
    const res = await request(app)
      .post('/api/interactions/favorite')
      .send({ movieId: ids.movieB });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/interactions/comment
// ---------------------------------------------------------------------------
describe('POST /api/interactions/comment', () => {
  test('201 + comment object with username on success', async () => {
    const res = await request(app)
      .post('/api/interactions/comment')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA, text: 'Great movie!' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('username');
    expect(res.body).toHaveProperty('comment_text', 'Great movie!');
  });

  test('400 when text missing', async () => {
    const res = await request(app)
      .post('/api/interactions/comment')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA });
    expect(res.status).toBe(400);
  });

  test('400 when text is whitespace only', async () => {
    const res = await request(app)
      .post('/api/interactions/comment')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: ids.movieA, text: '   ' });
    expect(res.status).toBe(400);
  });

  test('404 when movieId is 99999', async () => {
    const res = await request(app)
      .post('/api/interactions/comment')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ movieId: 99999, text: 'Great movie!' });
    expect(res.status).toBe(404);
  });

  test('401 without token', async () => {
    const res = await request(app)
      .post('/api/interactions/comment')
      .send({ movieId: ids.movieA, text: 'Hello' });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/interactions/comment/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/interactions/comment/:id', () => {
  let commentId;

  beforeEach(() => {
    // Insert a fresh comment as testuser on movieC
    db.run('INSERT INTO comments (user_id, movie_id, comment_text) VALUES (?, ?, ?)',
      [ids.userId, ids.movieC, 'Test comment']);
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    commentId = stmt.getAsObject().id;
    stmt.free();
  });

  test('200 when owner deletes their own comment', async () => {
    const res = await request(app)
      .delete(`/api/interactions/comment/${commentId}`)
      .set('Authorization', `Bearer ${ids.userToken}`);
    expect(res.status).toBe(200);
  });

  test('403 when another user tries to delete the comment', async () => {
    const res = await request(app)
      .delete(`/api/interactions/comment/${commentId}`)
      .set('Authorization', `Bearer ${ids.adminToken}`);
    expect(res.status).toBe(403);
  });

  test('404 for nonexistent comment', async () => {
    const res = await request(app)
      .delete('/api/interactions/comment/99999')
      .set('Authorization', `Bearer ${ids.userToken}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/interactions/favorites
// ---------------------------------------------------------------------------
describe('GET /api/interactions/favorites', () => {
  test('returns empty array for user with no favorites', async () => {
    // user2 has no favorites
    const res = await request(app)
      .get('/api/interactions/favorites')
      .set('Authorization', `Bearer ${user2Token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('after favoriting movieA, returns array containing it with genres', async () => {
    // Use a clean user
    const hash = bcrypt.hashSync('Password123', 10);
    db.run("INSERT INTO users (username, email, password_hash) VALUES ('favtestuser', 'favtest@test.com', ?)", [hash]);
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const uid = stmt.getAsObject().id;
    stmt.free();
    const token = generateToken({ id: uid, username: 'favtestuser', email: 'favtest@test.com', is_admin: 0 });

    await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: ids.movieA });

    const res = await request(app)
      .get('/api/interactions/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const movie = res.body.find(m => m.id === ids.movieA);
    expect(movie).toBeDefined();
    expect(movie).toHaveProperty('genres');
  });

  test('401 without token', async () => {
    const res = await request(app).get('/api/interactions/favorites');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/interactions/ratings
// ---------------------------------------------------------------------------
describe('GET /api/interactions/ratings', () => {
  test('returns empty array for user with no ratings', async () => {
    const hash = bcrypt.hashSync('Password123', 10);
    db.run("INSERT INTO users (username, email, password_hash) VALUES ('ratingtestuser', 'ratingtest@test.com', ?)", [hash]);
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const uid = stmt.getAsObject().id;
    stmt.free();
    const token = generateToken({ id: uid, username: 'ratingtestuser', email: 'ratingtest@test.com', is_admin: 0 });

    const res = await request(app)
      .get('/api/interactions/ratings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('after rating movieA with 5, returns array containing it with rating field', async () => {
    const hash = bcrypt.hashSync('Password123', 10);
    db.run("INSERT INTO users (username, email, password_hash) VALUES ('ratingtestuser2', 'ratingtest2@test.com', ?)", [hash]);
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const uid = stmt.getAsObject().id;
    stmt.free();
    const token = generateToken({ id: uid, username: 'ratingtestuser2', email: 'ratingtest2@test.com', is_admin: 0 });

    await request(app)
      .post('/api/interactions/rate')
      .set('Authorization', `Bearer ${token}`)
      .send({ movieId: ids.movieA, rating: 5 });

    const res = await request(app)
      .get('/api/interactions/ratings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const entry = res.body.find(m => m.id === ids.movieA);
    expect(entry).toBeDefined();
    expect(entry).toHaveProperty('rating', 5);
  });

  test('401 without token', async () => {
    const res = await request(app).get('/api/interactions/ratings');
    expect(res.status).toBe(401);
  });
});
