/**
 * PermissionService - Service for managing user permissions with caching
 * 
 * This service provides comprehensive permission management functionality including:
 * - User permission retrieval with caching
 * - Permission checking and validation
 * - Permission grouping by category
 * - Bulk permission operations
 * - Cache invalidation strategies
 */

const BaseService = require('./BaseService');
const db = require('../config/database');

class PermissionService extends BaseService {
  constructor() {
    super('permissions', db, {
      defaultOrderBy: 'category',
      defaultOrderDirection: 'asc'
    });

    // In-memory cache for user permissions
    this.userPermissionsCache = new Map();
    this.permissionCache = new Map();
    
    // Cache TTL in milliseconds (5 minutes default)
    this.cacheTTL = 5 * 60 * 1000;
    
    // Clean cache every 10 minutes
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
    
    // Clean user permissions cache
    for (const [key, value] of this.userPermissionsCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.userPermissionsCache.delete(key);
      }
    }

    // Clean general permission cache
    for (const [key, value] of this.permissionCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Get user permissions with caching
   * @param {string} userId - User ID
   * @param {boolean} useCache - Whether to use cache (default: true)
   * @returns {Array} User permissions
   */
  async getUserPermissions(userId, useCache = true) {
    const cacheKey = `user_permissions_${userId}`;

    // Check cache first
    if (useCache && this.userPermissionsCache.has(cacheKey)) {
      const cached = this.userPermissionsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    try {
      // Get permissions through role assignments
      const permissions = await this.db('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .join('roles', 'role_permissions.role_id', 'roles.id')
        .join('user_roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', userId)
        .where('roles.is_active', true)
        .select('permissions.*')
        .distinct()
        .orderBy('permissions.category', 'asc')
        .orderBy('permissions.name', 'asc');

      // Cache the result
      if (useCache) {
        this.userPermissionsCache.set(cacheKey, {
          data: permissions,
          timestamp: Date.now()
        });
      }

      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw new Error(`Failed to get user permissions: ${error.message}`);
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} userId - User ID
   * @param {string} permissionName - Permission name or ID
   * @returns {boolean} Has permission
   */
  async hasPermission(userId, permissionName) {
    try {
      const permissions = await this.getUserPermissions(userId);
      
      // Check by name or ID
      return permissions.some(permission => 
        permission.name === permissionName || 
        permission.id === permissionName ||
        permission.code === permissionName
      );
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false; // Fail closed - deny permission on error
    }
  }

  /**
   * Check if user has any of the specified permissions
   * @param {string} userId - User ID
   * @param {Array} permissionNames - Array of permission names/IDs
   * @returns {boolean} Has any permission
   */
  async hasAnyPermission(userId, permissionNames) {
    try {
      if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
        return false;
      }

      const permissions = await this.getUserPermissions(userId);
      
      return permissionNames.some(permissionName =>
        permissions.some(permission => 
          permission.name === permissionName || 
          permission.id === permissionName ||
          permission.code === permissionName
        )
      );
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false; // Fail closed - deny permission on error
    }
  }

  /**
   * Check if user has all specified permissions
   * @param {string} userId - User ID
   * @param {Array} permissionNames - Array of permission names/IDs
   * @returns {boolean} Has all permissions
   */
  async hasAllPermissions(userId, permissionNames) {
    try {
      if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
        return true;
      }

      const permissions = await this.getUserPermissions(userId);
      
      return permissionNames.every(permissionName =>
        permissions.some(permission => 
          permission.name === permissionName || 
          permission.id === permissionName ||
          permission.code === permissionName
        )
      );
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false; // Fail closed - deny permission on error
    }
  }

  /**
   * Bulk permission check for multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {string|Array} permissionNames - Permission name(s)
   * @returns {Object} Map of userId to permission status
   */
  async bulkPermissionCheck(userIds, permissionNames) {
    const results = {};
    const permissions = Array.isArray(permissionNames) ? permissionNames : [permissionNames];

    try {
      // Use Promise.all for parallel processing
      const checks = userIds.map(async (userId) => {
        const hasPerms = Array.isArray(permissionNames)
          ? await this.hasAllPermissions(userId, permissions)
          : await this.hasPermission(userId, permissionNames);
        
        return { userId, hasPermissions: hasPerms };
      });

      const checkResults = await Promise.all(checks);
      
      // Convert to object format
      checkResults.forEach(({ userId, hasPermissions }) => {
        results[userId] = hasPermissions;
      });

      return results;
    } catch (error) {
      console.error('Error in bulk permission check:', error);
      // Return all false for safety
      userIds.forEach(userId => {
        results[userId] = false;
      });
      return results;
    }
  }

  /**
   * Get permissions organized by category
   * @param {Object} options - Query options
   * @returns {Object} Permissions grouped by category
   */
  async getPermissionsByCategory(options = {}) {
    const cacheKey = 'permissions_by_category';

    // Check cache first
    if (options.useCache !== false && this.permissionCache.has(cacheKey)) {
      const cached = this.permissionCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    try {
      let query = this.db('permissions')
        .select('*')
        .orderBy('category', 'asc')
        .orderBy('name', 'asc');

      if (options.activeOnly !== false) {
        query = query.where('active', true);
      }

      const permissions = await query;

      // Group by category
      const permissionsByCategory = permissions.reduce((acc, permission) => {
        const category = permission.category || 'uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
      }, {});

      // Cache the result
      if (options.useCache !== false) {
        this.permissionCache.set(cacheKey, {
          data: permissionsByCategory,
          timestamp: Date.now()
        });
      }

      return permissionsByCategory;
    } catch (error) {
      console.error('Error getting permissions by category:', error);
      throw new Error(`Failed to get permissions by category: ${error.message}`);
    }
  }

  /**
   * Get user permissions organized by category
   * @param {string} userId - User ID
   * @returns {Object} User permissions grouped by category
   */
  async getUserPermissionsByCategory(userId) {
    try {
      const permissions = await this.getUserPermissions(userId);

      // Group by category
      const permissionsByCategory = permissions.reduce((acc, permission) => {
        const category = permission.category || 'uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
      }, {});

      return permissionsByCategory;
    } catch (error) {
      console.error('Error getting user permissions by category:', error);
      throw new Error(`Failed to get user permissions by category: ${error.message}`);
    }
  }

  /**
   * Search permissions by name or description
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Matching permissions
   */
  async searchPermissions(query, options = {}) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = `%${query.trim().toLowerCase()}%`;

      let dbQuery = this.db('permissions')
        .where(function() {
          this.where(this.db.raw('LOWER(name)'), 'LIKE', searchTerm)
              .orWhere(this.db.raw('LOWER(description)'), 'LIKE', searchTerm)
              .orWhere(this.db.raw('LOWER(code)'), 'LIKE', searchTerm);
        })
        .orderBy('name', 'asc');

      if (options.category) {
        dbQuery = dbQuery.where('category', options.category);
      }

      if (options.activeOnly !== false) {
        dbQuery = dbQuery.where('active', true);
      }

      if (options.limit) {
        dbQuery = dbQuery.limit(options.limit);
      }

      return await dbQuery;
    } catch (error) {
      console.error('Error searching permissions:', error);
      throw new Error(`Failed to search permissions: ${error.message}`);
    }
  }

  /**
   * Invalidate user permission cache
   * @param {string} userId - User ID (optional, clears all if not provided)
   */
  invalidateUserCache(userId = null) {
    if (userId) {
      const cacheKey = `user_permissions_${userId}`;
      this.userPermissionsCache.delete(cacheKey);
    } else {
      this.userPermissionsCache.clear();
    }
  }

  /**
   * Invalidate permission cache
   */
  invalidatePermissionCache() {
    this.permissionCache.clear();
  }

  /**
   * Invalidate all caches
   */
  invalidateAllCaches() {
    this.invalidateUserCache();
    this.invalidatePermissionCache();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      userPermissionsCacheSize: this.userPermissionsCache.size,
      permissionCacheSize: this.permissionCache.size,
      cacheTTL: this.cacheTTL,
      maxAge: Math.max(
        ...Array.from(this.userPermissionsCache.values()).map(v => Date.now() - v.timestamp),
        ...Array.from(this.permissionCache.values()).map(v => Date.now() - v.timestamp)
      )
    };
  }

