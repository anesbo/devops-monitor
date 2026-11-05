import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { initDb, closeDb } from './db/db';
import { seedDatabase } from './db/seed';
import { startSimulation, stopSimulation } from './services/simulationService';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    console.log('[ApexPulse Server] Bootstrapping backend services...');
    
    // 1. Initialize SQLite Database & Schema
    await initDb();
    
    // 2. Seed initial nodes, alerts, and historical telemetry
    await seedDatabase();
    
    // 3. Start telemetry simulation engine
    startSimulation(3500);

    // 4. Start HTTP Server
    const app = createApp();
    const server = app.listen(PORT, () => {
      console.log(`[ApexPulse Server] Server listening on http://localhost:${PORT}`);
      console.log(`[ApexPulse Server] Observability API live at http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const cleanup = async () => {
      console.log('\n[ApexPulse Server] Shutting down gracefully...');
      stopSimulation();
      server.close();
      await closeDb();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('[ApexPulse Server] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();
