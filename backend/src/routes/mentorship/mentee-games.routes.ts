/**
 * @fileoverview Mentee Games API Routes
 * @description API endpoints for retrieving games assigned to mentees in the mentorship system
 * @version 1.0.0
 */

import express from 'express';
import Joi from 'joi';

// Middleware imports
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { validateParams, validateQuery } from '../../middleware/validation';
import { enhancedAsyncHandler } from '../../middleware/enhanced-error-handling';
import { ResponseFormatter } from '../../utils/response-formatters';
import { ErrorFactory } from '../../utils/errors';

// Service imports
import menteeGamesService from '../../services/mentorship/MenteeGamesService';

const router = express.Router();

// Validation schemas
const MenteeIdParamSchema = Joi.object({
  menteeId: Joi.string().uuid().required().messages({
    'string.guid': 'menteeId must be a valid UUID',
    'any.required': 'menteeId is required'
  })
});

const GamesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'page must be a number',
    'number.integer': 'page must be an integer',
    'number.min': 'page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'limit must be a number',
    'number.integer': 'limit must be an integer',
    'number.min': 'limit must be at least 1',
    'number.max': 'limit cannot exceed 100'
  }),
  status: Joi.string().valid('pending', 'confirmed', 'declined', 'completed').optional().messages({
    'any.only': 'status must be one of: pending, confirmed, declined, completed'
  }),
  fromDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'fromDate must be a valid ISO date (YYYY-MM-DD)'
  }),
  toDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'toDate must be a valid ISO date (YYYY-MM-DD)'
  })
});

/**
 * GET /api/mentorship/mentees/:menteeId/games
 * Get all games assigned to a specific mentee
 *
 * @route GET /api/mentorship/mentees/:menteeId/games
 * @access Protected - requires authentication and permission
 * @param {string} menteeId - UUID of the mentee
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Results per page (default: 20, max: 100)
 * @query {string} status - Filter by assignment status (pending, confirmed, declined, completed)
 * @query {string} fromDate - Filter games from this date (ISO format)
 * @query {string} toDate - Filter games up to this date (ISO format)
 * @returns {object} Paginated list of games with details
 */
router.get(
  '/:menteeId/games',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:games'
  }),
  validateParams(MenteeIdParamSchema),
  validateQuery(GamesQuerySchema),
  enhancedAsyncHandler(async (req, res) => {
    const { menteeId } = req.params;
    const { page, limit, status, fromDate, toDate } = req.query;

    try {
      // Fetch games for the mentee with filters
      const result = await menteeGamesService.getMenteeGames(menteeId, {
        page: page as number,
        limit: limit as number,
        status: status as string | undefined,
        fromDate: fromDate as string | undefined,
        toDate: toDate as string | undefined
      });

      // Return success response with games data
      return ResponseFormatter.sendSuccess(
        res,
        {
          success: true,
          games: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit
        },
        'Mentee games retrieved successfully'
      );
    } catch (error: any) {
      console.error(`Error retrieving games for mentee ${menteeId}:`, error);

      // Handle specific error types
      if (error.name === 'NotFoundError') {
        throw ErrorFactory.notFound('Mentee', menteeId);
      }

      // Generic error - log and rethrow
      console.error('Error fetching mentee games:', error);
      throw error;
    }
  })
);

export default router;
