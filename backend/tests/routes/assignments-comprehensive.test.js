/**
 * @fileoverview Comprehensive Game Assignments API Tests
 * Tests all assignment operations with extensive edge cases
 * Critical for referee management - must test every workflow
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const config = require('../../knexfile');
const app = require('../../src/app');

const testDb = knex(config.test);

describe('Game Assignments API - Comprehensive Tests', () => {
  let adminToken, refereeToken, referee2Token;
  let testGame1, testGame2;
  let testReferee1, testReferee2;
  let testPosition1, testPosition2;
  let testRefLevel;

  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeAll(async () => {
    await testDb.migrate.latest();
    
    // Create test data
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 12);

    // Create referee level
    [testRefLevel] = await testDb('referee_levels').insert({
      name: 'Assignment Test Level',
      wage_amount: 60.00
    }).returning('*');

    // Create users
    const [adminUser, refUser1, refUser2] = await testDb('users').insert([
      {
        email: 'admin@assigntest.com',
        password_hash: passwordHash,
        role: 'admin',
        name: 'Assignment Admin',
        is_available: true
      },
      {
        email: 'ref1@assigntest.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Assignment Referee 1',
        phone: '(555) 111-1111',
        location: 'North Zone',
        postal_code: 'T1N 1N1',
        max_distance: 25,
        is_available: true,
        referee_level_id: testRefLevel.id,
        years_experience: 5,
        games_refereed_season: 12,
        evaluation_score: 4.3
      },
      {
        email: 'ref2@assigntest.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Assignment Referee 2',
        phone: '(555) 222-2222',
        location: 'South Zone',
        postal_code: 'T2S 2S2',
        max_distance: 30,
        is_available: true,
        referee_level_id: testRefLevel.id,
        years_experience: 3,
        games_refereed_season: 8,
        evaluation_score: 4.1
      }
    ]).returning('*');

    // Create referee records
    [testReferee1, testReferee2] = await testDb('referees').insert([
      { user_id: refUser1.id },
      { user_id: refUser2.id }
    ]).returning('*');

    // Create positions
    [testPosition1, testPosition2] = await testDb('positions').insert([
      { name: 'Referee 1', description: 'Primary Referee' },
      { name: 'Referee 2', description: 'Secondary Referee' }
    ]).returning('*');

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    refereeToken = jwt.sign(
      { userId: refUser1.id, email: refUser1.email, role: 'referee' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    referee2Token = jwt.sign(
      { userId: refUser2.id, email: refUser2.email, role: 'referee' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test league and teams
    const [league] = await testDb('leagues').insert({
      organization: 'Assignment Test League',
      age_group: 'U17',
      gender: 'Boys',
      division: 'Division 1',
      season: '2024/25',
      level: 'Competitive'
    }).returning('*');

    const [team1, team2] = await testDb('teams').insert([
      { name: 'Assignment Team A', location: 'Arena A', league_id: league.id },
      { name: 'Assignment Team B', location: 'Arena B', league_id: league.id }
    ]).returning('*');

    // Create test games
    [testGame1, testGame2] = await testDb('games').insert([
      {
        home_team_id: team1.id,
        away_team_id: team2.id,
        game_date: '2024-12-20',
        game_time: '19:00',
        location: 'Assignment Arena 1',
        postal_code: 'T1A 1A1',
        level: 'Competitive',
        game_type: 'Community',
        status: 'unassigned',
        refs_needed: 2,
        wage_multiplier: 1.0
      },
      {
        home_team_id: team2.id,
        away_team_id: team1.id,
        game_date: '2024-12-21',
        game_time: '15:00',
        location: 'Assignment Arena 2',
        postal_code: 'T2A 2A2',
        level: 'Elite',
        game_type: 'Tournament',
        status: 'unassigned',
        refs_needed: 3,
        wage_multiplier: 1.5
      }
    ]).returning('*');
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  beforeEach(async () => {
    // Clean assignments for each test
    await testDb.raw('TRUNCATE TABLE game_assignments RESTART IDENTITY CASCADE');
    
    // Reset game status
    await testDb('games')
      .whereIn('id', [testGame1.id, testGame2.id])
      .update({ status: 'unassigned' });
  });

  describe('POST /api/assignments - Create Assignment', () => {
    const validAssignmentData = {
      gameId: null, // Will be set in tests
      refereeId: null, // Will be set in tests
      positionId: null, // Will be set in tests
      status: 'pending'
    };

    beforeEach(() => {
      validAssignmentData.gameId = testGame1.id;
      validAssignmentData.refereeId = testReferee1.id;
      validAssignmentData.positionId = testPosition1.id;
    });

    describe('Valid Assignment Creation', () => {
      it('should create assignment as admin', async () => {
        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.game_id).toBe(testGame1.id);
        expect(response.body.data.referee_id).toBe(testReferee1.id);
        expect(response.body.data.status).toBe('pending');
      });

      it('should calculate wage correctly', async () => {
        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        expect(response.status).toBe(201);
        expect(response.body.data.calculated_wage).toBeDefined();
        expect(parseFloat(response.body.data.calculated_wage)).toBeGreaterThan(0);
      });

      it('should create assignment with accepted status', async () => {
        const acceptedAssignment = {
          ...validAssignmentData,
          status: 'accepted'
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(acceptedAssignment);

        expect(response.status).toBe(201);
        expect(response.body.data.status).toBe('accepted');
      });

      it('should create multiple assignments for same game', async () => {
        // First assignment
        const response1 = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        expect(response1.status).toBe(201);

        // Second assignment with different referee and position
        const secondAssignment = {
          ...validAssignmentData,
          refereeId: testReferee2.id,
          positionId: testPosition2.id
        };

        const response2 = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(secondAssignment);

        expect(response2.status).toBe(201);
        expect(response2.body.data.referee_id).toBe(testReferee2.id);
      });

      it('should update game status when fully assigned', async () => {
        // Assign both positions for a 2-referee game
        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validAssignmentData,
            status: 'accepted'
          });

        const response2 = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validAssignmentData,
            refereeId: testReferee2.id,
            positionId: testPosition2.id,
            status: 'accepted'
          });

        expect(response2.status).toBe(201);

        // Check if game status was updated
        const game = await testDb('games').where('id', testGame1.id).first();
        expect(game.status).toBe('assigned');
      });

      it('should handle wage multiplier in calculation', async () => {
        // Use game with wage multiplier
        const multiplierAssignment = {
          ...validAssignmentData,
          gameId: testGame2.id // This game has 1.5 multiplier
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(multiplierAssignment);

        expect(response.status).toBe(201);
        
        const wage = parseFloat(response.body.data.calculated_wage);
        const baseWage = parseFloat(testRefLevel.wage_amount);
        expect(wage).toBe(baseWage * 1.5);
      });
    });

    describe('Input Validation', () => {
      it('should reject missing required fields', async () => {
        const incompleteAssignment = {
          gameId: testGame1.id
          // Missing refereeId, positionId
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(incompleteAssignment);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });

      it('should reject invalid game ID', async () => {
        const invalidAssignment = {
          ...validAssignmentData,
          gameId: 'invalid-uuid'
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAssignment);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid');
      });

      it('should reject non-existent game', async () => {
        const fakeGameId = '550e8400-e29b-41d4-a716-446655440000';
        const nonExistentAssignment = {
          ...validAssignmentData,
          gameId: fakeGameId
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(nonExistentAssignment);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Game not found');
      });

      it('should reject non-existent referee', async () => {
        const fakeRefereeId = '550e8400-e29b-41d4-a716-446655440001';
        const nonExistentAssignment = {
          ...validAssignmentData,
          refereeId: fakeRefereeId
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(nonExistentAssignment);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Referee not found');
      });

      it('should reject non-existent position', async () => {
        const fakePositionId = '550e8400-e29b-41d4-a716-446655440002';
        const nonExistentAssignment = {
          ...validAssignmentData,
          positionId: fakePositionId
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(nonExistentAssignment);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Position not found');
      });

      it('should reject invalid status', async () => {
        const invalidStatusAssignment = {
          ...validAssignmentData,
          status: 'invalid-status'
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidStatusAssignment);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('status');
      });

      it('should reject duplicate assignment', async () => {
        // Create first assignment
        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        // Try to create duplicate
        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('already assigned');
      });

      it('should reject assignment when referee unavailable', async () => {
        // Mark referee as unavailable
        await testDb('users')
          .where('id', testReferee1.user_id)
          .update({ is_available: false });

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('not available');

        // Restore availability for other tests
        await testDb('users')
          .where('id', testReferee1.user_id)
          .update({ is_available: true });
      });
    });

    describe('Authorization', () => {
      it('should reject assignment creation without authentication', async () => {
        const response = await request(app)
          .post('/api/assignments')
          .send(validAssignmentData);

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('token required');
      });

      it('should reject assignment creation by referee', async () => {
        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(validAssignmentData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });

      it('should allow admin to assign any referee', async () => {
        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        expect(response.status).toBe(201);
      });
    });

    describe('Business Logic Edge Cases', () => {
      it('should handle assignment to game with wage multiplier', async () => {
        const multiplierAssignment = {
          ...validAssignmentData,
          gameId: testGame2.id // Has 1.5 multiplier
        };

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(multiplierAssignment);

        expect(response.status).toBe(201);
        
        const expectedWage = testRefLevel.wage_amount * 1.5;
        expect(parseFloat(response.body.data.calculated_wage)).toBeCloseTo(expectedWage, 2);
      });

      it('should prevent over-assignment of game', async () => {
        // Assign maximum refs for game1 (needs 2)
        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validAssignmentData);

        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validAssignmentData,
            refereeId: testReferee2.id,
            positionId: testPosition2.id
          });

        // Try to assign a third referee (should fail)
        const [thirdUser] = await testDb('users').insert({
          email: 'ref3@test.com',
          password_hash: await require('bcryptjs').hash('pass', 12),
          role: 'referee',
          name: 'Third Referee',
          is_available: true,
          referee_level_id: testRefLevel.id
        }).returning('*');

        const [thirdReferee] = await testDb('referees').insert({
          user_id: thirdUser.id
        }).returning('*');

        const [thirdPosition] = await testDb('positions').insert({
          name: 'Referee 3',
          description: 'Third Referee'
        }).returning('*');

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validAssignmentData,
            refereeId: thirdReferee.id,
            positionId: thirdPosition.id
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('fully assigned');

        // Cleanup
        await testDb('referees').where('id', thirdReferee.id).del();
        await testDb('users').where('id', thirdUser.id).del();
        await testDb('positions').where('id', thirdPosition.id).del();
      });

      it('should handle conflicting game times', async () => {
        // Create overlapping game
        const [league] = await testDb('leagues').first();
        const [team1, team2] = await testDb('teams').limit(2);
        
        const [overlappingGame] = await testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-20', // Same date as testGame1
          game_time: '19:30', // Overlapping time
          location: 'Overlap Arena',
          postal_code: 'T3O 3O3',
          level: 'Competitive',
          game_type: 'Community',
          status: 'unassigned',
          refs_needed: 1
        }).returning('*');

        // Assign referee to first game
        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validAssignmentData,
            status: 'accepted'
          });

        // Try to assign same referee to overlapping game
        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validAssignmentData,
            gameId: overlappingGame.id
          });

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('conflict');

        // Cleanup
        await testDb('games').where('id', overlappingGame.id).del();
      });
    });
  });

  describe('GET /api/assignments - Retrieve Assignments', () => {
    let testAssignment1, testAssignment2;

    beforeEach(async () => {
      // Create test assignments
      [testAssignment1, testAssignment2] = await testDb('game_assignments').insert([
        {
          game_id: testGame1.id,
          referee_id: testReferee1.id,
          position_id: testPosition1.id,
          status: 'pending',
          calculated_wage: 60.00
        },
        {
          game_id: testGame2.id,
          referee_id: testReferee2.id,
          position_id: testPosition2.id,
          status: 'accepted',
          calculated_wage: 90.00
        }
      ]).returning('*');
    });

    describe('Basic Retrieval', () => {
      it('should get all assignments as admin', async () => {
        const response = await request(app)
          .get('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0]).toHaveProperty('id');
        expect(response.body.data[0]).toHaveProperty('game_id');
      });

      it('should get only own assignments as referee', async () => {
        const response = await request(app)
          .get('/api/assignments')
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].referee_id).toBe(testReferee1.id);
      });

      it('should include related data in response', async () => {
        const response = await request(app)
          .get('/api/assignments')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0]).toHaveProperty('game');
        expect(response.body.data[0]).toHaveProperty('referee');
        expect(response.body.data[0]).toHaveProperty('position');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/assignments');

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('required');
      });
    });

    describe('Filtering', () => {
      it('should filter assignments by status', async () => {
        const response = await request(app)
          .get('/api/assignments?status=pending')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe('pending');
      });

      it('should filter assignments by game', async () => {
        const response = await request(app)
          .get(`/api/assignments?game_id=${testGame1.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].game_id).toBe(testGame1.id);
      });

      it('should filter assignments by referee', async () => {
        const response = await request(app)
          .get(`/api/assignments?referee_id=${testReferee2.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].referee_id).toBe(testReferee2.id);
      });

      it('should filter assignments by date range', async () => {
        const response = await request(app)
          .get('/api/assignments?start_date=2024-12-20&end_date=2024-12-20')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
      });

      it('should combine multiple filters', async () => {
        const response = await request(app)
          .get(`/api/assignments?status=accepted&referee_id=${testReferee2.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe('accepted');
        expect(response.body.data[0].referee_id).toBe(testReferee2.id);
      });
    });
  });

  describe('PUT /api/assignments/:id - Update Assignment', () => {
    let testAssignment;

    beforeEach(async () => {
      [testAssignment] = await testDb('game_assignments').insert({
        game_id: testGame1.id,
        referee_id: testReferee1.id,
        position_id: testPosition1.id,
        status: 'pending',
        calculated_wage: 60.00
      }).returning('*');
    });

    describe('Valid Updates', () => {
      it('should update assignment status as admin', async () => {
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'accepted' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('accepted');
      });

      it('should allow referee to accept their own assignment', async () => {
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .send({ status: 'accepted' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('accepted');
      });

      it('should allow referee to decline their own assignment', async () => {
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .send({ status: 'declined' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('declined');
      });

      it('should update calculated wage when game multiplier changes', async () => {
        // First update the game's wage multiplier
        await testDb('games')
          .where('id', testGame1.id)
          .update({ wage_multiplier: 2.0 });

        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ recalculateWage: true });

        expect(response.status).toBe(200);
        const newWage = parseFloat(response.body.data.calculated_wage);
        const expectedWage = testRefLevel.wage_amount * 2.0;
        expect(newWage).toBeCloseTo(expectedWage, 2);
      });

      it('should update position', async () => {
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ positionId: testPosition2.id });

        expect(response.status).toBe(200);
        expect(response.body.data.position_id).toBe(testPosition2.id);
      });
    });

    describe('Invalid Updates', () => {
      it('should reject update of non-existent assignment', async () => {
        const fakeId = '550e8400-e29b-41d4-a716-446655440000';
        
        const response = await request(app)
          .put(`/api/assignments/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'accepted' });

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('not found');
      });

      it('should reject referee updating other referee\'s assignment', async () => {
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${referee2Token}`)
          .send({ status: 'accepted' });

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });

      it('should reject invalid status transition', async () => {
        // First accept the assignment
        await testDb('game_assignments')
          .where('id', testAssignment.id)
          .update({ status: 'accepted' });

        // Try to change back to pending (invalid transition)
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'pending' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('transition');
      });

      it('should reject update without authentication', async () => {
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .send({ status: 'accepted' });

        expect(response.status).toBe(401);
      });

      it('should reject invalid status value', async () => {
        const response = await request(app)
          .put(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'invalid-status' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('status');
      });
    });
  });

  describe('DELETE /api/assignments/:id - Remove Assignment', () => {
    let testAssignment;

    beforeEach(async () => {
      [testAssignment] = await testDb('game_assignments').insert({
        game_id: testGame1.id,
        referee_id: testReferee1.id,
        position_id: testPosition1.id,
        status: 'pending',
        calculated_wage: 60.00
      }).returning('*');
    });

    describe('Valid Deletions', () => {
      it('should delete assignment as admin', async () => {
        const response = await request(app)
          .delete(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify deletion
        const assignment = await testDb('game_assignments')
          .where('id', testAssignment.id)
          .first();
        expect(assignment).toBeUndefined();
      });

      it('should update game status after deletion', async () => {
        // Mark game as assigned first
        await testDb('games')
          .where('id', testGame1.id)
          .update({ status: 'assigned' });

        const response = await request(app)
          .delete(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);

        // Check if game status was updated back to unassigned
        const game = await testDb('games').where('id', testGame1.id).first();
        expect(game.status).toBe('unassigned');
      });

      it('should allow referee to remove their own pending assignment', async () => {
        const response = await request(app)
          .delete(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(200);
      });
    });

    describe('Invalid Deletions', () => {
      it('should reject deletion of non-existent assignment', async () => {
        const fakeId = '550e8400-e29b-41d4-a716-446655440000';
        
        const response = await request(app)
          .delete(`/api/assignments/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('not found');
      });

      it('should reject referee deleting other referee\'s assignment', async () => {
        const response = await request(app)
          .delete(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${referee2Token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });

      it('should reject deletion of accepted assignment by referee', async () => {
        // Accept the assignment first
        await testDb('game_assignments')
          .where('id', testAssignment.id)
          .update({ status: 'accepted' });

        const response = await request(app)
          .delete(`/api/assignments/${testAssignment.id}`)
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('cannot remove');
      });

      it('should reject deletion without authentication', async () => {
        const response = await request(app)
          .delete(`/api/assignments/${testAssignment.id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Assignment Workflow Integration', () => {
    it('should handle complete assignment workflow', async () => {
      // Step 1: Create assignment
      const createResponse = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gameId: testGame1.id,
          refereeId: testReferee1.id,
          positionId: testPosition1.id,
          status: 'pending'
        });

      expect(createResponse.status).toBe(201);
      const assignmentId = createResponse.body.data.id;

      // Step 2: Referee accepts assignment
      const acceptResponse = await request(app)
        .put(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ status: 'accepted' });

      expect(acceptResponse.status).toBe(200);
      expect(acceptResponse.body.data.status).toBe('accepted');

      // Step 3: Verify assignment is in accepted state
      const getResponse = await request(app)
        .get(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.status).toBe('accepted');

      // Step 4: Admin can still remove if necessary
      const deleteResponse = await request(app)
        .delete(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('should handle assignment conflict resolution', async () => {
      // Create conflicting games at similar times
      const [team1, team2] = await testDb('teams').limit(2);
      
      const [conflictGame] = await testDb('games').insert({
        home_team_id: team1.id,
        away_team_id: team2.id,
        game_date: '2024-12-20',
        game_time: '19:15', // 15 minutes after testGame1
        location: 'Conflict Arena',
        postal_code: 'T4C 4C4',
        level: 'Competitive',
        game_type: 'Community',
        status: 'unassigned',
        refs_needed: 1
      }).returning('*');

      // Assign referee to first game
      const response1 = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gameId: testGame1.id,
          refereeId: testReferee1.id,
          positionId: testPosition1.id,
          status: 'accepted'
        });

      expect(response1.status).toBe(201);

      // Try to assign same referee to conflicting game
      const response2 = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gameId: conflictGame.id,
          refereeId: testReferee1.id,
          positionId: testPosition1.id,
          status: 'pending'
        });

      expect(response2.status).toBe(409);
      expect(response2.body.error).toContain('conflict');

      // Cleanup
      await testDb('games').where('id', conflictGame.id).del();
    });
  });
});