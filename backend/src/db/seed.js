const { initializeSchema } = require('./schema');
const { runQuery, getOne, getAll, saveDb } = require('./database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

// Load MOVIES and SIMILAR_PAIRS from JSON files
const MOVIES = JSON.parse(fs.readFileSync(path.join(__dirname, 'movies.json'), 'utf8'));
const SIMILAR_PAIRS = JSON.parse(fs.readFileSync(path.join(__dirname, 'similarities.json'), 'utf8'));



function parseArgs(argv) {
  return {
    force: argv.includes('--force')
  };
}

function resetSeededData() {
  runQuery('DELETE FROM movie_similarities');
  runQuery('DELETE FROM recommendations');
  runQuery('DELETE FROM ratings');
  runQuery('DELETE FROM favorites');
  runQuery('DELETE FROM comments');
  runQuery('DELETE FROM movie_genres');
  runQuery('DELETE FROM movies');
  runQuery('DELETE FROM genres');
  runQuery('DELETE FROM users');
}

async function seed() {
  const options = parseArgs(process.argv.slice(2));
  await initializeSchema();

  const existingMovie = getOne('SELECT id FROM movies LIMIT 1');
  if (existingMovie && !options.force) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  if (options.force) {
    console.log('Force seed enabled. Clearing existing seeded data...');
    resetSeededData();
  }

  console.log('Seeding database...');

  for (const name of GENRES) {
    runQuery('INSERT INTO genres (name) VALUES (?)', [name]);
  }

  for (const m of MOVIES) {
    runQuery(
      'INSERT INTO movies (title, director, release_year, duration, description, poster_url) VALUES (?, ?, ?, ?, ?, ?)',
      [m.title, m.director, m.year, m.duration, m.desc, m.poster]
    );
    const movie = getOne('SELECT id FROM movies WHERE title = ?', [m.title]);
    for (const genreName of m.genres) {
      const genre = getOne('SELECT id FROM genres WHERE name = ?', [genreName]);
      if (genre && movie) {
        runQuery('INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movie.id, genre.id]);
      }
    }
  }

  // Hardcoded similar-movie pairs (bidirectional).
  // Loaded from similarities.json


  let similarityCount = 0;
  for (const [titleA, titleB] of SIMILAR_PAIRS) {
    const movieA = getOne('SELECT id FROM movies WHERE title = ?', [titleA]);
    const movieB = getOne('SELECT id FROM movies WHERE title = ?', [titleB]);
    if (movieA && movieB) {
      runQuery('INSERT OR IGNORE INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieA.id, movieB.id]);
      runQuery('INSERT OR IGNORE INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieB.id, movieA.id]);
      similarityCount++;
    }
  }

  const demoHash = bcrypt.hashSync('Password123', 10);
  runQuery(
    'INSERT INTO users (username, email, password_hash, preferred_genres) VALUES (?, ?, ?, ?)',
    ['demo', 'demo@example.com', demoHash, JSON.stringify(['Action', 'Sci-Fi', 'Drama'])]
  );
  const demoUser = getOne('SELECT id FROM users WHERE username = ?', ['demo']);

  const adminHash = bcrypt.hashSync('Admin1234', 10);
  runQuery(
    'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
    ['admin', 'admin@example.com', adminHash, 1]
  );

  const sampleRatings = [
    { movieId: 1, rating: 5 }, { movieId: 3, rating: 5 }, { movieId: 6, rating: 4 },
    { movieId: 7, rating: 5 }, { movieId: 8, rating: 4 }, { movieId: 11, rating: 3 },
    { movieId: 15, rating: 4 }, { movieId: 25, rating: 4 },
  ];
  for (const r of sampleRatings) {
    runQuery('INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)', [demoUser.id, r.movieId, r.rating]);
  }

  runQuery('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [demoUser.id, 6]);
  runQuery('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [demoUser.id, 7]);
  runQuery('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [demoUser.id, 8]);

  runQuery('INSERT INTO comments (user_id, movie_id, comment_text) VALUES (?, ?, ?)',
    [demoUser.id, 1, 'One of the greatest films ever made. The story of hope and perseverance is timeless.']);
  runQuery('INSERT INTO comments (user_id, movie_id, comment_text) VALUES (?, ?, ?)',
    [demoUser.id, 6, 'Mind-bending plot with incredible visuals. Nolan at his best!']);

  saveDb();
  console.log('Database seeded successfully!');
  console.log(`  - ${GENRES.length} genres`);
  console.log(`  - ${MOVIES.length} movies`);
  console.log(`  - ${similarityCount} similar-movie pairs`);
  console.log(`  - 1 demo user (demo / Password123)`);
  console.log(`  - 1 admin user (admin / Admin1234)`);
}

seed().catch(console.error);
