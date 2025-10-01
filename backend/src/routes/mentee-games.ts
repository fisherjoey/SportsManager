// @ts-nocheck

/**
 * @fileoverview Mentee Games Management API Routes
 * @description API endpoints for managing mentee game assignments and tracking their progress
 * @version 1.0.0
 * 
 * This module provides RESTful API endpoints for mentors and administrators to view
 * and track their mentees' game assignments, including upcoming games, game history,
 * and performance analytics.
 */

import express from 'express';
const router = express.Router();
import Joi from 'joi';

// Middleware imports
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { ResponseFormatter  } from '../utils/response-formatters';
import { enhancedAsyncHandler  } from '../middleware/enhanced-error-handling';
import { validateParams, validateQuery  } from '../middleware/validation';
import { ErrorFactory  } from '../utils/errors';
import { MenteeGameSchemas  } from '../utils/validation-schemas';

// Database and service imports
import db from '../config/database';
import MentorshipService from '../services/MentorshipService';

// Initialize services
const mentorshipService = new MentorshipService(db);

// ===== VALIDATION SCHEMAS =====

const MenteeIdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

// Using schemas from validation-schemas.js

// ===== HELPER FUNCTIONS =====

/**
 * Validate mentorship access for game data
 * @param {string} menteeId - Mentee user ID
 * @param {string} requestingUserId - Requesting user ID
 * @returns {Object} Mentorship relationship if valid
 */
async function validateMenteeAccess(menteeId, requestingUserId) {
  try {
    // Check if requesting user is the mentee themselves
    if (menteeId === requestingUserId) {
      return { isMentee: true };
    }

    // Check if requesting user is a mentor of this mentee
    const mentorships = await mentorshipService.getMentorshipsByMentor(requestingUserId, {
      status: 'active',
      includeDetails: false
    });

    const mentorship = mentorships.find(m => m.mentee_id === menteeId);
    if (mentorship) {
      return { isMentor: true, mentorship };
    }

    // Check if user has admin permissions (handled by middleware, but verify relationship exists)
    // This allows admins to view any mentee's games
    const anyMentorship = await db('mentorships')
      .where('mentee_id', menteeId)
      .first();

    if (!anyMentorship) {
      throw new Error('Mentee not found or not in mentorship program');
    }

    return { isAdmin: true };

  } catch (error) {
    console.error(`Error validating mentee access ${menteeId}:`, error);
    throw error;
  }
}

/**
 * Build game assignments query with proper joins and filters
 * @param {string} menteeId - Mentee user ID
 * @param {Object} filters - Query filters
 * @returns {Object} Knex query builder
 */
