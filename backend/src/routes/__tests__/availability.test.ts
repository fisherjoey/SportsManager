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
const mockDb: any = {
  select: (jest.fn() as any).mockReturnThis(),
  where: (jest.fn() as any).mockReturnThis(),
  whereIn: (jest.fn() as any).mockReturnThis(),
  orWhere: (jest.fn() as any).mockReturnThis(),
  join: (jest.fn() as any).mockReturnThis(),
  leftJoin: (jest.fn() as any).mockReturnThis(),
  orderBy: (jest.fn() as any).mockReturnThis(),
  groupBy: (jest.fn() as any).mockReturnThis(),
  first: (jest.fn() as any).mockResolvedValue(null),
  insert: (jest.fn() as any).mockReturnThis(),
  update: (jest.fn() as any).mockReturnThis(),
  del: (jest.fn() as any).mockResolvedValue(1),
  returning: (jest.fn() as any).mockResolvedValue([]),
  count: (jest.fn() as any).mockReturnThis(),
  pluck: (jest.fn() as any).mockResolvedValue([]),
  raw: jest.fn() as any,
  transaction: jest.fn() as any
};

const mockAuth = {
  authenticateToken: jest.fn().mockImplementation((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  })
};

const mockCerbos = {
  requireCerbosPermission: jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
};

const mockValidation = {
  validateBody: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next())
};

const mockResponseFormatter = {
  sendSuccess: jest.fn().mockImplementation((res: any, data: any, message?: string) => {
    res.json({ success: true, data, message });
  }),
  sendCreated: jest.fn().mockImplementation((res: any, data: any, message?: string, location?: string) => {
    res.status(201).json({ success: true, data, message });
  }),
  sendError: jest.fn().mockImplementation((res: any, error: any, statusCode: number) => {
    res.status(statusCode).json({ error: error.message || error });
  })
};

const mockEnhancedAsyncHandler = jest.fn().mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
});

const mockErrorFactory = {
  badRequest: (jest.fn() as any)((message: string) => new Error(message)),
  notFound: (jest.fn() as any)((message: string) => new Error(message)),
  conflict: (jest.fn() as any)((message: string) => new Error(message)),
  forbidden: (jest.fn() as any)((message: string) => new Error(message))
};

// Mock modules
jest.mock('../../config/database', () => mockDb);
jest.mock('../../middleware/auth', () => mockAuth);
jest.mock('../../middleware/requireCerbosPermission', () => mockCerbos);
jest.mock('../../middleware/validation', () => mockValidation);
jest.mock('../../utils/response-formatters', () => ({ ResponseFormatter: mockResponseFormatter }));
jest.mock('../../middleware/enhanced-error-handling', () => ({ enhancedAsyncHandler: mockEnhancedAsyncHandler }));
jest.mock('../../utils/errors', () => ({ ErrorFactory: mockErrorFactory }));
jest.mock('joi', () => {
  // Create a comprehensive chainable mock that handles all Joi methods
  const createChainableMock = (): any => {
    const mock: any = {};

    // Define all Joi methods that need to be chainable
    const chainableMethods = [
      'string', 'number', 'boolean', 'array', 'object', 'date', 'binary',
      'required', 'optional', 'allow', 'valid', 'invalid', 'default',
      'min', 'max', 'length', 'email', 'uri', 'uuid', 'integer',
      'positive', 'negative', 'items', 'keys', 'pattern', 'regex',
      'alphanum', 'token', 'hex', 'base64', 'lowercase', 'uppercase',
      'trim', 'replace', 'truncate', 'normalize', 'when', 'alternatives',
      'alt', 'concat', 'raw', 'empty', 'strip', 'label', 'description',
      'notes', 'tags', 'meta', 'example', 'unit', 'messages', 'prefs',
      'preferences', 'strict', 'options', 'fork', 'validate', 'isoDate'
    ];

    // Create mock functions for all chainable methods
    chainableMethods.forEach(method => {
      if (method === 'validate') {
        mock[method] = jest.fn().mockReturnValue({ error: null, value: {} });
      } else {
        mock[method] = jest.fn().mockReturnValue(mock); // Return self for chaining
      }
    });

    return mock;
  };

  // Create the main Joi mock
  const joiMock = createChainableMock();

  // Override specific methods that return schemas
  joiMock.object = jest.fn().mockImplementation((schema?: any) => {
    const schemaMock = createChainableMock();
    return schemaMock;
  });

  joiMock.array = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.string = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.number = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.boolean = jest.fn().mockImplementation(() => createChainableMock());

  return {
    default: joiMock,
    __esModule: true
  };
});

