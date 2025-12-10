/**
 * @fileoverview Mentee Analytics API Routes
 * @description API endpoints for retrieving mentee analytics data including
 * game statistics, acceptance rates, completion rates, and activity tracking
 * @version 1.0.0
 */

import express from 'express';
import Joi from 'joi';

// Middleware imports
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { enhancedAsyncHandler } from '../../middleware/enhanced-error-handling';
import { validateParams } from '../../middleware/validation';

// Service imports
import menteeAnalyticsService from '../../services/mentorship/MenteeAnalyticsService';

// Create router
const router = express.Router();

// Validation schema for menteeId parameter
const MenteeIdParamSchema = Joi.object({
  menteeId: Joi.string().uuid().required().messages({
    'string.guid': 'Mentee ID must be a valid UUID',
    'any.required': 'Mentee ID is required'
  })
});

/**
 * GET /api/mentorship/mentees/:menteeId/analytics
 * Get comprehensive analytics for a mentee
 *
 * Returns:
 * - summary: Total games, completed games, acceptance rate, completion rate
 * - byLevel: Game statistics grouped by level
 * - byMonth: Game statistics for the last 6 months
 * - recentActivity: Last 10 game-related actions
 */
router.get(
  '/:menteeId/analytics',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view:analytics'
  }),
  validateParams(MenteeIdParamSchema),
  enhancedAsyncHandler(async (req, res) => {
    const { menteeId } = req.params;

    try {
      // Fetch analytics data
      const analytics = await menteeAnalyticsService.getMenteeAnalytics(menteeId);

      // Send success response
      return res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      // Handle NotFoundError
      if (error.name === 'NotFoundError') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // Log unexpected errors
      console.error(`Error fetching analytics for mentee ${menteeId}:`, error);

      // Send error response
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve mentee analytics'
      });
    }
  })
);

export default router;
