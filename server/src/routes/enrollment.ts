import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EnrollmentService } from '../services/enrollmentService.js';
import { defaultDb } from '../db/database.js';

const enrollSchema = z.object({
  studentTicket: z.string().min(1, 'Student ID / Ticket is required'),
  identityCommitment: z.string().min(1, 'Public identity commitment is required'),
});

export async function enrollmentRoutes(fastify: FastifyInstance, opts: { enrollmentService?: EnrollmentService }) {
  const enrollmentService = opts.enrollmentService || new EnrollmentService(defaultDb);

  // POST /api/enroll - Enroll a student's public commitment into the Semaphore group
  fastify.post('/api/enroll', async (request, reply) => {
    const parseResult = enrollSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    const { studentTicket, identityCommitment } = parseResult.data;
    const result = await enrollmentService.enrollAndSync(studentTicket, identityCommitment);

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({
      success: true,
      commitment: result.commitment,
      txHash: result.txHash,
      message: 'Identity commitment successfully enrolled in the Semaphore group.',
    });
  });

  // GET /api/group/state - Fetch current Semaphore group state (commitments & root)
  fastify.get('/api/group/state', async (_request, reply) => {
    const state = enrollmentService.getGroupState();
    return reply.status(200).send(state);
  });
}
