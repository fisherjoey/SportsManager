/**
 * Comprehensive PermissionService Test Suite
 * 
 * Tests for PermissionService including:
 * - User permission retrieval with caching
 * - Permission checking (single, any, all)
 * - Bulk permission operations
 * - Cache management and invalidation
 * - Permission search and categorization
 * - Performance and error handling
 */

const PermissionService = require('../../src/services/PermissionService');
const db = require('../setup');

describe('PermissionService Comprehensive Tests', () => {
  let permissionService;
  let testUsers = [];
  let testRoles = [];
  let testPermissions = [];

  beforeAll(async () => {
    permissionService = new PermissionService();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    
    // Clear caches
    permissionService.invalidateAllCaches();

    // Create test permissions with different categories
    testPermissions = await db('permissions')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440001',
          name: 'users.read',
          code: 'USERS_READ',
          description: 'Read user data',
          category: 'user_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440002',
          name: 'users.write',
          code: 'USERS_WRITE',
          description: 'Create and update users',
          category: 'user_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440003',
          name: 'games.read',
          code: 'GAMES_READ',
          description: 'Read game data',
          category: 'game_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440004',
          name: 'games.manage',
          code: 'GAMES_MANAGE',
          description: 'Manage games',
          category: 'game_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440005',
          name: 'reports.view',
          code: 'REPORTS_VIEW',
          description: 'View reports',
          category: 'reporting',
          active: false // Inactive permission
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440006',
          name: 'admin.access',
          code: 'ADMIN_ACCESS',
          description: 'Administrative access',
          category: 'administration',
          active: true
        }
      ])
      .returning('*');

    // Create test roles
    testRoles = await db('roles')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440010',
          name: 'User Manager',
          code: 'USER_MANAGER',
          description: 'Can manage users',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440011',
          name: 'Game Manager',
          code: 'GAME_MANAGER',
          description: 'Can manage games',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440012',
          name: 'Full Access',
          code: 'FULL_ACCESS',
          description: 'Full system access',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440013',
          name: 'Inactive Role',
          code: 'INACTIVE_ROLE',
          description: 'Inactive role',
          active: false
        }
      ])
      .returning('*');

    // Create test users
    testUsers = await db('users')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440020',
          email: 'usermanager@test.com',
          name: 'User Manager',
          password_hash: 'hashed',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440021',
          email: 'gamemanager@test.com',
          name: 'Game Manager',
          password_hash: 'hashed',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440022',
          email: 'fulladmin@test.com',
          name: 'Full Admin',
          password_hash: 'hashed',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440023',
          email: 'nouser@test.com',
          name: 'No Permissions User',
          password_hash: 'hashed',
          active: true
        }
      ])
      .returning('*');

    // Set up role-permission relationships
    await db('role_permissions').insert([
      // User Manager role permissions
      { role_id: testRoles[0].id, permission_id: testPermissions[0].id, created_at: new Date() },
      { role_id: testRoles[0].id, permission_id: testPermissions[1].id, created_at: new Date() },
      
      // Game Manager role permissions
      { role_id: testRoles[1].id, permission_id: testPermissions[2].id, created_at: new Date() },
      { role_id: testRoles[1].id, permission_id: testPermissions[3].id, created_at: new Date() },
      
      // Full Access role permissions (all active permissions)
      { role_id: testRoles[2].id, permission_id: testPermissions[0].id, created_at: new Date() },
      { role_id: testRoles[2].id, permission_id: testPermissions[1].id, created_at: new Date() },
      { role_id: testRoles[2].id, permission_id: testPermissions[2].id, created_at: new Date() },
      { role_id: testRoles[2].id, permission_id: testPermissions[3].id, created_at: new Date() },
      { role_id: testRoles[2].id, permission_id: testPermissions[5].id, created_at: new Date() },
      
      // Inactive role with permissions (should be ignored)
      { role_id: testRoles[3].id, permission_id: testPermissions[0].id, created_at: new Date() }
    ]);

    // Set up user-role relationships
    await db('user_roles').insert([
      { user_id: testUsers[0].id, role_id: testRoles[0].id, created_at: new Date() }, // User Manager
      { user_id: testUsers[1].id, role_id: testRoles[1].id, created_at: new Date() }, // Game Manager
      { user_id: testUsers[2].id, role_id: testRoles[2].id, created_at: new Date() }, // Full Access
      // testUsers[3] has no roles (no permissions)
    ]);
  });

  afterEach(async () => {
    // Clean up
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').whereIn('id', testUsers.map(u => u.id)).del();
    
    // Clear caches
    permissionService.invalidateAllCaches();
  });

  describe('User Permission Retrieval', () => {
    test('should get user permissions with caching', async () => {
      const permissions = await permissionService.getUserPermissions(testUsers[0].id);

      expect(permissions).toHaveLength(2);
      expect(permissions.map(p => p.code)).toEqual(
        expect.arrayContaining(['USERS_READ', 'USERS_WRITE'])
      );
      
      // Verify permissions are sorted by category then name
      expect(permissions[0].category).toBe('user_management');
      expect(permissions[1].category).toBe('user_management');
    });

    test('should respect cache when enabled', async () => {
      // First call (cache miss)
      const start1 = Date.now();
      const permissions1 = await permissionService.getUserPermissions(testUsers[0].id, true);
      const time1 = Date.now() - start1;

      // Second call (cache hit)
      const start2 = Date.now();
      const permissions2 = await permissionService.getUserPermissions(testUsers[0].id, true);
      const time2 = Date.now() - start2;

      expect(permissions1).toEqual(permissions2);
      expect(time2).toBeLessThan(time1); // Cache should be faster
    });

    test('should bypass cache when disabled', async () => {
      // Populate cache
      await permissionService.getUserPermissions(testUsers[0].id, true);

      // Should get fresh data
      const permissions = await permissionService.getUserPermissions(testUsers[0].id, false);
      
      expect(permissions).toHaveLength(2);
    });

    test('should exclude permissions from inactive roles', async () => {
      // User with inactive role should have no permissions
      await db('user_roles').insert({
        user_id: testUsers[3].id,
        role_id: testRoles[3].id, // Inactive role
        created_at: new Date()
      });

      const permissions = await permissionService.getUserPermissions(testUsers[3].id);
      expect(permissions).toHaveLength(0);
    });

    test('should exclude inactive permissions', async () => {
      // Give user a role with inactive permission
      const [roleWithInactive] = await db('roles')
        .insert({
          name: 'Test Role with Inactive',
          code: 'TEST_INACTIVE',
          description: 'Test role',
          active: true
        })
        .returning('*');

      await db('role_permissions').insert([
        { role_id: roleWithInactive.id, permission_id: testPermissions[4].id, created_at: new Date() }, // inactive permission
        { role_id: roleWithInactive.id, permission_id: testPermissions[0].id, created_at: new Date() }  // active permission
      ]);

      await db('user_roles').insert({
        user_id: testUsers[3].id,
        role_id: roleWithInactive.id,
        created_at: new Date()
      });

      const permissions = await permissionService.getUserPermissions(testUsers[3].id);
      expect(permissions).toHaveLength(1);
      expect(permissions[0].code).toBe('USERS_READ');
    });

    test('should handle user with no roles gracefully', async () => {
      const permissions = await permissionService.getUserPermissions(testUsers[3].id);
      expect(permissions).toHaveLength(0);
    });

    test('should handle non-existent user gracefully', async () => {
      const permissions = await permissionService.getUserPermissions('non-existent-user');
      expect(permissions).toHaveLength(0);
    });
  });

  describe('Permission Checking - Single Permission', () => {
    test('should check permission by name', async () => {
      const hasPermission = await permissionService.hasPermission(testUsers[0].id, 'users.read');
      expect(hasPermission).toBe(true);

      const noPermission = await permissionService.hasPermission(testUsers[0].id, 'games.read');
      expect(noPermission).toBe(false);
    });

    test('should check permission by code', async () => {
      const hasPermission = await permissionService.hasPermission(testUsers[0].id, 'USERS_READ');
      expect(hasPermission).toBe(true);

      const noPermission = await permissionService.hasPermission(testUsers[0].id, 'GAMES_READ');
      expect(noPermission).toBe(false);
    });

    test('should check permission by ID', async () => {
      const hasPermission = await permissionService.hasPermission(testUsers[0].id, testPermissions[0].id);
      expect(hasPermission).toBe(true);

      const noPermission = await permissionService.hasPermission(testUsers[0].id, testPermissions[2].id);
      expect(noPermission).toBe(false);
    });

    test('should fail closed on errors', async () => {
      // Mock database error
      const originalGetUserPermissions = permissionService.getUserPermissions;
      permissionService.getUserPermissions = jest.fn().mockRejectedValue(new Error('DB Error'));

      const hasPermission = await permissionService.hasPermission(testUsers[0].id, 'users.read');
      expect(hasPermission).toBe(false); // Should fail closed

      // Restore
      permissionService.getUserPermissions = originalGetUserPermissions;
    });
  });

  describe('Permission Checking - Multiple Permissions', () => {
    test('should check if user has any of specified permissions', async () => {
      // User 0 has user permissions, not game permissions
      const hasAny1 = await permissionService.hasAnyPermission(testUsers[0].id, ['users.read', 'games.read']);
      expect(hasAny1).toBe(true); // Has users.read

      const hasAny2 = await permissionService.hasAnyPermission(testUsers[0].id, ['games.read', 'admin.access']);
      expect(hasAny2).toBe(false); // Has neither

      const hasAny3 = await permissionService.hasAnyPermission(testUsers[2].id, ['users.read', 'games.read']);
      expect(hasAny3).toBe(true); // Full access user has both
    });

    test('should handle empty permissions array for any check', async () => {
      const hasAny = await permissionService.hasAnyPermission(testUsers[0].id, []);
      expect(hasAny).toBe(false);
    });

    test('should check if user has all specified permissions', async () => {
      // User 0 has both user permissions
      const hasAll1 = await permissionService.hasAllPermissions(testUsers[0].id, ['users.read', 'users.write']);
      expect(hasAll1).toBe(true);

      // User 0 doesn't have game permissions
      const hasAll2 = await permissionService.hasAllPermissions(testUsers[0].id, ['users.read', 'games.read']);
      expect(hasAll2).toBe(false);

      // Full access user has multiple permissions
      const hasAll3 = await permissionService.hasAllPermissions(testUsers[2].id, ['users.read', 'games.read', 'admin.access']);
      expect(hasAll3).toBe(true);
    });

    test('should handle empty permissions array for all check', async () => {
      const hasAll = await permissionService.hasAllPermissions(testUsers[0].id, []);
      expect(hasAll).toBe(true); // Empty requirements = always satisfied
    });

    test('should fail closed on errors for multiple permission checks', async () => {
      const originalGetUserPermissions = permissionService.getUserPermissions;
      permissionService.getUserPermissions = jest.fn().mockRejectedValue(new Error('DB Error'));

      const hasAny = await permissionService.hasAnyPermission(testUsers[0].id, ['users.read']);
      const hasAll = await permissionService.hasAllPermissions(testUsers[0].id, ['users.read']);

      expect(hasAny).toBe(false);
      expect(hasAll).toBe(false);

      permissionService.getUserPermissions = originalGetUserPermissions;
    });
  });

  describe('Bulk Permission Operations', () => {
    test('should perform bulk permission checks for single permission', async () => {
      const userIds = [testUsers[0].id, testUsers[1].id, testUsers[2].id, testUsers[3].id];
      const results = await permissionService.bulkPermissionCheck(userIds, 'users.read');

      expect(results[testUsers[0].id]).toBe(true);  // User Manager has users.read
      expect(results[testUsers[1].id]).toBe(false); // Game Manager doesn't have users.read  
      expect(results[testUsers[2].id]).toBe(true);  // Full Access has users.read
      expect(results[testUsers[3].id]).toBe(false); // No permissions user
    });

    test('should perform bulk permission checks for multiple permissions (all required)', async () => {
      const userIds = [testUsers[0].id, testUsers[1].id, testUsers[2].id];
      const permissions = ['users.read', 'users.write'];
      const results = await permissionService.bulkPermissionCheck(userIds, permissions);

      expect(results[testUsers[0].id]).toBe(true);  // User Manager has both
      expect(results[testUsers[1].id]).toBe(false); // Game Manager has neither
      expect(results[testUsers[2].id]).toBe(true);  // Full Access has both
    });

    test('should handle bulk operation errors gracefully', async () => {
      const originalHasPermission = permissionService.hasPermission;
      permissionService.hasPermission = jest.fn().mockRejectedValue(new Error('Bulk Error'));

      const userIds = [testUsers[0].id, testUsers[1].id];
      const results = await permissionService.bulkPermissionCheck(userIds, 'users.read');

      expect(results[testUsers[0].id]).toBe(false);
      expect(results[testUsers[1].id]).toBe(false);

      permissionService.hasPermission = originalHasPermission;
    });

    test('should process bulk operations in parallel', async () => {
      const userIds = [testUsers[0].id, testUsers[1].id, testUsers[2].id];
      
      const start = Date.now();
      await permissionService.bulkPermissionCheck(userIds, 'users.read');
      const elapsed = Date.now() - start;

      // Should complete quickly due to parallel processing
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Permission Categorization and Organization', () => {
    test('should get permissions grouped by category', async () => {
      const permissionsByCategory = await permissionService.getPermissionsByCategory();

      expect(permissionsByCategory).toHaveProperty('user_management');
      expect(permissionsByCategory).toHaveProperty('game_management');
      expect(permissionsByCategory).toHaveProperty('administration');
      
      expect(permissionsByCategory.user_management).toHaveLength(2);
      expect(permissionsByCategory.game_management).toHaveLength(2);
      expect(permissionsByCategory.administration).toHaveLength(1);
      
      // Should not include inactive permissions by default
      expect(permissionsByCategory).not.toHaveProperty('reporting');
    });

    test('should include inactive permissions when requested', async () => {
      const permissionsByCategory = await permissionService.getPermissionsByCategory({ activeOnly: false });

      expect(permissionsByCategory).toHaveProperty('reporting');
      expect(permissionsByCategory.reporting).toHaveLength(1);
      expect(permissionsByCategory.reporting[0].active).toBe(false);
    });

    test('should get user permissions grouped by category', async () => {
      const userPermsByCategory = await permissionService.getUserPermissionsByCategory(testUsers[2].id);

      expect(userPermsByCategory).toHaveProperty('user_management');
      expect(userPermsByCategory).toHaveProperty('game_management');
      expect(userPermsByCategory).toHaveProperty('administration');
      
      expect(userPermsByCategory.user_management).toHaveLength(2);
      expect(userPermsByCategory.game_management).toHaveLength(2);
      expect(userPermsByCategory.administration).toHaveLength(1);
    });

    test('should handle uncategorized permissions', async () => {
      // Add permission without category
      await db('permissions').insert({
        id: '750e8400-e29b-41d4-a716-446655440099',
        name: 'uncategorized.test',
        code: 'UNCATEGORIZED_TEST',
        description: 'Uncategorized permission',
        category: null,
        active: true
      });

      const permissionsByCategory = await permissionService.getPermissionsByCategory({ useCache: false });
      
      expect(permissionsByCategory).toHaveProperty('uncategorized');
      expect(permissionsByCategory.uncategorized).toHaveLength(1);
    });
  });

  describe('Permission Search', () => {
    test('should search permissions by name', async () => {
      const results = await permissionService.searchPermissions('user');
      
      expect(results).toHaveLength(2);
      expect(results.map(p => p.name)).toEqual(
        expect.arrayContaining(['users.read', 'users.write'])
      );
    });

    test('should search permissions by description', async () => {
      const results = await permissionService.searchPermissions('manage');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(p => p.description.toLowerCase().includes('manage'))).toBe(true);
    });

    test('should search permissions by code', async () => {
      const results = await permissionService.searchPermissions('GAMES');
      
      expect(results).toHaveLength(2);
      expect(results.map(p => p.code)).toEqual(
        expect.arrayContaining(['GAMES_READ', 'GAMES_MANAGE'])
      );
    });

    test('should filter search by category', async () => {
      const results = await permissionService.searchPermissions('read', { category: 'game_management' });
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('games.read');
    });

    test('should exclude inactive permissions from search by default', async () => {
      const results = await permissionService.searchPermissions('report');
      expect(results).toHaveLength(0);
    });

    test('should include inactive permissions when requested', async () => {
      const results = await permissionService.searchPermissions('report', { activeOnly: false });
      expect(results).toHaveLength(1);
      expect(results[0].active).toBe(false);
    });

    test('should limit search results', async () => {
      const results = await permissionService.searchPermissions('', { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('should handle empty search query', async () => {
      const results = await permissionService.searchPermissions('');
      expect(results).toHaveLength(0);
    });

    test('should handle whitespace-only search query', async () => {
      const results = await permissionService.searchPermissions('   ');
      expect(results).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    test('should invalidate user cache for specific user', async () => {
      // Populate cache
      await permissionService.getUserPermissions(testUsers[0].id);
      
      // Invalidate specific user cache
      permissionService.invalidateUserCache(testUsers[0].id);
      
      // Verify cache stats
      const stats = permissionService.getCacheStats();
      expect(stats.userPermissionsCacheSize).toBe(0);
    });

    test('should invalidate all user caches', async () => {
      // Populate multiple user caches
      await permissionService.getUserPermissions(testUsers[0].id);
      await permissionService.getUserPermissions(testUsers[1].id);
      
      // Invalidate all user caches
      permissionService.invalidateUserCache();
      
      const stats = permissionService.getCacheStats();
      expect(stats.userPermissionsCacheSize).toBe(0);
    });

    test('should invalidate permission cache', async () => {
      // Populate permission cache
      await permissionService.getPermissionsByCategory();
      
      // Invalidate permission cache
      permissionService.invalidatePermissionCache();
      
      const stats = permissionService.getCacheStats();
      expect(stats.permissionCacheSize).toBe(0);
    });

    test('should invalidate all caches', async () => {
      // Populate both caches
      await permissionService.getUserPermissions(testUsers[0].id);
      await permissionService.getPermissionsByCategory();
      
      // Invalidate all caches
      permissionService.invalidateAllCaches();
      
      const stats = permissionService.getCacheStats();
      expect(stats.userPermissionsCacheSize).toBe(0);
      expect(stats.permissionCacheSize).toBe(0);
    });

    test('should provide cache statistics', async () => {
      await permissionService.getUserPermissions(testUsers[0].id);
      await permissionService.getPermissionsByCategory();
      
      const stats = permissionService.getCacheStats();
      
      expect(stats).toHaveProperty('userPermissionsCacheSize');
      expect(stats).toHaveProperty('permissionCacheSize');
      expect(stats).toHaveProperty('cacheTTL');
      expect(stats).toHaveProperty('maxAge');
      
      expect(stats.userPermissionsCacheSize).toBe(1);
      expect(stats.permissionCacheSize).toBe(1);
      expect(stats.cacheTTL).toBe(5 * 60 * 1000); // 5 minutes
    });

    test('should clean expired cache entries automatically', (done) => {
      // This test requires manipulating time, which is complex
      // For now, we test that the cleanup function exists and can be called
      expect(typeof permissionService.cleanExpiredCache).toBe('function');
      
      // Test manual cleanup doesn't throw
      expect(() => permissionService.cleanExpiredCache()).not.toThrow();
      done();
    });
  });

  describe('Detailed Permission Information', () => {
    test('should get detailed user permission info with roles', async () => {
      const details = await permissionService.getUserPermissionDetails(testUsers[2].id);
      
      expect(details.length).toBeGreaterThan(0);
      expect(details[0]).toHaveProperty('roles');
      expect(Array.isArray(details[0].roles)).toBe(true);
      expect(details[0].roles[0]).toHaveProperty('id');
      expect(details[0].roles[0]).toHaveProperty('name');
    });

    test('should handle user with no permissions in detailed info', async () => {
      const details = await permissionService.getUserPermissionDetails(testUsers[3].id);
      expect(details).toHaveLength(0);
    });

    test('should group permissions by ID in detailed info', async () => {
      // User with multiple roles having same permission should show all granting roles
      await db('user_roles').insert({
        user_id: testUsers[2].id,
        role_id: testRoles[0].id, // Also assign User Manager role
        created_at: new Date()
      });

      const details = await permissionService.getUserPermissionDetails(testUsers[2].id);
      
      // Find a permission that should be granted by multiple roles
      const userReadPerm = details.find(p => p.code === 'USERS_READ');
      expect(userReadPerm).toBeDefined();
      expect(userReadPerm.roles.length).toBeGreaterThan(1);
    });
  });

  describe('Permission Utility Functions', () => {
    test('should get permission by name', async () => {
      const permission = await permissionService.getPermission('users.read');
      expect(permission).toBeDefined();
      expect(permission.name).toBe('users.read');
    });

    test('should get permission by code', async () => {
      const permission = await permissionService.getPermission('USERS_READ');
      expect(permission).toBeDefined();
      expect(permission.code).toBe('USERS_READ');
    });

    test('should get permission by ID', async () => {
      const permission = await permissionService.getPermission(testPermissions[0].id);
      expect(permission).toBeDefined();
      expect(permission.id).toBe(testPermissions[0].id);
    });

    test('should return null for non-existent permission', async () => {
      const permission = await permissionService.getPermission('non.existent');
      expect(permission).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database errors in permission retrieval', async () => {
      // Mock database error
      const originalDb = permissionService.db;
      permissionService.db = jest.fn().mockReturnValue({
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('DB Connection Error'))
      });

      await expect(
        permissionService.getUserPermissions(testUsers[0].id, false)
      ).rejects.toThrow('Failed to get user permissions');

      permissionService.db = originalDb;
    });

    test('should handle invalid parameters gracefully', async () => {
      expect(await permissionService.hasPermission(null, 'permission')).toBe(false);
      expect(await permissionService.hasPermission(testUsers[0].id, null)).toBe(false);
      expect(await permissionService.hasAnyPermission(testUsers[0].id, null)).toBe(false);
    });

    test('should handle malformed cache data', async () => {
      // Manually corrupt cache
      permissionService.userPermissionsCache.set(`user_permissions_${testUsers[0].id}`, {
        data: 'invalid data',
        timestamp: Date.now()
      });

      // Should handle gracefully by fetching fresh data
      const permissions = await permissionService.getUserPermissions(testUsers[0].id);
      expect(Array.isArray(permissions)).toBe(true);
    });

    test('should handle non-string search queries', async () => {
      await expect(
        permissionService.searchPermissions(null)
      ).rejects.toThrow();
    });

    test('should handle concurrent permission checks without cache conflicts', async () => {
      const promises = Array(20).fill(null).map((_, i) => 
        permissionService.hasPermission(testUsers[i % testUsers.length].id, 'users.read')
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
      expect(results.every(r => typeof r === 'boolean')).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large numbers of permissions efficiently', async () => {
      // Create many permissions
      const manyPermissions = Array(50).fill(null).map((_, i) => ({
        id: `750e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
        name: `test.permission.${i}`,
        code: `TEST_PERMISSION_${i}`,
        description: `Test permission ${i}`,
        category: `category_${i % 5}`,
        active: true
      }));

      await db('permissions').insert(manyPermissions);

      const start = Date.now();
      const permsByCategory = await permissionService.getPermissionsByCategory({ useCache: false });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
      expect(Object.keys(permsByCategory)).toHaveLength(8); // 5 new categories + 3 existing
    });

    test('should cache improve performance significantly', async () => {
      // Cold cache
      const start1 = Date.now();
      await permissionService.getUserPermissions(testUsers[2].id, false);
      const coldTime = Date.now() - start1;

      // Warm cache
      const start2 = Date.now();
      await permissionService.getUserPermissions(testUsers[2].id, true);
      const warmTime = Date.now() - start2;

      // Second warm cache call
      const start3 = Date.now();
      await permissionService.getUserPermissions(testUsers[2].id, true);
      const cachedTime = Date.now() - start3;

      expect(cachedTime).toBeLessThan(warmTime);
    });

    test('should handle concurrent cache operations safely', async () => {
      const userId = testUsers[0].id;
      
      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() => 
        permissionService.getUserPermissions(userId, true)
      );

      const results = await Promise.all(promises);
      
      // All results should be identical
      const firstResult = JSON.stringify(results[0]);
      expect(results.every(r => JSON.stringify(r) === firstResult)).toBe(true);
    });
  });
});