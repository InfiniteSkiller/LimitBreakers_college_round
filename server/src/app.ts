import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Database as SqliteDatabase } from 'better-sqlite3';
import { defaultDb } from './db/database.js';
import { EnrollmentService } from './services/enrollmentService.js';
import { ReportService } from './services/reportService.js';
import { enrollmentRoutes } from './routes/enrollment.js';
import { reportRoutes } from './routes/reports.js';
import { adminRoutes } from './routes/admin.js';
import { feedbackRoutes } from './routes/feedback.js';
import { healthRoutes } from './routes/health.js';
import { chainRoutes } from './routes/chain.js';
import { ChainService, createChainServiceFromEnv } from './services/chainService.js';
import { TopicService } from './services/topicService.js';

export function buildApp(customDb?: SqliteDatabase, customChain?: ChainService) {
  const app = Fastify({ logger: false });
  const db = customDb || defaultDb;
  const chain = customChain ?? createChainServiceFromEnv();
  const enrollmentService = new EnrollmentService(db, chain);
  const topicService = new TopicService(db, chain);
  const reportService = new ReportService(db, enrollmentService, chain, topicService);

  // On startup, make the on-chain group match the backend group (catches up any
  // members enrolled before the chain was connected, e.g. the seeded demo students).
  // Failing here is deliberate: a misconfigured chain should stop the server, not
  // silently produce proofs the contract will reject.
  app.addHook('onReady', async () => {
    if (!chain.enabled) return;
    const state = enrollmentService.getGroupState();
    const result = await chain.syncMembers(state.commitments, state.root);
    console.log(`⛓️  Chain sync: added ${result.added} member(s). Backend and on-chain roots ${result.rootMatches ? 'MATCH' : 'DO NOT MATCH'}.`);
    if (!result.rootMatches) {
      throw new Error('On-chain Merkle root differs from backend root after sync. Refusing to start.');
    }
  });

  app.register(cors, {
    origin: true,
  });

  app.register(healthRoutes, { chain });
  app.register(chainRoutes, { chain, topicService, enrollmentService });
  app.register(enrollmentRoutes, { enrollmentService });
  app.register(reportRoutes, { reportService, enrollmentService });
  app.register(adminRoutes, { reportService });
  app.register(feedbackRoutes, { reportService });

  return app;
}
