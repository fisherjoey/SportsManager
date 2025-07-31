const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateQuery, validateIdParam } = require('../middleware/sanitization');
const { asyncHandler, withDatabaseError } = require('../middleware/errorHandling');
const { createAuditLog, AUDIT_EVENTS } = require('../middleware/auditTrail');
const { checkGameSchedulingConflicts } = require('../services/conflictDetectionService');

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
router.get('/', authenticateToken, validateQuery('gamesFilter'), asyncHandler(async (req, res) => {
  const { status, level, game_type, date_from, date_to, postal_code, page = 1, limit = 50 } = req.query;
    
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
      .leftJoin('leagues', 'games.league_id', 'leagues.id')
      .orderBy('games.game_date', 'asc');

    if (status) {
      query = query.where('games.status', status);
    }
    
    if (level) {
      query = query.where('games.level', level);
    }
    
    if (game_type) {
      query = query.where('games.game_type', game_type);
    }
    
    if (date_from) {
      query = query.where('games.game_date', '>=', date_from);
    }
    
    if (date_to) {
      query = query.where('games.game_date', '<=', date_to);
    }
    
    if (postal_code) {
      query = query.where('games.postal_code', postal_code);
    }

    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

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
        assignments,
        notes: '', // placeholder
        createdAt: game.created_at,
        updatedAt: game.updated_at
      };
    });

    res.json({
      data: transformedGames,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
}));

// GET /api/games/:id - Get specific game
router.get('/:id', async (req, res) => {
  try {
    const game = await db('games').where('id', req.params.id).first();
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const assignments = await db('game_assignments')
      .join('referees', 'game_assignments.referee_id', 'referees.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .select('users.*', 'positions.name as position_name', 'game_assignments.status as assignment_status')
      .where('game_assignments.game_id', game.id);

    game.assignments = assignments;
    
    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// POST /api/games - Create new game
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = gameSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check for venue scheduling conflicts
    const conflictCheck = await checkGameSchedulingConflicts({
      location: value.location,
      game_date: value.date,
      game_time: value.time
    });

    // Transform frontend data to database format
    const dbData = {
      home_team: JSON.stringify(value.homeTeam),
      away_team: JSON.stringify(value.awayTeam),
      game_date: value.date,
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
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// PUT /api/games/:id - Update game
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = gameUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

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
        game_date: value.date || currentGame.game_date,
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
});

// PATCH /api/games/:id/status - Update game status
router.patch('/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
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

    res.json(game);
  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({ error: 'Failed to update game status' });
  }
});

// DELETE /api/games/:id - Delete game
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const deletedCount = await db('games').where('id', req.params.id).del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// POST /api/games/bulk-import - Bulk import games
router.post('/bulk-import', authenticateToken, requireRole('admin'), async (req, res) => {
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
              game_date: gameData.date,
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