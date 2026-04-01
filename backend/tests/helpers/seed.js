// Shared seed helper — inserts minimal, deterministic test data
// into a provided sql.js Database instance and returns all IDs needed.

const bcrypt = require('bcryptjs');
const { generateToken } = require('../../src/middleware/auth');

function getLastInsertId(db) {
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const r = stmt.getAsObject();
  stmt.free();
  return r.id;
}

async function seedTestData(db) {
  // --- genres ---
  db.run("INSERT INTO genres (name) VALUES ('Action')");
  const actionId = getLastInsertId(db);

  db.run("INSERT INTO genres (name) VALUES ('Drama')");
  const dramaId = getLastInsertId(db);

  db.run("INSERT INTO genres (name) VALUES ('Sci-Fi')");
  const scifiId = getLastInsertId(db);

  // --- movies ---
  db.run("INSERT INTO movies (title, release_year) VALUES ('Test Movie A', 2020)");
  const movieA = getLastInsertId(db);

  db.run("INSERT INTO movies (title, release_year) VALUES ('Test Movie B', 2019)");
  const movieB = getLastInsertId(db);

  db.run("INSERT INTO movies (title, release_year) VALUES ('Test Movie C', 2018)");
  const movieC = getLastInsertId(db);

  db.run("INSERT INTO movies (title, release_year) VALUES ('Test Movie D', 2017)");
  const movieD = getLastInsertId(db);

  // --- movie_genres ---
  // Movie A: Action, Sci-Fi
  db.run('INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieA, actionId]);
  db.run('INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieA, scifiId]);
  // Movie B: Action
  db.run('INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieB, actionId]);
  // Movie C: Drama
  db.run('INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieC, dramaId]);
  // Movie D: Sci-Fi
  db.run('INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieD, scifiId]);

  // --- similarities (bidirectional): A↔B, C↔D ---
  db.run('INSERT INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieA, movieB]);
  db.run('INSERT INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieB, movieA]);
  db.run('INSERT INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieC, movieD]);
  db.run('INSERT INTO movie_similarities (movie_id, similar_movie_id) VALUES (?, ?)', [movieD, movieC]);

  // --- users ---
  const passwordHash = bcrypt.hashSync('Password123', 10);

  db.run(
    "INSERT INTO users (username, email, password_hash, is_admin) VALUES ('testuser', 'test@test.com', ?, 0)",
    [passwordHash]
  );
  const userId = getLastInsertId(db);

  db.run(
    "INSERT INTO users (username, email, password_hash, is_admin) VALUES ('adminuser', 'admin@test.com', ?, 1)",
    [passwordHash]
  );
  const adminId = getLastInsertId(db);

  // --- tokens ---
  const userToken = generateToken({ id: userId, username: 'testuser', email: 'test@test.com', is_admin: 0 });
  const adminToken = generateToken({ id: adminId, username: 'adminuser', email: 'admin@test.com', is_admin: 1 });

  return { movieA, movieB, movieC, movieD, actionId, dramaId, scifiId, userId, adminId, userToken, adminToken };
}

module.exports = { seedTestData };
