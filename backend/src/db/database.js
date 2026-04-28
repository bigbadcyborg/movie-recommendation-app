const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { MOVIES_DB_PATH } = require('./dbPaths');

const DB_PATH = MOVIES_DB_PATH;

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function ensureDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
}

function runQuery(sql, params = []) {
  ensureDb();
  db.run(sql, params);
  saveDb();
}

function getOne(sql, params = []) {
  ensureDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function getAll(sql, params = []) {
  ensureDb();
  const stmt = db.prepare(sql);
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

module.exports = { getDb, saveDb, runQuery, getOne, getAll, getLastInsertId };
