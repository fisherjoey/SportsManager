import request from 'supertest';
import express from 'express';
import healthRouter from '../health';

// Mock the database
jest.mock('../../config/database', () => ({
  raw: jest.fn()
}));

const db = require('../../config/database');

const app = express();
app.use('/health', healthRouter);

describe('Health Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return healthy status when database is connected', async () => {
      // Mock successful database connection
      db.raw.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'sports-management-backend',
        database: 'connected'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(db.raw).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return unhealthy status when database connection fails', async () => {
      // Mock database connection failure
      const error = new Error('Database connection failed');
      db.raw.mockRejectedValueOnce(error);

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        service: 'sports-management-backend',
        database: 'disconnected',
        error: 'Database connection failed'
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle unknown errors gracefully', async () => {
      // Mock database connection failure with non-Error object
      db.raw.mockRejectedValueOnce('Unknown error');

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        service: 'sports-management-backend',
        database: 'disconnected',
        error: 'Unknown error'
      });
    });
  });
});