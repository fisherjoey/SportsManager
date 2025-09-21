/**
 * @fileoverview Test suite for tournaments routes
 * @description Comprehensive integration tests for all tournament endpoints with proper mocking
 * and TypeScript type checking.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { TournamentType, SeedingMethod, TournamentStage } from '../../types/business.types';

// Mock dependencies
const mockDb = {
  where: jest.fn(() => mockDb),
  whereIn: jest.fn(() => mockDb),
  orderBy: jest.fn(() => mockDb),
  first: jest.fn(),
  insert: jest.fn(() => mockDb),
  returning: jest.fn(() => mockDb),
  transaction: jest.fn(),
  // For the raw query method
  rows: []
};

const mockTrx = {
  insert: jest.fn(() => mockTrx),
  returning: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn()
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

const mockTournamentGenerator = {
  generateRoundRobin: jest.fn(),
  generateSingleElimination: jest.fn(),
  generateSwissSystem: jest.fn(),
  generateGroupStagePlayoffs: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../config/database', () => ({
  default: mockDb
}));

jest.unstable_mockModule('../middleware/auth', () => ({
  authenticateToken: mockAuthMiddleware.authenticateToken,
  requireRole: mockAuthMiddleware.requireRole
}));

jest.unstable_mockModule('../utils/tournament-generator', () => mockTournamentGenerator);

// Create mock app
const app = express();
app.use(express.json());

// Import the router after mocking
const tournamentsRouter = require('../tournaments.js');
app.use('/api/tournaments', tournamentsRouter);

describe('Tournaments Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock database to return empty results by default
    mockDb.first.mockResolvedValue(null);
    mockDb.returning.mockResolvedValue([]);
    mockDb.transaction.mockImplementation((callback: Function) => callback(mockTrx));
    mockTrx.returning.mockResolvedValue([]);

    // Reset tournament generator mocks
    Object.values(mockTournamentGenerator).forEach(mock => mock.mockReset());
  });

  describe('POST /generate', () => {
    const validTournamentData = {
      name: 'Test Tournament',
      league_id: 'league-123',
      tournament_type: TournamentType.ROUND_ROBIN,
      team_ids: ['team-1', 'team-2', 'team-3', 'team-4'],
      start_date: '2024-03-01',
      venue: 'Main Stadium',
      time_slots: ['10:00', '12:00', '14:00'],
      days_of_week: [6, 0],
      games_per_day: 3,
      seeding_method: SeedingMethod.RANDOM
    };

    const mockLeague = {
      id: 'league-123',
      name: 'Test League',
      level: 'Youth'
    };

    const mockTeams = [
      { id: 'team-1', name: 'Lions', rank: 1 },
      { id: 'team-2', name: 'Tigers', rank: 2 },
      { id: 'team-3', name: 'Bears', rank: 3 },
      { id: 'team-4', name: 'Eagles', rank: 4 }
    ];

    const mockTournamentResult = {
      type: TournamentType.ROUND_ROBIN,
      total_games: 6,
      total_rounds: 3,
      games: [
        {
          home_team_id: 'team-1',
          away_team_id: 'team-2',
          home_team_name: 'Lions',
          away_team_name: 'Tigers',
          game_date: '2024-03-01',
          game_time: '10:00',
          location: 'Main Stadium',
          round: 1,
          tournament_type: TournamentType.ROUND_ROBIN
        }
      ],
      rounds: [
        {
          round: 1,
          games: []
        }
      ],
      summary: {
        teams_count: 4,
        games_per_team: 3,
        estimated_duration_days: 2,
        format: 'Every team plays every other team once'
      }
    };

    it('should generate round robin tournament successfully', async () => {
      // Setup mocks
      mockDb.first.mockResolvedValueOnce(mockLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockTeams);
      mockTournamentGenerator.generateRoundRobin.mockReturnValue(mockTournamentResult);

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(validTournamentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament).toHaveProperty('name', 'Test Tournament');
      expect(response.body.data.tournament).toHaveProperty('type', TournamentType.ROUND_ROBIN);
      expect(response.body.data.tournament.games).toHaveLength(1);
      expect(response.body.data.tournament.games[0]).toHaveProperty('league_id', 'league-123');
      expect(response.body.data.tournament.games[0]).toHaveProperty('pay_rate', 25);
      expect(response.body.data.tournament.games[0]).toHaveProperty('refs_needed', 2);

      // Verify tournament generator was called with correct parameters
      expect(mockTournamentGenerator.generateRoundRobin).toHaveBeenCalledWith(
        mockTeams,
        expect.objectContaining({
          venue: 'Main Stadium',
          startDate: new Date('2024-03-01'),
          timeSlots: ['10:00', '12:00', '14:00'],
          daysOfWeek: [6, 0],
          gamesPerDay: 3,
          seedingMethod: SeedingMethod.RANDOM
        })
      );
    });

    it('should generate single elimination tournament successfully', async () => {
      const singleElimData = {
        ...validTournamentData,
        tournament_type: TournamentType.SINGLE_ELIMINATION
      };

      mockDb.first.mockResolvedValueOnce(mockLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockTeams);
      mockTournamentGenerator.generateSingleElimination.mockReturnValue({
        ...mockTournamentResult,
        type: TournamentType.SINGLE_ELIMINATION
      });

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(singleElimData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament.type).toBe(TournamentType.SINGLE_ELIMINATION);
      expect(mockTournamentGenerator.generateSingleElimination).toHaveBeenCalled();
    });

    it('should generate swiss system tournament with rounds parameter', async () => {
      const swissData = {
        ...validTournamentData,
        tournament_type: TournamentType.SWISS_SYSTEM,
        rounds: 5
      };

      mockDb.first.mockResolvedValueOnce(mockLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockTeams);
      mockTournamentGenerator.generateSwissSystem.mockReturnValue({
        ...mockTournamentResult,
        type: TournamentType.SWISS_SYSTEM
      });

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(swissData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockTournamentGenerator.generateSwissSystem).toHaveBeenCalledWith(
        mockTeams,
        expect.objectContaining({
          rounds: 5
        })
      );
    });

    it('should generate group stage playoffs tournament', async () => {
      const groupStageData = {
        ...validTournamentData,
        tournament_type: TournamentType.GROUP_STAGE_PLAYOFFS,
        group_size: 4,
        advance_per_group: 2
      };

      mockDb.first.mockResolvedValueOnce(mockLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockTeams);
      mockTournamentGenerator.generateGroupStagePlayoffs.mockReturnValue({
        ...mockTournamentResult,
        type: TournamentType.GROUP_STAGE_PLAYOFFS
      });

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(groupStageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockTournamentGenerator.generateGroupStagePlayoffs).toHaveBeenCalledWith(
        mockTeams,
        expect.objectContaining({
          groupSize: 4,
          advancePerGroup: 2
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Tournament'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate tournament type', async () => {
      const invalidData = {
        ...validTournamentData,
        tournament_type: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate minimum team count', async () => {
      const invalidData = {
        ...validTournamentData,
        team_ids: ['team-1'] // Only one team
      };

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 when league not found', async () => {
      mockDb.first.mockResolvedValueOnce(null); // League not found

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(validTournamentData)
        .expect(404);

      expect(response.body.error).toBe('League not found');
    });

    it('should return 400 when teams not found in league', async () => {
      mockDb.first.mockResolvedValueOnce(mockLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce([mockTeams[0], mockTeams[1]]); // Only 2 teams found

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(validTournamentData)
        .expect(400);

      expect(response.body.error).toBe('Some teams not found or not in the specified league');
    });

    it('should handle different league levels for pay rates', async () => {
      const eliteLeague = { ...mockLeague, level: 'Elite' };
      mockDb.first.mockResolvedValueOnce(eliteLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockTeams);
      mockTournamentGenerator.generateRoundRobin.mockReturnValue(mockTournamentResult);

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(validTournamentData)
        .expect(201);

      expect(response.body.data.tournament.games[0].pay_rate).toBe(50);
      expect(response.body.data.tournament.games[0].refs_needed).toBe(3);
    });

    it('should handle tournament generator errors', async () => {
      mockDb.first.mockResolvedValueOnce(mockLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockTeams);
      mockTournamentGenerator.generateRoundRobin.mockImplementation(() => {
        throw new Error('Tournament generation failed');
      });

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send(validTournamentData)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate tournament');
      expect(response.body.details).toBe('Tournament generation failed');
    });
  });

  describe('POST /create-games', () => {
    const validGamesData = {
      tournament_name: 'Test Tournament',
      games: [
        {
          home_team_id: 'team-1',
          away_team_id: 'team-2',
          league_id: 'league-123',
          game_date: '2024-03-01',
          game_time: '10:00',
          location: 'Main Stadium',
          level: 'Youth',
          pay_rate: 25,
          refs_needed: 2
        },
        {
          home_team_id: 'team-3',
          away_team_id: 'team-4',
          league_id: 'league-123',
          game_date: '2024-03-01',
          game_time: '12:00',
          location: 'Main Stadium',
          level: 'Youth',
          pay_rate: 25,
          refs_needed: 2
        }
      ]
    };

    it('should create games from tournament successfully', async () => {
      const createdGames = [
        { id: 'game-1', ...validGamesData.games[0] },
        { id: 'game-2', ...validGamesData.games[1] }
      ];

      mockTrx.returning.mockResolvedValue(createdGames);

      const response = await request(app)
        .post('/api/tournaments/create-games')
        .send(validGamesData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(2);
      expect(response.body.data.summary.requested).toBe(2);
      expect(response.body.data.summary.created).toBe(2);
      expect(response.body.data.summary.skipped).toBe(0);

      // Verify database operations
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTrx.insert).toHaveBeenCalledTimes(2);
      expect(mockTrx.commit).toHaveBeenCalled();
    });

    it('should skip bye and placeholder games', async () => {
      const gamesWithByes = {
        ...validGamesData,
        games: [
          ...validGamesData.games,
          {
            home_team_id: 'bye-1',
            away_team_id: 'team-5',
            league_id: 'league-123',
            game_date: '2024-03-01',
            game_time: '14:00',
            location: 'Main Stadium'
          },
          {
            home_team_id: 'team-6',
            away_team_id: 'winner-team-1-team-2',
            league_id: 'league-123',
            game_date: '2024-03-02',
            game_time: '10:00',
            location: 'Main Stadium'
          }
        ]
      };

      const createdGames = [
        { id: 'game-1', ...validGamesData.games[0] },
        { id: 'game-2', ...validGamesData.games[1] }
      ];

      mockTrx.returning.mockResolvedValue(createdGames);

      const response = await request(app)
        .post('/api/tournaments/create-games')
        .send(gamesWithByes)
        .expect(201);

      expect(response.body.data.summary.requested).toBe(4);
      expect(response.body.data.summary.created).toBe(2);
      expect(response.body.data.summary.skipped).toBe(2);
    });

    it('should validate games array is required', async () => {
      const response = await request(app)
        .post('/api/tournaments/create-games')
        .send({ tournament_name: 'Test' })
        .expect(400);

      expect(response.body.error).toBe('Games array is required');
    });

    it('should validate games array is not empty', async () => {
      const response = await request(app)
        .post('/api/tournaments/create-games')
        .send({ games: [] })
        .expect(400);

      expect(response.body.error).toBe('Games array is required');
    });

    it('should handle database transaction errors', async () => {
      mockTrx.insert.mockImplementation(() => {
        throw new Error('Database insert failed');
      });

      const response = await request(app)
        .post('/api/tournaments/create-games')
        .send(validGamesData)
        .expect(500);

      expect(response.body.error).toBe('Failed to create tournament games');
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    it('should set default values for missing fields', async () => {
      const minimalGameData = {
        games: [{
          home_team_id: 'team-1',
          away_team_id: 'team-2',
          league_id: 'league-123',
          game_date: '2024-03-01',
          game_time: '10:00'
        }]
      };

      mockTrx.returning.mockResolvedValue([{ id: 'game-1' }]);

      await request(app)
        .post('/api/tournaments/create-games')
        .send(minimalGameData)
        .expect(201);

      expect(mockTrx.insert).toHaveBeenCalledWith(expect.objectContaining({
        postal_code: 'T0T0T0',
        pay_rate: 25,
        refs_needed: 2,
        status: 'unassigned',
        wage_multiplier: 1.0
      }));
    });
  });

  describe('GET /formats', () => {
    it('should return all tournament formats', async () => {
      const response = await request(app)
        .get('/api/tournaments/formats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.formats).toHaveLength(4);

      const formats = response.body.data.formats;
      expect(formats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: TournamentType.ROUND_ROBIN,
            name: 'Round Robin',
            min_teams: 2,
            max_teams: 20
          }),
          expect.objectContaining({
            id: TournamentType.SINGLE_ELIMINATION,
            name: 'Single Elimination',
            min_teams: 2,
            max_teams: 64
          }),
          expect.objectContaining({
            id: TournamentType.SWISS_SYSTEM,
            name: 'Swiss System',
            min_teams: 4,
            max_teams: 50
          }),
          expect.objectContaining({
            id: TournamentType.GROUP_STAGE_PLAYOFFS,
            name: 'Group Stage + Playoffs',
            min_teams: 4,
            max_teams: 32
          })
        ])
      );
    });

    it('should include format details for each tournament type', async () => {
      const response = await request(app)
        .get('/api/tournaments/formats')
        .expect(200);

      const roundRobinFormat = response.body.data.formats.find(
        (f: any) => f.id === TournamentType.ROUND_ROBIN
      );

      expect(roundRobinFormat).toHaveProperty('description');
      expect(roundRobinFormat).toHaveProperty('pros');
      expect(roundRobinFormat).toHaveProperty('cons');
      expect(roundRobinFormat).toHaveProperty('games_formula');
      expect(roundRobinFormat).toHaveProperty('suitable_for');
    });
  });

  describe('GET /estimate', () => {
    it('should estimate round robin tournament requirements', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.ROUND_ROBIN,
          team_count: 6,
          games_per_day: 3
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament_type).toBe(TournamentType.ROUND_ROBIN);
      expect(response.body.data.team_count).toBe(6);
      expect(response.body.data.estimate).toEqual({
        total_games: 15, // 6 * 5 / 2
        games_per_team: 5,
        estimated_days: 5, // 15 games / 3 per day
        rounds: 5
      });
    });

    it('should estimate single elimination tournament requirements', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.SINGLE_ELIMINATION,
          team_count: 8,
          games_per_day: 4
        })
        .expect(200);

      expect(response.body.data.estimate).toEqual(
        expect.objectContaining({
          total_games: 7, // 8 - 1
          max_games_per_team: 3, // log2(8)
          estimated_days: 3,
          rounds: 3,
          byes_needed: 0
        })
      );
    });

    it('should estimate swiss system tournament requirements', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.SWISS_SYSTEM,
          team_count: 8,
          rounds: 5
        })
        .expect(200);

      expect(response.body.data.estimate).toEqual({
        total_games: 20, // (8 * 5) / 2
        games_per_team: 5,
        estimated_days: 5,
        rounds: 5
      });
    });

    it('should estimate group stage playoffs tournament requirements', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.GROUP_STAGE_PLAYOFFS,
          team_count: 12,
          group_size: 4,
          advance_per_group: 2
        })
        .expect(200);

      expect(response.body.data.estimate).toEqual(
        expect.objectContaining({
          total_games: expect.any(Number),
          group_stage_games: expect.any(Number),
          playoff_games: expect.any(Number),
          groups: 3,
          advancing_teams: 6
        })
      );
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.ROUND_ROBIN
          // Missing team_count
        })
        .expect(400);

      expect(response.body.error).toBe('tournament_type and team_count are required');
    });

    it('should handle invalid tournament type', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: 'invalid_type',
          team_count: 8
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid tournament type');
    });

    it('should use default rounds for swiss system when not provided', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.SWISS_SYSTEM,
          team_count: 8
        })
        .expect(200);

      // Default should be ceil(log2(8)) + 1 = 4
      expect(response.body.data.estimate.rounds).toBe(4);
    });

    it('should use default values for group stage parameters', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.GROUP_STAGE_PLAYOFFS,
          team_count: 16
        })
        .expect(200);

      // Should use default group_size=4, advance_per_group=2
      expect(response.body.data.estimate.groups).toBe(4);
      expect(response.body.data.estimate.advancing_teams).toBe(8);
    });

    it('should handle estimation errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.ROUND_ROBIN,
          team_count: 'invalid' // This should cause parsing error
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to estimate tournament');

      consoleSpy.mockRestore();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for generate endpoint', async () => {
      mockAuthMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send({})
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should require admin role for generate endpoint', async () => {
      mockAuthMiddleware.requireRole.mockImplementation((role: string) =>
        (req: any, res: any, next: any) => {
          if (role === 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        }
      );

      const response = await request(app)
        .post('/api/tournaments/generate')
        .send({})
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should require authentication for create-games endpoint', async () => {
      mockAuthMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const response = await request(app)
        .post('/api/tournaments/create-games')
        .send({})
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should allow public access to formats endpoint', async () => {
      const response = await request(app)
        .get('/api/tournaments/formats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow public access to estimate endpoint', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.ROUND_ROBIN,
          team_count: 4
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/tournaments/generate')
        .send('invalid json')
        .expect(400);

      // Express handles malformed JSON automatically
      expect(response.body).toBeDefined();
    });

    it('should handle very large team counts gracefully', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.ROUND_ROBIN,
          team_count: 1000000 // Very large number
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimate.total_games).toBeDefined();
    });

    it('should handle negative team counts', async () => {
      const response = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.ROUND_ROBIN,
          team_count: -5
        })
        .expect(200);

      // Should handle gracefully even if calculations become strange
      expect(response.body.success).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete tournament workflow', async () => {
      // Step 1: Get tournament formats
      const formatsResponse = await request(app)
        .get('/api/tournaments/formats')
        .expect(200);

      expect(formatsResponse.body.data.formats).toHaveLength(4);

      // Step 2: Estimate tournament requirements
      const estimateResponse = await request(app)
        .get('/api/tournaments/estimate')
        .query({
          tournament_type: TournamentType.ROUND_ROBIN,
          team_count: 6
        })
        .expect(200);

      expect(estimateResponse.body.data.estimate.total_games).toBe(15);

      // Step 3: Generate tournament
      const mockLeague = { id: 'league-123', name: 'Test League', level: 'Youth' };
      const mockTeams = Array.from({ length: 6 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        rank: i + 1
      }));

      mockDb.first.mockResolvedValueOnce(mockLeague);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.whereIn.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockTeams);
      mockTournamentGenerator.generateRoundRobin.mockReturnValue({
        type: TournamentType.ROUND_ROBIN,
        total_games: 15,
        total_rounds: 5,
        games: Array.from({ length: 15 }, (_, i) => ({
          home_team_id: `team-${Math.floor(i / 3) + 1}`,
          away_team_id: `team-${(i % 3) + 1}`,
          home_team_name: `Team ${Math.floor(i / 3) + 1}`,
          away_team_name: `Team ${(i % 3) + 1}`,
          game_date: '2024-03-01',
          game_time: '10:00',
          location: 'Stadium',
          round: Math.floor(i / 3) + 1,
          tournament_type: TournamentType.ROUND_ROBIN
        })),
        rounds: [],
        summary: {
          teams_count: 6,
          games_per_team: 5,
          estimated_duration_days: 5,
          format: 'Round Robin'
        }
      });

      const generateResponse = await request(app)
        .post('/api/tournaments/generate')
        .send({
          name: 'Integration Test Tournament',
          league_id: 'league-123',
          tournament_type: TournamentType.ROUND_ROBIN,
          team_ids: mockTeams.map(t => t.id),
          start_date: '2024-03-01'
        })
        .expect(201);

      expect(generateResponse.body.data.tournament.games).toHaveLength(15);

      // Step 4: Create games from tournament
      mockTrx.returning.mockResolvedValue(
        generateResponse.body.data.tournament.games.map((game: any, i: number) => ({
          id: `game-${i + 1}`,
          ...game
        }))
      );

      const createResponse = await request(app)
        .post('/api/tournaments/create-games')
        .send({
          tournament_name: 'Integration Test Tournament',
          games: generateResponse.body.data.tournament.games
        })
        .expect(201);

      expect(createResponse.body.data.created).toHaveLength(15);
      expect(createResponse.body.data.summary.created).toBe(15);
    });
  });
});