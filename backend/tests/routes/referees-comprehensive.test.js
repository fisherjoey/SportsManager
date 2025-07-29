/**
 * @fileoverview Comprehensive Referee Management API Tests
 * Tests all referee operations with extensive edge cases
 * Critical for user management - must test every scenario
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const config = require('../../knexfile');
const app = require('../../src/app');
const bcrypt = require('bcryptjs');

const testDb = knex(config.test);

describe('Referees API - Comprehensive Tests', () => {
  let adminToken, refereeToken, referee2Token;
  let testRefLevel1, testRefLevel2;
  let testAdmin, testReferee1, testReferee2;

  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeAll(async () => {
    await testDb.migrate.latest();
    
    const passwordHash = await bcrypt.hash('password123', 12);

    // Create referee levels
    [testRefLevel1, testRefLevel2] = await testDb('referee_levels').insert([
      { name: 'Junior', wage_amount: 45.00 },
      { name: 'Senior', wage_amount: 75.00 }
    ]).returning('*');

    // Create users
    [testAdmin, testReferee1, testReferee2] = await testDb('users').insert([
      {
        email: 'admin@reftest.com',
        password_hash: passwordHash,
        role: 'admin',
        name: 'Referee Test Admin',
        is_available: true
      },
      {
        email: 'ref1@reftest.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Test Referee One',
        phone: '(555) 123-1111',
        location: 'North Calgary',
        postal_code: 'T2N 1N4',
        max_distance: 30,
        is_available: true,
        referee_level_id: testRefLevel1.id,
        years_experience: 3,
        games_refereed_season: 15,
        evaluation_score: 4.2,
        notes: 'Reliable and punctual'
      },
      {
        email: 'ref2@reftest.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Test Referee Two',
        phone: '(555) 123-2222',
        location: 'South Calgary',
        postal_code: 'T2S 2S8',
        max_distance: 25,
        is_available: false,
        referee_level_id: testRefLevel2.id,
        years_experience: 7,
        games_refereed_season: 8,
        evaluation_score: 4.8,
        notes: 'Experienced with elite games'
      }
    ]).returning('*');

    // Create referee records
    await testDb('referees').insert([
      { user_id: testReferee1.id },
      { user_id: testReferee2.id }
    ]);

    // Generate tokens
    adminToken = jwt.sign(
      { userId: testAdmin.id, email: testAdmin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    refereeToken = jwt.sign(
      { userId: testReferee1.id, email: testReferee1.email, role: 'referee' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    referee2Token = jwt.sign(
      { userId: testReferee2.id, email: testReferee2.email, role: 'referee' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  describe('GET /api/referees - Retrieve Referees', () => {
    describe('Basic Retrieval', () => {
      it('should get all referees as admin', async () => {
        const response = await request(app)
          .get('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0]).toHaveProperty('id');
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('email');
      });

      it('should include referee level information', async () => {
        const response = await request(app)
          .get('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0]).toHaveProperty('referee_level');
        expect(response.body.data[0].referee_level).toHaveProperty('name');
        expect(response.body.data[0].referee_level).toHaveProperty('wage_amount');
      });

      it('should allow referee to view all referees', async () => {
        const response = await request(app)
          .get('/api/referees')
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/referees');

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('required');
      });
    });

    describe('Filtering', () => {
      it('should filter referees by availability', async () => {
        const response = await request(app)
          .get('/api/referees?available=true')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].is_available).toBe(true);
      });

      it('should filter unavailable referees', async () => {
        const response = await request(app)
          .get('/api/referees?available=false')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].is_available).toBe(false);
      });

      it('should filter referees by level', async () => {
        const response = await request(app)
          .get(`/api/referees?level=${testRefLevel2.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].referee_level_id).toBe(testRefLevel2.id);
      });

      it('should filter referees by experience range', async () => {
        const response = await request(app)
          .get('/api/referees?min_experience=5')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].years_experience).toBeGreaterThanOrEqual(5);
      });

      it('should filter referees by evaluation score', async () => {
        const response = await request(app)
          .get('/api/referees?min_score=4.5')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].evaluation_score).toBeGreaterThanOrEqual(4.5);
      });

      it('should search referees by name', async () => {
        const response = await request(app)
          .get('/api/referees?search=One')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toContain('One');
      });

      it('should search referees by location', async () => {
        const response = await request(app)
          .get('/api/referees?search=North')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].location).toContain('North');
      });

      it('should combine multiple filters', async () => {
        const response = await request(app)
          .get('/api/referees?available=true&min_experience=2&min_score=4.0')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].is_available).toBe(true);
        expect(response.body.data[0].years_experience).toBeGreaterThanOrEqual(2);
        expect(response.body.data[0].evaluation_score).toBeGreaterThanOrEqual(4.0);
      });
    });

    describe('Sorting', () => {
      it('should sort referees by name', async () => {
        const response = await request(app)
          .get('/api/referees?sort=name&order=asc')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].name.localeCompare(response.body.data[1].name)).toBeLessThan(0);
      });

      it('should sort referees by experience descending', async () => {
        const response = await request(app)
          .get('/api/referees?sort=years_experience&order=desc')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].years_experience)
          .toBeGreaterThanOrEqual(response.body.data[1].years_experience);
      });

      it('should sort referees by evaluation score', async () => {
        const response = await request(app)
          .get('/api/referees?sort=evaluation_score&order=desc')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].evaluation_score)
          .toBeGreaterThanOrEqual(response.body.data[1].evaluation_score);
      });
    });

    describe('Pagination', () => {
      it('should paginate referee results', async () => {
        const response = await request(app)
          .get('/api/referees?page=1&limit=1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.currentPage).toBe(1);
        expect(response.body.pagination.totalItems).toBe(2);
      });

      it('should handle second page', async () => {
        const response = await request(app)
          .get('/api/referees?page=2&limit=1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.pagination.currentPage).toBe(2);
      });

      it('should reject invalid pagination parameters', async () => {
        const response = await request(app)
          .get('/api/referees?page=0&limit=-1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('page');
      });
    });
  });

  describe('GET /api/referees/:id - Get Single Referee', () => {
    it('should get referee by id as admin', async () => {
      const response = await request(app)
        .get(`/api/referees/${testReferee1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReferee1.id);
      expect(response.body.data.name).toBe('Test Referee One');
      expect(response.body.data).toHaveProperty('referee_level');
    });

    it('should allow referee to view their own profile', async () => {
      const response = await request(app)
        .get(`/api/referees/${testReferee1.id}`)
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testReferee1.id);
    });

    it('should allow referee to view other referee profiles', async () => {
      const response = await request(app)
        .get(`/api/referees/${testReferee2.id}`)
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testReferee2.id);
    });

    it('should return 404 for non-existent referee', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/referees/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/referees/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/referees/${testReferee1.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/referees/:id - Update Referee', () => {
    const validUpdateData = {
      name: 'Updated Referee Name',
      phone: '(555) 999-9999',
      location: 'Updated Location',
      postal_code: 'T1U 1U1',
      max_distance: 35,
      years_experience: 4,
      evaluation_score: 4.5,
      notes: 'Updated notes'
    };

    describe('Valid Updates', () => {
      it('should update referee as admin', async () => {
        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validUpdateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Referee Name');
        expect(response.body.data.phone).toBe('(555) 999-9999');
        expect(response.body.data.max_distance).toBe(35);
      });

      it('should allow referee to update their own profile', async () => {
        const selfUpdateData = {
          phone: '(555) 111-9999',
          location: 'Self Updated Location',
          max_distance: 40
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(selfUpdateData);

        expect(response.status).toBe(200);
        expect(response.body.data.phone).toBe('(555) 111-9999');
        expect(response.body.data.location).toBe('Self Updated Location');
        expect(response.body.data.max_distance).toBe(40);
      });

      it('should update availability status', async () => {
        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ is_available: false });

        expect(response.status).toBe(200);
        expect(response.body.data.is_available).toBe(false);

        // Reset for other tests
        await testDb('users')
          .where('id', testReferee1.id)
          .update({ is_available: true });
      });

      it('should update referee level', async () => {
        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ referee_level_id: testRefLevel2.id });

        expect(response.status).toBe(200);
        expect(response.body.data.referee_level_id).toBe(testRefLevel2.id);

        // Reset for other tests
        await testDb('users')
          .where('id', testReferee1.id)
          .update({ referee_level_id: testRefLevel1.id });
      });

      it('should handle partial updates', async () => {
        const partialUpdate = {
          phone: '(555) 123-0000'
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(partialUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.phone).toBe('(555) 123-0000');
        expect(response.body.data.name).toBe('Test Referee One'); // Unchanged
      });

      it('should update experience and evaluation score', async () => {
        const experienceUpdate = {
          years_experience: 6,
          games_refereed_season: 20,
          evaluation_score: 4.7
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(experienceUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.years_experience).toBe(6);
        expect(response.body.data.games_refereed_season).toBe(20);
        expect(response.body.data.evaluation_score).toBe(4.7);
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid phone number format', async () => {
        const invalidPhoneUpdate = {
          phone: 'invalid-phone'
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidPhoneUpdate);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('phone');
      });

      it('should reject invalid postal code format', async () => {
        const invalidPostalUpdate = {
          postal_code: 'INVALID'
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidPostalUpdate);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('postal_code');
      });

      it('should reject negative experience values', async () => {
        const negativeExperienceUpdate = {
          years_experience: -1
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(negativeExperienceUpdate);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('experience');
      });

      it('should reject invalid evaluation score range', async () => {
        const invalidScoreUpdate = {
          evaluation_score: 6.0 // Out of 5.0 scale
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidScoreUpdate);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('evaluation_score');
      });

      it('should reject excessive max distance', async () => {
        const excessiveDistanceUpdate = {
          max_distance: 1000 // Too large
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(excessiveDistanceUpdate);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('max_distance');
      });

      it('should reject non-existent referee level', async () => {
        const fakeRefLevelId = '550e8400-e29b-41d4-a716-446655440000';
        const invalidLevelUpdate = {
          referee_level_id: fakeRefLevelId
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidLevelUpdate);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('referee_level');
      });
    });

    describe('Authorization', () => {
      it('should reject update without authentication', async () => {
        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .send(validUpdateData);

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('required');
      });

      it('should reject referee updating other referee\'s profile', async () => {
        const response = await request(app)
          .put(`/api/referees/${testReferee2.id}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .send({ phone: '(555) 000-0000' });

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });

      it('should reject referee updating sensitive admin fields', async () => {
        const sensitiveUpdate = {
          evaluation_score: 5.0, // Only admin should set this
          referee_level_id: testRefLevel2.id // Only admin should change level
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(sensitiveUpdate);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permission');
      });

      it('should return 404 for non-existent referee', async () => {
        const fakeId = '550e8400-e29b-41d4-a716-446655440000';
        
        const response = await request(app)
          .put(`/api/referees/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validUpdateData);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('not found');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long name', async () => {
        const longNameUpdate = {
          name: 'A'.repeat(255) // Very long name
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(longNameUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('A'.repeat(255));
      });

      it('should handle special characters in location', async () => {
        const specialLocationUpdate = {
          location: 'Saint-Jean-sur-Richelieu (Québec)'
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(specialLocationUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.location).toContain('Saint-Jean-sur-Richelieu');
      });

      it('should handle minimum valid values', async () => {
        const minimalUpdate = {
          years_experience: 0,
          games_refereed_season: 0,
          evaluation_score: 0.0,
          max_distance: 1
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(minimalUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.years_experience).toBe(0);
        expect(response.body.data.evaluation_score).toBe(0);
      });

      it('should handle maximum valid values', async () => {
        const maximumUpdate = {
          years_experience: 50,
          games_refereed_season: 1000,
          evaluation_score: 5.0,
          max_distance: 500
        };

        const response = await request(app)
          .put(`/api/referees/${testReferee1.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(maximumUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.years_experience).toBe(50);
        expect(response.body.data.evaluation_score).toBe(5.0);
      });
    });
  });

  describe('DELETE /api/referees/:id - Remove Referee', () => {
    let disposableReferee;

    beforeEach(async () => {
      // Create a disposable referee for deletion tests
      const passwordHash = await bcrypt.hash('password123', 12);
      
      [disposableReferee] = await testDb('users').insert({
        email: 'disposable@reftest.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Disposable Referee',
        is_available: true,
        referee_level_id: testRefLevel1.id
      }).returning('*');

      await testDb('referees').insert({
        user_id: disposableReferee.id
      });
    });

    afterEach(async () => {
      // Clean up if not deleted by test
      await testDb('referees').where('user_id', disposableReferee.id).del();
      await testDb('users').where('id', disposableReferee.id).del();
    });

    describe('Valid Deletions', () => {
      it('should delete referee as admin', async () => {
        const response = await request(app)
          .delete(`/api/referees/${disposableReferee.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify deletion
        const referee = await testDb('users')
          .where('id', disposableReferee.id)
          .first();
        expect(referee).toBeUndefined();
      });

      it('should cascade delete referee record', async () => {
        await request(app)
          .delete(`/api/referees/${disposableReferee.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Verify referee record was also deleted
        const refereeRecord = await testDb('referees')
          .where('user_id', disposableReferee.id)
          .first();
        expect(refereeRecord).toBeUndefined();
      });
    });

    describe('Invalid Deletions', () => {
      it('should reject deletion by referee', async () => {
        const response = await request(app)
          .delete(`/api/referees/${disposableReferee.id}`)
          .set('Authorization', `Bearer ${refereeToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });

      it('should reject deletion without authentication', async () => {
        const response = await request(app)
          .delete(`/api/referees/${disposableReferee.id}`);

        expect(response.status).toBe(401);
      });

      it('should reject deletion of non-existent referee', async () => {
        const fakeId = '550e8400-e29b-41d4-a716-446655440000';
        
        const response = await request(app)
          .delete(`/api/referees/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('not found');
      });

      it('should reject deletion of referee with active assignments', async () => {
        // Create a game and assignment for the referee
        const [league] = await testDb('leagues').insert({
          organization: 'Delete Test League',
          age_group: 'U19',
          gender: 'Boys',
          division: 'Division 1',
          season: '2024/25',
          level: 'Competitive'
        }).returning('*');

        const [team1, team2] = await testDb('teams').insert([
          { name: 'Delete Team A', location: 'Arena A', league_id: league.id },
          { name: 'Delete Team B', location: 'Arena B', league_id: league.id }
        ]).returning('*');

        const [game] = await testDb('games').insert({
          home_team_id: team1.id,
          away_team_id: team2.id,
          game_date: '2024-12-25',
          game_time: '14:00',
          location: 'Delete Arena',
          postal_code: 'T1D 1D1',
          level: 'Competitive',
          game_type: 'Community',
          status: 'assigned',
          refs_needed: 1
        }).returning('*');

        const [referee] = await testDb('referees')
          .where('user_id', disposableReferee.id)
          .first();

        const [position] = await testDb('positions').first();

        await testDb('game_assignments').insert({
          game_id: game.id,
          referee_id: referee.id,
          position_id: position.id,
          status: 'accepted'
        });

        const response = await request(app)
          .delete(`/api/referees/${disposableReferee.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('active assignments');

        // Cleanup
        await testDb('game_assignments')
          .where('referee_id', referee.id)
          .del();
        await testDb('games').where('id', game.id).del();
        await testDb('teams').whereIn('id', [team1.id, team2.id]).del();
        await testDb('leagues').where('id', league.id).del();
      });
    });
  });

  describe('POST /api/referees - Create Referee', () => {
    const validRefereeData = {
      email: 'newref@reftest.com',
      password: 'newpassword123',
      name: 'New Test Referee',
      phone: '(555) 999-0000',
      location: 'New Location',
      postal_code: 'T1N 0N0',
      max_distance: 25,
      referee_level_id: null, // Will be set in tests
      years_experience: 2,
      evaluation_score: 4.0,
      notes: 'New referee notes'
    };

    beforeEach(() => {
      validRefereeData.referee_level_id = testRefLevel1.id;
    });

    afterEach(async () => {
      // Clean up created referees
      await testDb('referees')
        .whereIn('user_id', 
          testDb('users').select('id').where('email', 'newref@reftest.com')
        ).del();
      await testDb('users').where('email', 'newref@reftest.com').del();
    });

    describe('Valid Creation', () => {
      it('should create referee as admin', async () => {
        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validRefereeData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.email).toBe('newref@reftest.com');
        expect(response.body.data.name).toBe('New Test Referee');
        expect(response.body.data.role).toBe('referee');
      });

      it('should create referee with minimal data', async () => {
        const minimalRefereeData = {
          email: 'minimal@reftest.com',
          password: 'password123',
          name: 'Minimal Referee',
          referee_level_id: testRefLevel1.id
        };

        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(minimalRefereeData);

        expect(response.status).toBe(201);
        expect(response.body.data.email).toBe('minimal@reftest.com');
        expect(response.body.data.is_available).toBe(true); // Default value

        // Cleanup
        await testDb('referees')
          .whereIn('user_id', 
            testDb('users').select('id').where('email', 'minimal@reftest.com')
          ).del();
        await testDb('users').where('email', 'minimal@reftest.com').del();
      });

      it('should hash password correctly', async () => {
        await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validRefereeData);

        const user = await testDb('users')
          .where('email', 'newref@reftest.com')
          .first();

        expect(user.password_hash).toBeDefined();
        expect(user.password_hash).not.toBe('newpassword123');
        expect(user.password_hash.length).toBeGreaterThan(50); // bcrypt hash length
      });

      it('should create associated referee record', async () => {
        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validRefereeData);

        expect(response.status).toBe(201);

        const refereeRecord = await testDb('referees')
          .where('user_id', response.body.data.id)
          .first();
        
        expect(refereeRecord).toBeDefined();
      });
    });

    describe('Input Validation', () => {
      it('should reject missing required fields', async () => {
        const incompleteData = {
          email: 'incomplete@reftest.com'
          // Missing name, password, referee_level_id
        };

        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });

      it('should reject invalid email format', async () => {
        const invalidEmailData = {
          ...validRefereeData,
          email: 'invalid-email-format'
        };

        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidEmailData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });

      it('should reject duplicate email', async () => {
        // Create first referee
        await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validRefereeData);

        // Try to create duplicate
        const duplicateData = {
          ...validRefereeData,
          name: 'Different Name'
        };

        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(duplicateData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email already exists');
      });

      it('should reject weak password', async () => {
        const weakPasswordData = {
          ...validRefereeData,
          password: '123' // Too short
        };

        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(weakPasswordData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      });

      it('should reject non-existent referee level', async () => {
        const fakeRefLevelId = '550e8400-e29b-41d4-a716-446655440000';
        const invalidLevelData = {
          ...validRefereeData,
          referee_level_id: fakeRefLevelId
        };

        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidLevelData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('referee_level');
      });
    });

    describe('Authorization', () => {
      it('should reject creation without authentication', async () => {
        const response = await request(app)
          .post('/api/referees')
          .send(validRefereeData);

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('required');
      });

      it('should reject creation by referee', async () => {
        const response = await request(app)
          .post('/api/referees')
          .set('Authorization', `Bearer ${refereeToken}`)
          .send(validRefereeData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Temporarily break database connection
      await testDb.destroy();

      const response = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed');

      // Note: In real app, would have proper connection recovery
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json data }');

      expect(response.status).toBe(400);
    });
  });
});