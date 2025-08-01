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

// GET /api/referees - Get all referees with optional filters
router.get('/', validateQuery(FilterSchemas.referees), enhancedAsyncHandler(async (req, res) => {
  const { level, postal_code, is_available, page, limit, search, white_whistle } = req.query;
  
  // Build filters for UserService
  const filters = {};
  if (postal_code) filters.postal_code = postal_code;
  if (is_available !== undefined) filters.is_available = is_available;
  if (white_whistle !== undefined) filters.white_whistle = white_whistle;
  
  // Use UserService to find referees with pagination
  const result = await userService.findWithPagination(
    filters,
    page,
    limit,
    {
      include: [{
        table: 'referee_levels',
        on: 'users.referee_level_id = referee_levels.id',
        type: 'left'
      }],
      select: [
        'users.*',
        'referee_levels.name as level_name',
        'referee_levels.allowed_divisions',
        'referee_levels.min_experience_years'
      ],
      orderBy: 'users.name',
      orderDirection: 'asc'
    }
  );

  let referees = result.data;

  // Apply additional filters that need custom logic
  if (level) {
    referees = referees.filter(referee => referee.level_name === level);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    referees = referees.filter(referee => 
      (referee.name && referee.name.toLowerCase().includes(searchLower)) ||
      (referee.email && referee.email.toLowerCase().includes(searchLower))
    );
  }

  // Maintain backward compatibility with existing API consumers
  return ResponseFormatter.sendSuccess(res, {
    data: referees,
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages
    }
  }, 'Referees retrieved successfully');
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