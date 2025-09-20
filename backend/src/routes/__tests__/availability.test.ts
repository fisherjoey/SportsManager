/**
 * @fileoverview Availability Routes Integration Tests
 *
 * Comprehensive test suite for the availability routes following TDD approach.
 * Tests all endpoints with proper authentication, authorization, and data validation.
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock dependencies
const mockDb = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  del: jest.fn(),
  returning: jest.fn(),
  count: jest.fn().mockReturnThis(),
  pluck: jest.fn(),
  raw: jest.fn(),
  transaction: jest.fn()
};

const mockAuth = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', userId: 'test-user-id', role: 'admin', roles: [{ name: 'admin' }] };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAnyRole: jest.fn(() => (req: any, res: any, next: any) => next())
};

// Mock modules
jest.mock('../../config/database', () => mockDb);
jest.mock('../../middleware/auth', () => mockAuth);
jest.mock('joi', () => ({
  object: jest.fn().mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null, value: {} })
  }),
  string: jest.fn().mockReturnThis(),
  array: jest.fn().mockReturnThis(),
  number: jest.fn().mockReturnThis(),
  boolean: jest.fn().mockReturnThis(),
  date: jest.fn().mockReturnThis(),
  valid: jest.fn().mockReturnThis(),
  required: jest.fn().mockReturnThis(),
  min: jest.fn().mockReturnThis(),
  max: jest.fn().mockReturnThis(),
  integer: jest.fn().mockReturnThis(),
  items: jest.fn().mockReturnThis(),
  default: jest.fn().mockReturnThis(),
  uuid: jest.fn().mockReturnThis()
}));

describe('Availability Routes Integration Tests', () => {
  let app: express.Application;
  let availabilityRouter: express.Router;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Import the router after mocks are set up
    availabilityRouter = require('../availability.js');
    app.use('/api/availability', availabilityRouter);
  });

  describe('Route Module Structure', () => {
    it('should be able to import the availability routes module', () => {
      expect(() => {
        require('../availability.js');
      }).not.toThrow();
    });

    it('should export an express router', () => {
      const routeModule = require('../availability.js');
      expect(routeModule).toBeDefined();
      expect(typeof routeModule).toBe('function'); // Express router is a function
    });
  });

  describe('GET /api/availability/referees/:id - Get referee availability', () => {
    const mockAvailability = [
      {
        id: 'avail-1',
        referee_id: 'referee-1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
      }
    ];

    it('should require authentication', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .get('/api/availability/referees/referee-1')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should accept date range filters', async () => {
      mockDb.first.mockResolvedValue(mockAvailability);

      await request(app)
        .get('/api/availability/referees/referee-1')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('date', '>=', '2024-01-01');
      expect(mockDb.where).toHaveBeenCalledWith('date', '<=', '2024-01-31');
    });

    it('should return referee availability windows', async () => {
      mockDb.first.mockImplementation(() => Promise.resolve(mockAvailability));

      const response = await request(app)
        .get('/api/availability/referees/referee-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          refereeId: 'referee-1',
          availability: mockAvailability,
          count: mockAvailability.length
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/availability/referees/referee-1')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch availability');
    });
  });

  describe('POST /api/availability/referees/:id - Create availability window', () => {
    const validAvailabilityData = {
      date: '2024-01-15',
      start_time: '09:00',
      end_time: '17:00',
      is_available: true,
      reason: 'Available for games'
    };

    it('should require authentication and appropriate role', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .send(validAvailabilityData)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Date, start_time, and end_time are required');
    });

    it('should verify referee exists', async () => {
      mockDb.first.mockResolvedValue(null); // Referee not found

      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .send(validAvailabilityData)
        .expect(404);

      expect(response.body.error).toBe('Referee not found');
    });

    it('should check for overlapping windows', async () => {
      mockDb.first.mockResolvedValue({ id: 'referee-1' }); // Referee exists
      mockDb.returning.mockResolvedValue([{ id: 'overlap-1' }]); // Overlapping window

      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .send(validAvailabilityData)
        .expect(409);

      expect(response.body.error).toBe('Overlapping availability window exists');
      expect(response.body.conflicting).toBeDefined();
    });

    it('should create availability window successfully', async () => {
      mockDb.first.mockResolvedValue({ id: 'referee-1' }); // Referee exists
      mockDb.returning
        .mockResolvedValueOnce([]) // No overlapping windows
        .mockResolvedValueOnce([{ id: 'new-window', ...validAvailabilityData }]);

      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .send(validAvailabilityData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('new-window');
    });
  });

  describe('PUT /api/availability/:windowId - Update availability window', () => {
    const validUpdateData = {
      date: '2024-01-16',
      start_time: '10:00',
      end_time: '18:00',
      is_available: false,
      reason: 'Not available'
    };

    it('should require authentication and appropriate role', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .put('/api/availability/window-1')
        .send(validUpdateData)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent window', async () => {
      mockDb.first.mockResolvedValue(null); // Window not found

      const response = await request(app)
        .put('/api/availability/non-existent')
        .send(validUpdateData)
        .expect(404);

      expect(response.body.error).toBe('Availability window not found');
    });

    it('should enforce authorization for referees updating their own windows', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'different-user-id',
          userId: 'different-user-id',
          roles: [{ name: 'referee' }]
        };
        next();
      });

      mockDb.first
        .mockResolvedValueOnce({ id: 'window-1', referee_id: 'referee-1' }) // Existing window
        .mockResolvedValueOnce({ id: 'referee-2', user_id: 'different-user-id' }); // Different referee

      const response = await request(app)
        .put('/api/availability/window-1')
        .send(validUpdateData)
        .expect(403);

      expect(response.body.error).toBe('Can only update your own availability');
    });

    it('should check for overlapping windows when updating', async () => {
      mockDb.first.mockResolvedValue({ id: 'window-1', referee_id: 'referee-1' });
      mockDb.returning.mockResolvedValue([{ id: 'overlap-1' }]); // Overlapping window

      const response = await request(app)
        .put('/api/availability/window-1')
        .send(validUpdateData)
        .expect(409);

      expect(response.body.error).toBe('Overlapping availability window exists');
    });

    it('should update window successfully', async () => {
      mockDb.first.mockResolvedValue({ id: 'window-1', referee_id: 'referee-1' });
      mockDb.returning
        .mockResolvedValueOnce([]) // No overlapping windows
        .mockResolvedValueOnce([{ id: 'window-1', ...validUpdateData }]);

      const response = await request(app)
        .put('/api/availability/window-1')
        .send(validUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('window-1');
    });
  });

  describe('DELETE /api/availability/:windowId - Delete availability window', () => {
    it('should require authentication and appropriate role', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .delete('/api/availability/window-1')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent window', async () => {
      mockDb.first.mockResolvedValue(null); // Window not found

      const response = await request(app)
        .delete('/api/availability/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Availability window not found');
    });

    it('should enforce authorization for referees deleting their own windows', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'different-user-id',
          userId: 'different-user-id',
          roles: [{ name: 'referee' }]
        };
        next();
      });

      mockDb.first
        .mockResolvedValueOnce({ id: 'window-1', referee_id: 'referee-1' }) // Existing window
        .mockResolvedValueOnce({ id: 'referee-2', user_id: 'different-user-id' }); // Different referee

      const response = await request(app)
        .delete('/api/availability/window-1')
        .expect(403);

      expect(response.body.error).toBe('Can only delete your own availability');
    });

    it('should delete window successfully', async () => {
      mockDb.first.mockResolvedValue({ id: 'window-1', referee_id: 'referee-1' });

      const response = await request(app)
        .delete('/api/availability/window-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Availability window deleted successfully');
    });
  });

  describe('GET /api/availability/conflicts - Check scheduling conflicts', () => {
    const mockConflicts = {
      availabilityConflicts: [
        { id: 'conflict-1', referee_name: 'John Doe', reason: 'Not available' }
      ],
      gameConflicts: [
        { id: 'game-conflict-1', referee_name: 'Jane Smith', game_date: '2024-01-15' }
      ]
    };

    it('should require admin role', async () => {
      mockAuth.requireRole.mockImplementation((role: string) =>
        (req: any, res: any, next: any) => {
          if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden' });
          }
          next();
        }
      );

      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', role: 'referee' };
        next();
      });

      const response = await request(app)
        .get('/api/availability/conflicts')
        .query({
          date: '2024-01-15',
          start_time: '09:00',
          end_time: '17:00'
        })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/availability/conflicts')
        .query({})
        .expect(400);

      expect(response.body.error).toBe('Date, start_time, and end_time are required');
    });

    it('should return conflicts for specified time period', async () => {
      mockDb.returning
        .mockResolvedValueOnce(mockConflicts.availabilityConflicts) // Availability conflicts
        .mockResolvedValueOnce(mockConflicts.gameConflicts); // Game conflicts

      const response = await request(app)
        .get('/api/availability/conflicts')
        .query({
          date: '2024-01-15',
          start_time: '09:00',
          end_time: '17:00'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        availabilityConflicts: mockConflicts.availabilityConflicts,
        gameConflicts: mockConflicts.gameConflicts,
        totalConflicts: 2
      });
    });

    it('should filter by specific referee when provided', async () => {
      mockDb.returning.mockResolvedValue([]);

      await request(app)
        .get('/api/availability/conflicts')
        .query({
          date: '2024-01-15',
          start_time: '09:00',
          end_time: '17:00',
          referee_id: 'referee-1'
        })
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('ra.referee_id', 'referee-1');
    });
  });

  describe('POST /api/availability/bulk - Bulk create availability windows', () => {
    const validBulkData = {
      referee_id: 'referee-1',
      windows: [
        { date: '2024-01-15', start_time: '09:00', end_time: '17:00' },
        { date: '2024-01-16', start_time: '10:00', end_time: '18:00' }
      ]
    };

    it('should require authentication and appropriate role', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(validBulkData)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate bulk data structure', async () => {
      const response = await request(app)
        .post('/api/availability/bulk')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('referee_id and windows array are required');
    });

    it('should verify referee exists', async () => {
      mockDb.first.mockResolvedValue(null); // Referee not found

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(validBulkData)
        .expect(404);

      expect(response.body.error).toBe('Referee not found');
    });

    it('should enforce authorization for referees creating their own availability', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'different-user-id',
          userId: 'different-user-id',
          roles: [{ name: 'referee' }]
        };
        next();
      });

      mockDb.first
        .mockResolvedValueOnce({ id: 'referee-1' }) // Referee exists
        .mockResolvedValueOnce({ id: 'referee-2', user_id: 'different-user-id' }); // Different referee

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(validBulkData)
        .expect(403);

      expect(response.body.error).toBe('Can only create availability for yourself');
    });

    it('should validate each window in the bulk request', async () => {
      const invalidBulkData = {
        referee_id: 'referee-1',
        windows: [
          { date: '2024-01-15' }, // Missing required fields
          { start_time: '09:00', end_time: '17:00' } // Missing date
        ]
      };

      mockDb.first.mockResolvedValue({ id: 'referee-1' }); // Referee exists

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(invalidBulkData)
        .expect(400);

      expect(response.body.error).toBe('Each window must have date, start_time, and end_time');
    });

    it('should create windows and skip overlapping ones', async () => {
      mockDb.first.mockResolvedValue({ id: 'referee-1' }); // Referee exists
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback({
          ...mockDb,
          returning: jest.fn()
            .mockResolvedValueOnce([]) // No overlap for first window
            .mockResolvedValueOnce([{ id: 'overlap-1' }]) // Overlap for second window
            .mockResolvedValueOnce([{ id: 'new-window-1' }]) // Created first window
        });
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(validBulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(1);
      expect(response.body.data.skipped).toHaveLength(1);
      expect(response.body.summary.total).toBe(2);
      expect(response.body.summary.created).toBe(1);
      expect(response.body.summary.skipped).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected database errors', async () => {
      mockDb.first.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/availability/referees/referee-1')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch availability');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});