/**
 * @fileoverview Assignment management routes for the Sports Management API
 * 
 * This module handles all assignment-related HTTP endpoints including:
 * - Creating, updating, and deleting referee assignments
 * - Bulk assignment operations
 * - Assignment conflict detection and resolution
 * - Wage calculation and breakdown reporting
 * - Assignment status management and workflow
 * 
 * @module routes/assignments
 * @requires express
 * @requires ../config/database
 * @requires ../middleware/auth
 * @requires ../services/AssignmentService
 * @requires ../services/conflictDetectionService
 * @requires ../utils/wage-calculator
 * @requires ../utils/availability
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { calculateFinalWage, getWageBreakdown } = require('../utils/wage-calculator');
const { checkTimeOverlap, hasSchedulingConflict, findAvailableReferees } = require('../utils/availability');
const { checkAssignmentConflicts } = require('../services/conflictDetectionService');
const { getOrganizationSettings } = require('../utils/organization-settings');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { assignmentLimiter } = require('../middleware/rateLimiting');
const { createAuditLog, AUDIT_EVENTS } = require('../middleware/auditTrail');
const AssignmentService = require('../services/AssignmentService');
const { ResponseFormatter } = require('../utils/response-formatters');
const { ErrorFactory, NotFoundError, ConflictError, ValidationError } = require('../utils/errors');
const { AssignmentSchemas, IdParamSchema, FilterSchemas } = require('../utils/validation-schemas');

// Initialize AssignmentService
const assignmentService = new AssignmentService(db);

// Legacy schema - now using AssignmentSchemas from validation-schemas.js
// Keeping for backward compatibility if needed
const assignmentSchema = AssignmentSchemas.create;

/**
 * Get all assignments with optional filtering, pagination, and detailed referee/game information
 * 
 * @route GET /api/assignments
 * @param {Object} req.query - Query parameters for filtering and pagination
 * @param {string} [req.query.game_id] - Filter by specific game ID
 * @param {string} [req.query.gameId] - Alternative camelCase game ID parameter
 * @param {string} [req.query.referee_id] - Filter by specific referee ID
 * @param {string} [req.query.refereeId] - Alternative camelCase referee ID parameter
 * @param {string} [req.query.user_id] - Filter by specific user ID
 * @param {string} [req.query.status] - Filter by assignment status (pending, confirmed, declined, etc.)
 * @param {number} [req.query.page=1] - Page number for pagination
 * @param {number} [req.query.limit=50] - Number of results per page
 * @returns {Object} JSON response with assignments data and pagination info
 * @returns {Array} returns.data - Array of assignment objects with referee and game details
 * @returns {Object} returns.pagination - Pagination metadata (total, pages, current page)
 * @throws {401} Unauthorized - Missing or invalid authentication token
 * @throws {400} Bad Request - Invalid query parameters
 * @throws {500} Internal Server Error - Database or server error
 */
router.get('/', authenticateToken, validateQuery(FilterSchemas.assignments), enhancedAsyncHandler(async (req, res) => {
  const { 
    game_id, 
    gameId, 
    referee_id, 
    refereeId, 
    user_id,
    status, 
    page = 1, 
    limit = 50 
  } = req.query;
  
  // Build filters object - support both camelCase and snake_case for backward compatibility
  const filters = {};
  if (game_id || gameId) filters.game_id = game_id || gameId;
  if (referee_id || refereeId || user_id) filters.user_id = referee_id || refereeId || user_id;
  if (status) filters.status = status;
  
  // Get assignments using AssignmentService
  const result = await assignmentService.getAssignmentsWithDetails(
    filters,
    parseInt(page),
    parseInt(limit)
  );
  
  // Transform response to match expected format
  const transformedAssignments = result.data.map(assignment => ({
    id: assignment.id,
    gameId: assignment.game_id,
    refereeId: assignment.user_id,
    positionId: assignment.position_id,
    assignedAt: assignment.assigned_at,
    assignedBy: assignment.assigned_by,
    status: assignment.status,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
    calculatedWage: assignment.calculated_wage,
    game: {
      id: assignment.game_id,
      homeTeam: assignment.home_team_name,
      awayTeam: assignment.away_team_name,
      date: assignment.game_date,
      time: assignment.game_time,
      location: assignment.location,
      level: assignment.level,
      payRate: assignment.pay_rate || 0,
      wageMultiplier: assignment.wage_multiplier || 1.0,
      wageMultiplierReason: assignment.wage_multiplier_reason || '',
      finalWage: assignment.calculated_wage
    },
    referee: {
      name: assignment.referee_name,
      email: assignment.referee_email
    },
    position: {
      name: assignment.position_name
    }
  }));
  
  return ResponseFormatter.sendSuccess(res, {
    assignments: transformedAssignments,
    pagination: result.pagination
  }, 'Assignments retrieved successfully');
}));

