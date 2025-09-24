// @ts-nocheck

/**
 * @fileoverview Permission Check Middleware
 * 
 * Enhanced middleware that automatically checks permissions based on
 * the API endpoint and HTTP method. Uses the RBAC configuration to
 * determine required permissions for each route.
 * 
 * @module middleware/permissionCheck
 */

import PermissionService from '../services/PermissionService';

// Initialize permission service
const permissionService = new PermissionService();

/**
 * API Endpoint Permission Mapping
 * Maps HTTP methods and endpoints to required permissions
 */
const API_PERMISSIONS = {
  // Games API
  'GET /api/games': ['games:read'],
  'POST /api/games': ['games:create'],
  'PUT /api/games/:id': ['games:update'],
  'DELETE /api/games/:id': ['games:delete'],
  'POST /api/games/:id/publish': ['games:publish'],
  
  // Teams API
  'GET /api/teams': ['games:read'],
  'POST /api/teams': ['games:create'],
  'PUT /api/teams/:id': ['games:update'],
  'DELETE /api/teams/:id': ['games:delete'],
  
  // Leagues API
  'GET /api/leagues': ['games:read'],
  'POST /api/leagues': ['games:create'],
  'PUT /api/leagues/:id': ['games:update'],
  'DELETE /api/leagues/:id': ['games:delete'],
  
  // Assignments API
  'GET /api/assignments': ['assignments:read'],
  'POST /api/assignments': ['assignments:create'],
  'PUT /api/assignments/:id': ['assignments:update'],
  'DELETE /api/assignments/:id': ['assignments:delete'],
  'POST /api/assignments/:id/approve': ['assignments:approve'],
  'POST /api/assignments/auto-assign': ['assignments:auto_assign'],
  
  // Referees API
  'GET /api/referees': ['referees:read'],
  'GET /api/referees/:id': ['referees:read'],
  'PUT /api/referees/:id': ['referees:update'],
  'POST /api/referees/:id/evaluate': ['referees:evaluate'],
  'DELETE /api/referees/:id': ['referees:manage'],
  
  // Users API
  'GET /api/users': ['users:read'],
  'GET /api/users/:id': ['users:read'],
  'POST /api/users': ['users:create'],
  'PUT /api/users/:id': ['users:update'],
  'DELETE /api/users/:id': ['users:delete'],
  'POST /api/users/:id/impersonate': ['users:impersonate'],
  
  // Roles API
  'GET /api/admin/roles': ['roles:read'],
  'GET /api/admin/roles/:id': ['roles:read'],
  'POST /api/admin/roles': ['roles:manage'],
  'PUT /api/admin/roles/:id': ['roles:manage'],
  'DELETE /api/admin/roles/:id': ['roles:manage'],
  'POST /api/admin/roles/:id/permissions': ['roles:manage'],
  'GET /api/admin/roles/:id/permissions': ['roles:read'],
  'POST /api/admin/roles/:id/users': ['roles:assign'],
  'DELETE /api/admin/roles/:id/users/:userId': ['roles:assign'],
  
  // Permissions API
  'GET /api/admin/permissions': ['roles:read'],
  
  // Reports API
  'GET /api/reports': ['reports:read'],
  'POST /api/reports': ['reports:create'],
  'POST /api/reports/export': ['reports:export'],
  'GET /api/reports/financial': ['reports:financial'],
  
  // Settings API
  'GET /api/settings': ['settings:read'],
  'PUT /api/settings': ['settings:update'],
  'PUT /api/settings/organization': ['settings:organization'],
  
  // Communications API
  'POST /api/communications/send': ['communication:send'],
  'POST /api/communications/broadcast': ['communication:broadcast'],
  'GET /api/communications': ['communication:manage'],
  'DELETE /api/communications/:id': ['communication:manage'],
  
  // Content/Resources API
  'GET /api/resources': ['content:read'],
  'GET /api/resources/:id': ['content:read'],
  'POST /api/resources': ['content:create'],
  'PUT /api/resources/:id': ['content:update'],
  'DELETE /api/resources/:id': ['content:delete'],
  'POST /api/resources/:id/publish': ['content:publish'],
  
  // Finance API (when enabled)
  'GET /api/finance/transactions': ['finance:read'],
  'POST /api/finance/transactions': ['finance:create'],
  'PUT /api/finance/transactions/:id/approve': ['finance:approve'],
  'GET /api/finance/budgets': ['finance:read'],
  'PUT /api/finance/budgets': ['finance:manage'],
};

