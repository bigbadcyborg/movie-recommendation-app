const { getDb, runQuery } = require('./database');

async function initializeSchema() {
  await getDb();

  runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      preferred_genres TEXT DEFAULT '[]',
      watch_history TEXT DEFAULT '[]',
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add is_admin column to existing databases that lack it
  try {
    runQuery('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
  } catch {
    // Column already exists, safe to ignore
  }

  runQuery(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      director TEXT,
      release_year INTEGER,
      duration INTEGER,
      description TEXT,
      poster_url TEXT
    )
  `);

  runQuery(`
    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  runQuery(`
    CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id INTEGER NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, genre_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    )
  `);

  runQuery(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      UNIQUE(user_id, movie_id)
    )
  `);

  runQuery(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      comment_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )
  `);

  runQuery(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      rating REAL NOT NULL CHECK(rating >= 1 AND rating <= 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      UNIQUE(user_id, movie_id)
    )
  `);

  runQuery(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      score REAL NOT NULL,
      explanation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )
  `);

  runQuery(`
    CREATE TABLE IF NOT EXISTS interaction_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER,
      action_type TEXT NOT NULL,
      filter TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )
  `);

  runQuery('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  runQuery('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  runQuery('CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title)');
  runQuery('CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id, movie_id)');
  runQuery('CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, movie_id)');
  runQuery('CREATE INDEX IF NOT EXISTS idx_comments_movie ON comments(movie_id)');
  runQuery('CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id, score)');
  runQuery('CREATE INDEX IF NOT EXISTS idx_interaction_logs_user ON interaction_logs(user_id, created_at)');

  console.log('Database schema initialized');
}

module.exports = { initializeSchema };
