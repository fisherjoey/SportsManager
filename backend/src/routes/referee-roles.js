const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ResponseFormatter } = require('../utils/response-formatters');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { ErrorFactory } = require('../utils/errors');
const UserService = require('../services/UserService');

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
    
    if (parseInt(assignmentsCount.count) > 0) {\n      throw ErrorFactory.conflict(\n        'Cannot delete role that is currently assigned to users', \n        { assigned_users: assignmentsCount.count }\n      );\n    }\n    \n    // Soft delete by setting is_active to false\n    await db('referee_roles')\n      .where('id', roleId)\n      .update({ \n        is_active: false,\n        updated_at: new Date()\n      });\n    \n    return ResponseFormatter.sendSuccess(res, null, 'Referee role deleted successfully');\n  })\n);\n\n// POST /api/referee-roles/assign - Assign role to referee (admin only)\nrouter.post('/assign',\n  authenticateToken,\n  requireRole('admin'),\n  validateBody(AssignRoleSchema),\n  enhancedAsyncHandler(async (req, res) => {\n    const { user_id, role_name } = req.body;\n    \n    try {\n      const assignment = await userService.assignRefereeRole(\n        user_id, \n        role_name, \n        req.user.id\n      );\n      \n      return ResponseFormatter.sendCreated(\n        res, \n        assignment, \n        `Role '${role_name}' assigned successfully`\n      );\n    } catch (error) {\n      if (error.message.includes('already has role') || \n          error.message.includes('not found') ||\n          error.message.includes('not a referee')) {\n        throw ErrorFactory.conflict(error.message);\n      }\n      throw error;\n    }\n  })\n);\n\n// POST /api/referee-roles/remove - Remove role from referee (admin only)\nrouter.post('/remove',\n  authenticateToken,\n  requireRole('admin'),\n  validateBody(RemoveRoleSchema),\n  enhancedAsyncHandler(async (req, res) => {\n    const { user_id, role_name } = req.body;\n    \n    // Prevent removal of default 'Referee' role\n    if (role_name === 'Referee') {\n      throw ErrorFactory.forbidden('Cannot remove default Referee role');\n    }\n    \n    const success = await userService.removeRefereeRole(user_id, role_name);\n    \n    if (!success) {\n      throw ErrorFactory.notFound('Role assignment not found');\n    }\n    \n    return ResponseFormatter.sendSuccess(\n      res, \n      null, \n      `Role '${role_name}' removed successfully`\n    );\n  })\n);\n\n// GET /api/referee-roles/user/:userId - Get roles for specific user\nrouter.get('/user/:userId',\n  authenticateToken,\n  validateParams(Joi.object({ userId: Joi.string().uuid().required() })),\n  enhancedAsyncHandler(async (req, res) => {\n    const userId = req.params.userId;\n    \n    // Check permissions - users can view their own roles, admins can view any\n    if (req.user.role !== 'admin' && req.user.id !== userId) {\n      throw ErrorFactory.forbidden('Can only view your own roles');\n    }\n    \n    // Verify user exists and is a referee\n    const user = await db('users')\n      .where('id', userId)\n      .first();\n    \n    if (!user) {\n      throw ErrorFactory.notFound('User', userId);\n    }\n    \n    if (user.role !== 'referee') {\n      throw ErrorFactory.forbidden('User is not a referee');\n    }\n    \n    // Get user's roles\n    const userRoles = await db('user_referee_roles')\n      .join('referee_roles', 'user_referee_roles.referee_role_id', 'referee_roles.id')\n      .select(\n        'referee_roles.id',\n        'referee_roles.name',\n        'referee_roles.description',\n        'referee_roles.permissions',\n        'user_referee_roles.assigned_at',\n        'user_referee_roles.assigned_by'\n      )\n      .where('user_referee_roles.user_id', userId)\n      .where('user_referee_roles.is_active', true)\n      .where('referee_roles.is_active', true)\n      .orderBy('referee_roles.name', 'asc');\n    \n    // Parse permissions for each role\n    const enhancedRoles = userRoles.map(role => ({\n      ...role,\n      permissions: typeof role.permissions === 'string' \n        ? JSON.parse(role.permissions) \n        : role.permissions\n    }));\n    \n    return ResponseFormatter.sendSuccess(\n      res, \n      {\n        user: {\n          id: user.id,\n          name: user.name,\n          email: user.email\n        },\n        roles: enhancedRoles\n      }, \n      'User roles retrieved successfully'\n    );\n  })\n);\n\n// GET /api/referee-roles/permissions/summary - Get permissions summary for all roles\nrouter.get('/permissions/summary',\n  authenticateToken,\n  requireRole('admin'),\n  enhancedAsyncHandler(async (req, res) => {\n    const roles = await db('referee_roles')\n      .where('is_active', true)\n      .select('name', 'permissions')\n      .orderBy('name', 'asc');\n    \n    const permissionsSummary = roles.map(role => {\n      const permissions = typeof role.permissions === 'string' \n        ? JSON.parse(role.permissions) \n        : role.permissions;\n      \n      return {\n        role_name: role.name,\n        permissions: Object.keys(permissions).filter(key => permissions[key] === true)\n      };\n    });\n    \n    return ResponseFormatter.sendSuccess(\n      res,\n      permissionsSummary,\n      'Permissions summary retrieved successfully'\n    );\n  })\n);\n\nmodule.exports = router;"}