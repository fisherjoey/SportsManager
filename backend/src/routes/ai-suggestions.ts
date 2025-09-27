/**
 * @file ai-suggestions.ts
 * @description AI suggestions route for intelligent referee assignment recommendations
 * Provides endpoints for generating, retrieving, accepting, and rejecting AI-powered suggestions
 */

import express, { Router, Response } from 'express';
import * as Joi from 'joi';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { logger } from '../utils/logger';
import { pool } from '../config/database';
import {
  GenerateSuggestionsRequestBody,
  GetSuggestionsRequest,
  AcceptSuggestionRequest,
  RejectSuggestionRequestBody,
  GenerateSuggestionsResponse,
  GetSuggestionsResponse,
  AcceptSuggestionResponse,
  RejectSuggestionResponse,
  AISuggestion,
  EnhancedAISuggestion,
  GameData,
  RefereeData,
  AISuggestionFactors,
  RefereeConflictCheck,
  AIAssignmentServiceInterface,
  SuggestionQueryParams,
  SuggestionQueryResult,
  AIGameAssignment,
  BatchProcessingResult
} from '../types/ai-suggestions';

// Import services - some still in JS, will be migrated
const aiServices = require('../services/aiServices');
const batchProcessor = require('../utils/batching');
const { generateRequestId } = require('../utils/security');

const router: Router = express.Router();

// Validation schemas
const generateSuggestionsSchema = Joi.object({
  game_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  factors: Joi.object({
    proximity_weight: Joi.number().min(0).max(1).default(0.3),
    availability_weight: Joi.number().min(0).max(1).default(0.4),
    experience_weight: Joi.number().min(0).max(1).default(0.2),
    performance_weight: Joi.number().min(0).max(1).default(0.1)
  }).default({})
});

const rejectSuggestionSchema = Joi.object({
  reason: Joi.string().max(500).optional()
});

const suggestionsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'accepted', 'rejected').optional(),
  game_id: Joi.string().uuid().optional(),
  referee_id: Joi.string().uuid().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
  min_confidence: Joi.number().min(0).max(1).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

/**
 * AI Assignment Service for intelligent referee assignment suggestions
 */
