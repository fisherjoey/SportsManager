/**
 * @fileoverview Mentee Profile API Routes
 * @description RESTful API endpoints for accessing mentee profile information
 */

import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { menteeProfileService } from '../../services/mentorship/MenteeProfileService';
import { NotFoundError, AuthorizationError } from '../../utils/errors';
import db from '../../config/database';

const router = express.Router();

/**
 * Validation schema for UUID parameter
 */
const menteeIdSchema = Joi.object({
  menteeId: Joi.string().uuid().required()
});

/**
 * GET /api/mentees/me
 * Get current user's mentee profile (looks up mentee by user_id)
 */
router.get(
  '/me',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view'
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      // Look up mentee by user_id
      const mentee = await db('mentees')
        .where('user_id', userId)
        .first();

      if (!mentee) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'You are not registered as a mentee'
        });
      }

      // Fetch mentee profile using the mentee's ID
      const profile = await menteeProfileService.getMenteeProfile(mentee.id);

      return res.status(200).json({
        success: true,
        data: profile
      });

    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: error.message
        });
      }

      console.error('Error fetching mentee profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An error occurred while fetching the mentee profile'
      });
    }
  }
);

/**
 * GET /api/mentorship/mentee-profile/:menteeId
 * Get comprehensive profile information for a specific mentee
 *
 * @param menteeId - UUID of the mentee
 * @returns MenteeProfileResponse with full profile data
 *
 * Access Control:
 * - Requires authentication (JWT token)
 * - Requires 'view' permission on 'mentorship' resource
 */
router.get(
  '/:menteeId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'mentorship',
    action: 'view',
    getResourceId: (req: Request) => req.params.menteeId
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request parameters
      const { error, value } = menteeIdSchema.validate(req.params);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.details[0].message
        });
      }

      const { menteeId } = value;

      // Fetch mentee profile
      const profile = await menteeProfileService.getMenteeProfile(menteeId);

      // Return successful response
      return res.status(200).json({
        success: true,
        data: profile
      });

    } catch (error: any) {
      // Handle NotFoundError (404)
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: error.message
        });
      }

      // Handle AuthorizationError (403)
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: error.message
        });
      }

      // Handle generic errors (500)
      console.error('Error fetching mentee profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An error occurred while fetching the mentee profile'
      });
    }
  }
);

export default router;
