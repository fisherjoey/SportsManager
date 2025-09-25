import express, { Request, Response } from 'express';
import db from '../config/database';

const router = express.Router();

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  database: 'connected' | 'disconnected';
  error?: string;
}

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');

    const response: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'sports-management-backend',
      database: 'connected'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Health check failed:', error);

    const response: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'sports-management-backend',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    res.status(503).json(response);
  }
});

export default router;