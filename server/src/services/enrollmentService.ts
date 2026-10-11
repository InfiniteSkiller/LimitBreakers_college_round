import { Database as SqliteDatabase } from 'better-sqlite3';
import crypto from 'node:crypto';
import { Group } from '@semaphore-protocol/group';
import { ChainService, DisabledChainService } from './chainService.js';

export interface EnrollmentRecord {
  id: string;
  identity_commitment: string;
  student_ticket: string;
  created_at: string;
}

export class EnrollmentService {
  private db: SqliteDatabase;
  private chain: ChainService;
  // Serialises enrollments so the database order and the on-chain order never diverge.
  private enrollQueue: Promise<unknown> = Promise.resolve();

  constructor(db: SqliteDatabase, chain: ChainService = new DisabledChainService()) {
    this.db = db;
    this.chain = chain;
  }

  /**
   * Enroll in the backend group AND the on-chain Semaphore group.
   * If the on-chain transaction fails the database row is removed again,
   * so the two groups (and therefore their Merkle roots) never drift apart.
   */
  public enrollAndSync(
    studentTicket: string,
    commitment: string
  ): Promise<{ success: boolean; error?: string; commitment?: string; txHash?: string }> {
    const run = async () => {
      const result = this.enrollCommitment(studentTicket, commitment);
      if (!result.success || !result.isNew || !this.chain.enabled) {
        return result;
      }
      try {
        const { txHash } = await this.chain.addMember(result.commitment!);
        return { ...result, txHash };
      } catch (err: any) {
        this.removeCommitment(result.commitment!);
        return { success: false, error: `On-chain enrollment failed, enrollment rolled back: ${err.message}` };
      }
    };
    const next = this.enrollQueue.then(run, run);
    this.enrollQueue = next.catch(() => undefined);
    return next;
  }

  private removeCommitment(commitment: string) {
    this.db.prepare('DELETE FROM enrollments WHERE identity_commitment = ?').run(commitment);
  }

  /**
   * Enroll a student's public Semaphore identity commitment after verifying simulated college ticket
   */
  public enrollCommitment(studentTicket: string, commitment: string): { success: boolean; error?: string; commitment?: string; isNew?: boolean } {
    if (!studentTicket || !studentTicket.trim()) {
      return { success: false, error: 'Student Ticket / ID is required' };
    }
    if (!commitment || !commitment.trim()) {
      return { success: false, error: 'Identity commitment is required' };
    }

    // Demo college eligibility check: Ticket must start with STU or be a valid demo ticket
    const cleanTicket = studentTicket.trim();
    if (!cleanTicket.toUpperCase().startsWith('STU') && !cleanTicket.toUpperCase().startsWith('DEMO')) {
      return { success: false, error: 'Invalid college ticket. Demo tickets must start with STU- or DEMO-' };
    }

    const cleanCommitment = commitment.trim();
    const nowIso = new Date().toISOString();

    try {
      const stmt = this.db.prepare(
        'INSERT INTO enrollments (id, identity_commitment, student_ticket, created_at) VALUES (?, ?, ?, ?)'
      );
      stmt.run(crypto.randomUUID(), cleanCommitment, cleanTicket, nowIso);
      return { success: true, commitment: cleanCommitment, isNew: true };
    } catch (err: any) {
      if (err?.code === 'SQLITE_CONSTRAINT' || err?.message?.includes('UNIQUE constraint failed')) {
        // Commitment is already enrolled
        return { success: true, commitment: cleanCommitment, isNew: false };
      }
      return { success: false, error: err.message || 'Failed to enroll commitment' };
    }
  }

  /**
   * Get all enrolled public commitments
   */
  public getEnrolledCommitments(): string[] {
    const rows = this.db.prepare('SELECT identity_commitment FROM enrollments ORDER BY rowid ASC').all() as { identity_commitment: string }[];
    return rows.map((r) => r.identity_commitment);
  }

  /**
   * Reconstruct server Semaphore Group (depth 16)
   */
  public getGroupState(): { commitments: string[]; root: string; depth: number } {
    const commitments = this.getEnrolledCommitments();
    const group = commitments.length > 0 ? new Group(commitments) : new Group();
    return {
      commitments,
      root: group.root.toString(),
      depth: 16,
    };
  }
}
