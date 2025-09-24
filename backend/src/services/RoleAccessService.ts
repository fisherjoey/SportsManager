// @ts-nocheck

/**
 * @fileoverview Role Access Service
 * 
 * Manages database-driven access control for:
 * - Page/view access
 * - API endpoint access
 * - Feature flags
 * - Data scopes
 * 
 * All access control is now database-driven, removing hardcoded permissions
 */

import db from '../config/database';
import { createAuditLog, AUDIT_EVENTS  } from '../middleware/auditTrail';
import CacheService from './CacheService';

class RoleAccessService {
  constructor() {
    this.cachePrefix = 'role_access:';
    this.cacheTTL = 300; // 5 minutes
  }

  /**
   * Get all page access settings for a role
   */
  async getPageAccess(roleId) {
    try {
      const cacheKey = `${this.cachePrefix}pages:${roleId}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) return cached;

      const pageAccess = await db('role_page_access')
        .where('role_id', roleId)
        .select('page_path', 'page_name', 'page_category', 'page_description', 'can_access', 'conditions')
        .orderBy('page_category', 'asc')
        .orderBy('page_name', 'asc');

      await CacheService.set(cacheKey, pageAccess, this.cacheTTL);
      return pageAccess;
    } catch (error) {
      console.error('Error getting page access:', error);
      throw error;
    }
  }

  /**
   * Set page access for a role (bulk update)
   */
  async setPageAccess(roleId, pageAccessList, userId) {
    const trx = await db.transaction();

    try {
      // Delete existing page access for this role
      await trx('role_page_access')
        .where('role_id', roleId)
        .delete();

      // Insert new page access settings
      if (pageAccessList && pageAccessList.length > 0) {
        const records = pageAccessList.map(access => ({
          role_id: roleId,
          page_path: access.page_path,
          page_name: access.page_name,
          page_category: access.page_category,
          page_description: access.page_description,
          can_access: access.can_access,
          conditions: access.conditions ? JSON.stringify(access.conditions) : null
        }));

        await trx('role_page_access').insert(records);
      }

      // Create audit log
      await trx('access_control_audit').insert({
        user_id: userId,
        action_type: 'modify',
        resource_type: 'page',
        role_id: roleId,
        new_value: JSON.stringify(pageAccessList),
        reason: 'Bulk update page access'
      });

      await trx.commit();

      // Clear cache
      await this.clearRoleCache(roleId);

      return { success: true, message: 'Page access updated successfully' };
    } catch (error) {
      await trx.rollback();
      console.error('Error setting page access:', error);
      throw error;
    }
  }

  /**
   * Get all API access settings for a role
   */
  async getApiAccess(roleId) {
    try {
      const cacheKey = `${this.cachePrefix}apis:${roleId}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) return cached;

      const apiAccess = await db('role_api_access')
        .where('role_id', roleId)
        .select('http_method', 'endpoint_pattern', 'endpoint_category', 'endpoint_description', 'can_access', 'rate_limit', 'conditions')
        .orderBy('endpoint_category', 'asc')
        .orderBy('endpoint_pattern', 'asc');

      await CacheService.set(cacheKey, apiAccess, this.cacheTTL);
      return apiAccess;
    } catch (error) {
      console.error('Error getting API access:', error);
      throw error;
    }
  }

  /**
   * Set API access for a role (bulk update)
   */
  async setApiAccess(roleId, apiAccessList, userId) {
    const trx = await db.transaction();

    try {
      // Delete existing API access for this role
      await trx('role_api_access')
        .where('role_id', roleId)
        .delete();

      // Insert new API access settings
      if (apiAccessList && apiAccessList.length > 0) {
        const records = apiAccessList.map(access => ({
          role_id: roleId,
          http_method: access.http_method,
          endpoint_pattern: access.endpoint_pattern,
          endpoint_category: access.endpoint_category,
          endpoint_description: access.endpoint_description,
          can_access: access.can_access,
          rate_limit: access.rate_limit,
          conditions: access.conditions ? JSON.stringify(access.conditions) : null
        }));

        await trx('role_api_access').insert(records);
      }

      // Create audit log
      await trx('access_control_audit').insert({
        user_id: userId,
        action_type: 'modify',
        resource_type: 'api',
        role_id: roleId,
        new_value: JSON.stringify(apiAccessList),
        reason: 'Bulk update API access'
      });

      await trx.commit();

      // Clear cache
      await this.clearRoleCache(roleId);

      return { success: true, message: 'API access updated successfully' };
    } catch (error) {
      await trx.rollback();
      console.error('Error setting API access:', error);
      throw error;
    }
  }

  /**
   * Get feature flags for a role
   */
  async getFeatures(roleId) {
    try {
      const cacheKey = `${this.cachePrefix}features:${roleId}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) return cached;

      const features = await db('role_features')
        .where('role_id', roleId)
        .select('feature_code', 'feature_name', 'feature_category', 'feature_description', 'is_enabled', 'configuration')
        .orderBy('feature_category', 'asc')
        .orderBy('feature_name', 'asc');

      await CacheService.set(cacheKey, features, this.cacheTTL);
      return features;
    } catch (error) {
      console.error('Error getting features:', error);
      throw error;
    }
  }

  /**
   * Set feature flags for a role
   */
  async setFeatures(roleId, featureList, userId) {
    const trx = await db.transaction();

    try {
      // Delete existing features for this role
      await trx('role_features')
        .where('role_id', roleId)
        .delete();

      // Insert new feature settings
      if (featureList && featureList.length > 0) {
        const records = featureList.map(feature => ({
          role_id: roleId,
          feature_code: feature.feature_code,
          feature_name: feature.feature_name,
          feature_category: feature.feature_category,
          feature_description: feature.feature_description,
          is_enabled: feature.is_enabled,
          configuration: feature.configuration ? JSON.stringify(feature.configuration) : null
        }));

        await trx('role_features').insert(records);
      }

      // Create audit log
      await trx('access_control_audit').insert({
        user_id: userId,
        action_type: 'modify',
        resource_type: 'feature',
        role_id: roleId,
        new_value: JSON.stringify(featureList),
        reason: 'Update feature flags'
      });

      await trx.commit();

      // Clear cache
      await this.clearRoleCache(roleId);

      return { success: true, message: 'Features updated successfully' };
    } catch (error) {
      await trx.rollback();
      console.error('Error setting features:', error);
      throw error;
    }
  }

  /**
   * Get data scopes for a role
   */
  async getDataScopes(roleId) {
    try {
      const cacheKey = `${this.cachePrefix}scopes:${roleId}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) return cached;

      const scopes = await db('role_data_scopes')
        .where('role_id', roleId)
        .where('is_active', true)
        .select('entity_type', 'scope_type', 'conditions', 'description')
        .orderBy('entity_type', 'asc');

      await CacheService.set(cacheKey, scopes, this.cacheTTL);
      return scopes;
    } catch (error) {
      console.error('Error getting data scopes:', error);
      throw error;
    }
  }

  /**
   * Check if a user can access a specific page
   */
  async checkPageAccess(userId, pagePath) {
    try {
      const cacheKey = `${this.cachePrefix}user_page:${userId}:${pagePath}`;
      const cached = await CacheService.get(cacheKey);
      if (cached !== null) return cached;

      // Get user's roles
      const userRoles = await db('user_roles')
        .where('user_id', userId)
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('roles.is_active', true)
        .select('roles.id', 'roles.name');

      if (!userRoles || userRoles.length === 0) {
        await CacheService.set(cacheKey, false, this.cacheTTL);
        return false;
      }

      // Check if any of the user's roles have access to this page
      const roleIds = userRoles.map(r => r.id);
      const access = await db('role_page_access')
        .whereIn('role_id', roleIds)
        .where('page_path', pagePath)
        .where('can_access', true)
        .first();

      const hasAccess = !!access;
      await CacheService.set(cacheKey, hasAccess, this.cacheTTL);
      return hasAccess;
    } catch (error) {
      console.error('Error checking page access:', error);
      return false; // Fail closed
    }
  }

  /**
   * Check if a user can access a specific API endpoint
   */
  async checkApiAccess(userId, method, endpoint) {
    try {
      const cacheKey = `${this.cachePrefix}user_api:${userId}:${method}:${endpoint}`;
      const cached = await CacheService.get(cacheKey);
      if (cached !== null) return cached;

      // Get user's roles
      const userRoles = await db('user_roles')
        .where('user_id', userId)
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('roles.is_active', true)
        .select('roles.id', 'roles.name');

      if (!userRoles || userRoles.length === 0) {
        await CacheService.set(cacheKey, false, this.cacheTTL);
        return false;
      }

      // Check if any of the user's roles have access to this endpoint
      const roleIds = userRoles.map(r => r.id);
      
      // First check for exact match
      let access = await db('role_api_access')
        .whereIn('role_id', roleIds)
        .where('http_method', method)
        .where('endpoint_pattern', endpoint)
        .where('can_access', true)
        .first();

      // If no exact match, check for pattern match
      if (!access) {
        const patterns = await db('role_api_access')
          .whereIn('role_id', roleIds)
          .where('http_method', method)
          .where('can_access', true)
          .select('endpoint_pattern');

        for (const pattern of patterns) {
          // Convert pattern to regex (e.g., /api/users/:id -> /api/users/[^/]+)
          const regex = pattern.endpoint_pattern
            .replace(/:[^/]+/g, '[^/]+')
            .replace(/\*/g, '.*');
          
          if (new RegExp(`^${regex}$`).test(endpoint)) {
            access = pattern;
            break;
          }
        }
      }

      const hasAccess = !!access;
      await CacheService.set(cacheKey, hasAccess, this.cacheTTL);
      return hasAccess;
    } catch (error) {
      console.error('Error checking API access:', error);
      return false; // Fail closed
    }
  }

  /**
   * Check if a user has a specific feature enabled
   */
  async checkFeature(userId, featureCode) {
    try {
      const cacheKey = `${this.cachePrefix}user_feature:${userId}:${featureCode}`;
      const cached = await CacheService.get(cacheKey);
      if (cached !== null) return cached;

      // Get user's roles
      const userRoles = await db('user_roles')
        .where('user_id', userId)
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('roles.is_active', true)
        .select('roles.id');

      if (!userRoles || userRoles.length === 0) {
        await CacheService.set(cacheKey, false, this.cacheTTL);
        return false;
      }

      // Check if any of the user's roles have this feature enabled
      const roleIds = userRoles.map(r => r.id);
      const feature = await db('role_features')
        .whereIn('role_id', roleIds)
        .where('feature_code', featureCode)
        .where('is_enabled', true)
        .first();

      const isEnabled = !!feature;
      await CacheService.set(cacheKey, isEnabled, this.cacheTTL);
      return isEnabled;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false; // Fail closed
    }
  }

  /**
   * Get all available pages in the system
   */
  async getPageRegistry() {
    // This would normally come from a configuration or be dynamically discovered
    // For now, we'll return a static list that matches your application
    return [
      // Sports Management
      { path: 'dashboard', name: 'Dashboard', category: 'Sports Management', description: 'Main dashboard overview' },
      { path: 'leagues', name: 'League Management', category: 'Sports Management', description: 'Create and manage leagues' },
      { path: 'tournaments', name: 'Tournament Generator', category: 'Sports Management', description: 'Generate tournament brackets' },
      { path: 'games', name: 'Games', category: 'Sports Management', description: 'View and manage games' },
      { path: 'assigning', name: 'Game Assignment', category: 'Sports Management', description: 'Assign referees to games' },
      { path: 'ai-assignments', name: 'AI Assignments', category: 'Sports Management', description: 'Automated referee assignments' },
      { path: 'locations', name: 'Teams & Locations', category: 'Sports Management', description: 'Manage teams and venues' },
      { path: 'referees', name: 'Referees', category: 'Sports Management', description: 'Manage referee profiles' },
      { path: 'calendar', name: 'Calendar', category: 'Sports Management', description: 'View game calendar' },
      { path: 'communications', name: 'Communications', category: 'Sports Management', description: 'Send messages and notifications' },
      { path: 'resources', name: 'Resource Centre', category: 'Sports Management', description: 'Educational resources' },
      
      // Financial
      { path: 'financial-dashboard', name: 'Financial Dashboard', category: 'Financial', description: 'Financial overview' },
      { path: 'financial-receipts', name: 'Receipt Processing', category: 'Financial', description: 'Process expense receipts' },
      { path: 'financial-budgets', name: 'Budget Management', category: 'Financial', description: 'Manage budgets' },
      { path: 'financial-expenses', name: 'Expense Management', category: 'Financial', description: 'Track expenses' },
      { path: 'financial-expense-create', name: 'Create Expense', category: 'Financial', description: 'Submit new expenses' },
      { path: 'financial-expense-approvals', name: 'Expense Approvals', category: 'Financial', description: 'Approve pending expenses' },
      { path: 'financial-reports', name: 'Financial Reports', category: 'Financial', description: 'Generate financial reports' },
      
      // Organization
      { path: 'organization-dashboard', name: 'Organizational Dashboard', category: 'Organization', description: 'Organization overview' },
      { path: 'organization-employees', name: 'Employee Management', category: 'Organization', description: 'Manage employees' },
      { path: 'organization-assets', name: 'Asset Tracking', category: 'Organization', description: 'Track organizational assets' },
      { path: 'organization-documents', name: 'Document Repository', category: 'Organization', description: 'Manage documents' },
      { path: 'organization-compliance', name: 'Compliance Tracking', category: 'Organization', description: 'Track compliance' },
      
      // Analytics
      { path: 'analytics-dashboard', name: 'Analytics Dashboard', category: 'Analytics', description: 'View analytics and insights' },
      
      // Administration
      { path: 'admin-access-control', name: 'Access Control', category: 'Administration', description: 'Manage access control' },
      { path: 'admin-workflows', name: 'Workflow Management', category: 'Administration', description: 'Configure workflows' },
      { path: 'admin-security', name: 'Security & Audit', category: 'Administration', description: 'Security settings and audit logs' },
      { path: 'admin-settings', name: 'System Settings', category: 'Administration', description: 'System configuration' },
      
      // Account
      { path: 'profile', name: 'Profile', category: 'Account', description: 'User profile settings' },
      { path: 'organization-settings', name: 'Organization Settings', category: 'Account', description: 'Organization configuration' }
    ];
  }

  /**
   * Get all available API endpoints in the system
   */
  async getApiRegistry() {
    // This would normally be discovered from route definitions
    // For now, return a representative list
    return [
      // Games
      { method: 'GET', pattern: '/api/games', category: 'Games', description: 'List games' },
      { method: 'POST', pattern: '/api/games', category: 'Games', description: 'Create game' },
      { method: 'PUT', pattern: '/api/games/:id', category: 'Games', description: 'Update game' },
      { method: 'DELETE', pattern: '/api/games/:id', category: 'Games', description: 'Delete game' },
      
      // Users
      { method: 'GET', pattern: '/api/users', category: 'Users', description: 'List users' },
      { method: 'POST', pattern: '/api/users', category: 'Users', description: 'Create user' },
      { method: 'PUT', pattern: '/api/users/:id', category: 'Users', description: 'Update user' },
      { method: 'DELETE', pattern: '/api/users/:id', category: 'Users', description: 'Delete user' },
      
      // Roles
      { method: 'GET', pattern: '/api/admin/roles', category: 'Roles', description: 'List roles' },
      { method: 'POST', pattern: '/api/admin/roles', category: 'Roles', description: 'Create role' },
      { method: 'PUT', pattern: '/api/admin/roles/:id', category: 'Roles', description: 'Update role' },
      { method: 'DELETE', pattern: '/api/admin/roles/:id', category: 'Roles', description: 'Delete role' },
      
      // Add more endpoints as needed...
    ];
  }

  /**
   * Clear all cached data for a role
   */
  async clearRoleCache(roleId) {
    try {
      // Clear role-specific caches
      await CacheService.del(`${this.cachePrefix}pages:${roleId}`);
      await CacheService.del(`${this.cachePrefix}apis:${roleId}`);
      await CacheService.del(`${this.cachePrefix}features:${roleId}`);
      await CacheService.del(`${this.cachePrefix}scopes:${roleId}`);
      
      // Clear user-specific caches for all users with this role
      // This would require tracking which users have which roles
      // For now, we'll clear all user caches (less efficient but ensures consistency)
      await CacheService.clearPattern(`${this.cachePrefix}user_*`);
    } catch (error) {
      console.error('Error clearing role cache:', error);
    }
  }

  /**
   * Clear all access control caches
   */
  async clearAllCaches() {
    try {
      await CacheService.clearPattern(`${this.cachePrefix}*`);
    } catch (error) {
      console.error('Error clearing all caches:', error);
    }
  }
}

export default new RoleAccessService();