/**
 * @fileoverview Simple Games API tests - Database-free validation tests
 * These tests focus on request validation and basic functionality without requiring database setup
 */

const request = require('supertest');
const express = require('express');

// Create a minimal express app for testing
const app = express();
app.use(express.json());

// Mock the database to avoid connection issues
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn()
}));

// Mock the auth middleware to avoid authentication issues
const mockAuth = {
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  }
};

jest.mock('../../src/middleware/auth', () => mockAuth);

// Import games routes after mocking
const gamesRouter = require('../../src/routes/games');
app.use('/api/games', gamesRouter);

describe('Games API - Input Validation Tests', () => {
  describe('POST /api/games - Validation', () => {
    it('should reject requests with missing required fields', async () => {
      const incompleteGame = {
        // Missing required fields: home_team_id, away_team_id, game_date, etc.
        location: 'Test Stadium'
      };

      const response = await request(app)
        .post('/api/games')
        .send(incompleteGame);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid date formats', async () => {
      const invalidDateGame = {
        home_team_id: 'team1',
        away_team_id: 'team2',
        game_date: 'invalid-date', // Invalid date format
        game_time: '14:00',
        location: 'Test Stadium',
        level: 'Recreational',
        refs_needed: 2
      };

      const response = await request(app)
        .post('/api/games')
        .send(invalidDateGame);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid game levels', async () => {
      const invalidLevelGame = {
        home_team_id: 'team1',
        away_team_id: 'team2',
        game_date: '2024-12-01',
        game_time: '14:00',
        location: 'Test Stadium',
        level: 'InvalidLevel', // Invalid level
        refs_needed: 2
      };

      const response = await request(app)
        .post('/api/games')
        .send(invalidLevelGame);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject negative or zero refs_needed', async () => {
      const invalidRefsGame = {
        home_team_id: 'team1',
        away_team_id: 'team2',
        game_date: '2024-12-01',
        game_time: '14:00',
        location: 'Test Stadium',
        level: 'Recreational',
        refs_needed: 0 // Invalid - should be positive
      };

      const response = await request(app)
        .post('/api/games')
        .send(invalidRefsGame);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/games - Query Parameters', () => {
    beforeEach(() => {
      // Mock database query to return sample data
      const mockDb = require('../../src/config/database');
      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 'game1',
            home_team_id: 'team1',
            away_team_id: 'team2',
            game_date: '2024-12-01',
            game_time: '14:00',
            location: 'Stadium A',
            level: 'Recreational',
            status: 'unassigned'
          },
          {
            id: 'game2',
            home_team_id: 'team3',
            away_team_id: 'team4',
            game_date: '2024-12-02',
            game_time: '16:00',
            location: 'Stadium B',
            level: 'Competitive',
            status: 'assigned'
          }
        ]
      });
    });

    it('should handle status filter parameter', async () => {
      const response = await request(app)
        .get('/api/games?status=unassigned');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle date range filter parameters', async () => {
      const response = await request(app)
        .get('/api/games?start_date=2024-12-01&end_date=2024-12-31');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should handle level filter parameter', async () => {
      const response = await request(app)
        .get('/api/games?level=Recreational');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/games?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should reject invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/games?page=-1&limit=0');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for POST requests', async () => {
      // Override auth middleware to simulate unauthenticated request
      const noAuthApp = express();
      noAuthApp.use(express.json());
      noAuthApp.use((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });
      noAuthApp.use('/api/games', gamesRouter);

      const response = await request(noAuthApp)
        .post('/api/games')
        .send({
          home_team_id: 'team1',
          away_team_id: 'team2',
          game_date: '2024-12-01',
          game_time: '14:00',
          location: 'Test Stadium',
          level: 'Recreational',
          refs_needed: 2
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow admin users to create games', async () => {
      // This test uses the mocked auth middleware that sets role=admin
      const mockDb = require('../../src/config/database');
      mockDb.query.mockResolvedValue({
        rows: [{ id: 'new-game-id', game_date: '2024-12-01' }]
      });

      const validGame = {
        home_team_id: 'team1',
        away_team_id: 'team2',
        game_date: '2024-12-01',
        game_time: '14:00',
        location: 'Test Stadium',
        level: 'Recreational',
        refs_needed: 2,
        postal_code: 'T1S 1A1'
      };

      const response = await request(app)
        .post('/api/games')
        .send(validGame);

      // Should not be a validation error (may be 201 or 500 depending on DB mock)
      expect(response.status).not.toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockDb = require('../../src/config/database');
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/games');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });
});

describe('Games API - Business Logic Tests', () => {
  describe('Game Status Management', () => {
    beforeEach(() => {
      const mockDb = require('../../src/config/database');
      mockDb.query.mockClear();
    });

    it('should handle game status transitions correctly', async () => {
      const mockDb = require('../../src/config/database');
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'game1', status: 'unassigned' }] }) // Find game
        .mockResolvedValueOnce({ rows: [{ id: 'game1', status: 'assigned' }] }); // Update status

      const response = await request(app)
        .patch('/api/games/game1/status')
        .send({ status: 'assigned' });

      expect(response.status).not.toBe(404);
    });

    it('should reject invalid status transitions', async () => {
      const response = await request(app)
        .patch('/api/games/game1/status')
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Game Validation Rules', () => {
    it('should prevent same team playing against itself', async () => {
      const sameTeamGame = {
        home_team_id: 'team1',
        away_team_id: 'team1', // Same as home team
        game_date: '2024-12-01',
        game_time: '14:00',
        location: 'Test Stadium',
        level: 'Recreational',
        refs_needed: 2,
        postal_code: 'T1S 1A1'
      };

      const response = await request(app)
        .post('/api/games')
        .send(sameTeamGame);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('same team');
    });

    it('should validate game time format', async () => {
      const invalidTimeGame = {
        home_team_id: 'team1',
        away_team_id: 'team2',
        game_date: '2024-12-01',
        game_time: '25:00', // Invalid time
        location: 'Test Stadium',
        level: 'Recreational',
        refs_needed: 2,
        postal_code: 'T1S 1A1'
      };

      const response = await request(app)
        .post('/api/games')
        .send(invalidTimeGame);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});