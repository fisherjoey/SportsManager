/**
 * @fileoverview Authentication and authorization middleware
 * @description TypeScript implementation of authentication middleware with Clerk JWT verification,
 * role-based access control, and permission checking.
 */

import { clerkClient } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types';
import { db } from '../config/database';

// Extended JWT payload for Clerk tokens
interface ExtendedJWTPayload extends JWTPayload {
  id?: string; // Database user ID
  clerkId?: string; // Clerk user ID
  roles?: string[]; // Array of role codes
  organizationId?: string; // Current organization context
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
 * Middleware to authenticate Clerk JWT tokens for sync-user endpoint
 * Only verifies the Clerk token, does NOT require user to exist in database
 * This is used for the sync-user endpoint which creates new users
 */
async function authenticateClerkTokenOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Get token from Authorization header (Bearer token)
    const authHeader = (req as any).headers['authorization'];

    console.log('[DEBUG] authenticateClerkTokenOnly middleware called - Path:', (req as any).path);

    if (!authHeader || !authHeader.trim()) {
      console.log('No auth header provided');
      res.status(401).json({ error: 'Access token required' });
      return;
    }

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

    // 2. Verify Clerk JWT
    try {
      const { verifyToken } = await import('@clerk/backend');

      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      const clerkUserId = verifiedToken.sub;

      if (!clerkUserId) {
        console.log('No sub claim in Clerk token');
        res.status(403).json({ error: 'Invalid token structure' });
        return;
      }

      console.log('Clerk token verified for sync-user - Clerk User ID:', clerkUserId);

      // 3. Fetch Clerk user details to get email and name
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      // 4. Attach Clerk user info to request (no DB lookup needed)
      req.user = {
        sub: clerkUserId,
        clerkId: clerkUserId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : clerkUser.username,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username,
      } as any;

      console.log('Clerk user info attached:', req.user);

      next();
    } catch (clerkError) {
      console.log('Clerk JWT verification failed:', clerkError);
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to authenticate Clerk JWT tokens
 * Validates Bearer tokens, verifies with Clerk, looks up user in database,
 * fetches roles, validates organization membership, and attaches user information to the request
 */
async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Get token from Authorization header (Bearer token)
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

    // 2. Verify Clerk JWT using Clerk's backend API
    let clerkUserId: string;

    try {
      // Use Clerk's sessions API to verify the token
      // The token should be verified using Clerk's JWKS or sessions endpoint
      // For now, we'll use basic JWT decoding and verify with Clerk backend
      const { verifyToken } = await import('@clerk/backend');

      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      // Extract clerk user ID from the 'sub' claim
      clerkUserId = verifiedToken.sub;

      if (!clerkUserId) {
        console.log('No sub claim in Clerk token');
        res.status(403).json({ error: 'Invalid token structure' });
        return;
      }

      console.log('Clerk token verified - Clerk User ID:', clerkUserId);
    } catch (clerkError) {
      console.log('Clerk JWT verification failed:', clerkError);
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    // 3. Look up user in database by clerk_id
    const userRecord: any = await db('users')
      .where('clerk_id', clerkUserId)
      .first();

    if (!userRecord) {
      console.log('No user found for clerk_id:', clerkUserId);
      res.status(403).json({ error: 'User not found in system' });
      return;
    }

    console.log('User found in database - ID:', userRecord.id, 'Email:', userRecord.email);

    // 4. Fetch user roles from user_roles and roles tables
    const userRoles: any[] = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userRecord.id)
      .where('user_roles.is_active', true)
      .where('roles.is_active', true)
      .select('roles.code', 'roles.name', 'roles.id');

    const roleCodes = userRoles.map(r => r.code);

    console.log('User roles fetched:', roleCodes);

    // 6. Get organization ID from request header
    const organizationId = (req as any).headers['x-organization-id'];

    // 7. If organization ID is provided, validate membership
    if (organizationId) {
      const membership: any = await db('user_organizations')
        .where('user_id', userRecord.id)
        .where('organization_id', organizationId)
        .where('status', 'active')
        .first();

      if (!membership) {
        console.log('User not a member of organization:', organizationId);
        res.status(403).json({ error: 'Not authorized for this organization' });
        return;
      }

      console.log('Organization membership validated:', organizationId);
    }

    // 8. Attach user information to request
    const userPayload: ExtendedJWTPayload = {
      id: userRecord.id,
      userId: userRecord.id,
      clerkId: clerkUserId,
      email: userRecord.email,
      role: roleCodes[0] || 'user', // Primary role for backward compatibility
      roles: roleCodes,
      permissions: [], // To be populated by permission checks if needed
      organizationId: organizationId || userRecord.organization_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    console.log('User authenticated - ID:', userPayload.id, 'Email:', userPayload.email, 'Roles:', userPayload.roles);

    req.user = userPayload as any;

    // 9. Call next middleware
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
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
  authenticateClerkTokenOnly,
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