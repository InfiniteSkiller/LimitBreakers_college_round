import { Database as SqliteDatabase } from 'better-sqlite3';
import { ChainService, DisabledChainService } from './chainService.js';
import { hashToBigIntString } from './verifier.js';

export interface ResolvedTopic {
  scopeId: string;
  /** On-chain topic ID, or null when running off-chain. */
  topicId: number | null;
  /**
   * The value every Semaphore proof for this scope must use as its `scope`.
   * On-chain mode: the topic ID. Off-chain mode: the legacy hashed scope.
   */
  proofScope: string;
  txHash?: string;
}

export class InvalidScopeError extends Error {}

// Only explicit categories and periods can create topics. Topic resolution is
// reachable from the public report flow, and first resolution spends backend-wallet
// gas on-chain. Keep the set finite; for public deployments, move topic creation
// behind moderator authorization rather than exposing it through this GET route.
const ALLOWED_CATEGORIES = (process.env.ALLOWED_CATEGORIES ||
  'teaching,administration,facilities,safety,welfare').split(',').map((c) => c.trim()).filter(Boolean);
const ALLOWED_PERIODS = (process.env.ALLOWED_PERIODS ||
  '2026-Q3,2026-Q4,2026-10').split(',').map((p) => p.trim()).filter(Boolean);

export function validateScopeId(scopeId: string): void {
  const [category, period, ...rest] = scopeId.split(':');
  if (rest.length > 0 || !ALLOWED_CATEGORIES.includes(category) || !ALLOWED_PERIODS.includes(period ?? '')) {
    throw new InvalidScopeError(
      `Invalid scope '${scopeId}'. Expected '<category>:<period>' with category one of: ${ALLOWED_CATEGORIES.join(', ')} and period one of: ${ALLOWED_PERIODS.join(', ')}.`
    );
  }
}

export class TopicService {
  private inflight = new Map<string, Promise<ResolvedTopic>>();

  constructor(private db: SqliteDatabase, private chain: ChainService = new DisabledChainService()) {}

  /** Look up (or lazily create on-chain) the topic for a scope. */
  public resolve(scopeId: string): Promise<ResolvedTopic> {
    if (!this.chain.enabled) {
      return Promise.resolve({ scopeId, topicId: null, proofScope: hashToBigIntString(scopeId) });
    }
    validateScopeId(scopeId);

    const existing = this.lookup(scopeId);
    if (existing) return Promise.resolve(existing);

    // Concurrent first requests for the same scope must create only one topic.
    let pending = this.inflight.get(scopeId);
    if (!pending) {
      pending = this.create(scopeId).finally(() => this.inflight.delete(scopeId));
      this.inflight.set(scopeId, pending);
    }
    return pending;
  }

  private lookup(scopeId: string): ResolvedTopic | null {
    const row = this.db
      .prepare('SELECT topic_id, tx_hash FROM topics WHERE scope_id = ? AND deployment_key = ?')
      .get(scopeId, this.chain.deploymentKey) as { topic_id: number; tx_hash: string | null } | undefined;
    if (!row) return null;
    return { scopeId, topicId: row.topic_id, proofScope: String(row.topic_id), txHash: row.tx_hash ?? undefined };
  }

  private async create(scopeId: string): Promise<ResolvedTopic> {
    const { topicId, txHash } = await this.chain.createTopic(scopeId);
    this.db
      .prepare('INSERT INTO topics (scope_id, deployment_key, topic_id, tx_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(scopeId, this.chain.deploymentKey, topicId, txHash, new Date().toISOString());
    return { scopeId, topicId, proofScope: String(topicId), txHash };
  }
}
