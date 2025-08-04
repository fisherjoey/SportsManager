const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Referee Profile System Redesign', () => {
  let adminToken, refereeToken, testRefereeId, testRoleId;

  beforeAll(async () => {
    // Create test admin user
    const adminUser = await db('users').insert({
      name: 'Test Admin',
      email: 'admin@test.com',
      password_hash: 'hashedpassword',
      role: 'admin'
    }).returning('*');

    // Create test referee user with new level system
    const rookieLevel = await db('referee_levels').where('name', 'Rookie').first();
    
    const refereeUser = await db('users').insert({
      name: 'Test Referee',
      email: 'referee@test.com',
      password_hash: 'hashedpassword',
      role: 'referee',
      referee_level_id: rookieLevel.id,
      is_white_whistle: true,
      postal_code: 'T2N 1N4',
      location: 'Calgary',
      max_distance: 25
    }).returning('*');

    testRefereeId = refereeUser[0].id;

    // Mock tokens for testing (in real implementation, use proper JWT)
    adminToken = 'mock-admin-token';
    refereeToken = 'mock-referee-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await db('user_roles').where('user_id', testRefereeId).del();
    await db('users').whereIn('email', ['admin@test.com', 'referee@test.com']).del();
    await db.destroy();
  });

  describe('New Level System', () => {
    test('should have Rookie, Junior, Senior levels', async () => {
      const response = await request(app)
        .get('/api/referee-levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      const levels = response.body.data;
      
      const levelNames = levels.map(l => l.name);
      expect(levelNames).toEqual(expect.arrayContaining(['Rookie', 'Junior', 'Senior']));
      
      // Check wage amounts
      const rookie = levels.find(l => l.name === 'Rookie');
      const junior = levels.find(l => l.name === 'Junior');
      const senior = levels.find(l => l.name === 'Senior');
      
      expect(rookie.wage_amount).toBe('25.00');
      expect(junior.wage_amount).toBe('35.00'); 
      expect(senior.wage_amount).toBe('45.00');
    });
  });

  describe('White Whistle Logic', () => {
    test('should display white whistle for Rookie level (always)', async () => {
      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const referee = response.body.data;
      
      expect(referee.level_name).toBe('Rookie');
      expect(referee.should_display_white_whistle).toBe(true);
    });

    test('should handle white whistle for Junior level (conditional)', async () => {
      const juniorLevel = await db('referee_levels').where('name', 'Junior').first();
      
      // Create Junior referee with white whistle flag set to false
      const juniorReferee = await db('users').insert({
        name: 'Junior Referee',
        email: 'junior@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        referee_level_id: juniorLevel.id,
        is_white_whistle: false,
        postal_code: 'T3K 2L5'
      }).returning('*');

      const response = await request(app)
        .get(`/api/referees/${juniorReferee[0].id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const referee = response.body.data;
      
      expect(referee.level_name).toBe('Junior');
      expect(referee.should_display_white_whistle).toBe(false); // Because is_white_whistle is false

      // Cleanup
      await db('users').where('id', juniorReferee[0].id).del();
    });

    test('should never display white whistle for Senior level', async () => {
      const seniorLevel = await db('referee_levels').where('name', 'Senior').first();
      
      // Create Senior referee (should never show white whistle regardless of flag)
      const seniorReferee = await db('users').insert({
        name: 'Senior Referee',
        email: 'senior@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        referee_level_id: seniorLevel.id,
        is_white_whistle: true, // Set to true but should still not display
        postal_code: 'T1X 0L3'
      }).returning('*');

      const response = await request(app)
        .get(`/api/referees/${seniorReferee[0].id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const referee = response.body.data;
      
      expect(referee.level_name).toBe('Senior');
      expect(referee.should_display_white_whistle).toBe(false); // Always false for Senior

      // Cleanup
      await db('users').where('id', seniorReferee[0].id).del();
    });
  });

  describe('Referee Roles System', () => {
    test('should get available roles for admin', async () => {
      const response = await request(app)
        .get('/api/referee-roles/available')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const roles = response.body.data;
      
      const roleNames = roles.map(r => r.name);
      expect(roleNames).toEqual(expect.arrayContaining([
        'Referee', 'Evaluator', 'Mentor', 'Regional Lead', 'Assignor', 'Inspector'
      ]));
    });

    test('should assign roles to referee', async () => {
      // Get referee and evaluator roles
      const refereeRole = await db('referee_roles').where('name', 'Referee').first();
      const evaluatorRole = await db('referee_roles').where('name', 'Evaluator').first();
      
      const response = await request(app)
        .post(`/api/referee-roles/${testRefereeId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_ids: [refereeRole.id, evaluatorRole.id]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      const referee = response.body.data;
      
      expect(referee.roles).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'Referee' }),
        expect.objectContaining({ name: 'Evaluator' })
      ]));
    });

    test('should get referees by specific role', async () => {
      const response = await request(app)
        .get('/api/referee-roles/by-role/Referee')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const referees = response.body.data;
      
      expect(referees.length).toBeGreaterThan(0);
      expect(referees[0]).toHaveProperty('name');
      expect(referees[0]).toHaveProperty('level');
    });
  });

  describe('Enhanced Referee API', () => {
    test('should get all referees with enhanced details', async () => {
      const response = await request(app)
        .get('/api/referees')
        .expect(200);

      expect(response.body.success).toBe(true);
      const { referees } = response.body.data;
      
      expect(referees.length).toBeGreaterThan(0);
      
      const referee = referees.find(r => r.id === testRefereeId);
      expect(referee).toBeDefined();
      expect(referee).toHaveProperty('should_display_white_whistle');
      expect(referee).toHaveProperty('roles');
      expect(referee).toHaveProperty('level_name');
      expect(referee).toHaveProperty('postal_code');
    });

    test('should filter referees by level', async () => {
      const response = await request(app)
        .get('/api/referees?level=Rookie')
        .expect(200);

      expect(response.body.success).toBe(true);
      const { referees } = response.body.data;
      
      referees.forEach(referee => {
        expect(referee.level_name).toBe('Rookie');
      });
    });

    test('should get specific referee with enhanced details', async () => {
      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const referee = response.body.data;
      
      expect(referee).toHaveProperty('should_display_white_whistle');
      expect(referee).toHaveProperty('roles');
      expect(referee).toHaveProperty('level_name', 'Rookie');
      expect(referee).toHaveProperty('postal_code', 'T2N 1N4');
      expect(referee).toHaveProperty('assignment_stats');
    });
  });

  describe('Postal Code Integration', () => {
    test('should include postal code in referee data', async () => {
      const response = await request(app)
        .get(`/api/referees/${testRefereeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const referee = response.body.data;
      
      expect(referee.postal_code).toBe('T2N 1N4');
    });

    test('should allow updating postal code', async () => {
      const response = await request(app)
        .put(`/api/referees/${testRefereeId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          postal_code: 'T2T 4X8'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify update
      const updatedReferee = await db('users').where('id', testRefereeId).first();
      expect(updatedReferee.postal_code).toBe('T2T 4X8');
    });
  });

  describe('Data Migration Verification', () => {
    test('should have migrated existing referees to new level system', async () => {
      const refereesWithLevels = await db('users')
        .join('referee_levels', 'users.referee_level_id', 'referee_levels.id')
        .select('users.id', 'referee_levels.name as level_name', 'users.is_white_whistle')
        .where('users.role', 'referee');

      expect(refereesWithLevels.length).toBeGreaterThan(0);
      
      refereesWithLevels.forEach(referee => {
        expect(['Rookie', 'Junior', 'Senior']).toContain(referee.level_name);
        expect(referee.is_white_whistle).toBeDefined();
      });
    });

    test('should have assigned default roles to existing referees', async () => {
      const refereesWithRoles = await db('users')
        .join('user_roles', 'users.id', 'user_roles.user_id')
        .join('referee_roles', 'user_roles.role_id', 'referee_roles.id')
        .select('users.id', 'referee_roles.name as role_name')
        .where('users.role', 'referee');

      expect(refereesWithRoles.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid role assignment', async () => {
      const response = await request(app)
        .post(`/api/referee-roles/${testRefereeId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_ids: ['invalid-uuid']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle non-existent referee for role assignment', async () => {
      const refereeRole = await db('referee_roles').where('name', 'Referee').first();
      
      const response = await request(app)
        .post('/api/referee-roles/00000000-0000-0000-0000-000000000000/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_ids: [refereeRole.id]
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should validate white whistle logic with null level', async () => {
      // Create referee without level assignment
      const noLevelReferee = await db('users').insert({
        name: 'No Level Referee',
        email: 'nolevel@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        is_white_whistle: true,
        postal_code: 'T2N 2N2'
      }).returning('*');

      const response = await request(app)
        .get(`/api/referees/${noLevelReferee[0].id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const referee = response.body.data;
      
      // Should default to false for unknown levels
      expect(referee.should_display_white_whistle).toBe(false);

      // Cleanup
      await db('users').where('id', noLevelReferee[0].id).del();
    });
  });
});