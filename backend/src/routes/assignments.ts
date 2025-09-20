/**
 * @fileoverview Assignment management routes for the Sports Management API (TypeScript)
 * 
 * This module handles all assignment-related HTTP endpoints including:
 * - Creating, updating, and deleting referee assignments
 * - Bulk assignment operations
 * - Assignment conflict detection and resolution
 * - Wage calculation and breakdown reporting
 * - Assignment status management and workflow
 * 
 * @module routes/assignments
 */

import express, { Request, Response } from 'express';
import { 
  AssignmentEntity, 
  AssignmentWithDetailsView,
  AssignmentStatus,
  UUID,
  PaginatedResult 
} from '../types';
import { AuthenticatedRequest } from '../types/auth.types';

const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
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
import { ErrorFactory, NotFoundError, ConflictError, ValidationError } from '../utils/errors';
const { AssignmentSchemas, IdParamSchema, FilterSchemas } = require('../utils/validation-schemas');
const { ProductionMonitor } = require('../utils/monitor');

// Initialize AssignmentService
const assignmentService = new AssignmentService(db);

// Assignment-specific type definitions
export interface GetAssignmentsQuery {
  page?: number;
  limit?: number;
  game_id?: string;
  gameId?: string;  // Alternative camelCase for backward compatibility
  referee_id?: string;
  refereeId?: string;  // Alternative camelCase for backward compatibility
  user_id?: string;
  status?: AssignmentStatus;
  date_from?: string;
  date_to?: string;
}

export interface CreateAssignmentBody {
  game_id: UUID;
  user_id: UUID;
  position_id: UUID;
  assigned_by?: UUID;
  status?: AssignmentStatus;
  calculated_wage?: number;
}

export interface UpdateAssignmentBody {
  status?: AssignmentStatus;
  position_id?: UUID;
  calculated_wage?: number;
  decline_reason?: string;
  rating?: number;
  feedback?: string;
}

export interface BulkAssignmentBody {
  game_id: UUID;
  assignments: Array<{
    user_id: UUID;
    position_id: UUID;
  }>;
  assigned_by?: UUID;
}

export interface BulkUpdateBody {
  updates: Array<{
    assignment_id: UUID;
    status: AssignmentStatus;
    calculated_wage?: number;
  }>;
}

export interface BulkRemoveBody {
  assignment_ids: UUID[];
}

export interface AssignmentStatusUpdateBody {
  status: AssignmentStatus;
}

// Transformed assignment response interface
interface TransformedAssignmentResponse {
  id: UUID;
  gameId: UUID;
  refereeId: UUID;
  positionId: UUID;
  assignedAt: string;
  assignedBy?: UUID;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  calculatedWage?: number;
  game: {
    id: UUID;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
    location: string;
    level: string;
    payRate: number;
    wageMultiplier: number;
    wageMultiplierReason: string;
    finalWage?: number;
  };
  referee: {
    name: string;
    email: string;
    level?: string;
  };
  position: {
    name: string;
  };
}

