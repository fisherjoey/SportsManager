import express, { Request, Response } from 'express';
import Joi from 'joi';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';

const router = express.Router();

// Types
interface Role {
  name: string;
  description: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  roles: string[] | string;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

interface UpdateRolesRequest {
  roles: string[];
}

// Schema for role updates
const updateRolesSchema = Joi.object({
  roles: Joi.array().items(Joi.string()).required().min(1)
});

// Valid roles in the system
const VALID_ROLES = ['admin', 'referee', 'referee_coach', 'evaluator'] as const;
type ValidRole = typeof VALID_ROLES[number];

// GET /api/roles/available - Get list of available roles
router.get('/available', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'view:available',
}), async (req: Request, res: Response) => {
  try {
    // Return predefined roles for now - can be made dynamic later
    const availableRoles: Role[] = [
      {
        name: 'admin',
        description: 'Full system access'
      },
      {
        name: 'referee',
        description: 'Basic referee access to own games and profile'
      },
      {
        name: 'referee_coach',
        description: 'Access to assigned referees and their games'
      },
      {
        name: 'evaluator',
        description: 'Same as referee with evaluation capabilities'
      }
    ];

    res.json({
      success: true,
      data: { roles: availableRoles }
    });
  } catch (error) {
    console.error('Error fetching available roles:', error);
    res.status(500).json({ error: 'Failed to fetch available roles' });
  }
});

// PUT /api/roles/users/:userId - Update user roles (Admin only)
router.put('/users/:userId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'admin:update_user_roles',
  getResourceId: (req: any) => req.params.userId,
}), async (req: Request, res: Response) => {
  try {
    const { error, value } = updateRolesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { userId } = req.params;
    const { roles } = value as UpdateRolesRequest;

    // Validate roles exist in our system
    const invalidRoles = roles.filter(role => !VALID_ROLES.includes(role as ValidRole));

    if (invalidRoles.length > 0) {
      return res.status(400).json({
        error: `Invalid roles: ${invalidRoles.join(', ')}`
      });
    }

    // Check if user exists
    const user = await (db as any)('users').where('id', userId).first() as User | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user roles
    await (db as any)('users')
      .where('id', userId)
      .update({
        roles: JSON.stringify(roles), // Store as JSON string for PostgreSQL array handling
        updated_at: (db as any).fn.now()
      });

    // Fetch updated user
    const updatedUser = await (db as any)('users')
      .select('id', 'email', 'role', 'roles', 'name', 'created_at', 'updated_at')
      .where('id', userId)
      .first() as User;

    // Parse roles back to array
    updatedUser.roles = updatedUser.roles || [updatedUser.role];

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'User roles updated successfully'
    });

  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Failed to update user roles' });
  }
});

// GET /api/roles/users/:userId - Get user roles
router.get('/users/:userId', authenticateToken, requireCerbosPermission({
  resource: 'role',
  action: 'admin:view_user_roles',
  getResourceId: (req: any) => req.params.userId,
}), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await (db as any)('users')
      .select('id', 'email', 'role', 'roles', 'name')
      .where('id', userId)
      .first() as User | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure roles is always an array
    user.roles = user.roles || [user.role];

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

export default router;