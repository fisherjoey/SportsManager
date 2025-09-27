/**
 * @fileoverview Teams Routes - TypeScript Implementation
 * @description Express routes for team management with comprehensive functionality
 * including CRUD operations, bulk operations, team generation, and advanced filtering.
 */

import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Database, UUID, AuthenticatedRequest, PaginatedResult } from '../types';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
const { ResponseFormatter } = require('../utils/response-formatters');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
import { ErrorFactory } from '../utils/errors';
const { QueryBuilder, QueryHelpers } = require('../utils/query-builders');
const { queryCache, CacheHelpers, CacheInvalidation } = require('../utils/query-cache');
import db from '../config/database';

const router = express.Router();

// Type definitions for this route module
interface TeamQueryParams {
  page?: number;
  limit?: number;
  league_id?: UUID;
  organization?: string;
  age_group?: string;
  gender?: 'Boys' | 'Girls' | 'Mixed';
  season?: string;
  search?: string;
}

interface TeamCreateBody {
  name: string;
  league_id: UUID;
  rank?: number;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface BulkTeamCreateBody {
  league_id: UUID;
  teams: Array<{
    name: string;
    rank?: number;
    location?: string;
    contact_email?: string;
    contact_phone?: string;
  }>;
}

interface BulkGenerateTeamBody {
  league_id: UUID;
  count: number;
  name_pattern?: string;
  location_base?: string;
  auto_rank?: boolean;
}

interface TeamUpdateBody {
  name?: string;
  league_id?: UUID;
  rank?: number;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface TeamWithDetails {
  id: UUID;
  name: string;
  league_id: UUID;
  rank: number;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  organization: string;
  age_group: string;
  gender: 'Boys' | 'Girls' | 'Mixed';
  division: string;
  season: string;
  level: string;
  game_count: number;
  created_at: Date;
  updated_at: Date;
}

interface TeamDetail {
  team: {
    id: UUID;
    name: string;
    league_id: UUID;
    rank: number;
    location?: string;
    contact_email?: string;
    contact_phone?: string;
    organization: string;
    age_group: string;
    gender: 'Boys' | 'Girls' | 'Mixed';
    division: string;
    season: string;
    level: string;
  };
  games: Array<{
    id: UUID;
    home_team_name: string;
    away_team_name: string;
    team_role: 'home' | 'away';
    game_date: Date;
    [key: string]: any;
  }>;
  stats: {
    total_games: number;
    home_games: number;
    away_games: number;
    upcoming_games: number;
  };
}

interface LeagueTeamsResult {
  league: {
    id: UUID;
    organization: string;
    age_group: string;
    gender: 'Boys' | 'Girls' | 'Mixed';
    division: string;
    season: string;
    level: string;
  };
  teams: Array<{
    id: UUID;
    name: string;
    rank: number;
    location?: string;
    contact_email?: string;
    contact_phone?: string;
    game_count: number;
  }>;
}

// Validation schemas
const teamSchema = Joi.object<TeamCreateBody>({
  name: Joi.string().required(),
  league_id: Joi.string().uuid().required(),
  rank: Joi.number().integer().min(1).default(1),
  location: Joi.string().allow(''),
  contact_email: Joi.string().email().allow(''),
  contact_phone: Joi.string().allow('')
});

const bulkTeamSchema = Joi.object<BulkTeamCreateBody>({
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

const bulkGenerateSchema = Joi.object<BulkGenerateTeamBody>({
  league_id: Joi.string().uuid().required(),
  count: Joi.number().integer().min(1).max(50).required(),
  name_pattern: Joi.string().default('Team {number}'),
  location_base: Joi.string().allow(''),
  auto_rank: Joi.boolean().default(true)
});

const teamQuerySchema = Joi.object<TeamQueryParams>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  league_id: Joi.string().uuid(),
  organization: Joi.string().trim(),
  age_group: Joi.string().trim(),
  gender: Joi.string().valid('Boys', 'Girls', 'Mixed'),
  season: Joi.string().trim(),
  search: Joi.string().trim().max(255)
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const leagueIdParamSchema = Joi.object({
  league_id: Joi.string().uuid().required()
});

// GET /api/teams - Get all teams with optional filtering
router.get('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'view:list',
  }),
  validateQuery(teamQuerySchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, any, TeamQueryParams>, res: Response): Promise<void> => {
    const { page = 1, limit = 50, ...filters } = (req as any).query;

    // Use cached aggregation for expensive team count queries
    const result = await CacheHelpers.cacheAggregation(
      async () => {
        // Optimized query using idx_teams_league_rank index
        let baseQuery = db('teams')
          .select(
            'teams.id',
            'teams.name',
            'teams.team_number',
            'teams.display_name',
            'teams.league_id',
            'teams.contact_email',
            'teams.contact_phone',
            'teams.metadata',
            'teams.created_at',
            'teams.updated_at',
            'leagues.organization',
            'leagues.age_group',
            'leagues.gender',
            'leagues.division',
            'leagues.season'
          )
          .join('leagues', 'teams.league_id', 'leagues.id');

        // Apply filters using optimized approach
        const filterMap = {
          league_id: 'teams.league_id',
          organization: 'leagues.organization',
          age_group: 'leagues.age_group',
          gender: 'leagues.gender',
          season: 'leagues.season',
          search: 'teams.name'
        };

        baseQuery = QueryBuilder.applyCommonFilters(baseQuery, filters, filterMap);

        // Optimized sorting using indexed columns
        baseQuery = baseQuery
          .orderBy('leagues.organization', 'asc')
          .orderBy('leagues.age_group', 'asc');

        // Get total count efficiently
        const countQuery = QueryBuilder.buildCountQuery(baseQuery, 'teams.id');
        const [{ count }] = await countQuery;

        // Apply pagination
        const paginatedQuery = QueryBuilder.applyPagination(baseQuery, page, limit);
        const teams: TeamWithDetails[] = await paginatedQuery;

        // Optimized game count query using subquery to avoid expensive JOINs
        const teamIds = teams.map(team => team.id);
        const gameCounts = teamIds.length > 0 ? await db('games')
          .select(
            db.raw('CASE WHEN home_team_id IS NOT NULL THEN home_team_id ELSE away_team_id END as team_id'),
            db.raw('COUNT(*) as game_count')
          )
          .where(function() {
            this.whereIn('home_team_id', teamIds)
              .orWhereIn('away_team_id', teamIds);
          })
          .groupBy(db.raw('CASE WHEN home_team_id IS NOT NULL THEN home_team_id ELSE away_team_id END')) : [];

        // Create lookup map for game counts
        const gameCountMap: Record<string, number> = {};
        gameCounts.forEach(gc => {
          gameCountMap[gc.team_id] = (gameCountMap[gc.team_id] || 0) + parseInt(gc.game_count);
        });

        const enhancedTeams: TeamWithDetails[] = teams.map(team => ({
          ...team,
          game_count: gameCountMap[team.id] || 0
        }));

        return {
          teams: enhancedTeams,
          pagination: {
            page: parseInt(page.toString()),
            limit: parseInt(limit.toString()),
            total: parseInt(count.toString()),
            pages: Math.ceil(parseInt(count.toString()) / parseInt(limit.toString()))
          }
        };
      },
      'teams_list',
      { ...filters, page, limit },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    ResponseFormatter.sendSuccess(res, result, 'Teams retrieved successfully');
  })
);

// GET /api/teams/:id - Get specific team with games
router.get('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'view:details',
    getResourceId: (req) => (req as any).params.id,
  }),
  validateParams(idParamSchema),
  enhancedAsyncHandler(async (req: Request<{ id: UUID }>, res: Response): Promise<void> => {
    const teamId = (req as any).params.id;

    // Cache team details with games for 10 minutes
    const result = await CacheHelpers.cachePaginatedQuery(
      async (): Promise<TeamDetail | null> => {
        // Optimized team query using idx_teams_league_rank index
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
          .where('teams.id', teamId)
          .first();

        if (!team) {
          return null;
        }

        // Optimized games query using idx_games_date_location and team indexes
        const games = await db('games')
          .select(
            'games.*',
            'home_team.name as home_team_name',
            'away_team.name as away_team_name',
            db.raw(`CASE
              WHEN games.home_team_id = ? THEN 'home'
              ELSE 'away'
            END as team_role`, [teamId])
          )
          .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
          .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
          .where(function() {
            this.where('games.home_team_id', teamId)
              .orWhere('games.away_team_id', teamId);
          })
          .orderBy('games.game_date', 'desc'); // Uses idx_games_date_location

        // Calculate stats efficiently
        const now = new Date();
        const stats = games.reduce((acc, game) => {
          acc.total_games++;
          if (game.team_role === 'home') {
            acc.home_games++;
          } else {
            acc.away_games++;
          }
          if (new Date(game.game_date) > now) {
            acc.upcoming_games++;
          }
          return acc;
        }, {
          total_games: 0,
          home_games: 0,
          away_games: 0,
          upcoming_games: 0
        });

        return {
          team,
          games,
          stats
        };
      },
      `team_${teamId}`,
      {},
      {},
      10 * 60 * 1000
    );

    if (!result) {
      throw ErrorFactory.notFound('Team not found', teamId);
    }

    ResponseFormatter.sendSuccess(res, result, 'Team retrieved successfully');
  })
);

