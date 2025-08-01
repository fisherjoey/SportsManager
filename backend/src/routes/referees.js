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

const refereeSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20),
  location: Joi.string(),
  postal_code: Joi.string().max(10).required(),
  max_distance: Joi.number().integer().min(1).max(200).default(25),
  is_available: Joi.boolean().default(true),
  wage_per_game: Joi.number().min(0).default(0)
});

const refereeUpdateSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string().max(20).allow(''),
  location: Joi.string().allow(''),
  postal_code: Joi.string().max(10).allow(''),
  max_distance: Joi.number().integer().min(1).max(200),
  is_available: Joi.boolean(),
  availability_strategy: Joi.string().valid('WHITELIST', 'BLACKLIST')
});

const adminRefereeUpdateSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string().max(20).allow(''),
  location: Joi.string().allow(''),
  postal_code: Joi.string().max(10).allow(''),
  max_distance: Joi.number().integer().min(1).max(200),
  is_available: Joi.boolean(),
  wage_per_game: Joi.number().min(0),
  availability_strategy: Joi.string().valid('WHITELIST', 'BLACKLIST')
});

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
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = refereeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if email already exists
    const existingReferee = await db('users').where('email', value.email).first();
    if (existingReferee) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Create user with referee role
    const userData = {
      ...value,
      role: 'referee',
      password_hash: await require('bcryptjs').hash('defaultpassword', 12) // Should be changed on first login
    };
    const [referee] = await db('users').insert(userData).returning('*');
    res.status(201).json(referee);
  } catch (error) {
    console.error('Error creating referee:', error);
    res.status(500).json({ error: 'Failed to create referee' });
  }
});

// PUT /api/referees/:id - Update referee (admin can update wage, referees cannot)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or updating their own profile
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = req.user.referee_id === req.params.id || req.user.id === req.params.id;
    
    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Forbidden: Can only update your own profile' });
    }
    
    // Use appropriate schema based on user role
    const schema = isAdmin ? adminRefereeUpdateSchema : refereeUpdateSchema;
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if email already exists for another user
    if (value.email) {
      const existingUser = await db('users')
        .where('email', value.email)
        .where('id', '!=', req.params.id)
        .first();
      
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const [referee] = await db('users')
      .where('id', req.params.id)
      .where('role', 'referee')
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    res.json(referee);
  } catch (error) {
    console.error('Error updating referee:', error);
    res.status(500).json({ error: 'Failed to update referee' });
  }
});

// PATCH /api/referees/:id/availability - Update referee availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { is_available } = req.body;
    
    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available must be a boolean' });
    }

    const [referee] = await db('referees')
      .where('id', req.params.id)
      .update({ is_available, updated_at: new Date() })
      .returning('*');

    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    res.json(referee);
  } catch (error) {
    console.error('Error updating referee availability:', error);
    res.status(500).json({ error: 'Failed to update referee availability' });
  }
});

// GET /api/referees/available/:gameId - Get available referees for a specific game
router.get('/available/:gameId', async (req, res) => {
  try {
    const game = await db('games').where('id', req.params.gameId).first();
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get available referees for the game
    const availableReferees = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .select('users.*', 'referee_levels.name as level_name')
      .where('users.role', 'referee')
      .where('users.is_available', true)
      .whereNotExists(function() {
        this.select('*')
          .from('game_assignments')
          .whereRaw('game_assignments.referee_id = users.id')
          .where('game_assignments.game_id', req.params.gameId);
      });

    res.json(availableReferees);
  } catch (error) {
    console.error('Error fetching available referees:', error);
    res.status(500).json({ error: 'Failed to fetch available referees' });
  }
});

// DELETE /api/referees/:id - Delete referee
router.delete('/:id', async (req, res) => {
  try {
    const deletedCount = await db('users').where('id', req.params.id).where('role', 'referee').del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting referee:', error);
    res.status(500).json({ error: 'Failed to delete referee' });
  }
});

module.exports = router;