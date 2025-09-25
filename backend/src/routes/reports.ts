/**
 * @fileoverview Reports routes with TypeScript implementation
 * @description TypeScript implementation of reports routes providing comprehensive
 * analytics and reporting functionality for referee performance, assignment patterns,
 * financial summaries, and availability gap analysis.
 */

import express, { Request, Response } from 'express';
import Joi from 'joi';
import { Database } from '../types/database.types';
import { AuthenticatedRequest } from '../types/auth.types';
import { ApiResponse, PaginationOptions } from '../types/api.types';
import { authenticateToken, requireRole } from '../middleware/auth';

// Import database connection
const db: Database = require('../config/database');

const router = express.Router();

// Type definitions for report queries and responses
interface ReportQueryParams extends PaginationOptions {
  start_date?: string;
  end_date?: string;
  referee_id?: string;
  location_id?: string;
  league_id?: string;
  level?: string;
  game_type?: string;
}

interface PerformanceQueryParams extends ReportQueryParams {
  metrics?: string[];
}

interface RefereePerformanceMetrics {
  assignmentsCount: number;
  acceptedAssignments: number;
  declinedAssignments: number;
  completedAssignments: number;
  acceptanceRate: number;
  completionRate: number;
  declineRate: number;
  totalEarnings: number;
  averageWage: number;
  uniqueGameDays: number;
  gamesPerWeek: number;
}

interface RefereePerformanceData {
  refereeId: string;
  refereeName: string;
  refereeEmail: string;
  isAvailable: boolean;
  wagePerGame: number;
  metrics: RefereePerformanceMetrics;
}

interface RefereePerformanceResponse extends ApiResponse {
  data: {
    refereePerformance: RefereePerformanceData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    filters: Partial<PerformanceQueryParams>;
  };
}

interface AssignmentPatternData {
  dayOfWeek: {
    dayOfWeek: number;
    dayName: string;
    assignmentCount: number;
    uniqueReferees: number;
  }[];
  timeOfDay: {
    hour: number;
    assignmentCount: number;
    uniqueReferees: number;
  }[];
  locations: {
    locationId: string;
    locationName: string;
    locationAddress: string;
    assignmentCount: number;
    uniqueReferees: number;
    averageWage: number;
  }[];
  refereePositions: {
    refereeId: string;
    refereeName: string;
    positionId: string;
    positionName: string;
    assignmentCount: number;
  }[];
  refereePairs: {
    referee1Id: string;
    referee1Name: string;
    referee2Id: string;
    referee2Name: string;
    gamesTogether: number;
  }[];
}

interface AssignmentPatternsResponse extends ApiResponse {
  data: {
    assignmentPatterns: AssignmentPatternData;
    filters: Partial<ReportQueryParams>;
  };
}

interface FinancialSummaryData {
  overall: {
    totalAssignments: number;
    uniqueReferees: number;
    uniqueGames: number;
    totalWages: number;
    averageWage: number;
    minWage: number;
    maxWage: number;
  };
  byReferee: {
    refereeId: string;
    refereeName: string;
    refereeEmail: string;
    assignmentCount: number;
    totalEarnings: number;
    averageWage: number;
  }[];
  byLocation: {
    locationId: string;
    locationName: string;
    assignmentCount: number;
    totalWages: number;
    averageWage: number;
  }[];
  byLevel: {
    level: string;
    assignmentCount: number;
    totalWages: number;
    averageWage: number;
  }[];
  byGameType: {
    gameType: string;
    assignmentCount: number;
    totalWages: number;
    averageWage: number;
  }[];
  monthlyTrend: {
    year: number;
    month: number;
    assignmentCount: number;
    totalWages: number;
    averageWage: number;
  }[];
}

interface FinancialSummaryResponse extends ApiResponse {
  data: {
    financialSummary: FinancialSummaryData;
    filters: Partial<ReportQueryParams>;
  };
}

