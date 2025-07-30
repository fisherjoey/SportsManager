const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

const teamSchema = Joi.object({
  name: Joi.string().required(),
  league_id: Joi.string().uuid().required(),
  rank: Joi.number().integer().min(1).default(1),
  location: Joi.string().allow(''),
  contact_email: Joi.string().email().allow(''),
  contact_phone: Joi.string().allow('')
});

const bulkTeamSchema = Joi.object({
  league_id: Joi.string().uuid().required(),
  teams: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      rank: Joi.number().integer().min(1).default(1),
      location: Joi.string().allow(''),
      contact_email: Joi.string().email().allow(''),
      contact_phone: Joi.string().allow('')
    })
  ).min(1).required()
});

const bulkGenerateSchema = Joi.object({
  league_id: Joi.string().uuid().required(),
  count: Joi.number().integer().min(1).max(50).required(),
  name_pattern: Joi.string().default('Team {number}'),
  location_base: Joi.string().allow(''),
  auto_rank: Joi.boolean().default(true)
});

// GET /api/teams - Get all teams with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      league_id, 
      organization, 
      age_group, 
      gender, 
      season,
      search,
      page = 1, 
      limit = 50 
    } = req.query;
    
    let query = db('teams')
      .select(
        'teams.*',
        'leagues.organization',
        'leagues.age_group',
        'leagues.gender',
        'leagues.division',
        'leagues.season',
        'leagues.level',
        db.raw('COUNT(DISTINCT home_games.id) + COUNT(DISTINCT away_games.id) as game_count')
      )
      .join('leagues', 'teams.league_id', 'leagues.id')
      .leftJoin('games as home_games', 'teams.id', 'home_games.home_team_id')
      .leftJoin('games as away_games', 'teams.id', 'away_games.away_team_id')
      .groupBy('teams.id', 'leagues.id')
      .orderBy('leagues.organization', 'asc')
      .orderBy('leagues.age_group', 'asc')
      .orderBy('teams.rank', 'asc');

    // Apply filters
    if (league_id) query = query.where('teams.league_id', league_id);
    if (organization) query = query.where('leagues.organization', 'ilike', `%${organization}%`);
    if (age_group) query = query.where('leagues.age_group', age_group);
    if (gender) query = query.where('leagues.gender', gender);
    if (season) query = query.where('leagues.season', 'ilike', `%${season}%`);
    if (search) query = query.where('teams.name', 'ilike', `%${search}%`);

    const offset = (page - 1) * limit;
    const teams = await query.limit(limit).offset(offset);

    // Get total count for pagination
    let countQuery = db('teams')
      .join('leagues', 'teams.league_id', 'leagues.id')
      .count('teams.id as count');
      
    if (league_id) countQuery = countQuery.where('teams.league_id', league_id);
    if (organization) countQuery = countQuery.where('leagues.organization', 'ilike', `%${organization}%`);
    if (age_group) countQuery = countQuery.where('leagues.age_group', age_group);
    if (gender) countQuery = countQuery.where('leagues.gender', gender);
    if (season) countQuery = countQuery.where('leagues.season', 'ilike', `%${season}%`);
    if (search) countQuery = countQuery.where('teams.name', 'ilike', `%${search}%`);
    
    const [{ count }] = await countQuery;

    res.json({
      success: true,
      data: {
        teams: teams.map(team => ({
          ...team,
          game_count: parseInt(team.game_count) || 0
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(count),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/:id - Get specific team with games
router.get('/:id', async (req, res) => {
  try {
    const team = await db('teams')
      .select(
        'teams.*',
        'leagues.organization',
        'leagues.age_group',
        'leagues.gender',
        'leagues.division',
        'leagues.season',
        'leagues.level'
      )
      .join('leagues', 'teams.league_id', 'leagues.id')
      .where('teams.id', req.params.id)
      .first();

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get games for this team
    const games = await db('games')
      .select(
        'games.*',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        db.raw(`CASE 
          WHEN games.home_team_id = ? THEN 'home'
          ELSE 'away'
        END as team_role`, [req.params.id])
      )
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .where('games.home_team_id', req.params.id)
      .orWhere('games.away_team_id', req.params.id)
      .orderBy('games.game_date', 'desc');

    res.json({
      success: true,
      data: {
        team,
        games,
        stats: {
          total_games: games.length,
          home_games: games.filter(g => g.team_role === 'home').length,
          away_games: games.filter(g => g.team_role === 'away').length,
          upcoming_games: games.filter(g => new Date(g.game_date) > new Date()).length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// POST /api/teams - Create new team
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = teamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if league exists
    const league = await db('leagues').where('id', value.league_id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if team name already exists in this league
    const existingTeam = await db('teams')
      .where('league_id', value.league_id)
      .where('name', value.name)
      .first();

    if (existingTeam) {
      return res.status(409).json({ 
        error: 'Team name already exists in this league' 
      });
    }

    const [team] = await db('teams').insert(value).returning('*');

    res.status(201).json({
      success: true,
      data: { team },
      message: 'Team created successfully'
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// POST /api/teams/bulk - Create multiple teams
router.post('/bulk', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = bulkTeamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { league_id, teams } = value;

    // Check if league exists
    const league = await db('leagues').where('id', league_id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check for duplicate names within the request and existing teams
    const existingTeams = await db('teams')
      .where('league_id', league_id)
      .pluck('name');

    const duplicates = [];
    const validTeams = [];
    const requestedNames = new Set();

    for (const team of teams) {
      if (requestedNames.has(team.name)) {
        duplicates.push(`${team.name} (duplicate in request)`);
        continue;
      }
      if (existingTeams.includes(team.name)) {
        duplicates.push(`${team.name} (already exists)`);
        continue;
      }
      
      requestedNames.add(team.name);
      validTeams.push({
        ...team,
        league_id
      });
    }

    // Create valid teams
    const createdTeams = [];
    if (validTeams.length > 0) {
      const newTeams = await db('teams').insert(validTeams).returning('*');
      createdTeams.push(...newTeams);
    }

    res.status(201).json({
      success: true,
      data: {
        created: createdTeams,
        duplicates,
        summary: {
          requested: teams.length,
          created: createdTeams.length,
          duplicates: duplicates.length
        }
      },
      message: `Created ${createdTeams.length} teams. ${duplicates.length} duplicates skipped.`
    });
  } catch (error) {
    console.error('Error creating bulk teams:', error);
    res.status(500).json({ error: 'Failed to create bulk teams' });
  }
});

// POST /api/teams/generate - Generate teams with pattern
router.post('/generate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = bulkGenerateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { league_id, count, name_pattern, location_base, auto_rank } = value;

    // Check if league exists
    const league = await db('leagues').where('id', league_id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get existing team names to avoid duplicates
    const existingTeams = await db('teams')
      .where('league_id', league_id)
      .pluck('name');

    const teamsToCreate = [];
    let createdCount = 0;
    let skipCount = 0;

    for (let i = 1; i <= count; i++) {
      const teamName = name_pattern.replace('{number}', i.toString());
      
      if (existingTeams.includes(teamName)) {
        skipCount++;
        continue;
      }

      teamsToCreate.push({
        name: teamName,
        league_id,
        rank: auto_rank ? i : 1,
        location: location_base ? `${location_base} - Field ${i}` : '',
        contact_email: '',
        contact_phone: ''
      });
      createdCount++;
    }

    // Create teams
    const createdTeams = [];
    if (teamsToCreate.length > 0) {
      const newTeams = await db('teams').insert(teamsToCreate).returning('*');
      createdTeams.push(...newTeams);
    }

    res.status(201).json({
      success: true,
      data: {
        created: createdTeams,
        league: {
          id: league.id,
          organization: league.organization,
          age_group: league.age_group,
          gender: league.gender,
          division: league.division
        },
        summary: {
          requested: count,
          created: createdCount,
          skipped: skipCount
        }
      },
      message: `Generated ${createdCount} teams. ${skipCount} names already existed.`
    });
  } catch (error) {
    console.error('Error generating teams:', error);
    res.status(500).json({ error: 'Failed to generate teams' });
  }
});

// PUT /api/teams/:id - Update team
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = teamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if new name conflicts with existing team in same league
    if (value.name) {
      const existingTeam = await db('teams')
        .where('league_id', value.league_id)
        .where('name', value.name)
        .where('id', '!=', req.params.id)
        .first();

      if (existingTeam) {
        return res.status(409).json({ 
          error: 'Team name already exists in this league' 
        });
      }
    }

    const [team] = await db('teams')
      .where('id', req.params.id)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      success: true,
      data: { team },
      message: 'Team updated successfully'
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// DELETE /api/teams/:id - Delete team
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const team = await db('teams').where('id', req.params.id).first();
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if team has games
    const gameCount = await db('games')
      .where('home_team_id', req.params.id)
      .orWhere('away_team_id', req.params.id)
      .count('* as count')
      .first();

    if (parseInt(gameCount.count) > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete team with existing games',
        details: {
          games: parseInt(gameCount.count)
        }
      });
    }

    await db('teams').where('id', req.params.id).del();

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// GET /api/teams/league/:league_id - Get all teams for a specific league
router.get('/league/:league_id', async (req, res) => {
  try {
    const teams = await db('teams')
      .select(
        'teams.*',
        db.raw('COUNT(DISTINCT home_games.id) + COUNT(DISTINCT away_games.id) as game_count')
      )
      .leftJoin('games as home_games', 'teams.id', 'home_games.home_team_id')
      .leftJoin('games as away_games', 'teams.id', 'away_games.away_team_id')
      .where('teams.league_id', req.params.league_id)
      .groupBy('teams.id')
      .orderBy('teams.rank', 'asc');

    const league = await db('leagues').where('id', req.params.league_id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({
      success: true,
      data: {
        league,
        teams: teams.map(team => ({
          ...team,
          game_count: parseInt(team.game_count) || 0
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching teams for league:', error);
    res.status(500).json({ error: 'Failed to fetch teams for league' });
  }
});

module.exports = router;