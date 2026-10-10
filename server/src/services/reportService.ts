import { Database as SqliteDatabase } from 'better-sqlite3';
import crypto from 'node:crypto';
import { SemaphoreMembershipVerifier, SemaphoreProofInput } from './verifier.js';
import { EnrollmentService } from './enrollmentService.js';
import { PrivacyRiskGate } from './privacyGate.js';

export interface SubmitReportInput {
  category: string;
  scopeId: string;
  content: string;
  proof: SemaphoreProofInput;
}

export interface ReportRecord {
  id: string;
  category: string;
  scope_id: string;
  content: string;
  sanitized_content?: string;
  status: string;
  privacy_flags: string[];
  is_serious_allegation: boolean;
  created_at: string;
  updated_at: string;
}

export interface AggregateSummary {
  category: string;
  scopeId: string;
  totalContributors: number;
  thresholdMet: boolean;
  minThreshold: number;
  sanitizedExcerpts?: string[];
  message?: string;
}

export class ReportService {
  private db: SqliteDatabase;
  private verifier: SemaphoreMembershipVerifier;
  private static MIN_AGGREGATE_THRESHOLD = 3;

  constructor(db: SqliteDatabase, enrollmentService: EnrollmentService) {
    this.db = db;
    this.verifier = new SemaphoreMembershipVerifier(enrollmentService);
  }

  public async submitReport(input: SubmitReportInput): Promise<{
    success: boolean;
    reportId?: string;
    status?: string;
    privacyFlags?: string[];
    isSeriousAllegation?: boolean;
    error?: string;
    statusCode: number;
  }> {
    const { category, scopeId, content, proof } = input;

    if (!category || !scopeId || !content || !proof) {
      return { success: false, error: 'Missing required report fields or ZK proof', statusCode: 400 };
    }

    // 1. Enforce canonical scope format category:period
    const expectedPrefix = `${category}:`;
    if (!scopeId.startsWith(expectedPrefix)) {
      return {
        success: false,
        error: `Canonical scope mismatch. Expected scope for category '${category}' to start with '${expectedPrefix}', got '${scopeId}'`,
        statusCode: 400,
      };
    }

    // 2. Verify real Semaphore ZK membership proof & root against trusted server group
    const verification = await this.verifier.verifyMembershipProof(proof, scopeId, content);
    if (!verification.isValid || !verification.nullifier) {
      return {
        success: false,
        error: `Membership verification failed: ${verification.error || 'Invalid proof'}`,
        statusCode: 401,
      };
    }

    const nullifier = verification.nullifier;
    const nullifierId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 3. Register Nullifier uniquely for scope_id (Enforces scope-specific duplicate prevention)
    try {
      const insertNullifierStmt = this.db.prepare(
        'INSERT INTO nullifiers (id, scope_id, nullifier, created_at) VALUES (?, ?, ?, ?)'
      );
      
      insertNullifierStmt.run(nullifierId, scopeId, nullifier, nowIso);
    } catch (err: any) {
      if (err?.code === 'SQLITE_CONSTRAINT' || err?.message?.includes('UNIQUE constraint failed')) {
        return {
          success: false,
          error: `Duplicate Submission Rejected: A report using this verified membership identity has already been submitted for scope '${scopeId}'.`,
          statusCode: 409, // Conflict
        };
      }
      throw err;
    }

    // 4. Privacy Risk Gate Analysis
    const privacyAnalysis = PrivacyRiskGate.analyzeReport(content);

    // 5. Save Report (No student ID, secret, or identity commitment is stored in the report record!)
    const reportId = crypto.randomUUID();
    const insertReportStmt = this.db.prepare(`
      INSERT INTO reports (
        id, category, scope_id, content, sanitized_content, status, privacy_flags, is_serious_allegation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertReportStmt.run(
      reportId,
      category,
      scopeId,
      content,
      privacyAnalysis.sanitizedContent || null,
      privacyAnalysis.status,
      JSON.stringify(privacyAnalysis.privacyFlags),
      privacyAnalysis.isSeriousAllegation ? 1 : 0,
      nowIso,
      nowIso
    );

    return {
      success: true,
      reportId,
      status: privacyAnalysis.status,
      privacyFlags: privacyAnalysis.privacyFlags,
      isSeriousAllegation: privacyAnalysis.isSeriousAllegation,
      statusCode: 201,
    };
  }

  public getModeratorReports(statusFilter?: string): ReportRecord[] {
    let sql = 'SELECT id, category, scope_id, content, sanitized_content, status, privacy_flags, is_serious_allegation, created_at, updated_at FROM reports';
    const params: any[] = [];

    if (statusFilter && statusFilter !== 'all') {
      sql += ' WHERE status = ?';
      params.push(statusFilter);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      scope_id: r.scope_id,
      content: r.content,
      sanitized_content: r.sanitized_content || undefined,
      status: r.status,
      privacy_flags: JSON.parse(r.privacy_flags || '[]'),
      is_serious_allegation: Boolean(r.is_serious_allegation),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public updateReportStatus(id: string, status: string, sanitizedContent?: string): boolean {
    const nowIso = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE reports
      SET status = ?, sanitized_content = COALESCE(?, sanitized_content), updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, sanitizedContent || null, nowIso, id);
    return result.changes > 0;
  }

  public getFeedbackSummary(categoryFilter?: string, scopeFilter?: string): AggregateSummary[] {
    let sql = `
      SELECT category, scope_id, COUNT(*) as contributor_count
      FROM reports
      WHERE status = 'approved_for_aggregation'
    `;
    const params: any[] = [];

    if (categoryFilter && categoryFilter !== 'all') {
      sql += ' AND category = ?';
      params.push(categoryFilter);
    }
    if (scopeFilter && scopeFilter !== 'all') {
      sql += ' AND scope_id = ?';
      params.push(scopeFilter);
    }

    sql += ' GROUP BY category, scope_id';

    const aggregates = this.db.prepare(sql).all(...params) as any[];

    return aggregates.map((ag) => {
      const totalContributors = ag.contributor_count;
      const thresholdMet = totalContributors >= ReportService.MIN_AGGREGATE_THRESHOLD;

      if (!thresholdMet) {
        return {
          category: ag.category,
          scopeId: ag.scope_id,
          totalContributors,
          thresholdMet: false,
          minThreshold: ReportService.MIN_AGGREGATE_THRESHOLD,
          message: `Results suppressed: Contributor count (${totalContributors}) is below the required privacy threshold of ${ReportService.MIN_AGGREGATE_THRESHOLD} contributors.`,
        };
      }

      const excerptsStmt = this.db.prepare(`
        SELECT COALESCE(sanitized_content, content) as excerpt
        FROM reports
        WHERE status = 'approved_for_aggregation' AND category = ? AND scope_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `);
      const excerptRows = excerptsStmt.all(ag.category, ag.scope_id) as any[];

      return {
        category: ag.category,
        scopeId: ag.scope_id,
        totalContributors,
        thresholdMet: true,
        minThreshold: ReportService.MIN_AGGREGATE_THRESHOLD,
        sanitizedExcerpts: excerptRows.map((e) => e.excerpt),
      };
    });
  }
}
