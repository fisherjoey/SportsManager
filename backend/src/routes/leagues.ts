/**
 * @fileoverview Leagues Routes - TypeScript Implementation
 * @description Express routes for league management with comprehensive functionality
 * including CRUD operations, bulk operations, filtering, and caching.
 */

import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Database, UUID, AuthenticatedRequest, PaginatedResult } from '../types';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth';
import { ResponseFormatter } from '../utils/response-formatters';
import { enhancedAsyncHandler } from '../middleware/enhanced-error-handling';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { ErrorFactory } from '../utils/errors';
import { QueryBuilder, QueryHelpers } from '../utils/query-builders';
import { queryCache, CacheHelpers, CacheInvalidation } from '../utils/query-cache';

const router = express.Router();

// Type definitions for this route module
interface LeagueQueryParams {
  page?: number;
  limit?: number;
  organization?: string;
  age_group?: string;
  gender?: 'Boys' | 'Girls' | 'Mixed';
  division?: string;
  season?: string;
  level?: 'Recreational' | 'Competitive' | 'Elite';
}

interface LeagueCreateBody {
  organization: string;
  age_group: string;
  gender: 'Boys' | 'Girls' | 'Mixed';
  division: string;
  season: string;
  level: 'Recreational' | 'Competitive' | 'Elite';
}

interface BulkLeagueCreateBody {
  organization: string;
  age_groups: string[];
  genders: ('Boys' | 'Girls' | 'Mixed')[];
  divisions: string[];
  season: string;
  level: 'Recreational' | 'Competitive' | 'Elite';
}

interface LeagueUpdateBody {
  organization?: string;
  age_group?: string;
  gender?: 'Boys' | 'Girls' | 'Mixed';
  division?: string;
  season?: string;
  level?: 'Recreational' | 'Competitive' | 'Elite';
}

interface LeagueWithCounts {
  id: UUID;
  organization: string;
  age_group: string;
  gender: 'Boys' | 'Girls' | 'Mixed';
  division: string;
  season: string;
  level: 'Recreational' | 'Competitive' | 'Elite';
  team_count: number;
  game_count: number;
  created_at: Date;
  updated_at: Date;
}

interface LeagueDetail {
  league: {
    id: UUID;
    organization: string;
    age_group: string;
    gender: 'Boys' | 'Girls' | 'Mixed';
    division: string;
    season: string;
    level: 'Recreational' | 'Competitive' | 'Elite';
    created_at: Date;
    updated_at: Date;
  };
  teams: Array<{
    id: UUID;
    name: string;
    rank: number;
    location?: string;
    contact_email?: string;
    contact_phone?: string;
  }>;
  games: Array<{
    id: UUID;
    home_team_name: string;
    away_team_name: string;
    game_date: Date;
    location?: string;
    [key: string]: any;
  }>;
  stats: {
    team_count: number;
    game_count: number;
    upcoming_games: number;
  };
}

interface FilterOptions {
  organizations: string[];
  age_groups: string[];
  genders: string[];
  divisions: string[];
  seasons: string[];
  levels: string[];
}

// Initialize database connection (will be injected)
let db: Database;

// Route initialization function
export function initializeRoutes(database: Database): express.Router {
  db = database;
  return router;
}

// Validation schemas
const leagueSchema = Joi.object<LeagueCreateBody>({
  organization: Joi.string().required(),
  age_group: Joi.string().required(),
  gender: Joi.string().valid('Boys', 'Girls', 'Mixed').required(),
  division: Joi.string().required(),
  season: Joi.string().required(),
  level: Joi.string().valid('Recreational', 'Competitive', 'Elite').required()
});

const bulkLeagueSchema = Joi.object<BulkLeagueCreateBody>({
  organization: Joi.string().required(),
  age_groups: Joi.array().items(Joi.string()).min(1).required(),
  genders: Joi.array().items(Joi.string().valid('Boys', 'Girls', 'Mixed')).min(1).required(),
  divisions: Joi.array().items(Joi.string()).min(1).required(),
  season: Joi.string().required(),
  level: Joi.string().valid('Recreational', 'Competitive', 'Elite').required()
});

const leagueQuerySchema = Joi.object<LeagueQueryParams>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  organization: Joi.string().trim(),
  age_group: Joi.string().trim(),
  gender: Joi.string().valid('Boys', 'Girls', 'Mixed'),
  division: Joi.string().trim(),
  season: Joi.string().trim(),
  level: Joi.string().valid('Recreational', 'Competitive', 'Elite')
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

