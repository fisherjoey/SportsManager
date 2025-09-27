// @ts-nocheck

import express from 'express';
const router = express.Router();
import PermissionService from '../services/PermissionService';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';

const permissionService = new PermissionService();

/**
 * @route   GET /api/permissions
 * @desc    Get all permissions
 * @access  Private - Requires permission management
 */
router.get('/', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'view:list',
}), async (req, res) => {
  try {
    const { page, limit, category, search } = req.query;
    const result = await permissionService.getAllPermissions({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      category,
      search
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/permissions/categories
 * @desc    Get all permission categories
 * @access  Private - Requires permission management
 */
router.get('/categories', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'view:categories',
}), async (req, res) => {
  try {
    const categories = await permissionService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/permissions/by-category
 * @desc    Get permissions grouped by category
 * @access  Private - Requires permission management
 */
router.get('/by-category', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'view:by_category',
}), async (req, res) => {
  try {
    const permissions = await permissionService.getPermissionsByCategory();
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions by category:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/permissions/:id
 * @desc    Get permission by ID
 * @access  Private - Requires permission management
 */
router.get('/:id', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'view:details',
  getResourceId: (req) => req.params.id,
}), async (req, res) => {
  try {
    const permission = await permissionService.getPermission(req.params.id);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    res.json(permission);
  } catch (error) {
    console.error('Error fetching permission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/permissions
 * @desc    Create a new permission
 * @access  Private - Requires permission management
 */
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'create',
}), async (req, res) => {
  try {
    const { name, code, description, category, risk_level, resource_type, action } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Permission name is required' });
    }

    const permission = await permissionService.createPermission({
      name,
      code,
      description,
      category,
      risk_level,
      resource_type,
      action
    });

    res.status(201).json(permission);
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/permissions/:id
 * @desc    Update a permission
 * @access  Private - Requires permission management
 */
router.put('/:id', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'update',
  getResourceId: (req) => req.params.id,
}), async (req, res) => {
  try {
    const { name, code, description, category, risk_level, resource_type, action } = req.body;
    
    const permission = await permissionService.updatePermission(req.params.id, {
      name,
      code,
      description,
      category,
      risk_level,
      resource_type,
      action
    });

    res.json(permission);
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/permissions/:id
 * @desc    Delete a permission
 * @access  Private - Requires permission management
 */
router.delete('/:id', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'delete',
  getResourceId: (req) => req.params.id,
}), async (req, res) => {
  try {
    await permissionService.deletePermission(req.params.id);
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/permissions/role/:roleId
 * @desc    Get permissions for a specific role
 * @access  Private - Requires permission management
 */
router.get('/role/:roleId', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'view:role_permissions',
  getResourceId: (req) => req.params.roleId,
}), async (req, res) => {
  try {
    const permissions = await permissionService.getRolePermissions(req.params.roleId);
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/permissions/role/:roleId
 * @desc    Assign permissions to a role
 * @access  Private - Requires permission management
 */
router.post('/role/:roleId', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'assign:role_permissions',
  getResourceId: (req) => req.params.roleId,
}), async (req, res) => {
  try {
    const { permissionIds } = req.body;
    
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'Permission IDs must be an array' });
    }

    const permissions = await permissionService.assignPermissionsToRole(req.params.roleId, permissionIds);
    res.json(permissions);
  } catch (error) {
    console.error('Error assigning permissions to role:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/permissions/user/:userId
 * @desc    Get permissions for a specific user
 * @access  Private - User can get their own permissions, admin can get any
 */
router.get('/user/:userId', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'view:user_permissions',
  getResourceId: (req) => req.params.userId,
}), async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.user.id;
    
    // Check if user is requesting their own permissions or has admin permission
    if (requestedUserId !== currentUserId) {
      const hasPermission = await permissionService.hasPermission(currentUserId, 'manage_permissions');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Unauthorized to view other user permissions' });
      }
    }

    const permissions = await permissionService.getUserPermissions(requestedUserId);
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/permissions/check
 * @desc    Check if current user has specific permissions
 * @access  Private
 */
router.post('/check', authenticateToken, requireCerbosPermission({
  resource: 'permission',
  action: 'check',
}), async (req, res) => {
  try {
    const { permissions } = req.body;
    const userId = req.user.id;
    
    if (!permissions) {
      return res.status(400).json({ error: 'Permissions to check are required' });
    }

    if (Array.isArray(permissions)) {
      const hasAll = await permissionService.hasAllPermissions(userId, permissions);
      const hasAny = await permissionService.hasAnyPermission(userId, permissions);
      res.json({ hasAll, hasAny });
    } else {
      const hasPermission = await permissionService.hasPermission(userId, permissions);
      res.json({ hasPermission });
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;