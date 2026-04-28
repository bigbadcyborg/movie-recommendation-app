/**
 * Standalone sql.js open/save helpers for CLI scripts (backup, migrate).
 * Avoids the singleton in database.js used by the server.
 */
const fs = require('fs');
const initSqlJs = require('sql.js');

async function openDatabase(filePath) {
  const SQL = await initSqlJs();
  if (!fs.existsSync(filePath)) {
    return new SQL.Database();
  }
  const buffer = fs.readFileSync(filePath);
  return new SQL.Database(buffer);
}

function saveDatabase(db, filePath) {
  const data = db.export();
  fs.mkdirSync(require('path').dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(data));
}

function run(db, sql, params = []) {
  db.run(sql, params);
}

function getOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function getAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

module.exports = {
  openDatabase,
  saveDatabase,
  run,
  getOne,
  getAll
};
