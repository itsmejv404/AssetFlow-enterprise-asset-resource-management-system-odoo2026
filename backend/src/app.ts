import express, { Request, Response } from 'express';
import { AppDataSource } from './config/data-source';
import { authRouter } from './routes/auth.routes';
import { dashboardRouter } from './routes/dashboard.routes';

export const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'assetflow-api' });
});

app.get('/health', async (_req: Request, res: Response) => {
  if (!AppDataSource.isInitialized) {
    return res.status(503).json({ status: 'ok', db: 'disconnected' });
  }

  try {
    await AppDataSource.query('SELECT 1');
    return res.json({ status: 'ok', db: 'connected' });
  } catch {
    return res.status(503).json({ status: 'ok', db: 'disconnected' });
  }
});