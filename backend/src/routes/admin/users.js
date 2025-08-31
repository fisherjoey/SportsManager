/**
 * @fileoverview Admin User Management Routes
 * 
 * Endpoints for managing user roles in the RBAC system
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { authenticateToken, requireRole, requirePermission } = require('../../middleware/auth');
const { ResponseFormatter } = require('../../utils/response-formatters');

/**
 * GET /api/admin/users/:userId/roles
 * Get all roles assigned to a user
 */
router.get('/:userId/roles', authenticateToken, requirePermission('users:read'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's roles
    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.name', 'roles.description', 'user_roles.assigned_at', 'user_roles.assigned_by');
    
    return ResponseFormatter.sendSuccess(res, { roles }, 'User roles retrieved successfully');
  } catch (error) {
    console.error('Error getting user roles:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user roles'
    });
  }
});

/**
 * PUT /api/admin/users/:userId/roles
 * Replace all roles for a user (complete replacement)
 */
router.put('/:userId/roles', authenticateToken, requirePermission('roles:assign'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_ids } = req.body;
    
    if (!Array.isArray(role_ids)) {
      return res.status(400).json({
        success: false,
        error: 'role_ids must be an array'
      });
    }
    
    // Verify user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify all roles exist
    if (role_ids.length > 0) {
      const roles = await db('roles').whereIn('id', role_ids);
      if (roles.length !== role_ids.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more roles not found'
        });
      }
    }
    
    // Use transaction to ensure atomicity
    await db.transaction(async (trx) => {
      // Remove existing roles
      await trx('user_roles').where('user_id', userId).del();
      
      // Add new roles
      if (role_ids.length > 0) {
        const roleAssignments = role_ids.map(roleId => ({
          user_id: userId,
          role_id: roleId,
          assigned_at: new Date(),
          assigned_by: req.user.id
        }));
        
        await trx('user_roles').insert(roleAssignments);
      }
    });
    
    // Get updated roles
    const updatedRoles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.name', 'roles.description');
    
    return ResponseFormatter.sendSuccess(res, { 
      user: { 
        id: userId, 
        email: user.email,
        roles: updatedRoles 
      } 
    }, 'User roles updated successfully');
  } catch (error) {
    console.error('Error updating user roles:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user roles'
    });
  }
});

/**
 * POST /api/admin/users/:userId/roles
 * Add roles to a user (additive)
 */
router.post('/:userId/roles', authenticateToken, requirePermission('roles:assign'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_ids } = req.body;
    
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'role_ids must be a non-empty array'
      });
    }
    
    // Verify user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify all roles exist
    const roles = await db('roles').whereIn('id', role_ids);
    if (roles.length !== role_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more roles not found'
      });
    }
    
    // Get existing roles
    const existingRoles = await db('user_roles')
      .where('user_id', userId)
      .pluck('role_id');
    
    // Filter out roles that are already assigned
    const newRoleIds = role_ids.filter(id => !existingRoles.includes(id));
    
    if (newRoleIds.length > 0) {
      const roleAssignments = newRoleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_at: new Date(),
        assigned_by: req.user.id
      }));
      
      await db('user_roles').insert(roleAssignments);
    }
    
    // Get updated roles
    const updatedRoles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.name', 'roles.description');
    
    return ResponseFormatter.sendSuccess(res, { 
      user: { 
        id: userId, 
        email: user.email,
        roles: updatedRoles 
      } 
    }, 'Roles added successfully');
  } catch (error) {
    console.error('Error adding roles to user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add roles to user'
    });
  }
});

/**
 * DELETE /api/admin/users/:userId/roles
 * Remove roles from a user
 */
router.delete('/:userId/roles', authenticateToken, requirePermission('roles:assign'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_ids } = req.body;
    
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'role_ids must be a non-empty array'
      });
    }
    
    // Verify user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Remove the specified roles
    await db('user_roles')
      .where('user_id', userId)
      .whereIn('role_id', role_ids)
      .del();
    
    // Get updated roles
    const updatedRoles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.name', 'roles.description');
    
    return ResponseFormatter.sendSuccess(res, { 
      user: { 
        id: userId, 
        email: user.email,
        roles: updatedRoles 
      } 
    }, 'Roles removed successfully');
  } catch (error) {
    console.error('Error removing roles from user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove roles from user'
    });
  }
});

module.exports = router;