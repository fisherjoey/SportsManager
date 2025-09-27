/**
 * @fileoverview Game management routes for the Sports Management API (TypeScript)
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
 */

import express, { Request, Response, Router } from 'express';
import Joi from 'joi';
import { 
  GameEntity, 
  GameWithTeamsView,
  TeamEntity,
  LeagueEntity,
  AssignmentEntity,
  GameStatus,
  GameType,
  Gender,
  UUID,
  PaginatedResult
} from '../types';
import { AuthenticatedRequest } from '../types/auth.types';
// Import middleware and utilities with proper ES6 imports for TypeScript
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { getGameResourceAttributes } from '../middleware/cerbos-migration-helpers';
import { validateQuery, validateIdParam } from '../middleware/sanitization';
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams, validateQuery: validateQuerySchema } = require('../middleware/validation');
import { ErrorFactory } from '../utils/errors';
const { ResponseFormatter } = require('../utils/response-formatters');
const { IdParamSchema } = require('../utils/validation-schemas');
const { createAuditLog, AUDIT_EVENTS } = require('../middleware/auditTrail');
import { checkGameSchedulingConflicts } from '../services/conflictDetectionService';
const { QueryBuilder, QueryHelpers } = require('../utils/query-builders');
const { queryCache, CacheHelpers, CacheInvalidation } = require('../utils/query-cache');

import db from '../config/database';

const router: Router = express.Router();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Query parameter interfaces
export interface GetGamesQuery {
  status?: string;
  level?: string;
  game_type?: string;
  date_from?: string;
  date_to?: string;
  postal_code?: string;
  page?: string;
  limit?: string;
}

export interface GameAssignmentsQuery {
  game_id?: string;
  user_id?: string;
  status?: string;
}

// Request body interfaces for game operations
export interface TeamData {
  organization: string;
  ageGroup: string;
  gender: 'Boys' | 'Girls';
  rank: number;
}

export interface CreateGameBody {
  homeTeam: TeamData;
  awayTeam: TeamData;
  date: string;
  time: string;
  location: string;
  postalCode: string;
  level: string;
  gameType: GameType;
  division: string;
  season: string;
  payRate: number;
  refsNeeded: number;
  wageMultiplier: number;
  wageMultiplierReason?: string;
}

export interface UpdateGameBody {
  homeTeam?: TeamData;
  awayTeam?: TeamData;
  date?: string;
  time?: string;
  location?: string;
  postalCode?: string;
  level?: string;
  gameType?: GameType;
  division?: string;
  season?: string;
  payRate?: number;
  refsNeeded?: number;
  wageMultiplier?: number;
  wageMultiplierReason?: string;
}

export interface UpdateGameStatusBody {
  status: 'assigned' | 'unassigned' | 'up-for-grabs' | 'completed' | 'cancelled';
}

export interface BulkImportGamesBody {
  games: CreateGameBody[];
}

