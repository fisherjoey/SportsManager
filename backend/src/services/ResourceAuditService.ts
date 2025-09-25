// @ts-nocheck

/**
 * ResourceAuditService - Service for comprehensive resource audit logging
 * 
 * This service provides comprehensive audit logging functionality for resources including:
 * - Logging all resource actions (create, view, edit, delete, download)
 * - Tracking changes with detailed diffs
 * - Storing metadata (IP address, user agent, timestamp)
 * - Querying audit logs with advanced filters
 * - Generating audit reports
 */

import BaseService from './BaseService';
import db from '../config/database';

class ResourceAuditService extends BaseService {
  constructor() {
    super('resource_audit_log', db, {
      defaultOrderBy: 'timestamp',
      defaultOrderDirection: 'desc'
    });
  }

  /**
   * Log a resource action
   * @param {Object} actionData - Action data to log
   * @param {string} actionData.user_id - User who performed the action
   * @param {string} actionData.resource_id - Resource ID (optional for some actions)
   * @param {string} actionData.category_id - Category ID (optional)
   * @param {string} actionData.action - Action type (create, view, edit, delete, download, etc.)
   * @param {string} actionData.entity_type - Entity type (resource, category, permission)
   * @param {string} actionData.ip_address - User's IP address
   * @param {string} actionData.user_agent - User's browser/client info
   * @param {Object} actionData.metadata - Additional metadata
   * @param {Object} actionData.old_values - Previous values (for updates)
   * @param {Object} actionData.new_values - New values (for updates)
   * @returns {Object} Created audit log entry
   */
  async logAction(actionData) {
    try {
      const logEntry = {
        user_id: actionData.user_id,
        resource_id: actionData.resource_id || null,
        category_id: actionData.category_id || null,
        action: actionData.action,
        entity_type: actionData.entity_type || 'resource',
        ip_address: actionData.ip_address || null,
        user_agent: actionData.user_agent || null,
        metadata: actionData.metadata || {},
        old_values: actionData.old_values || null,
        new_values: actionData.new_values || null,
        timestamp: new Date()
      };

      // Calculate diff if both old and new values are provided
      if (logEntry.old_values && logEntry.new_values) {
        logEntry.change_diff = this.calculateDiff(logEntry.old_values, logEntry.new_values);
      }

      const [result] = await this.db('resource_audit_log')
        .insert(logEntry)
        .returning('*');

      return result;
    } catch (error) {
      console.error('Error logging resource action:', error);
      // Don't throw error - audit logging should not break the main flow
      return null;
    }
  }

  /**
   * Log resource creation
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {Object} resourceData - Resource data
   * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
   * @returns {Object} Created audit log entry
   */
  async logResourceCreation(userId, resourceId, resourceData, metadata = {}) {
    return await this.logAction({
      user_id: userId,
      resource_id: resourceId,
      category_id: resourceData.category_id,
      action: 'create',
      entity_type: 'resource',
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      new_values: resourceData,
      metadata: {
        ...metadata,
        resource_type: resourceData.type,
        resource_title: resourceData.title
      }
    });
  }

  /**
   * Log resource view/access
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created audit log entry
   */
  async logResourceView(userId, resourceId, metadata = {}) {
    return await this.logAction({
      user_id: userId,
      resource_id: resourceId,
      action: 'view',
      entity_type: 'resource',
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      metadata
    });
  }

  /**
   * Log resource update
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {Object} oldData - Previous resource data
   * @param {Object} newData - Updated resource data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created audit log entry
   */
  async logResourceUpdate(userId, resourceId, oldData, newData, metadata = {}) {
    return await this.logAction({
      user_id: userId,
      resource_id: resourceId,
      category_id: newData.category_id || oldData.category_id,
      action: 'edit',
      entity_type: 'resource',
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      old_values: oldData,
      new_values: newData,
      metadata: {
        ...metadata,
        resource_type: newData.type || oldData.type,
        resource_title: newData.title || oldData.title
      }
    });
  }

  /**
   * Log resource deletion
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {Object} resourceData - Resource data before deletion
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created audit log entry
   */
  async logResourceDeletion(userId, resourceId, resourceData, metadata = {}) {
    return await this.logAction({
      user_id: userId,
      resource_id: resourceId,
      category_id: resourceData.category_id,
      action: 'delete',
      entity_type: 'resource',
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      old_values: resourceData,
      metadata: {
        ...metadata,
        resource_type: resourceData.type,
        resource_title: resourceData.title
      }
    });
  }

  /**
   * Log resource download
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created audit log entry
   */
  async logResourceDownload(userId, resourceId, metadata = {}) {
    return await this.logAction({
      user_id: userId,
      resource_id: resourceId,
      action: 'download',
      entity_type: 'resource',
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      metadata
    });
  }

