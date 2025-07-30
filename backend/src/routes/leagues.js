const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

const leagueSchema = Joi.object({
  organization: Joi.string().required(),
  age_group: Joi.string().required(),
  gender: Joi.string().valid('Boys', 'Girls', 'Mixed').required(),
  division: Joi.string().required(),
  season: Joi.string().required(),
  level: Joi.string().valid('Recreational', 'Competitive', 'Elite').required()
});

const bulkLeagueSchema = Joi.object({
  organization: Joi.string().required(),
  age_groups: Joi.array().items(Joi.string()).min(1).required(),
  genders: Joi.array().items(Joi.string().valid('Boys', 'Girls', 'Mixed')).min(1).required(),
  divisions: Joi.array().items(Joi.string()).min(1).required(),
  season: Joi.string().required(),
  level: Joi.string().valid('Recreational', 'Competitive', 'Elite').required()
});

// GET /api/leagues - Get all leagues with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      organization, 
      age_group, 
      gender, 
      division, 
      season, 
      level, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    let query = db('leagues')
      .select(
        'leagues.*',
        db.raw('COUNT(teams.id) as team_count'),
        db.raw('COUNT(games.id) as game_count')
      )
      .leftJoin('teams', 'leagues.id', 'teams.league_id')
      .leftJoin('games', 'leagues.id', 'games.league_id')
      .groupBy('leagues.id')
      .orderBy('leagues.created_at', 'desc');

    // Apply filters
    if (organization) query = query.where('leagues.organization', 'ilike', `%${organization}%`);
    if (age_group) query = query.where('leagues.age_group', age_group);
    if (gender) query = query.where('leagues.gender', gender);
    if (division) query = query.where('leagues.division', 'ilike', `%${division}%`);
    if (season) query = query.where('leagues.season', 'ilike', `%${season}%`);
    if (level) query = query.where('leagues.level', level);

    const offset = (page - 1) * limit;
    const leagues = await query.limit(limit).offset(offset);

    // Get total count for pagination
    let countQuery = db('leagues').count('* as count');
    if (organization) countQuery = countQuery.where('organization', 'ilike', `%${organization}%`);
    if (age_group) countQuery = countQuery.where('age_group', age_group);
    if (gender) countQuery = countQuery.where('gender', gender);
    if (division) countQuery = countQuery.where('division', 'ilike', `%${division}%`);
    if (season) countQuery = countQuery.where('season', 'ilike', `%${season}%`);
    if (level) countQuery = countQuery.where('level', level);
    
    const [{ count }] = await countQuery;

    res.json({
      success: true,
      data: {
        leagues: leagues.map(league => ({
          ...league,
          team_count: parseInt(league.team_count) || 0,
          game_count: parseInt(league.game_count) || 0
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
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// GET /api/leagues/:id - Get specific league with teams
router.get('/:id', async (req, res) => {
  try {
    const league = await db('leagues').where('id', req.params.id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const teams = await db('teams')
      .where('league_id', req.params.id)
      .orderBy('rank', 'asc');

    const games = await db('games')
      .select(
        'games.*',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name'
      )
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .where('games.league_id', req.params.id)
      .orderBy('games.game_date', 'asc');

    res.json({
      success: true,
      data: {
        league,
        teams,
        games,
        stats: {
          team_count: teams.length,
          game_count: games.length,
          upcoming_games: games.filter(g => new Date(g.game_date) > new Date()).length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching league:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
});

// POST /api/leagues - Create new league
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = leagueSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if league already exists
    const existingLeague = await db('leagues')
      .where({
        organization: value.organization,
        age_group: value.age_group,
        gender: value.gender,
        division: value.division,
        season: value.season
      })
      .first();

    if (existingLeague) {
      return res.status(409).json({ 
        error: 'League already exists with these parameters' 
      });
    }

    const [league] = await db('leagues').insert(value).returning('*');

    res.status(201).json({
      success: true,
      data: { league },
      message: 'League created successfully'
    });
  } catch (error) {
    console.error('Error creating league:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// POST /api/leagues/bulk - Create multiple leagues
router.post('/bulk', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = bulkLeagueSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { organization, age_groups, genders, divisions, season, level } = value;
    const leaguesToCreate = [];
    const duplicates = [];

    // Generate all combinations
    for (const age_group of age_groups) {
      for (const gender of genders) {
        for (const division of divisions) {
          const leagueParams = {
            organization,
            age_group,
            gender,
            division,
            season,
            level
          };

          // Check for existing league
          const existing = await db('leagues')
            .where(leagueParams)
            .first();

          if (existing) {
            duplicates.push(`${organization} ${age_group} ${gender} ${division} - ${season}`);
          } else {
            leaguesToCreate.push(leagueParams);
          }
        }
      }
    }

    // Create new leagues
    const createdLeagues = [];
    if (leaguesToCreate.length > 0) {
      const leagues = await db('leagues').insert(leaguesToCreate).returning('*');
      createdLeagues.push(...leagues);
    }

    res.status(201).json({
      success: true,
      data: {
        created: createdLeagues,
        duplicates,
        summary: {
          requested: age_groups.length * genders.length * divisions.length,
          created: createdLeagues.length,
          duplicates: duplicates.length
        }
      },
      message: `Created ${createdLeagues.length} leagues. ${duplicates.length} duplicates skipped.`
    });
  } catch (error) {
    console.error('Error creating bulk leagues:', error);
    res.status(500).json({ error: 'Failed to create bulk leagues' });
  }
});

// PUT /api/leagues/:id - Update league
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = leagueSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const [league] = await db('leagues')
      .where('id', req.params.id)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({
      success: true,
      data: { league },
      message: 'League updated successfully'
    });
  } catch (error) {
    console.error('Error updating league:', error);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// DELETE /api/leagues/:id - Delete league
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const league = await db('leagues').where('id', req.params.id).first();
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if league has teams or games
    const teamCount = await db('teams').where('league_id', req.params.id).count('* as count').first();
    const gameCount = await db('games').where('league_id', req.params.id).count('* as count').first();

    if (parseInt(teamCount.count) > 0 || parseInt(gameCount.count) > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete league with existing teams or games',
        details: {
          teams: parseInt(teamCount.count),
          games: parseInt(gameCount.count)
        }
      });
    }

    await db('leagues').where('id', req.params.id).del();

    res.json({
      success: true,
      message: 'League deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

// GET /api/leagues/options/filters - Get filter options for dropdowns
router.get('/options/filters', async (req, res) => {
  try {
    const organizations = await db('leagues').distinct('organization').orderBy('organization');
    const age_groups = await db('leagues').distinct('age_group').orderBy('age_group');
    const genders = await db('leagues').distinct('gender').orderBy('gender');
    const divisions = await db('leagues').distinct('division').orderBy('division');
    const seasons = await db('leagues').distinct('season').orderBy('season', 'desc');
    const levels = await db('leagues').distinct('level').orderBy('level');

    res.json({
      success: true,
      data: {
        organizations: organizations.map(o => o.organization),
        age_groups: age_groups.map(a => a.age_group),
        genders: genders.map(g => g.gender),
        divisions: divisions.map(d => d.division),
        seasons: seasons.map(s => s.season),
        levels: levels.map(l => l.level)
      }
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

module.exports = router;