// GET /api/assignments/:id - Get specific assignment
router.get('/:id', validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  // First check if assignment exists using base service method
  const assignment = await assignmentService.findById(req.params.id);
  
  if (!assignment) {
    throw ErrorFactory.notFound('Assignment', req.params.id);
  }
  
  // Get enriched assignment data with joins using service method
  const enrichedResult = await assignmentService.getAssignmentsWithDetails(
    { game_id: assignment.game_id },
    1,
    50
  );
  
  // Find the specific assignment in the enriched results
  const enrichedAssignment = enrichedResult.data.find(a => a.id === req.params.id);
  
  if (!enrichedAssignment) {
    // Fallback to basic assignment data if enriched data is not available
    return ResponseFormatter.sendSuccess(res, assignment, 'Assignment retrieved successfully');
  }
  
  // Transform to match expected format
  const transformedAssignment = {
    id: enrichedAssignment.id,
    gameId: enrichedAssignment.game_id,
    refereeId: enrichedAssignment.user_id,
    positionId: enrichedAssignment.position_id,
    assignedAt: enrichedAssignment.assigned_at,
    assignedBy: enrichedAssignment.assigned_by,
    status: enrichedAssignment.status,
    createdAt: enrichedAssignment.created_at,
    updatedAt: enrichedAssignment.updated_at,
    calculatedWage: enrichedAssignment.calculated_wage,
    game: {
      id: enrichedAssignment.game_id,
      homeTeam: enrichedAssignment.home_team_name,
      awayTeam: enrichedAssignment.away_team_name,
      date: enrichedAssignment.game_date,
      time: enrichedAssignment.game_time,
      location: enrichedAssignment.location,
      level: enrichedAssignment.level,
      payRate: enrichedAssignment.pay_rate || 0,
      wageMultiplier: enrichedAssignment.wage_multiplier || 1.0,
      wageMultiplierReason: enrichedAssignment.wage_multiplier_reason || ''
    },
    referee: {
      name: enrichedAssignment.referee_name,
      email: enrichedAssignment.referee_email,
      level: enrichedAssignment.referee_level
    },
    position: {
      name: enrichedAssignment.position_name
    }
  };
  
  return ResponseFormatter.sendSuccess(res, transformedAssignment, 'Assignment retrieved successfully');
}));

// POST /api/assignments - Create new assignment
router.post('/', validateBody(AssignmentSchemas.create), enhancedAsyncHandler(async (req, res) => {
  const assignmentData = {
    ...req.body,
    assigned_by: req.body.assigned_by || req.user?.id // Add assigned_by from authenticated user if not provided
  };
  
  // Use AssignmentService to create assignment with all validations and conflict checking
  const result = await assignmentService.createAssignment(assignmentData);
  
  // Create audit log
  if (req.user) {
    await createAuditLog(
      req.user.id,
      AUDIT_EVENTS.ASSIGNMENT_CREATED,
      'game_assignments',
      result.assignment.id,
      { gameId: result.assignment.game_id }
    );
  }
  
  // Prepare response data
  const responseData = {
    assignment: result.assignment,
    wageBreakdown: result.wageBreakdown
  };
  
  const meta = {};
  
  // Include warnings from conflict analysis
  if (result.warnings && result.warnings.length > 0) {
    meta.warnings = result.warnings;
  }
  
  const response = ResponseFormatter.created(
    responseData,
    'Assignment created successfully',
    `/api/assignments/${result.assignment.id}`
  );
  
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }
  
  return ResponseFormatter.send(res, 201, response);
}));

