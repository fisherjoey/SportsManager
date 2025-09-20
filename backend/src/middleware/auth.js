/**
 * @fileoverview Authentication middleware compatibility bridge
 * @description Provides a bridge to TypeScript-implemented authentication middleware
 * while maintaining backward compatibility during the migration process.
 * 
 * This file will dynamically require the appropriate implementation:
 * 1. If TypeScript compilation is available, use compiled version
 * 2. Otherwise, fall back to runtime TypeScript execution
 * 3. As a final fallback, implement basic middleware directly
 */

const path = require('path');
const fs = require('fs');

let authModule;

// Try different loading strategies
const distPath = path.resolve(__dirname, '../../dist/middleware/auth.js');
const tsPath = path.resolve(__dirname, './auth.ts');

if (fs.existsSync(distPath)) {
  // Use compiled TypeScript version
  console.log('Loading compiled TypeScript auth middleware from:', distPath);
  try {
    authModule = require(distPath);
  } catch (error) {
    console.warn('Failed to load compiled version:', error.message);
    authModule = null;
  }
}

if (!authModule && fs.existsSync(tsPath)) {
  // Try to load TypeScript directly with ts-node if available
  try {
    require('ts-node/register');
    authModule = require('./auth.ts');
    console.log('Loading TypeScript auth middleware directly');
  } catch (error) {
    console.warn('Could not load TypeScript directly:', error.message);
    authModule = null;
  }
}

// If both methods fail, create a fallback implementation
if (!authModule) {
  console.warn('Creating fallback auth middleware implementation');
  const jwt = require('jsonwebtoken');
  const PermissionService = require('../services/PermissionService');
  const permissionService = new PermissionService();
  
  authModule = {
    authenticateToken: (req, res, next) => {
      const authHeader = req.headers['authorization'];
      console.log('authenticateToken - Path:', req.path, 'URL:', req.url, 'Has authHeader:', !!authHeader);
      
      if (!authHeader || !authHeader.trim() || !authHeader.trim().startsWith('Bearer ')) {
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
        if (user.userId && !user.id) {
          user.id = user.userId;
        }
        req.user = user;
        next();
      });
    },
    
    requireRole: (role) => (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      const userRoles = req.user.roles || [];
      if (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin') || userRoles.includes(role)) {
        return next();
      }
      return res.status(403).json({ error: 'Insufficient permissions' });
    },
    
    requireAnyRole: (...roles) => (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      const userRoles = req.user.roles || [];
      if (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin') || roles.some(role => userRoles.includes(role))) {
        return next();
      }
      return res.status(403).json({ error: 'Insufficient permissions' });
    },
    
    hasRole: (user, roleName) => {
      if (!user || !roleName) return false;
      const userRoles = user.roles || [];
      if (roleName !== 'admin' && (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin'))) {
        return true;
      }
      return userRoles.includes(roleName);
    },
    
    requirePermission: (permissionName) => async (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      try {
        const userRoles = req.user.roles || [];
        if (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin')) {
          return next();
        }
        const hasPermission = await permissionService.hasPermission(req.user.id, permissionName);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions', required: permissionName });
        }
        next();
      } catch (error) {
        console.error('Permission check error:', error);
        return res.status(500).json({ error: 'Permission check failed' });
      }
    },
    
    requireAnyPermission: (permissionNames) => async (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
        return res.status(500).json({ error: 'Invalid permission configuration' });
      }
      try {
        const userRoles = req.user.roles || [];
        if (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin')) {
          return next();
        }
        const hasAnyPermission = await permissionService.hasAnyPermission(req.user.id, permissionNames);
        if (!hasAnyPermission) {
          return res.status(403).json({ error: 'Insufficient permissions', required: `One of: ${permissionNames.join(', ')}` });
        }
        next();
      } catch (error) {
        console.error('Permission check error:', error);
        return res.status(500).json({ error: 'Permission check failed' });
      }
    },
    
    requireAllPermissions: (permissionNames) => async (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
        return res.status(500).json({ error: 'Invalid permission configuration' });
      }
      try {
        const userRoles = req.user.roles || [];
        if (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin')) {
          return next();
        }
        const hasAllPermissions = await permissionService.hasAllPermissions(req.user.id, permissionNames);
        if (!hasAllPermissions) {
          return res.status(403).json({ error: 'Insufficient permissions', required: `All of: ${permissionNames.join(', ')}` });
        }
        next();
      } catch (error) {
        console.error('Permission check error:', error);
        return res.status(500).json({ error: 'Permission check failed' });
      }
    },
    
    hasPermission: async (user, permissionName) => {
      if (!user || !permissionName) return false;
      try {
        const userRoles = user.roles || [];
        if (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin')) {
          return true;
        }
        return await permissionService.hasPermission(user.id, permissionName);
      } catch (error) {
        console.error('Permission check error:', error);
        return false;
      }
    },
    
    getUserPermissions: async (userId, useCache = true) => {
      try {
        return await permissionService.getUserPermissions(userId, useCache);
      } catch (error) {
        console.error('Error getting user permissions:', error);
        return [];
      }
    },
    
    requireAdmin: null, // Will be set below
    requireSuperAdmin: null, // Will be set below
    permissionService
  };
  
  // Set up convenience middleware
  authModule.requireAdmin = authModule.requireRole('admin');
  authModule.requireSuperAdmin = authModule.requireRole('Super Admin');
}

const {
  authenticateToken,
  requireRole,
  requireAnyRole,
  hasRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  hasPermission,
  getUserPermissions,
  requireAdmin,
  requireSuperAdmin,
  permissionService
} = authModule;

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
  requireAdmin,
  requireSuperAdmin,
  permissionService
};