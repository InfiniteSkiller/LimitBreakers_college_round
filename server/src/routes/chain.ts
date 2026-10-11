import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ChainService } from '../services/chainService.js';
import { EnrollmentService } from '../services/enrollmentService.js';
import { InvalidScopeError, TopicService } from '../services/topicService.js';

export async function chainRoutes(
  fastify: FastifyInstance,
  opts: { chain: ChainService; topicService: TopicService; enrollmentService: EnrollmentService }
) {
  const { chain, topicService, enrollmentService } = opts;

  // GET /api/topics/resolve?scopeId=teaching:2026-Q4
  // The client calls this before generating a proof: it returns the exact value
  // the proof's `scope` must be set to (the on-chain topic ID when chain is on).
  fastify.get('/api/topics/resolve', async (request, reply) => {
    const parsed = z.object({ scopeId: z.string().min(1) }).safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'scopeId query parameter is required' });
    }
    try {
      const topic = await topicService.resolve(parsed.data.scopeId);
      return reply.status(200).send(topic);
    } catch (err: any) {
      if (err instanceof InvalidScopeError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(502).send({ error: `Could not create on-chain topic: ${err.message}` });
    }
  });

  // GET /api/chain/status - deployment info and whether backend + chain groups agree
  fastify.get('/api/chain/status', async (_request, reply) => {
    if (!chain.enabled) {
      return reply.status(200).send({ enabled: false });
    }
    try {
      const status = await chain.status();
      const server = enrollmentService.getGroupState();
      return reply.status(200).send({
        ...status,
        serverRoot: server.root,
        serverMemberCount: server.commitments.length,
        inSync: server.commitments.length === 0 || status.onChainRoot === server.root,
      });
    } catch (err: any) {
      return reply.status(502).send({ enabled: true, error: err.message });
    }
  });
}
