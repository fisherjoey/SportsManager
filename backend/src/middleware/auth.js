const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
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
    const userRoles = req.user.roles || [req.user.role];
    
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
  if (!user) return false;
  
  // Handle roles array with proper fallback
  let userRoles;
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    userRoles = user.roles;
  } else if (user.role) {
    userRoles = [user.role];
  } else {
    return false;
  }
  
  // Admin always has access
  if (userRoles.includes('admin') || user.role === 'admin') {
    return true;
  }
  
  return userRoles.includes(roleName);
}

module.exports = {
  authenticateToken,
  requireRole,
  requireAnyRole,
  hasRole
};