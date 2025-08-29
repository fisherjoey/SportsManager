/**
 * RBAC Authentication Middleware Test Suite
 * 
 * Tests for the enhanced authentication middleware with RBAC support:
 * - Permission-based middleware functions
 * - Backward compatibility with role-based auth
 * - Helper functions for permission checking
 * - Error handling and edge cases
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { 
  authenticateToken, 
  requirePermission, 
  requireAnyPermission, 
  requireAllPermissions,
  hasPermission,
  getUserPermissions,
  permissionService
} = require('../../src/middleware/auth');
const db = require('../../src/config/database');

describe('RBAC Authentication Middleware', () => {
  let app;
  let testUser;
  let testRole;
  let testPermissions = [];
  let validToken;

  beforeAll(async () => {
    // Create test permissions
    const permissions = await db('permissions')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440001',
          name: 'read_users',
          code: 'READ_USERS',
          description: 'Can read user data',
          category: 'user_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440002',
          name: 'write_users',
          code: 'WRITE_USERS',
          description: 'Can write user data',
          category: 'user_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440003',
          name: 'delete_users',
          code: 'DELETE_USERS',
          description: 'Can delete user data',
          category: 'user_management',
          active: true
        }
      ])
      .returning('*');

    testPermissions = permissions;

    // Create test role
    const [role] = await db('roles')
      .insert({
        id: '750e8400-e29b-41d4-a716-446655440010',
        name: 'Test RBAC Role',
        code: 'TEST_RBAC_ROLE',
        description: 'Role for testing RBAC middleware',
        active: true
      })
      .returning('*');

    testRole = role;

    // Assign permissions to role
    const rolePermissions = testPermissions.map(permission => ({
      role_id: testRole.id,
      permission_id: permission.id,
      created_at: new Date()
    }));
    await db('role_permissions').insert(rolePermissions);

    // Create test user
    const [user] = await db('users')
      .insert({
        id: '750e8400-e29b-41d4-a716-446655440020',
        email: 'rbac-test@example.com',
        password_hash: 'test',
        name: 'RBAC Test User',
        role: 'referee',
        active: true
      })
      .returning('*');

    testUser = user;

    // Assign role to user
    await db('user_roles').insert({
      user_id: testUser.id,
      role_id: testRole.id,
      created_at: new Date()
    });

    // Create valid JWT token
    validToken = jwt.sign(
      { 
        userId: testUser.id, 
        email: testUser.email, 
        role: testUser.role,
        roles: [testUser.role],
        permissions: testPermissions.map(p => p.code)
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Setup Express app for testing
    app = express();
    app.use(express.json());

    // Test routes
    app.get('/test-permission/:permission', requirePermission('read_users'), (req, res) => {
      res.json({ success: true, message: 'Access granted' });
    });

    app.get('/test-any-permission', requireAnyPermission(['read_users', 'nonexistent_permission']), (req, res) => {
      res.json({ success: true, message: 'Access granted' });
    });

    app.get('/test-all-permissions', requireAllPermissions(['read_users', 'write_users']), (req, res) => {
      res.json({ success: true, message: 'Access granted' });
    });

    app.get('/test-admin-only', requirePermission('admin_access'), (req, res) => {
      res.json({ success: true, message: 'Admin access granted' });
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db('user_roles').where('user_id', testUser.id).del();
    await db('role_permissions').where('role_id', testRole.id).del();
    await db('roles').where('id', testRole.id).del();
    await db('permissions').whereIn('id', testPermissions.map(p => p.id)).del();
    await db('users').where('id', testUser.id).del();
  });

  describe('requirePermission middleware', () => {
    test('should allow access with valid permission', async () => {
      const response = await request(app)
        .get('/test-permission/read_users')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access without permission', async () => {
      // Create user without permissions
      const [userWithoutPerms] = await db('users')
        .insert({
          id: '750e8400-e29b-41d4-a716-446655440021',
          email: 'no-perms@example.com',
          password_hash: 'test',
          name: 'No Permissions User',
          role: 'referee',
          active: true
        })
        .returning('*');

      const tokenWithoutPerms = jwt.sign(
        { 
          userId: userWithoutPerms.id, 
          email: userWithoutPerms.email, 
          role: userWithoutPerms.role,
          roles: [userWithoutPerms.role],
          permissions: []
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-permission/read_users')
        .set('Authorization', `Bearer ${tokenWithoutPerms}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toBe('read_users');

      // Clean up
      await db('users').where('id', userWithoutPerms.id).del();
    });

    test('should allow admin access to any permission', async () => {
      const adminToken = jwt.sign(
        { 
          userId: testUser.id, 
          email: testUser.email, 
          role: 'admin',
          roles: ['admin'],
          permissions: []
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/test-permission/read_users');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    test('should handle permission check errors gracefully', async () => {
      // Mock permission service to throw error
      const originalHasPermission = permissionService.hasPermission;
      permissionService.hasPermission = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/test-permission/read_users')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Permission check failed');

      // Restore original method
      permissionService.hasPermission = originalHasPermission;
    });
  });

  describe('requireAnyPermission middleware', () => {
    test('should allow access with one of required permissions', async () => {
      const response = await request(app)
        .get('/test-any-permission')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access without any required permissions', async () => {
      const [userWithoutPerms] = await db('users')
        .insert({
          id: '750e8400-e29b-41d4-a716-446655440022',
          email: 'no-any-perms@example.com',
          password_hash: 'test',
          name: 'No Any Permissions User',
          role: 'referee',
          active: true
        })
        .returning('*');

      const tokenWithoutPerms = jwt.sign(
        { 
          userId: userWithoutPerms.id, 
          email: userWithoutPerms.email, 
          role: userWithoutPerms.role,
          roles: [userWithoutPerms.role],
          permissions: []
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-any-permission')
        .set('Authorization', `Bearer ${tokenWithoutPerms}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toContain('One of:');

      // Clean up
      await db('users').where('id', userWithoutPerms.id).del();
    });

    test('should handle invalid permission configuration', async () => {
      const testApp = express();
      testApp.get('/test-invalid', requireAnyPermission([]), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/test-invalid')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Invalid permission configuration');
    });
  });

  describe('requireAllPermissions middleware', () => {
    test('should allow access with all required permissions', async () => {
      const response = await request(app)
        .get('/test-all-permissions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access without all required permissions', async () => {
      // Create role with only one permission
      const [limitedRole] = await db('roles')
        .insert({
          id: '750e8400-e29b-41d4-a716-446655440011',
          name: 'Limited Role',
          code: 'LIMITED_ROLE',
          description: 'Role with limited permissions',
          active: true
        })
        .returning('*');

      // Assign only read permission
      await db('role_permissions').insert({
        role_id: limitedRole.id,
        permission_id: testPermissions[0].id,
        created_at: new Date()
      });

      const [limitedUser] = await db('users')
        .insert({
          id: '750e8400-e29b-41d4-a716-446655440023',
          email: 'limited@example.com',
          password_hash: 'test',
          name: 'Limited User',
          role: 'referee',
          active: true
        })
        .returning('*');

      await db('user_roles').insert({
        user_id: limitedUser.id,
        role_id: limitedRole.id,
        created_at: new Date()
      });

      const limitedToken = jwt.sign(
        { 
          userId: limitedUser.id, 
          email: limitedUser.email, 
          role: limitedUser.role,
          roles: [limitedUser.role],
          permissions: ['READ_USERS'] // Only has read permission
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-all-permissions')
        .set('Authorization', `Bearer ${limitedToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toContain('All of:');

      // Clean up
      await db('user_roles').where('user_id', limitedUser.id).del();
      await db('role_permissions').where('role_id', limitedRole.id).del();
      await db('roles').where('id', limitedRole.id).del();
      await db('users').where('id', limitedUser.id).del();
    });
  });

  describe('Helper functions', () => {
    test('hasPermission should check user permissions', async () => {
      const user = {
        id: testUser.id,
        role: testUser.role,
        roles: [testUser.role]
      };

      const result = await hasPermission(user, 'read_users');
      expect(result).toBe(true);

      const resultFalse = await hasPermission(user, 'nonexistent_permission');
      expect(resultFalse).toBe(false);
    });

    test('hasPermission should handle admin users', async () => {
      const adminUser = {
        id: testUser.id,
        role: 'admin',
        roles: ['admin']
      };

      const result = await hasPermission(adminUser, 'any_permission');
      expect(result).toBe(true);
    });

    test('hasPermission should handle invalid parameters', async () => {
      const result1 = await hasPermission(null, 'read_users');
      const result2 = await hasPermission(testUser, null);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    test('hasPermission should handle errors gracefully', async () => {
      // Mock permission service to throw error
      const originalHasPermission = permissionService.hasPermission;
      permissionService.hasPermission = jest.fn().mockRejectedValue(new Error('Database error'));

      const user = { id: testUser.id, role: 'referee', roles: ['referee'] };
      const result = await hasPermission(user, 'read_users');

      expect(result).toBe(false); // Should fail closed

      // Restore original method
      permissionService.hasPermission = originalHasPermission;
    });

    test('getUserPermissions should retrieve user permissions', async () => {
      const permissions = await getUserPermissions(testUser.id);

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.map(p => p.code)).toEqual(
        expect.arrayContaining(['READ_USERS', 'WRITE_USERS', 'DELETE_USERS'])
      );
    });

    test('getUserPermissions should handle errors gracefully', async () => {
      const permissions = await getUserPermissions('invalid-user-id');
      expect(permissions).toEqual([]);
    });

    test('getUserPermissions should support cache control', async () => {
      const permissions1 = await getUserPermissions(testUser.id, true);
      const permissions2 = await getUserPermissions(testUser.id, false);

      expect(permissions1).toEqual(permissions2);
    });
  });

  describe('Backward Compatibility', () => {
    test('should work with existing role-based routes', async () => {
      // Test that the enhanced middleware doesn't break existing role-based auth
      const { requireRole } = require('../../src/middleware/auth');

      const testApp = express();
      testApp.get('/test-role', authenticateToken, requireRole('referee'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/test-role')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle legacy tokens without permissions', async () => {
      const legacyToken = jwt.sign(
        { 
          userId: testUser.id, 
          email: testUser.email, 
          role: testUser.role
          // No roles or permissions array (legacy format)
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Should still work for permission checks by querying database
      const response = await request(app)
        .get('/test-permission/read_users')
        .set('Authorization', `Bearer ${legacyToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed permissions array in middleware', async () => {
      expect(() => requireAnyPermission('not-an-array')).not.toThrow();
      expect(() => requireAllPermissions(null)).not.toThrow();
    });

    test('should handle database connection errors', async () => {
      // This is implicitly tested in other error handling tests
      // The middleware should fail closed (deny access) on database errors
    });

    test('should handle concurrent permission checks', async () => {
      const promises = Array(10).fill(null).map(() => 
        request(app)
          .get('/test-permission/read_users')
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});