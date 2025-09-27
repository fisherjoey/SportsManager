/**
 * @fileoverview Access Control API Routes
 *
 * Endpoints for managing database-driven access control:
 * - Page access management
 * - API access management
 * - Feature flags
 * - Data scopes
 */

import express, { Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../../types/auth.types';

// Import services and middleware
import RoleServiceClass from '../../services/RoleService';
import RoleAccessService from '../../services/RoleAccessService';
import db from '../../config/database';
const { asyncHandler } = require('../../middleware/errorHandling');
const RoleService = new RoleServiceClass(db);

// Initialize router
const router = express.Router();

// Type definitions for access control
interface PageAccess {
  page_path: string;
  page_name: string;
  page_category: string;
  page_description?: string;
  can_access: boolean;
  conditions?: any;
}

interface ApiAccess {
  http_method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint_pattern: string;
  endpoint_category: string;
  endpoint_description?: string;
  can_access: boolean;
  rate_limit?: number;
  conditions?: any;
}

interface Feature {
  feature_code: string;
  feature_name: string;
  feature_category?: string;
  feature_description?: string;
  is_enabled: boolean;
  configuration?: any;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface DataScope {
  scope_type: string;
  scope_value: string;
  permissions?: string[];
}

interface PageRegistry {
  path: string;
  name: string;
  category: string;
  description?: string;
}

interface ApiRegistry {
  method: string;
  pattern: string;
  category: string;
  description?: string;
}

interface AccessCheckRequest {
  page?: string;
  method?: string;
  endpoint?: string;
  feature?: string;
}

// Validation schemas
const pageAccessSchema = Joi.object({
  page_path: Joi.string().required(),
  page_name: Joi.string().required(),
  page_category: Joi.string().required(),
  page_description: Joi.string().allow('', null).optional(),
  can_access: Joi.boolean().required(),
  conditions: Joi.object().allow(null).optional()
});

const apiAccessSchema = Joi.object({
  http_method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').required(),
  endpoint_pattern: Joi.string().required(),
  endpoint_category: Joi.string().required(),
  endpoint_description: Joi.string().allow('', null),
  can_access: Joi.boolean().required(),
  rate_limit: Joi.number().integer().min(0).allow(null),
  conditions: Joi.object().allow(null)
});

const featureSchema = Joi.object({
  feature_code: Joi.string().required(),
  feature_name: Joi.string().required(),
  feature_category: Joi.string().allow('', null),
  feature_description: Joi.string().allow('', null),
  is_enabled: Joi.boolean().required(),
  configuration: Joi.object().allow(null)
});

// --- Page Access Management ---

/**
 * GET /api/admin/access/roles/:roleId/pages
 * Get all page access settings for a role
 */
router.get('/roles/:roleId/pages',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:details',
    getResourceId: (req) => req.params.roleId,
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roleId } = (req as any).params;

    // Verify role exists
    const role: Role | null = await RoleService.getRoleById(roleId);
    if (!role) {
      res.status(404).json({
        success: false,
        error: 'Role not found'
      });
      return;
    }

    const pageAccess: PageAccess[] = await RoleAccessService.getPageAccess(roleId);

    res.json({
      success: true,
      data: {
        role,
        pageAccess
      }
    });
  })
);

/**
 * PUT /api/admin/access/roles/:roleId/pages
 * Update page access settings for a role
 */
