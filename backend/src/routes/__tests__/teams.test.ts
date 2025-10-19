/**
 * @fileoverview Teams Routes Integration Tests
 *
 * Comprehensive test suite for the teams routes following TDD approach.
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

const mockCacheHelpers: any = {
  cacheAggregation: (jest.fn() as any).mockResolvedValue({ teams: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } }),
  cachePaginatedQuery: (jest.fn() as any).mockResolvedValue(null),
  cacheLookupData: (jest.fn() as any).mockResolvedValue([])
};

const mockCacheInvalidation = {
  invalidateTeams: jest.fn()
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

// Mock modules
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
      'preferences', 'strict', 'options', 'fork', 'validate'
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

describe('Teams Routes Integration Tests', () => {
  let app: express.Application;
  let teamsRouter: express.Router;

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
    mockCacheHelpers.cacheAggregation.mockResolvedValue({ teams: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
    mockCacheHelpers.cachePaginatedQuery.mockResolvedValue(null);
    mockCacheHelpers.cacheLookupData.mockResolvedValue([]);

    app = express();
    app.use(express.json());

    // Import the router after mocks are set up
    teamsRouter = require('../teams').default;
    app.use('/api/teams', teamsRouter);
  });

  describe('Route Module Structure', () => {
    it('should be able to import the teams routes module', () => {
      expect(() => {
        require('../teams');
      }).not.toThrow();
    });

    it('should export an express router', () => {
      const routeModule = require('../teams').default;
      expect(routeModule).toBeDefined();
      expect(typeof routeModule).toBe('function'); // Express router is a function
    });
  });

  describe('GET /api/teams - Get all teams', () => {
    const mockTeams = [
      {
        id: 'team-1',
        name: 'Team Alpha',
        league_id: 'league-1',
        rank: 1,
        location: 'Field A',
        organization: 'Test Org',
        age_group: 'U10',
        gender: 'Boys',
        game_count: 5
      }
    ];

    it('should require authentication and permissions', async () => {
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .get('/api/teams')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should accept pagination parameters', async () => {
      mockCacheHelpers.cacheAggregation.mockResolvedValue({
        teams: mockTeams,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      });

      await request(app)
        .get('/api/teams')
        .query({ page: '2', limit: '25' })
        .expect(200);

      expect(mockQueryBuilder.validatePaginationParams).toHaveBeenCalledWith(
        expect.objectContaining({ page: '2', limit: '25' })
      );
    });

    it('should accept filter parameters', async () => {
      mockCacheHelpers.cacheAggregation.mockResolvedValue({
        teams: mockTeams,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      });

      await request(app)
        .get('/api/teams')
        .query({
          league_id: 'league-1',
          organization: 'Test Org',
          age_group: 'U10',
          gender: 'Boys',
          search: 'Alpha'
        })
        .expect(200);

      expect(mockQueryBuilder.applyCommonFilters).toHaveBeenCalled();
    });

    it('should return teams with game counts and pagination', async () => {
      const expectedResult = {
        teams: mockTeams,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      };

      mockCacheHelpers.cacheAggregation.mockResolvedValue(expectedResult);

      const response = await request(app)
        .get('/api/teams')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expectedResult
      });
    });

    it('should handle database errors gracefully', async () => {
      mockCacheHelpers.cacheAggregation.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/teams')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch teams');
    });
  });

  describe('GET /api/teams/:id - Get specific team', () => {
    const mockTeamDetail = {
      team: {
        id: 'team-1',
        name: 'Team Alpha',
        league_id: 'league-1',
        organization: 'Test Org'
      },
      games: [{ id: 'game-1', home_team_name: 'Team Alpha', team_role: 'home' }],
      stats: { total_games: 1, home_games: 1, away_games: 0, upcoming_games: 0 }
    };

    it('should return team details with games and stats', async () => {
      mockCacheHelpers.cachePaginatedQuery.mockResolvedValue(mockTeamDetail);

      const response = await request(app)
        .get('/api/teams/team-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTeamDetail
      });
    });

    it('should return 404 for non-existent team', async () => {
      mockCacheHelpers.cachePaginatedQuery.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/teams/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });
  });

  describe('POST /api/teams - Create new team', () => {
    const validTeamData = {
      name: 'New Team',
      league_id: 'league-1',
      rank: 1,
      location: 'Field A',
      contact_email: 'contact@team.com',
      contact_phone: '123-456-7890'
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/api/teams')
        .send(validTeamData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate request body', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'Name is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/teams')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Name is required');
    });

    it('should check if league exists', async () => {
      mockDb.first.mockResolvedValue(null); // League not found

      const response = await request(app)
        .post('/api/teams')
        .send(validTeamData)
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });

    it('should check for duplicate team name in league', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'league-1' }) // League exists
        .mockResolvedValueOnce({ id: 'existing-team' }); // Team with same name exists

      const response = await request(app)
        .post('/api/teams')
        .send(validTeamData)
        .expect(409);

      expect(response.body.error).toBe('Team name already exists in this league');
    });

    it('should create new team successfully', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'league-1' }) // League exists
        .mockResolvedValueOnce(null); // No existing team with same name
      mockDb.returning.mockResolvedValue([{ id: 'new-team', ...validTeamData }]);

      const response = await request(app)
        .post('/api/teams')
        .send(validTeamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team created successfully');
      expect(mockCacheInvalidation.invalidateTeams).toHaveBeenCalled();
    });
  });

  describe('POST /api/teams/bulk - Create multiple teams', () => {
    const validBulkData = {
      league_id: 'league-1',
      teams: [
        { name: 'Team Alpha', rank: 1 },
        { name: 'Team Beta', rank: 2 }
      ]
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/api/teams/bulk')
        .send(validBulkData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate bulk data structure', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'league_id is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/teams/bulk')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('league_id is required');
    });

    it('should check if league exists', async () => {
      mockDb.first.mockResolvedValue(null); // League not found

      const response = await request(app)
        .post('/api/teams/bulk')
        .send(validBulkData)
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });

    it('should create multiple teams and skip duplicates', async () => {
      mockDb.first.mockResolvedValue({ id: 'league-1' }); // League exists
      mockDb.pluck.mockResolvedValue(['Team Alpha']); // Existing team name
      mockDb.returning.mockResolvedValue([
        { id: 'new-team', name: 'Team Beta', league_id: 'league-1' }
      ]);

      const response = await request(app)
        .post('/api/teams/bulk')
        .send(validBulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.requested).toBe(2);
      expect(response.body.data.summary.created).toBe(1);
      expect(response.body.data.duplicates).toContain('Team Alpha (already exists)');
    });
  });

  describe('POST /api/teams/generate - Generate teams with pattern', () => {
    const validGenerateData = {
      league_id: 'league-1',
      count: 5,
      name_pattern: 'Team {number}',
      location_base: 'Field',
      auto_rank: true
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .post('/api/teams/generate')
        .send(validGenerateData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate generate data', async () => {
      const joiMock = require('joi').default;
      joiMock.object.mockReturnValue({
        validate: (jest.fn() as any).mockReturnValue({
          error: { details: [{ message: 'count is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/teams/generate')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('count is required');
    });

    it('should generate teams with pattern successfully', async () => {
      mockDb.first.mockResolvedValue({ id: 'league-1', organization: 'Test Org' });
      mockDb.pluck.mockResolvedValue(['Team 1']); // One existing team
      mockDb.returning.mockResolvedValue([
        { id: 'team-2', name: 'Team 2' },
        { id: 'team-3', name: 'Team 3' }
      ]);

      const response = await request(app)
        .post('/api/teams/generate')
        .send(validGenerateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.requested).toBe(5);
      expect(response.body.data.summary.created).toBe(4); // Skipped 1 existing
    });
  });

  describe('PUT /api/teams/:id - Update team', () => {
    const validUpdateData = {
      name: 'Updated Team',
      league_id: 'league-1',
      rank: 2,
      location: 'Field B'
    };

    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .put('/api/teams/team-1')
        .send(validUpdateData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should check for name conflicts', async () => {
      mockDb.first.mockResolvedValue({ id: 'other-team' }); // Name conflict

      const response = await request(app)
        .put('/api/teams/team-1')
        .send(validUpdateData)
        .expect(409);

      expect(response.body.error).toBe('Team name already exists in this league');
    });

    it('should update team successfully', async () => {
      mockDb.first.mockResolvedValue(null); // No name conflict
      mockDb.returning.mockResolvedValue([{ id: 'team-1', ...validUpdateData }]);

      const response = await request(app)
        .put('/api/teams/team-1')
        .send(validUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team updated successfully');
      expect(mockCacheInvalidation.invalidateTeams).toHaveBeenCalled();
    });

    it('should return 404 for non-existent team', async () => {
      mockDb.first.mockResolvedValue(null); // No name conflict
      mockDb.returning.mockResolvedValue([]); // No team updated

      const response = await request(app)
        .put('/api/teams/non-existent')
        .send(validUpdateData)
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });
  });

  describe('DELETE /api/teams/:id - Delete team', () => {
    it('should require proper permissions', async () => {
      mockCerbos.requireCerbosPermission.mockImplementation(() =>
        (req: any, res: any, next: any) => {
          return res.status(403).json({ error: 'Forbidden' });
        }
      );

      const response = await request(app)
        .delete('/api/teams/team-1')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent team', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/teams/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });

    it('should prevent deletion of team with games', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'team-1' }) // Team exists
        .mockResolvedValueOnce({ count: 5 }); // Has games

      const response = await request(app)
        .delete('/api/teams/team-1')
        .expect(409);

      expect(response.body.error).toBe('Cannot delete team with existing games');
      expect(response.body.details.games).toBe(5);
    });

    it('should delete team successfully', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'team-1' }) // Team exists
        .mockResolvedValueOnce({ count: 0 }); // No games

      const response = await request(app)
        .delete('/api/teams/team-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team deleted successfully');
      expect(mockCacheInvalidation.invalidateTeams).toHaveBeenCalled();
    });
  });

  describe('GET /api/teams/league/:league_id - Get teams for league', () => {
    const mockLeagueTeams = {
      league: { id: 'league-1', organization: 'Test Org' },
      teams: [
        { id: 'team-1', name: 'Team Alpha', game_count: 5 },
        { id: 'team-2', name: 'Team Beta', game_count: 3 }
      ]
    };

    it('should return teams for specific league', async () => {
      mockCacheHelpers.cacheAggregation.mockResolvedValue(mockLeagueTeams);

      const response = await request(app)
        .get('/api/teams/league/league-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLeagueTeams
      });
    });

    it('should return 404 for non-existent league', async () => {
      mockCacheHelpers.cacheAggregation.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/teams/league/non-existent')
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected database errors', async () => {
      mockCacheHelpers.cacheAggregation.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/teams')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch teams');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});