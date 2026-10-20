"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableResourceRegistryMigration = enableResourceRegistryMigration;
exports.enableProjectAttachmentsMigration = enableProjectAttachmentsMigration;
exports.query = query;
exports.lockResourceRegistry = lockResourceRegistry;
exports.transaction = transaction;
const pg_1 = require("pg");
const async_hooks_1 = require("async_hooks");
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ── Detect backend ──
function usePg() {
    return !!process.env.DATABASE_URL;
}
let resourceRegistryMigration = false;
function enableResourceRegistryMigration() {
    if (pgSchemaReady || sqliteReady)
        throw new Error("数据库已初始化，不能再执行查重迁移");
    resourceRegistryMigration = true;
}
let projectAttachmentsMigration = false;
function enableProjectAttachmentsMigration() {
    if (pgSchemaReady || sqliteReady)
        throw new Error("数据库已初始化，不能再执行附件迁移");
    projectAttachmentsMigration = true;
}
// ── PostgreSQL ──
let pgPool = null;
let pgSchemaReady = null;
function getPgPool() {
    if (!pgPool) {
        pgPool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 10,
            // Legacy TEXT timestamps store UTC without an offset; comparisons must use UTC too.
            options: "-c timezone=UTC",
            ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
        });
    }
    return pgPool;
}
// Convert ? placeholders to $1, $2, ...
function toPgParams(sql) {
    let idx = 0;
    return sql.replace(/\?/g, () => `$${++idx}`);
}
// Convert SQLite-specific SQL to PostgreSQL
function toPgSql(sql) {
    return sql
        // datetime('now', ? || ' minutes') → NOW() + (? || ' minutes')::INTERVAL
        .replace(/datetime\('now',\s*\?\s*\|\|\s*' minutes'\)/gi, "NOW() + (? || ' minutes')::INTERVAL")
        // datetime('now', ? || ' seconds') → NOW() + (? || ' seconds')::INTERVAL
        .replace(/datetime\('now',\s*\?\s*\|\|\s*' seconds'\)/gi, "NOW() + (? || ' seconds')::INTERVAL")
        // datetime('now') → NOW()
        .replace(/datetime\('now'\)/gi, "NOW()")
        // DATE('now') → CURRENT_DATE
        .replace(/DATE\('now'\)/gi, "CURRENT_DATE")
        // Time columns are stored as TEXT for SQLite compatibility; cast before PG time comparisons.
        .replace(/\b(created_at|updated_at|expires_at|subscription_expires_at)\s*(<=|>=|<|>)\s*(NOW\(\)(?:\s*\+\s*\([^)]*\)::INTERVAL)?)/gi, "$1::timestamptz $2 $3")
        // Boolean literals — PG doesn't allow TRUE/FALSE on INTEGER columns
        .replace(/=\s*TRUE\b/gi, "= 1")
        .replace(/=\s*FALSE\b/gi, "= 0");
}
async function initPgSchema() {
    const client = await getPgPool().connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        plan TEXT DEFAULT 'free',
        is_admin INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        email_verified INTEGER DEFAULT 1,
        subscription_expires_at TEXT,
        subscription_status TEXT DEFAULT 'none',
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text,
        updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TEXT");
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'");
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS contribution_points INTEGER DEFAULT 0");
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0");
        await client.query(`
      CREATE TABLE IF NOT EXISTS patterns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text,
        updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern_id INTEGER NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text,
        UNIQUE (user_id, pattern_id)
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS generation_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        pattern_id INTEGER,
        source_type TEXT,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern_id INTEGER NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        detail TEXT,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT,
        updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('captcha', 'email_verify', 'password_reset')),
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_type_email ON verification_codes(type, email)`);
        await client.query("ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0");
        await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_no TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL CHECK(provider IN ('alipay', 'wechat')),
        plan TEXT NOT NULL CHECK(plan IN ('pro', 'team')),
        amount DOUBLE PRECISION NOT NULL,
        out_trade_no TEXT,
        qr_code TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled', 'expired', 'refunded')),
        paid_at TEXT,
        subscription_expires_at TEXT,
        auto_renew INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text,
        updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        category TEXT NOT NULL,
        demo_url TEXT NOT NULL,
        repo_url TEXT,
        tech_stack TEXT,
        confession TEXT,
        cover_url TEXT,
        status TEXT DEFAULT 'pending',
        is_featured INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        votes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text,
        updated_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS project_votes (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text,
        UNIQUE(project_id, user_id)
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS project_comments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS project_reports (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        detail TEXT,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS user_checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        checkin_date TEXT NOT NULL,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text,
        UNIQUE(user_id, checkin_date)
      )
    `);
        await client.query("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS reply TEXT DEFAULT ''");
        await client.query("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS replied_at TEXT");
        await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS moderation_note TEXT DEFAULT ''");
        await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 1");
        await client.query("ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT DEFAULT ''");
        await client.query(`CREATE TABLE IF NOT EXISTS contribution_events (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_key TEXT NOT NULL, points INTEGER NOT NULL, UNIQUE(user_id, event_key)
    )`);
        if (resourceRegistryMigration) {
            await client.query(`CREATE TABLE IF NOT EXISTS resource_entries (
      id SERIAL PRIMARY KEY, project TEXT NOT NULL, channel TEXT NOT NULL
    )`);
            await client.query("ALTER TABLE resource_entries ADD COLUMN IF NOT EXISTS website_project_id INTEGER");
            await client.query("ALTER TABLE resource_entries ADD COLUMN IF NOT EXISTS website_owned INTEGER NOT NULL DEFAULT 0");
            await client.query("ALTER TABLE resource_entries ADD COLUMN IF NOT EXISTS ever_published INTEGER NOT NULL DEFAULT 0");
            await client.query("ALTER TABLE resource_entries ADD COLUMN IF NOT EXISTS is_released INTEGER NOT NULL DEFAULT 0");
            await client.query(`CREATE TABLE IF NOT EXISTS resource_aliases (
      id SERIAL PRIMARY KEY, alias TEXT NOT NULL UNIQUE,
      entry_id INTEGER NOT NULL REFERENCES resource_entries(id)
    )`);
            await client.query(`CREATE TABLE IF NOT EXISTS resource_requests (
      id SERIAL PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
      fingerprint TEXT NOT NULL, result TEXT
    )`);
            await client.query(`CREATE TABLE IF NOT EXISTS resource_imports (
      id SERIAL PRIMARY KEY, source_id TEXT NOT NULL UNIQUE,
      fingerprint TEXT NOT NULL, entry_id INTEGER NOT NULL REFERENCES resource_entries(id)
    )`);
            await client.query(`CREATE TABLE IF NOT EXISTS resource_events (
      id SERIAL PRIMARY KEY, entry_id INTEGER NOT NULL REFERENCES resource_entries(id),
      website_project_id INTEGER NOT NULL, action TEXT NOT NULL, created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
    )`);
        }
        if (projectAttachmentsMigration) {
            await client.query(`CREATE TABLE IF NOT EXISTS project_attachments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        stored_name TEXT NOT NULL UNIQUE,
        mime TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT DEFAULT (NOW() AT TIME ZONE 'UTC')::text
      )`);
            await client.query("CREATE INDEX IF NOT EXISTS idx_project_attachments_project ON project_attachments(project_id, sort_order)");
        }
        await client.query("CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects(status, created_at)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id)");
    }
    finally {
        client.release();
    }
}
// ── SQLite (local dev) ──
const DB_PATH = process.env.DB_PATH || path_1.default.resolve(process.cwd(), "data/fusebead.db");
let sqliteDb = null;
let sqliteReady = null;
function ensureDir() {
    const dir = path_1.default.dirname(DB_PATH);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
}
async function getSqliteDb() {
    if (sqliteDb)
        return sqliteDb;
    if (!sqliteReady) {
        sqliteReady = (async () => {
            const SQL = await (0, sql_js_1.default)();
            ensureDir();
            if (fs_1.default.existsSync(DB_PATH)) {
                const buffer = fs_1.default.readFileSync(DB_PATH);
                sqliteDb = new SQL.Database(buffer);
            }
            else {
                sqliteDb = new SQL.Database();
            }
            sqliteDb.run("PRAGMA journal_mode = WAL;");
            sqliteDb.run("PRAGMA foreign_keys = ON;");
            initSqliteSchema(sqliteDb);
        })();
    }
    await sqliteReady;
    return sqliteDb;
}
function saveSqliteDb() {
    if (sqliteDb) {
        ensureDir();
        const temporary = DB_PATH + ".tmp";
        fs_1.default.writeFileSync(temporary, sqliteDb.export(), { mode: 0o600 });
        fs_1.default.renameSync(temporary, DB_PATH);
    }
}
function initSqliteSchema(database) {
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
    try {
        database.run("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 1");
    }
    catch (_) { /* column exists */ }
    try {
        database.run("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
    }
    catch (_) { /* column exists */ }
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
    try {
        database.run("CREATE INDEX IF NOT EXISTS idx_verification_codes_type_email ON verification_codes(type, email)");
    }
    catch (_) { /* index exists */ }
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
    // Migrations
    try {
        database.run("ALTER TABLE users ADD COLUMN subscription_expires_at TEXT");
    }
    catch (_) { /* column exists */ }
    try {
        database.run("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none'");
    }
    catch (_) { /* column exists */ }
    try {
        database.run("ALTER TABLE users ADD COLUMN contribution_points INTEGER DEFAULT 0");
    }
    catch (_) { /* column exists */ }
    database.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      category TEXT NOT NULL,
      demo_url TEXT NOT NULL,
      repo_url TEXT,
      tech_stack TEXT,
      confession TEXT,
      cover_url TEXT,
      status TEXT DEFAULT 'pending',
      is_featured INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      votes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    database.run(`
    CREATE TABLE IF NOT EXISTS project_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    )
  `);
    database.run(`
    CREATE TABLE IF NOT EXISTS project_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    database.run(`
    CREATE TABLE IF NOT EXISTS project_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      detail TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    database.run(`
    CREATE TABLE IF NOT EXISTS user_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, checkin_date)
    )
  `);
    for (const [table, column, definition] of [
        ["feedbacks", "reply", "TEXT DEFAULT ''"],
        ["feedbacks", "replied_at", "TEXT"],
        ["projects", "moderation_note", "TEXT DEFAULT ''"],
        ["projects", "revision", "INTEGER DEFAULT 1"],
        ["project_reports", "resolution_note", "TEXT DEFAULT ''"],
    ]) {
        const columns = database.exec(`PRAGMA table_info(${table})`)[0].values;
        if (!columns.some((row) => row[1] === column))
            database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
    database.run(`CREATE TABLE IF NOT EXISTS contribution_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_key TEXT NOT NULL, points INTEGER NOT NULL, UNIQUE(user_id, event_key)
  )`);
    if (resourceRegistryMigration) {
        database.run(`CREATE TABLE IF NOT EXISTS resource_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, project TEXT NOT NULL, channel TEXT NOT NULL
  )`);
        if (!database.exec("PRAGMA table_info(resource_entries)")[0].values.some(row => row[1] === "website_project_id"))
            database.run("ALTER TABLE resource_entries ADD COLUMN website_project_id INTEGER");
        for (const column of ["website_owned", "ever_published", "is_released"]) {
            if (!database.exec("PRAGMA table_info(resource_entries)")[0].values.some(row => row[1] === column))
                database.run(`ALTER TABLE resource_entries ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
        }
        database.run(`CREATE TABLE IF NOT EXISTS resource_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT, alias TEXT NOT NULL UNIQUE,
    entry_id INTEGER NOT NULL REFERENCES resource_entries(id)
  )`);
        database.run(`CREATE TABLE IF NOT EXISTS resource_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE,
    fingerprint TEXT NOT NULL, result TEXT
  )`);
        database.run(`CREATE TABLE IF NOT EXISTS resource_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT NOT NULL UNIQUE,
    fingerprint TEXT NOT NULL, entry_id INTEGER NOT NULL REFERENCES resource_entries(id)
  )`);
        database.run(`CREATE TABLE IF NOT EXISTS resource_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id INTEGER NOT NULL REFERENCES resource_entries(id),
    website_project_id INTEGER NOT NULL, action TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
    }
    if (projectAttachmentsMigration) {
        database.run(`CREATE TABLE IF NOT EXISTS project_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      mime TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);
        database.run("CREATE INDEX IF NOT EXISTS idx_project_attachments_project ON project_attachments(project_id, sort_order)");
    }
    database.run("CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects(status, created_at)");
    database.run("CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id)");
    // Migration: expand verification_codes CHECK to include password_reset
    const verificationSchema = database.exec("SELECT sql FROM sqlite_master WHERE name = 'verification_codes'")[0].values[0][0];
    if (!String(verificationSchema).includes("password_reset")) {
        database.run("BEGIN");
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
            database.run("INSERT INTO verification_codes (id, email, code, type, expires_at, created_at) SELECT id, email, code, type, expires_at, created_at FROM vc_old");
            database.run("DROP TABLE vc_old");
            database.run("CREATE INDEX IF NOT EXISTS idx_verification_codes_type_email ON verification_codes(type, email)");
            database.run("COMMIT");
        }
        catch (error) {
            database.run("ROLLBACK");
            throw error;
        }
    }
    if (!database.exec("PRAGMA table_info(verification_codes)")[0].values.some(row => row[1] === "attempts")) {
        database.run("ALTER TABLE verification_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0");
    }
    saveSqliteDb();
}
// ── Unified query interface ──
const transactionContext = new async_hooks_1.AsyncLocalStorage();
let sqliteQueue = Promise.resolve();
function sqliteExclusive(work) {
    const task = sqliteQueue.then(work, work);
    sqliteQueue = task.catch(() => { });
    return task;
}
async function readyPg() {
    if (!pgSchemaReady)
        pgSchemaReady = initPgSchema().catch((error) => { pgSchemaReady = null; throw error; });
    await pgSchemaReady;
}
function sqliteQuery(database, sql, params = []) {
    const statement = database.prepare(sql.replace(/\s+FOR UPDATE\s*$/i, ""));
    try {
        statement.bind(params);
        if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql)) {
            const rows = [];
            while (statement.step())
                rows.push(statement.getAsObject());
            return rows;
        }
        statement.step();
        return {
            affectedRows: database.getRowsModified(),
            insertId: Number(database.exec("SELECT last_insert_rowid()")[0].values[0][0]),
        };
    }
    finally {
        statement.free();
    }
}
async function pgQuery(client, sql, params = []) {
    let translated = toPgParams(toPgSql(sql));
    if (/^\s*INSERT\b/i.test(sql) && !/RETURNING\b/i.test(translated))
        translated += " RETURNING id";
    const result = await client.query(translated, params);
    if (/^\s*(SELECT|WITH)\b/i.test(sql))
        return result.rows;
    return { affectedRows: result.rowCount || 0, insertId: result.rows?.[0]?.id || 0 };
}
async function query(sql, params = []) {
    const context = transactionContext.getStore();
    if (context?.client)
        return pgQuery(context.client, sql, params);
    if (context?.database)
        return sqliteQuery(context.database, sql, params);
    if (usePg()) {
        await readyPg();
        const client = await getPgPool().connect();
        try {
            return await pgQuery(client, sql, params);
        }
        finally {
            client.release();
        }
    }
    return sqliteExclusive(async () => {
        const database = await getSqliteDb();
        const result = sqliteQuery(database, sql, params);
        if (!/^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql))
            saveSqliteDb();
        return result;
    });
}
async function lockResourceRegistry() {
    const context = transactionContext.getStore();
    if (!context)
        throw new Error("查重锁必须在事务中使用");
    if (context.client)
        await context.client.query("SELECT pg_advisory_xact_lock($1)", [17491623]);
}
async function transaction(work) {
    if (transactionContext.getStore())
        return work();
    if (usePg()) {
        await readyPg();
        const client = await getPgPool().connect();
        try {
            await client.query("BEGIN");
            const result = await transactionContext.run({ client }, work);
            await client.query("COMMIT");
            return result;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    return sqliteExclusive(async () => {
        const database = await getSqliteDb();
        database.run("BEGIN");
        let committed = false;
        try {
            const result = await transactionContext.run({ database }, work);
            database.run("COMMIT");
            committed = true;
            saveSqliteDb();
            return result;
        }
        catch (error) {
            if (!committed)
                database.run("ROLLBACK");
            throw error;
        }
    });
}
exports.default = usePg;
