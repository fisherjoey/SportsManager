const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

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
router.get('/', async (req, res) => {
  try {
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
    
    // Transform games to match frontend expectations
    const transformedGames = await Promise.all(games.map(async (game) => {
      // Get assignments for each game
      const assignments = await db('game_assignments')
        .join('users', 'game_assignments.user_id', 'users.id')
        .join('positions', 'game_assignments.position_id', 'positions.id')
        .select('users.name as referee_name', 'positions.name as position_name', 'game_assignments.status')
        .where('game_assignments.game_id', game.id);
      
      // Get home and away team details with league info
      const homeTeam = await db('teams')
        .join('leagues', 'teams.league_id', 'leagues.id')
        .select('teams.*', 'leagues.organization', 'leagues.age_group', 'leagues.gender')
        .where('teams.id', game.home_team_id)
        .first();
        
      const awayTeam = await db('teams')
        .join('leagues', 'teams.league_id', 'leagues.id')
        .select('teams.*', 'leagues.organization', 'leagues.age_group', 'leagues.gender')
        .where('teams.id', game.away_team_id)
        .first();
      
      return {
        id: game.id,
        homeTeam: homeTeam ? {
          organization: homeTeam.organization,
          ageGroup: homeTeam.age_group,
          gender: homeTeam.gender,
          rank: homeTeam.rank,
          name: homeTeam.name
        } : {},
        awayTeam: awayTeam ? {
          organization: awayTeam.organization,
          ageGroup: awayTeam.age_group,
          gender: awayTeam.gender,
          rank: awayTeam.rank,
          name: awayTeam.name
        } : {},
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
        assignments: assignments,
        notes: '', // placeholder
        createdAt: game.created_at,
        updatedAt: game.updated_at
      };
    }));

    res.json({
      data: transformedGames,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

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
    
    res.status(201).json(transformedGame);
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

    const [game] = await db('games')
      .where('id', req.params.id)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
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

module.exports = router;