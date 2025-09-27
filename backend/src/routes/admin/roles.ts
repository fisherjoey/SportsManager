/**
 * Admin Role Management Routes
 *
 * Provides comprehensive role management functionality for administrators:
 * - CRUD operations for roles
 * - Permission assignment/removal
 * - User role management
 * - Role activation/deactivation
 */

import express, { Response, NextFunction } from 'express';
import * as Joi from 'joi';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../../types/auth.types';
import RoleService from '../../services/RoleService';
import db from '../../config/database';

// Initialize router
const router = express.Router();

// Initialize services
const roleService = new RoleService(db);

// Type definitions for role management
interface RoleCreateData {
  name: string;
  description?: string;
  code?: string;
  category?: string;
  color?: string;
  is_system?: boolean;
  is_active?: boolean;
  permissions?: string[];
}

interface RoleUpdateData {
  name?: string;
  description?: string;
  code?: string;
  category?: string;
  color?: string;
  is_active?: boolean;
  permissions?: string[];
}

interface RoleFilters {
  includeInactive?: boolean;
}

interface UserRoleFilters {
  page: number;
  limit: number;
  includeInactive?: boolean;
}

interface RoleSafetyCheck {
  canDelete: boolean;
  reason?: string;
}

interface UserRoleOperationResult {
  added?: number;
  removed?: number;
  skipped?: number;
  errors?: string[];
}

interface PaginatedUserResult {
  users: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RoleHierarchy {
  role: any;
  parent?: any;
  children?: any[];
}

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().min(5).max(500).allow('', null),
  code: Joi.string().min(2).max(20).pattern(/^[A-Z_]+$/).allow('', null),
  category: Joi.string().min(2).max(30).allow('', null),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6B7280').allow('', null),
  is_system: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true),
  permissions: Joi.array().items(Joi.string()).allow(null) // Allow permission names or UUIDs
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).allow('', null),
  description: Joi.string().min(5).max(500).allow('', null),
  code: Joi.string().min(2).max(20).pattern(/^[A-Z_]+$/).allow('', null),
  category: Joi.string().min(2).max(30).allow('', null),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow('', null),
  is_active: Joi.boolean(),
  permissions: Joi.array().items(Joi.string()).allow(null) // Allow permission names or UUIDs
});

const assignPermissionsSchema = Joi.object({
  permission_ids: Joi.array().items(Joi.string()).required().min(1), // Allow permission names or UUIDs
  permissions: Joi.array().items(Joi.string()) // Also accept 'permissions' field
}).or('permission_ids', 'permissions');

const removePermissionsSchema = Joi.object({
  permission_ids: Joi.array().items(Joi.string()).required().min(1), // Allow permission names or UUIDs
  permissions: Joi.array().items(Joi.string()) // Also accept 'permissions' field
}).or('permission_ids', 'permissions');

const assignUserRoleSchema = Joi.object({
  user_ids: Joi.array().items(Joi.string()).required().min(1) // Allow any string format for user IDs
});

/**
 * GET /api/admin/roles - Get all roles with metadata
 * Requires: roles:read or system:admin permission
 */
router.get('/', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view:list',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  console.log('Admin roles endpoint hit - User:', req.user?.email, 'Role:', req.user?.role);
  try {
    const { include_inactive } = (req as any).query as { include_inactive?: string };

    const filters: RoleFilters = {
      includeInactive: include_inactive === 'true'
    };

    const roles = await roleService.getRolesWithMetadata(filters);

    res.json({
      success: true,
      data: { roles },
      message: 'Roles retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting roles:', error);
    res.status(500).json({
      error: 'Failed to retrieve roles',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/roles/:roleId - Get specific role with permissions
 * Requires: roles:read or system:admin permission
 */
router.get('/:roleId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view:details',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const role = await roleService.getRoleWithPermissions(roleId);

    res.json({
      success: true,
      data: { role },
      message: 'Role retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting role:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Role not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to retrieve role',
        details: error.message
      });
    }
  }
});

/**
 * POST /api/admin/roles - Create new role
 * Requires: roles:create or system:admin permission
 */
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'create',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = createRoleSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { permissions, ...roleData } = value as RoleCreateData & { permissions?: string[] };
    const role = await roleService.createRole(roleData as any);

    res.status(201).json({
      success: true,
      data: { role },
      message: 'Role created successfully'
    });
  } catch (error: any) {
    console.error('Error creating role:', error);
    if (error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Role already exists',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to create role',
        details: error.message
      });
    }
  }
});

/**
 * PUT /api/admin/roles/:roleId - Update role
 * Requires: roles:update or system:admin permission
 */
router.put('/:roleId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'update',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { error, value } = updateRoleSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { permissions, ...roleData } = value as RoleUpdateData & { permissions?: string[] };
    const role = await roleService.updateRole(roleId, roleData as any);

    res.json({
      success: true,
      data: { role },
      message: 'Role updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating role:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Role not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to update role',
        details: error.message
      });
    }
  }
});

