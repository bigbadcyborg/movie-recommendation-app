const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const { optionalAuth, authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, (req, res) => {
  try {
    const { search, genre, year_min, year_max, min_rating, sort, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    if (search) {
      where.push('(m.title LIKE ? OR m.director LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (genre) {
      where.push('m.id IN (SELECT mg.movie_id FROM movie_genres mg JOIN genres g ON mg.genre_id = g.id WHERE g.name = ?)');
      params.push(genre);
    }

    if (year_min) {
      where.push('m.release_year >= ?');
      params.push(parseInt(year_min));
    }

    if (year_max) {
      where.push('m.release_year <= ?');
      params.push(parseInt(year_max));
    }

    if (min_rating) {
      where.push('(SELECT AVG(r.rating) FROM ratings r WHERE r.movie_id = m.id) >= ?');
      params.push(parseFloat(min_rating));
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    let orderBy = 'm.release_year DESC';
    if (sort === 'title') orderBy = 'm.title ASC';
    else if (sort === 'year_asc') orderBy = 'm.release_year ASC';
    else if (sort === 'rating') orderBy = 'avg_rating DESC';

    const countResult = getOne(`SELECT COUNT(*) as total FROM movies m ${whereClause}`, params);

    const movies = getAll(`
      SELECT m.*,
        (SELECT AVG(r.rating) FROM ratings r WHERE r.movie_id = m.id) as avg_rating,
        (SELECT COUNT(r.id) FROM ratings r WHERE r.movie_id = m.id) as rating_count
      FROM movies m
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const moviesWithGenres = movies.map(movie => {
      const genres = getAll(
        'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
        [movie.id]
      );
      return {
        ...movie,
        avg_rating: movie.avg_rating ? Math.round(movie.avg_rating * 10) / 10 : null,
        genres: genres.map(g => g.name)
      };
    });

    res.json({
      movies: moviesWithGenres,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Movies list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/genres', (req, res) => {
  try {
    const genres = getAll('SELECT * FROM genres ORDER BY name');
    res.json(genres);
  } catch (err) {
    console.error('Genres error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/popular', (req, res) => {
  try {
    const movies = getAll(`
      SELECT m.*,
        (SELECT AVG(r.rating) FROM ratings r WHERE r.movie_id = m.id) as avg_rating,
        (SELECT COUNT(r.id) FROM ratings r WHERE r.movie_id = m.id) as rating_count,
        (SELECT COUNT(f.id) FROM favorites f WHERE f.movie_id = m.id) as favorite_count
      FROM movies m
      ORDER BY (COALESCE((SELECT AVG(r.rating) FROM ratings r WHERE r.movie_id = m.id), 0) * 0.6 +
                COALESCE((SELECT COUNT(f.id) FROM favorites f WHERE f.movie_id = m.id), 0) * 0.4) DESC
      LIMIT 10
    `);

    const moviesWithGenres = movies.map(movie => {
      const genres = getAll(
        'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
        [movie.id]
      );
      return {
        ...movie,
        avg_rating: movie.avg_rating ? Math.round(movie.avg_rating * 10) / 10 : null,
        genres: genres.map(g => g.name)
      };
    });

    res.json(moviesWithGenres);
  } catch (err) {
    console.error('Popular movies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const movie = getOne(`
      SELECT m.*,
        (SELECT AVG(r.rating) FROM ratings r WHERE r.movie_id = m.id) as avg_rating,
        (SELECT COUNT(r.id) FROM ratings r WHERE r.movie_id = m.id) as rating_count
      FROM movies m WHERE m.id = ?
    `, [req.params.id]);

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const genres = getAll(
      'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
      [movie.id]
    );

    const comments = getAll(`
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.movie_id = ?
      ORDER BY c.created_at DESC
    `, [movie.id]);

    let userRating = null;
    let isFavorite = false;

    if (req.user) {
      const rating = getOne('SELECT rating FROM ratings WHERE user_id = ? AND movie_id = ?', [req.user.id, movie.id]);
      userRating = rating ? rating.rating : null;
      const fav = getOne('SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?', [req.user.id, movie.id]);
      isFavorite = !!fav;
    }

    res.json({
      ...movie,
      avg_rating: movie.avg_rating ? Math.round(movie.avg_rating * 10) / 10 : null,
      genres: genres.map(g => g.name),
      comments,
      userRating,
      isFavorite
    });
  } catch (err) {
    console.error('Movie detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, director, release_year, duration, description, poster_url, genres } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const existing = getOne('SELECT id FROM movies WHERE title = ?', [title]);
    if (existing) {
      return res.status(409).json({ error: 'A movie with this title already exists' });
    }

    runQuery(
      'INSERT INTO movies (title, director, release_year, duration, description, poster_url) VALUES (?, ?, ?, ?, ?, ?)',
      [title, director || null, release_year ? parseInt(release_year) : null, duration ? parseInt(duration) : null, description || null, poster_url || null]
    );

    const movie = getOne('SELECT * FROM movies WHERE title = ?', [title]);

    if (Array.isArray(genres) && genres.length > 0) {
      for (const genreName of genres) {
        const genre = getOne('SELECT id FROM genres WHERE name = ?', [genreName]);
        if (genre) {
          runQuery('INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movie.id, genre.id]);
        }
      }
    }

    const movieGenres = getAll(
      'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
      [movie.id]
    );

    res.status(201).json({
      ...movie,
      genres: movieGenres.map(g => g.name)
    });
  } catch (err) {
    console.error('Add movie error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
