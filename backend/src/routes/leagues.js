const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { QueryBuilder, QueryHelpers } = require('../utils/query-builders');
const { queryCache, CacheHelpers, CacheInvalidation } = require('../utils/query-cache');

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
// Requires: leagues:read permission
router.get('/', authenticateToken, requirePermission('leagues:read'), async (req, res) => {
  try {
    const filters = {
      organization: req.query.organization,
      age_group: req.query.age_group,
      gender: req.query.gender,
      division: req.query.division,
      season: req.query.season,
      level: req.query.level
    };
    
    const paginationParams = QueryBuilder.validatePaginationParams(req.query);
    const { page, limit } = paginationParams;
    
    // Use cached aggregation for expensive league count queries
    const result = await CacheHelpers.cacheAggregation(
      async () => {
        // Optimized base query without expensive JOINs
        let baseQuery = db('leagues')
          .select('leagues.*');
        
        // Apply filters using QueryBuilder
        const filterMap = {
          organization: 'leagues.organization',
          age_group: 'leagues.age_group',
          gender: 'leagues.gender',
          division: 'leagues.division',
          season: 'leagues.season',
          level: 'leagues.level'
        };
        
        baseQuery = QueryBuilder.applyCommonFilters(baseQuery, filters, filterMap);
        baseQuery = baseQuery.orderBy('leagues.created_at', 'desc');
        
        // Get total count efficiently
        const countQuery = QueryBuilder.buildCountQuery(baseQuery);
        const [{ count }] = await countQuery;
        
        // Apply pagination
        const paginatedQuery = QueryBuilder.applyPagination(baseQuery, page, limit);
        const leagues = await paginatedQuery;
        
        // Get counts using separate optimized queries instead of expensive JOINs
        const leagueIds = leagues.map(league => league.id);
        
        // Optimized team counts using idx_teams_league_rank index
        const teamCounts = leagueIds.length > 0 ? await db('teams')
          .select('league_id', db.raw('COUNT(*) as team_count'))
          .whereIn('league_id', leagueIds)
          .groupBy('league_id') : [];
        
        // Optimized game counts - games table should have league_id indexed
        const gameCounts = leagueIds.length > 0 ? await db('games')
          .select('league_id', db.raw('COUNT(*) as game_count'))
          .whereIn('league_id', leagueIds)
          .groupBy('league_id') : [];
        
        // Create lookup maps
        const teamCountMap = {};
        teamCounts.forEach(tc => {
          teamCountMap[tc.league_id] = parseInt(tc.team_count);
        });
        
        const gameCountMap = {};
        gameCounts.forEach(gc => {
          gameCountMap[gc.league_id] = parseInt(gc.game_count);
        });
        
        return {
          leagues: leagues.map(league => ({
            ...league,
            team_count: teamCountMap[league.id] || 0,
            game_count: gameCountMap[league.id] || 0
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(count),
            pages: Math.ceil(count / limit)
          }
        };
      },
      'leagues_list',
      { ...filters, page, limit },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// GET /api/leagues/:id - Get specific league with teams
router.get('/:id', async (req, res) => {
  try {
    const leagueId = req.params.id;
    
    // Cache league details for 10 minutes
    const result = await CacheHelpers.cachePaginatedQuery(
      async () => {
        const league = await db('leagues').where('id', leagueId).first();
        if (!league) {
          return null;
        }

        // Optimized teams query using idx_teams_league_rank index
        const teams = await db('teams')
          .where('league_id', leagueId)
          .orderBy('rank', 'asc'); // Uses idx_teams_league_rank

        // Optimized games query using indexes
        const games = await db('games')
          .select(
            'games.*',
            'home_team.name as home_team_name',
            'away_team.name as away_team_name'
          )
          .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
          .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
          .where('games.league_id', leagueId)
          .orderBy('games.game_date', 'asc'); // Uses idx_games_date_location

        // Calculate stats efficiently
        const now = new Date();
        const upcoming_games = games.filter(g => new Date(g.game_date) > now).length;

        return {
          league,
          teams,
          games,
          stats: {
            team_count: teams.length,
            game_count: games.length,
            upcoming_games
          }
        };
      },
      `league_${leagueId}`,
      {},
      {},
      10 * 60 * 1000
    );
    
    if (!result) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({
      success: true,
      data: result
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
    
    // Invalidate related caches
    CacheInvalidation.invalidateLeagues(queryCache);

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
      
      // Invalidate related caches
      CacheInvalidation.invalidateLeagues(queryCache);
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
    
    // Invalidate related caches
    CacheInvalidation.invalidateLeagues(queryCache, req.params.id);

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
    
    // Invalidate related caches
    CacheInvalidation.invalidateLeagues(queryCache, req.params.id);

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
    // Cache filter options for 30 minutes as they change infrequently
    const result = await CacheHelpers.cacheLookupData(
      async () => {
        // Use Promise.all for parallel execution of independent queries
        const [organizations, age_groups, genders, divisions, seasons, levels] = await Promise.all([
          db('leagues').distinct('organization').orderBy('organization'),
          db('leagues').distinct('age_group').orderBy('age_group'),
          db('leagues').distinct('gender').orderBy('gender'),
          db('leagues').distinct('division').orderBy('division'),
          db('leagues').distinct('season').orderBy('season', 'desc'),
          db('leagues').distinct('level').orderBy('level')
        ]);

        return {
          organizations: organizations.map(o => o.organization),
          age_groups: age_groups.map(a => a.age_group),
          genders: genders.map(g => g.gender),
          divisions: divisions.map(d => d.division),
          seasons: seasons.map(s => s.season),
          levels: levels.map(l => l.level)
        };
      },
      'filter_options',
      30 * 60 * 1000 // Cache for 30 minutes
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

module.exports = router;