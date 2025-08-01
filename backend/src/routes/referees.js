const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ResponseFormatter, asyncHandler } = require('../utils/response-formatters');
const { UserSchemas, FilterSchemas, IdParamSchema } = require('../utils/validation-schemas');
const UserService = require('../services/UserService');

// Initialize UserService with database connection
const userService = new UserService(db);

// Validation schemas are now centralized in validation-schemas.js

// GET /api/referees - Get all referees with optional filters
router.get('/', asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error: queryError, value: validatedQuery } = FilterSchemas.referees.validate(req.query);
  if (queryError) {
    return ResponseFormatter.sendValidationError(res, queryError.details);
  }

  const { level, postal_code, is_available, page, limit, search, white_whistle } = validatedQuery;
  
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
  ResponseFormatter.sendSuccess(res, {
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
router.get('/:id', asyncHandler(async (req, res) => {
  // Validate request parameters
  const { error: paramError } = IdParamSchema.validate(req.params);
  if (paramError) {
    return ResponseFormatter.sendValidationError(res, paramError.details);
  }

  const refereeId = req.params.id;
  
  // Use UserService to get referee with complete details
  const referee = await userService.getUserWithRefereeDetails(refereeId, {
    assignmentLimit: 50 // Get more assignments for detailed view
  });

  if (!referee || referee.role !== 'referee') {
    return ResponseFormatter.sendNotFound(res, 'Referee', refereeId);
  }

  // Maintain backward compatibility - rename assignments field
  if (referee.recent_assignments) {
    referee.assignments = referee.recent_assignments;
    delete referee.recent_assignments;
  }

  ResponseFormatter.sendSuccess(res, referee, 'Referee details retrieved successfully');
}));

// POST /api/referees - Create new referee
router.post('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  // Validate request body using updated schema
  const { error, value } = UserSchemas.create.validate(req.body);
  if (error) {
    return ResponseFormatter.sendValidationError(res, error.details);
  }

  // Ensure role is set to referee
  value.role = 'referee';
  
  // Use UserService to create referee with proper defaults
  const referee = await userService.createReferee(value);

  ResponseFormatter.sendCreated(
    res, 
    referee, 
    'Referee created successfully',
    `/api/referees/${referee.id}`
  );
}));

// PUT /api/referees/:id - Update referee (admin can update wage, referees cannot)
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  // Validate request parameters
  const { error: paramError } = IdParamSchema.validate(req.params);
  if (paramError) {
    return ResponseFormatter.sendValidationError(res, paramError.details);
  }

  const refereeId = req.params.id;
  
  // Check if user is admin or updating their own profile
  const isAdmin = req.user.role === 'admin';
  const isOwnProfile = req.user.referee_id === refereeId || req.user.id === refereeId;
  
  if (!isAdmin && !isOwnProfile) {
    return ResponseFormatter.sendForbidden(res, 'Can only update your own profile');
  }
  
  // Use appropriate schema based on user role
  const schema = isAdmin ? UserSchemas.adminUpdate : UserSchemas.update;
  const { error, value } = schema.validate(req.body);
  if (error) {
    return ResponseFormatter.sendValidationError(res, error.details);
  }

  // Check if email already exists for another user
  if (value.email) {
    const existingUsers = await userService.findWhere({ email: value.email });
    const existingUser = existingUsers.find(user => user.id !== refereeId);
    
    if (existingUser) {
      return ResponseFormatter.sendConflict(res, 'Email already exists', { email: value.email });
    }
  }

  // Verify referee exists before update
  const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
  if (!existingReferee || existingReferee.role !== 'referee') {
    return ResponseFormatter.sendNotFound(res, 'Referee', refereeId);
  }

  // Use UserService to update referee
  const updatedReferee = await userService.update(refereeId, value);

  ResponseFormatter.sendSuccess(res, updatedReferee, 'Referee updated successfully');
}));

// PATCH /api/referees/:id/availability - Update referee availability
router.patch('/:id/availability', asyncHandler(async (req, res) => {
  // Validate request parameters
  const { error: paramError } = IdParamSchema.validate(req.params);
  if (paramError) {
    return ResponseFormatter.sendValidationError(res, paramError.details);
  }

  const { is_available } = req.body;
  
  if (typeof is_available !== 'boolean') {
    return ResponseFormatter.sendValidationError(res, [
      { field: 'is_available', message: 'is_available must be a boolean' }
    ]);
  }

  const refereeId = req.params.id;
  
  // Use UserService to update availability
  const updatedReferee = await userService.updateAvailability(refereeId, is_available);

  ResponseFormatter.sendSuccess(res, updatedReferee, 'Referee availability updated successfully');
}));

// GET /api/referees/available/:gameId - Get available referees for a specific game
router.get('/available/:gameId', asyncHandler(async (req, res) => {
  // Validate request parameters
  const { error: paramError } = IdParamSchema.validate({ id: req.params.gameId });
  if (paramError) {
    return ResponseFormatter.sendValidationError(res, paramError.details);
  }

  const gameId = req.params.gameId;
  
  // First verify the game exists
  const game = await db('games').where('id', gameId).first();
  if (!game) {
    return ResponseFormatter.sendNotFound(res, 'Game', gameId);
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

  ResponseFormatter.sendSuccess(res, filteredReferees, 'Available referees retrieved successfully');
}));

// DELETE /api/referees/:id - Delete referee
router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  // Validate request parameters
  const { error: paramError } = IdParamSchema.validate(req.params);
  if (paramError) {
    return ResponseFormatter.sendValidationError(res, paramError.details);
  }

  const refereeId = req.params.id;
  
  // Verify referee exists before deletion
  const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
  if (!existingReferee || existingReferee.role !== 'referee') {
    return ResponseFormatter.sendNotFound(res, 'Referee', refereeId);
  }

  // Use UserService to delete referee
  const deleted = await userService.delete(refereeId);
  
  if (!deleted) {
    return ResponseFormatter.sendNotFound(res, 'Referee', refereeId);
  }

  ResponseFormatter.sendSuccess(res, null, 'Referee deleted successfully');
}));

module.exports = router;