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

import { BaseService, QueryOptions } from './BaseService';
import { Database, UUID, RoleEntity, PermissionEntity, UserRoleAssignment, PaginatedResult, User, Knex } from '../types';

// Role-specific interfaces extending base types
export interface Role extends Omit<RoleEntity, 'permissions'> {
  permissions?: Permission[];
}

export interface Permission extends PermissionEntity {}

export interface RoleWithMetadata extends Role {
  permission_count: number;
  user_count: number;
}

export interface RolePermissionAssignment {
  role_id: UUID;
  permission_id: UUID;
  created_at: Date;
}

export interface UserRoleResult {
  role_id: UUID;
  added_count: number;
  already_assigned_count: number;
  total_users: number;
}

export interface UserRoleRemovalResult {
  role_id: UUID;
  removed_count: number;
  requested_count: number;
}

export interface RoleDeletionCheck {
  canDelete: boolean;
  reason?: string;
}

// Role creation and update interfaces
export interface CreateRoleData {
  name: string;
  description?: string;
  is_system?: boolean;
  is_active?: boolean;
  color?: string;
  priority?: number;
  settings?: any;
}

export interface UpdateRoleData extends Partial<CreateRoleData> {
  updated_at?: Date;
}

// Options interfaces with transaction support
export interface RoleQueryOptions extends QueryOptions {
  includeInactive?: boolean;
}

export interface RoleOperationOptions {
  transaction?: Knex.Transaction;
  force?: boolean;
}

class RoleService extends BaseService<Role> {
  constructor(db: Database) {
    super('roles', db, {
      defaultOrderBy: 'name',
      defaultOrderDirection: 'asc'
    });
  }

  /**
   * Get role by ID
   * @param roleId - Role ID
   * @returns Role object
   */
  async getRoleById(roleId: UUID): Promise<Role | null> {
    try {
      const role = await this.db('roles')
        .where('id', roleId)
        .first() as Role;
      return role || null;
    } catch (error) {
      console.error('Error getting role by ID:', error);
      throw error;
    }
  }

