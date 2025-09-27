/**
 * @fileoverview User Management Routes
 * @description Express routes for user CRUD operations, role management, and authentication.
 * Handles user creation, updates, deletion, and role-based access control.
 */

import express, { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { Database } from '../types/database.types';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { ResponseFormatter } from '../utils/response-formatters';
import { enhancedAsyncHandler } from '../middleware/enhanced-error-handling';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { UserSchemas, IdParamSchema, FilterSchemas } from '../utils/validation-schemas';
import { ErrorFactory, ValidationError } from '../utils/errors';
import { UserService } from '../services/UserService';
import { AuthenticatedRequest } from '../types/auth.types';
import { UUID, Timestamp, UserRole, AvailabilityStrategy } from '../types';

const router = express.Router();

// Type definitions for request parameters, query params, and request bodies
export interface GetUsersQuery {
  page?: number;
  limit?: number;
  role?: string;
}

export interface CreateUserBody {
  email: string;
  name: string;
  password: string;
  send_welcome_email?: boolean;
}

export interface UpdateUserBody {
  email?: string;
  name?: string;
  role?: string;
  password?: string;
  roles?: UUID[];
}

export interface UserIdParams {
  id: UUID;
}

export interface RoleResponse {
  id: UUID;
  name: string;
  description?: string;
}

export interface UsersResponse {
  users: any[];
}

export interface UserResponse {
  user: any;
}

// Extend AuthenticatedRequest to work with Express Request types
interface AuthenticatedRequestWithParams<P = {}, ResBody = any, ReqBody = any, ReqQuery = {}> 
  extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: UUID;
    email: string;
    name: string;
    roles?: any[];
  };
}

/**
 * GET /api/users/roles
 * Get all available roles
 */
const getRoles = async (req: AuthenticatedRequestWithParams, res: Response): Promise<any> => {
  const db: Database = req.app.locals.db;
  
  const roles = await db('roles')
    .select(['id', 'name', 'description'])
    .orderBy('name', 'asc');
  
  return ResponseFormatter.sendSuccess(res, { roles }, 'Roles retrieved successfully');
};

/**
 * GET /api/users
 * Get all users (for admin dropdown selections)
 * Requires: users:read permission
 */
const getUsers = async (
  req: AuthenticatedRequestWithParams<{}, UsersResponse, {}, GetUsersQuery>,
  res: Response
): Promise<any> => {
  try {
    const userService = new UserService(db as any);
    const { page = 1, limit = 50 } = req.query;

    // Get all users with error handling
    const users = await userService.findWhere({}, {
      select: ['id', 'email', 'name', 'created_at', 'updated_at', 'is_available'],
      orderBy: 'email',
      orderDirection: 'asc'
    });

    // Enhance users with roles (with error handling)
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          return await userService.enhanceUserWithRoles(user);
        } catch (error) {
          console.error(`Failed to enhance user ${user.id}:`, error);
          return { ...user, roles: [] }; // Return user with empty roles on error
        }
      })
    );

    return ResponseFormatter.sendSuccess(res, { users: enhancedUsers }, 'Users retrieved successfully');
  } catch (error) {
    console.error('Users API error:', error);
    // Return empty array instead of crashing
    return ResponseFormatter.sendSuccess(res, { users: [] }, 'Users retrieved with errors');
  }
};

/**
 * GET /api/users/:id
 * Get a specific user
 */
const getUserById = async (
  req: AuthenticatedRequestWithParams<UserIdParams, UserResponse>, 
  res: Response
): Promise<any> => {
  const userService = new UserService(db as any);
  const userId = req.params.id;
  
  // Users can only view their own profile unless they're admin
  const isAdmin = req.user?.roles && (req.user.roles.some(role => ['admin', 'Admin', 'Super Admin'].includes(role.name || role)));
  if (!isAdmin && req.user?.id !== userId) {
    throw ErrorFactory.forbidden('Not authorized to view this user');
  }

  const user = await userService.findById(userId, {
    select: ['id', 'email', 'name', 'created_at', 'updated_at']
  });

  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }

  // Enhance user with roles from RBAC system
  const userWithRoles = await userService.enhanceUserWithRoles(user);

  // Return user with roles
  return ResponseFormatter.sendSuccess(res, { user: userWithRoles }, 'User retrieved successfully');
};

/**
 * POST /api/users
 * Create a new user (admin only)
 */
