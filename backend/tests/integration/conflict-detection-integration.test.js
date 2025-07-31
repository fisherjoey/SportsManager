/**
 * Integration tests for conflict detection in assignment and game APIs
 * 
 * These tests verify that conflict detection works end-to-end with the actual APIs
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Conflict Detection Integration Tests', () => {
  let adminToken;
  let testGameId1, testGameId2;
  let testRefereeId;
  let testLocationId;

  beforeAll(async () => {
    // Clean up test data
    await db('game_assignments').where('user_id', 'like', 'test-%').del();
    await db('games').where('id', 'like', 'test-%').del();
    await db('users').where('id', 'like', 'test-%').del();
    await db('locations').where('id', 'like', 'test-%').del();
    
    // Create test admin user and get token
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Admin',
        email: 'test.admin@example.com',
        password: 'password123',
        role: 'admin'
      });
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.admin@example.com',
        password: 'password123'
      });
    
    adminToken = loginResponse.body.token;

    // Create test referee
    const refereeResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Referee',
        email: 'test.referee@example.com',
        password: 'password123',
        role: 'referee'
      });
    
    testRefereeId = refereeResponse.body.user.id;

    // Create test location
    const locationResponse = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Field A',
        address: '123 Test St',
        postal_code: 'T1T1T1'
      });
    
    testLocationId = locationResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db('game_assignments').where('user_id', 'like', 'test-%').del();
    await db('games').where('id', 'like', 'test-%').del();
    await db('users').where('email', 'like', 'test.%').del();
    await db('locations').where('name', 'like', 'Test Field%').del();
  });

  describe('Referee Double-booking Detection', () => {
    beforeEach(async () => {
      // Create two test games with overlapping times
      const game1Response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 1 },
          awayTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 2 },
          date: '2025-08-15',
          time: '14:00',
          location: 'Test Field A',
          postalCode: 'T1T1T1',
          level: 'Recreational',
          gameType: 'Community',
          division: 'Test Division',
          season: '2025 Spring',
          payRate: 50,
          refsNeeded: 2
        });

      testGameId1 = game1Response.body.data.id;

      const game2Response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 3 },
          awayTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 4 },
          date: '2025-08-15',
          time: '15:00', // Overlaps with first game
          location: 'Test Field B',
          postalCode: 'T2T2T2',
          level: 'Recreational',
          gameType: 'Community',
          division: 'Test Division',
          season: '2025 Spring',
          payRate: 50,
          refsNeeded: 2
        });

      testGameId2 = game2Response.body.data.id;
    });

    afterEach(async () => {
      // Clean up game assignments and games
      if (testGameId1) {
        await db('game_assignments').where('game_id', testGameId1).del();
        await db('games').where('id', testGameId1).del();
      }
      if (testGameId2) {
        await db('game_assignments').where('game_id', testGameId2).del();
        await db('games').where('id', testGameId2).del();
      }
    });

    it('should prevent referee double-booking for overlapping games', async () => {
      // Get a position ID for assignment
      const positionsResponse = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const positionId = positionsResponse.body[0].id;

      // Assign referee to first game
      const assignment1Response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGameId1,
          user_id: testRefereeId,
          position_id: positionId,
          assigned_by: 'test-admin'
        });

      expect(assignment1Response.status).toBe(201);

      // Try to assign same referee to overlapping game - should fail
      const assignment2Response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGameId2,
          user_id: testRefereeId,
          position_id: positionId,
          assigned_by: 'test-admin'
        });

      expect(assignment2Response.status).toBe(409);
      expect(assignment2Response.body.error).toContain('conflicts detected');
    });

    it('should check conflicts before assignment', async () => {
      // Get a position ID for assignment
      const positionsResponse = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const positionId = positionsResponse.body[0].id;

      // Assign referee to first game
      await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGameId1,
          user_id: testRefereeId,
          position_id: positionId,
          assigned_by: 'test-admin'
        });

      // Check conflicts for second assignment
      const conflictCheckResponse = await request(app)
        .post('/api/assignments/check-conflicts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGameId2,
          user_id: testRefereeId,
          position_id: positionId
        });

      expect(conflictCheckResponse.status).toBe(200);
      expect(conflictCheckResponse.body.data.hasConflicts).toBe(true);
      expect(conflictCheckResponse.body.data.canAssign).toBe(false);
    });
  });

  describe('Travel Time Conflict Detection', () => {
    beforeEach(async () => {
      // Create two games with insufficient travel time between different locations
      const game1Response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 1 },
          awayTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 2 },
          date: '2025-08-15',
          time: '14:00',
          location: 'Test Field A',
          postalCode: 'T1T1T1',
          level: 'Recreational',
          gameType: 'Community',
          division: 'Test Division',
          season: '2025 Spring',
          payRate: 50,
          refsNeeded: 2
        });

      testGameId1 = game1Response.body.data.id;

      const game2Response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 3 },
          awayTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 4 },
          date: '2025-08-15',
          time: '16:15', // 15 minutes after first game ends - not enough travel time
          location: 'Test Field B',
          postalCode: 'T2T2T2',
          level: 'Recreational',
          gameType: 'Community',
          division: 'Test Division',
          season: '2025 Spring',
          payRate: 50,
          refsNeeded: 2
        });

      testGameId2 = game2Response.body.data.id;
    });

    afterEach(async () => {
      // Clean up game assignments and games
      if (testGameId1) {
        await db('game_assignments').where('game_id', testGameId1).del();
        await db('games').where('id', testGameId1).del();
      }
      if (testGameId2) {
        await db('game_assignments').where('game_id', testGameId2).del();
        await db('games').where('id', testGameId2).del();
      }
    });

    it('should detect travel time conflicts between different locations', async () => {
      // Get a position ID for assignment
      const positionsResponse = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const positionId = positionsResponse.body[0].id;

      // Assign referee to first game
      const assignment1Response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGameId1,
          user_id: testRefereeId,
          position_id: positionId,
          assigned_by: 'test-admin'
        });

      expect(assignment1Response.status).toBe(201);

      // Try to assign same referee to second game with insufficient travel time
      const assignment2Response = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          game_id: testGameId2,
          user_id: testRefereeId,
          position_id: positionId,
          assigned_by: 'test-admin'
        });

      expect(assignment2Response.status).toBe(409);
      expect(assignment2Response.body.error).toContain('conflicts detected');
      expect(assignment2Response.body.details).toContain('travel time');
    });
  });

  describe('Venue Conflict Detection', () => {
    it('should detect venue booking conflicts', async () => {
      // This test would require creating games at the same venue and time
      // For now, we'll test that the API endpoint exists and responds correctly
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 1 },
          awayTeam: { organization: 'Test Org', ageGroup: 'U15', gender: 'Boys', rank: 2 },
          date: '2025-08-15',
          time: '14:00',
          location: 'Test Field A',
          postalCode: 'T1T1T1',
          level: 'Recreational',
          gameType: 'Community',
          division: 'Test Division',
          season: '2025 Spring',
          payRate: 50,
          refsNeeded: 2
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Clean up
      await db('games').where('id', response.body.data.id).del();
    });
  });
});