import { SqliteDatabase } from '../db/database.js';
import crypto from 'node:crypto';
import { Group } from '@semaphore-protocol/group';
import { BlockchainService } from './blockchainService.js';

export interface EnrollmentRecord {
  id: string;
  identity_commitment: string;
  student_ticket: string;
  created_at: string;
}

export class EnrollmentService {
  private db: SqliteDatabase;
  private blockchainService: BlockchainService | null;

  constructor(db: SqliteDatabase, blockchainService?: BlockchainService) {
    this.db = db;
    this.blockchainService = blockchainService || null;
  }

  /**
   * Enroll a student's public Semaphore identity commitment after verifying simulated college ticket.
   * Also syncs the commitment to the on-chain Semaphore group if blockchain is configured.
   */
  public async enrollCommitment(studentTicket: string, commitment: string): Promise<{ success: boolean; error?: string; commitment?: string }> {
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

    let isNewEnrollment = false;
    try {
      const stmt = this.db.prepare(
        'INSERT INTO enrollments (id, identity_commitment, student_ticket, created_at) VALUES (?, ?, ?, ?)'
      );
      stmt.run(crypto.randomUUID(), cleanCommitment, cleanTicket, nowIso);
      isNewEnrollment = true;
    } catch (err: any) {
      if (err?.code === 'SQLITE_CONSTRAINT' || err?.message?.includes('UNIQUE constraint failed')) {
        // Commitment is already enrolled — no need to sync on-chain again
        return { success: true, commitment: cleanCommitment };
      }
      return { success: false, error: err.message || 'Failed to enroll commitment' };
    }

    // Sync new enrollment to on-chain Semaphore group
    if (isNewEnrollment && this.blockchainService?.isConfigured) {
      const result = await this.blockchainService.addMemberOnChain(cleanCommitment);
      if (!result.success) {
        console.warn(`On-chain enrollment sync failed: ${result.error}`);
      }
    }

    return { success: true, commitment: cleanCommitment };
  }

  /**
   * Get all enrolled public commitments
   */
  public getEnrolledCommitments(): string[] {
    const rows = this.db.prepare('SELECT identity_commitment FROM enrollments ORDER BY created_at ASC').all() as { identity_commitment: string }[];
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
