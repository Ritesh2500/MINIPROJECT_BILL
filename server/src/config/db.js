const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let dbClient = null;
let activeEngine = 'sqlite';

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

// SQLite database initialization using Node 22+ built-in node:sqlite
function initSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const dbDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'billmate.db');
  const sqlite = new DatabaseSync(dbPath);

  // Enable foreign keys and WAL mode
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec('PRAGMA journal_mode = WAL;');

  // Create tables if not exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      currency TEXT DEFAULT 'USD',
      theme TEXT DEFAULT 'dark',
      avatar_url TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Tag',
      color TEXT DEFAULT '#3B82F6',
      is_default INTEGER DEFAULT 1,
      user_id INTEGER NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      billing_frequency TEXT DEFAULT 'one-time',
      payment_status TEXT DEFAULT 'upcoming',
      description TEXT NULL,
      reminder_days_before INTEGER DEFAULT 3,
      is_recurring INTEGER DEFAULT 0,
      auto_generate_next INTEGER DEFAULT 1,
      next_due_date TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_paid REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'UPI',
      transaction_id TEXT NULL,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reminder_date TEXT NOT NULL,
      reminder_type TEXT DEFAULT 'due-date',
      status TEXT DEFAULT 'pending',
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      link TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      currency TEXT DEFAULT 'USD',
      currency_symbol TEXT DEFAULT '$',
      email_notifications INTEGER DEFAULT 1,
      in_app_notifications INTEGER DEFAULT 1,
      dark_mode INTEGER DEFAULT 1,
      reminder_days_default INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default categories if not present
  const countStmt = sqlite.prepare('SELECT COUNT(*) as count FROM categories WHERE is_default = 1');
  const countRes = countStmt.get();
  if (!countRes || countRes.count === 0) {
    const insertCat = sqlite.prepare('INSERT INTO categories (name, icon, color, is_default, user_id) VALUES (?, ?, ?, 1, NULL)');
    const defaultCats = [
      ['Electricity', 'Zap', '#F59E0B'],
      ['Water', 'Droplets', '#06B6D4'],
      ['Mobile', 'Smartphone', '#10B981'],
      ['Internet', 'Wifi', '#3B82F6'],
      ['Rent', 'Home', '#8B5CF6'],
      ['College/School Fees', 'GraduationCap', '#EC4899'],
      ['Insurance', 'ShieldCheck', '#14B8A6'],
      ['Credit Card', 'CreditCard', '#EF4444'],
      ['Loan', 'Landmark', '#6366F1'],
      ['OTT Subscriptions', 'Tv', '#F97316'],
      ['Software Subscriptions', 'Code2', '#84CC16'],
      ['Transportation', 'Car', '#A855F7'],
      ['Healthcare', 'HeartPulse', '#E11D48'],
      ['Shopping', 'ShoppingBag', '#D97706'],
      ['Other', 'Tag', '#64748B']
    ];
    for (const cat of defaultCats) {
      insertCat.run(...cat);
    }
  }

  activeEngine = 'sqlite';
  console.log('✓ SQLite database connected and tables initialized at:', dbPath);

  return {
    async query(sql, params = []) {
      const cleanSql = sql.trim();
      const isSelect = /^SELECT/i.test(cleanSql) || /^PRAGMA/i.test(cleanSql);
      const stmt = sqlite.prepare(cleanSql);
      if (isSelect) {
        const rows = stmt.all(...params);
        return [rows, []];
      } else {
        const info = stmt.run(...params);
        return [{
          insertId: Number(info.lastInsertRowid),
          affectedRows: info.changes
        }, []];
      }
    },
    async execute(sql, params = []) {
      return this.query(sql, params);
    },
    getEngine() {
      return 'sqlite';
    }
  };
}

// MySQL pool initialization using mysql2/promise
async function initMySQL() {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'billmate_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
  });

  // Verify connection
  const conn = await pool.getConnection();
  conn.release();
  activeEngine = 'mysql';
  console.log(`✓ Connected to MySQL database [${process.env.DB_NAME || 'billmate_db'}] on ${process.env.DB_HOST || '127.0.0.1'}`);

  return {
    async query(sql, params = []) {
      return pool.query(sql, params);
    },
    async execute(sql, params = []) {
      return pool.execute(sql, params);
    },
    getEngine() {
      return 'mysql';
    }
  };
}

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  if (DB_TYPE === 'mysql') {
    try {
      dbInstance = await initMySQL();
      return dbInstance;
    } catch (err) {
      console.warn(`[DB WARNING] Failed to connect to MySQL (${err.message}). Falling back to embedded SQLite for seamless operation.`);
      dbInstance = initSqlite();
      return dbInstance;
    }
  } else {
    dbInstance = initSqlite();
    return dbInstance;
  }
}

// Proxy wrapper so controllers can import `query` directly
const db = {
  async query(sql, params = []) {
    const instance = await getDb();
    return instance.query(sql, params);
  },
  async execute(sql, params = []) {
    const instance = await getDb();
    return instance.execute(sql, params);
  },
  getEngine() {
    return activeEngine;
  }
};

module.exports = db;

