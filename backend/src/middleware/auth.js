const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.trim()) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Check if header starts with 'Bearer ' (case sensitive)
  if (!authHeader.trim().startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.trim().split(' ')[1];
  
  if (!token || token.trim() === '') {
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
  if (!user || !roleName) return false;
  
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

module.exports = {
  authenticateToken,
  requireRole,
  requireAnyRole,
  hasRole
};