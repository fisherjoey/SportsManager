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
        select: ['id', 'email', 'role', 'name', 'created_at'],
        orderBy: 'email',
        orderDirection: 'asc'
      }
    );
    return ResponseFormatter.sendPaginated(res, result.data, result.pagination);
  } else {
    // Get all users with basic info
    users = await userService.findWhere({}, {
      select: ['id', 'email', 'role', 'name'],
      orderBy: 'email',
      orderDirection: 'asc'
    });
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
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    throw ErrorFactory.forbidden('Not authorized to view this user');
  }

  const user = await userService.findById(userId, {
    select: ['id', 'email', 'role', 'name', 'created_at', 'updated_at']
  });

  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }

  // For referees, get additional details if admin is requesting
  if (user.role === 'referee' && req.user.role === 'admin') {
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
  const { email, password, name, role = 'referee', is_active = true, send_welcome_email = false } = req.body;
  
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
  
  // Create user
  const newUser = await userService.create({
    email,
    password: hashedPassword,
    name,
    role,
    is_active
  });
  
  // TODO: Send welcome email if requested
  if (send_welcome_email) {
    // Email service implementation would go here
  }
  
  return ResponseFormatter.sendSuccess(res, { user: newUser }, 'User created successfully', 201);
}));

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id', authenticateToken, requireRole('admin'), validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { email, name, role, is_active, password } = req.body;
  
  // Check if user exists
  const user = await userService.findById(userId);
  if (!user) {
    throw ErrorFactory.notFound('User', userId);
  }
  
  // Build update object
  const updateData = {};
  if (email !== undefined) updateData.email = email;
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (is_active !== undefined) updateData.is_active = is_active;
  
  // Hash password if provided
  if (password) {
    const bcrypt = require('bcryptjs');
    updateData.password = await bcrypt.hash(password, 10);
  }
  
  // Update user
  const updatedUser = await userService.update(userId, updateData);
  
  return ResponseFormatter.sendSuccess(res, { user: updatedUser }, 'User updated successfully');
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