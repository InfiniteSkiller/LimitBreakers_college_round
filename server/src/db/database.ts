import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDatabase(dbPath?: string) {
  const targetPath = dbPath || path.join(__dirname, '../../incognito.db');
  const db = new Database(targetPath);

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

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      content TEXT NOT NULL,
      sanitized_content TEXT,
      status TEXT NOT NULL, -- 'approved_for_aggregation', 'needs_sanitization', 'held_for_privacy_review', 'rejected'
      privacy_flags TEXT NOT NULL, -- JSON string array
      is_serious_allegation INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Maps the human-readable scope ("teaching:2026-Q4") to the numeric
    -- on-chain topic ID that every proof for that scope must be bound to.
    CREATE TABLE IF NOT EXISTS topics (
      scope_id TEXT NOT NULL,
      deployment_key TEXT NOT NULL, -- reporting contract + group; a redeploy invalidates old topic IDs
      topic_id INTEGER NOT NULL,
      tx_hash TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (scope_id, deployment_key),
      UNIQUE (deployment_key, topic_id)
    );

    CREATE INDEX IF NOT EXISTS idx_enrollments_commitment ON enrollments(identity_commitment);
    CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_scope ON reports(scope_id);
    CREATE INDEX IF NOT EXISTS idx_nullifiers_scope_nullifier ON nullifiers(scope_id, nullifier);
  `);

  migrate(db);

  return db;
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

// Lightweight migrations so existing incognito.db files keep working.
function migrate(db: Database.Database) {
  addColumnIfMissing(db, 'reports', 'tx_hash', 'TEXT');
  addColumnIfMissing(db, 'reports', 'topic_id', 'INTEGER');
}

// Default singleton for app runtime
export const defaultDb = createDatabase();