// GET /api/leagues - Get all leagues with optional filtering
router.get('/',
  authenticateToken,
  requirePermission('leagues:read'),
  validateQuery(leagueQuerySchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, any, LeagueQueryParams>, res: Response): Promise<void> => {
    const { page = 1, limit = 50, ...filters } = req.query;

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
        const leagues: LeagueWithCounts[] = await paginatedQuery;

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
        const teamCountMap: Record<string, number> = {};
        teamCounts.forEach(tc => {
          teamCountMap[tc.league_id] = parseInt(tc.team_count);
        });

        const gameCountMap: Record<string, number> = {};
        gameCounts.forEach(gc => {
          gameCountMap[gc.league_id] = parseInt(gc.game_count);
        });

        const enhancedLeagues: LeagueWithCounts[] = leagues.map(league => ({
          ...league,
          team_count: teamCountMap[league.id] || 0,
          game_count: gameCountMap[league.id] || 0
        }));

        return {
          leagues: enhancedLeagues,
          pagination: {
            page: parseInt(page.toString()),
            limit: parseInt(limit.toString()),
            total: parseInt(count.toString()),
            pages: Math.ceil(parseInt(count.toString()) / parseInt(limit.toString()))
          }
        };
      },
      'leagues_list',
      { ...filters, page, limit },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    ResponseFormatter.sendSuccess(res, result, 'Leagues retrieved successfully');
  })
);

// GET /api/leagues/:id - Get specific league with teams
router.get('/:id',
  validateParams(idParamSchema),
  enhancedAsyncHandler(async (req: Request<{ id: UUID }>, res: Response): Promise<void> => {
    const leagueId = req.params.id;

    // Cache league details for 10 minutes
    const result = await CacheHelpers.cachePaginatedQuery(
      async (): Promise<LeagueDetail | null> => {
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
      throw ErrorFactory.notFound('League not found', leagueId);
    }

    ResponseFormatter.sendSuccess(res, result, 'League retrieved successfully');
  })
);

// POST /api/leagues - Create new league
router.post('/',
  authenticateToken,
  requireRole('admin'),
  validateBody(leagueSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, LeagueCreateBody>, res: Response): Promise<void> => {
    const value = req.body;

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
      throw ErrorFactory.conflict('League already exists with these parameters');
    }

    const [league] = await db('leagues').insert(value).returning('*');

    // Invalidate related caches
    CacheInvalidation.invalidateLeagues(queryCache);

    ResponseFormatter.sendCreated(
      res,
      { league },
      'League created successfully',
      `/api/leagues/${league.id}`
    );
  })
);

// POST /api/leagues/bulk - Create multiple leagues
router.post('/bulk',
  authenticateToken,
  requireRole('admin'),
  validateBody(bulkLeagueSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, BulkLeagueCreateBody>, res: Response): Promise<void> => {
    const { organization, age_groups, genders, divisions, season, level } = req.body;
    const leaguesToCreate: LeagueCreateBody[] = [];
    const duplicates: string[] = [];

    // Generate all combinations
    for (const age_group of age_groups) {
      for (const gender of genders) {
        for (const division of divisions) {
          const leagueParams: LeagueCreateBody = {
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
    const createdLeagues: any[] = [];
    if (leaguesToCreate.length > 0) {
      const leagues = await db('leagues').insert(leaguesToCreate).returning('*');
      createdLeagues.push(...leagues);

      // Invalidate related caches
      CacheInvalidation.invalidateLeagues(queryCache);
    }

    ResponseFormatter.sendCreated(
      res,
      {
        created: createdLeagues,
        duplicates,
        summary: {
          requested: age_groups.length * genders.length * divisions.length,
          created: createdLeagues.length,
          duplicates: duplicates.length
        }
      },
      `Created ${createdLeagues.length} leagues. ${duplicates.length} duplicates skipped.`
    );
  })
);

// PUT /api/leagues/:id - Update league
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  validateParams(idParamSchema),
  validateBody(leagueSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, LeagueUpdateBody>, res: Response): Promise<void> => {
    const leagueId = req.params.id;
    const value = req.body;

    const [league] = await db('leagues')
      .where('id', leagueId)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!league) {
      throw ErrorFactory.notFound('League not found', leagueId);
    }

    // Invalidate related caches
    CacheInvalidation.invalidateLeagues(queryCache, leagueId);

    ResponseFormatter.sendSuccess(res, { league }, 'League updated successfully');
  })
);

// DELETE /api/leagues/:id - Delete league
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validateParams(idParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }>, res: Response): Promise<void> => {
    const leagueId = req.params.id;

    const league = await db('leagues').where('id', leagueId).first();
    if (!league) {
      throw ErrorFactory.notFound('League not found', leagueId);
    }

    // Check if league has teams or games
    const teamCount = await db('teams').where('league_id', leagueId).count('* as count').first();
    const gameCount = await db('games').where('league_id', leagueId).count('* as count').first();

    if (parseInt(teamCount!.count.toString()) > 0 || parseInt(gameCount!.count.toString()) > 0) {
      throw ErrorFactory.conflict('Cannot delete league with existing teams or games', {
        teams: parseInt(teamCount!.count.toString()),
        games: parseInt(gameCount!.count.toString())
      });
    }

    await db('leagues').where('id', leagueId).del();

    // Invalidate related caches
    CacheInvalidation.invalidateLeagues(queryCache, leagueId);

    ResponseFormatter.sendSuccess(res, null, 'League deleted successfully');
  })
);

// GET /api/leagues/options/filters - Get filter options for dropdowns
router.get('/options/filters',
  enhancedAsyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Cache filter options for 30 minutes as they change infrequently
    const result = await CacheHelpers.cacheLookupData(
      async (): Promise<FilterOptions> => {
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

    ResponseFormatter.sendSuccess(res, result, 'Filter options retrieved successfully');
  })
);

export default router;