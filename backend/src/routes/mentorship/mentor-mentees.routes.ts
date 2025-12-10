/**
 * @fileoverview Mentor Mentees Routes - Session 2D
 * @description API routes for mentors to view their assigned mentees
 * @version 1.0.0
 */

import express, { Request, Response } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { validateParams, validateQuery } from '../../middleware/validation';
import { enhancedAsyncHandler } from '../../middleware/enhanced-error-handling';
import db from '../../config/database';
import { MentorMenteesService } from '../../services/mentorship/MentorMenteesService';

const router = express.Router();

// Initialize service
const mentorMenteesService = new MentorMenteesService(db);

/**
 * Validation schemas
 */
const MentorIdParamSchema = Joi.object({
  mentorId: Joi.string().uuid().required().messages({
    'string.guid': 'Mentor ID must be a valid UUID',
    'any.required': 'Mentor ID is required',
  }),
});

const MentorMenteesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  status: Joi.string()
    .valid('active', 'completed', 'paused', 'terminated')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, completed, paused, terminated',
    }),
});

/**
 * GET /me/mentees
 * Get current user's mentees (looks up mentor by user_id)
 * This endpoint allows the frontend to use the authenticated user's ID
 * instead of requiring the mentor table's ID.
 */
router.get(
  '/me/mentees',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:mentees',
  }),
  validateQuery(MentorMenteesQuerySchema),
  enhancedAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { page, limit, status } = req.query;

    console.log(`[Mentor Mentees] Fetching mentees for user: ${userId}`);

    // Look up mentor by user_id
    const mentor = await db('mentors')
      .where('user_id', userId)
      .first();

    if (!mentor) {
      return res.status(404).json({
        success: false,
        error: 'You are not registered as a mentor',
      });
    }

    // Get mentor's mentees with stats
    const result = await mentorMenteesService.getMentorMentees(mentor.id, {
      page: page as number,
      limit: limit as number,
      status: status as string | undefined,
    });

    return res.status(200).json({
      success: true,
      mentorId: mentor.id,
      mentees: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  })
);

/**
 * GET /:mentorId/mentees
 * Get mentor's assigned mentees with game statistics
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - status: Filter by assignment status (optional)
 *
 * Response:
 * - success: boolean
 * - mentees: Array of mentee objects with stats
 * - total: Total number of mentees
 * - page: Current page number
 * - limit: Items per page
 */
router.get(
  '/:mentorId/mentees',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:mentees',
    getResourceId: (req: Request) => req.params.mentorId,
    getResourceAttributes: async (req: Request) => {
      // Get mentor details for Cerbos authorization
      const mentor = await db('mentors')
        .where('id', req.params.mentorId)
        .select('user_id')
        .first();

      return {
        ownerId: mentor?.user_id || null,
      };
    },
  }),
  validateParams(MentorIdParamSchema),
  validateQuery(MentorMenteesQuerySchema),
  enhancedAsyncHandler(async (req: Request, res: Response) => {
    const { mentorId } = req.params;
    const { page, limit, status } = req.query;

    console.log(`[Mentor Mentees] Fetching mentees for mentor: ${mentorId}`, {
      page,
      limit,
      status,
    });

    // Get mentor's mentees with stats
    const result = await mentorMenteesService.getMentorMentees(mentorId, {
      page: page as number,
      limit: limit as number,
      status: status as string | undefined,
    });

    return res.status(200).json({
      success: true,
      mentees: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  })
);

export default router;
