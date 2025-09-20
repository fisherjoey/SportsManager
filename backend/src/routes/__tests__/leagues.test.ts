/**
 * @fileoverview Leagues Routes Integration Tests
 *
 * Comprehensive test suite for the leagues routes following TDD approach.
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
  distinct: jest.fn().mockReturnThis(),
  raw: jest.fn(),
  transaction: jest.fn()
};

const mockCacheHelpers = {
  cacheAggregation: jest.fn(),
  cachePaginatedQuery: jest.fn(),
  cacheLookupData: jest.fn()
};

const mockCacheInvalidation = {
  invalidateLeagues: jest.fn()
};

const mockQueryBuilder = {
  validatePaginationParams: jest.fn().mockReturnValue({ page: 1, limit: 50 }),
  applyCommonFilters: jest.fn().mockReturnValue(mockDb),
  buildCountQuery: jest.fn().mockReturnValue([{ count: 0 }]),
  applyPagination: jest.fn().mockReturnValue(mockDb)
};

const mockAuth = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => next())
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
jest.mock('joi', () => ({
  object: jest.fn().mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null, value: {} })
  }),
  string: jest.fn().mockReturnThis(),
  array: jest.fn().mockReturnThis(),
  number: jest.fn().mockReturnThis(),
  valid: jest.fn().mockReturnThis(),
  required: jest.fn().mockReturnThis(),
  min: jest.fn().mockReturnThis(),
  max: jest.fn().mockReturnThis(),
  items: jest.fn().mockReturnThis(),
  default: jest.fn().mockReturnThis()
}));

describe('Leagues Routes Integration Tests', () => {
  let app: express.Application;
  let leaguesRouter: express.Router;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Import the router after mocks are set up
    leaguesRouter = require('../leagues.js');
    app.use('/api/leagues', leaguesRouter);
  });

  describe('Route Module Structure', () => {
    it('should be able to import the leagues routes module', () => {
      expect(() => {
        require('../leagues.js');
      }).not.toThrow();
    });

    it('should export an express router', () => {
      const routeModule = require('../leagues.js');
      expect(routeModule).toBeDefined();
      expect(typeof routeModule).toBe('function'); // Express router is a function
    });
  });

  describe('GET /api/leagues - Get all leagues', () => {
    const mockLeagues = [
      {
        id: 'league-1',
        organization: 'Test Org',
        age_group: 'U10',
        gender: 'Boys',
        division: 'A',
        season: '2024',
        level: 'Recreational',
        team_count: 5,
        game_count: 20
      }
    ];

    it('should require authentication and permissions', async () => {
      // Reset mocks to not call next()
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .get('/api/leagues')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should accept pagination parameters', async () => {
      mockCacheHelpers.cacheAggregation.mockResolvedValue({
        leagues: mockLeagues,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      });

      await request(app)
        .get('/api/leagues')
        .query({ page: '2', limit: '25' })
        .expect(200);

      expect(mockQueryBuilder.validatePaginationParams).toHaveBeenCalledWith(
        expect.objectContaining({ page: '2', limit: '25' })
      );
    });

    it('should accept filter parameters', async () => {
      mockCacheHelpers.cacheAggregation.mockResolvedValue({
        leagues: mockLeagues,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      });

      await request(app)
        .get('/api/leagues')
        .query({
          organization: 'Test Org',
          age_group: 'U10',
          gender: 'Boys',
          division: 'A',
          season: '2024',
          level: 'Recreational'
        })
        .expect(200);

      expect(mockQueryBuilder.applyCommonFilters).toHaveBeenCalled();
    });

    it('should return leagues with counts and pagination', async () => {
      const expectedResult = {
        leagues: mockLeagues,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      };

      mockCacheHelpers.cacheAggregation.mockResolvedValue(expectedResult);

      const response = await request(app)
        .get('/api/leagues')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expectedResult
      });
    });

    it('should handle database errors gracefully', async () => {
      mockCacheHelpers.cacheAggregation.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/leagues')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch leagues');
    });
  });

  describe('GET /api/leagues/:id - Get specific league', () => {
    const mockLeagueDetail = {
      league: {
        id: 'league-1',
        organization: 'Test Org',
        age_group: 'U10',
        gender: 'Boys'
      },
      teams: [{ id: 'team-1', name: 'Team A' }],
      games: [{ id: 'game-1', home_team_name: 'Team A' }],
      stats: { team_count: 1, game_count: 1, upcoming_games: 0 }
    };

    it('should return league details with teams and games', async () => {
      mockCacheHelpers.cachePaginatedQuery.mockResolvedValue(mockLeagueDetail);

      const response = await request(app)
        .get('/api/leagues/league-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLeagueDetail
      });
    });

    it('should return 404 for non-existent league', async () => {
      mockCacheHelpers.cachePaginatedQuery.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/leagues/non-existent')
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });
  });

  describe('POST /api/leagues - Create new league', () => {
    const validLeagueData = {
      organization: 'Test Org',
      age_group: 'U10',
      gender: 'Boys',
      division: 'A',
      season: '2024',
      level: 'Recreational'
    };

    it('should require admin role', async () => {
      // Reset mock to check authorization
      mockAuth.requireRole.mockImplementation((role: string) =>
        (req: any, res: any, next: any) => {
          if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden' });
          }
          next();
        }
      );

      // Set user as non-admin
      mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', role: 'referee' };
        next();
      });

      const response = await request(app)
        .post('/api/leagues')
        .send(validLeagueData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate request body', async () => {
      // Mock Joi validation to return error
      const joiMock = require('joi');
      joiMock.object.mockReturnValue({
        validate: jest.fn().mockReturnValue({
          error: { details: [{ message: 'Organization is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/leagues')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Organization is required');
    });

    it('should check for existing league', async () => {
      mockDb.first.mockResolvedValue({ id: 'existing-league' });

      const response = await request(app)
        .post('/api/leagues')
        .send(validLeagueData)
        .expect(409);

      expect(response.body.error).toBe('League already exists with these parameters');
    });

    it('should create new league successfully', async () => {
      mockDb.first.mockResolvedValue(null); // No existing league
      mockDb.returning.mockResolvedValue([{ id: 'new-league', ...validLeagueData }]);

      const response = await request(app)
        .post('/api/leagues')
        .send(validLeagueData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('League created successfully');
      expect(mockCacheInvalidation.invalidateLeagues).toHaveBeenCalled();
    });
  });

  describe('POST /api/leagues/bulk - Create multiple leagues', () => {
    const validBulkData = {
      organization: 'Test Org',
      age_groups: ['U10', 'U12'],
      genders: ['Boys', 'Girls'],
      divisions: ['A', 'B'],
      season: '2024',
      level: 'Recreational'
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
        .post('/api/leagues/bulk')
        .send(validBulkData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate bulk data structure', async () => {
      const joiMock = require('joi');
      joiMock.object.mockReturnValue({
        validate: jest.fn().mockReturnValue({
          error: { details: [{ message: 'age_groups is required' }] },
          value: null
        })
      });

      const response = await request(app)
        .post('/api/leagues/bulk')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('age_groups is required');
    });

    it('should create multiple leagues and skip duplicates', async () => {
      // Mock some existing leagues
      mockDb.first
        .mockResolvedValueOnce({ id: 'existing-1' }) // U10 Boys A exists
        .mockResolvedValueOnce(null) // U10 Boys B doesn't exist
        .mockResolvedValueOnce(null) // U10 Girls A doesn't exist
        .mockResolvedValueOnce(null); // Continue for other combinations

      mockDb.returning.mockResolvedValue([
        { id: 'new-1', organization: 'Test Org', age_group: 'U10', gender: 'Boys', division: 'B' }
      ]);

      const response = await request(app)
        .post('/api/leagues/bulk')
        .send(validBulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.requested).toBe(8); // 2*2*2
      expect(response.body.data.duplicates).toContain('Test Org U10 Boys A - 2024');
    });
  });

  describe('PUT /api/leagues/:id - Update league', () => {
    const validUpdateData = {
      organization: 'Updated Org',
      age_group: 'U12',
      gender: 'Girls',
      division: 'B',
      season: '2024',
      level: 'Competitive'
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
        .put('/api/leagues/league-1')
        .send(validUpdateData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate update data', async () => {
      const joiMock = require('joi');
      joiMock.object.mockReturnValue({
        validate: jest.fn().mockReturnValue({
          error: { details: [{ message: 'Invalid gender value' }] },
          value: null
        })
      });

      const response = await request(app)
        .put('/api/leagues/league-1')
        .send({ gender: 'Invalid' })
        .expect(400);

      expect(response.body.error).toBe('Invalid gender value');
    });

    it('should update league successfully', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'league-1', ...validUpdateData }]);

      const response = await request(app)
        .put('/api/leagues/league-1')
        .send(validUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('League updated successfully');
      expect(mockCacheInvalidation.invalidateLeagues).toHaveBeenCalledWith(
        expect.anything(),
        'league-1'
      );
    });

    it('should return 404 for non-existent league', async () => {
      mockDb.returning.mockResolvedValue([]);

      const response = await request(app)
        .put('/api/leagues/non-existent')
        .send(validUpdateData)
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });
  });

  describe('DELETE /api/leagues/:id - Delete league', () => {
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
        .delete('/api/leagues/league-1')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent league', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/leagues/non-existent')
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });

    it('should prevent deletion of league with teams or games', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'league-1' }) // League exists
        .mockResolvedValueOnce({ count: 5 }) // Has teams
        .mockResolvedValueOnce({ count: 10 }); // Has games

      const response = await request(app)
        .delete('/api/leagues/league-1')
        .expect(409);

      expect(response.body.error).toBe('Cannot delete league with existing teams or games');
      expect(response.body.details).toEqual({
        teams: 5,
        games: 10
      });
    });

    it('should delete league successfully', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'league-1' }) // League exists
        .mockResolvedValueOnce({ count: 0 }) // No teams
        .mockResolvedValueOnce({ count: 0 }); // No games

      const response = await request(app)
        .delete('/api/leagues/league-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('League deleted successfully');
      expect(mockCacheInvalidation.invalidateLeagues).toHaveBeenCalled();
    });
  });

  describe('GET /api/leagues/options/filters - Get filter options', () => {
    const mockFilterOptions = {
      organizations: ['Org 1', 'Org 2'],
      age_groups: ['U10', 'U12'],
      genders: ['Boys', 'Girls'],
      divisions: ['A', 'B'],
      seasons: ['2024', '2023'],
      levels: ['Recreational', 'Competitive']
    };

    it('should return filter options from cache', async () => {
      mockCacheHelpers.cacheLookupData.mockResolvedValue(mockFilterOptions);

      const response = await request(app)
        .get('/api/leagues/options/filters')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockFilterOptions
      });
    });

    it('should handle database errors in filter options', async () => {
      mockCacheHelpers.cacheLookupData.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/leagues/options/filters')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch filter options');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected database errors', async () => {
      mockCacheHelpers.cacheAggregation.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/leagues')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch leagues');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/leagues')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});