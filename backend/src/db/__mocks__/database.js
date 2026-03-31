// Manual Jest mock for database.js
// Backed by an in-memory sql.js Database instance injected via __resetDb()

let _db = null;

function __resetDb(dbInstance) {
  _db = dbInstance;
}

function getDb() {
  return Promise.resolve(_db);
}

function saveDb() {
  // no-op in tests — never write to disk
}

function runQuery(sql, params = []) {
  if (!_db) throw new Error('Mock DB not initialized — call __resetDb(db) in beforeAll');
  _db.run(sql, params);
}

function getOne(sql, params = []) {
  if (!_db) throw new Error('Mock DB not initialized — call __resetDb(db) in beforeAll');
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function getAll(sql, params = []) {
  if (!_db) throw new Error('Mock DB not initialized — call __resetDb(db) in beforeAll');
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getLastInsertId() {
  const result = getOne('SELECT last_insert_rowid() as id');
  return result ? result.id : null;
}

module.exports = { getDb, saveDb, runQuery, getOne, getAll, getLastInsertId, __resetDb };
