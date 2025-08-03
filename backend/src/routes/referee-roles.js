const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ResponseFormatter } = require('../utils/response-formatters');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams } = require('../middleware/validation');
const { ErrorFactory } = require('../utils/errors');

/**
 * Referee Roles Management Routes
 * 
 * These routes handle admin-defined roles for referees as specified in CLAUDE.md:
 * - Roles are admin-defined (e.g. Referee, Evaluator, Mentor, Regional Lead)
 * - Replace the old certifications system
 */

// Validation schemas
const RoleUpdateSchema = Joi.object({
  roles: Joi.array().items(
    Joi.string().valid('Referee', 'Evaluator', 'Mentor', 'Regional Lead', 'Assignor', 'Inspector')
  ).min(1).required()
});

const IdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

// GET /api/referee-roles/available - Get list of available roles for referees
router.get('/available', authenticateToken, requireRole('admin'), enhancedAsyncHandler(async (req, res) => {
  const availableRoles = [
    {
      name: 'Referee',
      description: 'Standard referee role for officiating games',
      is_default: true
    },
    {
      name: 'Evaluator',
      description: 'Evaluates referee performance and provides feedback',
      is_default: false
    },
    {
      name: 'Mentor',
      description: 'Mentors new and developing referees',
      is_default: false
    },
    {
      name: 'Regional Lead',
      description: 'Regional leadership and coordination role',
      is_default: false
    },
    {
      name: 'Assignor',
      description: 'Assigns referees to games and manages schedules',
      is_default: false
    },
    {
      name: 'Inspector',
      description: 'Inspects and audits referee performance at games',
      is_default: false
    }
  ];

  return ResponseFormatter.sendSuccess(res, availableRoles, 'Available referee roles retrieved successfully');
}));

// PUT /api/referee-roles/:id/assign - Assign roles to a specific referee (admin only)
router.put('/:id/assign', 
  authenticateToken, 
  requireRole('admin'), 
  validateParams(IdParamSchema),
  validateBody(RoleUpdateSchema),
  enhancedAsyncHandler(async (req, res) => {
    const refereeId = req.params.id;
    const { roles } = req.body;

    // Verify referee exists
    const referee = await db('users')
      .where('id', refereeId)
      .where('role', 'referee')
      .first();

    if (!referee) {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    // Update referee roles
    const updatedReferee = await db('users')
      .where('id', refereeId)
      .update({
        roles: JSON.stringify(roles),
        updated_at: new Date()
      })
      .returning(['id', 'name', 'email', 'roles']);

    // Get the updated referee with level information
    const refereeWithDetails = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .where('users.id', refereeId)
      .select(
        'users.id',
        'users.name',
        'users.email',
        'users.roles',
        'users.is_white_whistle',
        'referee_levels.name as level_name'
      )
      .first();

    return ResponseFormatter.sendSuccess(
      res, 
      refereeWithDetails, 
      `Referee roles updated successfully. Assigned roles: ${roles.join(', ')}`
    );
  })
);

// GET /api/referee-roles/:id - Get roles for a specific referee
router.get('/:id', 
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const refereeId = req.params.id;

    const referee = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .where('users.id', refereeId)
      .where('users.role', 'referee')
      .select(
        'users.id',
        'users.name',
        'users.email',
        'users.roles',
        'users.is_white_whistle',
        'referee_levels.name as level_name',
        db.raw(`
          CASE 
            WHEN referee_levels.name IN ('Rookie', 'Junior') AND users.is_white_whistle = true 
            THEN true 
            ELSE false 
          END as should_display_white_whistle
        `)
      )
      .first();

    if (!referee) {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    // Parse roles array if it's a string
    if (typeof referee.roles === 'string') {
      try {
        referee.roles = JSON.parse(referee.roles);
      } catch (e) {
        // If parsing fails, convert PostgreSQL array format
        referee.roles = referee.roles.replace(/[{}]/g, '').split(',');
      }
    }

    return ResponseFormatter.sendSuccess(res, referee, 'Referee roles retrieved successfully');
  })
);

// GET /api/referee-roles/by-role/:roleName - Get all referees with a specific role
router.get('/by-role/:roleName', 
  validateParams(Joi.object({
    roleName: Joi.string().valid('Referee', 'Evaluator', 'Mentor', 'Regional Lead', 'Assignor', 'Inspector').required()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const roleName = req.params.roleName;

    const referees = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .where('users.role', 'referee')
      .whereRaw(`users.roles @> ?`, [JSON.stringify([roleName])])
      .select(
        'users.id',
        'users.name',
        'users.email',
        'users.roles',
        'users.is_available',
        'users.is_white_whistle',
        'referee_levels.name as level_name',
        db.raw(`
          CASE 
            WHEN referee_levels.name IN ('Rookie', 'Junior') AND users.is_white_whistle = true 
            THEN true 
            ELSE false 
          END as should_display_white_whistle
        `)
      )
      .orderBy('users.name');

    // Parse roles arrays
    referees.forEach(referee => {
      if (typeof referee.roles === 'string') {
        try {
          referee.roles = JSON.parse(referee.roles);
        } catch (e) {
          referee.roles = referee.roles.replace(/[{}]/g, '').split(',');
        }
      }
    });

    return ResponseFormatter.sendSuccess(
      res, 
      referees, 
      `Referees with role '${roleName}' retrieved successfully`
    );
  })
);

module.exports = router;