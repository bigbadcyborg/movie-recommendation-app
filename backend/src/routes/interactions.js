const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate a movie
router.post('/rate', authenticateToken, (req, res) => {
  try {
    const { movieId, rating } = req.body;

    if (!movieId || rating === undefined) {
      return res.status(400).json({ error: 'movieId and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const movie = getOne('SELECT id FROM movies WHERE id = ?', [movieId]);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const existing = getOne('SELECT id FROM ratings WHERE user_id = ? AND movie_id = ?', [req.user.id, movieId]);

    if (existing) {
      runQuery('UPDATE ratings SET rating = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [rating, existing.id]);
    } else {
      runQuery('INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)', [req.user.id, movieId, rating]);
    }

    runQuery('INSERT INTO interaction_logs (user_id, movie_id, action_type) VALUES (?, ?, ?)',
      [req.user.id, movieId, 'rate']);

    const avgRating = getOne('SELECT AVG(rating) as avg FROM ratings WHERE movie_id = ?', [movieId]);

    res.json({
      rating,
      avgRating: avgRating.avg ? Math.round(avgRating.avg * 10) / 10 : null
    });
  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle favorite
router.post('/favorite', authenticateToken, (req, res) => {
  try {
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ error: 'movieId is required' });
    }

    const movie = getOne('SELECT id FROM movies WHERE id = ?', [movieId]);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const existing = getOne('SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?', [req.user.id, movieId]);

    if (existing) {
      runQuery('DELETE FROM favorites WHERE id = ?', [existing.id]);
      runQuery('INSERT INTO interaction_logs (user_id, movie_id, action_type) VALUES (?, ?, ?)',
        [req.user.id, movieId, 'unfavorite']);
      res.json({ isFavorite: false });
    } else {
      runQuery('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [req.user.id, movieId]);
      runQuery('INSERT INTO interaction_logs (user_id, movie_id, action_type) VALUES (?, ?, ?)',
        [req.user.id, movieId, 'favorite']);
      res.json({ isFavorite: true });
    }
  } catch (err) {
    console.error('Favorite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment
router.post('/comment', authenticateToken, (req, res) => {
  try {
    const { movieId, text } = req.body;

    if (!movieId || !text || !text.trim()) {
      return res.status(400).json({ error: 'movieId and text are required' });
    }

    const movie = getOne('SELECT id FROM movies WHERE id = ?', [movieId]);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    runQuery('INSERT INTO comments (user_id, movie_id, comment_text) VALUES (?, ?, ?)',
      [req.user.id, movieId, text.trim()]);

    const id = getLastInsertId();
    const comment = getOne(`
      SELECT c.*, u.username
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);

    runQuery('INSERT INTO interaction_logs (user_id, movie_id, action_type) VALUES (?, ?, ?)',
      [req.user.id, movieId, 'comment']);

    res.status(201).json(comment);
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment
router.delete('/comment/:id', authenticateToken, (req, res) => {
  try {
    const comment = getOne('SELECT * FROM comments WHERE id = ?', [req.params.id]);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    runQuery('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user favorites
router.get('/favorites', authenticateToken, (req, res) => {
  try {
    const favorites = getAll(`
      SELECT m.*,
        (SELECT AVG(r.rating) FROM ratings r WHERE r.movie_id = m.id) as avg_rating,
        f.added_at
      FROM favorites f
      JOIN movies m ON f.movie_id = m.id
      WHERE f.user_id = ?
      ORDER BY f.added_at DESC
    `, [req.user.id]);

    const favoritesWithGenres = favorites.map(movie => {
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

    res.json(favoritesWithGenres);
  } catch (err) {
    console.error('Favorites error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user ratings
router.get('/ratings', authenticateToken, (req, res) => {
  try {
    const ratings = getAll(`
      SELECT m.*, r.rating, r.created_at as rated_at,
        (SELECT AVG(r2.rating) FROM ratings r2 WHERE r2.movie_id = m.id) as avg_rating
      FROM ratings r
      JOIN movies m ON r.movie_id = m.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    const ratingsWithGenres = ratings.map(movie => {
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

    res.json(ratingsWithGenres);
  } catch (err) {
    console.error('Ratings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
