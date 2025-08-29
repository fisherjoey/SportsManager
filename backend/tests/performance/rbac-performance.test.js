/**
 * RBAC Performance Testing Suite
 * 
 * Performance tests for RBAC system including:
 * - Permission checking speed
 * - Cache effectiveness
 * - Database query optimization
 * - Concurrent request handling
 * - Memory usage monitoring
 * - API response times with permission checks
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../setup');
const PermissionService = require('../../src/services/PermissionService');
const RoleService = require('../../src/services/RoleService');
const { authenticateToken, requirePermission, requireAnyPermission } = require('../../src/middleware/auth');

describe('RBAC Performance Tests', () => {
  let app;
  let permissionService;
  let roleService;
  let testUsers = [];
  let testRoles = [];
  let testPermissions = [];
  let tokens = {};

  // Performance thresholds (adjust based on requirements)
  const PERFORMANCE_THRESHOLDS = {
    SINGLE_PERMISSION_CHECK: 50,    // 50ms
    BULK_PERMISSION_CHECK: 200,     // 200ms
    API_REQUEST_WITH_AUTH: 500,     // 500ms
    CACHE_HIT: 10,                  // 10ms
    DATABASE_QUERY: 100,            // 100ms
    CONCURRENT_REQUESTS: 2000       // 2000ms for 100 concurrent requests
  };

  beforeAll(async () => {
    permissionService = new PermissionService();
    roleService = new RoleService();

    // Setup Express app with extensive middleware
    app = express();
    app.use(express.json());

    // Test endpoints with different permission requirements
    app.get('/api/test/single-perm', authenticateToken, requirePermission('users.read'), (req, res) => {
      res.json({ message: 'Single permission check passed', timestamp: Date.now() });
    });

    app.get('/api/test/multiple-perms', authenticateToken, requireAnyPermission(['users.read', 'users.write']), (req, res) => {
      res.json({ message: 'Multiple permission check passed', timestamp: Date.now() });
    });

    app.get('/api/test/heavy-query', authenticateToken, requirePermission('reports.generate'), async (req, res) => {
      // Simulate a heavy database operation
      const start = Date.now();
      const users = await db('users').select('id', 'name', 'email').limit(100);
      const elapsed = Date.now() - start;
      
      res.json({ 
        message: 'Heavy query completed',
        users: users.length,
        queryTime: elapsed,
        timestamp: Date.now()
      });
    });

    app.post('/api/test/bulk-check', authenticateToken, async (req, res) => {
      const { permissions } = req.body;
      const start = Date.now();
      
      const results = {};
      for (const permission of permissions || []) {
        results[permission] = await permissionService.hasPermission(req.user.id, permission);
      }
      
      const elapsed = Date.now() - start;
      res.json({
        results,
        checkTime: elapsed,
        permissionCount: permissions?.length || 0
      });
    });

    // Endpoint to test cache warming
    app.post('/api/test/warm-cache', authenticateToken, async (req, res) => {
      const start = Date.now();
      await permissionService.getUserPermissions(req.user.id, true); // Use cache
      const elapsed = Date.now() - start;
      
      res.json({
        message: 'Cache warmed',
        warmTime: elapsed
      });
    });

    // Endpoint to test cache performance
    app.get('/api/test/cache-hit', authenticateToken, async (req, res) => {
      const start = Date.now();
      const permissions = await permissionService.getUserPermissions(req.user.id, true); // Use cache
      const elapsed = Date.now() - start;
      
      res.json({
        message: 'Cache hit test',
        permissions: permissions.length,
        accessTime: elapsed
      });
    });
  });

  beforeEach(async () => {
    // Clean slate
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').del();

    // Clear all caches
    permissionService.invalidateAllCaches();

    // Create test permissions (larger set for performance testing)
    const permissionData = [];
    for (let i = 1; i <= 50; i++) {
      permissionData.push({
        id: `750e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
        name: `permission.${i}`,
        code: `PERMISSION_${i}`,
        description: `Test permission ${i}`,
        category: `category_${i % 10}`,
        active: true
      });
    }
    
    testPermissions = await db('permissions').insert(permissionData).returning('*');

    // Create test roles with varying permission counts
    testRoles = await db('roles')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440010',
          name: 'Light Role',
          code: 'LIGHT_ROLE',
          description: 'Role with few permissions',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440011',
          name: 'Heavy Role',
          code: 'HEAVY_ROLE',
          description: 'Role with many permissions',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440012',
          name: 'Admin Role',
          code: 'ADMIN_ROLE',
          description: 'Role with all permissions',
          active: true
        }
      ])
      .returning('*');

    // Assign permissions to roles
    const rolePermissions = [];
    
    // Light Role - 5 permissions
    for (let i = 0; i < 5; i++) {
      rolePermissions.push({
        role_id: testRoles[0].id,
        permission_id: testPermissions[i].id,
        created_at: new Date()
      });
    }
    
    // Heavy Role - 25 permissions
    for (let i = 0; i < 25; i++) {
      rolePermissions.push({
        role_id: testRoles[1].id,
        permission_id: testPermissions[i].id,
        created_at: new Date()
      });
    }
    
    // Admin Role - all permissions
    for (let i = 0; i < testPermissions.length; i++) {
      rolePermissions.push({
        role_id: testRoles[2].id,
        permission_id: testPermissions[i].id,
        created_at: new Date()
      });
    }

    await db('role_permissions').insert(rolePermissions);

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    testUsers = await db('users')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440020',
          email: 'light.user@test.com',
          name: 'Light User',
          password_hash: hashedPassword,
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440021',
          email: 'heavy.user@test.com',
          name: 'Heavy User',
          password_hash: hashedPassword,
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440022',
          email: 'admin.user@test.com',
          name: 'Admin User',
          password_hash: hashedPassword,
          active: true
        }
      ])
      .returning('*');

    // Assign roles to users
    await db('user_roles').insert([
      { user_id: testUsers[0].id, role_id: testRoles[0].id, created_at: new Date() },
      { user_id: testUsers[1].id, role_id: testRoles[1].id, created_at: new Date() },
      { user_id: testUsers[2].id, role_id: testRoles[2].id, created_at: new Date() }
    ]);

    // Generate JWT tokens
    for (let i = 0; i < testUsers.length; i++) {
      tokens[`user${i}`] = jwt.sign(
        {
          userId: testUsers[i].id,
          email: testUsers[i].email,
          role: 'user'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );
    }
  });

  afterEach(async () => {
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').del();
    tokens = {};
    
    // Clear caches
    permissionService.invalidateAllCaches();
  });

  describe('Permission Check Performance', () => {
    test('should check single permission within acceptable time', async () => {
      const start = Date.now();
      const hasPermission = await permissionService.hasPermission(testUsers[0].id, 'permission.1');
      const elapsed = Date.now() - start;

      expect(hasPermission).toBe(true);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_PERMISSION_CHECK);
    });

    test('should handle multiple permission checks efficiently', async () => {
      const permissionsToCheck = ['permission.1', 'permission.2', 'permission.3', 'permission.4', 'permission.5'];
      
      const start = Date.now();
      const results = await Promise.all(
        permissionsToCheck.map(perm => 
          permissionService.hasPermission(testUsers[1].id, perm)
        )
      );
      const elapsed = Date.now() - start;

      expect(results.every(r => r === true)).toBe(true);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_PERMISSION_CHECK);
    });

    test('should handle bulk permission check efficiently', async () => {
      const userIds = testUsers.map(u => u.id);
      
      const start = Date.now();
      const results = await permissionService.bulkPermissionCheck(userIds, 'permission.1');
      const elapsed = Date.now() - start;

      expect(Object.keys(results)).toHaveLength(3);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_PERMISSION_CHECK);
    });

    test('should scale well with increasing number of permissions', async () => {
      // Test with user having all permissions
      const permissionsToCheck = testPermissions.slice(0, 20).map(p => p.name);
      
      const start = Date.now();
      const hasAny = await permissionService.hasAnyPermission(testUsers[2].id, permissionsToCheck);
      const hasAll = await permissionService.hasAllPermissions(testUsers[2].id, permissionsToCheck);
      const elapsed = Date.now() - start;

      expect(hasAny).toBe(true);
      expect(hasAll).toBe(true);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_PERMISSION_CHECK);
    });
  });

  describe('Cache Performance', () => {
    test('should warm cache efficiently', async () => {
      const start = Date.now();
      await permissionService.getUserPermissions(testUsers[2].id, true); // Cache miss
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
    });

    test('should serve from cache efficiently', async () => {
      // Warm the cache
      await permissionService.getUserPermissions(testUsers[2].id, true);
      
      // Now test cache hit
      const start = Date.now();
      const permissions = await permissionService.getUserPermissions(testUsers[2].id, true);
      const elapsed = Date.now() - start;

      expect(permissions).toHaveLength(testPermissions.length);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT);
    });

    test('should show significant performance improvement with cache', async () => {
      // Cold cache (database query)
      const coldStart = Date.now();
      await permissionService.getUserPermissions(testUsers[2].id, false);
      const coldElapsed = Date.now() - coldStart;

      // Warm cache first
      await permissionService.getUserPermissions(testUsers[2].id, true);

      // Hot cache
      const hotStart = Date.now();
      await permissionService.getUserPermissions(testUsers[2].id, true);
      const hotElapsed = Date.now() - hotStart;

      expect(hotElapsed).toBeLessThan(coldElapsed * 0.2); // Cache should be at least 5x faster
    });

    test('should handle cache invalidation efficiently', async () => {
      // Warm cache
      await permissionService.getUserPermissions(testUsers[0].id, true);

      const start = Date.now();
      permissionService.invalidateUserCache(testUsers[0].id);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10); // Should be very fast
    });

    test('should provide accurate cache statistics', async () => {
      // Populate caches
      await permissionService.getUserPermissions(testUsers[0].id, true);
      await permissionService.getUserPermissions(testUsers[1].id, true);
      await permissionService.getPermissionsByCategory();

      const stats = permissionService.getCacheStats();

      expect(stats.userPermissionsCacheSize).toBe(2);
      expect(stats.permissionCacheSize).toBe(1);
      expect(stats.cacheTTL).toBe(5 * 60 * 1000);
      expect(stats.maxAge).toBeGreaterThan(0);
    });
  });

  describe('API Endpoint Performance', () => {
    test('should handle single permission API requests efficiently', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/test/single-perm')
        .set('Authorization', `Bearer ${tokens.user0}`);
      
      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.API_REQUEST_WITH_AUTH);
    });

    test('should handle multiple permission API requests efficiently', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/test/multiple-perms')
        .set('Authorization', `Bearer ${tokens.user1}`);
      
      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.API_REQUEST_WITH_AUTH);
    });

    test('should handle bulk permission checks via API efficiently', async () => {
      const permissionsToTest = ['permission.1', 'permission.2', 'permission.3', 'permission.4', 'permission.5'];
      
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/test/bulk-check')
        .set('Authorization', `Bearer ${tokens.user1}`)
        .send({ permissions: permissionsToTest });
      
      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.permissionCount).toBe(5);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.API_REQUEST_WITH_AUTH);
    });

    test('should demonstrate cache warming and usage via API', async () => {
      // Warm cache
      const warmResponse = await request(app)
        .post('/api/test/warm-cache')
        .set('Authorization', `Bearer ${tokens.user2}`);

      expect(warmResponse.status).toBe(200);

      // Test cache hit
      const start = Date.now();
      
      const hitResponse = await request(app)
        .get('/api/test/cache-hit')
        .set('Authorization', `Bearer ${tokens.user2}`);
      
      const elapsed = Date.now() - start;

      expect(hitResponse.status).toBe(200);
      expect(hitResponse.body.permissions).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.API_REQUEST_WITH_AUTH);
      expect(hitResponse.body.accessTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT);
    });
  });

  describe('Concurrent Request Performance', () => {
    test('should handle concurrent permission checks without degradation', async () => {
      const concurrentRequests = 20;
      
      const start = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map(() =>
        permissionService.hasPermission(testUsers[0].id, 'permission.1')
      );
      
      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(results.every(r => r === true)).toBe(true);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS / 5);
    });

    test('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 10;
      
      const start = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .get('/api/test/single-perm')
          .set('Authorization', `Bearer ${tokens.user0}`)
      );
      
      const responses = await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS);
    });

    test('should handle mixed user concurrent requests', async () => {
      const requests = [];
      
      // Mix of different users and endpoints
      for (let i = 0; i < 15; i++) {
        const userIndex = i % 3;
        const endpoint = i % 2 === 0 ? '/api/test/single-perm' : '/api/test/multiple-perms';
        
        requests.push(
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${tokens[`user${userIndex}`]}`)
        );
      }
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const elapsed = Date.now() - start;

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS);
    });
  });

  describe('Database Query Performance', () => {
    test('should retrieve user permissions with optimized queries', async () => {
      const start = Date.now();
      const permissions = await permissionService.getUserPermissions(testUsers[2].id, false);
      const elapsed = Date.now() - start;

      expect(permissions).toHaveLength(testPermissions.length);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
    });

    test('should handle complex permission categorization efficiently', async () => {
      const start = Date.now();
      const permissionsByCategory = await permissionService.getPermissionsByCategory({ useCache: false });
      const elapsed = Date.now() - start;

      expect(Object.keys(permissionsByCategory)).toHaveLength(10); // 10 categories
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
    });

    test('should search permissions efficiently', async () => {
      const start = Date.now();
      const results = await permissionService.searchPermissions('permission', { limit: 20 });
      const elapsed = Date.now() - start;

      expect(results).toHaveLength(20);
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await permissionService.hasPermission(testUsers[0].id, `permission.${(i % 5) + 1}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('should manage cache memory efficiently', async () => {
      const initialCacheSize = permissionService.getCacheStats();
      
      // Fill cache with many users
      for (let i = 0; i < testUsers.length; i++) {
        await permissionService.getUserPermissions(testUsers[i].id, true);
      }
      
      const filledCacheSize = permissionService.getCacheStats();
      expect(filledCacheSize.userPermissionsCacheSize).toBeGreaterThan(initialCacheSize.userPermissionsCacheSize);
      
      // Clear cache
      permissionService.invalidateAllCaches();
      
      const clearedCacheSize = permissionService.getCacheStats();
      expect(clearedCacheSize.userPermissionsCacheSize).toBe(0);
      expect(clearedCacheSize.permissionCacheSize).toBe(0);
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with large permission sets', async () => {
      // Create additional permissions for stress testing
      const largePermissionSet = [];
      for (let i = 51; i <= 100; i++) {
        largePermissionSet.push({
          id: `750e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
          name: `large.permission.${i}`,
          code: `LARGE_PERMISSION_${i}`,
          description: `Large permission ${i}`,
          category: `large_category_${i % 5}`,
          active: true
        });
      }
      
      await db('permissions').insert(largePermissionSet);
      
      // Assign all new permissions to admin role
      const newRolePermissions = largePermissionSet.map(p => ({
        role_id: testRoles[2].id,
        permission_id: p.id,
        created_at: new Date()
      }));
      
      await db('role_permissions').insert(newRolePermissions);
      
      // Clear cache to force fresh query
      permissionService.invalidateAllCaches();
      
      const start = Date.now();
      const permissions = await permissionService.getUserPermissions(testUsers[2].id, false);
      const elapsed = Date.now() - start;

      expect(permissions.length).toBe(100); // 50 original + 50 new
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY * 2); // Allow 2x time for 2x data
    });

    test('should handle rapid cache invalidation and rebuilding', async () => {
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(async () => {
          await permissionService.getUserPermissions(testUsers[1].id, true);
          permissionService.invalidateUserCache(testUsers[1].id);
        });
      }
      
      const start = Date.now();
      await Promise.all(operations.map(op => op()));
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should establish baseline performance metrics', async () => {
      const metrics = {};
      
      // Single permission check
      let start = Date.now();
      await permissionService.hasPermission(testUsers[0].id, 'permission.1');
      metrics.singlePermissionCheck = Date.now() - start;
      
      // Cache hit
      await permissionService.getUserPermissions(testUsers[0].id, true); // warm cache
      start = Date.now();
      await permissionService.getUserPermissions(testUsers[0].id, true);
      metrics.cacheHit = Date.now() - start;
      
      // API request
      start = Date.now();
      await request(app)
        .get('/api/test/single-perm')
        .set('Authorization', `Bearer ${tokens.user0}`);
      metrics.apiRequest = Date.now() - start;
      
      // Bulk operation
      start = Date.now();
      await permissionService.bulkPermissionCheck([testUsers[0].id, testUsers[1].id], 'permission.1');
      metrics.bulkOperation = Date.now() - start;

      // Log metrics for monitoring (in real app, would send to monitoring service)
      console.log('RBAC Performance Metrics:', metrics);
      
      // Verify all metrics are within acceptable ranges
      expect(metrics.singlePermissionCheck).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_PERMISSION_CHECK);
      expect(metrics.cacheHit).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT);
      expect(metrics.apiRequest).toBeLessThan(PERFORMANCE_THRESHOLDS.API_REQUEST_WITH_AUTH);
      expect(metrics.bulkOperation).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_PERMISSION_CHECK);
    });
  });
});