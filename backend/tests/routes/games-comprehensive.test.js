/**
 * @fileoverview Comprehensive Games API Tests
 * Tests all games CRUD operations with extensive edge cases
 * Critical business logic - must test every code path
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const config = require('../../knexfile');
const app = require('../../src/app');

const testDb = knex(config.test);

describe('Games API - Comprehensive Tests', () => {
  let adminToken, refereeToken;
  let testLeague, testTeam1, testTeam2;
  let testRefLevel;

  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeAll(async () => {
    await testDb.migrate.latest();
    
    // Create test referee level
    [testRefLevel] = await testDb('referee_levels').insert({
      name: 'Test Level',
      wage_amount: 50.00
    }).returning('*');

    // Create admin and referee users
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 12);

    const [adminUser] = await testDb('users').insert({
      email: 'admin@gamestest.com',
      password_hash: passwordHash,
      role: 'admin',
      name: 'Test Admin'
    }).returning('*');

    const [refereeUser] = await testDb('users').insert({
      email: 'referee@gamestest.com',
      password_hash: passwordHash,
      role: 'referee',
      name: 'Test Referee',
      referee_level_id: testRefLevel.id
    }).returning('*');

    // Create referee record
    await testDb('referees').insert({
      user_id: refereeUser.id
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    refereeToken = jwt.sign(
      { userId: refereeUser.id, email: refereeUser.email, role: 'referee' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test league and teams
    [testLeague] = await testDb('leagues').insert({
      organization: 'Test Games League',
      age_group: 'U15',
      gender: 'Boys', 
      division: 'Division 1',
      season: '2024/25',
      level: 'Competitive'
    }).returning('*');

    [testTeam1, testTeam2] = await testDb('teams').insert([
      { name: 'Test Team Alpha', location: 'Stadium A', league_id: testLeague.id },
      { name: 'Test Team Beta', location: 'Stadium B', league_id: testLeague.id }
    ]).returning('*');
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  beforeEach(async () => {
    // Clean games and assignments for each test
    await testDb.raw('TRUNCATE TABLE game_assignments CASCADE');
    await testDb.raw('TRUNCATE TABLE games RESTART IDENTITY CASCADE');
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
      date: '2024-12-15',
      time: '14:00',
      location: 'Central Stadium',
      postalCode: 'T1S 1A1',
      level: 'Competitive',
      gameType: 'Community',
      division: 'Division 1',
      season: '2024/25',
      payRate: 65.00,
      refsNeeded: 2,
      wageMultiplier: 1.0
    };

    describe('Valid Game Creation', () => {
      it('should create game with valid data as admin', async () => {
        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validGameData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.location).toBe('Central Stadium');
        expect(response.body.data.status).toBe('unassigned');
        expect(response.body.data.refs_needed).toBe(2);
      });

      it('should create game with default values', async () => {
        const gameWithDefaults = {
          ...validGameData,
          gameType: undefined, // Should default to 'Community'
          refsNeeded: undefined, // Should default to 2
          wageMultiplier: undefined // Should default to 1.0
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(gameWithDefaults);

        expect(response.status).toBe(201);
        expect(response.body.data.game_type).toBe('Community');
        expect(response.body.data.refs_needed).toBe(2);
        expect(response.body.data.wage_multiplier).toBe('1.0');
      });

      it('should create game with wage multiplier and reason', async () => {
        const gameWithMultiplier = {
          ...validGameData,
          wageMultiplier: 1.5,
          wageMultiplierReason: 'Holiday game premium'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(gameWithMultiplier);

        expect(response.status).toBe(201);
        expect(response.body.data.wage_multiplier).toBe('1.5');
        expect(response.body.data.wage_multiplier_reason).toBe('Holiday game premium');
      });

      it('should create tournament game type', async () => {
        const tournamentGame = {
          ...validGameData,
          gameType: 'Tournament',
          wageMultiplier: 1.25
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(tournamentGame);

        expect(response.status).toBe(201);
        expect(response.body.data.game_type).toBe('Tournament');
      });

      it('should create private tournament game', async () => {
        const privateGame = {
          ...validGameData,
          gameType: 'Private Tournament',
          payRate: 100.00,
          wageMultiplier: 2.0
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(privateGame);

        expect(response.status).toBe(201);
        expect(response.body.data.game_type).toBe('Private Tournament');
        expect(response.body.data.wage_multiplier).toBe('2.0');
      });

      it('should create game with maximum refs needed', async () => {
        const maxRefsGame = {
          ...validGameData,
          refsNeeded: 10 // Maximum allowed
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(maxRefsGame);

        expect(response.status).toBe(201);
        expect(response.body.data.refs_needed).toBe(10);
      });
    });

    describe('Input Validation', () => {
      it('should reject missing required fields', async () => {
        const incompleteGame = {
          location: 'Stadium'
          // Missing homeTeam, awayTeam, date, etc.
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(incompleteGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });

      it('should reject invalid date format', async () => {
        const invalidDateGame = {
          ...validGameData,
          date: 'invalid-date-format'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidDateGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('date');
      });

      it('should reject invalid time format', async () => {
        const invalidTimeGame = {
          ...validGameData,
          time: '25:00' // Invalid hour
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidTimeGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('time');
      });

      it('should reject same teams playing each other', async () => {
        const sameTeamGame = {
          ...validGameData,
          homeTeam: validGameData.homeTeam,
          awayTeam: validGameData.homeTeam // Same team
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(sameTeamGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('same team');
      });

      it('should reject invalid game type', async () => {
        const invalidGameTypeGame = {
          ...validGameData,
          gameType: 'InvalidType'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidGameTypeGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('gameType');
      });

      it('should reject invalid refs needed count', async () => {
        const invalidRefsGame = {
          ...validGameData,
          refsNeeded: 0 // Must be at least 1
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidRefsGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('refs');
      });

      it('should reject too many refs needed', async () => {
        const tooManyRefsGame = {
          ...validGameData,
          refsNeeded: 11 // More than maximum of 10
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(tooManyRefsGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('refs');
      });

      it('should reject invalid wage multiplier', async () => {
        const invalidMultiplierGame = {
          ...validGameData,
          wageMultiplier: 0 // Too low
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidMultiplierGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('multiplier');
      });

      it('should reject excessive wage multiplier', async () => {
        const excessiveMultiplierGame = {
          ...validGameData,
          wageMultiplier: 6.0 // More than maximum of 5.0
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(excessiveMultiplierGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('multiplier');
      });

      it('should reject negative pay rate', async () => {
        const negativePayGame = {
          ...validGameData,
          payRate: -10.00
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(negativePayGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('payRate');
      });

      it('should reject invalid gender values', async () => {
        const invalidGenderGame = {
          ...validGameData,
          homeTeam: {
            ...validGameData.homeTeam,
            gender: 'InvalidGender'
          }
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidGenderGame);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('gender');
      });
    });

    describe('Authorization', () => {
      it('should reject game creation without authentication', async () => {
        const response = await request(app)
          .post('/api/games')
          .send(validGameData);

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('token required');
      });

      it('should reject game creation by referee', async () => {
        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(validGameData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });

      it('should reject invalid token', async () => {
        const response = await request(app)
          .post('/api/games')
          .set('Authorization', 'Bearer invalid-token')
          .send(validGameData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Invalid');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long location names', async () => {
        const longLocationGame = {
          ...validGameData,
          location: 'A'.repeat(255) // Very long location
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(longLocationGame);

        expect(response.status).toBe(201);
        expect(response.body.data.location).toBe('A'.repeat(255));
      });

      it('should handle special characters in location', async () => {
        const specialLocationGame = {
          ...validGameData,
          location: 'Stade François-Mitterrand (Complexe Sportif #1)'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(specialLocationGame);

        expect(response.status).toBe(201);
        expect(response.body.data.location).toContain('François-Mitterrand');
      });

      it('should handle minimum valid date (today)', async () => {
        const today = new Date().toISOString().split('T')[0];
        const todayGame = {
          ...validGameData,
          date: today
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(todayGame);

        expect(response.status).toBe(201);
      });

      it('should handle far future date', async () => {
        const futureGame = {
          ...validGameData,
          date: '2030-12-31'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(futureGame);

        expect(response.status).toBe(201);
      });

      it('should handle early morning time', async () => {
        const earlyGame = {
          ...validGameData,
          time: '06:00'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(earlyGame);

        expect(response.status).toBe(201);
        expect(response.body.data.game_time).toBe('06:00:00');
      });

      it('should handle late night time', async () => {
        const lateGame = {
          ...validGameData,
          time: '23:30'
        };

        const response = await request(app)
          .post('/api/games')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(lateGame);

        expect(response.status).toBe(201);
        expect(response.body.data.game_time).toBe('23:30:00');
      });
    });
  });

  describe('GET /api/games - Retrieve Games', () => {
    let testGame1, testGame2, testGame3;

    beforeEach(async () => {
      // Create test games
      [testGame1, testGame2, testGame3] = await testDb('games').insert([
        {
          home_team_id: testTeam1.id,
          away_team_id: testTeam2.id,
          game_date: '2024-12-15',
          game_time: '14:00',
          location: 'Stadium A',
          postal_code: 'T1S 1A1',
          level: 'Competitive',
          game_type: 'Community',
          status: 'unassigned',
          refs_needed: 2,
          wage_multiplier: 1.0
        },
        {
          home_team_id: testTeam2.id,
          away_team_id: testTeam1.id,
          game_date: '2024-12-16',
          game_time: '16:00',
          location: 'Stadium B',
          postal_code: 'T2M 4N3',
          level: 'Recreational',
          game_type: 'Tournament',
          status: 'assigned',
          refs_needed: 1,
          wage_multiplier: 1.25
        },
        {
          home_team_id: testTeam1.id,
          away_team_id: testTeam2.id,
          game_date: '2024-12-17',
          game_time: '18:00',
          location: 'Stadium C',
          postal_code: 'T3H 2Y5',
          level: 'Elite',
          game_type: 'Private Tournament',
          status: 'completed',
          refs_needed: 3,
          wage_multiplier: 2.0
        }
      ]).returning('*');
    });

    describe('Basic Retrieval', () => {
      it('should get all games as admin', async () => {
        const response = await request(app)
          .get('/api/games')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(3);
        expect(response.body.data[0]).toHaveProperty('id');
        expect(response.body.data[0]).toHaveProperty('location');
      });

      it('should get all games as referee', async () => {
        const response = await request(app)
          .get('/api/games')
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(3);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/games');

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('required');
      });
    });

    describe('Filtering', () => {
      it('should filter games by status', async () => {
        const response = await request(app)
          .get('/api/games?status=unassigned')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe('unassigned');
      });

      it('should filter games by multiple statuses', async () => {
        const response = await request(app)
          .get('/api/games?status=unassigned,assigned')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });

      it('should filter games by game type', async () => {
        const response = await request(app)
          .get('/api/games?game_type=Tournament')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].game_type).toBe('Tournament');
      });

      it('should filter games by level', async () => {
        const response = await request(app)
          .get('/api/games?level=Competitive')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].level).toBe('Competitive');
      });

      it('should filter games by date range', async () => {
        const response = await request(app)
          .get('/api/games?start_date=2024-12-15&end_date=2024-12-16')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });

      it('should filter games by single date', async () => {
        const response = await request(app)
          .get('/api/games?start_date=2024-12-15&end_date=2024-12-15')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].game_date).toContain('2024-12-15');
      });

      it('should handle no results from filters', async () => {
        const response = await request(app)
          .get('/api/games?status=cancelled')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
      });

      it('should combine multiple filters', async () => {
        const response = await request(app)
          .get('/api/games?status=assigned&level=Recreational&game_type=Tournament')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe('assigned');
        expect(response.body.data[0].level).toBe('Recreational');
        expect(response.body.data[0].game_type).toBe('Tournament');
      });
    });

    describe('Pagination', () => {
      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/games?page=1&limit=2')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.currentPage).toBe(1);
        expect(response.body.pagination.totalPages).toBe(2);
        expect(response.body.pagination.totalItems).toBe(3);
      });

      it('should handle second page', async () => {
        const response = await request(app)
          .get('/api/games?page=2&limit=2')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.pagination.currentPage).toBe(2);
      });

      it('should handle page beyond results', async () => {
        const response = await request(app)
          .get('/api/games?page=10&limit=2')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
        expect(response.body.pagination.currentPage).toBe(10);
      });

      it('should reject invalid pagination parameters', async () => {
        const response = await request(app)
          .get('/api/games?page=-1&limit=0')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('page');
      });

      it('should handle very large limit', async () => {
        const response = await request(app)
          .get('/api/games?page=1&limit=1000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(3);
      });
    });

    describe('Sorting', () => {
      it('should sort by date ascending', async () => {
        const response = await request(app)
          .get('/api/games?sort=game_date&order=asc')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(3);
        expect(new Date(response.body.data[0].game_date))
          .toBeLessThan(new Date(response.body.data[1].game_date));
      });

      it('should sort by date descending', async () => {
        const response = await request(app)
          .get('/api/games?sort=game_date&order=desc')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(new Date(response.body.data[0].game_date))
          .toBeGreaterThan(new Date(response.body.data[1].game_date));
      });
    });
  });

  describe('GET /api/games/:id - Get Single Game', () => {
    let testGame;

    beforeEach(async () => {
      [testGame] = await testDb('games').insert({
        home_team_id: testTeam1.id,
        away_team_id: testTeam2.id,
        game_date: '2024-12-15',
        game_time: '14:00',
        location: 'Single Game Stadium',
        postal_code: 'T1S 1A1',
        level: 'Competitive',
        game_type: 'Community',
        status: 'unassigned',
        refs_needed: 2
      }).returning('*');
    });

    it('should get game by id as admin', async () => {
      const response = await request(app)
        .get(`/api/games/${testGame.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testGame.id);
      expect(response.body.data.location).toBe('Single Game Stadium');
    });

    it('should get game by id as referee', async () => {
      const response = await request(app)
        .get(`/api/games/${testGame.id}`)
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testGame.id);
    });

    it('should return 404 for non-existent game', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/games/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/games/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/games/${testGame.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily break database connection
      await testDb.destroy();

      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed');

      // Reconnect for other tests
      const newDb = knex(config.test);
      // Note: In real app, you'd have proper connection pooling
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('not json data');

      expect(response.status).toBe(400);
    });
  });
});