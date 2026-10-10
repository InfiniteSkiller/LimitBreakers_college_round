import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifierInstance } from '../services/verifier.js';

const demoVerificationSchema = z.object({
  studentTicket: z.string().min(1, 'Student ID / Ticket is required'),
  scopeId: z.string().min(3, 'Scope ID is required'),
});

export async function verificationRoutes(fastify: FastifyInstance) {
  fastify.post('/api/verification/demo', async (request, reply) => {
    const parseResult = demoVerificationSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    const { studentTicket, scopeId } = parseResult.data;

    try {
      const proof = await verifierInstance.generateDemoProof(studentTicket, scopeId);

      return reply.status(200).send({
        valid: true,
        scopeId: proof.scopeId,
        nullifier: proof.nullifier,
        proofToken: proof.proofToken,
        isSimulated: true,
        disclaimer: '[DEMO SIMULATION] This verification simulates ZK nullifier derivation H(Secret, Scope). Production uses Semaphore Circom ZKP.',
      });
    } catch (err: any) {
      return reply.status(400).send({
        valid: false,
        error: err.message || 'Failed to generate demo proof',
      });
    }
  });
}
