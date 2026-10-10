import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: any };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StatementCompat {
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

export class SqliteDatabaseCompat {
  private db: any;

  constructor(targetPath: string) {
    this.db = new DatabaseSync(targetPath);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): StatementCompat {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params: any[]) => stmt.run(...params),
      get: (...params: any[]) => stmt.get(...params),
      all: (...params: any[]) => stmt.all(...params),
    };
  }

  pragma(pragmaStr: string): void {
    try {
      this.db.exec(`PRAGMA ${pragmaStr}`);
    } catch {
      // pragma is advisory
    }
  }

  close(): void {
    this.db.close();
  }
}

export type SqliteDatabase = SqliteDatabaseCompat;

export function createDatabase(dbPath?: string): SqliteDatabaseCompat {
  const targetPath = dbPath || path.join(__dirname, '../../incognito.db');
  const db = new SqliteDatabaseCompat(targetPath);

  // Enable WAL mode for better concurrency performance
  if (targetPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  // Init tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      identity_commitment TEXT NOT NULL UNIQUE,
      student_ticket TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nullifiers (
      id TEXT PRIMARY KEY,
      scope_id TEXT NOT NULL,
      nullifier TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(scope_id, nullifier)
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      period TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(category, period)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      topic_id INTEGER,
      content TEXT NOT NULL,
      sanitized_content TEXT,
      status TEXT NOT NULL, -- 'approved_for_aggregation', 'needs_sanitization', 'held_for_privacy_review', 'rejected'
      privacy_flags TEXT NOT NULL, -- JSON string array
      is_serious_allegation INTEGER NOT NULL DEFAULT 0,
      tx_hash TEXT,
      on_chain_status TEXT NOT NULL DEFAULT 'off_chain_only', -- 'off_chain_only', 'confirmed', 'failed'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_enrollments_commitment ON enrollments(identity_commitment);
    CREATE INDEX IF NOT EXISTS idx_topics_category_period ON topics(category, period);
    CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_scope ON reports(scope_id);
    CREATE INDEX IF NOT EXISTS idx_reports_topic ON reports(topic_id);
    CREATE INDEX IF NOT EXISTS idx_nullifiers_scope_nullifier ON nullifiers(scope_id, nullifier);
  `);

  return db;
}

// Default singleton for app runtime
export const defaultDb = createDatabase();