  /**
   * Log category actions (create, update, delete)
   * @param {string} userId - User ID
   * @param {string} categoryId - Category ID
   * @param {string} action - Action type
   * @param {Object} oldData - Previous data (for updates)
   * @param {Object} newData - New data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created audit log entry
   */
  async logCategoryAction(userId, categoryId, action, oldData, newData, metadata = {}) {
    return await this.logAction({
      user_id: userId,
      category_id: categoryId,
      action,
      entity_type: 'category',
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      old_values: oldData,
      new_values: newData,
      metadata: {
        ...metadata,
        category_name: newData?.name || oldData?.name
      }
    });
  }

  /**
   * Log permission changes
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID (optional)
   * @param {string} categoryId - Category ID (optional)
   * @param {string} action - Permission action
   * @param {Object} permissionData - Permission data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created audit log entry
   */
  async logPermissionChange(userId, resourceId, categoryId, action, permissionData, metadata = {}) {
    return await this.logAction({
      user_id: userId,
      resource_id: resourceId,
      category_id: categoryId,
      action,
      entity_type: 'permission',
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      new_values: permissionData,
      metadata
    });
  }

  /**
   * Get audit logs with advanced filtering
   * @param {Object} filters - Filter criteria
   * @param {string} filters.user_id - Filter by user
   * @param {string} filters.resource_id - Filter by resource
   * @param {string} filters.category_id - Filter by category
   * @param {string} filters.action - Filter by action type
   * @param {string} filters.entity_type - Filter by entity type
   * @param {Date} filters.start_date - Filter by start date
   * @param {Date} filters.end_date - Filter by end date
   * @param {string} filters.ip_address - Filter by IP address
   * @param {number} filters.limit - Limit results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Object} Audit logs and pagination info
   */
  async getAuditLogs(filters = {}) {
    try {
      let query = this.db('resource_audit_log')
        .select(
          'resource_audit_log.*',
          'users.email as user_email',
          'resources.title as resource_title',
          'resource_categories.name as category_name'
        )
        .leftJoin('users', 'resource_audit_log.user_id', 'users.id')
        .leftJoin('resources', 'resource_audit_log.resource_id', 'resources.id')
        .leftJoin('resource_categories', 'resource_audit_log.category_id', 'resource_categories.id');

      // Apply filters
      if (filters.user_id) {
        query = query.where('resource_audit_log.user_id', filters.user_id);
      }

      if (filters.resource_id) {
        query = query.where('resource_audit_log.resource_id', filters.resource_id);
      }

      if (filters.category_id) {
        query = query.where('resource_audit_log.category_id', filters.category_id);
      }

      if (filters.action) {
        if (Array.isArray(filters.action)) {
          query = query.whereIn('resource_audit_log.action', filters.action);
        } else {
          query = query.where('resource_audit_log.action', filters.action);
        }
      }

      if (filters.entity_type) {
        query = query.where('resource_audit_log.entity_type', filters.entity_type);
      }

      if (filters.start_date) {
        query = query.where('resource_audit_log.timestamp', '>=', filters.start_date);
      }

      if (filters.end_date) {
        query = query.where('resource_audit_log.timestamp', '<=', filters.end_date);
      }

      if (filters.ip_address) {
        query = query.where('resource_audit_log.ip_address', filters.ip_address);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('users.email', 'ilike', `%${filters.search}%`)
            .orWhere('resources.title', 'ilike', `%${filters.search}%`)
            .orWhere('resource_categories.name', 'ilike', `%${filters.search}%`)
            .orWhere('resource_audit_log.action', 'ilike', `%${filters.search}%`);
        });
      }

      // Get total count for pagination
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('resource_audit_log.id as count');

      // Apply pagination and sorting
      query = query
        .orderBy('resource_audit_log.timestamp', 'desc')
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      const logs = await query;

      return {
        logs,
        pagination: {
          total: parseInt(count),
          limit: filters.limit || 50,
          offset: filters.offset || 0,
          hasMore: (filters.offset || 0) + (filters.limit || 50) < parseInt(count)
        }
      };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Optional filters for statistics
   * @returns {Object} Audit statistics
   */
  async getAuditStatistics(filters = {}) {
    try {
      let query = this.db('resource_audit_log');

      // Apply date range filter if provided
      if (filters.start_date) {
        query = query.where('timestamp', '>=', filters.start_date);
      }
      if (filters.end_date) {
        query = query.where('timestamp', '<=', filters.end_date);
      }

      // Total actions
      const [{ total_actions }] = await query.clone().count('id as total_actions');

      // Actions by type
      const actionStats = await query.clone()
        .select('action')
        .count('id as count')
        .groupBy('action')
        .orderBy('count', 'desc');

      // Actions by entity type
      const entityStats = await query.clone()
        .select('entity_type')
        .count('id as count')
        .groupBy('entity_type')
        .orderBy('count', 'desc');

      // Most active users
      const userStats = await query.clone()
        .select('users.email as user_email')
        .count('resource_audit_log.id as count')
        .leftJoin('users', 'resource_audit_log.user_id', 'users.id')
        .groupBy('resource_audit_log.user_id', 'users.email')
        .orderBy('count', 'desc')
        .limit(10);

      // Most accessed resources
      const resourceStats = await query.clone()
        .select('resources.title as resource_title')
        .count('resource_audit_log.id as count')
        .leftJoin('resources', 'resource_audit_log.resource_id', 'resources.id')
        .where('resource_audit_log.resource_id', 'is not', null)
        .groupBy('resource_audit_log.resource_id', 'resources.title')
        .orderBy('count', 'desc')
        .limit(10);

      return {
        total_actions: parseInt(total_actions),
        actions_by_type: actionStats.map(stat => ({
          action: stat.action,
          count: parseInt(stat.count)
        })),
        actions_by_entity: entityStats.map(stat => ({
          entity_type: stat.entity_type,
          count: parseInt(stat.count)
        })),
        most_active_users: userStats.map(stat => ({
          user_email: stat.user_email,
          count: parseInt(stat.count)
        })),
        most_accessed_resources: resourceStats.map(stat => ({
          resource_title: stat.resource_title,
          count: parseInt(stat.count)
        }))
      };
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      throw new Error(`Failed to get audit statistics: ${error.message}`);
    }
  }

