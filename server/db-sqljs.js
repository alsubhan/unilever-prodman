const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'production.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance = null;

function saveDb(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Emulate better-sqlite3 prepare() API
class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    this.db.run(this.sql, params);
    saveDb(this.db);
    return { changes: this.db.getRowsModified() };
  }

  get(...params) {
    const stmt = this.db.prepare(this.sql);
    try {
      stmt.bind(params);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params) {
    const stmt = this.db.prepare(this.sql);
    const results = [];
    try {
      stmt.bind(params);
      while(stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      stmt.free();
    }
  }
}

// Wrapper for the whole DB
class Database {
  constructor(buffer) {
    // Wait for resolving the promise then instantiating the DB synchronous from buffer
    // sql.js initialization is async, so we'll have to initialize before returning
  }
}

// We need a synchronous export. Unfortunately sql.js requires async init.
// But we can use `fs.readFileSync` and `sync-request` or similar?
// Wait, better-sqlite3 is heavily used across all our routes synchronously.
// If we change `db.js` to export a Promise or require an async init, we need to wrap all routes to await db connection.