  /**
   * Get detailed user permission info with roles
   * @param {string} userId - User ID
   * @returns {Object} Detailed permission information
   */
  async getUserPermissionDetails(userId) {
    try {
      const permissionDetails = await this.db('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .join('roles', 'role_permissions.role_id', 'roles.id')
        .join('user_roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', userId)
        .where('roles.is_active', true)
        .select(
          'permissions.*',
          'roles.name as role_name',
          'roles.id as role_id'
        )
        .orderBy('permissions.category', 'asc')
        .orderBy('permissions.name', 'asc');

      // Group permissions with their granting roles
      const permissionMap = new Map();
      
      permissionDetails.forEach(detail => {
        const permKey = detail.id;
        if (!permissionMap.has(permKey)) {
          permissionMap.set(permKey, {
            ...detail,
            roles: []
          });
          delete permissionMap.get(permKey).role_name;
          delete permissionMap.get(permKey).role_id;
        }
        
        permissionMap.get(permKey).roles.push({
          id: detail.role_id,
          name: detail.role_name
        });
      });

      return Array.from(permissionMap.values());
    } catch (error) {
      console.error('Error getting user permission details:', error);
      throw new Error(`Failed to get user permission details: ${error.message}`);
    }
  }

  /**
   * Check if permission exists
   * @param {string} permissionName - Permission name, code, or ID
   * @returns {Object|null} Permission if exists
   */
  async getPermission(permissionName) {
    try {
      const permission = await this.db('permissions')
        .where('name', permissionName)
        .orWhere('code', permissionName)
        .orWhere('id', permissionName)
        .first();

      return permission || null;
    } catch (error) {
      console.error('Error getting permission:', error);
      throw new Error(`Failed to get permission: ${error.message}`);
    }
  }
}

module.exports = PermissionService;