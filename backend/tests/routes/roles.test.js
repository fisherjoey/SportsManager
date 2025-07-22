const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');
const jwt = require('jsonwebtoken');

describe('Roles API Endpoints', () => {
  let adminToken, refereeToken, testUserId;

  beforeEach(async () => {
    // Create test users
    const adminResult = await db('users').insert({
      email: 'admin@test.com',
      password_hash: 'hashedpassword',
      role: 'admin',
      roles: JSON.stringify(['admin']),
      name: 'Test Admin'
    }).returning('*');

    const refereeResult = await db('users').insert({
      email: 'referee@test.com',
      password_hash: 'hashedpassword', 
      role: 'referee',
      roles: JSON.stringify(['referee']),
      name: 'Test Referee'
    }).returning('*');

    testUserId = refereeResult[0].id;

    // Create tokens
    adminToken = jwt.sign({
      userId: adminResult[0].id,
      email: adminResult[0].email,
      role: 'admin',
      roles: ['admin']
    }, process.env.JWT_SECRET || 'test-secret');

    refereeToken = jwt.sign({
      userId: refereeResult[0].id,
      email: refereeResult[0].email,
      role: 'referee',
      roles: ['referee']
    }, process.env.JWT_SECRET || 'test-secret');
  });

  describe('GET /api/roles/available', () => {
    it('should return available roles for admin', async () => {
      const response = await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toBeInstanceOf(Array);
      expect(response.body.data.roles).toHaveLength(4);

      const roleNames = response.body.data.roles.map(role => role.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('referee');
      expect(roleNames).toContain('referee_coach');
      expect(roleNames).toContain('evaluator');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/roles/available')
        .expect(401);

      expect(response.body.error).toContain('Access token required');
    });

    it('should return role descriptions', async () => {
      const response = await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminRole = response.body.data.roles.find(role => role.name === 'admin');
      const refereeCoachRole = response.body.data.roles.find(role => role.name === 'referee_coach');

      expect(adminRole.description).toContain('Full system access');
      expect(refereeCoachRole.description).toContain('Access to assigned referees');
    });
  });

  describe('PUT /api/roles/users/:userId', () => {
    it('should successfully update user roles', async () => {
      const newRoles = ['referee', 'referee_coach'];

      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: newRoles })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toEqual(newRoles);
      expect(response.body.message).toContain('updated successfully');

      // Verify in database
      const updatedUser = await db('users').where('id', testUserId).first();
      expect(JSON.parse(updatedUser.roles)).toEqual(newRoles);
    });

    it('should handle single role update', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['evaluator'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toEqual(['evaluator']);
    });

    it('should handle multiple roles including admin', async () => {
      const newRoles = ['admin', 'referee', 'referee_coach'];

      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: newRoles })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toEqual(newRoles);
    });

    it('should reject invalid roles', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee', 'invalid_role'] })
        .expect(400);

      expect(response.body.error).toContain('Invalid roles: invalid_role');
    });

    it('should reject empty roles array', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: [] })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should reject non-array roles', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: 'referee' })
        .expect(400);

      expect(response.body.error).toContain('must be an array');
    });

    it('should handle non-existent user', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .put(`/api/roles/users/${fakeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee'] })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ roles: ['referee', 'evaluator'] })
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .send({ roles: ['referee'] })
        .expect(401);

      expect(response.body.error).toContain('Access token required');
    });

    it('should validate against all known roles', async () => {
      const validRoles = ['admin', 'referee', 'referee_coach', 'evaluator'];
      
      for (const role of validRoles) {
        const response = await request(app)
          .put(`/api/roles/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ roles: [role] })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.roles).toContain(role);
      }
    });

    it('should handle malformed JSON in roles', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: null })
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/roles/users/:userId', () => {
    beforeEach(async () => {
      // Set up user with specific roles for testing
      await db('users')
        .where('id', testUserId)
        .update({ 
          roles: JSON.stringify(['referee', 'evaluator'])
        });
    });

    it('should return user roles for admin', async () => {
      const response = await request(app)
        .get(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUserId);
      expect(response.body.data.user.roles).toEqual(['referee', 'evaluator']);
      expect(response.body.data.user.email).toBe('referee@test.com');
      expect(response.body.data.user.name).toBe('Test Referee');
    });

    it('should handle user with no roles array (legacy)', async () => {
      // Update user to have null roles (legacy system)
      await db('users')
        .where('id', testUserId)
        .update({ roles: null });

      const response = await request(app)
        .get(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toEqual(['referee']); // Should fall back to role field
    });

    it('should handle non-existent user', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .get(`/api/roles/users/${fakeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/roles/users/${testUserId}`)
        .expect(401);

      expect(response.body.error).toContain('Access token required');
    });

    it('should not expose sensitive user data', async () => {
      const response = await request(app)
        .get(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.user.password_hash).toBeUndefined();
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.created_at).toBeUndefined();
      expect(response.body.data.user.updated_at).toBeUndefined();
    });
  });

  describe('Role validation and business logic', () => {
    it('should ensure all valid roles can be assigned', async () => {
      const validRoles = [
        'admin',
        'referee', 
        'referee_coach',
        'evaluator'
      ];

      // Test each valid role individually
      for (const role of validRoles) {
        const response = await request(app)
          .put(`/api/roles/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ roles: [role] })
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      // Test all valid roles together
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: validRoles })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toHaveLength(validRoles.length);
    });

    it('should reject roles with special characters', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee', 'admin@special'] })
        .expect(400);

      expect(response.body.error).toContain('Invalid roles');
    });

    it('should be case sensitive for role names', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['Admin', 'REFEREE'] })
        .expect(400);

      expect(response.body.error).toContain('Invalid roles');
    });

    it('should handle duplicate roles in request', async () => {
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: ['referee', 'referee', 'evaluator'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Database should handle deduplication or maintain duplicates as per business logic
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle very long role arrays', async () => {
      const allRoles = ['admin', 'referee', 'referee_coach', 'evaluator'];
      
      const response = await request(app)
        .put(`/api/roles/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roles: allRoles })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.roles).toHaveLength(allRoles.length);
    });

    it('should handle concurrent role updates', async () => {
      const promises = [];
      
      // Simulate concurrent updates
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .put(`/api/roles/users/${testUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ roles: ['referee', 'evaluator'] })
        );
      }

      const responses = await Promise.all(promises);
      
      // At least one should succeed
      expect(responses.some(res => res.status === 200)).toBe(true);
    });

    it('should maintain data integrity after multiple updates', async () => {
      // Multiple sequential updates
      const updates = [
        ['referee'],
        ['referee', 'evaluator'], 
        ['admin'],
        ['referee', 'referee_coach', 'evaluator']
      ];

      for (const roles of updates) {
        const response = await request(app)
          .put(`/api/roles/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ roles })
          .expect(200);

        expect(response.body.data.user.roles).toEqual(roles);
      }

      // Verify final state
      const finalUser = await db('users').where('id', testUserId).first();
      expect(JSON.parse(finalUser.roles)).toEqual(['referee', 'referee_coach', 'evaluator']);
    });
  });
});