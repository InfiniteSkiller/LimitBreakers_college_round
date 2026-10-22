import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ReportService } from '../services/reportService.js';
import { defaultDb } from '../db/database.js';
import { EnrollmentService } from '../services/enrollmentService.js';

const MODERATOR_TOKEN = process.env.MODERATOR_SECRET_TOKEN || 'moderator-secret-token-2026';

const updateReportSchema = z.object({
  status: z.enum(['approved_for_aggregation', 'needs_sanitization', 'held_for_privacy_review', 'rejected']),
  sanitizedContent: z.string().optional(),
});

export async function adminRoutes(fastify: FastifyInstance, opts: { reportService?: ReportService }) {
  const reportService = opts.reportService ||
    new ReportService(defaultDb, new EnrollmentService(defaultDb));

  // Moderator Auth Middleware hook
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: Moderator authentication token required.' });
    }

    const token = authHeader.substring(7);
    if (token !== MODERATOR_TOKEN) {
      return reply.status(403).send({ error: 'Forbidden: Invalid moderator credentials.' });
    }
  });

  fastify.get('/api/admin/reports', async (request, reply) => {
    const query = request.query as { status?: string };
    const reports = reportService.getModeratorReports(query.status);

    // Verify zero reporter identities are included
    const cleanedReports = reports.map((r) => {
      // Omit any unexpected identity field
      const { id, category, scope_id, content, sanitized_content, status, privacy_flags, is_serious_allegation, created_at, updated_at } = r;
      return {
        id,
        category,
        scopeId: scope_id,
        content,
        sanitizedContent: sanitized_content,
        status,
        privacyFlags: privacy_flags,
        isSeriousAllegation: is_serious_allegation,
        createdAt: created_at,
        updatedAt: updated_at,
      };
    });

    return reply.status(200).send({ reports: cleanedReports });
  });

  fastify.patch('/api/admin/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateReportSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid update payload',
        details: parseResult.error.flatten(),
      });
    }

    const { status, sanitizedContent } = parseResult.data;
    const success = reportService.updateReportStatus(id, status, sanitizedContent);

    if (!success) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    return reply.status(200).send({
      message: 'Report moderation status updated successfully',
      id,
      status,
    });
  });
}
