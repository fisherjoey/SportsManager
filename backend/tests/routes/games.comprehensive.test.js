/**
 * @fileoverview Comprehensive Games Management API Tests
 * Tests all games-related functions with extensive edge cases
 * Critical for core business operations - games are the heart of the system
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createTestApp, createAuthToken, createTestData } = require('../helpers/test-helpers');

// Mock database to avoid dependency issues
const mockDb = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  del: jest.fn(),
  returning: jest.fn(),
  count: jest.fn().mockReturnThis()
};

jest.mock('../../src/config/database', () => () => mockDb);

describe('Games Management API - Comprehensive Tests', () => {
  let app;
  let adminToken, refereeToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  beforeEach(() => {
    // Reset all mocks
    Object.keys(mockDb).forEach(key => {
      if (typeof mockDb[key] === 'function') {
        mockDb[key].mockClear();
      }
    });

    // Create test app
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Access token required' });
      }
      
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'test-secret-key');
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    });

    // Import games routes after mocking
    const gamesRouter = require('../../src/routes/games');
    app.use('/api/games', gamesRouter);

    // Create test tokens
    adminToken = jwt.sign(
      { userId: 'admin123', email: 'admin@test.com', role: 'admin' },
      'test-secret-key',
      { expiresIn: '1h' }
    );

    refereeToken = jwt.sign(
      { userId: 'ref123', email: 'referee@test.com', role: 'referee' },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('GET /api/games - Retrieve Games', () => {
    describe('Successful Retrieval', () => {
      beforeEach(() => {
        // Mock successful database response
        mockDb.first.mockResolvedValue({ count: 25 });
        mockDb.returning.mockResolvedValue([
          {
            id: 'game1',
            home_team_id: 'team1',
            away_team_id: 'team2',
            game_date: '2024-12-01',
            game_time: '14:00:00',
            location: 'Stadium A',
            postal_code: 'T1S 1A1',
            level: 'Recreational',
            status: 'unassigned',
            refs_needed: 2,
            wage_multiplier: 1.0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'game2',
            home_team_id: 'team3',
            away_team_id: 'team4',
            game_date: '2024-12-02',
            game_time: '16:00:00',
            location: 'Stadium B',
            postal_code: 'T2M 4N3',
            level: 'Competitive',
            status: 'assigned',
            refs_needed: 3,
            wage_multiplier: 1.2,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]);
      });

      it('should retrieve all games for admin', async () => {
        const response = await request(app)
          .get('/api/games')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(2);
        
        // Verify database was called correctly
        expect(mockDb.select).toHaveBeenCalled();
        expect(mockDb.orderBy).toHaveBeenCalledWith('game_date', 'asc');
      });

      it('should handle pagination parameters', async () => {
        const response = await request(app)
          .get('/api/games?page=2&limit=10')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(mockDb.limit).toHaveBeenCalledWith(10);
        expect(mockDb.offset).toHaveBeenCalledWith(10); // (page-1) * limit
      });

      it('should filter games by status', async () => {
        const response = await request(app)
          .get('/api/games?status=unassigned')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(mockDb.where).toHaveBeenCalledWith('status', 'unassigned');
      });

      it('should filter games by date range', async () => {
        const response = await request(app)
          .get('/api/games?start_date=2024-12-01&end_date=2024-12-31')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(mockDb.where).toHaveBeenCalledWith('game_date', '>=', '2024-12-01');
        expect(mockDb.where).toHaveBeenCalledWith('game_date', '<=', '2024-12-31');
      });

      it('should filter games by level', async () => {
        const response = await request(app)
          .get('/api/games?level=Competitive')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(mockDb.where).toHaveBeenCalledWith('level', 'Competitive');
      });

      it('should filter games by game_type', async () => {
        const response = await request(app)
          .get('/api/games?game_type=Tournament')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(mockDb.where).toHaveBeenCalledWith('game_type', 'Tournament');
      });

      it('should handle multiple filters simultaneously', async () => {
        const response = await request(app)
          .get('/api/games?status=unassigned&level=Competitive&start_date=2024-12-01')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(mockDb.where).toHaveBeenCalledWith('status', 'unassigned');
        expect(mockDb.where).toHaveBeenCalledWith('level', 'Competitive');
        expect(mockDb.where).toHaveBeenCalledWith('game_date', '>=', '2024-12-01');
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid pagination parameters', async () => {
        const response = await request(app)
          .get('/api/games?page=-1&limit=0')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('page');
      });

      it('should reject invalid date format', async () => {
        const response = await request(app)
          .get('/api/games?start_date=invalid-date')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('date');
      });

      it('should reject invalid status values', async () => {
        const response = await request(app)
          .get('/api/games?status=invalid-status')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('status');
      });

      it('should reject invalid level values', async () => {
        const response = await request(app)
          .get('/api/games?level=InvalidLevel')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('level');
      });

      it('should reject invalid game_type values', async () => {
        const response = await request(app)
          .get('/api/games?game_type=InvalidType')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('game_type');
      });

      it('should handle extremely large limit values', async () => {
        const response = await request(app)
          .get('/api/games?limit=10000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('limit');
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/games');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Access token required');
      });

      it('should allow referee access to games', async () => {
        mockDb.returning.mockResolvedValue([]);
        mockDb.first.mockResolvedValue({ count: 0 });

        const response = await request(app)
          .get('/api/games')
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(200);
      });

      it('should reject invalid tokens', async () => {
        const response = await request(app)
          .get('/api/games')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Invalid token');
      });
    });

    describe('Database Error Handling', () => {
      it('should handle database connection errors', async () => {
        mockDb.select.mockRejectedValue(new Error('Database connection failed'));

        const response = await request(app)
          .get('/api/games')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });

      it('should handle timeout errors', async () => {
        mockDb.select.mockRejectedValue(new Error('Query timeout'));

        const response = await request(app)
          .get('/api/games')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(500);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty result set', async () => {
        mockDb.returning.mockResolvedValue([]);
        mockDb.first.mockResolvedValue({ count: 0 });

        const response = await request(app)
          .get('/api/games')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([]);
        expect(response.body.pagination.total).toBe(0);
      });

      it('should handle very large datasets', async () => {
        mockDb.first.mockResolvedValue({ count: 10000 });
        mockDb.returning.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/games?page=100')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination.total).toBe(10000);
      });

      it('should handle special characters in query parameters', async () => {
        mockDb.returning.mockResolvedValue([]);
        mockDb.first.mockResolvedValue({ count: 0 });

        const response = await request(app)
          .get(`/api/games?search=${  encodeURIComponent('Team André vs Björk')}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
      });

      it('should handle concurrent requests', async () => {
        mockDb.returning.mockResolvedValue([]);
        mockDb.first.mockResolvedValue({ count: 0 });

        const promises = Array(10).fill().map(() =>
          request(app)
            .get('/api/games')
            .set('Authorization', `Bearer ${adminToken}`)
        );

        const responses = await Promise.all(promises);
        
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
      });
    });
  });

  describe('GET /api/games/:id - Retrieve Single Game', () => {
    describe('Successful Retrieval', () => {
      beforeEach(() => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          home_team_id: 'team1',
          away_team_id: 'team2',
          game_date: '2024-12-01',
          game_time: '14:00:00',
          location: 'Stadium A',
          postal_code: 'T1S 1A1',
          level: 'Recreational',
          status: 'unassigned',
          refs_needed: 2,
          wage_multiplier: 1.0
        });
      });

      it('should retrieve game by valid ID', async () => {
        const response = await request(app)
          .get('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.id).toBe('game123');
        expect(mockDb.where).toHaveBeenCalledWith('id', 'game123');
      });

      it('should return 404 for non-existent game', async () => {
        mockDb.first.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/games/nonexistent')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Game not found');
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid UUID format', async () => {
        const response = await request(app)
          .get('/api/games/not-a-uuid')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid game ID format');
      });

      it('should handle empty ID parameter', async () => {
        const response = await request(app)
          .get('/api/games/')
          .set('Authorization', `Bearer ${adminToken}`);

        // Should match the general GET route instead
        expect(response.status).toBe(200);
      });
    });

    describe('Security Tests', () => {
      it('should prevent SQL injection in ID parameter', async () => {
        const maliciousId = '\'; DROP TABLE games; --';
        
        const response = await request(app)
          .get(`/api/games/${encodeURIComponent(maliciousId)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        // Verify database wasn't called with malicious input
        expect(mockDb.where).not.toHaveBeenCalledWith('id', maliciousId);
      });
    });
  });

  describe('POST /api/games - Create Game', () => {
    const validGameData = {
      homeTeam: {
        organization: 'Test Org',
        ageGroup: 'U15',
        gender: 'Boys',
        rank: 1
      },
      awayTeam: {
        organization: 'Test Org',
        ageGroup: 'U15',
        gender: 'Boys',
        rank: 2
      },
      date: '2024-12-01',
      time: '14:00',
      location: 'Test Stadium',
      postalCode: 'T1S 1A1',
      level: 'Recreational',
      gameType: 'Community',
      division: 'Division 1',
      season: '2024/25',
      payRate: 45.00,
      refsNeeded: 2,
      wageMultiplier: 1.0
    };

    describe('Successful Creation', () => {
      beforeEach(() => {
        mockDb.returning.mockResolvedValue([{
          id: 'new-game-id',
          ...validGameData,
          status: 'unassigned',
          created_at: '2024-01-01T00:00:00Z'
        }]);
      });

      it('should create game with valid data', async () => {
        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validGameData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.id).toBe('new-game-id');
        
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should set default values correctly', async () => {
        const minimalData = {
          ...validGameData,
          gameType: undefined, // Should default to 'Community'
          refsNeeded: undefined, // Should default to 2
          wageMultiplier: undefined // Should default to 1.0
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(minimalData);

        expect(response.status).toBe(201);
      });
    });

    describe('Input Validation', () => {
      it('should reject missing required fields', async () => {
        const incompleteData = {
          homeTeam: validGameData.homeTeam,
          // Missing awayTeam and other required fields
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject invalid date format', async () => {
        const invalidData = {
          ...validGameData,
          date: 'invalid-date'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('date');
      });

      it('should reject invalid time format', async () => {
        const invalidData = {
          ...validGameData,
          time: '25:00' // Invalid time
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('time');
      });

      it('should reject invalid gender values', async () => {
        const invalidData = {
          ...validGameData,
          homeTeam: {
            ...validGameData.homeTeam,
            gender: 'Invalid'
          }
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('gender');
      });

      it('should reject invalid gameType values', async () => {
        const invalidData = {
          ...validGameData,
          gameType: 'InvalidType'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('gameType');
      });

      it('should reject negative or zero payRate', async () => {
        const invalidData = {
          ...validGameData,
          payRate: -10
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('payRate');
      });

      it('should reject invalid refsNeeded range', async () => {
        const invalidData = {
          ...validGameData,
          refsNeeded: 15 // Too many refs
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('refsNeeded');
      });

      it('should reject invalid wageMultiplier range', async () => {
        const invalidData = {
          ...validGameData,
          wageMultiplier: 10.0 // Too high
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('wageMultiplier');
      });

      it('should reject postal code that is too long', async () => {
        const invalidData = {
          ...validGameData,
          postalCode: 'T1S 1A1 EXTRA LONG TEXT'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('postalCode');
      });
    });

    describe('Business Rule Validation', () => {
      it('should reject same team playing against itself', async () => {
        const sameTeamData = {
          ...validGameData,
          awayTeam: validGameData.homeTeam // Same team
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(sameTeamData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('same team');
      });

      it('should reject games scheduled in the past', async () => {
        const pastGameData = {
          ...validGameData,
          date: '2020-01-01' // Past date
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pastGameData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('past');
      });
    });

    describe('Authorization', () => {
      it('should require admin role for game creation', async () => {
        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(validGameData);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Insufficient permissions');
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .post('/api/games')
          .send(validGameData);

        expect(response.status).toBe(401);
      });
    });

    describe('Database Error Handling', () => {
      it('should handle duplicate game creation attempts', async () => {
        mockDb.insert.mockRejectedValue({ code: '23505' }); // Unique violation

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validGameData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('already exists');
      });

      it('should handle database connection failures', async () => {
        mockDb.insert.mockRejectedValue(new Error('Connection failed'));

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validGameData);

        expect(response.status).toBe(500);
      });
    });

    describe('Edge Cases', () => {
      it('should handle Unicode characters in team names', async () => {
        const unicodeData = {
          ...validGameData,
          homeTeam: {
            ...validGameData.homeTeam,
            organization: 'Malmö FF'
          },
          awayTeam: {
            ...validGameData.awayTeam,
            organization: 'København FC'
          }
        };

        mockDb.returning.mockResolvedValue([{ id: 'unicode-game' }]);

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(unicodeData);

        expect(response.status).toBe(201);
      });

      it('should handle very long location names', async () => {
        const longLocationData = {
          ...validGameData,
          location: 'A'.repeat(255) // Max allowed length
        };

        mockDb.returning.mockResolvedValue([{ id: 'long-location-game' }]);

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(longLocationData);

        expect(response.status).toBe(201);
      });

      it('should handle maximum wage multiplier values', async () => {
        const maxMultiplierData = {
          ...validGameData,
          wageMultiplier: 5.0, // Maximum allowed
          wageMultiplierReason: 'Holiday premium pay'
        };

        mockDb.returning.mockResolvedValue([{ id: 'max-multiplier-game' }]);

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(maxMultiplierData);

        expect(response.status).toBe(201);
      });
    });
  });

  describe('PUT /api/games/:id - Update Game', () => {
    const updateData = {
      location: 'Updated Stadium',
      time: '16:00',
      refsNeeded: 3,
      wageMultiplier: 1.5,
      wageMultiplierReason: 'Championship game'
    };

    describe('Successful Updates', () => {
      beforeEach(() => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'unassigned'
        });
        mockDb.returning.mockResolvedValue([{
          id: 'game123',
          ...updateData,
          updated_at: '2024-01-02T00:00:00Z'
        }]);
      });

      it('should update game with valid data', async () => {
        const response = await request(app)
          .put('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        
        expect(mockDb.where).toHaveBeenCalledWith('id', 'game123');
        expect(mockDb.update).toHaveBeenCalled();
      });

      it('should allow partial updates', async () => {
        const partialUpdate = {
          location: 'New Location Only'
        };

        const response = await request(app)
          .put('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(partialUpdate);

        expect(response.status).toBe(200);
      });
    });

    describe('Validation and Business Rules', () => {
      beforeEach(() => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'unassigned'
        });
      });

      it('should prevent updates to assigned games', async () => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'assigned'
        });

        const response = await request(app)
          .put('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('assigned');
      });

      it('should prevent updates to completed games', async () => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'completed'
        });

        const response = await request(app)
          .put('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('completed');
      });

      it('should return 404 for non-existent game', async () => {
        mockDb.first.mockResolvedValue(null);

        const response = await request(app)
          .put('/api/games/nonexistent')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Game not found');
      });

      it('should validate update data', async () => {
        const invalidUpdate = {
          time: '25:00', // Invalid time
          refsNeeded: -1 // Invalid refs needed
        };

        const response = await request(app)
          .put('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
      });
    });

    describe('Authorization', () => {
      it('should require admin role for updates', async () => {
        const response = await request(app)
          .put('/api/games/game123')
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(updateData);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('DELETE /api/games/:id - Delete Game', () => {
    describe('Successful Deletion', () => {
      beforeEach(() => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'unassigned'
        });
        mockDb.del.mockResolvedValue(1);
      });

      it('should delete unassigned game', async () => {
        const response = await request(app)
          .delete('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(mockDb.del).toHaveBeenCalled();
      });
    });

    describe('Business Rule Validation', () => {
      it('should prevent deletion of assigned games', async () => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'assigned'
        });

        const response = await request(app)
          .delete('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('assigned');
        expect(mockDb.del).not.toHaveBeenCalled();
      });

      it('should prevent deletion of completed games', async () => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'completed'
        });

        const response = await request(app)
          .delete('/api/games/game123')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('completed');
      });

      it('should return 404 for non-existent game', async () => {
        mockDb.first.mockResolvedValue(null);

        const response = await request(app)
          .delete('/api/games/nonexistent')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('Authorization', () => {
      it('should require admin role for deletion', async () => {
        const response = await request(app)
          .delete('/api/games/game123')
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('PATCH /api/games/:id/status - Update Game Status', () => {
    describe('Valid Status Transitions', () => {
      beforeEach(() => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'unassigned'
        });
        mockDb.returning.mockResolvedValue([{
          id: 'game123',
          status: 'assigned'
        }]);
      });

      it('should update game status', async () => {
        const response = await request(app)
          .patch('/api/games/game123/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'assigned' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('assigned');
      });

      it('should validate status transitions', async () => {
        // Valid transitions: unassigned -> assigned -> completed
        const validTransitions = [
          { from: 'unassigned', to: 'assigned' },
          { from: 'assigned', to: 'completed' },
          { from: 'assigned', to: 'unassigned' } // Allow un-assignment
        ];

        for (const transition of validTransitions) {
          mockDb.first.mockResolvedValue({
            id: 'game123',
            status: transition.from
          });

          const response = await request(app)
            .patch('/api/games/game123/status')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: transition.to });

          expect(response.status).toBe(200);
        }
      });

      it('should reject invalid status transitions', async () => {
        mockDb.first.mockResolvedValue({
          id: 'game123',
          status: 'completed' // Cannot change from completed
        });

        const response = await request(app)
          .patch('/api/games/game123/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'unassigned' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('transition');
      });

      it('should reject invalid status values', async () => {
        const response = await request(app)
          .patch('/api/games/game123/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'invalid-status' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('status');
      });
    });

    describe('Authorization', () => {
      it('should require admin role for status updates', async () => {
        const response = await request(app)
          .patch('/api/games/game123/status')
          .set('Authorization', `Bearer ${refereeToken}`)
          .send({ status: 'assigned' });

        expect(response.status).toBe(403);
      });
    });
  });
});