/**
 * Helper function to normalize API path for matching
 * Converts actual paths like /api/games/123 to pattern /api/games/:id
 */
function normalizeApiPath(method, path) {
  // Remove query parameters
  const cleanPath = path.split('?')[0];
  
  // Create the key
  const key = `${method} ${cleanPath}`;
  
  // Check for exact match first
  if (API_PERMISSIONS[key]) {
    return key;
  }
  
  // Try to match with parameter patterns
  // Replace UUID patterns
  let normalizedPath = cleanPath.replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:id');
  // Replace numeric IDs
  normalizedPath = normalizedPath.replace(/\/\d+/g, '/:id');
  
  const normalizedKey = `${method} ${normalizedPath}`;
  
  // Check if normalized key exists
  if (API_PERMISSIONS[normalizedKey]) {
    return normalizedKey;
  }
  
  // Try more specific patterns for nested resources
  // e.g., /api/roles/123/users/456 -> /api/roles/:id/users/:userId
  const segments = cleanPath.split('/');
  const patternSegments = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // Check if segment is an ID (UUID or numeric)
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment) || /^\d+$/.test(segment)) {
      // Determine parameter name based on previous segment
      const prevSegment = segments[i - 1];
      if (prevSegment === 'users') {
        patternSegments.push(':userId');
      } else if (prevSegment === 'roles') {
        patternSegments.push(':roleId');
      } else {
        patternSegments.push(':id');
      }
    } else {
      patternSegments.push(segment);
    }
  }
  
  const patternPath = patternSegments.join('/');
  const patternKey = `${method} ${patternPath}`;
  
  if (API_PERMISSIONS[patternKey]) {
    return patternKey;
  }
  
  return null;
}

/**
 * Middleware to check permissions based on route
 */
function checkRoutePermission(req, res, next) {
  // Skip permission check for auth endpoints
  if (req.path.startsWith('/api/auth/') || req.path === '/api/login' || req.path === '/api/logout') {
    return next();
  }
  
  // Skip for public endpoints
  if (req.path === '/api/health' || req.path === '/api/status' || req.path === '/api-docs') {
    return next();
  }
  
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Admin bypass - admins have all permissions
  const isAdmin = req.user.roles && (req.user.roles.some(role => ['admin', 'Admin', 'Super Admin'].includes(role.name || role)));
  if (isAdmin) {
    return next();
  }
  
  // Find required permissions for this route
  const routeKey = normalizeApiPath(req.method, req.path);
  
  if (!routeKey) {
    // No specific permissions defined for this route, allow access
    console.log(`No permission mapping for ${req.method} ${req.path}, allowing access`);
    return next();
  }
  
  const requiredPermissions = API_PERMISSIONS[routeKey];
  
  if (!requiredPermissions || requiredPermissions.length === 0) {
    // No permissions required
    return next();
  }
  
  // Check if user has any of the required permissions
  checkUserPermissions(req.user.id, requiredPermissions)
    .then(hasPermission => {
      if (hasPermission) {
        next();
      } else {
        console.log(`User ${req.user.id} lacks permissions for ${routeKey}. Required: ${requiredPermissions.join(', ')}`);
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: requiredPermissions,
          endpoint: `${req.method} ${req.path}`
        });
      }
    })
    .catch(error => {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    });
}

/**
 * Check if user has any of the required permissions
 */
async function checkUserPermissions(userId, requiredPermissions) {
  try {
    // Check each permission
    for (const permission of requiredPermissions) {
      const hasPermission = await permissionService.hasPermission(userId, permission);
      if (hasPermission) {
        return true; // User has at least one required permission
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Middleware factory to require specific permissions
 * Can be used for custom permission requirements
 */
function requirePermissions(...permissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admin bypass
    const isAdmin = req.user.roles && (req.user.roles.some(role => ['admin', 'Admin', 'Super Admin'].includes(role.name || role)));
    if (isAdmin) {
      return next();
    }
    
    try {
      const hasPermission = await checkUserPermissions(req.user.id, permissions);
      
      if (hasPermission) {
        next();
      } else {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions
        });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

export {
  checkRoutePermission,
  requirePermissions,
  API_PERMISSIONS
};