/**
 * Admin Permission Management Routes
 *
 * Provides permission listing and management functionality for administrators:
 * - List all permissions with filtering
 * - Get permissions by category
 * - Search permissions
 * - Permission metadata and statistics
 * - Full CRUD operations for permissions
 * - Role permission assignment
 */

import express, { Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../../types/auth.types';

import PermissionService from '../../services/PermissionService';

// Initialize router
const router = express.Router();

// Initialize services
const permissionService = new PermissionService();

// Type definitions for permission management
interface PermissionFilters {
  activeOnly?: boolean;
  useCache?: boolean;
}

interface SearchOptions {
  category?: string;
  activeOnly?: boolean;
  limit?: number;
}

interface PermissionStatistics {
  total: number;
  categories: number;
}

interface CategorizedPermissions {
  [category: string]: any[];
}

interface PermissionCategory {
  category: string | null;
}

interface BulkPermissionResults {
  [userId: string]: boolean;
}

interface BulkPermissionSummary {
  total_users: number;
  users_with_permission: number;
  users_without_permission: number;
}

interface CacheStats {
  total_entries?: number;
  hit_rate?: number;
  memory_usage?: string;
  [key: string]: any;
}

interface PermissionCreateData {
  name: string;
  code?: string;
  description?: string;
  category?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  resource_type?: string;
  action?: string;
}

interface PermissionUpdateData {
  name?: string;
  code?: string;
  description?: string;
  category?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  resource_type?: string;
  action?: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

interface RoleInfo {
  id: string;
  name: string;
  description?: string;
}

// Validation schemas
const searchSchema = Joi.object({
  query: Joi.string().min(2).max(100).required(),
  category: Joi.string().max(50),
  active_only: Joi.boolean(),
  limit: Joi.number().integer().min(1).max(100)
});

const userPermissionsSchema = Joi.object({
  user_ids: Joi.array().items(Joi.string().uuid()).required().min(1).max(50)
});

const createPermissionSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  code: Joi.string().min(3).max(100),
  description: Joi.string().max(500),
  category: Joi.string().max(50),
  risk_level: Joi.string().valid('low', 'medium', 'high', 'critical'),
  resource_type: Joi.string().max(50),
  action: Joi.string().max(50)
});

const updatePermissionSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  code: Joi.string().min(3).max(100),
  description: Joi.string().max(500),
  category: Joi.string().max(50),
  risk_level: Joi.string().valid('low', 'medium', 'high', 'critical'),
  resource_type: Joi.string().max(50),
  action: Joi.string().max(50)
}).min(1);

const assignPermissionsSchema = Joi.object({
  permission_ids: Joi.array().items(Joi.string().uuid()).required()
});

// ===== ROUTES WITHOUT PARAMETERS FIRST =====

/**
 * GET /api/admin/permissions - Get all permissions with optional filtering
 * Requires: permissions:read or system:admin permission
 */
router.get('/', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { active_only = 'true', use_cache = 'true' } = (req as any).query as {
      active_only?: string;
      use_cache?: string;
    };

    const filters: PermissionFilters = {
      activeOnly: active_only === 'true',
      useCache: use_cache === 'true'
    };

    const permissions: CategorizedPermissions = await permissionService.getPermissionsByCategory(filters);

    // Calculate statistics
    const stats: PermissionStatistics = Object.keys(permissions).reduce((acc, category) => {
      acc.total += permissions[category].length;
      acc.categories++;
      return acc;
    }, { total: 0, categories: 0 });

    res.json({
      success: true,
      data: {
        permissions,
        statistics: stats
      },
      message: 'Permissions retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting permissions:', error);
    res.status(500).json({
      error: 'Failed to retrieve permissions',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/permissions - Create a new permission
 * Requires: system:admin permission
 */
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = createPermissionSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const permissionData = value as PermissionCreateData;
    const permission = await permissionService.createPermission(permissionData);

    res.status(201).json({
      success: true,
      data: { permission },
      message: 'Permission created successfully'
    });
  } catch (error: any) {
    console.error('Error creating permission:', error);
    if (error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Permission already exists',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to create permission',
        details: error.message
      });
    }
  }
});

/**
 * GET /api/admin/permissions/categories - Get unique permission categories
 * Requires: permissions:read or system:admin permission
 */
