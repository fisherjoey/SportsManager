/**
 * @fileoverview Authentication and authorization middleware
 * @description TypeScript implementation of authentication middleware with proper Express typing
 * and comprehensive JWT token validation, role-based access control, and permission checking.
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types';

// Extended JWT payload for backward compatibility
interface ExtendedJWTPayload extends JWTPayload {
  id?: string; // For backward compatibility
  roles?: string[]; // For backward compatibility with role array
}

// DEPRECATED: PermissionService has been replaced by Cerbos authorization
// These functions are kept for backward compatibility but always return false
// to encourage migration to Cerbos-based authorization

const deprecatedPermissionService = {
  hasPermission: () => {
    console.warn('DEPRECATED: hasPermission() should be replaced with Cerbos authorization');
    return Promise.resolve(false);
  },
  hasAnyPermission: () => {
    console.warn('DEPRECATED: hasAnyPermission() should be replaced with Cerbos authorization');
    return Promise.resolve(false);
  },
  hasAllPermissions: () => {
    console.warn('DEPRECATED: hasAllPermissions() should be replaced with Cerbos authorization');
    return Promise.resolve(false);
  },
  getUserPermissions: () => {
    console.warn('DEPRECATED: getUserPermissions() should be replaced with Cerbos authorization');
    return Promise.resolve([]);
  }
};

/**
 * Middleware to authenticate JWT tokens
 * Validates Bearer tokens and attaches user information to the request
 */
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = (req as any).headers['authorization'];

  console.log('[DEBUG] authenticateToken middleware called - Path:', (req as any).path, 'URL:', (req as any).url, 'Query:', (req as any).query, 'Has authHeader:', !!authHeader);
  
  if (!authHeader || !authHeader.trim()) {
    console.log('No auth header provided');
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // Check if header starts with 'Bearer ' (case sensitive)
  if (!authHeader.trim().startsWith('Bearer ')) {
    console.log('Auth header does not start with Bearer');
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const token = authHeader.trim().split(' ')[1];
  
  if (!token || token.trim() === '') {
    console.log('No token after Bearer');
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err: jwt.VerifyErrors | null, decoded: any) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    const user = decoded as ExtendedJWTPayload;
    
    // Standardize the user object - ensure 'id' field exists
    if (user.userId && !user.id) {
      user.id = user.userId;
    }
    
    console.log('JWT decoded - User ID:', user.id, 'Email:', user.email, 'Roles array:', user.roles);
    req.user = user as any; // Cast to match AuthenticatedRequest expectation
    next();
  });
}

/**
 * Middleware factory to require specific role
 * @param role Required role name
 * @returns Express middleware function
 */
function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Check roles array
    const userRoles = (req.user as any).roles || [];
    
    // Admin always has access
    if (userRoles.includes('admin') || userRoles.includes('Admin') ||
        userRoles.includes('Super Admin') || userRoles.includes('super admin') ||
        userRoles.includes('super_admin')) {
      next();
      return;
    }
    
    // Check if user has required role
    if (!userRoles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

/**
 * Middleware factory to require any of multiple roles
 * @param roles Required role names
 * @returns Express middleware function
 */
function requireAnyRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Check roles array
    const userRoles = (req.user as any).roles || [];
    
    // Admin always has access
    if (userRoles.includes('admin') || userRoles.includes('Admin') ||
        userRoles.includes('Super Admin') || userRoles.includes('super admin') ||
        userRoles.includes('super_admin')) {
      next();
      return;
    }
    
    // Check if user has any of the required roles
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

/**
 * Helper function to check if user has specific role
 * @param user User object
 * @param roleName Role name to check
 * @returns True if user has the role
 */
function hasRole(user: any, roleName: string): boolean {
  if (!user || !roleName) {
    return false;
  }
  
  // Handle roles array
  const userRoles = user.roles || [];
  
  // Admin always has access (except to itself - avoid infinite recursion)
  if (roleName !== 'admin' && (userRoles.includes('admin') || userRoles.includes('Admin') || userRoles.includes('Super Admin'))) {
    return true;
  }
  
  return userRoles.includes(roleName);
}

/**
 * Middleware factory to require specific permission
 * @param permissionName Required permission name
 * @returns Express middleware function
 */
function requirePermission(permissionName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      // Admin and Super Admin always have access
      const userRoles = (req.user as any).roles || [];
      if (userRoles.includes('admin') || userRoles.includes('Admin') ||
          userRoles.includes('Super Admin') || userRoles.includes('super admin') ||
          userRoles.includes('super_admin')) {
        console.log('Admin bypass activated for permission:', permissionName);
        next();
        return;
      }

      // Check permission
      const hasPermission = await deprecatedPermissionService.hasPermission();
      
      if (!hasPermission) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissionName
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware factory to require any of multiple permissions
 * @param permissionNames Array of permission names
 * @returns Express middleware function
 */
function requireAnyPermission(permissionNames: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
      res.status(500).json({ error: 'Invalid permission configuration' });
      return;
    }

    try {
      // Admin always has access
      const userRoles = (req.user as any).roles || [];
      console.log('Permission check - User roles:', userRoles, 'Required:', permissionNames);
      if (userRoles.includes('admin') || userRoles.includes('Admin') ||
          userRoles.includes('Super Admin') || userRoles.includes('super admin') ||
          userRoles.includes('super_admin')) {
        console.log('Admin bypass activated for user:', (req.user as any).email);
        next();
        return;
      }

      // Check if user has any of the required permissions
      const hasAnyPermission = await deprecatedPermissionService.hasAnyPermission();
      
      if (!hasAnyPermission) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `One of: ${permissionNames.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware factory to require all specified permissions
 * @param permissionNames Array of permission names
 * @returns Express middleware function
 */
function requireAllPermissions(permissionNames: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
      res.status(500).json({ error: 'Invalid permission configuration' });
      return;
    }

    try {
      // Admin always has access
      const userRoles = (req.user as any).roles || [];
      if (userRoles.includes('admin') || userRoles.includes('Admin') ||
          userRoles.includes('Super Admin') || userRoles.includes('super admin') ||
          userRoles.includes('super_admin')) {
        next();
        return;
      }

      // Check if user has all required permissions
      const hasAllPermissions = await deprecatedPermissionService.hasAllPermissions();
      
      if (!hasAllPermissions) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `All of: ${permissionNames.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Helper function to check if user has permission (non-middleware)
 * @param user User object
 * @param permissionName Permission name
 * @returns Promise resolving to true if user has permission
 */
async function hasPermission(user: any, permissionName: string): Promise<boolean> {
  if (!user || !permissionName) {
    return false;
  }

  try {
    // Admin always has access
    const userRoles = user.roles || [];
    if (userRoles.includes('admin') || userRoles.includes('Admin') ||
        userRoles.includes('Super Admin') || userRoles.includes('super admin') ||
        userRoles.includes('super_admin')) {
      return true;
    }

    return await deprecatedPermissionService.hasPermission();
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Helper function to get user permissions (non-middleware)
 * @param userId User ID
 * @param useCache Whether to use cache
 * @returns Promise resolving to array of user permissions
 */
async function getUserPermissions(userId: string, useCache: boolean = true): Promise<string[]> {
  try {
    const permissions = await deprecatedPermissionService.getUserPermissions();
    // Extract permission names from Permission objects
    return permissions.map((p: any) => p.name || p);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

// Convenience middleware for common role requirements
const requireAdmin = requireRole('admin');
const requireSuperAdmin = requireRole('Super Admin');

export {
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
  requireSuperAdmin
};