// POST /api/teams - Create new team
router.post('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'create',
  }),
  validateBody(teamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, TeamCreateBody>, res: Response): Promise<void> => {
    const value = (req as any).body;

    // Check if league exists
    const league = await db('leagues').where('id', value.league_id).first();
    if (!league) {
      throw ErrorFactory.notFound('League not found', value.league_id);
    }

    // Check if team name already exists in this league
    const existingTeam = await db('teams')
      .where('league_id', value.league_id)
      .where('name', value.name)
      .first();

    if (existingTeam) {
      throw ErrorFactory.conflict('Team name already exists in this league');
    }

    const [team] = await db('teams').insert(value).returning('*');

    // Invalidate related caches
    CacheInvalidation.invalidateTeams(queryCache);

    ResponseFormatter.sendCreated(
      res,
      { team },
      'Team created successfully',
      `/api/teams/${(team as any).id}`
    );
  })
);

// POST /api/teams/bulk - Create multiple teams
router.post('/bulk',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'bulk_create',
  }),
  validateBody(bulkTeamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, BulkTeamCreateBody>, res: Response): Promise<void> => {
    const { league_id, teams } = (req as any).body;

    // Check if league exists
    const league = await db('leagues').where('id', league_id).first();
    if (!league) {
      throw ErrorFactory.notFound('League not found', league_id);
    }

    // Check for duplicate names within the request and existing teams
    const existingTeams = await db('teams')
      .where('league_id', league_id)
      .pluck('name');

    const duplicates: string[] = [];
    const validTeams: TeamCreateBody[] = [];
    const requestedNames = new Set<string>();

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
    const createdTeams: any[] = [];
    if (validTeams.length > 0) {
      const newTeams = await db('teams').insert(validTeams as any).returning('*');
      createdTeams.push(...newTeams);

      // Invalidate related caches
      CacheInvalidation.invalidateTeams(queryCache);
    }

    ResponseFormatter.sendCreated(
      res,
      {
        created: createdTeams,
        duplicates,
        summary: {
          requested: teams.length,
          created: createdTeams.length,
          duplicates: duplicates.length
        }
      },
      `Created ${createdTeams.length} teams. ${duplicates.length} duplicates skipped.`
    );
  })
);

