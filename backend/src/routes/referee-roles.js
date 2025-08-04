const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ResponseFormatter } = require('../utils/response-formatters');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams } = require('../middleware/validation');
const { ErrorFactory } = require('../utils/errors');

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  is_active: Joi.boolean().default(true)
});

const assignRoleSchema = Joi.object({
  role_ids: Joi.array().items(Joi.string().uuid()).min(1).required()
});

// GET /api/referee-roles/available - Get all available roles for admin management
router.get('/available', authenticateToken, requireRole('admin'), enhancedAsyncHandler(async (req, res) => {
  const roles = await db('referee_roles')
    .select('*')
    .where('is_active', true)
    .orderBy('name', 'asc');

  return ResponseFormatter.sendSuccess(res, roles, 'Available roles retrieved successfully');
}));

// GET /api/referee-roles/by-role/:roleName - Get all referees with a specific role
router.get('/by-role/:roleName', authenticateToken, enhancedAsyncHandler(async (req, res) => {
  const { roleName } = req.params;

  const refereesWithRole = await db('users')
    .join('user_roles', 'users.id', 'user_roles.user_id')
    .join('referee_roles', 'user_roles.role_id', 'referee_roles.id')
    .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
    .select(
      'users.id',
      'users.name',
      'users.email',
      'users.phone',
      'users.is_available',
      'users.is_white_whistle',
      'users.postal_code',
      'referee_levels.name as level',
      'referee_levels.wage_amount',
      'user_roles.assigned_at'
    )
    .where('referee_roles.name', roleName)
    .where('users.role', 'referee')
    .orderBy('users.name', 'asc');

  return ResponseFormatter.sendSuccess(res, refereesWithRole, `Referees with role '${roleName}' retrieved successfully`);
}));

// POST /api/referee-roles/:id/assign - Assign roles to a referee (admin only)
router.post('/:id/assign', 
  authenticateToken, 
  requireRole('admin'),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateBody(assignRoleSchema),
  enhancedAsyncHandler(async (req, res) => {
    const refereeId = req.params.id;
    const { role_ids } = req.body;
    const adminId = req.user.id;

    // Verify referee exists
    const referee = await db('users')
      .where('id', refereeId)
      .where('role', 'referee')
      .first();

    if (!referee) {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    // Verify all roles exist and are active
    const roles = await db('referee_roles')
      .whereIn('id', role_ids)
      .where('is_active', true);

    if (roles.length !== role_ids.length) {
      throw ErrorFactory.badRequest('One or more role IDs are invalid or inactive');
    }

    return await db.transaction(async (trx) => {
      // Remove existing role assignments for this referee
      await trx('user_roles').where('user_id', refereeId).del();

      // Add new role assignments
      const roleAssignments = role_ids.map(roleId => ({
        user_id: refereeId,
        role_id: roleId,
        assigned_by: adminId
      }));

      await trx('user_roles').insert(roleAssignments);

      // Get updated referee with roles
      const updatedReferee = await trx('users')
        .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
        .select(
          'users.*',
          'referee_levels.name as level_name',
          'referee_levels.wage_amount'
        )
        .where('users.id', refereeId)
        .first();

      // Get assigned roles
      const assignedRoles = await trx('referee_roles')
        .join('user_roles', 'referee_roles.id', 'user_roles.role_id')
        .select('referee_roles.name', 'referee_roles.description')
        .where('user_roles.user_id', refereeId);

      updatedReferee.roles = assignedRoles;

      return ResponseFormatter.sendSuccess(
        res, 
        updatedReferee, 
        `Roles assigned successfully to ${referee.name}`
      );
    });
  })
);

// POST /api/referee-roles - Create new role (admin only)
router.post('/', 
  authenticateToken, 
  requireRole('admin'),
  validateBody(createRoleSchema),
  enhancedAsyncHandler(async (req, res) => {
    const { name, description, is_active } = req.body;

    // Check if role name already exists
    const existingRole = await db('referee_roles')
      .where('name', name)
      .first();

    if (existingRole) {
      throw ErrorFactory.conflict('Role name already exists', { name });
    }

    const [newRole] = await db('referee_roles')
      .insert({
        name,
        description,
        is_active
      })
      .returning('*');

    return ResponseFormatter.sendCreated(
      res,
      newRole,
      'Role created successfully',
      `/api/referee-roles/${newRole.id}`
    );
  })
);

// PUT /api/referee-roles/:id - Update role (admin only)
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateBody(createRoleSchema),
  enhancedAsyncHandler(async (req, res) => {
    const roleId = req.params.id;
    const { name, description, is_active } = req.body;

    // Check if role exists
    const existingRole = await db('referee_roles').where('id', roleId).first();
    if (!existingRole) {
      throw ErrorFactory.notFound('Role', roleId);
    }

    // Check if new name conflicts with another role
    if (name !== existingRole.name) {
      const nameConflict = await db('referee_roles')
        .where('name', name)
        .whereNot('id', roleId)
        .first();

      if (nameConflict) {
        throw ErrorFactory.conflict('Role name already exists', { name });
      }
    }

    const [updatedRole] = await db('referee_roles')
      .where('id', roleId)
      .update({
        name,
        description,
        is_active,
        updated_at: new Date()
      })
      .returning('*');

    return ResponseFormatter.sendSuccess(res, updatedRole, 'Role updated successfully');
  })
);

// DELETE /api/referee-roles/:id - Deactivate role (admin only)
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  enhancedAsyncHandler(async (req, res) => {
    const roleId = req.params.id;

    // Check if role exists
    const existingRole = await db('referee_roles').where('id', roleId).first();
    if (!existingRole) {
      throw ErrorFactory.notFound('Role', roleId);
    }

    // Deactivate instead of deleting to preserve data integrity
    await db('referee_roles')
      .where('id', roleId)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    return ResponseFormatter.sendSuccess(res, null, 'Role deactivated successfully');
  })
);

module.exports = router;