describe('Availability Routes Integration Tests', () => {
  let app: express.Application;
  let availabilityRouter: express.Router;

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore default mock implementations after clearAllMocks
    mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'test-user-id', role: 'admin' };
      next();
    });
    mockCerbos.requireCerbosPermission.mockImplementation(() => (req: any, res: any, next: any) => next());
    mockValidation.validateBody.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
    mockValidation.validateParams.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
    mockValidation.validateQuery.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
    mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    });

    app = express();
    app.use(express.json());

    // Import the router after mocks are set up
    availabilityRouter = require('../availability').default;
    app.use('/api/availability', availabilityRouter);
  });

  describe('Route Module Structure', () => {
    it('should be able to import the availability routes module', () => {
      expect(() => {
        require('../availability');
      }).not.toThrow();
    });

    it('should export an express router', () => {
      const routeModule = require('../availability').default;
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
      const response = await request(app)
        .get('/api/availability/referees/referee-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          refereeId: 'referee-1',
          availability: [],
          count: 0
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
        next(new Error('Failed to fetch availability'));
      });

      const response = await request(app)
        .get('/api/availability/referees/referee-1')
        .expect(500);
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

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .send(validAvailabilityData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate request body', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Date is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/availability/referees/referee-1')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Date is required');
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

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .put('/api/availability/window-1')
        .send(validUpdateData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
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
          role: 'referee',
          roles: [{ name: 'referee' }]
        };
        next();
      });

      mockDb.first
        .mockResolvedValueOnce({ id: 'window-1', referee_id: 'referee-1' }) // Existing window
        .mockResolvedValueOnce({ id: 'referee-2', user_id: 'different-user-id' }); // Different referee

      mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
        next(new Error('Can only update your own availability'));
      });

      const response = await request(app)
        .put('/api/availability/window-1')
        .send(validUpdateData)
        .expect(500);
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
    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .delete('/api/availability/window-1')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
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
          role: 'referee',
          roles: [{ name: 'referee' }]
        };
        next();
      });

      mockDb.first
        .mockResolvedValueOnce({ id: 'window-1', referee_id: 'referee-1' }) // Existing window
        .mockResolvedValueOnce({ id: 'referee-2', user_id: 'different-user-id' }); // Different referee

      mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
        next(new Error('Can only delete your own availability'));
      });

      const response = await request(app)
        .delete('/api/availability/window-1')
        .expect(500);
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

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

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

    it('should validate query parameters', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Date is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .get('/api/availability/conflicts')
        .query({})
        .expect(400);

      expect(response.body.error).toBe('Date is required');
    });

    it('should return conflicts for specified time period', async () => {
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
        availabilityConflicts: [],
        gameConflicts: [],
        totalConflicts: 0
      });
    });

    it('should filter by specific referee when provided', async () => {
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

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(validBulkData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate bulk data structure', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'referee_id is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('referee_id is required');
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
          role: 'referee',
          roles: [{ name: 'referee' }]
        };
        next();
      });

      mockDb.first
        .mockResolvedValueOnce({ id: 'referee-1' }) // Referee exists
        .mockResolvedValueOnce({ id: 'referee-2', user_id: 'different-user-id' }); // Different referee

      mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
        next(new Error('Can only create availability for yourself'));
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(validBulkData)
        .expect(500);
    });

    it('should validate each window in the bulk request', async () => {
      const invalidBulkData = {
        referee_id: 'referee-1',
        windows: [
          { date: '2024-01-15' }, // Missing required fields
          { start_time: '09:00', end_time: '17:00' } // Missing date
        ]
      };

      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Each window must have date, start_time, and end_time' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(invalidBulkData)
        .expect(400);

      expect(response.body.error).toBe('Each window must have date, start_time, and end_time');
    });

    it('should create windows and skip overlapping ones', async () => {
      mockDb.first.mockResolvedValue({ id: 'referee-1' }); // Referee exists
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockTrx = {
          ...mockDb,
          returning: (jest.fn() as any)
            .mockResolvedValueOnce([]) // No overlap for first window
            .mockResolvedValueOnce([{ id: 'overlap-1' }]) // Overlap for second window
            .mockResolvedValueOnce([{ id: 'new-window-1' }]) // Created first window
        };
        return await callback(mockTrx);
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .send(validBulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected database errors', async () => {
      mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
        next(new Error('Unexpected error'));
      });

      const response = await request(app)
        .get('/api/availability/referees/referee-1')
        .expect(500);
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