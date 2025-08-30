/**
 * RoleService - Service for managing roles and role-permission relationships
 * 
 * This service provides comprehensive role management functionality including:
 * - CRUD operations for roles
 * - Permission assignment and removal
 * - User role management
 * - Role activation/deactivation
 * - Hierarchical role support
 */

const BaseService = require('./BaseService');
const db = require('../config/database');

class RoleService extends BaseService {
  constructor() {
    super('roles', db, {
      defaultOrderBy: 'name',
      defaultOrderDirection: 'asc'
    });
  }

  /**
   * Get role with its permissions
   * @param {string} roleId - Role ID
   * @param {Object} options - Options including transaction
   * @returns {Object} Role with permissions
   */
  async getRoleWithPermissions(roleId, options = {}) {
    const db = options.transaction || this.db;
    try {
      const role = await db('roles')
        .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
        .leftJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
        .select(
          'roles.*',
          db.raw('COALESCE(JSON_AGG(DISTINCT permissions.*) FILTER (WHERE permissions.id IS NOT NULL), \'[]\') as permissions')
        )
        .where('roles.id', roleId)
        .groupBy('roles.id')
        .first();

      if (!role) {
        throw new Error(`Role not found with id: ${roleId}`);
      }

      // Parse permissions JSON
      role.permissions = typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions || [];

      return role;
    } catch (error) {
      console.error('Error getting role with permissions:', error);
      throw new Error(`Failed to get role with permissions: ${error.message}`);
    }
  }

  /**
   * Create a new role
   * @param {Object} roleData - Role data
   * @param {Array} permissions - Permission IDs to assign
   * @returns {Object} Created role with permissions
   */
  async createRole(roleData, permissions = []) {
    return await this.withTransaction(async (trx) => {
      // Create the role
      const [role] = await trx('roles')
        .insert({
          ...roleData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Assign permissions if provided
      if (permissions && permissions.length > 0) {
        await this.assignPermissionsToRole(role.id, permissions, { transaction: trx });
      }

      // Return role with permissions
      return await this.getRoleWithPermissions(role.id, { transaction: trx });
    });
  }

  /**
   * Update role and optionally its permissions
   * @param {string} roleId - Role ID
   * @param {Object} roleData - Updated role data
   * @param {Array} permissions - Permission IDs (optional)
   * @returns {Object} Updated role with permissions
   */
  async updateRole(roleId, roleData, permissions = null) {
    return await this.withTransaction(async (trx) => {
      // Update the role
      const [role] = await trx('roles')
        .where('id', roleId)
        .update({
          ...roleData,
          updated_at: new Date()
        })
        .returning('*');

      if (!role) {
        throw new Error(`Role not found with id: ${roleId}`);
      }

      // Update permissions if provided
      if (permissions !== null && Array.isArray(permissions)) {
        // Remove existing permissions
        await trx('role_permissions').where('role_id', roleId).del();
        
        // Add new permissions
        if (permissions.length > 0) {
          await this.assignPermissionsToRole(roleId, permissions, { transaction: trx });
        }
      }

      // Return updated role with permissions
      return await this.getRoleWithPermissions(roleId, { transaction: trx });
    });
  }

  /**
   * Assign permissions to a role
   * @param {string} roleId - Role ID
   * @param {Array} permissionIds - Permission IDs
   * @param {Object} options - Options
   */
  async assignPermissionsToRole(roleId, permissionIds, options = {}) {
    const trx = options.transaction || this.db;

    try {
      // Validate role exists
      const role = await trx('roles').where('id', roleId).first();
      if (!role) {
        throw new Error(`Role not found with id: ${roleId}`);
      }

      // Validate permissions exist
      if (permissionIds.length > 0) {
        const existingPermissions = await trx('permissions')
          .whereIn('id', permissionIds)
          .pluck('id');
        
        const invalidPermissions = permissionIds.filter(id => !existingPermissions.includes(id));
        if (invalidPermissions.length > 0) {
          throw new Error(`Invalid permission IDs: ${invalidPermissions.join(', ')}`);
        }

        // Insert role-permission relationships
        const rolePermissions = permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
          created_at: new Date()
        }));

        await trx('role_permissions')
          .insert(rolePermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }
    } catch (error) {
      console.error('Error assigning permissions to role:', error);
      throw new Error(`Failed to assign permissions to role: ${error.message}`);
    }
  }

  /**
   * Remove permissions from a role
   * @param {string} roleId - Role ID
   * @param {Array} permissionIds - Permission IDs
   * @param {Object} options - Options
   */
  async removePermissionsFromRole(roleId, permissionIds, options = {}) {
    const trx = options.transaction || this.db;

    try {
      const deletedCount = await trx('role_permissions')
        .where('role_id', roleId)
        .whereIn('permission_id', permissionIds)
        .del();

      return deletedCount;
    } catch (error) {
      console.error('Error removing permissions from role:', error);
      throw new Error(`Failed to remove permissions from role: ${error.message}`);
    }
  }

