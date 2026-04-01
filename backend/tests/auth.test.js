jest.mock('../src/db/database');
const { __resetDb } = require('../src/db/database');
const { setupTestDb } = require('./setupDb');
const { seedTestData } = require('./helpers/seed');
const request = require('supertest');
const app = require('./testApp');

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

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  test('201 + token + user on valid new registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', email: 'newuser@test.com', password: 'NewPass1' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.username).toBe('newuser');
  });

  test('400 when username missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@test.com', password: 'NewPass1' });
    expect(res.status).toBe(400);
  });

  test('400 when email missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'someuser', password: 'NewPass1' });
    expect(res.status).toBe(400);
  });

  test('400 when password missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'someuser', email: 'some@test.com' });
    expect(res.status).toBe(400);
  });

  test('400 when password < 8 chars', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'someuser2', email: 'some2@test.com', password: 'Pass1' });
    expect(res.status).toBe(400);
  });

  test('400 when password has no uppercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'someuser3', email: 'some3@test.com', password: 'password1' });
    expect(res.status).toBe(400);
  });

  test('400 when password has no number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'someuser4', email: 'some4@test.com', password: 'Password' });
    expect(res.status).toBe(400);
  });

  test('409 when username already taken', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'unique@test.com', password: 'NewPass1' });
    expect(res.status).toBe(409);
  });

  test('409 when email already taken', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'uniqueuser', email: 'test@test.com', password: 'NewPass1' });
    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  test('200 + token when logging in with username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'testuser', password: 'Password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('200 + token when logging in with email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'test@test.com', password: 'Password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'testuser', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  test('401 on nonexistent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'nobody', password: 'Password123' });
    expect(res.status).toBe(401);
  });

  test('400 when login field missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password123' });
    expect(res.status).toBe(400);
  });

  test('400 when password field missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'testuser' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe('GET /api/auth/me', () => {
  test('200 + profile with stats object using valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ids.userToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('favorites');
    expect(res.body.stats).toHaveProperty('ratings');
    expect(res.body.stats).toHaveProperty('comments');
  });

  test('401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('403 with invalid token string', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/auth/me
// ---------------------------------------------------------------------------
describe('PUT /api/auth/me', () => {
  test('200 when updating preferredGenres', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ preferredGenres: ['Action', 'Drama'] });
    expect(res.status).toBe(200);
    expect(res.body.preferredGenres).toEqual(expect.arrayContaining(['Action', 'Drama']));
  });

  test('200 when updating username to a new unique name', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ username: 'testuserUpdated' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('testuserUpdated');
    // reset it back for other tests
    await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ username: 'testuser' });
  });

  test('409 when updating username to one already taken', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ username: 'adminuser' });
    expect(res.status).toBe(409);
  });

  test('400 when body is empty', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