class AIAssignmentService implements AIAssignmentServiceInterface {
  /**
   * Generate AI-powered referee assignment suggestions
   */
  async generateSuggestions(
    games: GameData[],
    referees: RefereeData[],
    factors: AISuggestionFactors = {}
  ): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];

      // Generate suggestions for each game
      for (const game of games) {
        for (const referee of referees) {
          // Check for conflicts
          const conflictCheck = await this.checkRefereeConflicts(game, referee);

          if (conflictCheck.hasConflict) {
            continue; // Skip conflicted referees
          }

          // Calculate suggestion score
          const suggestion = await this.calculateSuggestion(game, referee, factors);

          // Add conflict warnings to reasoning if present
          if (conflictCheck.warnings.length > 0) {
            suggestion.reasoning += ` (Warnings: ${conflictCheck.warnings.join(', ')})`;
            suggestion.confidence_score *= 0.9; // Reduce confidence for warnings
          }

          suggestions.push(suggestion);
        }
      }

      // Sort by confidence score and return top suggestions
      return suggestions
        .sort((a, b) => b.confidence_score - a.confidence_score)
        .slice(0, 50); // Limit to top 50 suggestions

    } catch (error) {
      logger.logError('Error generating AI suggestions', {
        component: 'AIAssignmentService',
        error: error instanceof Error ? error.message : 'Unknown error',
        gamesCount: games.length,
        refereesCount: referees.length
      });
      throw error;
    }
  }

  /**
   * Get available referees for games (excluding conflicts)
   */
  async getAvailableReferees(games: GameData[]): Promise<RefereeData[]> {
    try {
      const gameIds = games.map(g => g.id);
      const gameStart = Math.min(...games.map(g => new Date(g.game_date).getTime()));

      // Find referees with conflicting assignments
      const conflictingAssignments = await pool.query(`
        SELECT DISTINCT user_id
        FROM game_assignments
        JOIN games ON game_assignments.game_id = games.id
        WHERE games.id = ANY($1)
        AND game_assignments.status IN ('pending', 'accepted', 'completed')
      `, [gameIds]);

      // Check for daily workload limits (max 4 games per day)
      const dailyWorkloadConflicts = await pool.query(`
        SELECT user_id
        FROM game_assignments
        JOIN games ON game_assignments.game_id = games.id
        WHERE games.game_date = ANY(
          SELECT DISTINCT game_date FROM games WHERE id = ANY($1)
        )
        AND game_assignments.status IN ('pending', 'accepted', 'completed')
        GROUP BY user_id, games.game_date
        HAVING COUNT(*) >= 4
      `, [gameIds]);

      // Check for weekly workload limits (max 15 games per week)
      const weekStart = new Date(gameStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weeklyWorkloadConflicts = await pool.query(`
        SELECT user_id
        FROM game_assignments
        JOIN games ON game_assignments.game_id = games.id
        WHERE games.game_date BETWEEN $1 AND $2
        AND game_assignments.status IN ('pending', 'accepted', 'completed')
        GROUP BY user_id
        HAVING COUNT(*) >= 15
      `, [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]);

      // Check for explicit unavailability
      const unavailableReferees = await pool.query(`
        SELECT DISTINCT user_id
        FROM referee_availability ra
        JOIN games g ON g.game_date = ra.date
        WHERE g.id = ANY($1)
        AND ra.is_available = false
        AND (ra.start_time, ra.end_time) OVERLAPS (g.game_time, g.game_time + INTERVAL '2 hours')
      `, [gameIds]);

      // Combine all conflict types
      const allConflictingUserIds = [
        ...conflictingAssignments.rows.map((a: any) => a.user_id),
        ...dailyWorkloadConflicts.rows.map((a: any) => a.user_id),
        ...weeklyWorkloadConflicts.rows.map((a: any) => a.user_id),
        ...unavailableReferees.rows.map((a: any) => a.user_id)
      ];

      const uniqueConflictingUserIds = Array.from(new Set(allConflictingUserIds));

      const availableRefereesQuery = `
        SELECT u.id, u.name, u.email, u.phone, r.level, r.postal_code, r.is_available
        FROM users u
        JOIN referees r ON u.id = r.user_id
        WHERE r.is_available = true
        ${uniqueConflictingUserIds.length > 0 ? 'AND u.id != ALL($1)' : ''}
      `;

      const result = await pool.query(
        availableRefereesQuery,
        uniqueConflictingUserIds.length > 0 ? [uniqueConflictingUserIds] : []
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.id,
        name: row.name,
        level: row.level,
        postal_code: row.postal_code,
        is_available: row.is_available,
        phone: row.phone,
        email: row.email
      }));
    } catch (error) {
      logger.logError('Error getting available referees', {
        component: 'AIAssignmentService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check for referee conflicts and warnings
   */
  async checkRefereeConflicts(game: GameData, referee: RefereeData): Promise<RefereeConflictCheck> {
    const warnings: string[] = [];
    let hasConflict = false;

    try {
      // Check for back-to-back games (less than 45 minutes between games)
      const nearbyGamesQuery = `
        SELECT g.*
        FROM game_assignments ga
        JOIN games g ON ga.game_id = g.id
        WHERE ga.user_id = $1
        AND g.game_date = $2
        AND ABS(EXTRACT(EPOCH FROM (g.game_time - $3::time)) / 60) < 45
        AND ga.status IN ('pending', 'accepted')
      `;

      const nearbyGames = await pool.query(nearbyGamesQuery, [
        referee.id,
        game.game_date,
        game.game_time
      ]);

      if (nearbyGames.rows.length > 0) {
        warnings.push('Back-to-back games with less than 45 minutes rest');
      }

      // Check for excessive daily workload (approaching limit)
      const todaysGamesQuery = `
        SELECT COUNT(*) as count
        FROM game_assignments ga
        JOIN games g ON ga.game_id = g.id
        WHERE ga.user_id = $1
        AND g.game_date = $2
        AND ga.status IN ('pending', 'accepted', 'completed')
      `;

      const todaysGames = await pool.query(todaysGamesQuery, [referee.id, game.game_date]);
      const todaysCount = parseInt(todaysGames.rows[0]?.count || '0');

      if (todaysCount >= 3) {
        warnings.push(`High daily workload (${todaysCount} games today)`);
      }

      // Check for distance conflicts
      if (game.postal_code && referee.postal_code) {
        const distantVenuesQuery = `
          SELECT g.location, g.postal_code
          FROM game_assignments ga
          JOIN games g ON ga.game_id = g.id
          WHERE ga.user_id = $1
          AND g.game_date = $2
          AND g.postal_code != $3
          AND ga.status IN ('pending', 'accepted')
        `;

        const distantVenues = await pool.query(distantVenuesQuery, [
          referee.id,
          game.game_date,
          game.postal_code
        ]);

        if (distantVenues.rows.length > 0) {
          warnings.push('Multiple venue locations on same day - consider travel time');
        }
      }

      // Check for referee level mismatch
      const levelMapping: Record<string, number> = {
        'Rookie': 1, 'Junior': 2, 'Senior': 3, 'Elite': 4
      };

      const refereeLevel = levelMapping[referee.level] || 1;
      const gameLevel = levelMapping[game.level] || 2;

      if (refereeLevel - gameLevel >= 2) {
        warnings.push('Referee may be overqualified for this game level');
      } else if (gameLevel - refereeLevel >= 2) {
        warnings.push('Referee may need more experience for this game level');
      }

      return { hasConflict, warnings };
    } catch (error) {
      logger.logWarning('Error checking referee conflicts', {
        component: 'AIAssignmentService',
        error: error instanceof Error ? error.message : 'Unknown error',
        gameId: game.id,
        refereeId: referee.id
      });
      return { hasConflict: false, warnings: [] };
    }
  }

  /**
   * Calculate comprehensive suggestion score
   */
  async calculateSuggestion(
    game: GameData,
    referee: RefereeData,
    factors: AISuggestionFactors
  ): Promise<AISuggestion> {
    // Calculate individual factor scores
    const proximityScore = await this.calculateProximityScore(game, referee);
    const availabilityScore = await this.calculateAvailabilityScore(game, referee);
    const experienceScore = this.calculateExperienceScore(game, referee);
    const performanceScore = await this.calculatePerformanceScore(referee);

    // Calculate historical pattern bonus
    const historicalBonus = await this.calculateHistoricalPatternBonus(game, referee);

    // Calculate weighted confidence score
    const baseConfidenceScore = (
      (proximityScore * (factors.proximity_weight || 0.3)) +
      (availabilityScore * (factors.availability_weight || 0.4)) +
      (experienceScore * (factors.experience_weight || 0.2)) +
      (performanceScore * (factors.performance_weight || 0.1))
    );

    // Apply historical pattern bonus (up to 10% boost)
    const confidenceScore = Math.min(1, baseConfidenceScore + (historicalBonus * 0.1));

    // Generate enhanced reasoning
    const reasoning = this.generateEnhancedReasoning(
      proximityScore, availabilityScore, experienceScore, performanceScore, historicalBonus
    );

    return {
      id: randomUUID(),
      game_id: game.id,
      referee_id: referee.id,
      confidence_score: Math.min(1, Math.max(0, confidenceScore)),
      reasoning,
      proximity_score: proximityScore,
      availability_score: availabilityScore,
      experience_score: experienceScore,
      performance_score: performanceScore,
      historical_bonus: historicalBonus,
      status: 'pending',
      created_at: new Date()
    };
  }

  /**
   * Calculate proximity score based on postal codes
   */
  async calculateProximityScore(game: GameData, referee: RefereeData): Promise<number> {
    if (!referee.postal_code || !game.postal_code) {
      return 0.5;
    }

    const refereePostal = referee.postal_code.replace(/\s/g, '').toUpperCase();
    const gamePostal = game.postal_code.replace(/\s/g, '').toUpperCase();

    // First 3 characters (forward sortation area)
    const refereeFSA = refereePostal.substring(0, 3);
    const gameFSA = gamePostal.substring(0, 3);

    // Same FSA = very close
    if (refereeFSA === gameFSA) return 0.95;

    // Calculate character differences
    let differences = 0;
    for (let i = 0; i < Math.min(refereeFSA.length, gameFSA.length); i++) {
      if (refereeFSA[i] !== gameFSA[i]) differences++;
    }

    if (differences === 1) return 0.8;
    if (differences === 2) return 0.6;
    if (differences === 3) return 0.4;
    return 0.3;
  }

  /**
   * Calculate availability score
   */
  async calculateAvailabilityScore(game: GameData, referee: RefereeData): Promise<number> {
    try {
      const availabilityQuery = `
        SELECT start_time, end_time, is_available
        FROM referee_availability
        WHERE user_id = $1 AND date = $2
      `;

      const availability = await pool.query(availabilityQuery, [referee.id, game.game_date]);

      if (availability.rows.length === 0) {
        return 0.7; // Default availability
      }

      const gameStart = new Date(`${game.game_date} ${game.game_time}`);
      const gameEnd = new Date(gameStart.getTime() + 2 * 60 * 60 * 1000);

      for (const window of availability.rows) {
        if (!window.is_available) continue;

        const windowStart = new Date(`${game.game_date} ${window.start_time}`);
        const windowEnd = new Date(`${game.game_date} ${window.end_time}`);

        if (gameStart >= windowStart && gameEnd <= windowEnd) {
          return 1.0; // Perfect availability
        }
        if (gameStart < windowEnd && gameEnd > windowStart) {
          return 0.8; // Partial overlap
        }
      }

      return 0.3; // No availability overlap
    } catch (error) {
      return 0.5; // Default on error
    }
  }

  /**
   * Calculate experience score
   */
  calculateExperienceScore(game: GameData, referee: RefereeData): number {
    const levelMapping: Record<string, number> = {
      'Rookie': 1, 'Junior': 2, 'Senior': 3, 'Elite': 4
    };

    const refereeLevel = levelMapping[referee.level] || 1;
    const gameLevel = levelMapping[game.level] || 2;

    if (refereeLevel === gameLevel) return 1.0;
    if (refereeLevel === gameLevel + 1) return 0.9;
    if (refereeLevel > gameLevel + 1) return 0.7;
    if (refereeLevel === gameLevel - 1) return 0.8;
    if (refereeLevel < gameLevel - 1) return 0.4;
    return 0.6;
  }

  /**
   * Calculate performance score
   */
  async calculatePerformanceScore(referee: RefereeData): Promise<number> {
    try {
      const performanceQuery = `
        SELECT AVG(rating) as avg_rating, COUNT(*) as assignment_count
        FROM game_assignments ga
        LEFT JOIN assignment_ratings ar ON ga.id = ar.assignment_id
        WHERE ga.user_id = $1
        AND ga.status = 'completed'
        AND ar.rating IS NOT NULL
        AND ga.created_at > NOW() - INTERVAL '6 months'
      `;

      const result = await pool.query(performanceQuery, [referee.id]);
      const { avg_rating, assignment_count } = result.rows[0] || {};

      if (!avg_rating || assignment_count < 3) {
        return 0.7; // Default for new referees
      }

      const score = Math.min(1, avg_rating / 5);
      const experienceBonus = Math.min(0.1, assignment_count / 100);
      return Math.min(1, score + experienceBonus);
    } catch (error) {
      return 0.7;
    }
  }

  /**
   * Calculate historical pattern bonus
   */
  async calculateHistoricalPatternBonus(game: GameData, referee: RefereeData): Promise<number> {
    try {
      const patternQuery = `
        SELECT
          AVG(CASE WHEN ar.rating >= 4 THEN 1 ELSE 0 END) as success_rate,
          COUNT(*) as total_assignments
        FROM game_assignments ga
        JOIN games g ON ga.game_id = g.id
        LEFT JOIN assignment_ratings ar ON ga.id = ar.assignment_id
        WHERE ga.user_id = $1
        AND g.level = $2
        AND ga.status = 'completed'
        AND ga.created_at > NOW() - INTERVAL '1 year'
      `;

      const result = await pool.query(patternQuery, [referee.id, game.level]);
      const { success_rate, total_assignments } = result.rows[0] || {};

      if (!success_rate || total_assignments < 5) {
        return 0;
      }

      const baseBonus = parseFloat(success_rate) - 0.7;
      const frequencyBonus = Math.min(0.2, total_assignments / 50);
      return Math.max(0, Math.min(1, baseBonus + frequencyBonus));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Generate enhanced reasoning text
   */
  generateEnhancedReasoning(
    proximityScore: number,
    availabilityScore: number,
    experienceScore: number,
    performanceScore: number,
    historicalBonus: number
  ): string {
    const factors: string[] = [];

    if (proximityScore >= 0.8) factors.push('excellent proximity');
    else if (proximityScore >= 0.6) factors.push('good proximity');
    else if (proximityScore >= 0.4) factors.push('moderate proximity');
    else factors.push('distant location');

    if (availabilityScore >= 0.8) factors.push('high availability');
    else if (availabilityScore >= 0.6) factors.push('good availability');
    else factors.push('limited availability');

    if (experienceScore >= 0.9) factors.push('perfect level match');
    else if (experienceScore >= 0.8) factors.push('good experience level');
    else if (experienceScore >= 0.6) factors.push('adequate experience');
    else factors.push('experience concerns');

    if (performanceScore >= 0.8) factors.push('strong historical performance');
    else if (performanceScore >= 0.6) factors.push('good performance record');

    if (historicalBonus > 0.2) factors.push('excellent historical pattern');
    else if (historicalBonus > 0.1) factors.push('positive historical pattern');

    return `Recommended based on: ${factors.join(', ')}`;
  }
}

// Create service instance
const aiAssignmentService = new AIAssignmentService();

/**
 * Helper function to build suggestions query with filters
 */
async function buildSuggestionsQuery(params: SuggestionQueryParams): Promise<SuggestionQueryResult> {
  const { filters, pagination } = params;
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  let whereConditions: string[] = [];
  let queryParams: any[] = [];
  let paramIndex = 1;

  // Build WHERE conditions
  if (filters.status) {
    whereConditions.push(`ai_suggestions.status = $${paramIndex++}`);
    queryParams.push(filters.status);
  }

  if (filters.game_id) {
    whereConditions.push(`ai_suggestions.game_id = $${paramIndex++}`);
    queryParams.push(filters.game_id);
  }

  if (filters.referee_id) {
    whereConditions.push(`ai_suggestions.referee_id = $${paramIndex++}`);
    queryParams.push(filters.referee_id);
  }

  if (filters.start_date) {
    whereConditions.push(`g.game_date >= $${paramIndex++}`);
    queryParams.push(filters.start_date);
  }

  if (filters.end_date) {
    whereConditions.push(`g.game_date <= $${paramIndex++}`);
    queryParams.push(filters.end_date);
  }

  if (filters.min_confidence) {
    whereConditions.push(`ai_suggestions.confidence_score >= $${paramIndex++}`);
    queryParams.push(filters.min_confidence);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Main query
  const suggestionsQuery = `
    SELECT
      ai_suggestions.*,
      g.game_date, g.game_time, g.location, g.level,
      ht.name as home_team, at.name as away_team,
      u.name as referee_name, r.level as referee_level,
      u.phone as referee_phone, u.email as referee_email, r.postal_code as referee_postal_code
    FROM ai_suggestions
    JOIN games g ON ai_suggestions.game_id = g.id
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    JOIN users u ON ai_suggestions.referee_id = u.id
    JOIN referees r ON u.id = r.user_id
    ${whereClause}
    ORDER BY ai_suggestions.created_at DESC, ai_suggestions.confidence_score DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  queryParams.push(limit, offset);

  // Count query
  const countQuery = `
    SELECT COUNT(*) as total
    FROM ai_suggestions
    JOIN games g ON ai_suggestions.game_id = g.id
    ${whereClause}
  `;

  const countParams = queryParams.slice(0, -2);

  try {
    const [suggestionsResult, countResult] = await Promise.all([
      pool.query(suggestionsQuery, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const suggestions: EnhancedAISuggestion[] = suggestionsResult.rows.map((row: any) => ({
      id: row.id,
      game_id: row.game_id,
      referee_id: row.referee_id,
      confidence_score: row.confidence_score,
      reasoning: row.reasoning,
      proximity_score: row.proximity_score,
      availability_score: row.availability_score,
      experience_score: row.experience_score,
      performance_score: row.performance_score,
      historical_bonus: row.historical_bonus,
      status: row.status,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      processed_by: row.processed_by,
      processed_at: row.processed_at,
      game: {
        id: row.game_id,
        game_date: row.game_date,
        game_time: row.game_time,
        location: row.location,
        level: row.level,
        home_team: row.home_team,
        away_team: row.away_team
      },
      referee: {
        id: row.referee_id,
        name: row.referee_name,
        level: row.referee_level,
        postal_code: row.referee_postal_code,
        phone: row.referee_phone,
        email: row.referee_email
      }
    }));

    const total = parseInt(countResult.rows[0].total);
    return { suggestions, total };
  } catch (error) {
    logger.logError('Error building suggestions query', {
      component: 'ai-suggestions-route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

// Route Handlers

/**
 * POST /api/ai-suggestions - Generate AI suggestions
 */
router.post('/', authenticateToken, requireCerbosPermission({
  resource: 'ai_suggestion',
  action: 'generate',
}), async (req: GenerateSuggestionsRequestBody, res: Response<GenerateSuggestionsResponse>) => {
  const requestId = generateRequestId();

  try {
    const { error, value } = generateSuggestionsSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { game_ids, factors } = value;

    logger.logInfo('Generating AI suggestions', {
      component: 'ai-suggestions-route',
      requestId,
      gameIds: game_ids,
      factors,
      userId: req.user.userId
    });

    // Fetch games data
    const gamesQuery = `
      SELECT g.*, ht.name as home_team, at.name as away_team
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.id = ANY($1)
    `;

    const gamesResult = await pool.query(gamesQuery, [game_ids]);
    const games: GameData[] = gamesResult.rows;

    if (games.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No games found for the provided IDs'
      });
    }

    // Get available referees
    const referees = await aiAssignmentService.getAvailableReferees(games);

    if (referees.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No available referees found'
      });
    }

    // Generate suggestions
    const suggestions = await aiAssignmentService.generateSuggestions(games, referees, factors);

    // Store suggestions in database
    if (suggestions.length > 0) {
      const insertQuery = `
        INSERT INTO ai_suggestions (
          id, game_id, referee_id, confidence_score, reasoning,
          proximity_score, availability_score, experience_score, performance_score,
          historical_bonus, status, created_at
        ) VALUES ${suggestions.map((_, index) => {
          const base = index * 11;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5},
                   $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
        }).join(', ')}
      `;

      const insertParams = suggestions.flatMap(s => [
        s.id, s.game_id, s.referee_id, s.confidence_score, s.reasoning,
        s.proximity_score, s.availability_score, s.experience_score, s.performance_score,
        s.historical_bonus, s.status
      ]);

      await pool.query(insertQuery, insertParams);
    }

    logger.logInfo('AI suggestions generated successfully', {
      component: 'ai-suggestions-route',
      requestId,
      suggestionsCount: suggestions.length
    });

    res.json({
      success: true,
      data: {
        suggestions,
        generated_count: suggestions.length,
        request_id: requestId
      }
    });

  } catch (error) {
    logger.logError('Error generating AI suggestions', {
      component: 'ai-suggestions-route',
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate AI suggestions'
    });
  }
});

/**
 * GET /api/ai-suggestions - Retrieve suggestions with filtering and pagination
 */
router.get('/', authenticateToken, requireCerbosPermission({
  resource: 'ai_suggestion',
  action: 'view:list',
}), async (req: GetSuggestionsRequest, res: Response<GetSuggestionsResponse>) => {
  try {
    const { error, value } = suggestionsQuerySchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { page, limit, ...filters } = value;
    const pagination = { page, limit };

    const { suggestions, total } = await buildSuggestionsQuery({ filters, pagination });
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        suggestions,
        pagination: { page, limit, total, pages }
      }
    });

  } catch (error) {
    logger.logError('Error retrieving AI suggestions', {
      component: 'ai-suggestions-route',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve AI suggestions'
    });
  }
});

/**
 * PUT /api/ai-suggestions/:id/accept - Accept suggestion and create assignment
 */
router.put('/:id/accept', authenticateToken, requireCerbosPermission({
  resource: 'ai_suggestion',
  action: 'accept',
  getResourceId: (req) => req.params.id,
}), async (req: AcceptSuggestionRequest, res: Response<AcceptSuggestionResponse>) => {
  try {
    const { id } = req.params;

    // Get suggestion details
    const suggestionQuery = `SELECT * FROM ai_suggestions WHERE id = $1 AND status = 'pending'`;
    const suggestionResult = await pool.query(suggestionQuery, [id]);

    if (suggestionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found'
      });
    }

    const suggestion = suggestionResult.rows[0];

    // Check if game already has an assignment
    const existingAssignmentQuery = `
      SELECT id FROM game_assignments
      WHERE game_id = $1 AND status IN ('pending', 'accepted', 'completed')
    `;

    const existingAssignment = await pool.query(existingAssignmentQuery, [suggestion.game_id]);

    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Game has already been assigned'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create assignment
      const assignmentData = {
        id: randomUUID(),
        game_id: suggestion.game_id,
        user_id: suggestion.referee_id,
        position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
        assigned_by: req.user.userId,
        status: 'pending',
        assigned_at: new Date()
      };

      const assignmentQuery = `
        INSERT INTO game_assignments (id, game_id, user_id, position_id, assigned_by, status, assigned_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const assignmentResult = await pool.query(assignmentQuery, [
        assignmentData.id, assignmentData.game_id, assignmentData.user_id,
        assignmentData.position_id, assignmentData.assigned_by, assignmentData.status,
        assignmentData.assigned_at
      ]);

      const assignment = assignmentResult.rows[0];

      // Update suggestion status
      const updateSuggestionQuery = `
        UPDATE ai_suggestions
        SET status = 'accepted', processed_by = $1, processed_at = $2
        WHERE id = $3
      `;

      await pool.query(updateSuggestionQuery, [req.user.userId, new Date(), id]);

      // Commit transaction
      await pool.query('COMMIT');

      logger.logInfo('AI suggestion accepted', {
        component: 'ai-suggestions-route',
        suggestionId: id,
        assignmentId: assignment.id,
        userId: req.user.userId
      });

      res.json({
        success: true,
        data: {
          assignment: {
            id: assignment.id,
            game_id: assignment.game_id,
            referee_id: assignment.user_id,
            status: assignment.status,
            assigned_at: assignment.assigned_at
          }
        },
        message: 'AI suggestion accepted and assignment created'
      });

    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    logger.logError('Error accepting AI suggestion', {
      component: 'ai-suggestions-route',
      suggestionId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to accept AI suggestion'
    });
  }
});

/**
 * PUT /api/ai-suggestions/:id/reject - Reject suggestion with optional reason
 */
router.put('/:id/reject', authenticateToken, requireCerbosPermission({
  resource: 'ai_suggestion',
  action: 'reject',
  getResourceId: (req) => req.params.id,
}), async (req: RejectSuggestionRequestBody, res: Response<RejectSuggestionResponse>) => {
  try {
    const { id } = req.params;
    const { error, value } = rejectSuggestionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { reason } = value;

    // Update suggestion status
    const updateQuery = `
      UPDATE ai_suggestions
      SET status = 'rejected', rejection_reason = $1, processed_by = $2, processed_at = $3
      WHERE id = $4 AND status = 'pending'
      RETURNING id
    `;

    const result = await pool.query(updateQuery, [reason, req.user.userId, new Date(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found'
      });
    }

    logger.logInfo('AI suggestion rejected', {
      component: 'ai-suggestions-route',
      suggestionId: id,
      reason,
      userId: req.user.userId
    });

    res.json({
      success: true,
      message: 'AI suggestion rejected'
    });

  } catch (error) {
    logger.logError('Error rejecting AI suggestion', {
      component: 'ai-suggestions-route',
      suggestionId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to reject AI suggestion'
    });
  }
});

export default router;