import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
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
      verificationMode: 'SIMULATION_ZK_INTERFACE',
    });
  });
}