const createUser = async (
  req: AuthenticatedRequestWithParams<{}, UserResponse, CreateUserBody>, 
  res: Response
): Promise<any> => {
  const userService = new UserService(db as any);
  const { email, password, name, send_welcome_email = false } = req.body;
  
  console.log('Creating user with data:', { email, name });
  
  // Validate required fields
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  
  // Check if user already exists
  const existingUser = await userService.findWhere({ email });
  if (existingUser.length > 0) {
    throw ErrorFactory.conflict('User with this email already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user with required fields and defaults
  try {
    const newUser = await userService.create({
      email,
      password_hash: hashedPassword,
      name,
      role: UserRole.REFEREE,  // Default role
      phone: null,
      postal_code: 'N/A',  // Required field, cannot be null
      max_distance: 25,
      is_available: true,
      white_whistle: false,
      availability_strategy: AvailabilityStrategy.WHITELIST,
      wage_per_game: null,
      referee_level_id: null,
      is_active: true,
      email_verified: false
    });
    console.log('User created successfully:', newUser.id);
    
    // TODO: Send welcome email if requested
    if (send_welcome_email) {
      // Email service implementation would go here
    }
    
    return ResponseFormatter.sendSuccess(res, { user: newUser }, 'User created successfully', 201);
  } catch (createError: any) {
    console.error('Error creating user:', createError.message, createError.code);
    throw createError;
  }
};

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
const updateUser = async (
  req: AuthenticatedRequestWithParams<UserIdParams, UserResponse, UpdateUserBody>, 
  res: Response
): Promise<any> => {
  const userService = new UserService(db as any);
  const userId = req.params.id;
  const { email, name, role, password, roles } = req.body;
  
  // Check if user exists
  const user = await userService.findById(userId);
  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }
  
  // Build update object
  const updateData: any = {};
  if (email !== undefined) updateData.email = email;
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;  // Keep legacy role for backward compatibility
  
  // Hash password if provided
  if (password) {
    updateData.password_hash = await bcrypt.hash(password, 10);
  }
  
  // Update user basic info
  const updatedUser = await userService.update(userId, updateData);
  
  // Update roles if provided (new RBAC system)
  if (roles && Array.isArray(roles)) {
    // Remove existing roles
    await db('user_roles').where('user_id', userId).del();
    
    // Add new roles
    if (roles.length > 0) {
      const roleAssignments = roles.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_at: new Date(),
        assigned_by: req.user?.id
      }));
      
      await db('user_roles').insert(roleAssignments);
    }
  }
  
  // Get the updated user with new roles
  const enhancedUser = await userService.enhanceUserWithRoles(updatedUser);
  
  return ResponseFormatter.sendSuccess(res, { user: enhancedUser }, 'User updated successfully');
};

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
const deleteUser = async (
  req: AuthenticatedRequestWithParams<UserIdParams>, 
  res: Response
): Promise<any> => {
  const userService = new UserService(db as any);
  const userId = req.params.id;
  
  // Prevent deleting own account
  if (req.user?.id === userId) {
    throw new ValidationError('Cannot delete your own account');
  }
  
  // Check if user exists
  const user = await userService.findById(userId);
  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }
  
  // Soft delete by setting deleted_at timestamp
  await userService.update(userId, { 
    is_active: false
  } as any);
  
  return ResponseFormatter.sendSuccess(res, null, 'User deleted successfully');
};

// Route definitions with proper middleware and handlers
router.get('/roles',
  authenticateToken as any,
  requireCerbosPermission({
    resource: 'user',
    action: 'view:roles',
  }) as any,
  enhancedAsyncHandler(getRoles as any)
);

router.get('/',
  authenticateToken as any,
  requireCerbosPermission({
    resource: 'user',
    action: 'view:list',
  }) as any,
  validateQuery(FilterSchemas.referees) as any,
  enhancedAsyncHandler(getUsers as any)
);

router.get('/:id',
  authenticateToken as any,
  requireCerbosPermission({
    resource: 'user',
    action: 'view:details',
    getResourceId: (req) => req.params.id,
  }) as any,
  validateParams(IdParamSchema) as any,
  enhancedAsyncHandler(getUserById as any)
);

router.post('/',
  authenticateToken as any,
  requireCerbosPermission({
    resource: 'user',
    action: 'create',
  }) as any,
  enhancedAsyncHandler(createUser as any)
);

router.put('/:id',
  authenticateToken as any,
  requireCerbosPermission({
    resource: 'user',
    action: 'update',
    getResourceId: (req) => req.params.id,
  }) as any,
  validateParams(IdParamSchema) as any,
  enhancedAsyncHandler(updateUser as any)
);

router.delete('/:id',
  authenticateToken as any,
  requireCerbosPermission({
    resource: 'user',
    action: 'delete',
    getResourceId: (req) => req.params.id,
  }) as any,
  validateParams(IdParamSchema) as any,
  enhancedAsyncHandler(deleteUser as any)
);

export default router;
export { 
  getRoles, 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
};