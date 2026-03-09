const express = require('express');
const { getOne, getAll, runQuery } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function getContentBasedScores(userId) {
  const userRatings = getAll(
    'SELECT movie_id, rating FROM ratings WHERE user_id = ? AND rating >= 3',
    [userId]
  );
  const userFavorites = getAll('SELECT movie_id FROM favorites WHERE user_id = ?', [userId]);

  const likedMovieIds = new Set([
    ...userRatings.map(r => r.movie_id),
    ...userFavorites.map(f => f.movie_id)
  ]);

  if (likedMovieIds.size === 0) return {};

  const genreCounts = {};
  let totalGenreHits = 0;

  for (const movieId of likedMovieIds) {
    const genres = getAll(
      'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
      [movieId]
    );
    const ratingEntry = userRatings.find(r => r.movie_id === movieId);
    const weight = ratingEntry ? ratingEntry.rating / 5 : 0.8;

    for (const g of genres) {
      genreCounts[g.name] = (genreCounts[g.name] || 0) + weight;
      totalGenreHits += weight;
    }
  }

  const user = getOne('SELECT preferred_genres FROM users WHERE id = ?', [userId]);
  const preferredGenres = JSON.parse(user.preferred_genres || '[]');
  for (const g of preferredGenres) {
    genreCounts[g] = (genreCounts[g] || 0) + 0.5;
    totalGenreHits += 0.5;
  }

  const allMovies = getAll('SELECT id FROM movies');
  const scores = {};

  for (const movie of allMovies) {
    if (likedMovieIds.has(movie.id)) continue;

    const movieGenres = getAll(
      'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
      [movie.id]
    );

    let score = 0;
    for (const g of movieGenres) {
      score += (genreCounts[g.name] || 0) / totalGenreHits;
    }
    if (movieGenres.length > 0) {
      score = score / movieGenres.length;
    }

    scores[movie.id] = score;
  }

  return scores;
}

function getCollaborativeScores(userId) {
  const userRatings = getAll('SELECT movie_id, rating FROM ratings WHERE user_id = ?', [userId]);
  if (userRatings.length === 0) return {};

  const userRatingMap = {};
  for (const r of userRatings) {
    userRatingMap[r.movie_id] = r.rating;
  }

  const otherUsers = getAll('SELECT DISTINCT user_id FROM ratings WHERE user_id != ?', [userId]);

  const similarUsers = [];

  for (const other of otherUsers) {
    const otherRatings = getAll('SELECT movie_id, rating FROM ratings WHERE user_id = ?', [other.user_id]);
    const otherMap = {};
    for (const r of otherRatings) {
      otherMap[r.movie_id] = r.rating;
    }

    const commonMovies = Object.keys(userRatingMap).filter(id => otherMap[id] !== undefined);
    if (commonMovies.length < 1) continue;

    let dotProduct = 0, normA = 0, normB = 0;
    for (const movieId of commonMovies) {
      const a = userRatingMap[movieId];
      const b = otherMap[movieId];
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    if (similarity > 0.5) {
      similarUsers.push({ userId: other.user_id, similarity, ratings: otherMap });
    }
  }

  const scores = {};
  const ratedMovies = new Set(Object.keys(userRatingMap).map(Number));

  for (const similar of similarUsers) {
    for (const [movieId, rating] of Object.entries(similar.ratings)) {
      const mid = Number(movieId);
      if (ratedMovies.has(mid)) continue;

      if (!scores[mid]) scores[mid] = { weightedSum: 0, simSum: 0 };
      scores[mid].weightedSum += similar.similarity * rating;
      scores[mid].simSum += similar.similarity;
    }
  }

  const normalizedScores = {};
  for (const [movieId, data] of Object.entries(scores)) {
    normalizedScores[movieId] = (data.weightedSum / data.simSum) / 5;
  }

  return normalizedScores;
}

function generateExplanation(movieId, contentScore, collabScore, genreCounts) {
  const genres = getAll(
    'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
    [movieId]
  );
  const genreNames = genres.map(g => g.name);

  const matchingGenres = genreNames.filter(g => genreCounts[g] > 0);
  const parts = [];

  if (matchingGenres.length > 0) {
    parts.push(`Matches your interest in ${matchingGenres.slice(0, 3).join(', ')}`);
  }

  if (collabScore > 0.3) {
    parts.push('highly rated by users with similar taste');
  } else if (collabScore > 0) {
    parts.push('liked by similar users');
  }

  return parts.length > 0 ? parts.join('; ') : 'Based on popular movies you might enjoy';
}

router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const contentScores = getContentBasedScores(userId);
    const collabScores = getCollaborativeScores(userId);

    const allMovieIds = new Set([
      ...Object.keys(contentScores),
      ...Object.keys(collabScores)
    ]);

    const user = getOne('SELECT preferred_genres FROM users WHERE id = ?', [userId]);
    const userRatings = getAll('SELECT movie_id, rating FROM ratings WHERE user_id = ? AND rating >= 3', [userId]);
    const userFavorites = getAll('SELECT movie_id FROM favorites WHERE user_id = ?', [userId]);
    const likedMovieIds = new Set([
      ...userRatings.map(r => r.movie_id),
      ...userFavorites.map(f => f.movie_id)
    ]);

    const genreCounts = {};
    for (const movieId of likedMovieIds) {
      const genres = getAll(
        'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
        [movieId]
      );
      for (const g of genres) {
        genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
      }
    }
    const preferredGenres = JSON.parse(user.preferred_genres || '[]');
    for (const g of preferredGenres) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }

    const scored = [];
    for (const movieId of allMovieIds) {
      const mid = Number(movieId);
      const cs = contentScores[mid] || 0;
      const cf = collabScores[mid] || 0;
      const finalScore = cs * 0.6 + cf * 0.4;

      if (finalScore > 0.01) {
        scored.push({
          movieId: mid,
          score: Math.round(finalScore * 100) / 100,
          explanation: generateExplanation(mid, cs, cf, genreCounts)
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, limit);

    runQuery('DELETE FROM recommendations WHERE user_id = ?', [userId]);
    for (const rec of topResults) {
      runQuery(
        'INSERT INTO recommendations (user_id, movie_id, score, explanation) VALUES (?, ?, ?, ?)',
        [userId, rec.movieId, rec.score, rec.explanation]
      );
    }

    const recommendations = topResults.map(rec => {
      const movie = getOne(`
        SELECT m.*,
          (SELECT AVG(r.rating) FROM ratings r WHERE r.movie_id = m.id) as avg_rating,
          (SELECT COUNT(r.id) FROM ratings r WHERE r.movie_id = m.id) as rating_count
        FROM movies m WHERE m.id = ?
      `, [rec.movieId]);

      const genres = getAll(
        'SELECT g.name FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?',
        [rec.movieId]
      );

      return {
        ...movie,
        avg_rating: movie.avg_rating ? Math.round(movie.avg_rating * 10) / 10 : null,
        genres: genres.map(g => g.name),
        recommendationScore: rec.score,
        explanation: rec.explanation
      };
    });

    runQuery('INSERT INTO interaction_logs (user_id, action_type) VALUES (?, ?)',
      [userId, 'view_recommendations']);

    res.json(recommendations);
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
