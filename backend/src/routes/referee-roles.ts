// @ts-nocheck

import express from 'express';
const router = express.Router();
import db from '../config/database';
import Joi from 'joi';
import { authenticateToken, requireRole  } from '../middleware/auth';
import { ResponseFormatter  } from '../utils/response-formatters';
import { enhancedAsyncHandler  } from '../middleware/enhanced-error-handling';
import { validateBody, validateParams, validateQuery  } from '../middleware/validation';
import { ErrorFactory  } from '../utils/errors';
import UserService from '../services/UserService';

// Initialize UserService
const userService = new UserService(db);

// Validation schemas
const RoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(500).optional(),
  permissions: Joi.object({
    can_officiate: Joi.boolean().default(false),
    can_evaluate: Joi.boolean().default(false),
    can_mentor: Joi.boolean().default(false),
    can_assign: Joi.boolean().default(false),
    can_inspect: Joi.boolean().default(false),
    can_audit: Joi.boolean().default(false),
    can_be_assigned: Joi.boolean().default(true),
    receives_full_fee: Joi.boolean().default(false),
    has_admin_access: Joi.boolean().default(false),
    has_scheduling_access: Joi.boolean().default(false),
    can_view_all_games: Joi.boolean().default(false),
    can_coordinate: Joi.boolean().default(false),
    is_default: Joi.boolean().default(false)
  }).default({}),
  is_active: Joi.boolean().default(true)
});

const AssignRoleSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  role_name: Joi.string().required()
});

const RemoveRoleSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  role_name: Joi.string().required()
});

const IdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

// GET /api/referee-roles - Get all referee roles
router.get('/', 
  authenticateToken,
  enhancedAsyncHandler(async (req, res) => {
    const { include_inactive } = req.query;
    
    let query = db('referee_roles')
      .select('*')
      .orderBy('name', 'asc');
    
    if (!include_inactive) {
      query = query.where('is_active', true);
    }
    
    const roles = await query;
    
    // Parse permissions JSON for each role
    const enhancedRoles = roles.map(role => ({
      ...role,
      permissions: typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions
    }));
    
    return ResponseFormatter.sendSuccess(res, enhancedRoles, 'Referee roles retrieved successfully');
  })
);

// GET /api/referee-roles/:id - Get specific referee role
router.get('/:id',
  authenticateToken,
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const roleId = req.params.id;
    
    const role = await db('referee_roles')
      .where('id', roleId)
      .first();
    
    if (!role) {
      throw ErrorFactory.notFound('Referee role', roleId);
    }
    
    // Parse permissions JSON
    role.permissions = typeof role.permissions === 'string' 
      ? JSON.parse(role.permissions) 
      : role.permissions;
    
    // Get users with this role
    const usersWithRole = await db('user_referee_roles')
      .join('users', 'user_referee_roles.user_id', 'users.id')
      .select(
        'users.id',
        'users.name',
        'users.email',
        'user_referee_roles.assigned_at',
        'user_referee_roles.is_active'
      )
      .where('user_referee_roles.referee_role_id', roleId)
      .where('user_referee_roles.is_active', true)
      .orderBy('users.name', 'asc');
    
    role.assigned_users = usersWithRole;
    
    return ResponseFormatter.sendSuccess(res, role, 'Referee role retrieved successfully');
  })
);

// POST /api/referee-roles - Create new referee role (admin only)
router.post('/',
  authenticateToken,
  requireRole('admin'),
  validateBody(RoleSchema),
  enhancedAsyncHandler(async (req, res) => {
    const roleData = req.body;
    
    // Check if role name already exists
    const existingRole = await db('referee_roles')
      .where('name', roleData.name)
      .first();
    
    if (existingRole) {
      throw ErrorFactory.conflict('Role name already exists', { name: roleData.name });
    }
    
    // Create role
    const [newRole] = await db('referee_roles')
      .insert({
        id: db.raw('gen_random_uuid()'),
        name: roleData.name,
        description: roleData.description,
        permissions: JSON.stringify(roleData.permissions),
        is_active: roleData.is_active,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    // Parse permissions for response
    newRole.permissions = typeof newRole.permissions === 'string' 
      ? JSON.parse(newRole.permissions) 
      : newRole.permissions;
    
    return ResponseFormatter.sendCreated(
      res, 
      newRole, 
      'Referee role created successfully',
      `/api/referee-roles/${newRole.id}`
    );
  })
);

// PUT /api/referee-roles/:id - Update referee role (admin only)
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  validateParams(IdParamSchema),
  validateBody(RoleSchema),
  enhancedAsyncHandler(async (req, res) => {
    const roleId = req.params.id;
    const updateData = req.body;
    
    // Check if role exists
    const existingRole = await db('referee_roles')
      .where('id', roleId)
      .first();
    
    if (!existingRole) {
      throw ErrorFactory.notFound('Referee role', roleId);
    }
    
    // Check if name change conflicts with existing role
    if (updateData.name !== existingRole.name) {
      const nameConflict = await db('referee_roles')
        .where('name', updateData.name)
        .whereNot('id', roleId)
        .first();
      
      if (nameConflict) {
        throw ErrorFactory.conflict('Role name already exists', { name: updateData.name });
      }
    }
    
    // Update role
    const [updatedRole] = await db('referee_roles')
      .where('id', roleId)
      .update({
        name: updateData.name,
        description: updateData.description,
        permissions: JSON.stringify(updateData.permissions),
        is_active: updateData.is_active,
        updated_at: new Date()
      })
      .returning('*');
    
    // Parse permissions for response
    updatedRole.permissions = typeof updatedRole.permissions === 'string' 
      ? JSON.parse(updatedRole.permissions) 
      : updatedRole.permissions;
    
    return ResponseFormatter.sendSuccess(res, updatedRole, 'Referee role updated successfully');
  })
);

// DELETE /api/referee-roles/:id - Delete referee role (admin only)
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const roleId = req.params.id;
    
    // Check if role exists
    const existingRole = await db('referee_roles')
      .where('id', roleId)
      .first();
    
    if (!existingRole) {
      throw ErrorFactory.notFound('Referee role', roleId);
    }
    
    // Check if role is in use
    const assignmentsCount = await db('user_referee_roles')
      .where('referee_role_id', roleId)
      .where('is_active', true)
      .count('* as count')
      .first();
    
    if (parseInt(assignmentsCount.count, 10) > 0) {
      throw ErrorFactory.conflict(
        'Cannot delete role that is currently assigned to users', 
        { assigned_users: assignmentsCount.count }
      );
    }
    
    // Soft delete by setting is_active to false
    await db('referee_roles')
      .where('id', roleId)
      .update({ 
        is_active: false,
        updated_at: new Date()
      });
    
    return ResponseFormatter.sendSuccess(res, null, 'Referee role deleted successfully');
  })
);

