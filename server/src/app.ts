import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SqliteDatabase, defaultDb } from './db/database.js';
import { EnrollmentService } from './services/enrollmentService.js';
import { ReportService } from './services/reportService.js';
import { TopicRegistryService } from './services/topicRegistry.js';
import { BlockchainService } from './services/blockchainService.js';
import { enrollmentRoutes } from './routes/enrollment.js';
import { reportRoutes } from './routes/reports.js';
import { topicRoutes } from './routes/topics.js';
import { adminRoutes } from './routes/admin.js';
import { feedbackRoutes } from './routes/feedback.js';
import { healthRoutes } from './routes/health.js';

export function buildApp(customDb?: SqliteDatabase, customBlockchain?: BlockchainService) {
  const app = Fastify({ logger: false });
  const db = customDb || defaultDb;

  const blockchainService = customBlockchain || BlockchainService.fromEnv();
  const topicRegistry = new TopicRegistryService(db);
  const enrollmentService = new EnrollmentService(db, blockchainService);
  const reportService = new ReportService(db, enrollmentService, topicRegistry, blockchainService);

  app.register(cors, {
    origin: true,
  });

  app.register(healthRoutes);
  app.register(enrollmentRoutes, { enrollmentService });
  app.register(reportRoutes, { reportService, enrollmentService });
  app.register(topicRoutes, { topicRegistry });
  app.register(adminRoutes, { reportService });
  app.register(feedbackRoutes, { reportService });

  return app;
}
