/**
 * @fileoverview Admin User Management Routes
 *
 * Endpoints for managing user roles in the RBAC system
 */

import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../../types/auth.types';

// Import database and utilities (still JavaScript for now)
const db = require('../../config/database');
const { ResponseFormatter } = require('../../utils/response-formatters');

// Initialize router
const router = express.Router();

// Type definitions for user role management
interface UserRole {
  id: string;
  name: string;
  description?: string;
  assigned_at?: string;
  assigned_by?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  active?: boolean;
}

interface UserWithRoles extends User {
  roles: UserRole[];
}

interface RoleAssignment {
  user_id: string;
  role_id: string;
  assigned_at: Date;
  assigned_by: string;
}

interface DatabaseTransaction {
  del: () => Promise<number>;
  insert: (data: RoleAssignment[]) => Promise<number[]>;
}

// Custom error types
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

class RoleNotFoundError extends Error {
  constructor(roleIds: string[]) {
    super(`One or more roles not found: ${roleIds.join(', ')}`);
    this.name = 'RoleNotFoundError';
  }
}

/**
 * GET /api/admin/users/:userId/roles
 * Get all roles assigned to a user
 */
router.get('/:userId/roles', authenticateToken, requireCerbosPermission({
  resource: 'user',
  action: 'view:details',
  getResourceId: (req: any) => req.params.userId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = (req as any).params;

    // Get user's roles with assignment metadata
    const roles: UserRole[] = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select(
        'roles.id',
        'roles.name',
        'roles.description',
        'user_roles.assigned_at',
        'user_roles.assigned_by'
      );

    ResponseFormatter.sendSuccess(res, { roles }, 'User roles retrieved successfully');
  } catch (error: any) {
    console.error('Error getting user roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user roles',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/users/:userId/roles
 * Replace all roles for a user (complete replacement)
 */
router.put('/:userId/roles', authenticateToken, requireCerbosPermission({
  resource: 'user',
  action: 'manage_roles',
  getResourceId: (req: any) => req.params.userId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = (req as any).params;
    const { role_ids } = (req as any).body as { role_ids?: string[] };

    // Validate input
    if (!Array.isArray(role_ids)) {
      res.status(400).json({
        success: false,
        error: 'role_ids must be an array'
      });
      return;
    }

    // Verify user exists
    const user: User | null = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Verify all roles exist (if any roles provided)
    if (role_ids.length > 0) {
      const roles = await db('roles').whereIn('id', role_ids);
      if (roles.length !== role_ids.length) {
        res.status(400).json({
          success: false,
          error: 'One or more roles not found'
        });
        return;
      }
    }

    // Use transaction to ensure atomicity
    await (db as any).transaction(async (trx: any) => {
      // Remove existing roles
      await trx('user_roles').where('user_id', userId).del();

      // Add new roles (if any)
      if (role_ids.length > 0) {
        const roleAssignments: RoleAssignment[] = role_ids.map(roleId => ({
          user_id: userId,
          role_id: roleId,
          assigned_at: new Date(),
          assigned_by: req.user!.id
        }));

        await trx('user_roles').insert(roleAssignments);
      }
    });

    // Get updated roles
    const updatedRoles: UserRole[] = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.name', 'roles.description');

    const userWithRoles: UserWithRoles = {
      id: userId,
      email: user.email,
      roles: updatedRoles
    };

    ResponseFormatter.sendSuccess(res, { user: userWithRoles }, 'User roles updated successfully');
  } catch (error: any) {
    console.error('Error updating user roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user roles',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/users/:userId/roles
 * Add roles to a user (additive)
 */
router.post('/:userId/roles', authenticateToken, requireCerbosPermission({
  resource: 'user',
  action: 'manage_roles',
  getResourceId: (req: any) => req.params.userId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = (req as any).params;
    const { role_ids } = (req as any).body as { role_ids?: string[] };

    // Validate input
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'role_ids must be a non-empty array'
      });
      return;
    }

    // Verify user exists
    const user: User | null = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Verify all roles exist
    const roles = await db('roles').whereIn('id', role_ids);
    if (roles.length !== role_ids.length) {
      res.status(400).json({
        success: false,
        error: 'One or more roles not found'
      });
      return;
    }

    // Get existing roles to avoid duplicates
    const existingRoleIds: string[] = await db('user_roles')
      .where('user_id', userId)
      .pluck('role_id');

    // Filter out roles that are already assigned
    const newRoleIds = role_ids.filter(id => !existingRoleIds.includes(id));

    // Add new roles if any
    if (newRoleIds.length > 0) {
      const roleAssignments: RoleAssignment[] = newRoleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_at: new Date(),
        assigned_by: req.user!.id
      }));

      await db('user_roles').insert(roleAssignments);
    }

    // Get updated roles
    const updatedRoles: UserRole[] = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.name', 'roles.description');

    const userWithRoles: UserWithRoles = {
      id: userId,
      email: user.email,
      roles: updatedRoles
    };

    ResponseFormatter.sendSuccess(res, { user: userWithRoles }, 'Roles added successfully');
  } catch (error: any) {
    console.error('Error adding roles to user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add roles to user',
      details: error.message
    });
  }
});

/**
 * DELETE /api/admin/users/:userId/roles
 * Remove roles from a user
 */
router.delete('/:userId/roles', authenticateToken, requireCerbosPermission({
  resource: 'user',
  action: 'manage_roles',
  getResourceId: (req: any) => req.params.userId,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = (req as any).params;
    const { role_ids } = (req as any).body as { role_ids?: string[] };

    // Validate input
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'role_ids must be a non-empty array'
      });
      return;
    }

    // Verify user exists
    const user: User | null = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Remove the specified roles
    const removedCount: number = await db('user_roles')
      .where('user_id', userId)
      .whereIn('role_id', role_ids)
      .del();

    // Get updated roles
    const updatedRoles: UserRole[] = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.name', 'roles.description');

    const userWithRoles: UserWithRoles = {
      id: userId,
      email: user.email,
      roles: updatedRoles
    };

    ResponseFormatter.sendSuccess(
      res,
      {
        user: userWithRoles,
        removed_count: removedCount
      },
      'Roles removed successfully'
    );
  } catch (error: any) {
    console.error('Error removing roles from user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove roles from user',
      details: error.message
    });
  }
});

export default router;