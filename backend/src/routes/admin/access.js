/**
 * @fileoverview Access Control API Routes
 * 
 * Endpoints for managing database-driven access control:
 * - Page access management
 * - API access management  
 * - Feature flags
 * - Data scopes
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandling');
const RoleAccessService = require('../../services/RoleAccessService');
const RoleServiceClass = require('../../services/RoleService');
const RoleService = new RoleServiceClass();
const Joi = require('joi');

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
  requirePermission('roles.read'),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    
    // Verify role exists
    const role = await RoleService.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found' 
      });
    }
    
    const pageAccess = await RoleAccessService.getPageAccess(roleId);
    
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
  requirePermission('roles:manage'),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const { pageAccess } = req.body;
    
    console.log('PUT /roles/:roleId/pages - roleId:', roleId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('pageAccess is array:', Array.isArray(pageAccess));
    
    // Validate input
    if (!Array.isArray(pageAccess)) {
      console.error('pageAccess is not an array, type:', typeof pageAccess);
      return res.status(400).json({
        success: false,
        error: 'pageAccess must be an array'
      });
    }
    
    console.log('Validating', pageAccess.length, 'page access entries');
    
    // Validate each page access entry
    for (let i = 0; i < pageAccess.length; i++) {
      const access = pageAccess[i];
      console.log(`Validating entry ${i}:`, access);
      const { error } = pageAccessSchema.validate(access);
      if (error) {
        console.error(`Validation failed for entry ${i}:`, error.details[0].message);
        return res.status(400).json({
          success: false,
          error: `Invalid page access entry: ${error.details[0].message}`
        });
      }
    }
    
    // Verify role exists
    console.log('Checking if role exists:', roleId);
    try {
      const role = await RoleService.getRoleById(roleId);
      console.log('Role found:', !!role);
      if (!role) {
        console.error('Role not found:', roleId);
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }
    } catch (roleError) {
      console.error('Error getting role:', roleError.message);
      return res.status(400).json({
        success: false,
        error: 'Failed to verify role'
      });
    }
    
    // Update page access
    const result = await RoleAccessService.setPageAccess(roleId, pageAccess, req.user.id);
    
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
  requirePermission('roles.read'),
  asyncHandler(async (req, res) => {
    const pages = await RoleAccessService.getPageRegistry();
    
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
  requirePermission('roles.read'),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    
    // Verify role exists
    const role = await RoleService.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    const apiAccess = await RoleAccessService.getApiAccess(roleId);
    
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
  requirePermission('roles.manage'),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const { apiAccess } = req.body;
    
    // Validate input
    if (!Array.isArray(apiAccess)) {
      return res.status(400).json({
        success: false,
        error: 'apiAccess must be an array'
      });
    }
    
    // Validate each API access entry
    for (const access of apiAccess) {
      const { error } = apiAccessSchema.validate(access);
      if (error) {
        return res.status(400).json({
          success: false,
          error: `Invalid API access entry: ${error.details[0].message}`
        });
      }
    }
    
    // Verify role exists
    const role = await RoleService.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // Update API access
    const result = await RoleAccessService.setApiAccess(roleId, apiAccess, req.user.id);
    
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
  requirePermission('roles.read'),
  asyncHandler(async (req, res) => {
    const apis = await RoleAccessService.getApiRegistry();
    
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
  requirePermission('roles.read'),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    
    // Verify role exists
    const role = await RoleService.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    const features = await RoleAccessService.getFeatures(roleId);
    
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
  requirePermission('roles.manage'),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const { features } = req.body;
    
    // Validate input
    if (!Array.isArray(features)) {
      return res.status(400).json({
        success: false,
        error: 'features must be an array'
      });
    }
    
    // Validate each feature entry
    for (const feature of features) {
      const { error } = featureSchema.validate(feature);
      if (error) {
        return res.status(400).json({
          success: false,
          error: `Invalid feature entry: ${error.details[0].message}`
        });
      }
    }
    
    // Verify role exists
    const role = await RoleService.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // Update features
    const result = await RoleAccessService.setFeatures(roleId, features, req.user.id);
    
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
  requirePermission('roles.read'),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    
    // Verify role exists
    const role = await RoleService.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    const scopes = await RoleAccessService.getDataScopes(roleId);
    
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
  asyncHandler(async (req, res) => {
    const { page } = req.body;
    
    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'page parameter is required'
      });
    }
    
    const hasAccess = await RoleAccessService.checkPageAccess(req.user.id, page);
    
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
  asyncHandler(async (req, res) => {
    const { method, endpoint } = req.body;
    
    if (!method || !endpoint) {
      return res.status(400).json({
        success: false,
        error: 'method and endpoint parameters are required'
      });
    }
    
    const hasAccess = await RoleAccessService.checkApiAccess(req.user.id, method, endpoint);
    
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
  asyncHandler(async (req, res) => {
    const { feature } = req.body;
    
    if (!feature) {
      return res.status(400).json({
        success: false,
        error: 'feature parameter is required'
      });
    }
    
    const isEnabled = await RoleAccessService.checkFeature(req.user.id, feature);
    
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
  requirePermission('roles.manage'),
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    const { getUserAccessiblePages } = require('../../middleware/accessControl');
    const pages = await getUserAccessiblePages(req.user.id);
    
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
  asyncHandler(async (req, res) => {
    const { getUserAccessibleApis } = require('../../middleware/accessControl');
    const apis = await getUserAccessibleApis(req.user.id);
    
    res.json({
      success: true,
      data: apis
    });
  })
);

module.exports = router;