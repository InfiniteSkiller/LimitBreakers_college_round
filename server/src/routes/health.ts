import { FastifyInstance } from 'fastify';
import { ChainService } from '../services/chainService.js';

export async function healthRoutes(fastify: FastifyInstance, opts: { chain?: ChainService } = {}) {
  fastify.get('/', async (_request, reply) => {
    return reply.status(200).send({
      service: 'Incognito Privacy Engine API',
      version: '1.0.0-prototype',
      status: 'running',
      docs: '/api/health',
    });
  });

  fastify.get('/api/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'Incognito Privacy Engine API',
      timestamp: new Date().toISOString(),
      version: '1.0.0-prototype',
      verificationMode: opts.chain?.enabled ? 'SEMAPHORE_V4_OFFCHAIN_AND_ONCHAIN' : 'SEMAPHORE_V4_OFFCHAIN',
      chainEnabled: Boolean(opts.chain?.enabled),
    });
  });
}
