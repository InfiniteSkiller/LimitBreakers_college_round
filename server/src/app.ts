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

export function buildApp(customDb?: SqliteDatabase) {
  const app = Fastify({ logger: false });
  const db = customDb || defaultDb;
  const enrollmentService = new EnrollmentService(db);
  const reportService = new ReportService(db, enrollmentService);

  app.register(cors, {
    origin: true,
  });

  app.register(healthRoutes);
  app.register(enrollmentRoutes, { enrollmentService });
  app.register(reportRoutes, { reportService, enrollmentService });
  app.register(adminRoutes, { reportService });
  app.register(feedbackRoutes, { reportService });

  return app;
}
