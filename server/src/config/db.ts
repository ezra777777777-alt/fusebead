import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), "data/fusebead.db");

let db: SqlJsDatabase | null = null;
let _ready: Promise<void> | null = null;

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDb(): SqlJsDatabase {
  ensureDir();
  const SQL = require("sql.js");
  // sql.js in Node has initSqlJs as the default export already resolved
  return null!; // placeholder
}

async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  if (!_ready) {
    _ready = (async () => {
      const SQL = await initSqlJs();
      ensureDir();
      if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
      } else {
        db = new SQL.Database();
      }
      db.run("PRAGMA journal_mode = WAL;");
      db.run("PRAGMA foreign_keys = ON;");
      initSchema(db);
    })();
  }

  await _ready;
  return db!;
}

function saveDb() {
  if (db) {
    ensureDir();
    fs.writeFileSync(DB_PATH, db.export());
  }
}

function initSchema(database: SqlJsDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      plan TEXT DEFAULT 'free',
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  // Migration for existing DBs without the column
  try { database.run("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 1"); } catch (_) { /* column exists */ }
  database.run(`
    CREATE TABLE IF NOT EXISTS patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      brand TEXT DEFAULT 'perler',
      grid_size INTEGER NOT NULL,
      grid_data TEXT NOT NULL,
      color_counts TEXT,
      thumbnail_url TEXT,
      likes_count INTEGER DEFAULT 0,
      downloads_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      is_approved INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pattern_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
      UNIQUE (user_id, pattern_id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS generation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      pattern_id INTEGER,
      source_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pattern_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('captcha', 'email_verify')),
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try { database.run("CREATE INDEX IF NOT EXISTS idx_verification_codes_type_email ON verification_codes(type, email)"); } catch (_) { /* index exists */ }

  database.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL CHECK(provider IN ('alipay', 'wechat')),
      plan TEXT NOT NULL CHECK(plan IN ('pro', 'team')),
      amount REAL NOT NULL,
      out_trade_no TEXT,
      qr_code TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled', 'expired', 'refunded')),
      paid_at TEXT,
      subscription_expires_at TEXT,
      auto_renew INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migrations for existing DBs
  try { database.run("ALTER TABLE users ADD COLUMN subscription_expires_at TEXT"); } catch (_) { /* column exists */ }
  try { database.run("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none'"); } catch (_) { /* column exists */ }

  // Migration: expand verification_codes CHECK constraint to include password_reset
  try {
    database.run("ALTER TABLE verification_codes RENAME TO vc_old");
    database.run(`CREATE TABLE verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('captcha', 'email_verify', 'password_reset')),
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    database.run("INSERT INTO verification_codes SELECT * FROM vc_old");
    database.run("DROP TABLE vc_old");
    database.run("CREATE INDEX IF NOT EXISTS idx_verification_codes_type_email ON verification_codes(type, email)");
  } catch (_) { /* already migrated */ }

  saveDb();
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const database = await getDb();
  const trimmed = sql.trim().toUpperCase();

  if (trimmed.startsWith("SELECT") || trimmed.startsWith("WITH")) {
    // SELECT query
    if (params && params.length > 0) {
      const stmt = database.prepare(sql);
      stmt.bind(params);
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows as T;
    } else {
      const result = database.exec(sql);
      if (result.length === 0) return [] as T;
      const { columns, values } = result[0];
      const rows = values.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
        return obj;
      });
      return rows as T;
    }
  } else {
    // Mutation query — use prepared statement for reliability
    const stmt = database.prepare(sql);
    if (params && params.length > 0) stmt.bind(params);
    stmt.step();
    stmt.free();
    // Query insertId / changes BEFORE saveDb since export() resets last_insert_rowid
    const idResult = database.exec("SELECT last_insert_rowid() as id");
    const changeResult = database.exec("SELECT changes() as c");
    const insertId = idResult.length > 0 ? Number(idResult[0].values[0][0]) : 0;
    const changes = changeResult.length > 0 ? Number(changeResult[0].values[0][0]) : 0;
    saveDb();
    return { affectedRows: changes, insertId } as any;
  }
}

export default getDb;
