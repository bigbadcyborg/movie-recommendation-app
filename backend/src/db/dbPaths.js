const path = require('path');

/** Directory containing movies.db (backend/data/). */
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const MOVIES_DB_PATH = path.join(DATA_DIR, 'movies.db');

/** Timestamped copies of movies.db live here. */
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

module.exports = {
  DATA_DIR,
  MOVIES_DB_PATH,
  BACKUPS_DIR
};
