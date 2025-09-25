/**
 * Admin Permission Management Routes
 * 
 * Provides permission listing and management functionality for administrators:
 * - List all permissions with filtering
 * - Get permissions by category
 * - Search permissions
 * - Permission metadata and statistics
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticateToken, requireRole, requirePermission, requireAnyPermission } = require('../../middleware/auth');
const PermissionService = require('../../services/PermissionService');

// Initialize services
const permissionService = new PermissionService();

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

// GET /api/admin/permissions - Get all permissions with optional filtering
// Requires: permissions:read or system:admin permission
router.get('/', authenticateToken, requireAnyPermission(['permissions:read', 'system:admin']), async (req, res) => {
  try {
    const { active_only = 'true', use_cache = 'true' } = req.query;
    
    const permissions = await permissionService.getPermissionsByCategory({
      activeOnly: active_only === 'true',
      useCache: use_cache === 'true'
    });

    // Calculate statistics
    const stats = Object.keys(permissions).reduce((acc, category) => {
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
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve permissions',
      details: error.message 
    });
  }
});

// GET /api/admin/permissions/categories - Get unique permission categories
// Requires: permissions:read or system:admin permission
router.get('/categories', authenticateToken, requireAnyPermission(['permissions:read', 'system:admin']), async (req, res) => {
  try {
    const { active_only = 'true' } = req.query;
    
    const query = permissionService.db('permissions')
      .distinct('category')
      .orderBy('category');
    
    if (active_only === 'true') {
      query.where('active', true);
    }

    const results = await query;
    const categories = results.map(row => row.category || 'uncategorized');

    res.json({
      success: true,
      data: { categories },
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve categories',
      details: error.message 
    });
  }
});

// GET /api/admin/permissions/category/:category - Get permissions for specific category
// Requires: permissions:read or system:admin permission
router.get('/category/:category', authenticateToken, requireAnyPermission(['permissions:read', 'system:admin']), async (req, res) => {
  try {
    const { category } = req.params;
    const { active_only = 'true' } = req.query;
    
    const permissions = await permissionService.findWhere(
      { category },
      { 
        orderBy: 'name',
        orderDirection: 'asc'
      }
    );

    const filteredPermissions = active_only === 'true' 
      ? permissions.filter(p => p.active)
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
  } catch (error) {
    console.error('Error getting category permissions:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve category permissions',
      details: error.message 
    });
  }
});

// POST /api/admin/permissions/search - Search permissions
router.post('/search', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { query, category, active_only = true, limit = 50 } = value;
    
    const permissions = await permissionService.searchPermissions(query, {
      category,
      activeOnly: active_only,
      limit
    });

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
  } catch (error) {
    console.error('Error searching permissions:', error);
    res.status(500).json({ 
      error: 'Failed to search permissions',
      details: error.message 
    });
  }
});

// DELETE /api/admin/permissions/:permissionId - Delete a permission
// Requires: system:admin permission
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = createPermissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const permission = await permissionService.createPermission(value);

    res.status(201).json({
      success: true,
      data: { permission },
      message: 'Permission created successfully'
    });
  } catch (error) {
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

// GET /api/admin/permissions/:permissionId - Get specific permission details
router.get('/:permissionId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { permissionId } = req.params;
    
    const permission = await permissionService.findById(permissionId);

    if (!permission) {
      return res.status(404).json({ 
        error: 'Permission not found'
      });
    }

    // Get roles that have this permission
    const rolesWithPermission = await permissionService.db('roles')
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
  } catch (error) {
    console.error('Error getting permission details:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve permission details',
      details: error.message 
    });
  }
});

// POST /api/admin/permissions/users/bulk-check - Bulk permission check for users
router.post('/users/bulk-check', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = userPermissionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { user_ids } = value;
    const { permission } = req.query;

    if (!permission) {
      return res.status(400).json({ 
        error: 'Permission parameter is required'
      });
    }

    const results = await permissionService.bulkPermissionCheck(user_ids, permission);

    res.json({
      success: true,
      data: { 
        permission,
        results,
        summary: {
          total_users: user_ids.length,
          users_with_permission: Object.values(results).filter(Boolean).length,
          users_without_permission: Object.values(results).filter(result => !result).length
        }
      },
      message: 'Bulk permission check completed'
    });
  } catch (error) {
    console.error('Error in bulk permission check:', error);
    res.status(500).json({ 
      error: 'Failed to perform bulk permission check',
      details: error.message 
    });
  }
});

// GET /api/admin/permissions/users/:userId - Get user's permissions with details
router.get('/users/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { by_category = 'false', include_roles = 'false' } = req.query;

    let permissions;
    
    if (by_category === 'true') {
      permissions = await permissionService.getUserPermissionsByCategory(userId);
    } else if (include_roles === 'true') {
      permissions = await permissionService.getUserPermissionDetails(userId);
    } else {
      permissions = await permissionService.getUserPermissions(userId);
    }

    // Get user info
    const user = await permissionService.db('users')
      .select('id', 'name', 'email', 'active')
      .where('id', userId)
      .first();

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { 
        user,
        permissions,
        count: Array.isArray(permissions) 
          ? permissions.length 
          : Object.values(permissions).flat().length
      },
      message: 'User permissions retrieved successfully'
    });
  } catch (error) {
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

// GET /api/admin/permissions/cache/stats - Get permission cache statistics
router.get('/cache/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = permissionService.getCacheStats();

    res.json({
      success: true,
      data: { cache_stats: stats },
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve cache statistics',
      details: error.message 
    });
  }
});

// PUT /api/admin/permissions/:permissionId - Update a permission
// Requires: system:admin permission
router.put('/:permissionId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = updatePermissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { permissionId } = req.params;
    const permission = await permissionService.updatePermission(permissionId, value);

    res.json({
      success: true,
      data: { permission },
      message: 'Permission updated successfully'
    });
  } catch (error) {
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

// DELETE /api/admin/permissions/cache - Clear permission cache
router.delete('/cache', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { user_id } = req.query;

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
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      details: error.message 
    });
  }
});

// DELETE /api/admin/permissions/:permissionId - Delete a permission
// Requires: system:admin permission
router.delete('/:permissionId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { permissionId } = req.params;
    
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
      return res.status(403).json({ 
        error: 'Cannot delete core system permission',
        details: `The permission "${permission.code}" is a core system permission and cannot be deleted` 
      });
    }

    await permissionService.deletePermission(permissionId);

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
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

// GET /api/admin/permissions/roles/:roleId - Get permissions for a role
// Requires: permissions:read or system:admin permission
router.get('/roles/:roleId', authenticateToken, requireAnyPermission(['permissions:read', 'system:admin']), async (req, res) => {
  try {
    const { roleId } = req.params;
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
  } catch (error) {
    console.error('Error getting role permissions:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve role permissions',
      details: error.message 
    });
  }
});

// POST /api/admin/permissions/roles/:roleId - Assign permissions to a role
// Requires: system:admin permission
router.post('/roles/:roleId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = assignPermissionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { roleId } = req.params;
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
  } catch (error) {
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

module.exports = router;