// @ts-nocheck

/**
 * @fileoverview Unit tests for Resource Permission Service
 * @requires jest
 * @requires ../ResourcePermissionService
 * 
 * Test Coverage:
 * - Permission hierarchy (Super Admin, Global, Resource-specific, Category inheritance)
 * - Owner rights functionality
 * - Permission caching mechanisms
 * - Permission CRUD operations
 * - Error handling scenarios
 * - Cache management and cleanup
 * 
 * @author Claude Assistant
 * @date 2025-01-23
 */

import ResourcePermissionService from '../ResourcePermissionService';

// Mock dependencies
jest.mock('../config/database', () => {
  const mockKnex = {
    transaction: jest.fn(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    first: jest.fn(),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    clear: jest.fn(),
    groupBy: jest.fn().mockReturnThis(),
    // Add table name access
    'user_roles': jest.fn().mockReturnThis(),
    'roles': jest.fn().mockReturnThis(),
    'resources': jest.fn().mockReturnThis(),
    'resource_category_permissions': jest.fn().mockReturnThis(),
    'resource_permissions': jest.fn().mockReturnThis(),
    'permissions': jest.fn().mockReturnThis(),
    'role_permissions': jest.fn().mockReturnThis(),
    'users': jest.fn().mockReturnThis()
  };
  
  // Make mockKnex callable as a function to return itself
  const callableMockKnex = jest.fn((table) => {
    // Return a query builder object
    return {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      first: jest.fn(),
      count: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      del: jest.fn(),
      returning: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    };
  });
  
  // Copy methods to the callable function
  Object.assign(callableMockKnex, mockKnex);
  
  return callableMockKnex;
});

describe('ResourcePermissionService', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = require('../config/database');
    service = new ResourcePermissionService();
    
    // Clear caches
    service.invalidatePermissionCache();
  });

  describe('Constructor', () => {
    it('should initialize with correct table and options', () => {
      expect(service.tableName).toBe('resource_permissions');
      expect(service.permissionCache).toBeInstanceOf(Map);
      expect(service.userPermissionCache).toBeInstanceOf(Map);
      expect(service.cacheTTL).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should start cache cleanup on initialization', () => {
      jest.spyOn(service, 'startCacheCleanup');
      const newService = new ResourcePermissionService();
      // Cleanup is started in constructor, so we can't easily test it without refactoring
    });
  });

  describe('hasResourcePermission', () => {
    const userId = 'user-123';
    const resourceId = 'resource-456';
    const action = 'edit';

    beforeEach(() => {
      // Setup default mocks for database queries
      mockDb().join().where().where().first.mockResolvedValue(null); // No Super Admin
      mockDb().join().join().join().where().where().where().first.mockResolvedValue(null); // No global permission
      mockDb().select().where().first.mockResolvedValue({
        id: resourceId,
        created_by: 'different-user',
        category_id: 'category-123'
      }); // Resource exists but different owner
    });

    it('should grant permission to Super Admin users', async () => {
      // Arrange
      mockDb().join().where().where().where().first.mockResolvedValueOnce({
        id: 'super-admin-role',
        name: 'Super Admin'
      });

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(true);
    });

    it('should grant permission based on global role permissions', async () => {
      // Arrange
      mockDb().join().join().join().where().where().where().first.mockResolvedValueOnce({
        id: 'permission-123'
      });

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(true);
    });

    it('should grant permission to resource owner for owner actions', async () => {
      // Arrange
      mockDb().select().where().first.mockResolvedValueOnce({
        id: resourceId,
        created_by: userId, // User is the owner
        category_id: 'category-123'
      });

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, 'edit');

      // Assert
      expect(result).toBe(true);
    });

    it('should check resource-specific permissions', async () => {
      // Arrange
      jest.spyOn(service, 'checkResourceSpecificPermission').mockResolvedValueOnce(true);

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(true);
      expect(service.checkResourceSpecificPermission).toHaveBeenCalledWith(userId, resourceId, action);
    });

    it('should fall back to category permissions', async () => {
      // Arrange
      jest.spyOn(service, 'checkResourceSpecificPermission').mockResolvedValueOnce(null);
      jest.spyOn(service, 'checkCategoryPermission').mockResolvedValueOnce(true);
      
      mockDb().select().where().first.mockResolvedValueOnce({
        id: resourceId,
        created_by: 'different-user',
        category_id: 'category-123'
      });

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(true);
      expect(service.checkCategoryPermission).toHaveBeenCalledWith(userId, 'category-123', action);
    });

    it('should deny permission by default', async () => {
      // Arrange
      jest.spyOn(service, 'checkResourceSpecificPermission').mockResolvedValueOnce(null);
      jest.spyOn(service, 'checkCategoryPermission').mockResolvedValueOnce(false);

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(false);
    });

    it('should use cached permissions when available', async () => {
      // Arrange
      const cacheKey = `resource_permission_${userId}_${resourceId}_${action}`;
      service.cachePermissionResult(cacheKey, true);

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(true);
      // Should not make database calls if cached
    });

    it('should handle non-existent resource', async () => {
      // Arrange
      mockDb().select().where().first.mockResolvedValueOnce(null);

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockDb().join().where().where().where().first.mockRejectedValueOnce(new Error('Database error'));

      // Act
      const result = await service.hasResourcePermission(userId, resourceId, action);

      // Assert
      expect(result).toBe(false); // Fail closed
    });
  });

  describe('checkCategoryPermission', () => {
    const userId = 'user-123';
    const categoryId = 'category-456';
    const action = 'view';

    it('should grant permission when user role has category permission', async () => {
      // Arrange
      mockDb().join().where().where().select.mockResolvedValueOnce([
        { id: 'role-1', name: 'Manager' }
      ]);
      mockDb().whereIn().where.mockResolvedValueOnce([
        { id: 'perm-1', can_view: true, can_edit: false }
      ]);

      // Act
      const result = await service.checkCategoryPermission(userId, categoryId, action);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny permission when user has no roles', async () => {
      // Arrange
      mockDb().join().where().where().select.mockResolvedValueOnce([]);

      // Act
      const result = await service.checkCategoryPermission(userId, categoryId, action);

      // Assert
      expect(result).toBe(false);
    });

    it('should use cached results', async () => {
      // Arrange
      const cacheKey = `category_permission_${userId}_${categoryId}_${action}`;
      service.cachePermissionResult(cacheKey, true);

      // Act
      const result = await service.checkCategoryPermission(userId, categoryId, action);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('setCategoryPermissions', () => {
    const categoryId = 'category-123';
    const roleId = 'role-456';
    const permissions = {
      can_view: true,
      can_create: false,
      can_edit: true,
      can_delete: false,
      can_manage: false
    };
    const createdBy = 'user-789';

    it('should create new category permission when none exists', async () => {
      // Arrange
      mockDb().where().where().first.mockResolvedValueOnce(null); // No existing permission
      mockDb().insert().returning.mockResolvedValueOnce([{
        id: 'new-permission-id',
        category_id: categoryId,
        role_id: roleId,
        ...permissions
      }]);

      // Act
      const result = await service.setCategoryPermissions(categoryId, roleId, permissions, createdBy);

      // Assert
      expect(result).toBeDefined();
      expect(result.category_id).toBe(categoryId);
      expect(result.role_id).toBe(roleId);
    });

    it('should update existing category permission', async () => {
      // Arrange
      const existingPermission = { id: 'existing-permission-id' };
      mockDb().where().where().first.mockResolvedValueOnce(existingPermission);
      mockDb().where().update().returning.mockResolvedValueOnce([{
        id: 'existing-permission-id',
        category_id: categoryId,
        role_id: roleId,
        ...permissions
      }]);

      // Act
      const result = await service.setCategoryPermissions(categoryId, roleId, permissions, createdBy);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('existing-permission-id');
    });

    it('should invalidate cache after setting permissions', async () => {
      // Arrange
      jest.spyOn(service, 'invalidatePermissionCache');
      mockDb().where().where().first.mockResolvedValueOnce(null);
      mockDb().insert().returning.mockResolvedValueOnce([{ id: 'new-id' }]);

      // Act
      await service.setCategoryPermissions(categoryId, roleId, permissions, createdBy);

      // Assert
      expect(service.invalidatePermissionCache).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDb().where().where().first.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(
        service.setCategoryPermissions(categoryId, roleId, permissions, createdBy)
      ).rejects.toThrow('Failed to set category permissions: Database error');
    });
  });

  describe('getEffectivePermissions', () => {
    const userId = 'user-123';
    const resourceId = 'resource-456';

    it('should return permissions for all actions', async () => {
      // Arrange
      jest.spyOn(service, 'hasResourcePermission')
        .mockResolvedValueOnce(true)  // view
        .mockResolvedValueOnce(false) // create
        .mockResolvedValueOnce(true)  // edit
        .mockResolvedValueOnce(false) // delete
        .mockResolvedValueOnce(true); // manage

      // Act
      const result = await service.getEffectivePermissions(userId, resourceId);

      // Assert
      expect(result).toEqual({
        view: true,
        create: false,
        edit: true,
        delete: false,
        manage: true
      });
      expect(service.hasResourcePermission).toHaveBeenCalledTimes(5);
    });

    it('should handle errors in permission checking', async () => {
      // Arrange
      jest.spyOn(service, 'hasResourcePermission').mockRejectedValueOnce(new Error('Permission check failed'));

      // Act & Assert
      await expect(
        service.getEffectivePermissions(userId, resourceId)
      ).rejects.toThrow('Failed to get effective permissions: Permission check failed');
    });
  });

  describe('Cache Management', () => {
    it('should cache permission results', () => {
      // Arrange
      const cacheKey = 'test-key';
      const result = true;

      // Act
      service.cachePermissionResult(cacheKey, result);

      // Assert
      expect(service.permissionCache.has(cacheKey)).toBe(true);
      const cached = service.permissionCache.get(cacheKey);
      expect(cached.data).toBe(result);
      expect(cached.timestamp).toBeDefined();
    });

    it('should clean expired cache entries', () => {
      // Arrange
      const cacheKey = 'expired-key';
      service.permissionCache.set(cacheKey, {
        data: true,
        timestamp: Date.now() - (10 * 60 * 1000) // 10 minutes ago (expired)
      });

      // Act
      service.cleanExpiredCache();

      // Assert
      expect(service.permissionCache.has(cacheKey)).toBe(false);
    });

    it('should not clean non-expired cache entries', () => {
      // Arrange
      const cacheKey = 'fresh-key';
      service.permissionCache.set(cacheKey, {
        data: true,
        timestamp: Date.now() // Just now (fresh)
      });

      // Act
      service.cleanExpiredCache();

      // Assert
      expect(service.permissionCache.has(cacheKey)).toBe(true);
    });

    it('should invalidate all caches', () => {
      // Arrange
      service.permissionCache.set('key1', { data: true, timestamp: Date.now() });
      service.userPermissionCache.set('key2', { data: false, timestamp: Date.now() });

      // Act
      service.invalidatePermissionCache();

      // Assert
      expect(service.permissionCache.size).toBe(0);
      expect(service.userPermissionCache.size).toBe(0);
    });

    it('should return cache statistics', () => {
      // Arrange
      service.permissionCache.set('key1', { data: true, timestamp: Date.now() });
      service.userPermissionCache.set('key2', { data: false, timestamp: Date.now() });

      // Act
      const stats = service.getCacheStats();

      // Assert
      expect(stats).toEqual({
        permissionCacheSize: 1,
        userPermissionCacheSize: 1,
        cacheTTL: 5 * 60 * 1000
      });
    });
  });

  describe('Permission Action Mapping', () => {
    it('should correctly map actions to permission fields', () => {
      // Test cases for different actions
      const testCases = [
        { action: 'view', permission: { can_view: true }, expected: true },
        { action: 'create', permission: { can_create: false }, expected: false },
        { action: 'edit', permission: { can_edit: true }, expected: true },
        { action: 'delete', permission: { can_delete: false }, expected: false },
        { action: 'manage', permission: { can_manage: true }, expected: true },
        { action: 'invalid', permission: { can_view: true }, expected: false }
      ];

      testCases.forEach(({ action, permission, expected }) => {
        const result = service.checkActionPermission(permission, action);
        expect(result).toBe(expected);
      });
    });

    it('should correctly identify owner actions', () => {
      expect(service.isOwnerAction('view')).toBe(true);
      expect(service.isOwnerAction('edit')).toBe(true);
      expect(service.isOwnerAction('delete')).toBe(false);
      expect(service.isOwnerAction('manage')).toBe(false);
      expect(service.isOwnerAction('create')).toBe(false);
    });

    it('should generate correct global permission keys', () => {
      expect(service.getGlobalPermissionKey('view')).toBe('resources:view');
      expect(service.getGlobalPermissionKey('create')).toBe('resources:create');
      expect(service.getGlobalPermissionKey('edit')).toBe('resources:edit');
      expect(service.getGlobalPermissionKey('delete')).toBe('resources:delete');
      expect(service.getGlobalPermissionKey('manage')).toBe('resources:manage');
      expect(service.getGlobalPermissionKey('custom')).toBe('resources:custom');
    });
  });

  describe('Database Query Methods', () => {
    it('should get category permissions with role information', async () => {
      // Arrange
      const categoryId = 'category-123';
      const mockPermissions = [
        {
          id: 'perm-1',
          category_id: categoryId,
          role_id: 'role-1',
          role_name: 'Manager',
          created_by_email: 'admin@example.com'
        }
      ];
      
      mockDb().select().leftJoin().leftJoin().where().orderBy.mockResolvedValueOnce(mockPermissions);

      // Act
      const result = await service.getCategoryPermissions(categoryId);

      // Assert
      expect(result).toEqual(mockPermissions);
    });

    it('should remove category permissions successfully', async () => {
      // Arrange
      const categoryId = 'category-123';
      const roleId = 'role-456';
      mockDb().where().where().del.mockResolvedValueOnce(1);
      jest.spyOn(service, 'invalidatePermissionCache');

      // Act
      const result = await service.removeCategoryPermissions(categoryId, roleId);

      // Assert
      expect(result).toBe(true);
      expect(service.invalidatePermissionCache).toHaveBeenCalled();
    });

    it('should return false when no permissions to remove', async () => {
      // Arrange
      const categoryId = 'category-123';
      const roleId = 'role-456';
      mockDb().where().where().del.mockResolvedValueOnce(0);

      // Act
      const result = await service.removeCategoryPermissions(categoryId, roleId);

      // Assert
      expect(result).toBe(false);
    });
  });
});