interface AvailabilityGapsData {
  unassignedGames: {
    gameId: string;
    gameDate: string;
    gameTime: string;
    level: string;
    gameType: string;
    refsNeeded: number;
    payRate: number;
    locationName: string;
    locationAddress: string;
    homeTeamName: string;
    awayTeamName: string;
    leagueName: string;
  }[];
  partiallyAssignedGames: {
    gameId: string;
    gameDate: string;
    gameTime: string;
    level: string;
    gameType: string;
    refsNeeded: number;
    assignedRefs: number;
    refsStillNeeded: number;
    locationName: string;
    homeTeamName: string;
    awayTeamName: string;
  }[];
  timePatterns: {
    dayOfWeek: number;
    dayName: string;
    hourOfDay: number;
    unassignedCount: number;
  }[];
  locationGaps: {
    locationId: string;
    locationName: string;
    locationAddress: string;
    unassignedCount: number;
    totalRefsNeeded: number;
  }[];
  levelGaps: {
    level: string;
    unassignedCount: number;
    totalRefsNeeded: number;
  }[];
}

interface AvailabilityGapsResponse extends ApiResponse {
  data: {
    availabilityGaps: AvailabilityGapsData;
    summary: {
      totalUnassignedGames: number;
      totalPartiallyAssigned: number;
      totalRefereesNeeded: number;
    };
    filters: Partial<ReportQueryParams>;
  };
}

// Validation schemas
const reportQuerySchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  referee_id: Joi.string().uuid(),
  location_id: Joi.string().uuid(),
  league_id: Joi.string().uuid(),
  level: Joi.string(),
  game_type: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const performanceQuerySchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  referee_id: Joi.string().uuid(),
  metrics: Joi.array().items(Joi.string().valid(
    'assignments_count', 'acceptance_rate', 'completion_rate',
    'total_earnings', 'average_wage', 'games_per_week'
  )).default(['assignments_count', 'acceptance_rate', 'completion_rate']),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

/**
 * GET /api/reports/referee-performance - Get referee performance metrics
 * @route GET /api/reports/referee-performance
 * @access Private (Authenticated users)
 * @param {PerformanceQueryParams} query - Query parameters for filtering
 * @returns {RefereePerformanceResponse} Referee performance data with pagination
 */