function buildGamesQuery(menteeId, filters = {}) {
  const { 
    status, 
    date_from, 
    date_to, 
    include_details = true,
    sort_by = 'game_date',
    sort_order = 'desc'
  } = filters;

  let query = db('game_assignments as ga')
    .where('ga.user_id', menteeId);

  if (include_details) {
    query = query
      .leftJoin('games as g', 'ga.game_id', 'g.id')
      .leftJoin('teams as home_team', 'g.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'g.away_team_id', 'away_team.id')
      .leftJoin('positions as p', 'ga.position_id', 'p.id')
      .leftJoin('users as assigned_by_user', 'ga.assigned_by', 'assigned_by_user.id')
      .select(
        'ga.*',
        'g.game_date',
        'g.game_time',
        'g.location',
        'g.field',
        'g.level',
        'g.game_type',
        'g.division',
        'g.season',
        'g.pay_rate',
        'g.wage_multiplier',
        'home_team.name as home_team_name',
        'home_team.display_name as home_team_display',
        'away_team.name as away_team_name', 
        'away_team.display_name as away_team_display',
        'p.name as position_name',
        'p.description as position_description',
        'assigned_by_user.name as assigned_by_name'
      );
  } else {
    query = query.select('ga.*');
  }

  // Apply status filter
  if (status) {
    query = query.where('ga.status', status);
  }

  // Apply date range filters
  if (date_from && include_details) {
    query = query.where('g.game_date', '>=', date_from);
  }
  if (date_to && include_details) {
    query = query.where('g.game_date', '<=', date_to);
  }

  // Apply sorting
  if (include_details) {
    if (sort_by === 'game_date') {
      query = query.orderBy('g.game_date', sort_order).orderBy('g.game_time', sort_order);
    } else if (sort_by === 'wage') {
      query = query.orderBy('ga.calculated_wage', sort_order);
    } else {
      query = query.orderBy(`ga.${sort_by}`, sort_order);
    }
  } else {
    query = query.orderBy(`ga.${sort_by}`, sort_order);
  }

  return query;
}

// ===== ROUTES =====

/**
 * GET /api/mentees/:id/games
 * Get mentee's game assignments with comprehensive details
 */
router.get('/:id/games',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentee_game',
    action: 'view:list',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(MenteeIdParamSchema),
  validateQuery(MenteeGameSchemas.gameFilters),
  enhancedAsyncHandler(async (req, res) => {
    const menteeId = req.params.id;
    const userId = req.user.id;
    const { page, limit, ...filters } = req.query;

    try {
      // Validate access to mentee data
      const accessInfo = await validateMenteeAccess(menteeId, userId);

      // Build the query
      const query = buildGamesQuery(menteeId, filters);
      
      // Get total count for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();

      // Apply pagination
      const offset = (page - 1) * limit;
      const dataQuery = query.limit(limit).offset(offset);

      // Execute queries
      const [games, countResult] = await Promise.all([
        dataQuery,
        countQuery
      ]);

      const total = parseInt(countResult.total) || 0;
      const totalPages = Math.ceil(total / limit);

      // Get mentee basic info
      const menteeInfo = await db('users')
        .select('id', 'name', 'email')
        .where('id', menteeId)
        .first();

      // Calculate summary statistics
      const stats = {
        total_assignments: total,
        pending: games.filter(g => g.status === 'pending').length,
        accepted: games.filter(g => g.status === 'accepted').length,
        completed: games.filter(g => g.status === 'completed').length,
        declined: games.filter(g => g.status === 'declined').length
      };

      const response = {
        data: games,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        meta: {
          mentee: menteeInfo,
          statistics: stats,
          access_level: accessInfo.isMentee ? 'self' : (accessInfo.isMentor ? 'mentor' : 'admin'),
          filters_applied: Object.keys(filters).length > 0 ? filters : null
        }
      };

      return ResponseFormatter.sendSuccess(res, response, 'Mentee games retrieved successfully');

    } catch (error) {
      console.error(`Error getting games for mentee ${menteeId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentee not found or not accessible');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to mentee game data');
      }
      throw ErrorFactory.internalServer('Failed to retrieve mentee games');
    }
  })
);

/**
 * GET /api/mentees/:id/games/upcoming
 * Get mentee's upcoming game assignments
 */
router.get('/:id/games/upcoming',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentee_game',
    action: 'view:upcoming',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(MenteeIdParamSchema),
  validateQuery(MenteeGameSchemas.upcomingGames),
  enhancedAsyncHandler(async (req, res) => {
    const menteeId = req.params.id;
    const userId = req.user.id;
    const { limit, days_ahead, include_details } = req.query;

    try {
      // Validate access to mentee data
      await validateMenteeAccess(menteeId, userId);

      // Calculate date range
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days_ahead);

      // Build query for upcoming games
      const filters = {
        date_from: today.toISOString().split('T')[0],
        date_to: endDate.toISOString().split('T')[0],
        include_details,
        sort_by: 'game_date',
        sort_order: 'asc'
      };

      const query = buildGamesQuery(menteeId, filters)
        .whereIn('ga.status', ['pending', 'accepted'])
        .limit(limit);

      const upcomingGames = await query;

      // Get next game specifically
      const nextGame = upcomingGames.length > 0 ? upcomingGames[0] : null;

      // Group games by week for better organization
      const gamesByWeek = {};
      upcomingGames.forEach(game => {
        const gameDate = new Date(game.game_date);
        const weekStart = new Date(gameDate);
        weekStart.setDate(gameDate.getDate() - gameDate.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!gamesByWeek[weekKey]) {
          gamesByWeek[weekKey] = {
            week_start: weekKey,
            games: []
          };
        }
        gamesByWeek[weekKey].games.push(game);
      });

      const response = {
        upcoming_games: upcomingGames,
        next_game: nextGame,
        games_by_week: Object.values(gamesByWeek),
        meta: {
          total_upcoming: upcomingGames.length,
          days_ahead,
          date_range: {
            from: today.toISOString().split('T')[0],
            to: endDate.toISOString().split('T')[0]
          }
        }
      };

      return ResponseFormatter.sendSuccess(res, response, 'Upcoming games retrieved successfully');

    } catch (error) {
      console.error(`Error getting upcoming games for mentee ${menteeId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentee not found or not accessible');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to mentee game data');
      }
      throw ErrorFactory.internalServer('Failed to retrieve upcoming games');
    }
  })
);

/**
 * GET /api/mentees/:id/games/history
 * Get mentee's game history with performance analytics
 */
router.get('/:id/games/history',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentee_game',
    action: 'view:history',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(MenteeIdParamSchema),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().optional(),
    season: Joi.string().optional(),
    include_analytics: Joi.boolean().default(true)
  })),
  enhancedAsyncHandler(async (req, res) => {
    const menteeId = req.params.id;
    const userId = req.user.id;
    const { page, limit, date_from, date_to, season, include_analytics } = req.query;

    try {
      // Validate access to mentee data
      await validateMenteeAccess(menteeId, userId);

      // Build query for completed games
      const filters = {
        date_from: date_from || '2020-01-01', // Default to reasonable past date
        date_to: date_to || new Date().toISOString().split('T')[0],
        include_details: true,
        sort_by: 'game_date',
        sort_order: 'desc'
      };

      let query = buildGamesQuery(menteeId, filters)
        .where('ga.status', 'completed');

      // Apply season filter if provided
      if (season) {
        query = query.where('g.season', season);
      }

      // Get total count for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();

      // Apply pagination
      const offset = (page - 1) * limit;
      const dataQuery = query.limit(limit).offset(offset);

      // Execute queries
      const [games, countResult] = await Promise.all([
        dataQuery,
        countQuery
      ]);

      const total = parseInt(countResult.total) || 0;
      const totalPages = Math.ceil(total / limit);

      let analytics = null;

      // Calculate analytics if requested
      if (include_analytics && games.length > 0) {
        const totalWages = games.reduce((sum, game) => sum + (parseFloat(game.calculated_wage) || 0), 0);
        const avgWage = totalWages / games.length;
        
        // Group by game type and level
        const gameTypeStats = {};
        const levelStats = {};
        const seasonStats = {};
        
        games.forEach(game => {
          // Game type stats
          if (!gameTypeStats[game.game_type]) {
            gameTypeStats[game.game_type] = { count: 0, totalWage: 0 };
          }
          gameTypeStats[game.game_type].count++;
          gameTypeStats[game.game_type].totalWage += parseFloat(game.calculated_wage) || 0;
          
          // Level stats
          if (!levelStats[game.level]) {
            levelStats[game.level] = { count: 0, totalWage: 0 };
          }
          levelStats[game.level].count++;
          levelStats[game.level].totalWage += parseFloat(game.calculated_wage) || 0;
          
          // Season stats
          if (!seasonStats[game.season]) {
            seasonStats[game.season] = { count: 0, totalWage: 0 };
          }
          seasonStats[game.season].count++;
          seasonStats[game.season].totalWage += parseFloat(game.calculated_wage) || 0;
        });

        analytics = {
          total_games: games.length,
          total_wages_earned: totalWages.toFixed(2),
          average_wage_per_game: avgWage.toFixed(2),
          game_type_breakdown: gameTypeStats,
          level_breakdown: levelStats,
          season_breakdown: seasonStats,
          date_range: {
            earliest_game: games[games.length - 1]?.game_date,
            latest_game: games[0]?.game_date
          }
        };
      }

      const response = {
        data: games,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        analytics,
        meta: {
          filters_applied: { date_from, date_to, season }
        }
      };

      return ResponseFormatter.sendSuccess(res, response, 'Game history retrieved successfully');

    } catch (error) {
      console.error(`Error getting game history for mentee ${menteeId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentee not found or not accessible');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to mentee game data');
      }
      throw ErrorFactory.internalServer('Failed to retrieve game history');
    }
  })
);

/**
 * GET /api/mentees/:id/games/analytics
 * Get comprehensive analytics for mentee's refereeing performance
 */
router.get('/:id/games/analytics',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentee_game',
    action: 'view:analytics',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(MenteeIdParamSchema),
  validateQuery(MenteeGameSchemas.analytics),
  enhancedAsyncHandler(async (req, res) => {
    const menteeId = req.params.id;
    const userId = req.user.id;
    const { date_from, date_to, season, compare_to_previous } = req.query;

    try {
      // Validate access to mentee data
      await validateMenteeAccess(menteeId, userId);

      // Set default date range to current year if not specified
      const currentYear = new Date().getFullYear();
      const defaultDateFrom = date_from || `${currentYear}-01-01`;
      const defaultDateTo = date_to || new Date().toISOString().split('T')[0];

      // Build analytics query
      let analyticsQuery = db('game_assignments as ga')
        .leftJoin('games as g', 'ga.game_id', 'g.id')
        .where('ga.user_id', menteeId)
        .where('ga.status', 'completed')
        .where('g.game_date', '>=', defaultDateFrom)
        .where('g.game_date', '<=', defaultDateTo);

      if (season) {
        analyticsQuery = analyticsQuery.where('g.season', season);
      }

      const analyticsData = await analyticsQuery.select(
        'ga.*',
        'g.game_date',
        'g.level',
        'g.game_type',
        'g.season',
        'g.pay_rate',
        'g.wage_multiplier'
      );

      // Calculate comprehensive analytics
      const analytics = {
        summary: {
          total_games: analyticsData.length,
          total_earnings: analyticsData.reduce((sum, game) => sum + (parseFloat(game.calculated_wage) || 0), 0),
          average_wage: 0,
          date_range: { from: defaultDateFrom, to: defaultDateTo }
        },
        monthly_breakdown: {},
        level_performance: {},
        game_type_performance: {},
        acceptance_rate: {
          total_assignments: 0,
          accepted: 0,
          declined: 0,
          completed: analyticsData.length,
          rate: 0
        },
        trends: {
          games_per_month: {},
          earnings_per_month: {}
        }
      };

      if (analyticsData.length > 0) {
        analytics.summary.average_wage = analytics.summary.total_earnings / analyticsData.length;

        // Monthly breakdown
        analyticsData.forEach(game => {
          const month = game.game_date.substring(0, 7); // YYYY-MM
          if (!analytics.monthly_breakdown[month]) {
            analytics.monthly_breakdown[month] = {
              games: 0,
              earnings: 0,
              levels: new Set(),
              game_types: new Set()
            };
          }
          analytics.monthly_breakdown[month].games++;
          analytics.monthly_breakdown[month].earnings += parseFloat(game.calculated_wage) || 0;
          analytics.monthly_breakdown[month].levels.add(game.level);
          analytics.monthly_breakdown[month].game_types.add(game.game_type);
        });

        // Convert sets to arrays for JSON serialization
        Object.values(analytics.monthly_breakdown).forEach(month => {
          month.levels = Array.from(month.levels);
          month.game_types = Array.from(month.game_types);
        });

        // Level and game type performance
        analyticsData.forEach(game => {
          const level = game.level || 'Unknown';
          const gameType = game.game_type || 'Unknown';
          
          if (!analytics.level_performance[level]) {
            analytics.level_performance[level] = { games: 0, earnings: 0 };
          }
          analytics.level_performance[level].games++;
          analytics.level_performance[level].earnings += parseFloat(game.calculated_wage) || 0;
          
          if (!analytics.game_type_performance[gameType]) {
            analytics.game_type_performance[gameType] = { games: 0, earnings: 0 };
          }
          analytics.game_type_performance[gameType].games++;
          analytics.game_type_performance[gameType].earnings += parseFloat(game.calculated_wage) || 0;
        });

        // Get acceptance rate data
        const allAssignments = await db('game_assignments')
          .where('user_id', menteeId)
          .select('status');
        
        analytics.acceptance_rate.total_assignments = allAssignments.length;
        analytics.acceptance_rate.accepted = allAssignments.filter(a => a.status === 'accepted').length;
        analytics.acceptance_rate.declined = allAssignments.filter(a => a.status === 'declined').length;
        analytics.acceptance_rate.rate = analytics.acceptance_rate.total_assignments > 0 
          ? (analytics.acceptance_rate.accepted / analytics.acceptance_rate.total_assignments * 100).toFixed(1)
          : 0;
      }

      const response = {
        analytics,
        meta: {
          period: season ? `${season} season` : `${defaultDateFrom} to ${defaultDateTo}`,
          mentee_id: menteeId
        }
      };

      return ResponseFormatter.sendSuccess(res, response, 'Analytics retrieved successfully');

    } catch (error) {
      console.error(`Error getting analytics for mentee ${menteeId}:`, error);
      if (error.message.includes('not found')) {
        throw ErrorFactory.notFound('Mentee not found or not accessible');
      }
      if (error.message.includes('Access denied')) {
        throw ErrorFactory.forbidden('Access denied to mentee analytics');
      }
      throw ErrorFactory.internalServer('Failed to retrieve analytics');
    }
  })
);

export default router;