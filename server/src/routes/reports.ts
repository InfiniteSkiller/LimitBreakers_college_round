import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ReportService } from '../services/reportService.js';
import { EnrollmentService } from '../services/enrollmentService.js';
import { defaultDb } from '../db/database.js';

const semaphoreProofSchema = z.object({
  merkleTreeDepth: z.number(),
  merkleTreeRoot: z.string(),
  nullifier: z.string(),
  message: z.string(),
  scope: z.string(),
  points: z.array(z.string()),
});

const submitReportSchema = z.object({
  category: z.string().min(1),
  scopeId: z.string().min(1),
  content: z.string().min(5, 'Report content must be at least 5 characters'),
  proof: semaphoreProofSchema,
});

const MODERATOR_TOKEN = process.env.MODERATOR_SECRET_TOKEN || 'moderator-secret-token-2026';

export async function reportRoutes(
  fastify: FastifyInstance,
  opts: { reportService?: ReportService; enrollmentService?: EnrollmentService }
) {
  const enrollmentService = opts.enrollmentService || new EnrollmentService(defaultDb);
  const reportService = opts.reportService || new ReportService(defaultDb, enrollmentService);

  fastify.post('/api/reports', async (request, reply) => {
    // Prohibit administrators/moderators from submitting feedback reports
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === MODERATOR_TOKEN) {
        return reply.status(403).send({
          error: 'Forbidden: Administrators and staff moderators are not permitted to submit feedback reports.',
        });
      }
    }
    const parseResult = submitReportSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid report submission payload. Must include valid Semaphore proof object.',
        details: parseResult.error.flatten(),
      });
    }

    const result = await reportService.submitReport(parseResult.data);

    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error,
      });
    }

    return reply.status(201).send({
      id: result.reportId,
      status: result.status,
      privacyFlags: result.privacyFlags,
      isSeriousAllegation: result.isSeriousAllegation,
      message: result.status === 'approved_for_aggregation'
        ? 'Report accepted and queued for aggregated feedback.'
        : 'Report received and held for privacy sanitization review.',
    });
  });
}
