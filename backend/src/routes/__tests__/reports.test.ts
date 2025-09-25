/**
 * @fileoverview Test suite for reports routes
 * @description Comprehensive integration tests for all reports endpoints with proper mocking
 * and TypeScript type checking.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

// Mock dependencies
const mockDb = {
  leftJoin: jest.fn(() => mockDb),
  join: jest.fn(() => mockDb),
  where: jest.fn(() => mockDb),
  whereIn: jest.fn(() => mockDb),
  whereRaw: jest.fn(() => mockDb),
  select: jest.fn(() => mockDb),
  groupBy: jest.fn(() => mockDb),
  having: jest.fn(() => mockDb),
  orderBy: jest.fn(() => mockDb),
  limit: jest.fn(() => mockDb),
  offset: jest.fn(() => mockDb),
  clone: jest.fn(() => mockDb),
  countDistinct: jest.fn(() => mockDb),
  raw: jest.fn((sql: string, params?: any[]) => sql),
  first: jest.fn(),
  // For the raw query method
  rows: []
};

const mockAuthMiddleware = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      roles: ['admin']
    };
    next();
  }),
  requireRole: jest.fn((role: string) => (req: any, res: any, next: any) => next())
};

// Mock modules
jest.unstable_mockModule('../config/database', () => ({
  default: mockDb
}));

jest.unstable_mockModule('../middleware/auth', () => ({
  authenticateToken: mockAuthMiddleware.authenticateToken,
  requireRole: mockAuthMiddleware.requireRole
}));

// Create mock app
const app = express();
app.use(express.json());

// Import the router after mocking
const reportsRouter = (await import('../reports.js')).default;
app.use('/api/reports', reportsRouter);

describe('Reports Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock database to return empty results by default
    mockDb.first.mockResolvedValue({});
    mockDb.countDistinct.mockResolvedValue([{ count: '0' }]);
    // Reset the main query method to return empty array
    (mockDb as any).then = jest.fn((callback: Function) => callback([]));
    // Mock raw queries
    mockDb.raw.mockImplementation((sql: string) => {
      if (sql.includes('COUNT')) return 'COUNT(*)';
      if (sql.includes('EXTRACT')) return 'EXTRACT(DOW FROM games.game_date)';
      return sql;
    });
  });

  describe('GET /referee-performance', () => {
    it('should return referee performance metrics with valid query', async () => {
      // Mock performance data
      const mockPerformanceData = [
        {
          referee_id: 'ref-1',
          referee_name: 'John Doe',
          referee_email: 'john@example.com',
          is_available: true,
          wage_per_game: 50,
          total_assignments: '10',
          accepted_assignments: '8',
          declined_assignments: '2',
          completed_assignments: '7',
          total_earnings: '350',
          average_wage: '50',
          unique_game_days: '5'
        }
      ];

      // Setup mock to return the performance data
      (mockDb as any).then = jest.fn((callback: Function) => callback(mockPerformanceData));
      mockDb.countDistinct.mockResolvedValue([{ count: '1' }]);

      const response = await request(app)
        .get('/api/reports/referee-performance')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          page: '1',
          limit: '50'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('refereePerformance');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.refereePerformance).toHaveLength(1);

      const referee = response.body.data.refereePerformance[0];
      expect(referee).toEqual({
        refereeId: 'ref-1',
        refereeName: 'John Doe',
        refereeEmail: 'john@example.com',
        isAvailable: true,
        wagePerGame: 50,
        metrics: {
          assignmentsCount: 10,
          acceptedAssignments: 8,
          declinedAssignments: 2,
          completedAssignments: 7,
          acceptanceRate: 80,
          completionRate: 87.5,
          declineRate: 20,
          totalEarnings: 350,
          averageWage: 50,
          uniqueGameDays: 5,
          gamesPerWeek: expect.any(Number)
        }
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/reports/referee-performance')
        .query({
          start_date: 'invalid-date',
          limit: '1000' // exceeds max limit
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should filter by referee_id when provided', async () => {
      (mockDb as any).then = jest.fn((callback: Function) => callback([]));

      await request(app)
        .get('/api/reports/referee-performance')
        .query({ referee_id: 'specific-ref-id' })
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('users.id', 'specific-ref-id');
    });

    it('should handle database errors gracefully', async () => {
      (mockDb as any).then = jest.fn(() => Promise.reject(new Error('Database error')));

      const response = await request(app)
        .get('/api/reports/referee-performance')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate referee performance report');
    });
  });

  describe('GET /assignment-patterns', () => {
    it('should return assignment pattern analysis', async () => {
      const mockDayPatterns = [
        { day_of_week: '1', assignment_count: '5', unique_referees: '3' },
        { day_of_week: '2', assignment_count: '8', unique_referees: '5' }
      ];

      const mockTimePatterns = [
        { hour_of_day: '18', assignment_count: '10', unique_referees: '6' },
        { hour_of_day: '20', assignment_count: '15', unique_referees: '8' }
      ];

      const mockLocationPatterns = [
        {
          location_id: 'loc-1',
          location_name: 'Main Field',
          location_address: '123 Sports Ave',
          assignment_count: '20',
          unique_referees: '10',
          average_wage: '55.00'
        }
      ];

      const mockRefereePositionPatterns = [
        {
          referee_id: 'ref-1',
          referee_name: 'John Doe',
          position_id: 'pos-1',
          position_name: 'Referee',
          assignment_count: '15'
        }
      ];

      // Mock the clone method to return different data for different queries
      let callCount = 0;
      mockDb.clone.mockImplementation(() => {
        const mockClone = { ...mockDb };
        (mockClone as any).then = jest.fn((callback: Function) => {
          switch (callCount++) {
            case 0: return callback(mockDayPatterns);
            case 1: return callback(mockTimePatterns);
            case 2: return callback(mockLocationPatterns);
            case 3: return callback(mockRefereePositionPatterns);
            default: return callback([]);
          }
        });
        return mockClone;
      });

      // Mock the raw query for referee pairs
      mockDb.raw.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/reports/assignment-patterns')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignmentPatterns).toHaveProperty('dayOfWeek');
      expect(response.body.data.assignmentPatterns).toHaveProperty('timeOfDay');
      expect(response.body.data.assignmentPatterns).toHaveProperty('locations');
      expect(response.body.data.assignmentPatterns).toHaveProperty('refereePositions');
      expect(response.body.data.assignmentPatterns).toHaveProperty('refereePairs');

      // Verify day of week formatting
      expect(response.body.data.assignmentPatterns.dayOfWeek[0]).toEqual({
        dayOfWeek: 1,
        dayName: 'Monday',
        assignmentCount: 5,
        uniqueReferees: 3
      });
    });

    it('should apply all filters correctly', async () => {
      (mockDb as any).then = jest.fn((callback: Function) => callback([]));
      mockDb.clone.mockImplementation(() => {
        const mockClone = { ...mockDb };
        (mockClone as any).then = jest.fn((callback: Function) => callback([]));
        return mockClone;
      });
      mockDb.raw.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/reports/assignment-patterns')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          referee_id: 'ref-123',
          location_id: 'loc-456',
          league_id: 'league-789',
          level: 'Youth'
        })
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '>=', '2024-01-01');
      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '<=', '2024-12-31');
      expect(mockDb.where).toHaveBeenCalledWith('game_assignments.user_id', 'ref-123');
      expect(mockDb.where).toHaveBeenCalledWith('games.location_id', 'loc-456');
      expect(mockDb.where).toHaveBeenCalledWith('leagues.id', 'league-789');
      expect(mockDb.where).toHaveBeenCalledWith('games.level', 'Youth');
    });
  });

  describe('GET /financial-summary', () => {
    it('should return financial summary for admin users', async () => {
      const mockOverallSummary = {
        total_assignments: '25',
        unique_referees: '5',
        unique_games: '20',
        total_wages: '1250.00',
        average_wage: '50.00',
        min_wage: '40.00',
        max_wage: '75.00'
      };

      const mockRefereeBreakdown = [
        {
          referee_id: 'ref-1',
          referee_name: 'John Doe',
          referee_email: 'john@example.com',
          assignment_count: '10',
          total_earnings: '500.00',
          average_wage: '50.00'
        }
      ];

      let callCount = 0;
      mockDb.clone.mockImplementation(() => {
        const mockClone = { ...mockDb };
        if (callCount === 0) {
          mockClone.first.mockResolvedValue(mockOverallSummary);
        } else {
          (mockClone as any).then = jest.fn((callback: Function) => {
            switch (callCount) {
              case 1: return callback(mockRefereeBreakdown);
              default: return callback([]);
            }
          });
        }
        callCount++;
        return mockClone;
      });

      const response = await request(app)
        .get('/api/reports/financial-summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.financialSummary).toHaveProperty('overall');
      expect(response.body.data.financialSummary).toHaveProperty('byReferee');
      expect(response.body.data.financialSummary).toHaveProperty('byLocation');
      expect(response.body.data.financialSummary).toHaveProperty('byLevel');
      expect(response.body.data.financialSummary).toHaveProperty('byGameType');
      expect(response.body.data.financialSummary).toHaveProperty('monthlyTrend');

      expect(response.body.data.financialSummary.overall).toEqual({
        totalAssignments: 25,
        uniqueReferees: 5,
        uniqueGames: 20,
        totalWages: 1250,
        averageWage: 50,
        minWage: 40,
        maxWage: 75
      });
    });

    it('should require admin role', async () => {
      // Mock requireRole to throw 403
      mockAuthMiddleware.requireRole.mockImplementation((role: string) =>
        (req: any, res: any, next: any) => {
          if (role === 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        }
      );

      const response = await request(app)
        .get('/api/reports/financial-summary')
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should filter by multiple criteria', async () => {
      mockDb.first.mockResolvedValue({
        total_assignments: '0',
        unique_referees: '0',
        unique_games: '0',
        total_wages: '0',
        average_wage: '0',
        min_wage: '0',
        max_wage: '0'
      });

      mockDb.clone.mockImplementation(() => {
        const mockClone = { ...mockDb };
        mockClone.first.mockResolvedValue({
          total_assignments: '0',
          unique_referees: '0',
          unique_games: '0',
          total_wages: '0',
          average_wage: '0',
          min_wage: '0',
          max_wage: '0'
        });
        (mockClone as any).then = jest.fn((callback: Function) => callback([]));
        return mockClone;
      });

      await request(app)
        .get('/api/reports/financial-summary')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          referee_id: 'ref-123',
          location_id: 'loc-456',
          league_id: 'league-789',
          level: 'Youth',
          game_type: 'Regular'
        })
        .expect(200);

      expect(mockDb.whereIn).toHaveBeenCalledWith('game_assignments.status', ['accepted', 'completed']);
      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '>=', '2024-01-01');
      expect(mockDb.where).toHaveBeenCalledWith('games.game_date', '<=', '2024-12-31');
      expect(mockDb.where).toHaveBeenCalledWith('game_assignments.user_id', 'ref-123');
      expect(mockDb.where).toHaveBeenCalledWith('games.location_id', 'loc-456');
      expect(mockDb.where).toHaveBeenCalledWith('leagues.id', 'league-789');
      expect(mockDb.where).toHaveBeenCalledWith('games.level', 'Youth');
      expect(mockDb.where).toHaveBeenCalledWith('games.game_type', 'Regular');
    });
  });

  describe('GET /availability-gaps', () => {
    it('should return availability gap analysis', async () => {
      const mockUnassignedGames = [
        {
          game_id: 'game-1',
          game_date: '2024-01-15',
          game_time: '18:00:00',
          level: 'Youth',
          game_type: 'Regular',
          refs_needed: '2',
          pay_rate: '50.00',
          location_name: 'Main Field',
          location_address: '123 Sports Ave',
          home_team_name: 'Lions',
          away_team_name: 'Tigers',
          league_name: 'Youth League'
        }
      ];

      const mockTimeGaps = [
        { day_of_week: '1', hour_of_day: '18', unassigned_count: '3' },
        { day_of_week: '2', hour_of_day: '20', unassigned_count: '5' }
      ];

      const mockLocationGaps = [
        {
          location_id: 'loc-1',
          location_name: 'Main Field',
          location_address: '123 Sports Ave',
          unassigned_count: '8',
          total_refs_needed: '16'
        }
      ];

      const mockLevelGaps = [
        { level: 'Youth', unassigned_count: '10', total_refs_needed: '20' },
        { level: 'Adult', unassigned_count: '5', total_refs_needed: '10' }
      ];

      const mockPartiallyAssigned = [
        {
          game_id: 'game-2',
          game_date: '2024-01-16',
          game_time: '19:00:00',
          level: 'Adult',
          game_type: 'Regular',
          refs_needed: '3',
          location_name: 'Field 2',
          home_team_name: 'Eagles',
          away_team_name: 'Hawks',
          assigned_refs: '1'
        }
      ];

      let callCount = 0;
      mockDb.clone.mockImplementation(() => {
        const mockClone = { ...mockDb };
        (mockClone as any).then = jest.fn((callback: Function) => {
          switch (callCount++) {
            case 0: return callback(mockUnassignedGames);
            case 1: return callback(mockTimeGaps);
            case 2: return callback(mockLocationGaps);
            case 3: return callback(mockLevelGaps);
            default: return callback([]);
          }
        });
        return mockClone;
      });

      // Mock the partially assigned games query
      (mockDb as any).then = jest.fn((callback: Function) => callback(mockPartiallyAssigned));

      const response = await request(app)
        .get('/api/reports/availability-gaps')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.availabilityGaps).toHaveProperty('unassignedGames');
      expect(response.body.data.availabilityGaps).toHaveProperty('partiallyAssignedGames');
      expect(response.body.data.availabilityGaps).toHaveProperty('timePatterns');
      expect(response.body.data.availabilityGaps).toHaveProperty('locationGaps');
      expect(response.body.data.availabilityGaps).toHaveProperty('levelGaps');
      expect(response.body.data).toHaveProperty('summary');

      // Verify unassigned games formatting
      const unassignedGame = response.body.data.availabilityGaps.unassignedGames[0];
      expect(unassignedGame).toEqual({
        gameId: 'game-1',
        gameDate: '2024-01-15',
        gameTime: '18:00:00',
        level: 'Youth',
        gameType: 'Regular',
        refsNeeded: 2,
        payRate: 50,
        locationName: 'Main Field',
        locationAddress: '123 Sports Ave',
        homeTeamName: 'Lions',
        awayTeamName: 'Tigers',
        leagueName: 'Youth League'
      });

      // Verify partially assigned games formatting
      const partiallyAssigned = response.body.data.availabilityGaps.partiallyAssignedGames[0];
      expect(partiallyAssigned.refsStillNeeded).toBe(2); // 3 needed - 1 assigned

      // Verify summary calculations
      expect(response.body.data.summary.totalUnassignedGames).toBe(1);
      expect(response.body.data.summary.totalPartiallyAssigned).toBe(1);
      expect(response.body.data.summary.totalRefereesNeeded).toBe(4); // 2 from unassigned + 2 still needed from partially assigned
    });

    it('should handle complex partially assigned query', async () => {
      // Mock all clone calls to return empty arrays
      mockDb.clone.mockImplementation(() => {
        const mockClone = { ...mockDb };
        (mockClone as any).then = jest.fn((callback: Function) => callback([]));
        return mockClone;
      });

      // Mock the main query for partially assigned games
      (mockDb as any).then = jest.fn((callback: Function) => callback([]));

      await request(app)
        .get('/api/reports/availability-gaps')
        .query({
          location_id: 'loc-123',
          level: 'Youth'
        })
        .expect(200);

      // Verify the complex whereRaw query was called
      expect(mockDb.whereRaw).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalledWith('games.status', 'unassigned');
      expect(mockDb.where).toHaveBeenCalledWith('games.status', 'assigned');
    });
  });

  describe('Error Handling', () => {
    it('should handle Joi validation errors for all endpoints', async () => {
      const endpoints = [
        '/referee-performance',
        '/assignment-patterns',
        '/financial-summary',
        '/availability-gaps'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(`/api/reports${endpoint}`)
          .query({ start_date: 'invalid-date' })
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should handle database connection errors', async () => {
      // Mock database to throw connection error
      mockDb.leftJoin.mockImplementation(() => {
        throw new Error('Connection refused');
      });

      const response = await request(app)
        .get('/api/reports/referee-performance')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate referee performance report');
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (mockDb as any).then = jest.fn(() => Promise.reject(new Error('Test error')));

      const response = await request(app)
        .get('/api/reports/referee-performance')
        .expect(500);

      expect(response.body.details).toBe('Test error');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock authentication to fail
      mockAuthMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const endpoints = [
        '/referee-performance',
        '/assignment-patterns',
        '/financial-summary',
        '/availability-gaps'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(`/api/reports${endpoint}`)
          .expect(401);

        expect(response.body.error).toBe('Access token required');
      }
    });

    it('should enforce admin role for financial-summary', async () => {
      // Reset authentication to pass
      mockAuthMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 'test-user', roles: ['referee'] };
        next();
      });

      // Mock requireRole to enforce admin check
      mockAuthMiddleware.requireRole.mockImplementation((role: string) =>
        (req: any, res: any, next: any) => {
          if (role === 'admin' && !req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        }
      );

      const response = await request(app)
        .get('/api/reports/financial-summary')
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});