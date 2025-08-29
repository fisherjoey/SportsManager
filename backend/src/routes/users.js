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

module.exports = router;