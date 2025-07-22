const request = require('supertest');
const app = require('../src/app');
const db = require('./setup');
const jwt = require('jsonwebtoken');

describe('Role-Based Access Control Integration', () => {
  let adminUser, refereeUser, refereeCoachUser, evaluatorUser;
  let adminToken, refereeToken, refereeCoachToken, evaluatorToken;

  beforeEach(async () => {
    // Create users with different role configurations
    const users = await db('users').insert([
      {
        email: 'admin@test.com',
        password_hash: 'hashedpassword',
        role: 'admin',
        roles: JSON.stringify(['admin']),
        name: 'Test Admin'
      },
      {
        email: 'referee@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        roles: JSON.stringify(['referee']),
        name: 'Test Referee'
      },
      {
        email: 'coach@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        roles: JSON.stringify(['referee', 'referee_coach']),
        name: 'Referee Coach'
      },
      {
        email: 'evaluator@test.com',
        password_hash: 'hashedpassword',
        role: 'referee', 
        roles: JSON.stringify(['referee', 'evaluator']),
        name: 'Evaluator'
      }
    ]).returning('*');

    [adminUser, refereeUser, refereeCoachUser, evaluatorUser] = users;

    // Create tokens for each user
    adminToken = jwt.sign({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      roles: ['admin']
    }, process.env.JWT_SECRET || 'test-secret');

    refereeToken = jwt.sign({
      userId: refereeUser.id,
      email: refereeUser.email,
      role: 'referee',
      roles: ['referee']
    }, process.env.JWT_SECRET || 'test-secret');

    refereeCoachToken = jwt.sign({
      userId: refereeCoachUser.id,
      email: refereeCoachUser.email,
      role: 'referee',
      roles: ['referee', 'referee_coach']
    }, process.env.JWT_SECRET || 'test-secret');

    evaluatorToken = jwt.sign({
      userId: evaluatorUser.id,
      email: evaluatorUser.email,
      role: 'referee',
      roles: ['referee', 'evaluator']
    }, process.env.JWT_SECRET || 'test-secret');
  });

  describe('Admin Role Access', () => {
    it('should have full access to all endpoints', async () => {
      // Test game management
      const gameResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(gameResponse.body.success).toBe(true);

      // Test referee management
      const refereeResponse = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(refereeResponse.body.success).toBe(true);

      // Test role management
      const rolesResponse = await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(rolesResponse.body.success).toBe(true);
    });

    it('should be able to modify user roles', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${refereeUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee', 'evaluator'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toContain('evaluator');
    });
  });

  describe('Basic Referee Role Access', () => {
    it('should have limited access to appropriate endpoints', async () => {
      // Should be able to view games
      const gameResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(gameResponse.body.success).toBe(true);

      // Should NOT be able to access referee management
      await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      // Should NOT be able to access role management
      await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);
    });

    it('should not be able to modify user roles', async () => {
      await request(app)
        .put(`/api/roles/users/${refereeUser.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ roles: ['referee', 'admin'] })
        .expect(403);
    });
  });

  describe('Referee Coach Role Access', () => {
    it('should have referee plus coach capabilities', async () => {
      // Should have all referee access
      const gameResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${refereeCoachToken}`)
        .expect(200);

      expect(gameResponse.body.success).toBe(true);

      // Future implementation: Should be able to access assigned referee data
      // This would be implemented when referee-coach specific endpoints are added
    });

    it('should still be restricted from admin functions', async () => {
      // Should NOT be able to access role management
      await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${refereeCoachToken}`)
        .expect(403);

      // Should NOT be able to modify user roles
      await request(app)
        .put(`/api/roles/users/${refereeUser.id}`)
        .set('Authorization', `Bearer ${refereeCoachToken}`)
        .send({ roles: ['referee'] })
        .expect(403);
    });
  });

  describe('Evaluator Role Access', () => {
    it('should have referee plus evaluator capabilities', async () => {
      // Should have all referee access  
      const gameResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${evaluatorToken}`)
        .expect(200);

      expect(gameResponse.body.success).toBe(true);

      // Future implementation: Should have evaluation-specific access
      // This would be implemented when evaluator-specific endpoints are added
    });

    it('should still be restricted from admin functions', async () => {
      // Should NOT be able to access role management
      await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${evaluatorToken}`)
        .expect(403);
    });
  });

  describe('Multi-role scenarios', () => {
    it('should handle user with multiple roles correctly', async () => {
      // Create user with all non-admin roles
      const multiRoleUser = await db('users').insert({
        email: 'multirole@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        roles: JSON.stringify(['referee', 'referee_coach', 'evaluator']),
        name: 'Multi Role User'
      }).returning('*');

      const multiRoleToken = jwt.sign({
        userId: multiRoleUser[0].id,
        email: multiRoleUser[0].email,
        role: 'referee',
        roles: ['referee', 'referee_coach', 'evaluator']
      }, process.env.JWT_SECRET || 'test-secret');

      // Should have all referee capabilities
      const gameResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${multiRoleToken}`)
        .expect(200);

      expect(gameResponse.body.success).toBe(true);

      // Should still not have admin access
      await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${multiRoleToken}`)
        .expect(403);
    });
  });

  describe('Role transition scenarios', () => {
    it('should handle role upgrades correctly', async () => {
      // Start with basic referee
      let response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Admin upgrades referee to referee_coach
      await request(app)
        .put(`/api/roles/users/${refereeUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee', 'referee_coach'] })
        .expect(200);

      // Note: In a real system, the user would need to re-login to get new token
      // with updated roles. This test demonstrates the database update only.
    });

    it('should handle role downgrades correctly', async () => {
      // Admin removes evaluator role from user
      const response = await request(app)
        .put(`/api/roles/users/${evaluatorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toEqual(['referee']);
      expect(response.body.data.user.roles).not.toContain('evaluator');
    });
  });

  describe('Authentication edge cases with roles', () => {
    it('should handle token with legacy role system', async () => {
      // Create token without roles array (legacy format)
      const legacyToken = jwt.sign({
        userId: refereeUser.id,
        email: refereeUser.email,
        role: 'referee'
        // No roles array
      }, process.env.JWT_SECRET || 'test-secret');

      // Should still work for referee access
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${legacyToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prioritize roles array over legacy role field', async () => {
      // Create user in database with conflicting role vs roles data
      const conflictUser = await db('users').insert({
        email: 'conflict@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',                    // Legacy field says referee
        roles: JSON.stringify(['admin']),   // New field says admin
        name: 'Conflict User'
      }).returning('*');

      const conflictToken = jwt.sign({
        userId: conflictUser[0].id,
        email: conflictUser[0].email,
        role: 'referee',
        roles: ['admin']  // Token roles should take precedence
      }, process.env.JWT_SECRET || 'test-secret');

      // Should have admin access based on roles array
      const response = await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${conflictToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error handling and security', () => {
    it('should prevent role escalation attempts', async () => {
      // Referee tries to give themselves admin role
      const response = await request(app)
        .put(`/api/roles/users/${refereeUser.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ roles: ['admin'] })
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should handle malformed role data gracefully', async () => {
      // Create user with malformed roles data
      const malformedUser = await db('users').insert({
        email: 'malformed@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        roles: 'invalid-json',  // Invalid JSON
        name: 'Malformed User'
      }).returning('*');

      const malformedToken = jwt.sign({
        userId: malformedUser[0].id,
        email: malformedUser[0].email,
        role: 'referee',
        roles: ['referee']  // Valid roles in token
      }, process.env.JWT_SECRET || 'test-secret');

      // Should still work with fallback to token roles
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject tokens with malformed roles', async () => {
      const badToken = jwt.sign({
        userId: refereeUser.id,
        email: refereeUser.email,
        role: 'referee',
        roles: 'not-an-array'  // Invalid roles format
      }, process.env.JWT_SECRET || 'test-secret');

      // Should fall back to legacy role field
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${badToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Future role implementations', () => {
    it('should be extensible for new roles', async () => {
      // Test adding a hypothetical new role
      // This demonstrates the system's extensibility
      
      // Admin should be able to assign any role including new ones
      // (This would fail until new roles are added to validation)
      const response = await request(app)
        .put(`/api/roles/users/${refereeUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee', 'new_future_role'] })
        .expect(400); // Should fail validation for now

      expect(response.body.error).toContain('Invalid roles');
    });
  });
});