router.get('/referee-performance', authenticateToken, async (req: AuthenticatedRequest, res: Response<RefereePerformanceResponse>) => {
  try {
    const { error, value } = performanceQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { start_date, end_date, referee_id, metrics, page, limit } = value as PerformanceQueryParams;
    const offset = (page - 1) * limit;

    // Build base query for referee performance
    let baseQuery = db('users')
      .leftJoin('game_assignments', 'users.id', 'game_assignments.user_id')
      .leftJoin('games', 'game_assignments.game_id', 'games.id')
      .where('users.role', 'referee');

    // Apply filters
    if (referee_id) {
      baseQuery = baseQuery.where('users.id', referee_id);
    }

    if (start_date) {
      baseQuery = baseQuery.where('games.game_date', '>=', start_date);
    }

    if (end_date) {
      baseQuery = baseQuery.where('games.game_date', '<=', end_date);
    }

    // Get referee performance data
    const performanceData = await baseQuery
      .select(
        'users.id as referee_id',
        'users.name as referee_name',
        'users.email as referee_email',
        'users.is_available',
        'users.wage_per_game',
        db.raw('COUNT(CASE WHEN game_assignments.id IS NOT NULL THEN 1 END) as total_assignments'),
        db.raw('COUNT(CASE WHEN game_assignments.status = ? THEN 1 END', ['accepted']) as 'accepted_assignments',
        db.raw('COUNT(CASE WHEN game_assignments.status = ? THEN 1 END', ['declined']) as 'declined_assignments',
        db.raw('COUNT(CASE WHEN game_assignments.status = ? THEN 1 END', ['completed']) as 'completed_assignments',
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_earnings'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage'),
        db.raw('COUNT(DISTINCT games.game_date) as unique_game_days')
      )
      .groupBy('users.id', 'users.name', 'users.email', 'users.is_available', 'users.wage_per_game')
      .orderBy('total_assignments', 'desc')
      .limit(limit)
      .offset(offset);

    // Calculate derived metrics
    const enrichedData: RefereePerformanceData[] = performanceData.map((referee: any) => {
      const totalAssignments = parseInt(referee.total_assignments) || 0;
      const acceptedAssignments = parseInt(referee.accepted_assignments) || 0;
      const declinedAssignments = parseInt(referee.declined_assignments) || 0;
      const completedAssignments = parseInt(referee.completed_assignments) || 0;

      // Calculate rates
      const acceptanceRate = totalAssignments > 0 ?
        parseFloat(((acceptedAssignments / totalAssignments) * 100).toFixed(2)) : 0;
      const completionRate = acceptedAssignments > 0 ?
        parseFloat(((completedAssignments / acceptedAssignments) * 100).toFixed(2)) : 0;
      const declineRate = totalAssignments > 0 ?
        parseFloat(((declinedAssignments / totalAssignments) * 100).toFixed(2)) : 0;

      // Calculate games per week (assuming data spans multiple weeks)
      const uniqueGameDays = parseInt(referee.unique_game_days) || 0;
      const gamesPerWeek = uniqueGameDays > 0 ?
        parseFloat((totalAssignments / Math.max(1, uniqueGameDays / 7)).toFixed(2)) : 0;

      return {
        refereeId: referee.referee_id,
        refereeName: referee.referee_name,
        refereeEmail: referee.referee_email,
        isAvailable: referee.is_available,
        wagePerGame: parseFloat(referee.wage_per_game) || 0,
        metrics: {
          assignmentsCount: totalAssignments,
          acceptedAssignments,
          declinedAssignments,
          completedAssignments,
          acceptanceRate,
          completionRate,
          declineRate,
          totalEarnings: parseFloat(referee.total_earnings) || 0,
          averageWage: parseFloat(referee.average_wage) || 0,
          uniqueGameDays,
          gamesPerWeek
        }
      };
    });

    // Get total count for pagination
    let totalCountQuery = db('users')
      .leftJoin('game_assignments', 'users.id', 'game_assignments.user_id')
      .leftJoin('games', 'game_assignments.game_id', 'games.id')
      .where('users.role', 'referee');

    if (referee_id) {
      totalCountQuery = totalCountQuery.where('users.id', referee_id);
    }
    if (start_date) {
      totalCountQuery = totalCountQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      totalCountQuery = totalCountQuery.where('games.game_date', '<=', end_date);
    }

    const [{ count: totalCount }] = await totalCountQuery
      .countDistinct('users.id as count');

    res.json({
      success: true,
      data: {
        refereePerformance: enrichedData,
        pagination: {
          page,
          limit,
          total: parseInt(totalCount as string),
          pages: Math.ceil(parseInt(totalCount as string) / limit)
        },
        filters: {
          start_date,
          end_date,
          referee_id,
          metrics
        }
      }
    });

  } catch (error) {
    console.error('Error generating referee performance report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate referee performance report',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
      }
    });
  }
});

/**
 * GET /api/reports/assignment-patterns - Get assignment pattern analysis
 * @route GET /api/reports/assignment-patterns
 * @access Private (Authenticated users)
 * @param {ReportQueryParams} query - Query parameters for filtering
 * @returns {AssignmentPatternsResponse} Assignment pattern analysis data
 */
