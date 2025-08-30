const jwt = require('jsonwebtoken');
const PermissionService = require('../services/PermissionService');

// Initialize permission service
const permissionService = new PermissionService();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  console.log('authenticateToken - Path:', req.path, 'URL:', req.url, 'Has authHeader:', !!authHeader);
  
  if (!authHeader || !authHeader.trim()) {
    console.log('No auth header provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  // Check if header starts with 'Bearer ' (case sensitive)
  if (!authHeader.trim().startsWith('Bearer ')) {
    console.log('Auth header does not start with Bearer');
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.trim().split(' ')[1];
  
  if (!token || token.trim() === '') {
    console.log('No token after Bearer');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Standardize the user object - ensure 'id' field exists
    if (user.userId && !user.id) {
      user.id = user.userId;
    }
    console.log('JWT decoded - User ID:', user.id, 'Email:', user.email, 'Role:', user.role, 'Roles array:', user.roles);
    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check new roles array first, fallback to legacy role field
    const userRoles = req.user.roles || [req.user.role];
    
    // Admin always has access (from either system)
    if (userRoles.includes('admin') || req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has required role
    if (!userRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// New function to check if user has any of multiple roles
function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check new roles array first, fallback to legacy role field
    const userRoles = (req.user.roles && req.user.roles.length > 0) ? req.user.roles : [req.user.role];
    
    // Admin always has access
    if (userRoles.includes('admin') || req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has any of the required roles
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// New function to check specific permissions (for future expansion)
function hasRole(user, roleName) {
  if (!user || !roleName) {
    return false;
  }
  
  // Handle roles array with proper fallback
  let userRoles;
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    userRoles = user.roles;
  } else if (user.role) {
    userRoles = [user.role];
  } else {
    return false;
  }
  
  // Admin always has access (except to itself - avoid infinite recursion)
  if (roleName !== 'admin' && (userRoles.includes('admin') || user.role === 'admin')) {
    return true;
  }
  
  return userRoles.includes(roleName);
}

/**
 * Middleware to require specific permission
 * @param {string} permissionName - Required permission name
 * @returns {Function} Express middleware
 */
function requirePermission(permissionName) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Admin always has access
      const userRoles = req.user.roles || [req.user.role];
      if (userRoles.includes('admin') || req.user.role === 'admin') {
        return next();
      }

      // Check permission
      const hasPermission = await permissionService.hasPermission(req.user.id, permissionName);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissionName
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to require any of multiple permissions
 * @param {Array} permissionNames - Array of permission names
 * @returns {Function} Express middleware
 */
function requireAnyPermission(permissionNames) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
      return res.status(500).json({ error: 'Invalid permission configuration' });
    }

    try {
      // Admin always has access
      const userRoles = req.user.roles || [req.user.role];
      console.log('Permission check - User role:', req.user.role, 'User roles:', userRoles, 'Required:', permissionNames);
      if (userRoles.includes('admin') || req.user.role === 'admin') {
        console.log('Admin bypass activated for user:', req.user.email);
        return next();
      }

      // Check if user has any of the required permissions
      const hasAnyPermission = await permissionService.hasAnyPermission(req.user.id, permissionNames);
      
      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `One of: ${permissionNames.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to require all specified permissions
 * @param {Array} permissionNames - Array of permission names
 * @returns {Function} Express middleware
 */
function requireAllPermissions(permissionNames) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
      return res.status(500).json({ error: 'Invalid permission configuration' });
    }

    try {
      // Admin always has access
      const userRoles = req.user.roles || [req.user.role];
      if (userRoles.includes('admin') || req.user.role === 'admin') {
        return next();
      }

      // Check if user has all required permissions
      const hasAllPermissions = await permissionService.hasAllPermissions(req.user.id, permissionNames);
      
      if (!hasAllPermissions) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `All of: ${permissionNames.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Helper function to check if user has permission (non-middleware)
 * @param {Object} user - User object
 * @param {string} permissionName - Permission name
 * @returns {Promise<boolean>} Has permission
 */
async function hasPermission(user, permissionName) {
  if (!user || !permissionName) {
    return false;
  }

  try {
    // Admin always has access
    const userRoles = user.roles || [user.role];
    if (userRoles.includes('admin') || user.role === 'admin') {
      return true;
    }

    return await permissionService.hasPermission(user.id, permissionName);
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Helper function to get user permissions (non-middleware)
 * @param {string} userId - User ID
 * @param {boolean} useCache - Use cache
 * @returns {Promise<Array>} User permissions
 */
async function getUserPermissions(userId, useCache = true) {
  try {
    return await permissionService.getUserPermissions(userId, useCache);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  requireAnyRole,
  hasRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  hasPermission,
  getUserPermissions,
  permissionService
};