router.put('/roles/:roleId/pages',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'manage_permissions',
    getResourceId: (req) => req.params.roleId,
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roleId } = (req as any).params;
    const { pageAccess } = (req as any).body as { pageAccess?: PageAccess[] };

    console.log('PUT /roles/:roleId/pages - roleId:', roleId);
    console.log('Request body:', JSON.stringify((req as any).body, null, 2));
    console.log('pageAccess is array:', Array.isArray(pageAccess));

    // Validate input
    if (!Array.isArray(pageAccess)) {
      console.error('pageAccess is not an array, type:', typeof pageAccess);
      res.status(400).json({
        success: false,
        error: 'pageAccess must be an array'
      });
      return;
    }

    console.log('Validating', pageAccess.length, 'page access entries');

    // Validate each page access entry
    for (let i = 0; i < pageAccess.length; i++) {
      const access = pageAccess[i];
      console.log(`Validating entry ${i}:`, access);
      const { error } = pageAccessSchema.validate(access);
      if (error) {
        console.error(`Validation failed for entry ${i}:`, error.details[0].message);
        res.status(400).json({
          success: false,
          error: `Invalid page access entry: ${error.details[0].message}`
        });
        return;
      }
    }

    // Verify role exists
    console.log('Checking if role exists:', roleId);
    try {
      const role: Role | null = await RoleService.getRoleById(roleId);
      console.log('Role found:', !!role);
      if (!role) {
        console.error('Role not found:', roleId);
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }
    } catch (roleError: any) {
      console.error('Error getting role:', roleError.message);
      res.status(400).json({
        success: false,
        error: 'Failed to verify role'
      });
      return;
    }

    // Update page access
    const result = await RoleAccessService.setPageAccess(roleId, pageAccess, req.user!.id);

    res.json({
      success: true,
      message: 'Page access updated successfully',
      data: result
    });
  })
);

/**
 * GET /api/admin/access/page-registry
 * Get all available pages in the system
 */
router.get('/page-registry',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:details',
    getResourceId: (req) => req.params.roleId,
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const pages: PageRegistry[] = await RoleAccessService.getPageRegistry();

    res.json({
      success: true,
      data: pages
    });
  })
);

// --- API Access Management ---

/**
 * GET /api/admin/access/roles/:roleId/apis
 * Get all API access settings for a role
 */
router.get('/roles/:roleId/apis',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:details',
    getResourceId: (req) => req.params.roleId,
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roleId } = (req as any).params;

    // Verify role exists
    const role: Role | null = await RoleService.getRoleById(roleId);
    if (!role) {
      res.status(404).json({
        success: false,
        error: 'Role not found'
      });
      return;
    }

    const apiAccess: ApiAccess[] = await RoleAccessService.getApiAccess(roleId);

    res.json({
      success: true,
      data: {
        role,
        apiAccess
      }
    });
  })
);

/**
 * PUT /api/admin/access/roles/:roleId/apis
 * Update API access settings for a role
 */
router.put('/roles/:roleId/apis',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'manage_permissions',
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roleId } = (req as any).params;
    const { apiAccess } = (req as any).body as { apiAccess?: ApiAccess[] };

    // Validate input
    if (!Array.isArray(apiAccess)) {
      res.status(400).json({
        success: false,
        error: 'apiAccess must be an array'
      });
      return;
    }

    // Validate each API access entry
    for (const access of apiAccess) {
      const { error } = apiAccessSchema.validate(access);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Invalid API access entry: ${error.details[0].message}`
        });
        return;
      }
    }

    // Verify role exists
    const role: Role | null = await RoleService.getRoleById(roleId);
    if (!role) {
      res.status(404).json({
        success: false,
        error: 'Role not found'
      });
      return;
    }

    // Update API access
    const result = await RoleAccessService.setApiAccess(roleId, apiAccess, req.user!.id);

    res.json({
      success: true,
      message: 'API access updated successfully',
      data: result
    });
  })
);

/**
 * GET /api/admin/access/api-registry
 * Get all available API endpoints in the system
 */
router.get('/api-registry',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:details',
    getResourceId: (req) => req.params.roleId,
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const apis: ApiRegistry[] = await RoleAccessService.getApiRegistry();

    res.json({
      success: true,
      data: apis
    });
  })
);

// --- Feature Management ---

/**
 * GET /api/admin/access/roles/:roleId/features
 * Get all feature flags for a role
 */
router.get('/roles/:roleId/features',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:details',
    getResourceId: (req) => req.params.roleId,
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roleId } = (req as any).params;

    // Verify role exists
    const role: Role | null = await RoleService.getRoleById(roleId);
    if (!role) {
      res.status(404).json({
        success: false,
        error: 'Role not found'
      });
      return;
    }

    const features: Feature[] = await RoleAccessService.getFeatures(roleId);

    res.json({
      success: true,
      data: {
        role,
        features
      }
    });
  })
);

/**
 * PUT /api/admin/access/roles/:roleId/features
 * Update feature flags for a role
 */
router.put('/roles/:roleId/features',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'manage_permissions',
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roleId } = (req as any).params;
    const { features } = (req as any).body as { features?: Feature[] };

    // Validate input
    if (!Array.isArray(features)) {
      res.status(400).json({
        success: false,
        error: 'features must be an array'
      });
      return;
    }

    // Validate each feature entry
    for (const feature of features) {
      const { error } = featureSchema.validate(feature);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Invalid feature entry: ${error.details[0].message}`
        });
        return;
      }
    }

    // Verify role exists
    const role: Role | null = await RoleService.getRoleById(roleId);
    if (!role) {
      res.status(404).json({
        success: false,
        error: 'Role not found'
      });
      return;
    }

    // Update features
    const result = await RoleAccessService.setFeatures(roleId, features, req.user!.id);

    res.json({
      success: true,
      message: 'Features updated successfully',
      data: result
    });
  })
);