  /**
   * Get role with its permissions
   * @param roleId - Role ID
   * @param options - Options including transaction
   * @returns Role with permissions
   */
  async getRoleWithPermissions(roleId: UUID, options: RoleOperationOptions = {}): Promise<Role> {
    const db = options.transaction || this.db;
    
    try {
      const role = await (db as any)('roles')
        .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
        .leftJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
        .select(
          'roles.*',
          (db as any).raw('COALESCE(JSON_AGG(DISTINCT permissions.*) FILTER (WHERE permissions.id IS NOT NULL), \'[]\') as permissions')
        )
        .where('roles.id', roleId)
        .groupBy('roles.id')
        .first() as Role & { permissions: string | Permission[] };

      if (!role) {
        throw new Error(`Role not found with id: ${roleId}`);
      }

      // Parse permissions JSON
      role.permissions = typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) as Permission[]
        : (role.permissions as Permission[]) || [];

      return role;
    } catch (error) {
      console.error('Error getting role with permissions:', error);
      throw new Error(`Failed to get role with permissions: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new role
   * @param roleData - Role data
   * @param permissions - Permission IDs to assign
   * @returns Created role with permissions
   */
  async createRole(roleData: CreateRoleData, permissions: UUID[] = []): Promise<Role> {
    return await this.withTransaction(async (trx) => {
      // Create the role
      const [role] = await (trx as any)('roles')
        .insert({
          ...roleData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*') as Role[];

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
   * @param roleId - Role ID
   * @param roleData - Updated role data
   * @param permissions - Permission IDs (optional)
   * @returns Updated role with permissions
   */
  async updateRole(roleId: UUID, roleData: UpdateRoleData, permissions: UUID[] | null = null): Promise<Role> {
    return await this.withTransaction(async (trx) => {
      // Check if trying to update Super Admin
      const existingRole = await trx('roles').where('id', roleId).first() as Role;
      if (!existingRole) {
        throw new Error(`Role not found with id: ${roleId}`);
      }
      
      if (existingRole.name === 'Super Admin') {
        throw new Error('Super Admin role cannot be modified');
      }

      // Update the role
      const [role] = await (trx as any)('roles')
        .where('id', roleId)
        .update({
          ...roleData,
          updated_at: new Date()
        })
        .returning('*') as Role[];

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
   * @param roleId - Role ID
   * @param permissionIds - Permission IDs
   * @param options - Options
   */
  async assignPermissionsToRole(roleId: UUID, permissionIds: UUID[], options: RoleOperationOptions = {}): Promise<void> {
    const trx = options.transaction || this.db;

    try {
      // Validate role exists
      const role = await trx('roles').where('id', roleId).first() as Role;
      if (!role) {
        throw new Error(`Role not found with id: ${roleId}`);
      }

      // Prevent modifying Super Admin permissions
      if (role.name === 'Super Admin') {
        throw new Error('Super Admin permissions cannot be modified');
      }

      // Validate permissions exist
      if (permissionIds.length > 0) {
        const existingPermissions = await (trx as any)('permissions')
          .whereIn('id', permissionIds)
          .pluck('id') as UUID[];
        
        const invalidPermissions = permissionIds.filter(id => !existingPermissions.includes(id));
        if (invalidPermissions.length > 0) {
          throw new Error(`Invalid permission IDs: ${invalidPermissions.join(', ')}`);
        }

        // Insert role-permission relationships
        const rolePermissions: RolePermissionAssignment[] = permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
          created_at: new Date()
        }));

        await (trx as any)('role_permissions')
          .insert(rolePermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }
    } catch (error) {
      console.error('Error assigning permissions to role:', error);
      throw new Error(`Failed to assign permissions to role: ${(error as Error).message}`);
    }
  }

  /**
   * Remove permissions from a role
   * @param roleId - Role ID
   * @param permissionIds - Permission IDs
   * @param options - Options
   */
  async removePermissionsFromRole(roleId: UUID, permissionIds: UUID[], options: RoleOperationOptions = {}): Promise<number> {
    const trx = options.transaction || this.db;

    try {
      const deletedCount = await trx('role_permissions')
        .where('role_id', roleId)
        .whereIn('permission_id', permissionIds)
        .del();

      return deletedCount;
    } catch (error) {
      console.error('Error removing permissions from role:', error);
      throw new Error(`Failed to remove permissions from role: ${(error as Error).message}`);
    }
  }

  /**
   * Get users with a specific role
   * @param roleId - Role ID
   * @param options - Query options
   * @returns Users with the role
   */
  async getUsersWithRole(roleId: UUID, options: { page?: number; limit?: number } = {}): Promise<PaginatedResult<Pick<User, 'id' | 'name' | 'email'>>> {
    try {
      const { page = 1, limit = 50 } = options;
      const offset = (page - 1) * limit;

      if (!this.db) {
        console.error('Database connection not available in RoleService');
        throw new Error('Database connection not initialized');
      }

      console.log('Fetching users for role:', roleId);
      
      let users: Pick<User, 'id' | 'name' | 'email'>[] = [];
      let countResult: { total: number } = { total: 0 };
      
      try {
        const query = (this.db as any)('users')
          .join('user_roles', 'users.id', 'user_roles.user_id')
          .where('user_roles.role_id', roleId)
          .select('users.id', 'users.name', 'users.email')
          .orderBy('users.name');

        // Note: Users table doesn't have an active/is_active column
        // If we need to filter inactive users in the future, we'll need to add this column

        [users, countResult] = await Promise.all([
          query.clone().limit(limit).offset(offset),
          query.clone().count('* as total').first() as Promise<{ total: number }>
        ]);
      } catch (queryError) {
        console.error('Query error in getUsersWithRole:', queryError);
        // Return empty result on query error
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        };
      }

      const total = parseInt(String(countResult?.total || 0));
      const totalPages = Math.ceil(total / limit);

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting users with role:', error);
      throw new Error(`Failed to get users with role: ${(error as Error).message}`);
    }
  }

  /**
   * Get all available roles with permission counts
   * @param options - Query options
   * @returns Roles with metadata
   */
  async getRolesWithMetadata(options: RoleQueryOptions = {}): Promise<RoleWithMetadata[]> {
    try {
      const { includeInactive = false } = options;

      let query = (this.db as any)('roles')
        .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
        .leftJoin('user_roles', 'roles.id', 'user_roles.role_id')
        .select(
          'roles.*',
          (this.db as any).raw('COUNT(DISTINCT role_permissions.permission_id) as permission_count'),
          (this.db as any).raw('COUNT(DISTINCT user_roles.user_id) as user_count')
        )
        .groupBy('roles.id')
        .orderBy('roles.name');

      if (!includeInactive) {
        query = query.where('roles.is_active', true);
      }

      const roles = await query as (Role & { permission_count: string; user_count: string })[];

      // Convert counts to integers
      return roles.map(role => ({
        ...role,
        permission_count: parseInt(role.permission_count) || 0,
        user_count: parseInt(role.user_count) || 0
      }));
    } catch (error) {
      console.error('Error getting roles with metadata:', error);
      throw new Error(`Failed to get roles with metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Activate or deactivate a role
   * @param roleId - Role ID
   * @param active - Active status
   * @returns Updated role
   */
  async setRoleStatus(roleId: UUID, active: boolean): Promise<Role> {
    try {
      // Prevent deactivating system roles
      const role = await this.findById(roleId);
      if (!role) {
        throw new Error(`Role not found with id: ${roleId}`);
      }

      // Prevent any modifications to Super Admin
      if (role.name === 'Super Admin') {
        throw new Error('Super Admin role cannot be modified');
      }

      if (!active && role.is_system) {
        throw new Error('Cannot deactivate system roles');
      }

      const [updatedRole] = await (this.db as any)('roles')
        .where('id', roleId)
        .update({
          is_active: active,
          updated_at: new Date()
        })
        .returning('*') as Role[];

      return updatedRole;
    } catch (error) {
      console.error('Error setting role status:', error);
      throw new Error(`Failed to set role status: ${(error as Error).message}`);
    }
  }

  /**
   * Get role hierarchy (for future hierarchical role support)
   * @param roleId - Role ID
   * @returns Role hierarchy
   */
  async getRoleHierarchy(roleId: UUID): Promise<Role[]> {
    try {
      // This is a placeholder for future hierarchical role implementation
      // For now, return just the role itself
      const role = await this.getRoleWithPermissions(roleId);
      return [role];
    } catch (error) {
      console.error('Error getting role hierarchy:', error);
      throw new Error(`Failed to get role hierarchy: ${(error as Error).message}`);
    }
  }

  /**
   * Check if role can be deleted safely
   * @param roleId - Role ID
   * @returns Deletion safety check result
   */
  async canDeleteRole(roleId: UUID): Promise<RoleDeletionCheck> {
    try {
      const role = await this.findById(roleId);
      if (!role) {
        return { canDelete: false, reason: 'Role not found' };
      }

      // Super Admin cannot be deleted
      if (role.name === 'Super Admin') {
        return { canDelete: false, reason: 'Super Admin role cannot be deleted' };
      }

      // System roles cannot be deleted
      if (role.is_system) {
        return { canDelete: false, reason: 'Cannot delete system roles' };
      }

      // Check if role has assigned users
      const userCount = await this.db('user_roles')
        .where('role_id', roleId)
        .count('* as count')
        .first() as { count: string };

      if (parseInt(userCount.count) > 0) {
        return { 
          canDelete: false, 
          reason: `Role is assigned to ${userCount.count} user(s)` 
        };
      }

      return { canDelete: true };
    } catch (error) {
      console.error('Error checking role deletion safety:', error);
      throw new Error(`Failed to check role deletion safety: ${(error as Error).message}`);
    }
  }

  /**
   * Delete role with safety checks
   * @param roleId - Role ID
   * @param options - Options
   * @returns Success status
   */
  async deleteRole(roleId: UUID, options: RoleOperationOptions = {}): Promise<boolean> {
    return await this.withTransaction(async (trx) => {
      // Safety check
      const safetyCheck = await this.canDeleteRole(roleId);
      if (!safetyCheck.canDelete && !options.force) {
        throw new Error(safetyCheck.reason || 'Cannot delete role');
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

  /**
   * Add users to a role
   * @param roleId - Role ID
   * @param userIds - Array of user IDs to add
   * @returns Result with added users
   */
  async addUsersToRole(roleId: UUID, userIds: UUID[]): Promise<UserRoleResult> {
    return await this.withTransaction(async (trx) => {
      // Check if role exists
      const role = await trx('roles').where('id', roleId).first() as Role;
      if (!role) {
        throw new Error(`Role with ID ${roleId} not found`);
      }

      // Check which users already have this role
      const existingAssignments = await trx('user_roles')
        .where('role_id', roleId)
        .whereIn('user_id', userIds)
        .select('user_id') as { user_id: UUID }[];
      
      const existingUserIds = new Set(existingAssignments.map(a => a.user_id));
      
      // Filter out users who already have the role
      const newUserIds = userIds.filter(userId => !existingUserIds.has(userId));
      
      if (newUserIds.length > 0) {
        // Check if all users exist
        const existingUsers = await trx('users')
          .whereIn('id', newUserIds)
          .select('id') as { id: UUID }[];
        
        const existingUserSet = new Set(existingUsers.map(u => u.id));
        const nonExistentUsers = newUserIds.filter(id => !existingUserSet.has(id));
        
        if (nonExistentUsers.length > 0) {
          throw new Error(`Users not found: ${nonExistentUsers.join(', ')}`);
        }
        
        // Add new user-role assignments
        const assignments = newUserIds.map(userId => ({
          user_id: userId,
          role_id: roleId,
          assigned_at: new Date(),
          assigned_by: null as UUID | null // Should be set to current user ID in production
        }));
        
        await trx('user_roles').insert(assignments);
      }
      
      return {
        role_id: roleId,
        added_count: newUserIds.length,
        already_assigned_count: existingUserIds.size,
        total_users: userIds.length
      };
    });
  }

  /**
   * Remove users from a role
   * @param roleId - Role ID
   * @param userIds - Array of user IDs to remove
   * @returns Result with removed users
   */
  async removeUsersFromRole(roleId: UUID, userIds: UUID[]): Promise<UserRoleRemovalResult> {
    return await this.withTransaction(async (trx) => {
      // Check if role exists
      const role = await trx('roles').where('id', roleId).first() as Role;
      if (!role) {
        throw new Error(`Role with ID ${roleId} not found`);
      }

      // Remove user-role assignments
      const deletedCount = await trx('user_roles')
        .where('role_id', roleId)
        .whereIn('user_id', userIds)
        .del();
      
      return {
        role_id: roleId,
        removed_count: deletedCount,
        requested_count: userIds.length
      };
    });
  }

  /**
   * Get role permissions (security-critical method)
   * @param roleId - Role ID
   * @returns Array of permissions for the role
   */
  async getRolePermissions(roleId: UUID): Promise<Permission[]> {
    try {
      const permissions = await (this.db as any)('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .where('role_permissions.role_id', roleId)
        .select('permissions.*') as Permission[];

      return permissions;
    } catch (error) {
      console.error('Error getting role permissions:', error);
      throw new Error(`Failed to get role permissions: ${(error as Error).message}`);
    }
  }

  /**
   * Assign user to role (security-critical method)
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns void
   */
  async assignUserRole(userId: UUID, roleId: UUID): Promise<void> {
    try {
      await this.addUsersToRole(roleId, [userId]);
    } catch (error) {
      console.error('Error assigning user role:', error);
      throw new Error(`Failed to assign user role: ${(error as Error).message}`);
    }
  }

  /**
   * Revoke user role (security-critical method)
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns void
   */
  async revokeUserRole(userId: UUID, roleId: UUID): Promise<void> {
    try {
      await this.removeUsersFromRole(roleId, [userId]);
    } catch (error) {
      console.error('Error revoking user role:', error);
      throw new Error(`Failed to revoke user role: ${(error as Error).message}`);
    }
  }
}

export default RoleService;