  /**
   * Get recent activity for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of recent activities to retrieve
   * @returns {Array} Recent activities
   */
  async getUserRecentActivity(userId, limit = 20) {
    try {
      const activities = await this.db('resource_audit_log')
        .select(
          'resource_audit_log.*',
          'resources.title as resource_title',
          'resource_categories.name as category_name'
        )
        .leftJoin('resources', 'resource_audit_log.resource_id', 'resources.id')
        .leftJoin('resource_categories', 'resource_audit_log.category_id', 'resource_categories.id')
        .where('resource_audit_log.user_id', userId)
        .orderBy('resource_audit_log.timestamp', 'desc')
        .limit(limit);

      return activities;
    } catch (error) {
      console.error('Error getting user recent activity:', error);
      throw new Error(`Failed to get user recent activity: ${error.message}`);
    }
  }

  /**
   * Get resource access history
   * @param {string} resourceId - Resource ID
   * @param {number} limit - Number of history entries to retrieve
   * @returns {Array} Resource access history
   */
  async getResourceHistory(resourceId, limit = 50) {
    try {
      const history = await this.db('resource_audit_log')
        .select(
          'resource_audit_log.*',
          'users.email as user_email'
        )
        .leftJoin('users', 'resource_audit_log.user_id', 'users.id')
        .where('resource_audit_log.resource_id', resourceId)
        .orderBy('resource_audit_log.timestamp', 'desc')
        .limit(limit);

      return history;
    } catch (error) {
      console.error('Error getting resource history:', error);
      throw new Error(`Failed to get resource history: ${error.message}`);
    }
  }

  /**
   * Calculate diff between old and new values
   * @param {Object} oldValues - Previous values
   * @param {Object} newValues - New values
   * @returns {Object} Calculated diff
   * @private
   */
  calculateDiff(oldValues, newValues) {
    const diff = {
      changed: [],
      added: [],
      removed: []
    };

    try {
      const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);

      for (const key of allKeys) {
        const oldValue = oldValues?.[key];
        const newValue = newValues?.[key];

        if (oldValue === undefined && newValue !== undefined) {
          diff.added.push({ field: key, value: newValue });
        } else if (oldValue !== undefined && newValue === undefined) {
          diff.removed.push({ field: key, value: oldValue });
        } else if (oldValue !== newValue) {
          diff.changed.push({ 
            field: key, 
            old_value: oldValue, 
            new_value: newValue 
          });
        }
      }

      return diff;
    } catch (error) {
      console.error('Error calculating diff:', error);
      return { changed: [], added: [], removed: [], error: 'Failed to calculate diff' };
    }
  }

  /**
   * Clean old audit logs (for maintenance)
   * @param {number} daysToKeep - Number of days to keep logs (default: 90)
   * @returns {number} Number of deleted records
   */
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await this.db('resource_audit_log')
        .where('timestamp', '<', cutoffDate)
        .del();

      console.log(`Cleaned ${deleted} old audit log entries older than ${daysToKeep} days`);
      return deleted;
    } catch (error) {
      console.error('Error cleaning old audit logs:', error);
      throw new Error(`Failed to clean old audit logs: ${error.message}`);
    }
  }

  /**
   * Export audit logs to JSON format
   * @param {Object} filters - Filter criteria
   * @returns {Object} Exported audit data
   */
  async exportAuditLogs(filters = {}) {
    try {
      const { logs } = await this.getAuditLogs({
        ...filters,
        limit: filters.limit || 10000 // Large limit for export
      });

      const statistics = await this.getAuditStatistics(filters);

      return {
        export_date: new Date().toISOString(),
        filters,
        statistics,
        logs
      };
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw new Error(`Failed to export audit logs: ${error.message}`);
    }
  }
}

export default ResourceAuditService;