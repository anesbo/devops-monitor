import { initDb } from './db';
import { seedDatabase } from './seed';

export async function runInit(): Promise<void> {
  console.log('[DB] Initializing SQLite schema...');
  await initDb();
  console.log('[DB] Seeding database...');
  await seedDatabase();
  console.log('[DB] Database initialized and seeded successfully.');
}

if (require.main === module) {
  runInit().catch((err) => {
    console.error('[DB] Initialization failed:', err);
    process.exit(1);
  });
}