/**
 * DELETE /api/admin/roles/:roleId - Delete role
 * Requires: roles:delete or system:admin permission
 */
router.delete('/:roleId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'delete',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { force } = (req as any).query as { force?: string };

    // Check if role can be deleted
    const safetyCheck: RoleSafetyCheck = await roleService.canDeleteRole(roleId);
    if (!safetyCheck.canDelete && force !== 'true') {
      res.status(400).json({
        error: 'Cannot delete role',
        details: safetyCheck.reason,
        suggestion: 'Use force=true query parameter to force deletion'
      });
      return;
    }

    const deleted = await roleService.deleteRole(roleId, { force: force === 'true' });

    if (deleted) {
      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Role not found'
      });
    }
  } catch (error: any) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      error: 'Failed to delete role',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/roles/:roleId/permissions - Assign permissions to role
 */
router.post('/:roleId/permissions', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { error, value } = assignPermissionsSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { permission_ids } = value;
    await roleService.assignPermissionsToRole(roleId, permission_ids);

    const updatedRole = await roleService.getRoleWithPermissions(roleId);

    res.json({
      success: true,
      data: { role: updatedRole },
      message: 'Permissions assigned successfully'
    });
  } catch (error: any) {
    console.error('Error assigning permissions:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Role or permission not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to assign permissions',
        details: error.message
      });
    }
  }
});

/**
 * DELETE /api/admin/roles/:roleId/permissions - Remove permissions from role
 */
router.delete('/:roleId/permissions', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { error, value } = removePermissionsSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { permission_ids } = value;
    const removedCount: number = await roleService.removePermissionsFromRole(roleId, permission_ids);

    const updatedRole = await roleService.getRoleWithPermissions(roleId);

    res.json({
      success: true,
      data: {
        role: updatedRole,
        removed_count: removedCount
      },
      message: 'Permissions removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing permissions:', error);
    res.status(500).json({
      error: 'Failed to remove permissions',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/roles/:roleId/users - Get users with this role
 */
router.get('/:roleId/users', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_users',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { page = '1', limit = '50', include_inactive } = (req as any).query as {
      page?: string;
      limit?: string;
      include_inactive?: string;
    };

    const filters: UserRoleFilters = {
      page: parseInt(page),
      limit: parseInt(limit),
      includeInactive: include_inactive === 'true'
    };

    const result = await roleService.getUsersWithRole(roleId, filters) as unknown as PaginatedUserResult;

    res.json({
      success: true,
      data: result,
      message: 'Users retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting users with role:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Failed to retrieve users',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/roles/:roleId/users - Add users to role
 */
router.post('/:roleId/users', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_users',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { user_ids } = (req as any).body as { user_ids?: string[] };

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: 'user_ids must be a non-empty array'
      });
      return;
    }

    const result = await roleService.addUsersToRole(roleId, user_ids) as unknown as UserRoleOperationResult;

    res.json({
      success: true,
      data: result,
      message: 'Users added to role successfully'
    });
  } catch (error: any) {
    console.error('Error adding users to role:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Role or user not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to add users to role',
        details: error.message
      });
    }
  }
});

/**
 * DELETE /api/admin/roles/:roleId/users - Remove users from role
 */
router.delete('/:roleId/users', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_users',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { user_ids } = (req as any).body as { user_ids?: string[] };

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: 'user_ids must be a non-empty array'
      });
      return;
    }

    const result = await roleService.removeUsersFromRole(roleId, user_ids) as unknown as UserRoleOperationResult;

    res.json({
      success: true,
      data: result,
      message: 'Users removed from role successfully'
    });
  } catch (error: any) {
    console.error('Error removing users from role:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Role or user not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to remove users from role',
        details: error.message
      });
    }
  }
});

/**
 * PATCH /api/admin/roles/:roleId/status - Activate/deactivate role
 */
router.patch('/:roleId/status', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'update',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const { is_active } = (req as any).body as { is_active?: boolean };

    if (typeof is_active !== 'boolean') {
      res.status(400).json({
        error: 'Validation failed',
        details: 'is_active field must be a boolean'
      });
      return;
    }

    const updatedRole = await roleService.setRoleStatus(roleId, is_active);

    res.json({
      success: true,
      data: { role: updatedRole },
      message: `Role ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    console.error('Error updating role status:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Role not found',
        details: error.message
      });
    } else if (error.message.includes('Cannot deactivate')) {
      res.status(400).json({
        error: 'Cannot deactivate system role',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to update role status',
        details: error.message
      });
    }
  }
});

/**
 * GET /api/admin/roles/:roleId/hierarchy - Get role hierarchy (future feature)
 */
router.get('/:roleId/hierarchy', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view:details',
  getResourceId: (req: any) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const hierarchy = await roleService.getRoleHierarchy(roleId) as unknown as RoleHierarchy;

    res.json({
      success: true,
      data: { hierarchy },
      message: 'Role hierarchy retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting role hierarchy:', error);
    res.status(500).json({
      error: 'Failed to retrieve role hierarchy',
      details: error.message
    });
  }
});

export default router;