// --- Data Scopes ---

/**
 * GET /api/admin/access/roles/:roleId/scopes
 * Get data access scopes for a role
 */
router.get('/roles/:roleId/scopes',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:details',
    getResourceId: (req) => req.params.roleId,
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roleId } = (req as any).params;

    // Verify role exists
    const role: Role | null = await RoleService.getRoleById(roleId);
    if (!role) {
      res.status(404).json({
        success: false,
        error: 'Role not found'
      });
      return;
    }

    const scopes: DataScope[] = await RoleAccessService.getDataScopes(roleId);

    res.json({
      success: true,
      data: {
        role,
        scopes
      }
    });
  })
);

// --- Access Checking Endpoints ---

/**
 * POST /api/admin/access/check-page
 * Check if current user can access a page
 */
router.post('/check-page',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { page } = (req as any).body as AccessCheckRequest;

    if (!page) {
      res.status(400).json({
        success: false,
        error: 'page parameter is required'
      });
      return;
    }

    const hasAccess: boolean = await RoleAccessService.checkPageAccess(req.user!.id, page);

    res.json({
      success: true,
      hasAccess
    });
  })
);

/**
 * POST /api/admin/access/check-api
 * Check if current user can access an API endpoint
 */
router.post('/check-api',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { method, endpoint } = (req as any).body as AccessCheckRequest;

    if (!method || !endpoint) {
      res.status(400).json({
        success: false,
        error: 'method and endpoint parameters are required'
      });
      return;
    }

    const hasAccess: boolean = await RoleAccessService.checkApiAccess(req.user!.id, method, endpoint);

    res.json({
      success: true,
      hasAccess
    });
  })
);

/**
 * POST /api/admin/access/check-feature
 * Check if current user has a feature enabled
 */
router.post('/check-feature',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { feature } = (req as any).body as AccessCheckRequest;

    if (!feature) {
      res.status(400).json({
        success: false,
        error: 'feature parameter is required'
      });
      return;
    }

    const isEnabled: boolean = await RoleAccessService.checkFeature(req.user!.id, feature);

    res.json({
      success: true,
      isEnabled
    });
  })
);

// --- Cache Management ---

/**
 * POST /api/admin/access/clear-cache
 * Clear access control caches
 */
router.post('/clear-cache',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'manage_permissions',
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await RoleAccessService.clearAllCaches();

    res.json({
      success: true,
      message: 'Access control caches cleared successfully'
    });
  })
);

// --- User Access Information ---

/**
 * GET /api/admin/access/my-pages
 * Get all pages the current user can access
 */
router.get('/my-pages',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { getUserAccessiblePages } = require('../../middleware/accessControl');
    const pages: string[] = await getUserAccessiblePages(req.user!.id);

    res.json({
      success: true,
      data: pages
    });
  })
);

/**
 * GET /api/admin/access/my-apis
 * Get all API endpoints the current user can access
 */
router.get('/my-apis',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { getUserAccessibleApis } = require('../../middleware/accessControl');
    const apis: string[] = await getUserAccessibleApis(req.user!.id);

    res.json({
      success: true,
      data: apis
    });
  })
);

export default router;