// Assignment list response interface
interface AssignmentListResponse {
  assignments: TransformedAssignmentResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Get all assignments with optional filtering, pagination, and detailed referee/game information
 */
const getAssignments = async (
  req: AuthenticatedRequest<{}, {}, {}, GetAssignmentsQuery>, 
  res: Response
): Promise<Response> => {
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
  const filters: any = {};
  if (game_id || gameId) {
    filters.game_id = game_id || gameId;
  }
  if (referee_id || refereeId || user_id) {
    filters.user_id = referee_id || refereeId || user_id;
  }
  if (status) {
    filters.status = status;
  }
  
  // Get assignments using AssignmentService
  const result = await assignmentService.getAssignmentsWithDetails(
    filters,
    Number(page),
    Number(limit)
  );
  
  // Transform response to match expected format
  const transformedAssignments: TransformedAssignmentResponse[] = result.data.map((assignment: any) => ({
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
};

/**
 * Get specific assignment by ID
 */
const getAssignmentById = async (
  req: AuthenticatedRequest<{id: string}>, 
  res: Response
): Promise<Response> => {
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
  const enrichedAssignment = enrichedResult.data.find((a: any) => a.id === req.params.id);
  
  if (!enrichedAssignment) {
    // Fallback to basic assignment data if enriched data is not available
    return ResponseFormatter.sendSuccess(res, assignment, 'Assignment retrieved successfully');
  }
  
  // Transform to match expected format
  const transformedAssignment: TransformedAssignmentResponse = {
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
};

/**
 * Create new assignment with comprehensive validation and conflict checking
 */
const createAssignment = async (
  req: AuthenticatedRequest<{}, {}, CreateAssignmentBody>, 
  res: Response
): Promise<Response> => {
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
  
  const meta: any = {};
  
  // Include warnings from conflict analysis
  if (result.warnings && result.warnings.length > 0) {
    meta.warnings = result.warnings;
  }
  
  // Track critical path
  ProductionMonitor.logCriticalPath('assignment.created', {
    assignmentId: result.assignment.id,
    gameId: result.assignment.game_id,
    refereeId: result.assignment.user_id,
    wage: result.assignment.wage,
    userId: req.user.id
  });
  
  const response = ResponseFormatter.created(
    responseData,
    'Assignment created successfully',
    `/api/assignments/${result.assignment.id}`
  );
  
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }
  
  return ResponseFormatter.send(res, 201, response);
};

/**
 * Bulk update assignment statuses
 */
const bulkUpdateAssignments = async (
  req: AuthenticatedRequest<{}, {}, BulkUpdateBody>, 
  res: Response
): Promise<Response> => {
  const { updates } = req.body;

  // Use AssignmentService for bulk updates
  const results = await assignmentService.bulkUpdateAssignments(updates);

  const responseData = {
    updatedAssignments: results.updatedAssignments,
    summary: results.summary
  };

  const message = `Updated ${results.summary.successfulUpdates} assignments successfully`;
  const meta: any = {};

  if (results.updateErrors && results.updateErrors.length > 0) {
    meta.warnings = results.updateErrors;
    meta.partialSuccess = true;
  }

  return ResponseFormatter.sendSuccess(res, responseData, message, meta);
};

/**
 * Bulk remove assignments
 */
const bulkRemoveAssignments = async (
  req: AuthenticatedRequest<{}, {}, BulkRemoveBody>, 
  res: Response
): Promise<Response> => {
  const { assignment_ids } = req.body;

  // Use AssignmentService for bulk removal
  const results = await assignmentService.bulkRemoveAssignments(assignment_ids);

  const responseData = {
    deletedCount: results.deletedCount,
    affectedGames: results.affectedGames,
    summary: results.summary
  };

  const message = `Removed ${results.deletedCount} assignments successfully`;
  const meta: any = {};

  if (results.warnings && results.warnings.length > 0) {
    meta.warnings = results.warnings;
  }

  return ResponseFormatter.sendSuccess(res, responseData, message, meta);
};

/**
 * Update assignment status
 */
const updateAssignmentStatus = async (
  req: AuthenticatedRequest<{id: string}, {}, AssignmentStatusUpdateBody>, 
  res: Response
): Promise<Response> => {
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
  
  // Track critical status changes
  if (status === 'accepted') {
    ProductionMonitor.logCriticalPath('assignment.accepted', {
      assignmentId: req.params.id,
      userId: req.user.id
    });
  } else if (status === 'declined') {
    ProductionMonitor.logCriticalPath('assignment.declined', {
      assignmentId: req.params.id,
      userId: req.user.id
    });
  }

  return ResponseFormatter.sendSuccess(res, 
    { assignment: results.updatedAssignments[0] },
    'Assignment status updated successfully'
  );
};

/**
 * Remove assignment by ID
 */
const deleteAssignment = async (
  req: AuthenticatedRequest<{id: string}>, 
  res: Response
): Promise<Response> => {
  // Use AssignmentService for single assignment removal
  const results = await assignmentService.bulkRemoveAssignments([req.params.id]);

  if (results.summary.successfullyDeleted === 0) {
    throw ErrorFactory.notFound('Assignment', req.params.id);
  }

  return res.status(204).send();
};

/**
 * Bulk assign referees to a game
 */
const bulkAssignReferees = async (
  req: AuthenticatedRequest<{}, {}, BulkAssignmentBody>, 
  res: Response
): Promise<Response> => {
  const { game_id, assignments, assigned_by } = req.body;
  
  // Create assignments using service with transaction handling
  const createdAssignments = [];
  const errors: any[] = [];
  
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
      
    } catch (error: any) {
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
    (responseData as any).errors = errors;
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
};

/**
 * Check for assignment conflicts before creating assignment
 */
const checkConflicts = async (
  req: AuthenticatedRequest<{}, {}, CreateAssignmentBody>, 
  res: Response
): Promise<Response> => {
  const conflictAnalysis = await checkAssignmentConflicts(req.body);
  
  return ResponseFormatter.sendSuccess(res, {
    hasConflicts: conflictAnalysis.hasConflicts,
    conflicts: conflictAnalysis.conflicts || [],
    warnings: conflictAnalysis.warnings || [],
    errors: conflictAnalysis.errors || [],
    isQualified: conflictAnalysis.isQualified !== false,
    canAssign: !conflictAnalysis.hasConflicts
  }, 'Conflict analysis completed');
};

/**
 * Get available referees for a specific game
 */
const getAvailableReferees = async (
  req: AuthenticatedRequest<{game_id: string}>, 
  res: Response
): Promise<Response> => {
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
};

// Route definitions with proper typing
router.get('/', authenticateToken, validateQuery(FilterSchemas.assignments), enhancedAsyncHandler(getAssignments));

router.get('/:id', authenticateToken, requirePermission('assignments:read'), validateParams(IdParamSchema), enhancedAsyncHandler(getAssignmentById));

router.post('/', authenticateToken, requirePermission('assignments:create'), validateBody(AssignmentSchemas.create), enhancedAsyncHandler(createAssignment));

router.post('/bulk-update', 
  authenticateToken, 
  requireAnyPermission(['assignments:update', 'assignments:manage']), 
  validateBody(Joi.object({
    updates: Joi.array().items(Joi.object({
      assignment_id: Joi.string().uuid().required(),
      status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').required(),
      calculated_wage: Joi.number().min(0).optional()
    })).min(1).max(100).required()
  })),
  enhancedAsyncHandler(bulkUpdateAssignments)
);

router.delete('/bulk-remove', 
  authenticateToken, 
  requireAnyPermission(['assignments:delete', 'assignments:manage']), 
  validateBody(Joi.object({
    assignment_ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required()
  })),
  enhancedAsyncHandler(bulkRemoveAssignments)
);

router.patch('/:id/status', 
  authenticateToken,
  requirePermission('assignments:update'),
  validateParams(IdParamSchema),
  validateBody(Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').required()
  })),
  enhancedAsyncHandler(updateAssignmentStatus)
);

router.delete('/:id', authenticateToken, requirePermission('assignments:delete'), validateParams(IdParamSchema), enhancedAsyncHandler(deleteAssignment));

router.post('/bulk', 
  authenticateToken,
  requirePermission('assignments:create'),
  validateBody(Joi.object({
    game_id: Joi.string().uuid().required(),
    assignments: Joi.array().items(Joi.object({
      user_id: Joi.string().uuid().required(),
      position_id: Joi.string().uuid().required()
    })).min(1).max(20).required(),
    assigned_by: Joi.string().uuid().optional()
  })),
  enhancedAsyncHandler(bulkAssignReferees)
);

router.post('/check-conflicts', 
  authenticateToken, 
  requirePermission('assignments:read'),
  validateBody(AssignmentSchemas.create),
  enhancedAsyncHandler(checkConflicts)
);

router.get('/available-referees/:game_id', 
  authenticateToken,
  requirePermission('assignments:read'),
  validateParams(IdParamSchema.keys({ game_id: Joi.string().uuid().required() })),
  enhancedAsyncHandler(getAvailableReferees)
);

export default router;