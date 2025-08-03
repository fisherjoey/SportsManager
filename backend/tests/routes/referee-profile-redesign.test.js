const request = require('supertest');
const express = require('express');
const db = require('../../src/config/database');
const refereeRoutes = require('../../src/routes/referees');
const refereeRoleRoutes = require('../../src/routes/referee-roles');
const { createTestUser, cleanupTestData } = require('../helpers/test-helpers');

const app = express();
app.use(express.json());
app.use('/api/referees', refereeRoutes);
app.use('/api/referee-roles', refereeRoleRoutes);

describe('Referee Profile System Redesign', () => {
  let adminToken, testAdminId, testRefereeId;
  let rookieLevel, juniorLevel, seniorLevel;

  beforeAll(async () => {
    // Create admin user for testing
    const adminUser = await createTestUser({
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin'
    });
    adminToken = adminUser.token;
    testAdminId = adminUser.id;

    // Create referee levels if they don't exist
    await db('referee_levels').del();
    const levels = await db('referee_levels').insert([
      {
        name: 'Rookie',
        wage_amount: 25.00,
        description: 'New referees with minimal experience. Uses a white whistle.',
        allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3']),
        experience_requirements: JSON.stringify({
          min_years: 0,
          max_years: 1,
          whistle_color: 'white'
        })
      },
      {
        name: 'Junior',
        wage_amount: 35.00,
        description: 'Developing referees with some experience.',
        allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3', 'U13-2', 'U15-3']),
        experience_requirements: JSON.stringify({
          min_years: 1,
          max_years: 3,
          whistle_color: 'white or black'
        })
      },
      {
        name: 'Senior',
        wage_amount: 45.00,
        description: 'Experienced referees capable of handling all game levels.',
        allowed_divisions: JSON.stringify(['U15-2', 'U15-1', 'U18-3', 'U18-2', 'U18-1']),
        experience_requirements: JSON.stringify({
          min_years: 3,
          whistle_color: 'black'
        })
      }
    ]).returning('*');

    rookieLevel = levels[0];
    juniorLevel = levels[1];
    seniorLevel = levels[2];
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create a test referee for each test
    const testReferee = await createTestUser({
      name: 'Test Referee',
      email: 'referee@test.com',
      role: 'referee',
      postal_code: 'M1M 1M1',
      referee_level_id: rookieLevel.id,
      is_white_whistle: true,
      roles: ['Referee']
    });
    testRefereeId = testReferee.id;
  });

  afterEach(async () => {
    // Clean up test referee
    await db('users').where('id', testRefereeId).del();
  });

  describe('New Level System (Rookie/Junior/Senior)', () => {
    test('should retrieve referees with new level system information', async () => {
      const response = await request(app)
        .get('/api/referees')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referees).toHaveLength(1);
      
      const referee = response.body.data.referees[0];
      expect(referee.level_name).toBe('Rookie');
      expect(referee.should_display_white_whistle).toBe(true);
      expect(referee.is_white_whistle).toBe(true);
    });

    test('should show white whistle for Rookie level referees', async () => {
      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBe('Rookie');
      expect(referee.should_display_white_whistle).toBe(true);
      expect(referee.is_white_whistle).toBe(true);
    });

    test('should not show white whistle for Senior level referees', async () => {
      // Update referee to Senior level
      await db('users')
        .where('id', testRefereeId)
        .update({
          referee_level_id: seniorLevel.id,
          is_white_whistle: false
        });

      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBe('Senior');
      expect(referee.should_display_white_whistle).toBe(false);
      expect(referee.is_white_whistle).toBe(false);
    });

    test('should handle Junior level with conditional white whistle', async () => {
      // Update referee to Junior level with white whistle
      await db('users')
        .where('id', testRefereeId)
        .update({
          referee_level_id: juniorLevel.id,
          is_white_whistle: true
        });

      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBe('Junior');
      expect(referee.should_display_white_whistle).toBe(true);
      expect(referee.is_white_whistle).toBe(true);
    });
  });

  describe('Admin-Defined Roles System', () => {
    test('should get available referee roles', async () => {
      const response = await request(app)
        .get('/api/referee-roles/available')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(6);
      
      const roleNames = response.body.data.map(role => role.name);
      expect(roleNames).toContain('Referee');
      expect(roleNames).toContain('Evaluator');
      expect(roleNames).toContain('Mentor');
      expect(roleNames).toContain('Regional Lead');
      expect(roleNames).toContain('Assignor');
      expect(roleNames).toContain('Inspector');
    });

    test('should assign multiple roles to a referee', async () => {
      const newRoles = ['Referee', 'Mentor', 'Evaluator'];
      
      const response = await request(app)
        .put(`/api/referee-roles/${testRefereeId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: newRoles })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toEqual(expect.arrayContaining(newRoles));
    });

    test('should get referee roles for specific referee', async () => {
      // First assign some roles
      await request(app)
        .put(`/api/referee-roles/${testRefereeId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['Referee', 'Mentor'] });

      const response = await request(app)
        .get(`/api/referee-roles/${testRefereeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toEqual(expect.arrayContaining(['Referee', 'Mentor']));
      expect(response.body.data.should_display_white_whistle).toBe(true);
    });

    test('should get referees by specific role', async () => {
      // Assign mentor role to test referee
      await request(app)
        .put(`/api/referee-roles/${testRefereeId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['Referee', 'Mentor'] });

      const response = await request(app)
        .get('/api/referee-roles/by-role/Mentor')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].roles).toContain('Mentor');
    });

    test('should reject invalid roles', async () => {
      const response = await request(app)
        .put(`/api/referee-roles/${testRefereeId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['InvalidRole'] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should require admin permissions for role assignment', async () => {
      // Create a non-admin user
      const refereeUser = await createTestUser({
        name: 'Non Admin',
        email: 'nonAdmin@test.com',
        role: 'referee'
      });

      const response = await request(app)
        .put(`/api/referee-roles/${testRefereeId}/assign`)
        .set('Authorization', `Bearer ${refereeUser.token}`)
        .send({ roles: ['Referee', 'Mentor'] })
        .expect(403);

      expect(response.body.success).toBe(false);

      // Clean up
      await db('users').where('id', refereeUser.id).del();
    });
  });

  describe('White Whistle Display Logic', () => {
    test('should display white whistle icon for Rookie referees', async () => {
      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBe('Rookie');
      expect(referee.should_display_white_whistle).toBe(true);
    });

    test('should display white whistle icon for Junior referees with white whistle flag', async () => {
      await db('users')
        .where('id', testRefereeId)
        .update({
          referee_level_id: juniorLevel.id,
          is_white_whistle: true
        });

      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBe('Junior');
      expect(referee.should_display_white_whistle).toBe(true);
    });

    test('should not display white whistle icon for Junior referees without white whistle flag', async () => {
      await db('users')
        .where('id', testRefereeId)
        .update({
          referee_level_id: juniorLevel.id,
          is_white_whistle: false
        });

      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBe('Junior');
      expect(referee.should_display_white_whistle).toBe(false);
    });

    test('should never display white whistle icon for Senior referees', async () => {
      await db('users')
        .where('id', testRefereeId)
        .update({
          referee_level_id: seniorLevel.id,
          is_white_whistle: true // Even if flag is true, Senior should not display
        });

      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBe('Senior');
      expect(referee.should_display_white_whistle).toBe(false);
    });
  });

  describe('Postal Code Integration', () => {
    test('should include postal code in referee profile', async () => {
      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.postal_code).toBe('M1M 1M1');
    });

    test('should validate postal code format during referee creation', async () => {
      const response = await request(app)
        .post('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Referee',
          email: 'newref@test.com',
          postal_code: 'INVALID', // Invalid format
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should accept valid postal code formats', async () => {
      const response = await request(app)
        .post('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Referee',
          email: 'newref@test.com',
          postal_code: 'K1A 0A6', // Valid Canadian postal code
          password: 'password123'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.postal_code).toBe('K1A 0A6');

      // Clean up
      await db('users').where('id', response.body.data.id).del();
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle referees without level assignments gracefully', async () => {
      // Create referee without level
      const noLevelReferee = await createTestUser({
        name: 'No Level Referee',
        email: 'nolevel@test.com',
        role: 'referee',
        postal_code: 'M1M 1M1',
        referee_level_id: null,
        is_white_whistle: false
      });

      const response = await request(app)
        .get(`/api/referees/${noLevelReferee.id}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.level_name).toBeNull();
      expect(referee.should_display_white_whistle).toBe(false);

      // Clean up
      await db('users').where('id', noLevelReferee.id).del();
    });

    test('should maintain existing role field for backward compatibility', async () => {
      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      const referee = response.body.data;
      expect(referee.role).toBe('referee');
    });
  });
});