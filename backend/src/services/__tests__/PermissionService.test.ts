/**
 * @fileoverview PermissionService Unit Tests
 *
 * Comprehensive test suite for PermissionService covering all permission management functionality
 */

import { jest } from '@jest/globals';

// Mock BaseService
const mockBaseService = {
  constructor: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
};

jest.mock('../BaseService', () => {
  return jest.fn().mockImplementation(() => mockBaseService);
});

// Mock database
const mockDb = jest.fn();
const mockTransaction = jest.fn();
const mockWhere = jest.fn();
const mockJoin = jest.fn();
const mockSelect = jest.fn();
const mockOrderBy = jest.fn();
const mockFirst = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockReturning = jest.fn();
const mockDistinct = jest.fn();
const mockCount = jest.fn();
const mockLimit = jest.fn();
const mockOffset = jest.fn();
const mockOrWhere = jest.fn();
const mockWhereNot = jest.fn();
const mockCommit = jest.fn();
const mockRollback = jest.fn();

// Setup method chaining for query builder
const chainableMethods = {
  where: mockWhere,
  join: mockJoin,
  select: mockSelect,
  orderBy: mockOrderBy,
  first: mockFirst,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  returning: mockReturning,
  distinct: mockDistinct,
  count: mockCount,
  limit: mockLimit,
  offset: mockOffset,
  orWhere: mockOrWhere,
  whereNot: mockWhereNot,
};

// Make each method return an object with all chainable methods
Object.keys(chainableMethods).forEach(method => {
  chainableMethods[method].mockReturnValue(chainableMethods);
});

mockDb.mockReturnValue(chainableMethods);
mockDb.transaction = mockTransaction;
mockDb.raw = jest.fn().mockReturnValue('raw_query');

// Mock transaction object
const mockTrx = {
  ...chainableMethods,
  commit: mockCommit,
  rollback: mockRollback,
};

mockTransaction.mockResolvedValue(mockTrx);

jest.mock('../../config/database', () => mockDb);

// Import after mocking
const PermissionService = require('../PermissionService.ts').default;

