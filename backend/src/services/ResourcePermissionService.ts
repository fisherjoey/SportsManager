// @ts-nocheck

/**
 * ResourcePermissionService - Service for managing resource-level permissions
 * 
 * This service provides comprehensive permission management functionality for resources including:
 * - Resource-specific permission checks
 * - Category-level permission checks
 * - Permission inheritance (category -> resource)
 * - Caching for performance optimization
 * - Integration with existing RBAC system
 */

import BaseService from './BaseService';
import db from '../config/database';

class ResourcePermissionService extends BaseService {
  constructor() {
    super('resource_permissions', db, {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc'
    });

    // Permission cache for performance
    this.permissionCache = new Map();
    this.userPermissionCache = new Map();
    
    // Cache TTL in milliseconds (5 minutes default)
    this.cacheTTL = 5 * 60 * 1000;
    
    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Start periodic cache cleanup
   * @private
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanExpiredCache();
    }, 10 * 60 * 1000); // Clean every 10 minutes
  }

  /**
   * Clean expired cache entries
   * @private
   */
  cleanExpiredCache() {
    const now = Date.now();
    
    // Clean permission cache
    for (const [key, value] of this.permissionCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.permissionCache.delete(key);
      }
    }

    // Clean user permission cache
    for (const [key, value] of this.userPermissionCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.userPermissionCache.delete(key);
      }
    }
  }

  /**
   * Check if a user has permission to perform an action on a resource
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {string} action - Action to check (view, create, edit, delete, manage)
   * @param {Object} options - Options for permission check
   * @returns {boolean} Has permission
   */
  async hasResourcePermission(userId, resourceId, action, options = {}) {
    try {
      // Cache key for this specific permission check
      const cacheKey = `resource_permission_${userId}_${resourceId}_${action}`;
      
      // Check cache first (unless explicitly disabled)
      if (options.useCache !== false && this.permissionCache.has(cacheKey)) {
        const cached = this.permissionCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.data;
        }
      }

      // 1. Super Admin bypasses all checks
      const superAdminRole = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.name', 'Super Admin')
        .where('roles.is_active', true)
        .first();

      if (superAdminRole) {
        this.cachePermissionResult(cacheKey, true);
        return true;
      }

      // 2. Check global role permissions
      const globalPermissionKey = this.getGlobalPermissionKey(action);
      const hasGlobalPermission = await this.checkGlobalPermission(userId, globalPermissionKey);
      if (hasGlobalPermission) {
        this.cachePermissionResult(cacheKey, true);
        return true;
      }

      // Get resource details
      const resource = await this.db('resources')
        .select('*')
        .where('id', resourceId)
        .first();

      if (!resource) {
        this.cachePermissionResult(cacheKey, false);
        return false;
      }

      // 3. Check if user created the resource (owner rights)
      if (resource.created_by === userId && this.isOwnerAction(action)) {
        this.cachePermissionResult(cacheKey, true);
        return true;
      }

      // 4. Check resource-specific permissions
      const hasResourceSpecificPermission = await this.checkResourceSpecificPermission(
        userId, resourceId, action
      );
      if (hasResourceSpecificPermission !== null) {
        this.cachePermissionResult(cacheKey, hasResourceSpecificPermission);
        return hasResourceSpecificPermission;
      }

      // 5. Check category-level permissions (inheritance)
      if (resource.category_id) {
        const hasCategoryPermission = await this.checkCategoryPermission(
          userId, resource.category_id, action
        );
        this.cachePermissionResult(cacheKey, hasCategoryPermission);
        return hasCategoryPermission;
      }

      // Default: no permission
      this.cachePermissionResult(cacheKey, false);
      return false;

    } catch (error) {
      console.error('Error checking resource permission:', error);
      return false; // Fail closed - deny permission on error
    }
  }

  /**
   * Check category-level permissions
   * @param {string} userId - User ID
   * @param {string} categoryId - Category ID
   * @param {string} action - Action to check
   * @returns {boolean} Has permission
   */
  async checkCategoryPermission(userId, categoryId, action) {
    try {
      const cacheKey = `category_permission_${userId}_${categoryId}_${action}`;
      
      // Check cache first
      if (this.permissionCache.has(cacheKey)) {
        const cached = this.permissionCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.data;
        }
      }

      // Get user roles
      const userRoles = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.is_active', true)
        .select('roles.id', 'roles.name');

      if (!userRoles.length) {
        this.cachePermissionResult(cacheKey, false);
        return false;
      }

      const roleIds = userRoles.map(role => role.id);

      // Check category permissions for user's roles
      const categoryPermissions = await this.db('resource_category_permissions')
        .whereIn('role_id', roleIds)
        .where('category_id', categoryId);

      // Check if any role has the required permission
      const hasPermission = categoryPermissions.some(permission => {
        return this.checkActionPermission(permission, action);
      });

      this.cachePermissionResult(cacheKey, hasPermission);
      return hasPermission;

    } catch (error) {
      console.error('Error checking category permission:', error);
      return false;
    }
  }

  /**
   * Check resource-specific permissions
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {string} action - Action to check
   * @returns {boolean|null} Permission result or null if no specific permission exists
   */
  async checkResourceSpecificPermission(userId, resourceId, action) {
    try {
      // Get user roles
      const userRoles = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.is_active', true)
        .select('roles.id');

      if (!userRoles.length) {
        return null;
      }

      const roleIds = userRoles.map(role => role.id);

      // Check resource-specific permissions
      const resourcePermissions = await this.db('resource_permissions')
        .whereIn('role_id', roleIds)
        .where('resource_id', resourceId);

      if (!resourcePermissions.length) {
        return null; // No specific permissions set
      }

      // Check if any role has the required permission
      const hasPermission = resourcePermissions.some(permission => {
        return this.checkActionPermission(permission, action);
      });

      return hasPermission;

    } catch (error) {
      console.error('Error checking resource specific permission:', error);
      return null;
    }
  }

  /**
   * Check global role permissions
   * @param {string} userId - User ID
   * @param {string} permissionKey - Permission key to check
   * @returns {boolean} Has global permission
   */
  async checkGlobalPermission(userId, permissionKey) {
    try {
      const permissions = await this.db('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .join('roles', 'role_permissions.role_id', 'roles.id')
        .join('user_roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', userId)
        .where('roles.is_active', true)
        .where('permissions.code', permissionKey)
        .first();

      return !!permissions;
    } catch (error) {
      console.error('Error checking global permission:', error);
      return false;
    }
  }

  /**
   * Check if action is allowed based on permission flags
   * @param {Object} permission - Permission object with boolean flags
   * @param {string} action - Action to check
   * @returns {boolean} Action is allowed
   */
  checkActionPermission(permission, action) {
    const actionMap = {
      'view': 'can_view',
      'create': 'can_create',
      'edit': 'can_edit',
      'delete': 'can_delete',
      'manage': 'can_manage'
    };

    const permissionField = actionMap[action];
    if (!permissionField) {
      return false;
    }

    return permission[permissionField] === true;
  }

  /**
   * Get global permission key for action
   * @param {string} action - Action name
   * @returns {string} Global permission key
   */
  getGlobalPermissionKey(action) {
    const actionMap = {
      'view': 'resources:view',
      'create': 'resources:create',
      'edit': 'resources:edit',
      'delete': 'resources:delete',
      'manage': 'resources:manage'
    };

    return actionMap[action] || `resources:${action}`;
  }

  /**
   * Check if action is an owner action (actions owners can perform)
   * @param {string} action - Action to check
   * @returns {boolean} Is owner action
   */
  isOwnerAction(action) {
    const ownerActions = ['view', 'edit'];
    return ownerActions.includes(action);
  }

  /**
   * Cache permission result
   * @param {string} cacheKey - Cache key
   * @param {boolean} result - Permission result
   * @private
   */
  cachePermissionResult(cacheKey, result) {
    this.permissionCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
  }

  /**
   * Set category permissions for a role
   * @param {string} categoryId - Category ID
   * @param {string} roleId - Role ID
   * @param {Object} permissions - Permission flags
   * @param {string} createdBy - User ID who created the permission
   * @returns {Object} Created permission record
   */
  async setCategoryPermissions(categoryId, roleId, permissions, createdBy) {
    try {
      const permissionData = {
        category_id: categoryId,
        role_id: roleId,
        can_view: permissions.can_view || false,
        can_create: permissions.can_create || false,
        can_edit: permissions.can_edit || false,
        can_delete: permissions.can_delete || false,
        can_manage: permissions.can_manage || false,
        created_by: createdBy
      };

      // Check if permission already exists
      const existing = await this.db('resource_category_permissions')
        .where('category_id', categoryId)
        .where('role_id', roleId)
        .first();

      let result;
      if (existing) {
        // Update existing
        [result] = await this.db('resource_category_permissions')
          .where('id', existing.id)
          .update(permissionData)
          .returning('*');
      } else {
        // Create new
        [result] = await this.db('resource_category_permissions')
          .insert(permissionData)
          .returning('*');
      }

      // Invalidate related caches
      this.invalidatePermissionCache();

      return result;
    } catch (error) {
      console.error('Error setting category permissions:', error);
      throw new Error(`Failed to set category permissions: ${error.message}`);
    }
  }

  /**
   * Set resource permissions for a role
   * @param {string} resourceId - Resource ID
   * @param {string} roleId - Role ID
   * @param {Object} permissions - Permission flags
   * @param {string} createdBy - User ID who created the permission
   * @returns {Object} Created permission record
   */
  async setResourcePermissions(resourceId, roleId, permissions, createdBy) {
    try {
      const permissionData = {
        resource_id: resourceId,
        role_id: roleId,
        can_view: permissions.can_view || false,
        can_edit: permissions.can_edit || false,
        can_delete: permissions.can_delete || false,
        can_manage: permissions.can_manage || false,
        created_by: createdBy
      };

      // Check if permission already exists
      const existing = await this.db('resource_permissions')
        .where('resource_id', resourceId)
        .where('role_id', roleId)
        .first();

      let result;
      if (existing) {
        // Update existing
        [result] = await this.db('resource_permissions')
          .where('id', existing.id)
          .update(permissionData)
          .returning('*');
      } else {
        // Create new
        [result] = await this.db('resource_permissions')
          .insert(permissionData)
          .returning('*');
      }

      // Invalidate related caches
      this.invalidatePermissionCache();

      return result;
    } catch (error) {
      console.error('Error setting resource permissions:', error);
      throw new Error(`Failed to set resource permissions: ${error.message}`);
    }
  }

  /**
   * Get category permissions for a role
   * @param {string} categoryId - Category ID
   * @param {string} roleId - Role ID (optional, gets all if not provided)
   * @returns {Array} Category permissions
   */
  async getCategoryPermissions(categoryId, roleId = null) {
    try {
      let query = this.db('resource_category_permissions')
        .select(
          'resource_category_permissions.*',
          'roles.name as role_name',
          'users.email as created_by_email'
        )
        .leftJoin('roles', 'resource_category_permissions.role_id', 'roles.id')
        .leftJoin('users', 'resource_category_permissions.created_by', 'users.id')
        .where('resource_category_permissions.category_id', categoryId)
        .orderBy('roles.name', 'asc');

      if (roleId) {
        query = query.where('resource_category_permissions.role_id', roleId);
      }

      return await query;
    } catch (error) {
      console.error('Error getting category permissions:', error);
      throw new Error(`Failed to get category permissions: ${error.message}`);
    }
  }

  /**
   * Get resource permissions for a role
   * @param {string} resourceId - Resource ID
   * @param {string} roleId - Role ID (optional, gets all if not provided)
   * @returns {Array} Resource permissions
   */
  async getResourcePermissions(resourceId, roleId = null) {
    try {
      let query = this.db('resource_permissions')
        .select(
          'resource_permissions.*',
          'roles.name as role_name',
          'users.email as created_by_email'
        )
        .leftJoin('roles', 'resource_permissions.role_id', 'roles.id')
        .leftJoin('users', 'resource_permissions.created_by', 'users.id')
        .where('resource_permissions.resource_id', resourceId)
        .orderBy('roles.name', 'asc');

      if (roleId) {
        query = query.where('resource_permissions.role_id', roleId);
      }

      return await query;
    } catch (error) {
      console.error('Error getting resource permissions:', error);
      throw new Error(`Failed to get resource permissions: ${error.message}`);
    }
  }

  /**
   * Remove category permissions
   * @param {string} categoryId - Category ID
   * @param {string} roleId - Role ID
   * @returns {boolean} Success
   */
  async removeCategoryPermissions(categoryId, roleId) {
    try {
      const deleted = await this.db('resource_category_permissions')
        .where('category_id', categoryId)
        .where('role_id', roleId)
        .del();

      // Invalidate caches
      this.invalidatePermissionCache();

      return deleted > 0;
    } catch (error) {
      console.error('Error removing category permissions:', error);
      throw new Error(`Failed to remove category permissions: ${error.message}`);
    }
  }

  /**
   * Remove resource permissions
   * @param {string} resourceId - Resource ID
   * @param {string} roleId - Role ID
   * @returns {boolean} Success
   */
  async removeResourcePermissions(resourceId, roleId) {
    try {
      const deleted = await this.db('resource_permissions')
        .where('resource_id', resourceId)
        .where('role_id', roleId)
        .del();

      // Invalidate caches
      this.invalidatePermissionCache();

      return deleted > 0;
    } catch (error) {
      console.error('Error removing resource permissions:', error);
      throw new Error(`Failed to remove resource permissions: ${error.message}`);
    }
  }

  /**
   * Get effective permissions for a user on a resource (combines all sources)
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @returns {Object} Effective permissions
   */
  async getEffectivePermissions(userId, resourceId) {
    try {
      const actions = ['view', 'create', 'edit', 'delete', 'manage'];
      const permissions = {};

      for (const action of actions) {
        permissions[action] = await this.hasResourcePermission(userId, resourceId, action);
      }

      return permissions;
    } catch (error) {
      console.error('Error getting effective permissions:', error);
      throw new Error(`Failed to get effective permissions: ${error.message}`);
    }
  }

  /**
   * Invalidate permission cache
   */
  invalidatePermissionCache() {
    this.permissionCache.clear();
    this.userPermissionCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      permissionCacheSize: this.permissionCache.size,
      userPermissionCacheSize: this.userPermissionCache.size,
      cacheTTL: this.cacheTTL
    };
  }
}

export default ResourcePermissionService;