// POST /api/teams/generate - Generate teams with pattern
router.post('/generate',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'generate',
  }),
  validateBody(bulkGenerateSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, BulkGenerateTeamBody>, res: Response): Promise<void> => {
    const { league_id, count, name_pattern = 'Team {number}', location_base, auto_rank } = (req as any).body;

    // Check if league exists
    const league = await db('leagues').where('id', league_id).first();
    if (!league) {
      throw ErrorFactory.notFound('League not found', league_id);
    }

    // Get existing team names to avoid duplicates
    const existingTeams = await db('teams')
      .where('league_id', league_id)
      .pluck('name');

    const teamsToCreate: TeamCreateBody[] = [];
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
    const createdTeams: any[] = [];
    if (teamsToCreate.length > 0) {
      const newTeams = await db('teams').insert(teamsToCreate as any).returning('*');
      createdTeams.push(...newTeams);

      // Invalidate related caches
      CacheInvalidation.invalidateTeams(queryCache);
    }

    ResponseFormatter.sendCreated(
      res,
      {
        created: createdTeams,
        league: {
          id: (league as any).id,
          organization: (league as any).organization,
          age_group: (league as any).age_group,
          gender: (league as any).gender,
          division: (league as any).division
        },
        summary: {
          requested: count,
          created: createdCount,
          skipped: skipCount
        }
      },
      `Generated ${createdCount} teams. ${skipCount} names already existed.`
    );
  })
);

