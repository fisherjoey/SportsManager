const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { ResponseFormatter } = require('../utils/response-formatters');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { UserSchemas, IdParamSchema, FilterSchemas } = require('../utils/validation-schemas');
const { ErrorFactory } = require('../utils/errors');
const UserService = require('../services/UserService');

// Initialize UserService with database connection
const userService = new UserService(db);

/**
 * GET /api/users/roles
 * Get all available roles
 */
router.get('/roles', authenticateToken, enhancedAsyncHandler(async (req, res) => {
  const roles = await db('roles')
    .select('id', 'name', 'description')
    .orderBy('name', 'asc');
  
  return ResponseFormatter.sendSuccess(res, { roles }, 'Roles retrieved successfully');
}));

/**
 * GET /api/users
 * Get all users (for admin dropdown selections)
 */
// Requires: users:read permission
router.get('/', authenticateToken, requirePermission('users:read'), validateQuery(FilterSchemas.referees), enhancedAsyncHandler(async (req, res) => {
  const { role, page = 1, limit = 50 } = req.query;
  
  let users;
  if (role) {
    // Get users by specific role with pagination
    const result = await userService.findWithPagination(
      { role },
      page,
      limit,
      { 
        select: ['id', 'email', 'role', 'name', 'created_at', 'updated_at', 'is_available'],
        orderBy: 'email',
        orderDirection: 'asc'
      }
    );
    
    // Enhance users with new roles
    const enhancedUsers = await Promise.all(
      result.data.map(user => userService.enhanceUserWithRoles(user))
    );
    
    return ResponseFormatter.sendPaginated(res, enhancedUsers, result.pagination);
  } else {
    // Get all users with basic info
    users = await userService.findWhere({}, {
      select: ['id', 'email', 'role', 'name', 'created_at', 'updated_at', 'is_available'],
      orderBy: 'email',
      orderDirection: 'asc'
    });
    
    // Enhance all users with new roles
    const enhancedUsers = await Promise.all(
      users.map(user => userService.enhanceUserWithRoles(user))
    );
    
    users = enhancedUsers;
  }

  // Maintain backward compatibility with existing API consumers
  return ResponseFormatter.sendSuccess(res, { users }, 'Users retrieved successfully');
}));

/**
 * GET /api/users/:id
 * Get a specific user
 */
router.get('/:id', authenticateToken, validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  const userId = req.params.id;
  
  // Users can only view their own profile unless they're admin
  const isAdmin = req.user.roles && (req.user.roles.some(role => ['admin', 'Admin', 'Super Admin'].includes(role.name || role)));
  if (!isAdmin && req.user.id !== userId) {
    throw ErrorFactory.forbidden('Not authorized to view this user');
  }

  const user = await userService.findById(userId, {
    select: ['id', 'email', 'role', 'name', 'created_at', 'updated_at']
  });

  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }

  // For referees, get additional details if admin is requesting
  const isAdmin = req.user.roles && (req.user.roles.some(role => ['admin', 'Admin', 'Super Admin'].includes(role.name || role)));
  if (user.role === 'referee' && isAdmin) {
    const detailedUser = await userService.getUserWithRefereeDetails(userId, {
      assignmentLimit: 5 // Limit recent assignments for this endpoint
    });
    return ResponseFormatter.sendSuccess(res, { user: detailedUser }, 'User details retrieved successfully');
  }

  // Maintain backward compatibility with existing API consumers
  return ResponseFormatter.sendSuccess(res, { user }, 'User retrieved successfully');
}));

/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post('/', authenticateToken, requireRole('admin'), enhancedAsyncHandler(async (req, res) => {
  const { email, password, name, role = 'referee', send_welcome_email = false } = req.body;
  
  console.log('Creating user with data:', { email, name, role });
  
  // Validate required fields
  if (!email || !password) {
    throw ErrorFactory.badRequest('Email and password are required');
  }
  
  // Check if user already exists
  const existingUser = await userService.findWhere({ email });
  if (existingUser.length > 0) {
    throw ErrorFactory.conflict('User with this email already exists');
  }
  
  // Hash password
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user with required fields and defaults
  try {
    const newUser = await userService.create({
      email,
      password_hash: hashedPassword,
      name,
      role,
      is_available: true,
      max_distance: 25,
      phone: null,
      location: null,
      postal_code: 'N/A',  // Required field, cannot be null
      wage_per_game: null,
      years_experience: null,
      evaluation_score: null
    });
    console.log('User created successfully:', newUser.id);
    
    // TODO: Send welcome email if requested
    if (send_welcome_email) {
      // Email service implementation would go here
    }
    
    return ResponseFormatter.sendSuccess(res, { user: newUser }, 'User created successfully', 201);
  } catch (createError) {
    console.error('Error creating user:', createError.message, createError.code);
    throw createError;
  }
}));

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id', authenticateToken, requireRole('admin'), validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { email, name, role, password, roles } = req.body;
  
  // Check if user exists
  const user = await userService.findById(userId);
  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }
  
  // Build update object
  const updateData = {};
  if (email !== undefined) updateData.email = email;
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;  // Keep legacy role for backward compatibility
  
  // Hash password if provided
  if (password) {
    const bcrypt = require('bcryptjs');
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
        assigned_by: req.user.id
      }));
      
      await db('user_roles').insert(roleAssignments);
    }
  }
  
  // Get the updated user with new roles
  const enhancedUser = await userService.enhanceUserWithRoles(updatedUser);
  
  return ResponseFormatter.sendSuccess(res, { user: enhancedUser }, 'User updated successfully');
}));

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
router.delete('/:id', authenticateToken, requireRole('admin'), validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  const userId = req.params.id;
  
  // Prevent deleting own account
  if (req.user.id === userId) {
    throw ErrorFactory.badRequest('Cannot delete your own account');
  }
  
  // Check if user exists
  const user = await userService.findById(userId);
  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }
  
  // Soft delete by setting deleted_at timestamp
  await userService.update(userId, { 
    is_active: false,
    deleted_at: new Date()
  });
  
  return ResponseFormatter.sendSuccess(res, null, 'User deleted successfully');
}));

module.exports = router;