  /**
   * Get users with a specific role
   * @param {string} roleId - Role ID
   * @param {Object} options - Query options
   * @returns {Array} Users with the role
   */
  async getUsersWithRole(roleId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;
      const offset = (page - 1) * limit;

      const query = this.db('users')
        .join('user_roles', 'users.id', 'user_roles.user_id')
        .where('user_roles.role_id', roleId)
        .select('users.id', 'users.name', 'users.email', 'users.active')
        .orderBy('users.name');

      if (options.includeInactive !== true) {
        query.where('users.active', true);
      }

      const [users, countResult] = await Promise.all([
        query.clone().limit(limit).offset(offset),
        query.clone().count('* as total').first()
      ]);

      const total = parseInt(countResult.total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting users with role:', error);
      throw new Error(`Failed to get users with role: ${error.message}`);
    }
  }

  /**
   * Get all available roles with permission counts
   * @param {Object} options - Query options
   * @returns {Array} Roles with metadata
   */
  async getRolesWithMetadata(options = {}) {
    try {
      const { includeInactive = false } = options;

      let query = this.db('roles')
        .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
        .leftJoin('user_roles', 'roles.id', 'user_roles.role_id')
        .select(
          'roles.*',
          this.db.raw('COUNT(DISTINCT role_permissions.permission_id) as permission_count'),
          this.db.raw('COUNT(DISTINCT user_roles.user_id) as user_count')
        )
        .groupBy('roles.id')
        .orderBy('roles.name');

      if (!includeInactive) {
        query = query.where('roles.is_active', true);
      }

      const roles = await query;

      // Convert counts to integers
      return roles.map(role => ({
        ...role,
        permission_count: parseInt(role.permission_count) || 0,
        user_count: parseInt(role.user_count) || 0
      }));
    } catch (error) {
      console.error('Error getting roles with metadata:', error);
      throw new Error(`Failed to get roles with metadata: ${error.message}`);
    }
  }

  /**
   * Activate or deactivate a role
   * @param {string} roleId - Role ID
   * @param {boolean} active - Active status
   * @returns {Object} Updated role
   */
  async setRoleStatus(roleId, active) {
    try {
      // Prevent deactivating system roles
      const role = await this.findById(roleId);
      if (!role) {
        throw new Error(`Role not found with id: ${roleId}`);
      }

      if (!active && role.system_role) {
        throw new Error('Cannot deactivate system roles');
      }

      const [updatedRole] = await this.db('roles')
        .where('id', roleId)
        .update({
          active,
          updated_at: new Date()
        })
        .returning('*');

      return updatedRole;
    } catch (error) {
      console.error('Error setting role status:', error);
      throw new Error(`Failed to set role status: ${error.message}`);
    }
  }

  /**
   * Get role hierarchy (for future hierarchical role support)
   * @param {string} roleId - Role ID
   * @returns {Array} Role hierarchy
   */
  async getRoleHierarchy(roleId) {
    try {
      // This is a placeholder for future hierarchical role implementation
      // For now, return just the role itself
      const role = await this.getRoleWithPermissions(roleId);
      return [role];
    } catch (error) {
      console.error('Error getting role hierarchy:', error);
      throw new Error(`Failed to get role hierarchy: ${error.message}`);
    }
  }

  /**
   * Check if role can be deleted safely
   * @param {string} roleId - Role ID
   * @returns {Object} Deletion safety check result
   */
  async canDeleteRole(roleId) {
    try {
      const role = await this.findById(roleId);
      if (!role) {
        return { canDelete: false, reason: 'Role not found' };
      }

      // System roles cannot be deleted
      if (role.system_role) {
        return { canDelete: false, reason: 'Cannot delete system roles' };
      }

      // Check if role has assigned users
      const userCount = await this.db('user_roles')
        .where('role_id', roleId)
        .count('* as count')
        .first();

      if (parseInt(userCount.count) > 0) {
        return { 
          canDelete: false, 
          reason: `Role is assigned to ${userCount.count} user(s)` 
        };
      }

      return { canDelete: true };
    } catch (error) {
      console.error('Error checking role deletion safety:', error);
      throw new Error(`Failed to check role deletion safety: ${error.message}`);
    }
  }

  /**
   * Delete role with safety checks
   * @param {string} roleId - Role ID
   * @param {Object} options - Options
   * @returns {boolean} Success status
   */
  async deleteRole(roleId, options = {}) {
    return await this.withTransaction(async (trx) => {
      // Safety check
      const safetyCheck = await this.canDeleteRole(roleId);
      if (!safetyCheck.canDelete && !options.force) {
        throw new Error(safetyCheck.reason);
      }

      // Remove role-permission relationships
      await trx('role_permissions').where('role_id', roleId).del();

      // Remove user-role relationships (if forcing)
      if (options.force) {
        await trx('user_roles').where('role_id', roleId).del();
      }

      // Delete the role
      const deletedCount = await trx('roles').where('id', roleId).del();

      return deletedCount > 0;
    });
  }
}

module.exports = RoleService;