// PUT /api/teams/:id - Update team
router.put('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'update',
    getResourceId: (req) => (req as any).params.id,
  }),
  validateParams(idParamSchema),
  validateBody(teamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, TeamUpdateBody>, res: Response): Promise<void> => {
    const teamId = (req as any).params.id;
    const value = (req as any).body;

    // Check if new name conflicts with existing team in same league
    if (value.name) {
      const existingTeam = await db('teams')
        .where('league_id', value.league_id!)
        .where('name', value.name)
        .where('id', '!=', teamId)
        .first();

      if (existingTeam) {
        throw ErrorFactory.conflict('Team name already exists in this league');
      }
    }

    const [team] = await db('teams')
      .where('id', teamId)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!team) {
      throw ErrorFactory.notFound('Team not found', teamId);
    }

    // Invalidate related caches
    CacheInvalidation.invalidateTeams(queryCache, teamId);

    ResponseFormatter.sendSuccess(res, { team }, 'Team updated successfully');
  })
);

// DELETE /api/teams/:id - Delete team
router.delete('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'delete',
    getResourceId: (req) => (req as any).params.id,
  }),
  validateParams(idParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }>, res: Response): Promise<void> => {
    const teamId = (req as any).params.id;

    const team = await db('teams').where('id', teamId).first();
    if (!team) {
      throw ErrorFactory.notFound('Team not found', teamId);
    }

    // Check if team has games
    const gameCount = await db('games')
      .where('home_team_id', teamId)
      .orWhere('away_team_id', teamId)
      .count('* as count')
      .first();

    if (parseInt((gameCount as any).count.toString()) > 0) {
      throw ErrorFactory.conflict('Cannot delete team with existing games', {
        games: parseInt((gameCount as any).count.toString())
      });
    }

    await db('teams').where('id', teamId).del();

    // Invalidate related caches
    CacheInvalidation.invalidateTeams(queryCache, teamId);

    ResponseFormatter.sendSuccess(res, null, 'Team deleted successfully');
  })
);

// GET /api/teams/league/:league_id - Get all teams for a specific league
router.get('/league/:league_id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'team',
    action: 'view:list',
  }),
  validateParams(leagueIdParamSchema),
  enhancedAsyncHandler(async (req: Request<{ league_id: UUID }>, res: Response): Promise<void> => {
    const leagueId = (req as any).params.league_id;

    // Cache league teams for 10 minutes
    const result = await CacheHelpers.cacheAggregation(
      async (): Promise<LeagueTeamsResult | null> => {
        // Optimized query using idx_teams_league_rank index
        const teams = await db('teams')
          .select('teams.*')
          .where('teams.league_id', leagueId)
          .orderBy((db.raw('"teams"."rank"') as any), 'asc'); // Uses idx_teams_league_rank

        const league = await db('leagues').where('id', leagueId).first();
        if (!league) {
          return null;
        }

        // Optimized game count query using separate query to avoid expensive JOINs
        const teamIds = teams.map(team => team.id);
        const gameCounts = teamIds.length > 0 ? await db('games')
          .select(
            db.raw('CASE WHEN home_team_id IS NOT NULL THEN home_team_id ELSE away_team_id END as team_id'),
            db.raw('COUNT(*) as game_count')
          )
          .where(function() {
            this.whereIn('home_team_id', teamIds)
              .orWhereIn('away_team_id', teamIds);
          })
          .groupBy(db.raw('CASE WHEN home_team_id IS NOT NULL THEN home_team_id ELSE away_team_id END')) : [];

        // Create lookup map for game counts
        const gameCountMap: Record<string, number> = {};
        gameCounts.forEach(gc => {
          gameCountMap[gc.team_id] = (gameCountMap[gc.team_id] || 0) + parseInt(gc.game_count);
        });

        const enhancedTeams = teams.map(team => ({
          ...team,
          game_count: gameCountMap[team.id] || 0
        }));

        return {
          league: league as any,
          teams: enhancedTeams
        };
      },
      'league_teams',
      { league_id: leagueId },
      10 * 60 * 1000
    );

    if (!result) {
      throw ErrorFactory.notFound('League not found', leagueId);
    }

    ResponseFormatter.sendSuccess(res, result, 'League teams retrieved successfully');
  })
);

export default router;