// Response interfaces
export interface GameResponse {
  id: UUID;
  homeTeam: TeamData;
  awayTeam: TeamData;
  date: string;
  time: string;
  startTime: string;
  location: string;
  postalCode: string;
  level: string;
  gameType: string;
  division: string;
  season: string;
  payRate: number;
  status: string;
  refsNeeded: number;
  assignedReferees: string[];
  wageMultiplier: number;
  wageMultiplierReason: string;
  assignments: AssignmentInfo[];
  notes: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssignmentInfo {
  referee_name: string | null;
  position_name: string;
  status: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  errors: string[];
  conflicts?: any[];
}

export interface BulkImportResult {
  success: boolean;
  data: {
    importedGames: any[];
    summary: {
      totalSubmitted: number;
      successfulImports: number;
      failedImports: number;
    };
  };
  warnings?: any[];
  partialSuccess?: boolean;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

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
  wageMultiplier: Joi.number().min(0.1).max(5.0).optional().default(1.0),
  wageMultiplierReason: Joi.string().allow('', null).optional().default('')
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

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/games - Get all games with optional filters
 */
export const getGames = async (
  req: AuthenticatedRequest<{}, {}, {}, GetGamesQuery>,
  res: Response<PaginatedResult<GameResponse>>
): Promise<void> => {
  try {
    console.log('Games endpoint hit with query:', (req as any).query);
    
    const filters = {
      status: (req as any).query.status,
      level: (req as any).query.level,
      game_type: (req as any).query.game_type,
      date_from: (req as any).query.date_from,
      date_to: (req as any).query.date_to,
      postal_code: (req as any).query.postal_code
    };
    
    const paginationParams = QueryBuilder.validatePaginationParams((req as any).query);
    const { page, limit } = paginationParams;
  
    // Try to get cached results first
    const cacheKey = queryCache.generateKey('games_list', filters, { page, limit });
    const cachedResult = queryCache.get(cacheKey);
  
    if (cachedResult) {
      res.json(cachedResult);
      return;
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
    query = QueryBuilder.applyCommonFilters(query, filters, QueryHelpers.getGameFilterMap());
    
    // Apply date range optimization for better index usage
    if (filters.date_from || filters.date_to) {
      query = QueryBuilder.applyDateRange(query, 'games.date_time', filters.date_from, filters.date_to);
    }
    
    // Use optimized sorting - games.date_time is indexed
    query = query.orderBy('games.date_time', 'asc');
    
    // Get total count before pagination
    const countQuery = query.clone();
    const [{ count: totalCount }] = await countQuery.clearSelect().clearOrder().count('* as count');
    
    // Apply pagination
    query = QueryBuilder.applyPagination(query, page, limit);

    const games = await query;
    
    // PERFORMANCE OPTIMIZATION: Batch fetch all related data to avoid N+1 queries
    const gameIds = games.map((game: any) => game.id);
    const teamIds = [...new Set([
      ...games.map((game: any) => game.home_team_id).filter(Boolean),
      ...games.map((game: any) => game.away_team_id).filter(Boolean)
    ])];
      
    // Fetch all assignments in one query
    const allAssignments = gameIds.length > 0 ? await db('game_assignments')
    .leftJoin('users', 'game_assignments.referee_id', 'users.id')
    .select(
      'game_assignments.game_id',
      'users.name as referee_name', 
      'game_assignments.position as position_name', 
      'game_assignments.status'
    )
    .whereIn('game_assignments.game_id', gameIds) : [];
    
    // Fetch all teams with league info in one query
    const allTeams = teamIds.length > 0 ? await db('teams')
    .leftJoin('leagues', 'teams.league_id', 'leagues.id')
    .select(
      'teams.id',
      'teams.name',
      'teams.display_name',
      'teams.team_number',
      'leagues.organization',
      'leagues.age_group',
      'leagues.gender'
    )
    .whereIn('teams.id', teamIds) : [];
    
    // Create lookup maps for O(1) access
    const assignmentsByGameId: Record<string, AssignmentInfo[]> = {};
    allAssignments.forEach((assignment: any) => {
      if (!assignmentsByGameId[assignment.game_id]) {
        assignmentsByGameId[assignment.game_id] = [];
      }
      assignmentsByGameId[assignment.game_id].push({
        referee_name: assignment.referee_name,
        position_name: assignment.position_name,
        status: assignment.status
      });
    });
    
    const teamsById: Record<string, TeamData> = {};
    allTeams.forEach((team: any) => {
      teamsById[team.id] = {
        organization: team.organization,
        ageGroup: team.age_group,
        gender: team.gender,
        rank: team.team_number || 1
      };
    });
    
    // Transform games using lookup maps (no async operations needed)
    const transformedGames: GameResponse[] = games.map((game: any) => {
      const homeTeam = teamsById[game.home_team_id] || {
        organization: game.home_team_name || 'Unknown',
        ageGroup: 'Unknown',
        gender: 'Unknown' as 'Boys' | 'Girls',
        rank: 1
      };
      const awayTeam = teamsById[game.away_team_id] || {
        organization: game.away_team_name || 'Unknown',
        ageGroup: 'Unknown',
        gender: 'Unknown' as 'Boys' | 'Girls',
        rank: 1
      };
      const assignments = assignmentsByGameId[game.id] || [];
      
      // Parse date and time from date_time field
      let gameDate = '';
      let gameTime = '';
      if (game.date_time) {
        const dt = new Date(game.date_time);
        gameDate = dt.toISOString().split('T')[0]; // YYYY-MM-DD format
        gameTime = dt.toTimeString().slice(0, 5); // HH:MM format
      }
        
      return {
        id: game.id,
        homeTeam,
        awayTeam,
        date: gameDate,
        time: gameTime,
        startTime: gameTime,
        location: game.field || game.location || '',
        postalCode: game.postal_code || '',
        level: game.level || 'Recreational',
        gameType: game.game_type || 'Community',
        division: game.division || '',
        season: game.season || '',
        payRate: parseFloat(game.base_wage) || 0,
        status: game.metadata?.status || 'unassigned',
        refsNeeded: game.refs_needed || 2,
        assignedReferees: assignments.map(a => a.referee_name).filter(Boolean) as string[],
        wageMultiplier: parseFloat(game.wage_multiplier) || 1.0,
        wageMultiplierReason: '',
        assignments,
        notes: game.metadata?.notes || '', 
        createdAt: game.created_at,
        updatedAt: game.updated_at
      };
    });

    const result: PaginatedResult<GameResponse> = {
      data: transformedGames,
      pagination: {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        total: parseInt(totalCount.toString()),
        totalPages: Math.ceil(totalCount / limit),
        hasNext: Math.ceil(totalCount / limit) > parseInt(page.toString()),
        hasPrevious: parseInt(page.toString()) > 1
      }
    };
      
    // Cache the result for 5 minutes
    queryCache.set(cacheKey, result, 5 * 60 * 1000);
      
    res.json(result);
  } catch (error) {
    console.error('Games endpoint error:', error);
    throw error;
  }
};

/**
 * GET /api/games/:id - Get specific game
 */
export const getGameById = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response<GameWithTeamsView | { error: string }>
): Promise<void> => {
  const gameId = (req as any).params.id;
  
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
    throw ErrorFactory.notFound('Game', (req as any).params.id);
  }
  
