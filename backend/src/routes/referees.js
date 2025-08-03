const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ResponseFormatter } = require('../utils/response-formatters');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { UserSchemas, FilterSchemas, IdParamSchema } = require('../utils/validation-schemas');
const { ErrorFactory } = require('../utils/errors');
const UserService = require('../services/UserService');

// Initialize UserService with database connection
const userService = new UserService(db);

// Validation schemas are now centralized in validation-schemas.js

// GET /api/referees/test - Simple test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Referees API is working', timestamp: new Date().toISOString() });
});

// GET /api/referees - Get all referees with optional filters  
router.get('/', enhancedAsyncHandler(async (req, res) => {
  try {
    // Enhanced query to include referee level and white whistle information
    const referees = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .where('users.role', 'referee')
      .select(
        'users.id', 
        'users.name', 
        'users.email', 
        'users.is_available',
        'users.is_white_whistle',
        'users.roles',
        'referee_levels.name as level_name',
        db.raw(`
          CASE 
            WHEN referee_levels.name IN ('Rookie', 'Junior') AND users.is_white_whistle = true 
            THEN true 
            ELSE false 
          END as should_display_white_whistle
        `)
      )
      .limit(10);
    
    res.json({
      success: true,
      data: { 
        referees,
        pagination: {
          total: referees.length,
          page: 1,
          limit: 10,
          totalPages: Math.ceil(referees.length / 10)
        }
      }
    });
  } catch (error) {
    console.error('Referees endpoint error:', error);
    throw error;
  }
}));

// GET /api/referees/profile - Get current user's referee profile
router.get('/profile', authenticateToken, enhancedAsyncHandler(async (req, res) => {
  if (req.user.role !== 'referee') {
    throw ErrorFactory.forbidden('This endpoint is only available for referees');
  }

  // Use UserService to get referee profile
  const referee = await userService.getUserWithRefereeDetails(req.user.id, {
    assignmentLimit: 50
  });

  if (!referee) {
    throw ErrorFactory.notFound('Referee profile not found');
  }

  // Maintain backward compatibility - rename assignments field
  if (referee.recent_assignments) {
    referee.assignments = referee.recent_assignments;
    delete referee.recent_assignments;
  }

  return ResponseFormatter.sendSuccess(res, { referee }, 'Referee profile retrieved successfully');
}));

// GET /api/referees/:id - Get specific referee
router.get('/:id', validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  const refereeId = req.params.id;
  
  // Use UserService to get referee with complete details
  const referee = await userService.getUserWithRefereeDetails(refereeId, {
    assignmentLimit: 50 // Get more assignments for detailed view
  });

  if (!referee || referee.role !== 'referee') {
    throw ErrorFactory.notFound('Referee', refereeId);
  }

  // Maintain backward compatibility - rename assignments field
  if (referee.recent_assignments) {
    referee.assignments = referee.recent_assignments;
    delete referee.recent_assignments;
  }

  return ResponseFormatter.sendSuccess(res, referee, 'Referee details retrieved successfully');
}));

// POST /api/referees - Create new referee
router.post('/', authenticateToken, requireRole('admin'), validateBody(UserSchemas.create), enhancedAsyncHandler(async (req, res) => {
  // Ensure role is set to referee
  const value = { ...req.body, role: 'referee' };
  
  // Use UserService to create referee with proper defaults
  const referee = await userService.createReferee(value);

  return ResponseFormatter.sendCreated(
    res, 
    referee, 
    'Referee created successfully',
    `/api/referees/${referee.id}`
  );
}));

// PUT /api/referees/:id - Update referee (admin can update wage, referees cannot)
router.put('/:id', authenticateToken, validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  const refereeId = req.params.id;
  
  // Check if user is admin or updating their own profile
  const isAdmin = req.user.role === 'admin';
  const isOwnProfile = req.user.referee_id === refereeId || req.user.id === refereeId;
  
  if (!isAdmin && !isOwnProfile) {
    throw ErrorFactory.forbidden('Can only update your own profile');
  }
  
  // Use appropriate schema based on user role
  const schema = isAdmin ? UserSchemas.adminUpdate : UserSchemas.update;
  const { error, value } = schema.validate(req.body);
  if (error) {
    throw ErrorFactory.fromJoiError(error);
  }

  // Check if email already exists for another user
  if (value.email) {
    const existingUsers = await userService.findWhere({ email: value.email });
    const existingUser = existingUsers.find(user => user.id !== refereeId);
    
    if (existingUser) {
      throw ErrorFactory.conflict('Email already exists', { email: value.email });
    }
  }

  // Verify referee exists before update
  const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
  if (!existingReferee || existingReferee.role !== 'referee') {
    throw ErrorFactory.notFound('Referee', refereeId);
  }

  // Use UserService to update referee
  const updatedReferee = await userService.update(refereeId, value);

  return ResponseFormatter.sendSuccess(res, updatedReferee, 'Referee updated successfully');
}));

// PATCH /api/referees/:id/availability - Update referee availability
router.patch('/:id/availability', 
  authenticateToken,
  validateParams(IdParamSchema),
  validateBody(Joi.object({
    is_available: Joi.boolean().required()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { is_available } = req.body;
    const refereeId = req.params.id;
    
    // Use UserService to update availability
    const updatedReferee = await userService.updateAvailability(refereeId, is_available);

    return ResponseFormatter.sendSuccess(res, updatedReferee, 'Referee availability updated successfully');
  })
);

// GET /api/referees/available/:gameId - Get available referees for a specific game
router.get('/available/:gameId', 
  validateParams(IdParamSchema.keys({ gameId: Joi.string().uuid().required() })),
  enhancedAsyncHandler(async (req, res) => {
    const gameId = req.params.gameId;
    
    // First verify the game exists
    const game = await db('games').where('id', gameId).first();
    if (!game) {
      throw ErrorFactory.notFound('Game', gameId);
    }

    // Use UserService to find available referees for the specific game date/time
    const availableReferees = await userService.findAvailableReferees(
      game.game_date,
      game.game_time,
      {
        level: game.level,
        location: game.location
      }
    );

    // Filter out referees already assigned to this specific game
    const assignedRefereeIds = await db('game_assignments')
      .where('game_id', gameId)
      .pluck('user_id');

    const filteredReferees = availableReferees.filter(
      referee => !assignedRefereeIds.includes(referee.id)
    );

    return ResponseFormatter.sendSuccess(res, filteredReferees, 'Available referees retrieved successfully');
  })
);

// DELETE /api/referees/:id - Delete referee
router.delete('/:id', authenticateToken, requireRole('admin'), validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  const refereeId = req.params.id;
  
  // Verify referee exists before deletion
  const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
  if (!existingReferee || existingReferee.role !== 'referee') {
    throw ErrorFactory.notFound('Referee', refereeId);
  }

  // Use UserService to delete referee
  const deleted = await userService.delete(refereeId);
  
  if (!deleted) {
    throw ErrorFactory.notFound('Referee', refereeId);
  }

  return ResponseFormatter.sendSuccess(res, null, 'Referee deleted successfully');
}));

module.exports = router;