// POST /api/assignments/bulk-update - Bulk update assignment statuses
router.post('/bulk-update', 
  authenticateToken, 
  requireRole('admin'), 
  validateBody(Joi.object({
    updates: Joi.array().items(Joi.object({
      assignment_id: Joi.string().uuid().required(),
      status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').required(),
      calculated_wage: Joi.number().min(0).optional()
    })).min(1).max(100).required()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { updates } = req.body;

    // Use AssignmentService for bulk updates
    const results = await assignmentService.bulkUpdateAssignments(updates);

    const responseData = {
      updatedAssignments: results.updatedAssignments,
      summary: results.summary
    };

    const message = `Updated ${results.summary.successfulUpdates} assignments successfully`;
    const meta = {};

    if (results.updateErrors && results.updateErrors.length > 0) {
      meta.warnings = results.updateErrors;
      meta.partialSuccess = true;
    }

    return ResponseFormatter.sendSuccess(res, responseData, message, meta);
  })
);

// DELETE /api/assignments/bulk-remove - Bulk remove assignments
router.delete('/bulk-remove', 
  authenticateToken, 
  requireRole('admin'), 
  validateBody(Joi.object({
    assignment_ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { assignment_ids } = req.body;

    // Use AssignmentService for bulk removal
    const results = await assignmentService.bulkRemoveAssignments(assignment_ids);

    const responseData = {
      deletedCount: results.deletedCount,
      affectedGames: results.affectedGames,
      summary: results.summary
    };

    const message = `Removed ${results.deletedCount} assignments successfully`;
    const meta = {};

    if (results.warnings && results.warnings.length > 0) {
      meta.warnings = results.warnings;
    }

    return ResponseFormatter.sendSuccess(res, responseData, message, meta);
  })
);

// PATCH /api/assignments/:id/status - Update assignment status
router.patch('/:id/status', 
  validateParams(IdParamSchema),
  validateBody(Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').required()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { status } = req.body;

    // Use AssignmentService for single status update
    const results = await assignmentService.bulkUpdateAssignments([{
      assignment_id: req.params.id,
      status
    }]);

    if (results.summary.failedUpdates > 0) {
      const error = results.updateErrors[0];
      if (error.error === 'Assignment not found') {
        throw ErrorFactory.notFound('Assignment', req.params.id);
      }
      throw new Error(error.error);
    }

    return ResponseFormatter.sendSuccess(res, 
      { assignment: results.updatedAssignments[0] },
      'Assignment status updated successfully'
    );
  })
);

// DELETE /api/assignments/:id - Remove assignment
router.delete('/:id', validateParams(IdParamSchema), enhancedAsyncHandler(async (req, res) => {
  // Use AssignmentService for single assignment removal
  const results = await assignmentService.bulkRemoveAssignments([req.params.id]);

  if (results.summary.successfullyDeleted === 0) {
    throw ErrorFactory.notFound('Assignment', req.params.id);
  }

  res.status(204).send();
}));

// POST /api/assignments/bulk - Bulk assign referees to a game
router.post('/bulk', 
  authenticateToken,
  validateBody(Joi.object({
    game_id: Joi.string().uuid().required(),
    assignments: Joi.array().items(Joi.object({
      user_id: Joi.string().uuid().required(),
      position_id: Joi.string().uuid().required()
    })).min(1).max(20).required(),
    assigned_by: Joi.string().uuid().optional()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { game_id, assignments, assigned_by } = req.body;
    
    // Create assignments using service with transaction handling
    const createdAssignments = [];
    const errors = [];
    
    for (let i = 0; i < assignments.length; i++) {
      try {
        const assignmentData = {
          ...assignments[i],
          game_id,
          assigned_by: assigned_by || req.user?.id
        };
        
        const result = await assignmentService.createAssignment(assignmentData);
        createdAssignments.push(result.assignment);
        
        // Create audit log
        if (req.user) {
          await createAuditLog(
            req.user.id,
            AUDIT_EVENTS.ASSIGNMENT_CREATED,
            'game_assignments',
            result.assignment.id,
            { gameId: game_id, bulk: true }
          );
        }
        
      } catch (error) {
        console.error(`Error creating assignment ${i}:`, error);
        errors.push({
          index: i,
          assignment: assignments[i],
          error: error.message
        });
      }
    }
    
    // Prepare response
    const responseData = {
      assignments: createdAssignments,
      summary: {
        total: assignments.length,
        successful: createdAssignments.length,
        failed: errors.length
      }
    };
    
    if (errors.length > 0) {
      responseData.errors = errors;
    }
    
    const statusCode = createdAssignments.length > 0 ? 201 : 400;
    const message = errors.length === 0 
      ? 'All assignments created successfully'
      : `${createdAssignments.length} of ${assignments.length} assignments created successfully`;
    
    return ResponseFormatter.send(
      res,
      statusCode,
      ResponseFormatter.created(responseData, message)
    );
  })
);

// POST /api/assignments/check-conflicts - Check for conflicts before assignment
router.post('/check-conflicts', 
  authenticateToken, 
  validateBody(AssignmentSchemas.create),
  enhancedAsyncHandler(async (req, res) => {
    const conflictAnalysis = await checkAssignmentConflicts(req.body);
    
    return ResponseFormatter.sendSuccess(res, {
      hasConflicts: conflictAnalysis.hasConflicts,
      conflicts: conflictAnalysis.conflicts || [],
      warnings: conflictAnalysis.warnings || [],
      errors: conflictAnalysis.errors || [],
      isQualified: conflictAnalysis.isQualified !== false,
      canAssign: !conflictAnalysis.hasConflicts
    }, 'Conflict analysis completed');
  })
);

// GET /api/assignments/available-referees/:game_id - Get available referees for a specific game
router.get('/available-referees/:game_id', 
  authenticateToken,
  validateParams(IdParamSchema.keys({ game_id: Joi.string().uuid().required() })),
  enhancedAsyncHandler(async (req, res) => {
    // Use AssignmentService to get available referees with comprehensive analysis
    const result = await assignmentService.getAvailableRefereesForGame(req.params.game_id);
    
    return ResponseFormatter.sendSuccess(
      res,
      {
        referees: result.referees,
        game: result.game,
        summary: result.summary
      },
      'Available referees retrieved successfully'
    );
  })
);

module.exports = router;