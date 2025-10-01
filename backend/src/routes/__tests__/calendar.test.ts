/**
 * @fileoverview Calendar Routes Integration Tests
 *
 * Comprehensive test suite for the calendar routes following TDD approach.
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
  transaction: jest.fn() as any,
  // For the main query method
  then: jest.fn()
};

const mockCacheHelpers: any = {
  cacheAggregation: (jest.fn() as any).mockResolvedValue({ calendar: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } }),
  cachePaginatedQuery: (jest.fn() as any).mockResolvedValue(null),
  cacheLookupData: (jest.fn() as any).mockResolvedValue([])
};

const mockCacheInvalidation = {
  invalidateCalendar: jest.fn()
};

const mockQueryBuilder = {
  validatePaginationParams: jest.fn().mockImplementation((params: any) => ({
    page: parseInt(params.page) || 1,
    limit: parseInt(params.limit) || 50
  })),
  applyCommonFilters: jest.fn().mockReturnValue(mockDb),
  buildCountQuery: jest.fn().mockReturnValue(Promise.resolve([{ count: 0 }])),
  applyPagination: jest.fn().mockReturnValue(mockDb)
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
  conflict: (jest.fn() as any)((message: string) => new Error(message))
};

const mockICSParser = {
  isValidICS: jest.fn().mockReturnValue(true),
  parse: jest.fn().mockReturnValue({ events: [] }),
  eventsToGameData: jest.fn().mockReturnValue([])
};

const mockUpload = {
  single: jest.fn().mockReturnValue((req: any, res: any, next: any) => next())
};

const mockMulter: any = jest.fn().mockImplementation(() => mockUpload);
mockMulter.memoryStorage = jest.fn().mockReturnValue({});
mockMulter.diskStorage = jest.fn().mockReturnValue({});

const mockUuid = {
  v4: jest.fn().mockReturnValue('test-uuid-123')
};

// Mock modules
jest.mock('multer', () => mockMulter);
jest.mock('uuid', () => mockUuid);
jest.mock('../../config/database', () => mockDb);
jest.mock('../../utils/query-cache', () => ({
  queryCache: {},
  CacheHelpers: mockCacheHelpers,
  CacheInvalidation: mockCacheInvalidation
}));
jest.mock('../../utils/query-builders', () => ({
  QueryBuilder: mockQueryBuilder,
  QueryHelpers: {}
}));
jest.mock('../../middleware/auth', () => mockAuth);
jest.mock('../../middleware/requireCerbosPermission', () => mockCerbos);
jest.mock('../../middleware/validation', () => mockValidation);
jest.mock('../../utils/response-formatters', () => ({ ResponseFormatter: mockResponseFormatter }));
jest.mock('../../middleware/enhanced-error-handling', () => ({ enhancedAsyncHandler: mockEnhancedAsyncHandler }));
jest.mock('../../utils/errors', () => ({ ErrorFactory: mockErrorFactory }));
jest.mock('../../utils/ics-parser', () => ({
  ICSParser: mockICSParser
}));
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
      'preferences', 'strict', 'options', 'fork', 'validate', 'iso'
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
  joiMock.date = jest.fn().mockImplementation(() => createChainableMock());

  return {
    default: joiMock,
    __esModule: true
  };
});

describe('Calendar Routes Integration Tests', () => {
  let app: express.Application;
  let calendarRouter: express.Router;

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
    mockQueryBuilder.validatePaginationParams.mockImplementation((params: any) => ({
      page: parseInt(params.page) || 1,
      limit: parseInt(params.limit) || 50
    }));
    mockQueryBuilder.applyCommonFilters.mockReturnValue(mockDb);
    mockQueryBuilder.buildCountQuery.mockReturnValue(Promise.resolve([{ count: 0 }]));
    mockQueryBuilder.applyPagination.mockReturnValue(mockDb);
    mockCacheHelpers.cacheAggregation.mockResolvedValue({ calendar: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
    mockCacheHelpers.cachePaginatedQuery.mockResolvedValue(null);
    mockCacheHelpers.cacheLookupData.mockResolvedValue([]);

    // Reset mock database to return empty results by default
    mockDb.first.mockResolvedValue(null);
    mockDb.update.mockResolvedValue([]);
    mockDb.raw.mockResolvedValue([]);
    // Reset the main query method to return empty array
    mockDb.then.mockImplementation((callback: Function) => callback([]));

    app = express();
    app.use(express.json());

    // Import the router after mocks are set up
    calendarRouter = require('../calendar').default;
    app.use('/api/calendar', calendarRouter);
  });

  describe('Route Module Structure', () => {
    it('should be able to import the calendar routes module', () => {
      expect(() => {
        require('../calendar');
      }).not.toThrow();
    });

    it('should export an express router', () => {
      const routeModule = require('../calendar').default;
      expect(routeModule).toBeDefined();
      expect(typeof routeModule).toBe('function'); // Express router is a function
    });
  });

  describe('GET /referees/:id/calendar/ical', () => {
    const mockReferee = {
      id: 'referee-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'referee'
    };

    const mockAssignments = [
      {
        assignment_id: 'assignment-1',
        assignment_status: 'accepted',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        wage: '50.00',
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        game_type: 'Regular',
        notes: 'Test game notes',
        position_name: 'Referee',
        location_name: 'Main Field',
        location_address: '123 Sports Ave',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        league_name: 'Youth League'
      },
      {
        assignment_id: 'assignment-2',
        assignment_status: 'pending',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        wage: '60.00',
        game_id: 'game-2',
        game_date: '2024-02-16',
        game_time: '20:00:00',
        level: 'Adult',
        game_type: 'Playoff',
        notes: null,
        position_name: 'Assistant Referee',
        location_name: 'Field 2',
        location_address: '456 Sports Blvd',
        home_team_name: 'Eagles',
        away_team_name: 'Hawks',
        league_name: 'Adult League'
      }
    ];

    it('should generate iCal feed for valid referee', async () => {
      // Mock referee lookup
      mockDb.first.mockResolvedValue(mockReferee);
      // Mock assignments query
      mockDb.then.mockImplementation((callback: Function) => callback(mockAssignments));

      const response = await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          calendar_name: 'Test Calendar',
          timezone: 'America/New_York'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/calendar/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
      expect(response.headers['content-disposition']).toMatch(/John_Doe_schedule\.ics/);

      const icalContent = response.text;
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).toContain('Test Calendar - John Doe');
      expect(icalContent).toContain('TZID:America/New_York');

      // Check for events
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('SUMMARY:Referee - Lions vs Tigers');
      expect(icalContent).toContain('SUMMARY:Assistant Referee - Eagles vs Hawks');
      expect(icalContent).toContain('LOCATION:Main Field, 123 Sports Ave');
      expect(icalContent).toContain('STATUS:CONFIRMED'); // accepted assignment
      expect(icalContent).toContain('STATUS:TENTATIVE'); // pending assignment
    });

    it('should return 404 for non-existent referee', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/calendar/referees/non-existent/calendar/ical')
        .expect(404);

      expect(response.body.error).toBe('Referee not found');
    });

    it('should validate query parameters', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Invalid date format' }] },
          value: null
        })
      });

      const response = await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .query({
          start_date: 'invalid-date',
          timezone: 'invalid-timezone'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should use default date range when not specified', async () => {
      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .expect(200);

      // Verify that date filters were applied (checking that where was called with date filters)
      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '>=', expect.any(String));
      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '<=', expect.any(String));
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate calendar feed');
    });

    it('should filter assignments by status', async () => {
      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .get('/api/calendar/referees/referee-123/calendar/ical')
        .expect(200);

      expect(mockDb.whereIn).toHaveBeenCalledWith('game_assignments.status', ['pending', 'accepted', 'completed']);
    });
  });

  describe('GET /games/calendar-feed', () => {
    const mockGames = [
      {
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        game_type: 'Regular',
        status: 'unassigned',
        refs_needed: 2,
        pay_rate: '50.00',
        notes: 'Regular season game',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        location_name: 'Main Field',
        location_address: '123 Sports Ave',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        league_name: 'Youth League'
      }
    ];

    const mockAssignments = [
      {
        assignment_id: 'assignment-1',
        game_id: 'game-1',
        assignment_status: 'accepted',
        wage: '50.00',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        position_name: 'Referee',
        referee_name: 'John Doe'
      }
    ];

    it('should generate games calendar feed with authentication', async () => {
      mockDb.then.mockImplementation((callback: Function) => callback(mockGames));

      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          calendar_name: 'Games Schedule'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/calendar/);
      expect(response.headers['content-disposition']).toMatch(/games_schedule\.ics/);

      const icalContent = response.text;
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('Games Schedule');
      expect(icalContent).toContain('SUMMARY:Game - Lions vs Tigers');
    });

    it('should include assignments when requested', async () => {
      // First call returns games, second call returns assignments
      let callCount = 0;
      mockDb.then.mockImplementation((callback: Function) => {
        if (callCount === 0) {
          callCount++;
          return callback(mockGames);
        } else {
          return callback(mockAssignments);
        }
      });

      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          include_assignments: 'true'
        })
        .expect(200);

      const icalContent = response.text;
      expect(icalContent).toContain('SUMMARY:Referee (John Doe) - Lions vs Tigers');
    });

    it('should apply filters correctly', async () => {
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          level: 'Youth',
          game_type: 'Regular',
          location_id: 'loc-123',
          league_id: 'league-456',
          status: 'unassigned'
        })
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('games.level', 'Youth');
      expect(mockDb.where).toHaveBeenCalledWith('games.game_type', 'Regular');
      expect(mockDb.where).toHaveBeenCalledWith('games.location_id', 'loc-123');
      expect(mockDb.where).toHaveBeenCalledWith('leagues.id', 'league-456');
      expect(mockDb.where).toHaveBeenCalledWith('games.status', 'unassigned');
    });

    it('should require authentication', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should validate query parameters', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Invalid status value' }] },
          value: null
        })
      });

      const response = await request(app)
        .get('/api/calendar/games/calendar-feed')
        .query({
          status: 'invalid-status'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /sync', () => {
    const mockOrgSettings = {
      id: 'org-1',
      name: 'Test Organization',
      calendar_sync_enabled: false
    };

    it('should configure calendar sync for admin users', async () => {
      mockDb.first.mockResolvedValue(mockOrgSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]); // Mock column exists
      mockDb.update.mockResolvedValue([1]);

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics',
          sync_direction: 'import',
          auto_sync: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.syncSettings).toEqual({
        calendarUrl: 'https://calendar.example.com/feed.ics',
        syncDirection: 'import',
        autoSync: true,
        enabled: true
      });

      expect(mockDb.update).toHaveBeenCalledWith({
        calendar_sync_url: 'https://calendar.example.com/feed.ics',
        calendar_sync_direction: 'import',
        calendar_auto_sync: true,
        calendar_sync_enabled: true,
        updated_at: expect.any(Date)
      });
    });

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate request body', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Invalid calendar URL' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'invalid-url',
          sync_direction: 'invalid-direction'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing organization settings', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(404);

      expect(response.body.error).toBe('Organization settings not found');
    });

    it('should handle schema updates requirement', async () => {
      mockDb.first.mockResolvedValue(mockOrgSettings);
      mockDb.raw.mockResolvedValue([]); // Mock no calendar columns exist

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(501);

      expect(response.body.error).toBe('Calendar sync feature requires database schema updates');
    });

    it('should handle database column errors', async () => {
      mockDb.first.mockResolvedValue(mockOrgSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);
      mockDb.update.mockRejectedValue(new Error('no such column: calendar_sync_url'));

      const response = await request(app)
        .post('/api/calendar/sync')
        .send({
          calendar_url: 'https://calendar.example.com/feed.ics'
        })
        .expect(501);

      expect(response.body.error).toBe('Calendar sync feature requires database schema updates');
    });
  });

  describe('GET /sync/status', () => {
    it('should return calendar sync status for admin users', async () => {
      const mockSettings = {
        calendar_sync_enabled: true,
        calendar_sync_url: 'https://calendar.example.com/feed.ics',
        calendar_sync_direction: 'import',
        calendar_auto_sync: true,
        calendar_last_sync_at: '2024-01-01T10:00:00Z',
        calendar_last_sync_status: 'success'
      };

      mockDb.first.mockResolvedValue(mockSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);

      const response = await request(app)
        .get('/api/calendar/sync/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.syncEnabled).toBe(true);
      expect(response.body.data.syncSettings).toEqual({
        calendarUrl: 'https://calendar.example.com/feed.ics',
        syncDirection: 'import',
        autoSync: true,
        lastSyncAt: '2024-01-01T10:00:00Z',
        lastSyncStatus: 'success'
      });
    });

    it('should return requires setup when schema is missing', async () => {
      mockDb.first.mockResolvedValue({});
      mockDb.raw.mockResolvedValue([]); // No calendar columns

      const response = await request(app)
        .get('/api/calendar/sync/status')
        .expect(200);

      expect(response.body.data.syncEnabled).toBe(false);
      expect(response.body.data.requiresSetup).toBe(true);
      expect(response.body.data.message).toContain('database schema updates');
    });

    it('should return disabled status when sync is not enabled', async () => {
      mockDb.first.mockResolvedValue({ calendar_sync_enabled: false });
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);

      const response = await request(app)
        .get('/api/calendar/sync/status')
        .expect(200);

      expect(response.body.data.syncEnabled).toBe(false);
      expect(response.body.data.syncSettings).toBeNull();
    });
  });

  describe('DELETE /sync', () => {
    it('should disable calendar sync for admin users', async () => {
      const mockSettings = {
        calendar_sync_enabled: true,
        calendar_sync_url: 'https://calendar.example.com/feed.ics'
      };

      mockDb.first.mockResolvedValue(mockSettings);
      mockDb.raw.mockResolvedValue([{ name: 'calendar_sync_url' }]);
      mockDb.update.mockResolvedValue([1]);

      const response = await request(app)
        .delete('/api/calendar/sync')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Calendar sync disabled successfully');

      expect(mockDb.update).toHaveBeenCalledWith({
        calendar_sync_enabled: false,
        calendar_sync_url: null,
        calendar_sync_direction: null,
        calendar_auto_sync: false,
        updated_at: expect.any(Date)
      });
    });

    it('should handle missing calendar sync schema', async () => {
      mockDb.first.mockResolvedValue({});
      mockDb.raw.mockResolvedValue([]); // No calendar columns

      const response = await request(app)
        .delete('/api/calendar/sync')
        .expect(404);

      expect(response.body.error).toBe('Calendar sync feature not available');
    });

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .delete('/api/calendar/sync')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('iCal Content Generation', () => {
    it('should generate valid iCal format', async () => {
      const mockReferee = { id: 'ref-1', name: 'John Doe', role: 'referee' };
      const mockAssignments = [{
        assignment_id: 'assignment-1',
        assignment_status: 'accepted',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        wage: '50.00',
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        game_type: 'Regular',
        notes: 'Test notes',
        position_name: 'Referee',
        location_name: 'Main Field',
        location_address: '123 Sports Ave',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        league_name: 'Youth League'
      }];

      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback(mockAssignments));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(200);

      const icalContent = response.text;

      // Verify iCal structure
      expect(icalContent).toMatch(/^BEGIN:VCALENDAR/);
      expect(icalContent).toMatch(/END:VCALENDAR\s*$/);
      expect(icalContent).toContain('VERSION:2.0');
      expect(icalContent).toContain('PRODID:-//Sports Management App//Referee Calendar//EN');

      // Verify timezone
      expect(icalContent).toContain('BEGIN:VTIMEZONE');
      expect(icalContent).toContain('TZID:America/New_York');

      // Verify event structure
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('END:VEVENT');
      expect(icalContent).toContain('UID:game-game-1-assignment-assignment-1@sportsmanagement.app');
      expect(icalContent).toContain('DTSTART;TZID=America/New_York:');
      expect(icalContent).toContain('DTEND;TZID=America/New_York:');

      // Verify event content
      expect(icalContent).toContain('SUMMARY:Referee - Lions vs Tigers');
      expect(icalContent).toContain('LOCATION:Main Field, 123 Sports Ave');
      expect(icalContent).toContain('STATUS:CONFIRMED');
      expect(icalContent).toContain('CATEGORIES:REFEREE,YOUTH,REGULAR');
    });

    it('should handle missing event data gracefully', async () => {
      const mockReferee = { id: 'ref-1', name: 'John Doe', role: 'referee' };
      const mockAssignments = [{
        assignment_id: 'assignment-1',
        assignment_status: 'pending',
        game_id: 'game-1',
        game_date: '2024-02-15',
        game_time: '18:00:00',
        level: 'Youth',
        position_name: 'Referee',
        home_team_name: 'Lions',
        away_team_name: 'Tigers',
        // Missing optional fields
        location_name: null,
        location_address: null,
        notes: null,
        wage: null,
        game_type: null
      }];

      mockDb.first.mockResolvedValue(mockReferee);
      mockDb.then.mockImplementation((callback: Function) => callback(mockAssignments));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(200);

      const icalContent = response.text;
      expect(icalContent).toContain('SUMMARY:Referee - Lions vs Tigers');
      expect(icalContent).toContain('STATUS:TENTATIVE'); // pending status
      expect(icalContent).toContain('LOCATION:'); // empty location
    });
  });

  describe('POST /api/calendar/upload - Upload calendar file', () => {
    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from('BEGIN:VCALENDAR\nEND:VCALENDAR'), 'test.ics')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should require calendar file', async () => {
      const response = await request(app)
        .post('/api/calendar/upload')
        .expect(400);

      expect(response.body.error.message).toContain('No calendar file provided');
    });

    it('should validate ICS format', async () => {
      mockICSParser.isValidICS.mockReturnValue(false);

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from('INVALID ICS'), 'test.ics')
        .expect(400);

      expect(response.body.error.message).toContain('Invalid ICS calendar file format');
    });

    it('should process valid calendar file', async () => {
      mockICSParser.isValidICS.mockReturnValue(true);
      mockICSParser.parse.mockReturnValue({
        events: [{ summary: 'Test Event', dtstart: '20240101T100000Z' }]
      });
      mockICSParser.eventsToGameData.mockReturnValue([{
        gameDate: '2024-01-01',
        gameTime: '10:00',
        homeTeamName: 'Team A',
        awayTeamName: 'Team B'
      }]);

      const response = await request(app)
        .post('/api/calendar/upload')
        .attach('calendar', Buffer.from('BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR'), 'test.ics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Successfully processed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.first.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate calendar feed');
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockDb.first.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(500);

      expect(response.body.details).toBe('Test error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle malformed database responses', async () => {
      mockDb.first.mockResolvedValue({ id: 'ref-1', name: 'John Doe', role: 'referee' });
      // Return malformed assignment data
      mockDb.then.mockImplementation((callback: Function) => callback([{
        assignment_id: null,
        game_date: 'invalid-date',
        game_time: 'invalid-time'
      }]));

      const response = await request(app)
        .get('/api/calendar/referees/ref-1/calendar/ical')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate calendar feed');
    });
  });
});