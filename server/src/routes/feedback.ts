import { FastifyInstance } from 'fastify';
import { ReportService } from '../services/reportService.js';
import { defaultDb } from '../db/database.js';

export async function feedbackRoutes(fastify: FastifyInstance, opts: { reportService?: ReportService }) {
  const reportService = opts.reportService || new ReportService(defaultDb);

  fastify.get('/api/feedback/summary', async (request, reply) => {
    const query = request.query as { category?: string; scopeId?: string };
    const summaries = reportService.getFeedbackSummary(query.category, query.scopeId);

    return reply.status(200).send({
      summaries,
      note: 'Results are automatically suppressed if contributor count is below the minimum contributor privacy threshold (3).',
    });
  });
}
