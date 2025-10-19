/**
 * Page permission endpoints for Cerbos-based access control
 * Provides endpoints to check page access permissions for authenticated users
 */

import express, { Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth.types';
import { CerbosAuthService } from '../services/CerbosAuthService';
import logger from '../utils/logger';

const router = express.Router();
const cerbosService = CerbosAuthService.getInstance();

// Validation schemas
const checkAccessSchema = Joi.object({
  pageId: Joi.string().required().min(1).max(100),
});

// Common page IDs that are checked for permissions
const COMMON_PAGES = [
  'games',
  'financial-dashboard',
  'admin-settings',
  'resources',
  'assignments',
  'referees',
  'teams',
  'leagues',
  'tournaments',
  'reports',
  'calendar',
  'budgets',
  'expenses',
  'locations',
  'analytics',
  'communications',
  'documents',
  'compliance',
  'workflows',
  'mentorships',
  'performance',
];

/**
 * POST /api/pages/check-access
 * Check if authenticated user has access to a specific page
 */
router.post(
  '/check-access',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = checkAccessSchema.validate((req as any).body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details[0].message,
        });
        return;
      }

      const { pageId } = value;
      const user = req.user;

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Build Cerbos principal from authenticated user
      const principal = {
        id: user.id,
        roles: (user as any).roles || [],
        attr: {
          organizationId: (user as any).organizationId || 'default-org',
          primaryRegionId: (user as any).primaryRegionId,
          regionIds: (user as any).regionIds || [],
          permissions: user.permissions || [],
          email: user.email,
          isActive: true,
        },
      };

      // Check permission for the page resource
      const result = await cerbosService.checkPermission({
        principal,
        resource: {
          kind: 'page',
          id: pageId,
          attr: {
            pageId,
          },
        },
        action: 'view',
      });

      logger.debug('Page access check completed', {
        userId: user.id,
        pageId,
        allowed: result.allowed,
      });

      res.json({
        success: true,
        data: {
          allowed: result.allowed,
          reason: result.allowed
            ? 'User has permission to view this page'
            : 'User does not have permission to view this page',
        },
      });
    } catch (error: any) {
      logger.error('Page access check failed', {
        error: error.message,
        userId: req.user?.id,
        pageId: (req as any).body?.pageId,
      });

      // Handle Cerbos service failures gracefully
      if (error.message?.includes('Cerbos') || error.code === 'UNAVAILABLE') {
        res.status(503).json({
          success: false,
          error: 'Permission service temporarily unavailable',
          details: 'Please try again later',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to check page access',
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/pages/permissions
 * Fetch all page permissions for authenticated user via batch check
 */
router.get(
  '/permissions',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Build Cerbos principal from authenticated user
      const principal = {
        id: user.id,
        roles: (user as any).roles || [],
        attr: {
          organizationId: (user as any).organizationId || 'default-org',
          primaryRegionId: (user as any).primaryRegionId,
          regionIds: (user as any).regionIds || [],
          permissions: user.permissions || [],
          email: user.email,
          isActive: true,
        },
      };

      // Build batch check resources for all common pages
      const resources = COMMON_PAGES.map((pageId) => ({
        resource: {
          kind: 'page' as const,
          id: pageId,
          attr: {
            pageId,
          },
        },
        actions: ['view' as const, 'access' as const],
      }));

      // Perform batch check
      const batchResults = await cerbosService.batchCheckPermissions({
        principal,
        resources,
      });

      // Format results
      const permissions = batchResults.map((result) => ({
        pageId: result.resourceId,
        actions: {
          view: result.actions.view || false,
          access: result.actions.access || false,
        },
      }));

      logger.debug('Batch page permissions retrieved', {
        userId: user.id,
        pageCount: permissions.length,
      });

      res.json({
        success: true,
        data: {
          permissions,
        },
        message: 'Page permissions retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Batch page permissions check failed', {
        error: error.message,
        userId: req.user?.id,
      });

      // Handle Cerbos service failures gracefully
      if (error.message?.includes('Cerbos') || error.code === 'UNAVAILABLE') {
        res.status(503).json({
          success: false,
          error: 'Permission service temporarily unavailable',
          details: 'Please try again later',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve page permissions',
        details: error.message,
      });
    }
  }
);

export default router;
