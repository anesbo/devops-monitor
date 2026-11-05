import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { nodesRouter } from './routes/nodes';
import { metricsRouter } from './routes/metrics';
import { alertsRouter } from './routes/alerts';
import { incidentsRouter } from './routes/incidents';
import { systemRouter } from './routes/system';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Mount API routers
  app.use('/api/nodes', nodesRouter);
  app.use('/api/metrics', metricsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/incidents', incidentsRouter);
  app.use('/api/system', systemRouter);
  app.use('/api/logs', systemRouter); // direct alias for client getLogs()

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  return app;
}
