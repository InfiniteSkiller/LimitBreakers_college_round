import { buildApp } from './app.js';
import { seedDatabase } from './db/seed.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

async function main() {
  // Seed first so the chain sync (which runs when the app becomes ready)
  // sees every demo enrollment.
  await seedDatabase();

  const app = buildApp();
  try {
    const address = await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🔒 Incognito Backend Server running at ${address}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
