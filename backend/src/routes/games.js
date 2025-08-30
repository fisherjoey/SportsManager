/**
 * @fileoverview Game management routes for the Sports Management API
 * 
 * This module handles all game-related HTTP endpoints including:
 * - Creating, updating, and deleting games and matches
 * - Game scheduling and conflict detection
 * - Team assignment and league integration
 * - Location and venue management for games
 * - Game status tracking and workflow management
 * - Assignment requirement calculation (referees needed)
 * 
 * @module routes/games
 * @requires express
 * @requires ../config/database
 * @requires ../middleware/auth
 * @requires ../services/conflictDetectionService
 * @requires ../utils/query-builders
 * @requires ../utils/query-cache
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { validateQuery, validateIdParam } = require('../middleware/sanitization');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams, validateQuery: validateQuerySchema } = require('../middleware/validation');
const { ErrorFactory } = require('../utils/errors');
const { ResponseFormatter } = require('../utils/response-formatters');
const { IdParamSchema } = require('../utils/validation-schemas');
const { createAuditLog, AUDIT_EVENTS } = require('../middleware/auditTrail');
const { checkGameSchedulingConflicts } = require('../services/conflictDetectionService');
const { QueryBuilder, QueryHelpers } = require('../utils/query-builders');
const { queryCache, CacheHelpers, CacheInvalidation } = require('../utils/query-cache');

const teamSchema = Joi.object({
  organization: Joi.string().required(),
  ageGroup: Joi.string().required(),
  gender: Joi.string().valid('Boys', 'Girls').required(),
  rank: Joi.number().integer().min(1).required()
});

const gameSchema = Joi.object({
  homeTeam: teamSchema.required(),
  awayTeam: teamSchema.required(),
  date: Joi.date().required(),
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  location: Joi.string().required(),
  postalCode: Joi.string().max(10).required(),
  level: Joi.string().required(),
  gameType: Joi.string().valid('Community', 'Club', 'Tournament', 'Private Tournament').default('Community'),
  division: Joi.string().required(),
  season: Joi.string().required(),
  payRate: Joi.number().positive().required(),
  refsNeeded: Joi.number().integer().min(1).max(10).default(2),
  wageMultiplier: Joi.number().min(0.1).max(5.0).default(1.0),
  wageMultiplierReason: Joi.string().allow('')
});

const gameUpdateSchema = Joi.object({
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  date: Joi.date(),
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  location: Joi.string(),
  postalCode: Joi.string().max(10),
  level: Joi.string(),
  gameType: Joi.string().valid('Community', 'Club', 'Tournament', 'Private Tournament'),
  division: Joi.string(),
  season: Joi.string(),
  payRate: Joi.number().positive(),
  refsNeeded: Joi.number().integer().min(1).max(10),
  wageMultiplier: Joi.number().min(0.1).max(5.0),
  wageMultiplierReason: Joi.string().allow('')
});

// GET /api/games - Get all games with optional filters
router.get('/', authenticateToken, validateQuery('gamesFilter'), enhancedAsyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    level: req.query.level,
    game_type: req.query.game_type,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    postal_code: req.query.postal_code
  };
  
  const paginationParams = QueryBuilder.validatePaginationParams(req.query);
  const { page, limit } = paginationParams;
  
  // Try to get cached results first
  const cacheKey = queryCache.generateKey('games_list', filters, { page, limit });
  const cachedResult = queryCache.get(cacheKey);
  
  if (cachedResult) {
    return res.json(cachedResult);
  }
  
  // Build optimized query using indexes
  let query = db('games')
    .select(
      'games.*',
      'home_teams.name as home_team_name',
      'away_teams.name as away_team_name',
      'leagues.organization',
      'leagues.age_group',
      'leagues.gender',
      'leagues.division',
      'leagues.season'
    )
    .leftJoin('teams as home_teams', 'games.home_team_id', 'home_teams.id')
    .leftJoin('teams as away_teams', 'games.away_team_id', 'away_teams.id')
    .leftJoin('leagues', 'games.league_id', 'leagues.id');

  // Apply filters using QueryBuilder with performance indexes
  // This will use idx_games_status_date and idx_games_date_location indexes
  query = QueryBuilder.applyCommonFilters(query, filters, QueryHelpers.getGameFilterMap());
  
  // Apply date range optimization for better index usage
  if (filters.date_from || filters.date_to) {
    query = QueryBuilder.applyDateRange(query, 'games.date_time', filters.date_from, filters.date_to);
  }
  
  // Use optimized sorting - games.date_time is indexed
  query = query.orderBy('games.date_time', 'asc');
  
  // Apply pagination
  query = QueryBuilder.applyPagination(query, page, limit);

  const games = await query;
    
  // PERFORMANCE OPTIMIZATION: Batch fetch all related data to avoid N+1 queries
  const gameIds = games.map(game => game.id);
  const teamIds = [...new Set([
    ...games.map(game => game.home_team_id).filter(Boolean),
    ...games.map(game => game.away_team_id).filter(Boolean)
  ])];
    
  // Fetch all assignments in one query
  const allAssignments = gameIds.length > 0 ? await db('game_assignments')
    .join('users', 'game_assignments.user_id', 'users.id')
    .join('positions', 'game_assignments.position_id', 'positions.id')
    .select(
      'game_assignments.game_id',
      'users.name as referee_name', 
      'positions.name as position_name', 
      'game_assignments.status'
    )
    .whereIn('game_assignments.game_id', gameIds) : [];
    
  // Fetch all teams with league info in one query
  const allTeams = teamIds.length > 0 ? await db('teams')
    .join('leagues', 'teams.league_id', 'leagues.id')
    .select(
      'teams.id',
      'teams.name',
      'teams.rank',
      'leagues.organization',
      'leagues.age_group',
      'leagues.gender'
    )
    .whereIn('teams.id', teamIds) : [];
    
  // Create lookup maps for O(1) access
  const assignmentsByGameId = {};
  allAssignments.forEach(assignment => {
    if (!assignmentsByGameId[assignment.game_id]) {
      assignmentsByGameId[assignment.game_id] = [];
    }
    assignmentsByGameId[assignment.game_id].push({
      referee_name: assignment.referee_name,
      position_name: assignment.position_name,
      status: assignment.status
    });
  });
    
  const teamsById = {};
  allTeams.forEach(team => {
    teamsById[team.id] = {
      organization: team.organization,
      ageGroup: team.age_group,
      gender: team.gender,
      rank: team.rank,
      name: team.name
    };
  });
    
  // Transform games using lookup maps (no async operations needed)
  const transformedGames = games.map(game => {
    const homeTeam = teamsById[game.home_team_id] || {};
    const awayTeam = teamsById[game.away_team_id] || {};
    const assignments = assignmentsByGameId[game.id] || [];
      
    return {
      id: game.id,
      homeTeam,
      awayTeam,
      date: game.date_time,
      time: game.game_time,
      location: game.location,
      postalCode: game.postal_code,
      level: game.level,
      gameType: game.game_type,
      division: game.division,
      season: game.season,
      payRate: game.pay_rate,
      status: game.status,
      refsNeeded: game.refs_needed,
      wageMultiplier: game.wage_multiplier,
      wageMultiplierReason: game.wage_multiplier_reason,
      assignments,
      notes: '', // placeholder
      createdAt: game.created_at,
      updatedAt: game.updated_at
    };
  });

  const result = {
    data: transformedGames,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit)
    }
  };
    
  // Cache the result for 5 minutes
  queryCache.set(cacheKey, result, 5 * 60 * 1000);
    
  res.json(result);
}));

// GET /api/games/:id - Get specific game
router.get('/:id', authenticateToken, validateIdParam, enhancedAsyncHandler(async (req, res) => {
  const gameId = req.params.id;
  
  // Try cache first
  const cachedGame = await CacheHelpers.cachePaginatedQuery(
    async () => {
      // Use optimized single game query with joins
      const game = await db('games')
        .select(
          'games.*',
          'home_teams.name as home_team_name',
          'away_teams.name as away_team_name',
          'leagues.organization',
          'leagues.age_group',
          'leagues.gender',
          'leagues.division',
          'leagues.season'
        )
        .leftJoin('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .leftJoin('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .leftJoin('leagues', 'games.league_id', 'leagues.id')
        .where('games.id', gameId)
        .first();
        
      if (!game) {
        return null;
      }

      // Optimized assignments query using idx_assignments_user_game index
      const assignments = await db('game_assignments')
        .join('users', 'game_assignments.user_id', 'users.id')
        .join('positions', 'game_assignments.position_id', 'positions.id')
        .select(
          'users.name',
          'users.email',
          'users.phone',
          'positions.name as position_name',
          'game_assignments.status as assignment_status',
          'game_assignments.created_at as assigned_at'
        )
        .where('game_assignments.game_id', gameId)
        .orderBy('positions.sort_order', 'asc');

      return { ...game, assignments };
    },
    `game_${gameId}`,
    {},
    {},
    10 * 60 * 1000 // Cache for 10 minutes
  );
  
  if (!cachedGame) {
    throw ErrorFactory.notFound('Game', req.params.id);
  }
  
  res.json(cachedGame);
}));

// POST /api/games - Create new game
// Requires: games:create permission
router.post('/', authenticateToken, requirePermission('games:create'), validateBody(gameSchema), enhancedAsyncHandler(async (req, res) => {
  const value = req.body;

  // Check for venue scheduling conflicts
  const conflictCheck = await checkGameSchedulingConflicts({
    location: value.location,
    date_time: value.date,
    game_time: value.time
  });

  // Transform frontend data to database format
  const dbData = {
    home_team: JSON.stringify(value.homeTeam),
    away_team: JSON.stringify(value.awayTeam),
    date_time: value.date,
    game_time: value.time,
    location: value.location,
    postal_code: value.postalCode,
    level: value.level,
    game_type: value.gameType,
    division: value.division,
    season: value.season,
    pay_rate: value.payRate,
    refs_needed: value.refsNeeded,
    wage_multiplier: value.wageMultiplier,
    wage_multiplier_reason: value.wageMultiplierReason
  };

  const [game] = await db('games').insert(dbData).returning('*');
    
  // Invalidate related caches
  CacheInvalidation.invalidateGames(queryCache);
    
  // Transform response back to frontend format
  const transformedGame = {
    id: game.id,
    homeTeam: JSON.parse(game.home_team),
    awayTeam: JSON.parse(game.away_team),
    date: game.game_date,
    time: game.game_time,
    location: game.location,
    postalCode: game.postal_code,
    level: game.level,
    gameType: game.game_type,
    division: game.division,
    season: game.season,
    payRate: game.pay_rate,
    status: game.status,
    refsNeeded: game.refs_needed,
    wageMultiplier: game.wage_multiplier,
    wageMultiplierReason: game.wage_multiplier_reason,
    assignments: [],
    notes: '',
    createdAt: game.created_at,
    updatedAt: game.updated_at
  };
    
  const response = {
    success: true,
    data: transformedGame
  };

  // Include venue conflict warnings if any
  if (conflictCheck.hasConflicts) {
    response.warnings = [`Venue conflict detected: ${conflictCheck.errors.join('; ')}`];
    response.conflicts = conflictCheck.conflicts;
  }
    
  return ResponseFormatter.sendCreated(res, transformedGame, 'Game created successfully', `/api/games/${game.id}`);
}));

// PUT /api/games/:id - Update game
// Requires: games:update or games:manage permission
router.put('/:id', authenticateToken, requireAnyPermission(['games:update', 'games:manage']), validateParams(IdParamSchema), validateBody(gameUpdateSchema), enhancedAsyncHandler(async (req, res) => {
  try {
    const value = req.body;

    // Check for venue scheduling conflicts if location, date, or time is being updated
    let conflictCheck = { hasConflicts: false };
    if (value.location || value.date || value.time) {
      // Get current game data to merge with updates
      const currentGame = await db('games').where('id', req.params.id).first();
      if (!currentGame) {
        return res.status(404).json({ error: 'Game not found' });
      }

      conflictCheck = await checkGameSchedulingConflicts({
        location: value.location || currentGame.location,
        date_time: value.date || currentGame.date_time,
        game_time: value.time || currentGame.game_time
      }, req.params.id);
    }

    const [game] = await db('games')
      .where('id', req.params.id)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Invalidate related caches
    CacheInvalidation.invalidateGames(queryCache, req.params.id);

    const response = {
      success: true,
      data: game
    };

    // Include venue conflict warnings if any
    if (conflictCheck.hasConflicts) {
      response.warnings = [`Venue conflict detected: ${conflictCheck.errors.join('; ')}`];
      response.conflicts = conflictCheck.conflicts;
    }

    res.json(response);
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
}));

// PATCH /api/games/:id/status - Update game status
// Requires: games:update or games:manage permission
router.patch('/:id/status', authenticateToken, requireAnyPermission(['games:update', 'games:manage']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['assigned', 'unassigned', 'up-for-grabs', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [game] = await db('games')
      .where('id', req.params.id)
      .update({ status, updated_at: new Date() })
      .returning('*');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Invalidate related caches
    CacheInvalidation.invalidateGames(queryCache, req.params.id);

    res.json(game);
  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({ error: 'Failed to update game status' });
  }
});

// DELETE /api/games/:id - Delete game
// Requires: games:delete permission
router.delete('/:id', authenticateToken, requirePermission('games:delete'), async (req, res) => {
  try {
    const deletedCount = await db('games').where('id', req.params.id).del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Invalidate related caches
    CacheInvalidation.invalidateGames(queryCache, req.params.id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// POST /api/games/bulk-import - Bulk import games
// Requires: games:create and games:manage permissions
router.post('/bulk-import', authenticateToken, requireAnyPermission(['games:create', 'games:manage']), async (req, res) => {
  try {
    const { games } = req.body;
    
    if (!Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: 'Games array is required and cannot be empty' });
    }

    if (games.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 games can be imported at once' });
    }

    // Validate each game
    const validationErrors = [];
    const validatedGames = [];

    for (let i = 0; i < games.length; i++) {
      const { error, value } = gameSchema.validate(games[i]);
      if (error) {
        validationErrors.push({
          index: i,
          game: games[i],
          error: error.details[0].message
        });
      } else {
        validatedGames.push({ ...value, index: i });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed for some games',
        validationErrors,
        totalErrors: validationErrors.length,
        totalGames: games.length
      });
    }

    const trx = await db.transaction();
    
    try {
      const createdGames = [];
      const gameCreationErrors = [];

      for (const gameData of validatedGames) {
        try {
          // Get or create teams
          const homeTeam = await getOrCreateTeam(trx, gameData.homeTeam, gameData.division, gameData.season);
          const awayTeam = await getOrCreateTeam(trx, gameData.awayTeam, gameData.division, gameData.season);

          // Get or create location
          const location = await getOrCreateLocation(trx, gameData.location, gameData.postalCode);

          // Create game
          const [game] = await trx('games')
            .insert({
              home_team_id: homeTeam.id,
              away_team_id: awayTeam.id,
              date_time: gameData.date,
              game_time: gameData.time,
              location_id: location.id,
              level: gameData.level,
              game_type: gameData.gameType,
              pay_rate: gameData.payRate,
              refs_needed: gameData.refsNeeded,
              wage_multiplier: gameData.wageMultiplier,
              wage_multiplier_reason: gameData.wageMultiplierReason || null,
              status: 'unassigned',
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning('*');

          createdGames.push({
            index: gameData.index,
            game: {
              ...game,
              homeTeam: homeTeam.name,
              awayTeam: awayTeam.name,
              location: location.name
            }
          });

        } catch (gameError) {
          console.error(`Error creating game at index ${gameData.index}:`, gameError);
          gameCreationErrors.push({
            index: gameData.index,
            game: gameData,
            error: gameError.message
          });
        }
      }

      if (gameCreationErrors.length > 0 && createdGames.length === 0) {
        // All games failed, rollback transaction
        throw new Error('All games failed to import');
      }

      await trx.commit();
      
      // Invalidate related caches after successful bulk import
      CacheInvalidation.invalidateGames(queryCache);

      const response = {
        success: true,
        data: {
          importedGames: createdGames,
          summary: {
            totalSubmitted: games.length,
            successfulImports: createdGames.length,
            failedImports: gameCreationErrors.length
          }
        }
      };

      if (gameCreationErrors.length > 0) {
        response.warnings = gameCreationErrors;
        response.partialSuccess = true;
      }

      res.status(201).json(response);

    } catch (error) {
      await trx.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error bulk importing games:', error);
    res.status(500).json({ 
      error: 'Failed to bulk import games',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to get or create team
async function getOrCreateTeam(trx, teamData, division, season) {
  // First check if league exists
  let league = await trx('leagues')
    .where('organization', teamData.organization)
    .where('age_group', teamData.ageGroup)
    .where('gender', teamData.gender)
    .where('division', division)
    .where('season', season)
    .first();

  if (!league) {
    // Create league
    [league] = await trx('leagues')
      .insert({
        name: `${teamData.organization} ${teamData.ageGroup} ${teamData.gender} ${division}`,
        organization: teamData.organization,
        age_group: teamData.ageGroup,
        gender: teamData.gender,
        division: division,
        season: season,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
  }

  // Check if team exists in this league
  let team = await trx('teams')
    .where('league_id', league.id)
    .where('name', teamData.organization)
    .where('rank', teamData.rank)
    .first();

  if (!team) {
    // Create team
    [team] = await trx('teams')
      .insert({
        name: teamData.organization,
        league_id: league.id,
        rank: teamData.rank,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
  }

  return team;
}

// Helper function to get or create location
async function getOrCreateLocation(trx, locationName, postalCode) {
  let location = await trx('locations')
    .where('name', locationName)
    .first();

  if (!location) {
    [location] = await trx('locations')
      .insert({
        name: locationName,
        address: '', // Will need to be filled in later by admin
        postal_code: postalCode,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
  }

  return location;
}

module.exports = router;