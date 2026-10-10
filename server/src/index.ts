import { buildApp } from './app.js';
import { seedDatabase } from './db/seed.js';

// Automatically load .env file if available in Node 20+
if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {
    // Ignore if not present
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = buildApp();

// Auto-seed database if empty on startup
seedDatabase();

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`🔒 Incognito Backend Server running at ${address}`);
});