router.get('/assignment-patterns', authenticateToken, async (req: AuthenticatedRequest, res: Response<AssignmentPatternsResponse>) => {
  try {
    const { error, value } = reportQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { start_date, end_date, referee_id, location_id, league_id, level } = value as ReportQueryParams;

    // Build base query
    let baseQuery = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id');

    // Apply filters
    if (start_date) {
      baseQuery = baseQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      baseQuery = baseQuery.where('games.game_date', '<=', end_date);
    }
    if (referee_id) {
      baseQuery = baseQuery.where('game_assignments.user_id', referee_id);
    }
    if (location_id) {
      baseQuery = baseQuery.where('games.location_id', location_id);
    }
    if (league_id) {
      baseQuery = baseQuery.where('leagues.id', league_id);
    }
    if (level) {
      baseQuery = baseQuery.where('games.level', level);
    }

    // Get assignment patterns by day of week
    const dayOfWeekPatterns = await baseQuery.clone()
      .select(
        db.raw('EXTRACT(DOW FROM games.game_date) as day_of_week'),
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees')
      )
      .groupBy(db.raw('EXTRACT(DOW FROM games.game_date)'))
      .orderBy('day_of_week');

    // Get assignment patterns by time of day
    const timePatterns = await baseQuery.clone()
      .select(
        db.raw('EXTRACT(HOUR FROM games.game_time) as hour_of_day'),
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees')
      )
      .groupBy(db.raw('EXTRACT(HOUR FROM games.game_time)'))
      .orderBy('hour_of_day');

    // Get assignment patterns by location
    const locationPatterns = await baseQuery.clone()
      .select(
        'locations.id as location_id',
        'locations.name as location_name',
        'locations.address as location_address',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees'),
        db.raw('AVG(game_assignments.calculated_wage) as average_wage')
      )
      .groupBy('locations.id', 'locations.name', 'locations.address')
      .orderBy('assignment_count', 'desc')
      .limit(20);

    // Get frequent referee-position combinations
    const refereePositionPatterns = await baseQuery.clone()
      .select(
        'users.id as referee_id',
        'users.name as referee_name',
        'positions.id as position_id',
        'positions.name as position_name',
        db.raw('COUNT(*) as assignment_count')
      )
      .groupBy('users.id', 'users.name', 'positions.id', 'positions.name')
      .having(db.raw('COUNT(*)'), '>', 1)
      .orderBy('assignment_count', 'desc')
      .limit(50);

    // Get referee pairs (referees who often work together)
    const refereePairsQuery = `
      SELECT
        r1.id as referee1_id,
        r1.name as referee1_name,
        r2.id as referee2_id,
        r2.name as referee2_name,
        COUNT(*) as games_together
      FROM game_assignments ga1
      JOIN game_assignments ga2 ON ga1.game_id = ga2.game_id AND ga1.user_id < ga2.user_id
      JOIN users r1 ON ga1.user_id = r1.id
      JOIN users r2 ON ga2.user_id = r2.id
      JOIN games g ON ga1.game_id = g.id
      WHERE 1=1
      ${start_date ? `AND g.game_date >= '${start_date}'` : ''}
      ${end_date ? `AND g.game_date <= '${end_date}'` : ''}
      GROUP BY r1.id, r1.name, r2.id, r2.name
      HAVING COUNT(*) > 2
      ORDER BY games_together DESC
      LIMIT 20
    `;

    const refereePairs = await db.raw(refereePairsQuery);

    // Format day of week data
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedDayPatterns = dayOfWeekPatterns.map((pattern: any) => ({
      dayOfWeek: parseInt(pattern.day_of_week),
      dayName: dayNames[parseInt(pattern.day_of_week)],
      assignmentCount: parseInt(pattern.assignment_count),
      uniqueReferees: parseInt(pattern.unique_referees)
    }));

    const assignmentPatterns: AssignmentPatternData = {
      dayOfWeek: formattedDayPatterns,
      timeOfDay: timePatterns.map((p: any) => ({
        hour: parseInt(p.hour_of_day),
        assignmentCount: parseInt(p.assignment_count),
        uniqueReferees: parseInt(p.unique_referees)
      })),
      locations: locationPatterns.map((p: any) => ({
        locationId: p.location_id,
        locationName: p.location_name,
        locationAddress: p.location_address,
        assignmentCount: parseInt(p.assignment_count),
        uniqueReferees: parseInt(p.unique_referees),
        averageWage: parseFloat(p.average_wage) || 0
      })),
      refereePositions: refereePositionPatterns.map((p: any) => ({
        refereeId: p.referee_id,
        refereeName: p.referee_name,
        positionId: p.position_id,
        positionName: p.position_name,
        assignmentCount: parseInt(p.assignment_count)
      })),
      refereePairs: refereePairs.rows?.map((p: any) => ({
        referee1Id: p.referee1_id,
        referee1Name: p.referee1_name,
        referee2Id: p.referee2_id,
        referee2Name: p.referee2_name,
        gamesTogether: parseInt(p.games_together)
      })) || []
    };

    res.json({
      success: true,
      data: {
        assignmentPatterns,
        filters: {
          start_date,
          end_date,
          referee_id,
          location_id,
          league_id,
          level
        }
      }
    });

  } catch (error) {
    console.error('Error generating assignment patterns report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate assignment patterns report',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
      }
    });
  }
});

/**
 * GET /api/reports/financial-summary - Get financial summary report
 * @route GET /api/reports/financial-summary
 * @access Private (Admin only)
 * @param {ReportQueryParams} query - Query parameters for filtering
 * @returns {FinancialSummaryResponse} Financial summary data with breakdowns
 */