// POST /api/referee-roles/assign - Assign role to referee (admin only)
router.post('/assign',
  authenticateToken,
  requireRole('admin'),
  validateBody(AssignRoleSchema),
  enhancedAsyncHandler(async (req, res) => {
    const { user_id, role_name } = req.body;
    
    try {
      const assignment = await userService.assignRefereeRole(
        user_id, 
        role_name, 
        req.user.id
      );
      
      return ResponseFormatter.sendCreated(
        res, 
        assignment, 
        `Role '${role_name}' assigned successfully`
      );
    } catch (error) {
      if (error.message.includes('already has role') || 
          error.message.includes('not found') ||
          error.message.includes('not a referee')) {
        throw ErrorFactory.conflict(error.message);
      }
      throw error;
    }
  })
);

// POST /api/referee-roles/remove - Remove role from referee (admin only)
router.post('/remove',
  authenticateToken,
  requireRole('admin'),
  validateBody(RemoveRoleSchema),
  enhancedAsyncHandler(async (req, res) => {
    const { user_id, role_name } = req.body;
    
    // Prevent removal of default 'Referee' role
    if (role_name === 'Referee') {
      throw ErrorFactory.forbidden('Cannot remove default Referee role');
    }
    
    const success = await userService.removeRefereeRole(user_id, role_name);
    
    if (!success) {
      throw ErrorFactory.notFound('Role assignment not found');
    }
    
    return ResponseFormatter.sendSuccess(
      res, 
      null, 
      `Role '${role_name}' removed successfully`
    );
  })
);

// GET /api/referee-roles/user/:userId - Get roles for specific user
router.get('/user/:userId',
  authenticateToken,
  validateParams(Joi.object({ userId: Joi.string().uuid().required() })),
  enhancedAsyncHandler(async (req, res) => {
    const userId = req.params.userId;
    
    // Check permissions - users can view their own roles, admins can view any
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      throw ErrorFactory.forbidden('Can only view your own roles');
    }
    
    // Verify user exists and is a referee
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw ErrorFactory.notFound('User', userId);
    }
    
    if (user.role !== 'referee') {
      throw ErrorFactory.forbidden('User is not a referee');
    }
    
    // Get user's roles
    const userRoles = await db('user_referee_roles')
      .join('referee_roles', 'user_referee_roles.referee_role_id', 'referee_roles.id')
      .select(
        'referee_roles.id',
        'referee_roles.name',
        'referee_roles.description',
        'referee_roles.permissions',
        'user_referee_roles.assigned_at',
        'user_referee_roles.assigned_by'
      )
      .where('user_referee_roles.user_id', userId)
      .where('user_referee_roles.is_active', true)
      .where('referee_roles.is_active', true)
      .orderBy('referee_roles.name', 'asc');
    
    // Parse permissions for each role
    const enhancedRoles = userRoles.map(role => ({
      ...role,
      permissions: typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions
    }));
    
    return ResponseFormatter.sendSuccess(
      res, 
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        roles: enhancedRoles
      }, 
      'User roles retrieved successfully'
    );
  })
);

// GET /api/referee-roles/permissions/summary - Get permissions summary for all roles
router.get('/permissions/summary',
  authenticateToken,
  requireRole('admin'),
  enhancedAsyncHandler(async (req, res) => {
    const roles = await db('referee_roles')
      .where('is_active', true)
      .select('name', 'permissions')
      .orderBy('name', 'asc');
    
    const permissionsSummary = roles.map(role => {
      const permissions = typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions;
      
      return {
        role_name: role.name,
        permissions: Object.keys(permissions).filter(key => permissions[key] === true)
      };
    });
    
    return ResponseFormatter.sendSuccess(
      res,
      permissionsSummary,
      'Permissions summary retrieved successfully'
    );
  })
);

export default router;