  res.json(cachedGame);
};

/**
 * POST /api/games - Create new game
 * Requires: games:create permission
 */
export const createGame = async (
  req: AuthenticatedRequest<{}, {}, CreateGameBody>,
  res: Response
): Promise<void> => {
  const value = (req as any).body;

  // Create a combined datetime from date and time
  const gameDateTime = new Date(`${value.date}T${value.time}:00.000Z`);

  // Check for venue scheduling conflicts
  const conflictCheck: ConflictCheckResult = await checkGameSchedulingConflicts({
    location: value.location,
    date_time: value.date,
    game_time: value.time
  });

  // First, find or create teams and league
  let homeTeamId = null;
  let awayTeamId = null;
  let leagueId = null;

  try {
    // Find or create league
    const leagueName = `${value.homeTeam.organization} ${value.homeTeam.ageGroup} ${value.homeTeam.gender} ${value.division}`;

    let league = await db('leagues')
      .where('organization', value.homeTeam.organization)
      .where('age_group', value.homeTeam.ageGroup)
      .where('gender', value.homeTeam.gender)
      .where('division', value.division)
      .where('season', value.season)
      .first();

    if (!league) {
      [league] = await db('leagues')
        .insert({
          organization: value.homeTeam.organization,
          age_group: value.homeTeam.ageGroup,
          gender: value.homeTeam.gender,
          division: value.division,
          season: value.season,
          name: leagueName,
          display_name: leagueName
        })
        .returning('*');
    }

    leagueId = league.id;

    // Find or create home team
    let homeTeam = await db('teams')
      .where('league_id', leagueId)
      .where('team_number', value.homeTeam.rank.toString())
      .first();

    if (!homeTeam) {
      const homeTeamName = `${value.homeTeam.organization} ${value.homeTeam.ageGroup} ${value.homeTeam.gender} #${value.homeTeam.rank}`;
      [homeTeam] = await db('teams')
        .insert({
          league_id: leagueId,
          team_number: value.homeTeam.rank.toString(),
          name: homeTeamName,
          display_name: homeTeamName
        })
        .returning('*');
    }

    homeTeamId = homeTeam.id;

    // Find or create away team
    let awayTeam = await db('teams')
      .where('league_id', leagueId)
      .where('team_number', value.awayTeam.rank.toString())
      .first();

    if (!awayTeam) {
      const awayTeamName = `${value.awayTeam.organization} ${value.awayTeam.ageGroup} ${value.awayTeam.gender} #${value.awayTeam.rank}`;
      [awayTeam] = await db('teams')
        .insert({
          league_id: leagueId,
          team_number: value.awayTeam.rank.toString(),
          name: awayTeamName,
          display_name: awayTeamName
        })
        .returning('*');
    }

    awayTeamId = awayTeam.id;

  } catch (error) {
    console.error('Error creating teams/league - Detailed error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    throw new Error(`Failed to create or find teams and league: ${error.message}`);
  }

  // Transform frontend data to database format matching current schema
  const dbData = {
    game_number: `G${Date.now()}`, // Generate unique game number
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    league_id: leagueId,
    date_time: gameDateTime,
    field: value.location,
    division: value.division,
    game_type: value.gameType,
    refs_needed: value.refsNeeded,
    base_wage: value.payRate,
    wage_multiplier: value.wageMultiplier,
    metadata: JSON.stringify({
      season: value.season,
      level: value.level,
      postalCode: value.postalCode,
      wageMultiplierReason: value.wageMultiplierReason,
      homeTeam: value.homeTeam,
      awayTeam: value.awayTeam
    })
  };

  console.log('Attempting to insert game with data:', JSON.stringify(dbData, null, 2));

  let game;
  try {
    const result = await db('games').insert(dbData).returning('*');
    game = result[0];
    console.log('Game inserted successfully:', game.id);
  } catch (dbError) {
    console.error('Database insert error:', dbError);
    console.error('Error details:', {
      message: dbError.message,
      code: dbError.code,
      detail: dbError.detail,
      table: dbError.table,
      constraint: dbError.constraint
    });
    throw dbError;
  }

  // Invalidate related caches
  CacheInvalidation.invalidateGames(queryCache);

  // Transform response back to frontend format
  const metadata = game.metadata ? JSON.parse(game.metadata) : {};
  const transformedGame: GameResponse = {
    id: game.id,
    homeTeam: metadata.homeTeam || value.homeTeam,
    awayTeam: metadata.awayTeam || value.awayTeam,
    date: game.date_time ? new Date(game.date_time).toISOString().split('T')[0] : '',
    time: game.date_time ? new Date(game.date_time).toTimeString().slice(0, 5) : '',
    startTime: game.date_time ? new Date(game.date_time).toTimeString().slice(0, 5) : '',
    location: game.field || '',
    postalCode: metadata.postalCode || '',
    level: metadata.level || value.level,
    gameType: game.game_type || 'Community',
    division: game.division || '',
    season: metadata.season || '',
    payRate: parseFloat(game.base_wage) || 0,
    status: 'unassigned',
    refsNeeded: game.refs_needed || 2,
    wageMultiplier: parseFloat(game.wage_multiplier) || 1.0,
    wageMultiplierReason: metadata.wageMultiplierReason || '',
    assignments: [],
    notes: '',
    assignedReferees: [],
    createdAt: game.created_at,
    updatedAt: game.updated_at
  };

  const response: any = {
    success: true,
    data: transformedGame
  };

  // Include venue conflict warnings if any
  if (conflictCheck.hasConflicts) {
    response.warnings = [`Venue conflict detected: ${conflictCheck.errors.join('; ')}`];
    response.conflicts = conflictCheck.conflicts;
  }

  ResponseFormatter.sendCreated(res, transformedGame, 'Game created successfully', `/api/games/${game.id}`);
};

/**
 * PUT /api/games/:id - Update game
 * Requires: games:update or games:manage permission
 */
export const updateGame = async (
  req: AuthenticatedRequest<{ id: string }, {}, UpdateGameBody>,
  res: Response
): Promise<void> => {
  try {
    const value = (req as any).body;

    // Check for venue scheduling conflicts if location, date, or time is being updated
    let conflictCheck: ConflictCheckResult = { hasConflicts: false, errors: [] };
    if (value.location || value.date || value.time) {
      // Get current game data to merge with updates
      const currentGame = await db('games').where('id', (req as any).params.id).first();
      if (!currentGame) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      conflictCheck = await checkGameSchedulingConflicts({
        location: value.location || currentGame.location,
        date_time: value.date || currentGame.date_time,
        game_time: value.time || currentGame.game_time
      }, (req as any).params.id);
    }

    const [game] = await db('games')
      .where('id', (req as any).params.id)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    // Invalidate related caches
    CacheInvalidation.invalidateGames(queryCache, (req as any).params.id);

    const response: any = {
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
};

/**
 * PATCH /api/games/:id/status - Update game status
 * Requires: games:update or games:manage permission
 */
export const updateGameStatus = async (
  req: AuthenticatedRequest<{ id: string }, {}, UpdateGameStatusBody>,
  res: Response
): Promise<void> => {
  try {
    const { status } = (req as any).body;
    const validStatuses = ['assigned', 'unassigned', 'up-for-grabs', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const [game] = await db('games')
      .where('id', (req as any).params.id)
      .update({ status, updated_at: new Date() })
      .returning('*');

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    // Invalidate related caches
    CacheInvalidation.invalidateGames(queryCache, (req as any).params.id);

    res.json(game);
  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({ error: 'Failed to update game status' });
  }
};

/**
 * DELETE /api/games/:id - Delete game
 * Requires: games:delete permission
 */
export const deleteGame = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const deletedCount = await db('games').where('id', (req as any).params.id).del();
    
    if (deletedCount === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    // Invalidate related caches
    CacheInvalidation.invalidateGames(queryCache, (req as any).params.id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
};

/**
 * POST /api/games/bulk-import - Bulk import games
 * Requires: games:create and games:manage permissions
 */
export const bulkImportGames = async (
  req: AuthenticatedRequest<{}, {}, BulkImportGamesBody>,
  res: Response<BulkImportResult>
): Promise<void> => {
  try {
    const { games } = (req as any).body;
    
    if (!Array.isArray(games) || games.length === 0) {
      res.status(400).json({ 
        success: false,
        data: { importedGames: [], summary: { totalSubmitted: 0, successfulImports: 0, failedImports: 0 } },
        error: 'Games array is required and cannot be empty' 
      } as any);
      return;
    }

    if (games.length > 100) {
      res.status(400).json({ 
        success: false,
        data: { importedGames: [], summary: { totalSubmitted: 0, successfulImports: 0, failedImports: 0 } },
        error: 'Maximum 100 games can be imported at once' 
      } as any);
      return;
    }

    // Validate each game
    const validationErrors: any[] = [];
    const validatedGames: any[] = [];

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
      res.status(400).json({ 
        success: false,
        data: { importedGames: [], summary: { totalSubmitted: 0, successfulImports: 0, failedImports: 0 } },
        error: 'Validation failed for some games',
        validationErrors,
        totalErrors: validationErrors.length,
        totalGames: games.length
      } as any);
      return;
    }

    const trx = await db.transaction();
    
    try {
      const createdGames: any[] = [];
      const gameCreationErrors: any[] = [];

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

        } catch (gameError: any) {
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

      const response: BulkImportResult = {
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

  } catch (error: any) {
    console.error('Error bulk importing games:', error);
    res.status(500).json({ 
      success: false,
      data: { importedGames: [], summary: { totalSubmitted: 0, successfulImports: 0, failedImports: 0 } },
      error: 'Failed to bulk import games',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    } as any);
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to get or create team
 */
async function getOrCreateTeam(trx: any, teamData: TeamData, division: string, season: string): Promise<any> {
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

/**
 * Helper function to get or create location
 */
async function getOrCreateLocation(trx: any, locationName: string, postalCode: string): Promise<any> {
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

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

// GET /api/games - Get all games with optional filters
// Note: validateQuery runs before authenticateToken to ensure proper error codes for invalid parameters
router.get('/', validateQuery('gamesFilter'), authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'list',
}), enhancedAsyncHandler(getGames));

// GET /api/games/:id - Get specific game
router.get('/:id', authenticateToken, validateIdParam, requireCerbosPermission({
  resource: 'game',
  action: 'view',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
}), enhancedAsyncHandler(getGameById));

// POST /api/games - Create new game
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'create',
}), validateBody(gameSchema), enhancedAsyncHandler(createGame));

// PUT /api/games/:id - Update game
router.put('/:id', authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'update',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
}), validateParams(IdParamSchema), validateBody(gameUpdateSchema), enhancedAsyncHandler(updateGame));

// PATCH /api/games/:id/status - Update game status
router.patch('/:id/status', authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'update',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
}), enhancedAsyncHandler(updateGameStatus));

// DELETE /api/games/:id - Delete game
router.delete('/:id', authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'delete',
  getResourceId: (req) => req.params.id,
  getResourceAttributes: async (req) => await getGameResourceAttributes(req.params.id),
  forbiddenMessage: 'You do not have permission to delete this game',
}), enhancedAsyncHandler(deleteGame));

// POST /api/games/bulk-import - Bulk import games
router.post('/bulk-import', authenticateToken, requireCerbosPermission({
  resource: 'game',
  action: 'create',
}), enhancedAsyncHandler(bulkImportGames));

export default router;