router.get('/financial-summary', authenticateToken, requireRole('admin'), async (req: AuthenticatedRequest, res: Response<FinancialSummaryResponse>) => {
  try {
    const { error, value } = reportQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { start_date, end_date, referee_id, location_id, league_id, level, game_type } = value as ReportQueryParams;

    // Build base query
    let baseQuery = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id')
      .whereIn('game_assignments.status', ['accepted', 'completed']);

    // Apply filters
    if (start_date) {
      baseQuery = baseQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      baseQuery = baseQuery.where('games.game_date', '<=', end_date);
    }
    if (referee_id) {
      baseQuery = baseQuery.where('game_assignments.user_id', referee_id);
    }
    if (location_id) {
      baseQuery = baseQuery.where('games.location_id', location_id);
    }
    if (league_id) {
      baseQuery = baseQuery.where('leagues.id', league_id);
    }
    if (level) {
      baseQuery = baseQuery.where('games.level', level);
    }
    if (game_type) {
      baseQuery = baseQuery.where('games.game_type', game_type);
    }

    // Overall financial summary
    const overallSummary = await baseQuery.clone()
      .select(
        db.raw('COUNT(*) as total_assignments'),
        db.raw('COUNT(DISTINCT game_assignments.user_id) as unique_referees'),
        db.raw('COUNT(DISTINCT game_assignments.game_id) as unique_games'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage'),
        db.raw('COALESCE(MIN(game_assignments.calculated_wage), 0) as min_wage'),
        db.raw('COALESCE(MAX(game_assignments.calculated_wage), 0) as max_wage')
      )
      .first();

    // Financial breakdown by referee
    const refereeBreakdown = await baseQuery.clone()
      .select(
        'users.id as referee_id',
        'users.name as referee_name',
        'users.email as referee_email',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_earnings'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('users.id', 'users.name', 'users.email')
      .orderBy('total_earnings', 'desc')
      .limit(50);

    // Financial breakdown by location
    const locationBreakdown = await baseQuery.clone()
      .select(
        'locations.id as location_id',
        'locations.name as location_name',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('locations.id', 'locations.name')
      .orderBy('total_wages', 'desc')
      .limit(20);

    // Financial breakdown by game level
    const levelBreakdown = await baseQuery.clone()
      .select(
        'games.level',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('games.level')
      .orderBy('total_wages', 'desc');

    // Financial breakdown by game type
    const gameTypeBreakdown = await baseQuery.clone()
      .select(
        'games.game_type',
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy('games.game_type')
      .orderBy('total_wages', 'desc');

    // Monthly trend if date range spans multiple months
    const monthlyTrend = await baseQuery.clone()
      .select(
        db.raw('EXTRACT(YEAR FROM games.game_date) as year'),
        db.raw('EXTRACT(MONTH FROM games.game_date) as month'),
        db.raw('COUNT(*) as assignment_count'),
        db.raw('COALESCE(SUM(game_assignments.calculated_wage), 0) as total_wages'),
        db.raw('COALESCE(AVG(game_assignments.calculated_wage), 0) as average_wage')
      )
      .groupBy(db.raw('EXTRACT(YEAR FROM games.game_date), EXTRACT(MONTH FROM games.game_date)'))
      .orderBy(['year', 'month']);

    const financialSummary: FinancialSummaryData = {
      overall: {
        totalAssignments: parseInt(overallSummary?.total_assignments) || 0,
        uniqueReferees: parseInt(overallSummary?.unique_referees) || 0,
        uniqueGames: parseInt(overallSummary?.unique_games) || 0,
        totalWages: parseFloat(overallSummary?.total_wages) || 0,
        averageWage: parseFloat(overallSummary?.average_wage) || 0,
        minWage: parseFloat(overallSummary?.min_wage) || 0,
        maxWage: parseFloat(overallSummary?.max_wage) || 0
      },
      byReferee: refereeBreakdown.map((r: any) => ({
        refereeId: r.referee_id,
        refereeName: r.referee_name,
        refereeEmail: r.referee_email,
        assignmentCount: parseInt(r.assignment_count),
        totalEarnings: parseFloat(r.total_earnings),
        averageWage: parseFloat(r.average_wage)
      })),
      byLocation: locationBreakdown.map((l: any) => ({
        locationId: l.location_id,
        locationName: l.location_name,
        assignmentCount: parseInt(l.assignment_count),
        totalWages: parseFloat(l.total_wages),
        averageWage: parseFloat(l.average_wage)
      })),
      byLevel: levelBreakdown.map((l: any) => ({
        level: l.level,
        assignmentCount: parseInt(l.assignment_count),
        totalWages: parseFloat(l.total_wages),
        averageWage: parseFloat(l.average_wage)
      })),
      byGameType: gameTypeBreakdown.map((g: any) => ({
        gameType: g.game_type,
        assignmentCount: parseInt(g.assignment_count),
        totalWages: parseFloat(g.total_wages),
        averageWage: parseFloat(g.average_wage)
      })),
      monthlyTrend: monthlyTrend.map((m: any) => ({
        year: parseInt(m.year),
        month: parseInt(m.month),
        assignmentCount: parseInt(m.assignment_count),
        totalWages: parseFloat(m.total_wages),
        averageWage: parseFloat(m.average_wage)
      }))
    };

    res.json({
      success: true,
      data: {
        financialSummary,
        filters: {
          start_date,
          end_date,
          referee_id,
          location_id,
          league_id,
          level,
          game_type
        }
      }
    });

  } catch (error) {
    console.error('Error generating financial summary report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate financial summary report',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
      }
    });
  }
});

/**
 * GET /api/reports/availability-gaps - Get availability gap analysis
 * @route GET /api/reports/availability-gaps
 * @access Private (Authenticated users)
 * @param {ReportQueryParams} query - Query parameters for filtering
 * @returns {AvailabilityGapsResponse} Availability gap analysis data
 */
router.get('/availability-gaps', authenticateToken, async (req: AuthenticatedRequest, res: Response<AvailabilityGapsResponse>) => {
  try {
    const { error, value } = reportQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { start_date, end_date, location_id, level } = value as ReportQueryParams;

    // Build base query for unassigned games
    let unassignedQuery = db('games')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id')
      .where('games.status', 'unassigned');

    // Apply filters
    if (start_date) {
      unassignedQuery = unassignedQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      unassignedQuery = unassignedQuery.where('games.game_date', '<=', end_date);
    }
    if (location_id) {
      unassignedQuery = unassignedQuery.where('games.location_id', location_id);
    }
    if (level) {
      unassignedQuery = unassignedQuery.where('games.level', level);
    }

    // Get unassigned games details
    const unassignedGames = await unassignedQuery.clone()
      .select(
        'games.id as game_id',
        'games.game_date',
        'games.game_time',
        'games.level',
        'games.game_type',
        'games.refs_needed',
        'games.pay_rate',
        'locations.name as location_name',
        'locations.address as location_address',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        'leagues.name as league_name'
      )
      .orderBy('games.game_date', 'asc')
      .limit(100);

    // Get availability gaps by time patterns
    const timeGaps = await unassignedQuery.clone()
      .select(
        db.raw('EXTRACT(DOW FROM games.game_date) as day_of_week'),
        db.raw('EXTRACT(HOUR FROM games.game_time) as hour_of_day'),
        db.raw('COUNT(*) as unassigned_count')
      )
      .groupBy(db.raw('EXTRACT(DOW FROM games.game_date), EXTRACT(HOUR FROM games.game_time)'))
      .orderBy(['day_of_week', 'hour_of_day']);

    // Get availability gaps by location
    const locationGaps = await unassignedQuery.clone()
      .select(
        'locations.id as location_id',
        'locations.name as location_name',
        'locations.address as location_address',
        db.raw('COUNT(*) as unassigned_count'),
        db.raw('SUM(games.refs_needed) as total_refs_needed')
      )
      .groupBy('locations.id', 'locations.name', 'locations.address')
      .orderBy('unassigned_count', 'desc');

    // Get availability gaps by level
    const levelGaps = await unassignedQuery.clone()
      .select(
        'games.level',
        db.raw('COUNT(*) as unassigned_count'),
        db.raw('SUM(games.refs_needed) as total_refs_needed')
      )
      .groupBy('games.level')
      .orderBy('unassigned_count', 'desc');

    // Get partially assigned games (games that need more referees)
    let partiallyAssignedQuery = db('games')
      .leftJoin('locations', 'games.location_id', 'locations.id')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .leftJoin('leagues', 'home_team.league_id', 'leagues.id')
      .leftJoin('game_assignments', function(this: any) {
        this.on('games.id', '=', 'game_assignments.game_id')
          .andOn(db.raw('game_assignments.status IN (?, ?)', ['pending', 'accepted']));
      })
      .where('games.status', 'assigned')
      .whereRaw('(SELECT COUNT(*) FROM game_assignments ga WHERE ga.game_id = games.id AND ga.status IN (?, ?)) < games.refs_needed', ['pending', 'accepted']);

    if (start_date) {
      partiallyAssignedQuery = partiallyAssignedQuery.where('games.game_date', '>=', start_date);
    }
    if (end_date) {
      partiallyAssignedQuery = partiallyAssignedQuery.where('games.game_date', '<=', end_date);
    }
    if (location_id) {
      partiallyAssignedQuery = partiallyAssignedQuery.where('games.location_id', location_id);
    }
    if (level) {
      partiallyAssignedQuery = partiallyAssignedQuery.where('games.level', level);
    }

    const partiallyAssignedGames = await partiallyAssignedQuery
      .select(
        'games.id as game_id',
        'games.game_date',
        'games.game_time',
        'games.level',
        'games.game_type',
        'games.refs_needed',
        'locations.name as location_name',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        db.raw('COUNT(game_assignments.id) as assigned_refs')
      )
      .groupBy(
        'games.id', 'games.game_date', 'games.game_time', 'games.level',
        'games.game_type', 'games.refs_needed', 'locations.name',
        'home_team.name', 'away_team.name'
      )
      .orderBy('games.game_date', 'asc')
      .limit(50);

    // Format day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const availabilityGaps: AvailabilityGapsData = {
      unassignedGames: unassignedGames.map((game: any) => ({
        gameId: game.game_id,
        gameDate: game.game_date,
        gameTime: game.game_time,
        level: game.level,
        gameType: game.game_type,
        refsNeeded: parseInt(game.refs_needed),
        payRate: parseFloat(game.pay_rate) || 0,
        locationName: game.location_name,
        locationAddress: game.location_address,
        homeTeamName: game.home_team_name,
        awayTeamName: game.away_team_name,
        leagueName: game.league_name
      })),
      partiallyAssignedGames: partiallyAssignedGames.map((game: any) => ({
        gameId: game.game_id,
        gameDate: game.game_date,
        gameTime: game.game_time,
        level: game.level,
        gameType: game.game_type,
        refsNeeded: parseInt(game.refs_needed),
        assignedRefs: parseInt(game.assigned_refs),
        refsStillNeeded: parseInt(game.refs_needed) - parseInt(game.assigned_refs),
        locationName: game.location_name,
        homeTeamName: game.home_team_name,
        awayTeamName: game.away_team_name
      })),
      timePatterns: timeGaps.map((gap: any) => ({
        dayOfWeek: parseInt(gap.day_of_week),
        dayName: dayNames[parseInt(gap.day_of_week)],
        hourOfDay: parseInt(gap.hour_of_day),
        unassignedCount: parseInt(gap.unassigned_count)
      })),
      locationGaps: locationGaps.map((gap: any) => ({
        locationId: gap.location_id,
        locationName: gap.location_name,
        locationAddress: gap.location_address,
        unassignedCount: parseInt(gap.unassigned_count),
        totalRefsNeeded: parseInt(gap.total_refs_needed)
      })),
      levelGaps: levelGaps.map((gap: any) => ({
        level: gap.level,
        unassignedCount: parseInt(gap.unassigned_count),
        totalRefsNeeded: parseInt(gap.total_refs_needed)
      }))
    };

    res.json({
      success: true,
      data: {
        availabilityGaps,
        summary: {
          totalUnassignedGames: unassignedGames.length,
          totalPartiallyAssigned: partiallyAssignedGames.length,
          totalRefereesNeeded: unassignedGames.reduce((sum: number, game: any) => sum + parseInt(game.refs_needed), 0) +
                               partiallyAssignedGames.reduce((sum: number, game: any) => sum + (parseInt(game.refs_needed) - parseInt(game.assigned_refs)), 0)
        },
        filters: {
          start_date,
          end_date,
          location_id,
          level
        }
      }
    });

  } catch (error) {
    console.error('Error generating availability gaps report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate availability gaps report',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).message })
      }
    });
  }
});

export default router;