router.get('/categories', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { active_only = 'true' } = (req as any).query as { active_only?: string };

    const query = permissionService.db('permissions')
      .distinct('category')
      .orderBy('category');

    if (active_only === 'true') {
      query.where('active', true);
    }

    const results: PermissionCategory[] = await query;
    const categories: string[] = results.map((row: PermissionCategory) => row.category || 'uncategorized');

    res.json({
      success: true,
      data: { categories },
      message: 'Categories retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      error: 'Failed to retrieve categories',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/permissions/search - Search permissions
 */
router.post('/search', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = searchSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { query, category, active_only = true, limit = 50 } = value;

    const searchOptions: SearchOptions = {
      category,
      activeOnly: active_only,
      limit
    };

    const permissions = await permissionService.searchPermissions(query, searchOptions);

    res.json({
      success: true,
      data: {
        query,
        permissions,
        count: permissions.length,
        limited: permissions.length === limit
      },
      message: 'Permission search completed'
    });
  } catch (error: any) {
    console.error('Error searching permissions:', error);
    res.status(500).json({
      error: 'Failed to search permissions',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/permissions/cache/stats - Get permission cache statistics
 */
router.get('/cache/stats', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats: CacheStats = permissionService.getCacheStats();

    res.json({
      success: true,
      data: { cache_stats: stats },
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      details: error.message
    });
  }
});

/**
 * DELETE /api/admin/permissions/cache - Clear permission cache
 */
router.delete('/cache', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user_id } = (req as any).query as { user_id?: string };

    if (user_id) {
      permissionService.invalidateUserCache(user_id);
    } else {
      permissionService.invalidateAllCaches();
    }

    res.json({
      success: true,
      message: user_id
        ? `Cache cleared for user ${user_id}`
        : 'All caches cleared successfully'
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/permissions/users/bulk-check - Bulk permission check for users
 */
router.post('/users/bulk-check', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = userPermissionsSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { user_ids } = value;
    const { permission } = (req as any).query as { permission?: string };

    if (!permission) {
      res.status(400).json({
        error: 'Permission parameter is required'
      });
      return;
    }

    const results: BulkPermissionResults = await permissionService.bulkPermissionCheck(user_ids, permission);

    const summary: BulkPermissionSummary = {
      total_users: user_ids.length,
      users_with_permission: Object.values(results).filter(Boolean).length,
      users_without_permission: Object.values(results).filter(result => !result).length
    };

    res.json({
      success: true,
      data: {
        permission,
        results,
        summary
      },
      message: 'Bulk permission check completed'
    });
  } catch (error: any) {
    console.error('Error in bulk permission check:', error);
    res.status(500).json({
      error: 'Failed to perform bulk permission check',
      details: error.message
    });
  }
});

// ===== ROUTES WITH SPECIFIC PATH PARAMETERS =====

/**
 * GET /api/admin/permissions/category/:category - Get permissions for specific category
 * Requires: permissions:read or system:admin permission
 */
router.get('/category/:category', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category } = (req as any).params;
    const { active_only = 'true' } = (req as any).query as { active_only?: string };

    const permissions = await permissionService.findWhere(
      { category },
      {
        orderBy: 'name',
        orderDirection: 'asc'
      }
    );

    const filteredPermissions = active_only === 'true'
      ? permissions.filter((p: any) => p.active)
      : permissions;

    res.json({
      success: true,
      data: {
        category,
        permissions: filteredPermissions,
        count: filteredPermissions.length
      },
      message: 'Category permissions retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting category permissions:', error);
    res.status(500).json({
      error: 'Failed to retrieve category permissions',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/permissions/users/:userId - Get user's permissions with details
 */
router.get('/users/:userId', authenticateToken, requireCerbosPermission({
  resource: 'user',
  action: 'view:details',
  getResourceId: (req) => req.params.userId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = (req as any).params;
    const { by_category = 'false', include_roles = 'false' } = (req as any).query as {
      by_category?: string;
      include_roles?: string;
    };

    let permissions: any;

    if (by_category === 'true') {
      permissions = await permissionService.getUserPermissionsByCategory(userId);
    } else if (include_roles === 'true') {
      permissions = await permissionService.getUserPermissionDetails(userId);
    } else {
      permissions = await permissionService.getUserPermissions(userId);
    }

    // Get user info
    const user: UserInfo | null = await permissionService.db('users')
      .select('id', 'name', 'email', 'active')
      .where('id', userId)
      .first();

    if (!user) {
      res.status(404).json({
        error: 'User not found'
      });
      return;
    }

    const permissionCount = Array.isArray(permissions)
      ? permissions.length
      : Object.values(permissions).flat().length;

    res.json({
      success: true,
      data: {
        user,
        permissions,
        count: permissionCount
      },
      message: 'User permissions retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting user permissions:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'User not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to retrieve user permissions',
        details: error.message
      });
    }
  }
});

/**
 * GET /api/admin/permissions/roles/:roleId - Get permissions for a role
 * Requires: permissions:read or system:admin permission
 */
router.get('/roles/:roleId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view:details',
  getResourceId: (req) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleId } = (req as any).params;
    const permissions = await permissionService.getRolePermissions(roleId);

    res.json({
      success: true,
      data: {
        role_id: roleId,
        permissions,
        count: permissions.length
      },
      message: 'Role permissions retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting role permissions:', error);
    res.status(500).json({
      error: 'Failed to retrieve role permissions',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/permissions/roles/:roleId - Assign permissions to a role
 * Requires: system:admin permission
 */
router.post('/roles/:roleId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
  getResourceId: (req) => req.params.roleId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = assignPermissionsSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { roleId } = (req as any).params;
    const { permission_ids } = value;

    const permissions = await permissionService.assignPermissionsToRole(roleId, permission_ids);

    res.json({
      success: true,
      data: {
        role_id: roleId,
        permissions,
        count: permissions.length
      },
      message: 'Permissions assigned to role successfully'
    });
  } catch (error: any) {
    console.error('Error assigning permissions to role:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Role not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to assign permissions to role',
        details: error.message
      });
    }
  }
});

// ===== GENERIC PARAMETER ROUTES LAST =====

/**
 * GET /api/admin/permissions/:permissionId - Get specific permission details
 */
router.get('/:permissionId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { permissionId } = (req as any).params;

    const permission = await permissionService.findById(permissionId);

    if (!permission) {
      res.status(404).json({
        error: 'Permission not found'
      });
      return;
    }

    // Get roles that have this permission
    const rolesWithPermission: RoleInfo[] = await permissionService.db('roles')
      .join('role_permissions', 'roles.id', 'role_permissions.role_id')
      .where('role_permissions.permission_id', permissionId)
      .where('roles.is_active', true)
      .select('roles.id', 'roles.name', 'roles.description')
      .orderBy('roles.name');

    // Get count of users with this permission (through roles)
    const userCount = await permissionService.db('users')
      .join('user_roles', 'users.id', 'user_roles.user_id')
      .join('role_permissions', 'user_roles.role_id', 'role_permissions.role_id')
      .where('role_permissions.permission_id', permissionId)
      .where('users.active', true)
      .countDistinct('users.id as count')
      .first();

    res.json({
      success: true,
      data: {
        permission: {
          ...permission,
          roles: rolesWithPermission,
          user_count: parseInt(userCount.count) || 0
        }
      },
      message: 'Permission details retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting permission details:', error);
    res.status(500).json({
      error: 'Failed to retrieve permission details',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/permissions/:permissionId - Update a permission
 * Requires: system:admin permission
 */
router.put('/:permissionId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = updatePermissionSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const { permissionId } = (req as any).params;
    const updateData = value as PermissionUpdateData;
    const permission = await permissionService.updatePermission(permissionId, updateData);

    res.json({
      success: true,
      data: { permission },
      message: 'Permission updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating permission:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Permission not found',
        details: error.message
      });
    } else if (error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Permission with this name or code already exists',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to update permission',
        details: error.message
      });
    }
  }
});

/**
 * DELETE /api/admin/permissions/:permissionId - Delete a permission
 * Requires: system:admin permission
 */
router.delete('/:permissionId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'manage_permissions',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { permissionId } = (req as any).params;

    // Don't allow deletion of core permissions
    const corePermissions = [
      'system:admin',
      'permissions:read',
      'permissions:write',
      'roles:read',
      'roles:write',
      'users:read',
      'users:write'
    ];

    const permission = await permissionService.getPermission(permissionId);
    if (permission && corePermissions.includes(permission.code)) {
      res.status(403).json({
        error: 'Cannot delete core system permission',
        details: `The permission "${permission.code}" is a core system permission and cannot be deleted`
      });
      return;
    }

    await permissionService.deletePermission(permissionId);

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting permission:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Permission not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete permission',
        details: error.message
      });
    }
  }
});

export default router;