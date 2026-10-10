import { SqliteDatabase } from '../db/database.js';

export interface TopicRecord {
  id: number;
  name: string;
  category: string;
  period: string;
  active: boolean;
  created_at: string;
}

export class TopicRegistryService {
  private db: SqliteDatabase;

  constructor(db: SqliteDatabase) {
    this.db = db;
  }

  /**
   * Get or create a topic for a given category + period scope.
   * Returns the numeric topic ID used as the Semaphore proof scope
   * and the on-chain topic identifier.
   */
  public getOrCreateTopic(category: string, period: string): number {
    const existing = this.db.prepare(
      'SELECT id FROM topics WHERE category = ? AND period = ?'
    ).get(category, period) as { id: number } | undefined;

    if (existing) return existing.id;

    const nowIso = new Date().toISOString();
    const name = `${category}:${period}`;
    const result = this.db.prepare(
      'INSERT INTO topics (name, category, period, active, created_at) VALUES (?, ?, ?, 1, ?)'
    ).run(name, category, period, nowIso);

    return Number(result.lastInsertRowid);
  }

  /**
   * Get the numeric topic ID for a category + period.
   */
  public getTopicId(category: string, period: string): number | null {
    const row = this.db.prepare(
      'SELECT id FROM topics WHERE category = ? AND period = ?'
    ).get(category, period) as { id: number } | undefined;

    return row ? row.id : null;
  }

  /**
   * Get topic by numeric ID.
   */
  public getTopicById(id: number): TopicRecord | null {
    const row = this.db.prepare(
      'SELECT id, name, category, period, active, created_at FROM topics WHERE id = ?'
    ).get(id) as any;

    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      period: row.period,
      active: Boolean(row.active),
      created_at: row.created_at,
    };
  }

  /**
   * List all topics.
   */
  public listTopics(): TopicRecord[] {
    const rows = this.db.prepare(
      'SELECT id, name, category, period, active, created_at FROM topics ORDER BY id ASC'
    ).all() as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      period: r.period,
      active: Boolean(r.active),
      created_at: r.created_at,
    }));
  }

  /**
   * Seed default topics for the demo categories and periods.
   * Creates topics in deterministic order so IDs match on-chain topic IDs.
   */
  public seedDefaults(
    categories: string[] = ['teaching', 'facilities', 'administration', 'welfare', 'safety'],
    periods: string[] = ['2026-Q4', '2026-Q3', '2026-10']
  ): number[] {
    const ids: number[] = [];
    for (const period of periods) {
      for (const category of categories) {
        ids.push(this.getOrCreateTopic(category, period));
      }
    }
    return ids;
  }
}
