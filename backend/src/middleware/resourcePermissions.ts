// @ts-nocheck

/**
 * Resource Permissions Middleware
 * 
 * This middleware provides permission checking functionality for resource operations.
 * It integrates with the ResourcePermissionService to enforce access control
 * on resource and category operations.
 */

import ResourcePermissionService from '../services/ResourcePermissionService';

// Initialize the permission service
const resourcePermissionService = new ResourcePermissionService();

/**
 * Middleware to check resource permissions
 * @param {string} action - Required action (view, create, edit, delete, manage)
 * @param {Object} options - Middleware options
 * @param {boolean} options.allowOwner - Allow resource owner access (default: true)
 * @param {boolean} options.requireExisting - Require resource to exist (default: true)
 * @returns {Function} Express middleware function
 */
function checkResourcePermission(action, options = {}) {
  return async (req, res, next) => {
    try {
      const {
        allowOwner = true,
        requireExisting = true
      } = options;

      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.id;
      let resourceId = req.params.id || req.params.resourceId;

      // For create operations, we might not have a resource ID yet
      if (action === 'create') {
        requireExisting = false;
        resourceId = null;
      }

      // If resource ID is required but not provided
      if (requireExisting && !resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID required'
        });
      }

      // Check permission through the service
      let hasPermission = false;

      if (resourceId) {
        hasPermission = await resourcePermissionService.hasResourcePermission(
          userId,
          resourceId,
          action,
          { useCache: true }
        );
      } else {
        // For create operations, check global permission
        hasPermission = await resourcePermissionService.checkGlobalPermission(
          userId,
          resourcePermissionService.getGlobalPermissionKey(action)
        );

        // Also check if user is Super Admin
        if (!hasPermission) {
          const superAdminCheck = await resourcePermissionService.db('user_roles')
            .join('roles', 'user_roles.role_id', 'roles.id')
            .where('user_roles.user_id', userId)
            .where('roles.name', 'Super Admin')
            .where('roles.is_active', true)
            .first();

          hasPermission = !!superAdminCheck;
        }
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions to ${action} this resource`,
          required_permission: action,
          resource_id: resourceId
        });
      }

      // Permission granted, continue to next middleware
      next();

    } catch (error) {
      console.error('Error checking resource permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check resource permissions'
      });
    }
  };
}

/**
 * Middleware to check category permissions
 * @param {string} action - Required action (view, create, edit, delete, manage)
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware function
 */
function checkCategoryPermission(action, options = {}) {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.id;
      const categoryId = req.params.id || req.params.categoryId;

      // Check if category ID is required but not provided
      if (!categoryId && action !== 'create') {
        return res.status(400).json({
          success: false,
          error: 'Category ID required'
        });
      }

      let hasPermission = false;

      if (categoryId) {
        hasPermission = await resourcePermissionService.checkCategoryPermission(
          userId,
          categoryId,
          action
        );
      } else {
        // For create operations, check global permission
        hasPermission = await resourcePermissionService.checkGlobalPermission(
          userId,
          resourcePermissionService.getGlobalPermissionKey(action)
        );

        // Also check if user is Super Admin
        if (!hasPermission) {
          const superAdminCheck = await resourcePermissionService.db('user_roles')
            .join('roles', 'user_roles.role_id', 'roles.id')
            .where('user_roles.user_id', userId)
            .where('roles.name', 'Super Admin')
            .where('roles.is_active', true)
            .first();

          hasPermission = !!superAdminCheck;
        }
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions to ${action} this category`,
          required_permission: action,
          category_id: categoryId
        });
      }

      // Permission granted, continue to next middleware
      next();

    } catch (error) {
      console.error('Error checking category permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check category permissions'
      });
    }
  };
}

/**
 * Middleware to check if user can manage resource permissions
 * This is for endpoints that modify permissions themselves
 * @returns {Function} Express middleware function
 */
function checkPermissionManagement() {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.id;

      // Check if user is Super Admin (can manage all permissions)
      const superAdminCheck = await resourcePermissionService.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.name', 'Super Admin')
        .where('roles.is_active', true)
        .first();

      if (superAdminCheck) {
        return next();
      }

      // Check for specific permission management permission
      const hasPermission = await resourcePermissionService.checkGlobalPermission(
        userId,
        'resources:manage_permissions'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to manage resource permissions'
        });
      }

      next();

    } catch (error) {
      console.error('Error checking permission management:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check permission management access'
      });
    }
  };
}

/**
 * Middleware to check audit log access
 * @returns {Function} Express middleware function
 */
function checkAuditAccess() {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.id;

      // Check if user is Super Admin
      const superAdminCheck = await resourcePermissionService.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.name', 'Super Admin')
        .where('roles.is_active', true)
        .first();

      if (superAdminCheck) {
        return next();
      }

      // Check for audit access permission
      const hasPermission = await resourcePermissionService.checkGlobalPermission(
        userId,
        'resources:view_audit'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view audit logs'
        });
      }

      next();

    } catch (error) {
      console.error('Error checking audit access:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check audit access'
      });
    }
  };
}

/**
 * Middleware to extract IP address and user agent for audit logging
 * @returns {Function} Express middleware function
 */
function extractAuditMetadata() {
  return (req, res, next) => {
    // Extract and store audit metadata in request for later use
    req.auditMetadata = {
      ip_address: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
      user_agent: req.get('user-agent') || 'Unknown'
    };

    next();
  };
}

/**
 * Middleware to validate resource ownership
 * This can be used in combination with other permission checks
 * @returns {Function} Express middleware function
 */
function checkResourceOwnership() {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.id;
      const resourceId = req.params.id || req.params.resourceId;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID required'
        });
      }

      // Get resource to check ownership
      const resource = await resourcePermissionService.db('resources')
        .where('id', resourceId)
        .first();

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      // Check ownership
      if (resource.created_by !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only access resources you created'
        });
      }

      // Add resource to request object for use in handlers
      req.resource = resource;
      next();

    } catch (error) {
      console.error('Error checking resource ownership:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check resource ownership'
      });
    }
  };
}

/**
 * Combined middleware for common permission patterns
 * @param {string} action - Required action
 * @param {Object} options - Combined options
 * @returns {Array} Array of middleware functions
 */
function requireResourcePermission(action, options = {}) {
  const middlewares = [extractAuditMetadata()];

  if (options.checkOwnership) {
    middlewares.push(checkResourceOwnership());
  } else {
    middlewares.push(checkResourcePermission(action, options));
  }

  return middlewares;
}

/**
 * Combined middleware for category operations
 * @param {string} action - Required action
 * @param {Object} options - Combined options
 * @returns {Array} Array of middleware functions
 */
function requireCategoryPermission(action, options = {}) {
  return [
    extractAuditMetadata(),
    checkCategoryPermission(action, options)
  ];
}

export {
  // Individual middleware functions
  checkResourcePermission,
  checkCategoryPermission,
  checkPermissionManagement,
  checkAuditAccess,
  extractAuditMetadata,
  checkResourceOwnership,

  // Combined middleware arrays
  requireResourcePermission,
  requireCategoryPermission,

  // Direct access to the service for advanced use cases
  resourcePermissionService
};