const express = require('express');
const { getOne, getAll, runQuery } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const STARTER_COUNT = 5;
const MAX_GENRES = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function enrichMovieRow(movie) {
  if (!movie || movie.id == null) {
    throw new Error('Invalid movie row');
  }
  const id = Number(movie.id);
  const genres = getAll(
    'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
    [id]
  );
  const avgRow = getOne('SELECT AVG(rating) as avg FROM ratings WHERE movie_id = ?', [id]);
  return {
    ...movie,
    id,
    avg_rating: avgRow && avgRow.avg ? Math.round(avgRow.avg * 10) / 10 : null,
    genres: genres.map((g) => g.name),
  };
}

router.get('/starter-movies', authenticateToken, (req, res) => {
  try {
    const userId = Number(req.user.id);
    const row = getOne('SELECT onboarding_completed FROM users WHERE id = ?', [userId]);
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (row.onboarding_completed) {
      return res.status(400).json({ error: 'Onboarding already completed' });
    }

    const genresParam = req.query.genres;
    if (!genresParam || !String(genresParam).trim()) {
      return res.status(400).json({ error: 'genres query parameter is required' });
    }

    const genreNames = String(genresParam)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (genreNames.length === 0) {
      return res.status(400).json({ error: 'Select at least one genre' });
    }

    const placeholders = genreNames.map(() => '?').join(',');
    const genreRows = getAll(`SELECT id FROM genres WHERE name IN (${placeholders})`, genreNames);
    if (genreRows.length === 0) {
      return res.status(400).json({ error: 'No valid genres' });
    }

    const genreIds = genreRows.map((g) => Number(g.id));
    const inPh = genreIds.map(() => '?').join(',');

    const primary = getAll(
      `
      SELECT DISTINCT m.id
      FROM movies m
      JOIN movie_genres mg ON m.id = mg.movie_id
      WHERE mg.genre_id IN (${inPh})
    `,
      genreIds
    );
    const primaryIds = new Set(primary.map((r) => Number(r.id)));

    const allRows = getAll('SELECT id FROM movies');
    const allIds = allRows.map((r) => Number(r.id));
    const restIds = allIds.filter((id) => !primaryIds.has(id));

    const ordered = [...shuffle([...primaryIds]), ...shuffle(restIds)];
    const unique = [...new Set(ordered)];
    const pickedIds = unique.slice(0, STARTER_COUNT);

    if (pickedIds.length < STARTER_COUNT) {
      return res.status(400).json({ error: 'Not enough movies in the catalog to start onboarding' });
    }

    const movies = [];
    for (const rawId of pickedIds) {
      const id = Number(rawId);
      const movie = getOne('SELECT * FROM movies WHERE id = ?', [id]);
      if (!movie) {
        console.error('Starter movies: missing movie id', id);
        return res.status(500).json({
          error:
            'Could not load starter movies (catalog mismatch). Try restarting the server or run: cd backend && npm run seed',
        });
      }
      movies.push(enrichMovieRow(movie));
    }

    res.json({ movies });
  } catch (err) {
    console.error('Starter movies error:', err);
    const msg = err && err.message;
    const isSchema =
      typeof msg === 'string' &&
      (msg.includes('no such column') || msg.includes('onboarding_completed'));
    res.status(500).json({
      error: isSchema
        ? 'Database needs an update. Stop the server, delete backend/data/movies.db, then run: cd backend && npm run seed && npm run dev'
        : msg && msg !== 'Database not initialized'
          ? 'Could not load starter movies. Restart the backend (cd backend && npm run dev).'
          : 'Could not load starter movies. Is the backend running on port 3001?',
    });
  }
});

router.post('/complete', authenticateToken, (req, res) => {
  try {
    const userId = Number(req.user.id);
    const userRow = getOne('SELECT onboarding_completed FROM users WHERE id = ?', [userId]);
    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (userRow.onboarding_completed) {
      return res.status(400).json({ error: 'Onboarding already completed' });
    }

    const { preferredGenres, ratings } = req.body;

    if (!Array.isArray(preferredGenres) || preferredGenres.length === 0) {
      return res.status(400).json({ error: 'Select at least one genre' });
    }
    if (preferredGenres.length > MAX_GENRES) {
      return res.status(400).json({ error: `Choose at most ${MAX_GENRES} genres` });
    }

    if (!Array.isArray(ratings) || ratings.length !== STARTER_COUNT) {
      return res.status(400).json({ error: `Submit exactly ${STARTER_COUNT} ratings` });
    }

    const validGenres = new Set(getAll('SELECT name FROM genres').map((g) => g.name));
    for (const name of preferredGenres) {
      if (!validGenres.has(name)) {
        return res.status(400).json({ error: `Invalid genre: ${name}` });
      }
    }

    const movieIdsRated = new Set();
    for (const r of ratings) {
      const movieId = r.movieId;
      const rating = r.rating;
      if (!movieId || rating === undefined) {
        return res.status(400).json({ error: 'Each rating needs movieId and rating' });
      }
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      if (movieIdsRated.has(movieId)) {
        return res.status(400).json({ error: 'Duplicate movie in ratings' });
      }
      movieIdsRated.add(movieId);
    }

    for (const movieId of movieIdsRated) {
      const movie = getOne('SELECT id FROM movies WHERE id = ?', [movieId]);
      if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
      }
      const movieGenres = getAll(
        'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
        [movieId]
      ).map((g) => g.name);
      const overlap = movieGenres.some((g) => preferredGenres.includes(g));
      if (!overlap) {
        return res.status(400).json({
          error: 'Each rated movie must share at least one genre with your selections',
        });
      }
    }

    runQuery('UPDATE users SET preferred_genres = ?, onboarding_completed = 1 WHERE id = ?', [
      JSON.stringify(preferredGenres),
      userId,
    ]);

    for (const r of ratings) {
      const existing = getOne('SELECT id FROM ratings WHERE user_id = ? AND movie_id = ?', [
        userId,
        r.movieId,
      ]);
      if (existing) {
        runQuery('UPDATE ratings SET rating = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [
          r.rating,
          existing.id,
        ]);
      } else {
        runQuery('INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)', [
          userId,
          r.movieId,
          r.rating,
        ]);
      }
      runQuery('INSERT INTO interaction_logs (user_id, movie_id, action_type) VALUES (?, ?, ?)', [
        userId,
        r.movieId,
        'rate',
      ]);
    }

    const user = getOne(
      'SELECT id, username, email, preferred_genres, is_admin, created_at, onboarding_completed FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: !!user.is_admin,
        preferredGenres: JSON.parse(user.preferred_genres || '[]'),
        onboardingCompleted: !!user.onboarding_completed,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    const msg = err && err.message;
    const isSchema =
      typeof msg === 'string' &&
      (msg.includes('no such column') || msg.includes('onboarding'));
    res.status(500).json({
      error: isSchema
        ? 'Database needs an update. Stop the server, delete backend/data/movies.db, then run: cd backend && npm run seed && npm run dev'
        : 'Could not save onboarding. Restart the backend and try again.',
    });
  }
});

module.exports = router;