describe('PermissionService', () => {
  let permissionService: any;
  let originalSetInterval: typeof setInterval;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock setInterval to prevent actual timer creation
    originalSetInterval = global.setInterval;
    global.setInterval = jest.fn().mockReturnValue('timer_id' as any);

    permissionService = new PermissionService();
  });

  afterEach(() => {
    global.setInterval = originalSetInterval;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(permissionService.userPermissionsCache).toBeInstanceOf(Map);
      expect(permissionService.permissionCache).toBeInstanceOf(Map);
      expect(permissionService.cacheTTL).toBe(5 * 60 * 1000);
      expect(global.setInterval).toHaveBeenCalled();
    });

    it('should start cache cleanup timer', () => {
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        10 * 60 * 1000
      );
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('cleanExpiredCache', () => {
      it('should remove expired entries from both caches', () => {
        const now = Date.now();
        jest.setSystemTime(now);

        // Add expired entries
        permissionService.userPermissionsCache.set('user_1', {
          data: ['perm1'],
          timestamp: now - (6 * 60 * 1000) // 6 minutes ago (expired)
        });

        permissionService.permissionCache.set('all_perms', {
          data: ['perm1', 'perm2'],
          timestamp: now - (6 * 60 * 1000) // 6 minutes ago (expired)
        });

        // Add valid entry
        permissionService.userPermissionsCache.set('user_2', {
          data: ['perm2'],
          timestamp: now - (2 * 60 * 1000) // 2 minutes ago (valid)
        });

        permissionService.cleanExpiredCache();

        expect(permissionService.userPermissionsCache.has('user_1')).toBe(false);
        expect(permissionService.userPermissionsCache.has('user_2')).toBe(true);
        expect(permissionService.permissionCache.has('all_perms')).toBe(false);
      });
    });

    describe('invalidateUserCache', () => {
      it('should clear specific user cache when userId provided', () => {
        permissionService.userPermissionsCache.set('user_permissions_123', { data: [] });
        permissionService.userPermissionsCache.set('user_permissions_456', { data: [] });

        permissionService.invalidateUserCache('123');

        expect(permissionService.userPermissionsCache.has('user_permissions_123')).toBe(false);
        expect(permissionService.userPermissionsCache.has('user_permissions_456')).toBe(true);
      });

      it('should clear all user cache when no userId provided', () => {
        permissionService.userPermissionsCache.set('user_permissions_123', { data: [] });
        permissionService.userPermissionsCache.set('user_permissions_456', { data: [] });

        permissionService.invalidateUserCache();

        expect(permissionService.userPermissionsCache.size).toBe(0);
      });
    });

    describe('invalidatePermissionCache', () => {
      it('should clear permission cache', () => {
        permissionService.permissionCache.set('test', { data: [] });

        permissionService.invalidatePermissionCache();

        expect(permissionService.permissionCache.size).toBe(0);
      });
    });

    describe('invalidateAllCaches', () => {
      it('should clear both caches', () => {
        permissionService.userPermissionsCache.set('user', { data: [] });
        permissionService.permissionCache.set('perms', { data: [] });

        permissionService.invalidateAllCaches();

        expect(permissionService.userPermissionsCache.size).toBe(0);
        expect(permissionService.permissionCache.size).toBe(0);
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics', () => {
        const now = Date.now();
        permissionService.userPermissionsCache.set('user1', { timestamp: now - 1000 });
        permissionService.permissionCache.set('perms1', { timestamp: now - 2000 });

        const stats = permissionService.getCacheStats();

        expect(stats).toEqual({
          userPermissionsCacheSize: 1,
          permissionCacheSize: 1,
          cacheTTL: 5 * 60 * 1000,
          maxAge: expect.any(Number)
        });
      });
    });
  });

  describe('getUserPermissions', () => {
    const userId = '123';
    const mockPermissions = [
      { id: 1, name: 'read_users', category: 'users' },
      { id: 2, name: 'write_users', category: 'users' }
    ];

    it('should return cached permissions when available and fresh', async () => {
      const cacheKey = `user_permissions_${userId}`;
      permissionService.userPermissionsCache.set(cacheKey, {
        data: mockPermissions,
        timestamp: Date.now() - 1000 // 1 second ago
      });

      const result = await permissionService.getUserPermissions(userId);

      expect(result).toEqual(mockPermissions);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it('should bypass cache when useCache is false', async () => {
      const cacheKey = `user_permissions_${userId}`;
      permissionService.userPermissionsCache.set(cacheKey, {
        data: mockPermissions,
        timestamp: Date.now()
      });

      mockFirst.mockResolvedValueOnce(null); // Not super admin
      mockSelect.mockResolvedValueOnce(mockPermissions);

      const result = await permissionService.getUserPermissions(userId, false);

      expect(result).toEqual(mockPermissions);
      expect(mockDb).toHaveBeenCalled();
    });

    it('should return all permissions for Super Admin users', async () => {
      const allPermissions = [...mockPermissions, { id: 3, name: 'admin_all', category: 'admin' }];

      mockFirst.mockResolvedValueOnce({ id: 1, name: 'Super Admin' }); // Is super admin
      mockSelect.mockResolvedValueOnce(allPermissions);

      const result = await permissionService.getUserPermissions(userId);

      expect(result).toEqual(allPermissions);
      expect(mockWhere).toHaveBeenCalledWith('user_roles.user_id', userId);
      expect(mockWhere).toHaveBeenCalledWith('roles.name', 'Super Admin');
    });

    it('should query user permissions for non-Super Admin users', async () => {
      mockFirst.mockResolvedValueOnce(null); // Not super admin
      mockSelect.mockResolvedValueOnce(mockPermissions);

      const result = await permissionService.getUserPermissions(userId);

      expect(result).toEqual(mockPermissions);
      expect(mockJoin).toHaveBeenCalledWith('role_permissions', 'permissions.id', 'role_permissions.permission_id');
      expect(mockJoin).toHaveBeenCalledWith('roles', 'role_permissions.role_id', 'roles.id');
      expect(mockJoin).toHaveBeenCalledWith('user_roles', 'roles.id', 'user_roles.role_id');
    });

    it('should cache results when useCache is true', async () => {
      mockFirst.mockResolvedValueOnce(null); // Not super admin
      mockSelect.mockResolvedValueOnce(mockPermissions);

      await permissionService.getUserPermissions(userId, true);

      const cacheKey = `user_permissions_${userId}`;
      expect(permissionService.userPermissionsCache.has(cacheKey)).toBe(true);
      const cached = permissionService.userPermissionsCache.get(cacheKey);
      expect(cached.data).toEqual(mockPermissions);
    });

    it('should handle database errors', async () => {
      mockFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.getUserPermissions(userId))
        .rejects.toThrow('Failed to get user permissions: Database error');
    });
  });

  describe('hasPermission', () => {
    const userId = '123';
    const permissionName = 'read_users';

    it('should return true for Super Admin users', async () => {
      mockFirst.mockResolvedValueOnce({ id: 1, name: 'Super Admin' });

      const result = await permissionService.hasPermission(userId, permissionName);

      expect(result).toBe(true);
    });

    it('should check user permissions for non-Super Admin users', async () => {
      mockFirst.mockResolvedValueOnce(null); // Not super admin

      // Mock getUserPermissions
      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 1, name: 'read_users', code: 'read_users' },
        { id: 2, name: 'write_users', code: 'write_users' }
      ]);

      const result = await permissionService.hasPermission(userId, permissionName);

      expect(result).toBe(true);
      expect(permissionService.getUserPermissions).toHaveBeenCalledWith(userId);
    });

    it('should return false when user does not have permission', async () => {
      mockFirst.mockResolvedValueOnce(null); // Not super admin

      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 2, name: 'write_users', code: 'write_users' }
      ]);

      const result = await permissionService.hasPermission(userId, permissionName);

      expect(result).toBe(false);
    });

    it('should check permission by ID', async () => {
      mockFirst.mockResolvedValueOnce(null); // Not super admin

      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 1, name: 'read_users', code: 'read_users' }
      ]);

      const result = await permissionService.hasPermission(userId, '1');

      expect(result).toBe(true);
    });

    it('should check permission by code', async () => {
      mockFirst.mockResolvedValueOnce(null); // Not super admin

      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 1, name: 'read_users', code: 'read_users_code' }
      ]);

      const result = await permissionService.hasPermission(userId, 'read_users_code');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockFirst.mockRejectedValueOnce(new Error('Database error'));

      const result = await permissionService.hasPermission(userId, permissionName);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    const userId = '123';
    const permissionNames = ['read_users', 'write_users'];

    it('should return false for empty permission array', async () => {
      const result = await permissionService.hasAnyPermission(userId, []);

      expect(result).toBe(false);
    });

    it('should return false for non-array input', async () => {
      const result = await permissionService.hasAnyPermission(userId, 'not_array' as any);

      expect(result).toBe(false);
    });

    it('should return true when user has any of the permissions', async () => {
      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 1, name: 'read_users', code: 'read_users' }
      ]);

      const result = await permissionService.hasAnyPermission(userId, permissionNames);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 3, name: 'admin_users', code: 'admin_users' }
      ]);

      const result = await permissionService.hasAnyPermission(userId, permissionNames);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      permissionService.getUserPermissions = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await permissionService.hasAnyPermission(userId, permissionNames);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    const userId = '123';
    const permissionNames = ['read_users', 'write_users'];

    it('should return true for empty permission array', async () => {
      const result = await permissionService.hasAllPermissions(userId, []);

      expect(result).toBe(true);
    });

    it('should return true when user has all permissions', async () => {
      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 1, name: 'read_users', code: 'read_users' },
        { id: 2, name: 'write_users', code: 'write_users' },
        { id: 3, name: 'admin_users', code: 'admin_users' }
      ]);

      const result = await permissionService.hasAllPermissions(userId, permissionNames);

      expect(result).toBe(true);
    });

    it('should return false when user is missing some permissions', async () => {
      permissionService.getUserPermissions = jest.fn().mockResolvedValue([
        { id: 1, name: 'read_users', code: 'read_users' }
      ]);

      const result = await permissionService.hasAllPermissions(userId, permissionNames);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      permissionService.getUserPermissions = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await permissionService.hasAllPermissions(userId, permissionNames);

      expect(result).toBe(false);
    });
  });

  describe('bulkPermissionCheck', () => {
    const userIds = ['123', '456'];

    it('should check single permission for multiple users', async () => {
      permissionService.hasPermission = jest.fn()
        .mockResolvedValueOnce(true)  // user 123
        .mockResolvedValueOnce(false); // user 456

      const result = await permissionService.bulkPermissionCheck(userIds, 'read_users');

      expect(result).toEqual({
        '123': true,
        '456': false
      });
    });

    it('should check multiple permissions for multiple users', async () => {
      permissionService.hasAllPermissions = jest.fn()
        .mockResolvedValueOnce(true)  // user 123
        .mockResolvedValueOnce(false); // user 456

      const result = await permissionService.bulkPermissionCheck(userIds, ['read_users', 'write_users']);

      expect(result).toEqual({
        '123': true,
        '456': false
      });
    });

    it('should return all false on error', async () => {
      permissionService.hasPermission = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await permissionService.bulkPermissionCheck(userIds, 'read_users');

      expect(result).toEqual({
        '123': false,
        '456': false
      });
    });
  });

  describe('getPermissionsByCategory', () => {
    const mockPermissions = [
      { id: 1, name: 'read_users', category: 'users' },
      { id: 2, name: 'write_users', category: 'users' },
      { id: 3, name: 'read_games', category: 'games' }
    ];

    it('should return cached permissions when available', async () => {
      const expected = {
        users: [mockPermissions[0], mockPermissions[1]],
        games: [mockPermissions[2]]
      };

      permissionService.permissionCache.set('permissions_by_category', {
        data: expected,
        timestamp: Date.now()
      });

      const result = await permissionService.getPermissionsByCategory();

      expect(result).toEqual(expected);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it('should query and group permissions by category', async () => {
      mockSelect.mockResolvedValueOnce(mockPermissions);

      const result = await permissionService.getPermissionsByCategory();

      expect(result).toEqual({
        users: [mockPermissions[0], mockPermissions[1]],
        games: [mockPermissions[2]]
      });
      expect(mockOrderBy).toHaveBeenCalledWith('category', 'asc');
      expect(mockOrderBy).toHaveBeenCalledWith('name', 'asc');
    });

    it('should handle permissions without category', async () => {
      const permissionsWithoutCategory = [
        { id: 1, name: 'test', category: null }
      ];

      mockSelect.mockResolvedValueOnce(permissionsWithoutCategory);

      const result = await permissionService.getPermissionsByCategory();

      expect(result).toEqual({
        uncategorized: [permissionsWithoutCategory[0]]
      });
    });

    it('should bypass cache when useCache is false', async () => {
      permissionService.permissionCache.set('permissions_by_category', {
        data: {},
        timestamp: Date.now()
      });

      mockSelect.mockResolvedValueOnce(mockPermissions);

      const result = await permissionService.getPermissionsByCategory({ useCache: false });

      expect(mockDb).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockSelect.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.getPermissionsByCategory())
        .rejects.toThrow('Failed to get permissions by category: Database error');
    });
  });

  describe('searchPermissions', () => {
    it('should return empty array for empty query', async () => {
      const result = await permissionService.searchPermissions('');

      expect(result).toEqual([]);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it('should search permissions by name, description, and code', async () => {
      const mockResults = [{ id: 1, name: 'read_users' }];
      mockSelect.mockResolvedValueOnce(mockResults);

      const result = await permissionService.searchPermissions('user');

      expect(result).toEqual(mockResults);
      expect(mockWhere).toHaveBeenCalled();
      expect(mockOrWhere).toHaveBeenCalled();
    });

    it('should filter by category when provided', async () => {
      const mockResults = [{ id: 1, name: 'read_users' }];
      mockSelect.mockResolvedValueOnce(mockResults);

      await permissionService.searchPermissions('user', { category: 'users' });

      expect(mockWhere).toHaveBeenCalledWith('category', 'users');
    });

    it('should apply limit when provided', async () => {
      const mockResults = [{ id: 1, name: 'read_users' }];
      mockSelect.mockResolvedValueOnce(mockResults);

      await permissionService.searchPermissions('user', { limit: 10 });

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should handle database errors', async () => {
      mockSelect.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.searchPermissions('user'))
        .rejects.toThrow('Failed to search permissions: Database error');
    });
  });

  describe('getPermission', () => {
    it('should find permission by name', async () => {
      const mockPermission = { id: 1, name: 'read_users' };
      mockFirst.mockResolvedValueOnce(mockPermission);

      const result = await permissionService.getPermission('read_users');

      expect(result).toEqual(mockPermission);
      expect(mockWhere).toHaveBeenCalledWith('name', 'read_users');
    });

    it('should return null when permission not found', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      const result = await permissionService.getPermission('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.getPermission('test'))
        .rejects.toThrow('Failed to get permission: Database error');
    });
  });

  describe('createPermission', () => {
    const permissionData = {
      name: 'test_permission',
      code: 'test_code',
      description: 'Test permission',
      category: 'test'
    };

    it('should create a new permission', async () => {
      mockFirst.mockResolvedValueOnce(null); // No existing permission
      mockReturning.mockResolvedValueOnce([{ id: 1, ...permissionData }]);

      const result = await permissionService.createPermission(permissionData);

      expect(result).toEqual({ id: 1, ...permissionData });
      expect(mockInsert).toHaveBeenCalled();
      expect(permissionService.permissionCache.size).toBe(0); // Cache invalidated
    });

    it('should throw error if permission already exists', async () => {
      mockFirst.mockResolvedValueOnce({ id: 1, name: 'test_permission' });

      await expect(permissionService.createPermission(permissionData))
        .rejects.toThrow('Permission with name "test_permission" or code already exists');
    });

    it('should generate code from name if not provided', async () => {
      mockFirst.mockResolvedValueOnce(null);
      mockReturning.mockResolvedValueOnce([{ id: 1, ...permissionData }]);

      const dataWithoutCode = { ...permissionData };
      delete dataWithoutCode.code;

      await permissionService.createPermission(dataWithoutCode);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'test_permission'
        })
      );
    });

    it('should handle database errors', async () => {
      mockFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.createPermission(permissionData))
        .rejects.toThrow('Failed to create permission: Database error');
    });
  });

  describe('updatePermission', () => {
    const permissionId = '1';
    const updates = { name: 'updated_permission' };

    it('should update a permission', async () => {
      mockFirst.mockResolvedValueOnce({ id: 1, name: 'old_permission' }); // Existing permission
      mockFirst.mockResolvedValueOnce(null); // No duplicate
      mockReturning.mockResolvedValueOnce([{ id: 1, ...updates }]);

      const result = await permissionService.updatePermission(permissionId, updates);

      expect(result).toEqual({ id: 1, ...updates });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(Date)
        })
      );
    });

    it('should throw error if permission does not exist', async () => {
      mockFirst.mockResolvedValueOnce(null); // No existing permission

      await expect(permissionService.updatePermission(permissionId, updates))
        .rejects.toThrow('Permission with ID "1" not found');
    });

    it('should throw error if name/code already exists', async () => {
      mockFirst.mockResolvedValueOnce({ id: 1, name: 'old_permission' }); // Existing permission
      mockFirst.mockResolvedValueOnce({ id: 2, name: 'updated_permission' }); // Duplicate

      await expect(permissionService.updatePermission(permissionId, updates))
        .rejects.toThrow('Permission with this name or code already exists');
    });

    it('should handle database errors', async () => {
      mockFirst.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.updatePermission(permissionId, updates))
        .rejects.toThrow('Failed to update permission: Database error');
    });
  });

  describe('deletePermission', () => {
    const permissionId = '1';

    it('should delete a permission and its role associations', async () => {
      mockFirst.mockResolvedValueOnce({ id: 1, name: 'test_permission' }); // Existing permission
      mockDelete.mockResolvedValueOnce(1);

      const result = await permissionService.deletePermission(permissionId);

      expect(result).toBe(true);
      expect(mockCommit).toHaveBeenCalled();
      expect(permissionService.permissionCache.size).toBe(0); // Cache invalidated
      expect(permissionService.userPermissionsCache.size).toBe(0); // Cache invalidated
    });

    it('should throw error if permission does not exist', async () => {
      mockFirst.mockResolvedValueOnce(null); // No existing permission

      await expect(permissionService.deletePermission(permissionId))
        .rejects.toThrow('Permission with ID "1" not found');

      expect(mockRollback).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockFirst.mockResolvedValueOnce({ id: 1, name: 'test_permission' });
      mockDelete.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.deletePermission(permissionId))
        .rejects.toThrow('Failed to delete permission: Database error');

      expect(mockRollback).toHaveBeenCalled();
    });
  });

  describe('getAllPermissions', () => {
    it('should return paginated permissions', async () => {
      const mockPermissions = [
        { id: 1, name: 'perm1' },
        { id: 2, name: 'perm2' }
      ];

      mockCount.mockResolvedValueOnce([{ count: 2 }]);
      mockOffset.mockResolvedValueOnce(mockPermissions);

      const result = await permissionService.getAllPermissions({ page: 1, limit: 10 });

      expect(result).toEqual({
        permissions: mockPermissions,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('should filter by category', async () => {
      mockCount.mockResolvedValueOnce([{ count: 1 }]);
      mockOffset.mockResolvedValueOnce([]);

      await permissionService.getAllPermissions({ category: 'users' });

      expect(mockWhere).toHaveBeenCalledWith('category', 'users');
    });

    it('should filter by search term', async () => {
      mockCount.mockResolvedValueOnce([{ count: 1 }]);
      mockOffset.mockResolvedValueOnce([]);

      await permissionService.getAllPermissions({ search: 'user' });

      expect(mockWhere).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockCount.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.getAllPermissions())
        .rejects.toThrow('Failed to get permissions: Database error');
    });
  });

  describe('Role Permission Management', () => {
    describe('getRolePermissions', () => {
      it('should get permissions for a role', async () => {
        const mockPermissions = [{ id: 1, name: 'read_users' }];
        mockSelect.mockResolvedValueOnce(mockPermissions);

        const result = await permissionService.getRolePermissions('role_123');

        expect(result).toEqual(mockPermissions);
        expect(mockJoin).toHaveBeenCalledWith('role_permissions', 'permissions.id', 'role_permissions.permission_id');
        expect(mockWhere).toHaveBeenCalledWith('role_permissions.role_id', 'role_123');
      });

      it('should handle database errors', async () => {
        mockSelect.mockRejectedValueOnce(new Error('Database error'));

        await expect(permissionService.getRolePermissions('role_123'))
          .rejects.toThrow('Failed to get role permissions: Database error');
      });
    });

    describe('assignPermissionsToRole', () => {
      const roleId = 'role_123';
      const permissionIds = ['perm_1', 'perm_2'];

      it('should assign permissions to a role', async () => {
        mockFirst.mockResolvedValueOnce({ id: roleId, name: 'Test Role' }); // Role exists
        mockDelete.mockResolvedValueOnce(1); // Remove existing permissions
        mockInsert.mockResolvedValueOnce([]);
        mockSelect.mockResolvedValueOnce([{ id: 1, name: 'perm1' }]); // Return updated permissions

        const result = await permissionService.assignPermissionsToRole(roleId, permissionIds);

        expect(result).toEqual([{ id: 1, name: 'perm1' }]);
        expect(mockCommit).toHaveBeenCalled();
        expect(permissionService.userPermissionsCache.size).toBe(0); // Cache invalidated
      });

      it('should handle empty permission list', async () => {
        mockFirst.mockResolvedValueOnce({ id: roleId, name: 'Test Role' });
        mockDelete.mockResolvedValueOnce(1);
        mockSelect.mockResolvedValueOnce([]);

        const result = await permissionService.assignPermissionsToRole(roleId, []);

        expect(result).toEqual([]);
        expect(mockInsert).not.toHaveBeenCalled();
      });

      it('should throw error if role does not exist', async () => {
        mockFirst.mockResolvedValueOnce(null); // Role doesn't exist

        await expect(permissionService.assignPermissionsToRole(roleId, permissionIds))
          .rejects.toThrow('Role with ID "role_123" not found');

        expect(mockRollback).toHaveBeenCalled();
      });

      it('should rollback transaction on error', async () => {
        mockFirst.mockResolvedValueOnce({ id: roleId, name: 'Test Role' });
        mockDelete.mockRejectedValueOnce(new Error('Database error'));

        await expect(permissionService.assignPermissionsToRole(roleId, permissionIds))
          .rejects.toThrow('Failed to assign permissions to role: Database error');

        expect(mockRollback).toHaveBeenCalled();
      });
    });
  });

  describe('getCategories', () => {
    it('should return list of unique categories', async () => {
      const mockCategories = [
        { category: 'users' },
        { category: 'games' },
        { category: 'admin' }
      ];
      mockOrderBy.mockResolvedValueOnce(mockCategories);

      const result = await permissionService.getCategories();

      expect(result).toEqual(['users', 'games', 'admin']);
      expect(mockDistinct).toHaveBeenCalledWith('category');
    });

    it('should handle database errors', async () => {
      mockOrderBy.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.getCategories())
        .rejects.toThrow('Failed to get categories: Database error');
    });
  });

  describe('getUserPermissionsByCategory', () => {
    it('should group user permissions by category', async () => {
      const mockPermissions = [
        { id: 1, name: 'read_users', category: 'users' },
        { id: 2, name: 'write_users', category: 'users' },
        { id: 3, name: 'read_games', category: 'games' }
      ];

      permissionService.getUserPermissions = jest.fn().mockResolvedValue(mockPermissions);

      const result = await permissionService.getUserPermissionsByCategory('user_123');

      expect(result).toEqual({
        users: [mockPermissions[0], mockPermissions[1]],
        games: [mockPermissions[2]]
      });
    });

    it('should handle database errors', async () => {
      permissionService.getUserPermissions = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(permissionService.getUserPermissionsByCategory('user_123'))
        .rejects.toThrow('Failed to get user permissions by category: Database error');
    });
  });

  describe('getUserPermissionDetails', () => {
    it('should return detailed user permission info with roles', async () => {
      const mockDetails = [
        { id: 1, name: 'read_users', role_id: 1, role_name: 'Editor' },
        { id: 1, name: 'read_users', role_id: 2, role_name: 'Viewer' },
        { id: 2, name: 'write_users', role_id: 1, role_name: 'Editor' }
      ];
      mockSelect.mockResolvedValueOnce(mockDetails);

      const result = await permissionService.getUserPermissionDetails('user_123');

      expect(result).toHaveLength(2); // Two unique permissions
      expect(result[0]).toEqual({
        id: 1,
        name: 'read_users',
        roles: [
          { id: 1, name: 'Editor' },
          { id: 2, name: 'Viewer' }
        ]
      });
    });

    it('should handle database errors', async () => {
      mockSelect.mockRejectedValueOnce(new Error('Database error'));

      await expect(permissionService.getUserPermissionDetails('user_123'))
        .rejects.toThrow('Failed to get user permission details: Database error');
    });
  });
});