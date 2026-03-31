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
// GET /api/movies
// ---------------------------------------------------------------------------
describe('GET /api/movies', () => {
  test('returns object with movies array and pagination object', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('movies');
    expect(Array.isArray(res.body.movies)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  test('pagination has page, limit, total, pages fields', async () => {
    const res = await request(app).get('/api/movies');
    const p = res.body.pagination;
    expect(p).toHaveProperty('page');
    expect(p).toHaveProperty('limit');
    expect(p).toHaveProperty('total');
    expect(p).toHaveProperty('pages');
  });

  test('search returns only matching movie', async () => {
    const res = await request(app).get('/api/movies?search=Test+Movie+A');
    expect(res.status).toBe(200);
    expect(res.body.movies.length).toBe(1);
    expect(res.body.movies[0].title).toBe('Test Movie A');
  });

  test('genre filter returns only Action movies', async () => {
    const res = await request(app).get('/api/movies?genre=Action');
    expect(res.status).toBe(200);
    const titles = res.body.movies.map(m => m.title);
    // movieA (Action+SciFi) and movieB (Action) should appear
    expect(titles).toContain('Test Movie A');
    expect(titles).toContain('Test Movie B');
    // Drama-only movie should not appear
    expect(titles).not.toContain('Test Movie C');
  });

  test('year_min=2019 excludes movies before 2019', async () => {
    const res = await request(app).get('/api/movies?year_min=2019');
    expect(res.status).toBe(200);
    for (const m of res.body.movies) {
      expect(m.release_year).toBeGreaterThanOrEqual(2019);
    }
  });

  test('year_max=2019 excludes movies after 2019', async () => {
    const res = await request(app).get('/api/movies?year_max=2019');
    expect(res.status).toBe(200);
    for (const m of res.body.movies) {
      expect(m.release_year).toBeLessThanOrEqual(2019);
    }
  });

  test('sort=title returns alphabetical order', async () => {
    const res = await request(app).get('/api/movies?sort=title');
    expect(res.status).toBe(200);
    const titles = res.body.movies.map(m => m.title);
    if (titles.length >= 2) {
      expect(titles[0] <= titles[1]).toBe(true);
    }
  });

  test('sort=rating works without error', async () => {
    const res = await request(app).get('/api/movies?sort=rating');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/movies/genres
// ---------------------------------------------------------------------------
describe('GET /api/movies/genres', () => {
  test('returns array containing objects with name field', async () => {
    const res = await request(app).get('/api/movies/genres');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('name');
  });

  test('includes Action, Drama, Sci-Fi', async () => {
    const res = await request(app).get('/api/movies/genres');
    const names = res.body.map(g => g.name);
    expect(names).toContain('Action');
    expect(names).toContain('Drama');
    expect(names).toContain('Sci-Fi');
  });
});

// ---------------------------------------------------------------------------
// GET /api/movies/popular
// ---------------------------------------------------------------------------
describe('GET /api/movies/popular', () => {
  test('returns an array', async () => {
    const res = await request(app).get('/api/movies/popular');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('length <= 10', async () => {
    const res = await request(app).get('/api/movies/popular');
    expect(res.body.length).toBeLessThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// GET /api/movies/:id
// ---------------------------------------------------------------------------
describe('GET /api/movies/:id', () => {
  test('returns movie object with genres and comments arrays', async () => {
    const res = await request(app).get(`/api/movies/${ids.movieA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('genres');
    expect(Array.isArray(res.body.genres)).toBe(true);
    expect(res.body).toHaveProperty('comments');
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  test('userRating is null and isFavorite is false when unauthenticated', async () => {
    const res = await request(app).get(`/api/movies/${ids.movieA}`);
    expect(res.body.userRating).toBeNull();
    expect(res.body.isFavorite).toBe(false);
  });

  test('userRating is 4 when authenticated user has rated movieA with 4', async () => {
    // insert rating directly
    db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)',
      [ids.userId, ids.movieA, 4]);

    const res = await request(app)
      .get(`/api/movies/${ids.movieA}`)
      .set('Authorization', `Bearer ${ids.userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.userRating).toBe(4);

    // clean up
    db.run('DELETE FROM ratings WHERE user_id = ? AND movie_id = ?', [ids.userId, ids.movieA]);
  });

  test('isFavorite is true when authenticated user has favorited movieA', async () => {
    db.run('INSERT OR IGNORE INTO favorites (user_id, movie_id) VALUES (?, ?)', [ids.userId, ids.movieA]);

    const res = await request(app)
      .get(`/api/movies/${ids.movieA}`)
      .set('Authorization', `Bearer ${ids.userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isFavorite).toBe(true);

    db.run('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?', [ids.userId, ids.movieA]);
  });

  test('404 for nonexistent id', async () => {
    const res = await request(app).get('/api/movies/99999');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/movies/:id/similar
// ---------------------------------------------------------------------------
describe('GET /api/movies/:id/similar', () => {
  test('returns movieB as similar to movieA', async () => {
    const res = await request(app).get(`/api/movies/${ids.movieA}/similar`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const titles = res.body.map(m => m.title);
    expect(titles).toContain('Test Movie B');
  });

  test('404 for nonexistent id', async () => {
    const res = await request(app).get('/api/movies/99999/similar');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/movies
// ---------------------------------------------------------------------------
describe('POST /api/movies', () => {
  test('201 with genres array when admin posts valid new movie', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set('Authorization', `Bearer ${ids.adminToken}`)
      .send({ title: 'New Admin Movie', genres: ['Action'] });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('genres');
    expect(Array.isArray(res.body.genres)).toBe(true);
    expect(res.body).toHaveProperty('similar_movies');
  });

  test('403 when regular user posts', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set('Authorization', `Bearer ${ids.userToken}`)
      .send({ title: 'Should Fail Movie' });
    expect(res.status).toBe(403);
  });

  test('401 when no token', async () => {
    const res = await request(app)
      .post('/api/movies')
      .send({ title: 'Should Also Fail' });
    expect(res.status).toBe(401);
  });

  test('400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set('Authorization', `Bearer ${ids.adminToken}`)
      .send({ director: 'Someone' });
    expect(res.status).toBe(400);
  });

  test('409 when title already exists', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set('Authorization', `Bearer ${ids.adminToken}`)
      .send({ title: 'Test Movie A' });
    expect(res.status).toBe(409);
  });
});
