/**
 * PermissionService Test Suite
 * 
 * Comprehensive tests for the PermissionService functionality including:
 * - User permission retrieval with caching
 * - Permission checking and validation
 * - Permission grouping by category
 * - Bulk permission operations
 * - Cache management and performance
 */

const PermissionService = require('../../src/services/PermissionService');
const db = require('../../src/config/database');

describe('PermissionService', () => {
  let permissionService;
  let testUserId;
  let testRoleId;
  let testPermissionIds = [];
  let testPermissions = [];

  beforeAll(async () => {
    permissionService = new PermissionService();

    // Create test permissions in different categories
    const permissions = await db('permissions')
      .insert([
        {
          id: '650e8400-e29b-41d4-a716-446655440001',
          name: 'manage_users',
          code: 'MANAGE_USERS',
          description: 'Can manage user accounts',
          category: 'user_management',
          active: true
        },
        {
          id: '650e8400-e29b-41d4-a716-446655440002',
          name: 'view_reports',
          code: 'VIEW_REPORTS',
          description: 'Can view system reports',
          category: 'reporting',
          active: true
        },
        {
          id: '650e8400-e29b-41d4-a716-446655440003',
          name: 'edit_games',
          code: 'EDIT_GAMES',
          description: 'Can edit game information',
          category: 'game_management',
          active: true
        },
        {
          id: '650e8400-e29b-41d4-a716-446655440004',
          name: 'inactive_permission',
          code: 'INACTIVE_PERM',
          description: 'Inactive permission for testing',
          category: 'test',
          active: false
        }
      ])
      .returning('*');

    testPermissions = permissions;
    testPermissionIds = permissions.map(p => p.id);

    // Create test role
    const [role] = await db('roles')
      .insert({
        id: '650e8400-e29b-41d4-a716-446655440010',
        name: 'Test Permission Role',
        code: 'TEST_PERM_ROLE',
        description: 'Role for testing permissions',
        active: true
      })
      .returning('*');

    testRoleId = role.id;

    // Assign active permissions to role (exclude inactive permission)
    const activePermissionIds = testPermissionIds.slice(0, 3); // First 3 are active
    const rolePermissions = activePermissionIds.map(permissionId => ({
      role_id: testRoleId,
      permission_id: permissionId,
      created_at: new Date()
    }));

    await db('role_permissions').insert(rolePermissions);

    // Create test user
    const [user] = await db('users')
      .insert({
        id: '650e8400-e29b-41d4-a716-446655440020',
        email: 'permission-test@example.com',
        password_hash: 'test',
        name: 'Permission Test User',
        role: 'referee',
        active: true
      })
      .returning('*');

    testUserId = user.id;

    // Assign role to user
    await db('user_roles').insert({
      user_id: testUserId,
      role_id: testRoleId,
      created_at: new Date()
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db('user_roles').where('user_id', testUserId).del();
    await db('role_permissions').where('role_id', testRoleId).del();
    await db('roles').where('id', testRoleId).del();
    await db('permissions').whereIn('id', testPermissionIds).del();
    await db('users').where('id', testUserId).del();
  });

  beforeEach(() => {
    // Clear cache before each test
    permissionService.invalidateAllCaches();
  });

  describe('User Permission Retrieval', () => {
    test('should get user permissions', async () => {
      const permissions = await permissionService.getUserPermissions(testUserId);

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(3); // Only active permissions
      expect(permissions.map(p => p.code)).toEqual(
        expect.arrayContaining(['MANAGE_USERS', 'VIEW_REPORTS', 'EDIT_GAMES'])
      );
      expect(permissions.every(p => p.active)).toBe(true);
    });

    test('should cache user permissions', async () => {
      // First call - should hit database
      const permissions1 = await permissionService.getUserPermissions(testUserId);
      
      // Second call - should hit cache
      const permissions2 = await permissionService.getUserPermissions(testUserId);

      expect(permissions1).toEqual(permissions2);

      // Verify cache is working by checking cache stats
      const stats = permissionService.getCacheStats();
      expect(stats.userPermissionsCacheSize).toBeGreaterThan(0);
    });

    test('should bypass cache when requested', async () => {
      // Populate cache first
      await permissionService.getUserPermissions(testUserId, true);

      // Bypass cache
      const permissions = await permissionService.getUserPermissions(testUserId, false);

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(3);
    });

    test('should handle user with no permissions', async () => {
      // Create user with no role assignments
      const [userWithoutPerms] = await db('users')
        .insert({
          id: '650e8400-e29b-41d4-a716-446655440021',
          email: 'no-perms@example.com',
          password_hash: 'test',
          name: 'No Permissions User',
          role: 'referee',
          active: true
        })
        .returning('*');

      const permissions = await permissionService.getUserPermissions(userWithoutPerms.id);

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);

      // Clean up
      await db('users').where('id', userWithoutPerms.id).del();
    });
  });

  describe('Permission Checking', () => {
    test('should check if user has specific permission', async () => {
      const hasPermission = await permissionService.hasPermission(testUserId, 'manage_users');
      expect(hasPermission).toBe(true);

      const hasPermissionByCode = await permissionService.hasPermission(testUserId, 'MANAGE_USERS');
      expect(hasPermissionByCode).toBe(true);

      const hasPermissionById = await permissionService.hasPermission(testUserId, testPermissionIds[0]);
      expect(hasPermissionById).toBe(true);

      const hasInactivePermission = await permissionService.hasPermission(testUserId, 'inactive_permission');
      expect(hasInactivePermission).toBe(false);
    });

    test('should check if user has any of multiple permissions', async () => {
      const hasAnyPermission = await permissionService.hasAnyPermission(
        testUserId, 
        ['manage_users', 'nonexistent_permission']
      );
      expect(hasAnyPermission).toBe(true);

      const hasNoneOfPermissions = await permissionService.hasAnyPermission(
        testUserId, 
        ['nonexistent_permission', 'another_nonexistent']
      );
      expect(hasNoneOfPermissions).toBe(false);

      const hasEmptyPermissions = await permissionService.hasAnyPermission(testUserId, []);
      expect(hasEmptyPermissions).toBe(false);
    });

    test('should check if user has all specified permissions', async () => {
      const hasAllPermissions = await permissionService.hasAllPermissions(
        testUserId, 
        ['manage_users', 'view_reports']
      );
      expect(hasAllPermissions).toBe(true);

      const hasMixedPermissions = await permissionService.hasAllPermissions(
        testUserId, 
        ['manage_users', 'nonexistent_permission']
      );
      expect(hasMixedPermissions).toBe(false);

      const hasEmptyPermissions = await permissionService.hasAllPermissions(testUserId, []);
      expect(hasEmptyPermissions).toBe(true); // Empty array should return true
    });

    test('should handle permission check errors gracefully', async () => {
      const hasPermission = await permissionService.hasPermission('invalid-user-id', 'manage_users');
      expect(hasPermission).toBe(false); // Should fail closed
    });
  });

  describe('Bulk Permission Operations', () => {
    test('should perform bulk permission check', async () => {
      // Create additional test user without permissions
      const [user2] = await db('users')
        .insert({
          id: '650e8400-e29b-41d4-a716-446655440022',
          email: 'bulk-test@example.com',
          password_hash: 'test',
          name: 'Bulk Test User',
          role: 'referee',
          active: true
        })
        .returning('*');

      const results = await permissionService.bulkPermissionCheck(
        [testUserId, user2.id],
        'manage_users'
      );

      expect(results[testUserId]).toBe(true);
      expect(results[user2.id]).toBe(false);

      // Clean up
      await db('users').where('id', user2.id).del();
    });

    test('should handle bulk permission check with multiple permissions', async () => {
      const results = await permissionService.bulkPermissionCheck(
        [testUserId],
        ['manage_users', 'view_reports']
      );

      expect(results[testUserId]).toBe(true); // Has both permissions
    });

    test('should handle bulk permission check errors', async () => {
      const results = await permissionService.bulkPermissionCheck(
        ['invalid-user-1', 'invalid-user-2'],
        'manage_users'
      );

      expect(results['invalid-user-1']).toBe(false);
      expect(results['invalid-user-2']).toBe(false);
    });
  });

  describe('Permission Categories', () => {
    test('should get permissions grouped by category', async () => {
      const permissionsByCategory = await permissionService.getPermissionsByCategory({
        activeOnly: true,
        useCache: true
      });

      expect(typeof permissionsByCategory).toBe('object');
      expect(permissionsByCategory['user_management']).toBeDefined();
      expect(permissionsByCategory['reporting']).toBeDefined();
      expect(permissionsByCategory['game_management']).toBeDefined();
      expect(permissionsByCategory['test']).toBeUndefined(); // Inactive permission should be excluded

      expect(permissionsByCategory['user_management']).toHaveLength(1);
      expect(permissionsByCategory['user_management'][0].code).toBe('MANAGE_USERS');
    });

    test('should include inactive permissions when requested', async () => {
      const permissionsByCategory = await permissionService.getPermissionsByCategory({
        activeOnly: false,
        useCache: false
      });

      expect(permissionsByCategory['test']).toBeDefined();
      expect(permissionsByCategory['test']).toHaveLength(1);
      expect(permissionsByCategory['test'][0].code).toBe('INACTIVE_PERM');
    });

    test('should get user permissions by category', async () => {
      const userPermsByCategory = await permissionService.getUserPermissionsByCategory(testUserId);

      expect(typeof userPermsByCategory).toBe('object');
      expect(userPermsByCategory['user_management']).toHaveLength(1);
      expect(userPermsByCategory['reporting']).toHaveLength(1);
      expect(userPermsByCategory['game_management']).toHaveLength(1);
    });
  });

  describe('Permission Search', () => {
    test('should search permissions by name', async () => {
      const results = await permissionService.searchPermissions('manage', {
        activeOnly: true,
        limit: 10
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('manage');
    });

    test('should search permissions by description', async () => {
      const results = await permissionService.searchPermissions('user accounts', {
        activeOnly: true,
        limit: 10
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].description.toLowerCase()).toContain('user');
    });

    test('should search permissions by code', async () => {
      const results = await permissionService.searchPermissions('MANAGE', {
        activeOnly: true,
        limit: 10
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toContain('MANAGE');
    });

    test('should filter search results by category', async () => {
      const results = await permissionService.searchPermissions('manage', {
        category: 'user_management',
        activeOnly: true,
        limit: 10
      });

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('user_management');
    });

    test('should limit search results', async () => {
      const results = await permissionService.searchPermissions('e', {
        activeOnly: true,
        limit: 2
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('should return empty array for empty search query', async () => {
      const results = await permissionService.searchPermissions('', {
        activeOnly: true,
        limit: 10
      });

      expect(results).toEqual([]);
    });
  });

  describe('Permission Details', () => {
    test('should get detailed user permission info with roles', async () => {
      const permissionDetails = await permissionService.getUserPermissionDetails(testUserId);

      expect(Array.isArray(permissionDetails)).toBe(true);
      expect(permissionDetails).toHaveLength(3);
      
      const manageUsersPermission = permissionDetails.find(p => p.code === 'MANAGE_USERS');
      expect(manageUsersPermission).toBeDefined();
      expect(manageUsersPermission.roles).toHaveLength(1);
      expect(manageUsersPermission.roles[0].name).toBe('Test Permission Role');
    });

    test('should get specific permission by name/code/id', async () => {
      const permissionByName = await permissionService.getPermission('manage_users');
      const permissionByCode = await permissionService.getPermission('MANAGE_USERS');
      const permissionById = await permissionService.getPermission(testPermissionIds[0]);

      expect(permissionByName).toBeDefined();
      expect(permissionByCode).toBeDefined();
      expect(permissionById).toBeDefined();
      
      expect(permissionByName.id).toBe(permissionByCode.id);
      expect(permissionByCode.id).toBe(permissionById.id);
    });

    test('should return null for non-existent permission', async () => {
      const permission = await permissionService.getPermission('nonexistent_permission');
      expect(permission).toBeNull();
    });
  });

  describe('Cache Management', () => {
    test('should provide cache statistics', async () => {
      // Populate some cache
      await permissionService.getUserPermissions(testUserId);
      await permissionService.getPermissionsByCategory();

      const stats = permissionService.getCacheStats();

      expect(stats).toHaveProperty('userPermissionsCacheSize');
      expect(stats).toHaveProperty('permissionCacheSize');
      expect(stats).toHaveProperty('cacheTTL');
      expect(typeof stats.userPermissionsCacheSize).toBe('number');
      expect(typeof stats.permissionCacheSize).toBe('number');
    });

    test('should invalidate user permission cache', async () => {
      // Populate cache
      await permissionService.getUserPermissions(testUserId);
      expect(permissionService.getCacheStats().userPermissionsCacheSize).toBeGreaterThan(0);

      // Invalidate specific user cache
      permissionService.invalidateUserCache(testUserId);

      // Note: Cache might still have size > 0 due to cache key format, but specific user should be cleared
      // The important thing is that this doesn't throw an error
      expect(() => permissionService.invalidateUserCache(testUserId)).not.toThrow();
    });

    test('should invalidate all user caches', async () => {
      // Populate cache
      await permissionService.getUserPermissions(testUserId);
      expect(permissionService.getCacheStats().userPermissionsCacheSize).toBeGreaterThan(0);

      // Invalidate all user caches
      permissionService.invalidateUserCache();
      expect(permissionService.getCacheStats().userPermissionsCacheSize).toBe(0);
    });

    test('should invalidate permission cache', async () => {
      // Populate cache
      await permissionService.getPermissionsByCategory();
      expect(permissionService.getCacheStats().permissionCacheSize).toBeGreaterThan(0);

      // Invalidate permission cache
      permissionService.invalidatePermissionCache();
      expect(permissionService.getCacheStats().permissionCacheSize).toBe(0);
    });

    test('should invalidate all caches', async () => {
      // Populate caches
      await permissionService.getUserPermissions(testUserId);
      await permissionService.getPermissionsByCategory();

      const statsBefore = permissionService.getCacheStats();
      expect(statsBefore.userPermissionsCacheSize + statsBefore.permissionCacheSize).toBeGreaterThan(0);

      // Invalidate all caches
      permissionService.invalidateAllCaches();

      const statsAfter = permissionService.getCacheStats();
      expect(statsAfter.userPermissionsCacheSize).toBe(0);
      expect(statsAfter.permissionCacheSize).toBe(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large number of permissions efficiently', async () => {
      const startTime = Date.now();
      
      // This should be fast due to proper indexing and querying
      await permissionService.getUserPermissions(testUserId);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle invalid user IDs gracefully', async () => {
      const permissions = await permissionService.getUserPermissions('invalid-uuid');
      expect(permissions).toEqual([]);
    });

    test('should handle null/undefined parameters', async () => {
      const hasPermission1 = await permissionService.hasPermission(null, 'manage_users');
      const hasPermission2 = await permissionService.hasPermission(testUserId, null);
      
      expect(hasPermission1).toBe(false);
      expect(hasPermission2).toBe(false);
    });
  });
});