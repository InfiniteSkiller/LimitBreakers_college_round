import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TopicRegistryService } from '../services/topicRegistry.js';
import { defaultDb } from '../db/database.js';

const createTopicSchema = z.object({
  category: z.string().min(1),
  period: z.string().min(1),
});

export async function topicRoutes(
  fastify: FastifyInstance,
  opts: { topicRegistry?: TopicRegistryService }
) {
  const topicRegistry = opts.topicRegistry || new TopicRegistryService(defaultDb);

  /**
   * GET /api/topics — List all registered topics with their numeric IDs.
   */
  fastify.get('/api/topics', async (_request, reply) => {
    const topics = topicRegistry.listTopics();
    return reply.status(200).send({ topics });
  });

  /**
   * POST /api/topics — Idempotent create-or-get topic.
   * Body: { category, period }
   * Returns the topic record including the numeric topic ID.
   */
  fastify.post('/api/topics', async (request, reply) => {
    const parseResult = createTopicSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid payload',
        details: parseResult.error.flatten(),
      });
    }

    const { category, period } = parseResult.data;
    const topicId = topicRegistry.getOrCreateTopic(category, period);
    const topic = topicRegistry.getTopicById(topicId);

    return reply.status(200).send(topic);
  });

  /**
   * GET /api/topics/resolve?category=X&period=Y
   * Resolves a scope string to a numeric topic ID (creates if needed).
   * The frontend calls this to get the correct scope value for proof generation.
   */
  fastify.get('/api/topics/resolve', async (request, reply) => {
    const { category, period } = request.query as { category?: string; period?: string };
    if (!category || !period) {
      return reply.status(400).send({ error: 'category and period query params required' });
    }

    const topicId = topicRegistry.getOrCreateTopic(category, period);
    return reply.status(200).send({
      topicId,
      scopeId: `${category}:${period}`,
    });
  });
}
