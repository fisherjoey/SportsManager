/**
 * Admin Role Management Routes
 * 
 * Provides comprehensive role management functionality for administrators:
 * - CRUD operations for roles
 * - Permission assignment/removal
 * - User role management
 * - Role activation/deactivation
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticateToken, requirePermission, requireRole, requireAnyPermission } = require('../../middleware/auth');
const RoleService = require('../../services/RoleService');

// Initialize services
const roleService = new RoleService();

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().min(5).max(500),
  code: Joi.string().min(2).max(20).pattern(/^[A-Z_]+$/),
  category: Joi.string().min(2).max(30),
  is_system: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true),
  permissions: Joi.array().items(Joi.string().uuid())
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  description: Joi.string().min(5).max(500),
  code: Joi.string().min(2).max(20).pattern(/^[A-Z_]+$/),
  category: Joi.string().min(2).max(30),
  is_active: Joi.boolean(),
  permissions: Joi.array().items(Joi.string().uuid())
});

const assignPermissionsSchema = Joi.object({
  permission_ids: Joi.array().items(Joi.string().uuid()).required().min(1)
});

const removePermissionsSchema = Joi.object({
  permission_ids: Joi.array().items(Joi.string().uuid()).required().min(1)
});

const assignUserRoleSchema = Joi.object({
  user_ids: Joi.array().items(Joi.string().uuid()).required().min(1)
});

// GET /api/admin/roles - Get all roles with metadata
// Requires: roles:read or system:admin permission
router.get('/', authenticateToken, requireAnyPermission(['roles:read', 'system:admin']), async (req, res) => {
  console.log('Admin roles endpoint hit - User:', req.user?.email, 'Role:', req.user?.role);
  try {
    const { include_inactive } = req.query;
    const roles = await roleService.getRolesWithMetadata({
      includeInactive: include_inactive === 'true'
    });

    res.json({
      success: true,
      data: { roles },
      message: 'Roles retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve roles',
      details: error.message 
    });
  }
});

// GET /api/admin/roles/:roleId - Get specific role with permissions
// Requires: roles:read or system:admin permission
router.get('/:roleId', authenticateToken, requireAnyPermission(['roles:read', 'system:admin']), async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await roleService.getRoleWithPermissions(roleId);

    res.json({
      success: true,
      data: { role },
      message: 'Role retrieved successfully'
    });
  } catch (error) {
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

// POST /api/admin/roles - Create new role
// Requires: roles:create or system:admin permission
router.post('/', authenticateToken, requireAnyPermission(['roles:create', 'system:admin']), async (req, res) => {
  try {
    const { error, value } = createRoleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { permissions, ...roleData } = value;
    const role = await roleService.createRole(roleData, permissions);

    res.status(201).json({
      success: true,
      data: { role },
      message: 'Role created successfully'
    });
  } catch (error) {
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

// PUT /api/admin/roles/:roleId - Update role
// Requires: roles:update or system:admin permission
router.put('/:roleId', authenticateToken, requireAnyPermission(['roles:update', 'system:admin']), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { error, value } = updateRoleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { permissions, ...roleData } = value;
    const role = await roleService.updateRole(roleId, roleData, permissions);

    res.json({
      success: true,
      data: { role },
      message: 'Role updated successfully'
    });
  } catch (error) {
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

// DELETE /api/admin/roles/:roleId - Delete role
// Requires: roles:delete or system:admin permission
router.delete('/:roleId', authenticateToken, requireAnyPermission(['roles:delete', 'system:admin']), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { force } = req.query;

    // Check if role can be deleted
    const safetyCheck = await roleService.canDeleteRole(roleId);
    if (!safetyCheck.canDelete && force !== 'true') {
      return res.status(400).json({ 
        error: 'Cannot delete role',
        details: safetyCheck.reason,
        suggestion: 'Use force=true query parameter to force deletion'
      });
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
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ 
      error: 'Failed to delete role',
      details: error.message 
    });
  }
});

// POST /api/admin/roles/:roleId/permissions - Assign permissions to role
router.post('/:roleId/permissions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { error, value } = assignPermissionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { permission_ids } = value;
    await roleService.assignPermissionsToRole(roleId, permission_ids);
    
    const updatedRole = await roleService.getRoleWithPermissions(roleId);

    res.json({
      success: true,
      data: { role: updatedRole },
      message: 'Permissions assigned successfully'
    });
  } catch (error) {
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

// DELETE /api/admin/roles/:roleId/permissions - Remove permissions from role
router.delete('/:roleId/permissions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { error, value } = removePermissionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details[0].message 
      });
    }

    const { permission_ids } = value;
    const removedCount = await roleService.removePermissionsFromRole(roleId, permission_ids);
    
    const updatedRole = await roleService.getRoleWithPermissions(roleId);

    res.json({
      success: true,
      data: { 
        role: updatedRole,
        removed_count: removedCount
      },
      message: 'Permissions removed successfully'
    });
  } catch (error) {
    console.error('Error removing permissions:', error);
    res.status(500).json({ 
      error: 'Failed to remove permissions',
      details: error.message 
    });
  }
});

// GET /api/admin/roles/:roleId/users - Get users with this role
router.get('/:roleId/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { page = 1, limit = 50, include_inactive } = req.query;

    const result = await roleService.getUsersWithRole(roleId, {
      page: parseInt(page),
      limit: parseInt(limit),
      includeInactive: include_inactive === 'true'
    });

    res.json({
      success: true,
      data: result,
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting users with role:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to retrieve users',
      details: error.message 
    });
  }
});

// POST /api/admin/roles/:roleId/users - Add users to role
router.post('/:roleId/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'user_ids must be a non-empty array' 
      });
    }

    const result = await roleService.addUsersToRole(roleId, user_ids);

    res.json({
      success: true,
      data: result,
      message: 'Users added to role successfully'
    });
  } catch (error) {
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

// DELETE /api/admin/roles/:roleId/users - Remove users from role
router.delete('/:roleId/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'user_ids must be a non-empty array' 
      });
    }

    const result = await roleService.removeUsersFromRole(roleId, user_ids);

    res.json({
      success: true,
      data: result,
      message: 'Users removed from role successfully'
    });
  } catch (error) {
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

// PATCH /api/admin/roles/:roleId/status - Activate/deactivate role
router.patch('/:roleId/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'is_active field must be a boolean' 
      });
    }

    const updatedRole = await roleService.setRoleStatus(roleId, is_active);

    res.json({
      success: true,
      data: { role: updatedRole },
      message: `Role ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
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

// GET /api/admin/roles/:roleId/hierarchy - Get role hierarchy (future feature)
router.get('/:roleId/hierarchy', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const hierarchy = await roleService.getRoleHierarchy(roleId);

    res.json({
      success: true,
      data: { hierarchy },
      message: 'Role hierarchy retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting role hierarchy:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve role hierarchy',
      details: error.message 
    });
  }
});

module.exports = router;