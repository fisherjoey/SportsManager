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

// GET /api/assignments - Get all assignments with optional filters
router.get('/', authenticateToken, validateQuery(FilterSchemas.assignments), enhancedAsyncHandler(async (req, res) => {
  const { game_id, referee_id, status, page = 1, limit = 50 } = req.query;
  
  // Build filters object
  const filters = {};
  if (game_id) filters.game_id = game_id;
  if (referee_id) filters.user_id = referee_id;
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
  validateBody(Joi.object({
    game_id: Joi.string().uuid().required(),
    assignments: Joi.array().items(Joi.object({
      user_id: Joi.string().uuid().required(),
      position_id: Joi.string().uuid().required()
    })).min(1).required(),
    assigned_by: Joi.string().uuid().optional()
  })),
  enhancedAsyncHandler(async (req, res) => {
    const { game_id, assignments, assigned_by } = req.body;

    const game = await db('games').where('id', game_id).first();
    if (!game) {
      throw ErrorFactory.notFound('Game', game_id);
    }

    const trx = await db.transaction();
    
    try {
      const createdAssignments = [];
      
      for (const assignment of assignments) {
        const { user_id, position_id } = assignment;
        
        // Validate each assignment
        const referee = await trx('users').where('id', user_id).where('role', 'referee').first();
        if (!referee || !referee.is_available) {
          throw ErrorFactory.businessLogic(`Referee ${user_id} not found or not available`, 'REFEREE_UNAVAILABLE');
        }
        
        const position = await trx('positions').where('id', position_id).first();
        if (!position) {
          throw ErrorFactory.notFound('Position', position_id);
        }
        
        // Check conflicts
        const existingAssignment = await trx('game_assignments')
          .where('game_id', game_id)
          .where(function() {
            this.where('user_id', user_id).orWhere('position_id', position_id);
          })
          .first();
        
        if (existingAssignment) {
          throw ErrorFactory.conflict('Referee or position already assigned');
        }

        // Check if referee has time conflict with other games
        const timeConflictAssignment = await trx('game_assignments')
          .join('games', 'game_assignments.game_id', 'games.id')
          .where('game_assignments.user_id', user_id)
          .where('games.game_date', game.game_date)
          .where('games.game_time', game.game_time)
          .where('games.id', '!=', game_id)
          .first();
        
        if (timeConflictAssignment) {
          throw ErrorFactory.conflict(`Referee ${user_id} has a time conflict with another game`);
        }
        
        const [newAssignment] = await trx('game_assignments')
          .insert({
            game_id,
            user_id,
            position_id,
            assigned_by
          })
          .returning('*');
        
        createdAssignments.push(newAssignment);
      }
      
      // Update game status using AssignmentService
      await assignmentService.updateGameStatus(game_id, { transaction: trx });
      
      await trx.commit();
      
      return ResponseFormatter.sendCreated(res, 
        { assignments: createdAssignments },
        'Bulk assignments created successfully'
      );
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  })
);

// POST /api/assignments/check-conflicts - Check for conflicts before assignment
router.post('/check-conflicts', 
  authenticateToken, 
  validateBody(assignmentSchema),
  enhancedAsyncHandler(async (req, res) => {
    const conflictAnalysis = await checkAssignmentConflicts(req.body);
    
    return ResponseFormatter.sendSuccess(res, {
      hasConflicts: conflictAnalysis.hasConflicts,
      conflicts: conflictAnalysis.conflicts || [],
      warnings: conflictAnalysis.warnings || [],
      errors: conflictAnalysis.errors || [],
      isQualified: conflictAnalysis.isQualified || true,
      canAssign: !conflictAnalysis.hasConflicts
    }, 'Conflict analysis completed');
  })
);

// GET /api/assignments/available-referees/:game_id - Get available referees for a specific game
router.get('/available-referees/:game_id', 
  validateParams(IdParamSchema.keys({ game_id: Joi.string().uuid().required() })),
  enhancedAsyncHandler(async (req, res) => {
    const game = await db('games').where('id', req.params.game_id).first();
    if (!game) {
      throw ErrorFactory.notFound('Game', req.params.game_id);
    }

    const gameDate = new Date(game.game_date).toISOString().split('T')[0];
    const gameTime = game.game_time;

    // Calculate game end time (assuming 2-hour duration if not specified)
    const gameStartTime = game.game_time;
    const gameEndTime = game.end_time || (() => {
      const [hours, minutes] = gameStartTime.split(':').map(Number);
      const endHours = (hours + 2) % 24;
      return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    })();

    // Get all potentially available referees who:
    // 1. Are generally available (is_available = true)
    // 2. Are not already assigned to another game at the same time
    // 3. Have role = 'referee'
    const potentialReferees = await db('users')
      .where('role', 'referee')
      .where('is_available', true)
      .whereNotExists(function() {
        this.select('*')
          .from('game_assignments')
          .join('games', 'game_assignments.game_id', 'games.id')
          .whereRaw('game_assignments.user_id = users.id')
          .where('games.game_date', game.game_date)
          .where('games.game_time', game.game_time)
          .where('games.id', '!=', req.params.game_id);
      })
      .select('*');

    // Get availability windows for all potential referees
    const refereeIds = potentialReferees.map(ref => ref.id);
    const availabilityWindows = [];

    // Group availability by referee
    const availabilityByReferee = {};
    availabilityWindows.forEach(window => {
      if (!availabilityByReferee[window.referee_id]) {
        availabilityByReferee[window.referee_id] = [];
      }
      availabilityByReferee[window.referee_id].push(window);
    });

    // Add availability data to referees and calculate availability scores
    const refereesWithAvailability = potentialReferees.map(referee => ({
      ...referee,
      availability: availabilityByReferee[referee.id] || []
    }));

    // Use the availability utility to find and score available referees
    const gameTimeWindow = { start: gameStartTime, end: gameEndTime };
    const availableReferees = findAvailableReferees(refereesWithAvailability, gameTimeWindow);

    // Transform the response to include availability status
    const enhancedReferees = availableReferees.map(referee => {
      const windows = availabilityByReferee[referee.id] || [];
      
      // Check availability status
      let availabilityStatus = 'unknown';
      let availabilityNote = 'No availability windows set';
      
      if (windows.length > 0) {
        const hasConflict = hasSchedulingConflict(windows, gameTimeWindow);
        if (hasConflict) {
          availabilityStatus = 'conflict';
          const conflictWindow = windows.find(w => 
            !w.is_available && checkTimeOverlap(w, { start_time: gameStartTime, end_time: gameEndTime })
          );
          availabilityNote = conflictWindow ? 
            `Unavailable: ${conflictWindow.start_time}-${conflictWindow.end_time}${conflictWindow.reason ? ` (${conflictWindow.reason})` : ''}` :
            'Has scheduling conflict';
        } else {
          const hasPositiveAvailability = windows.some(w => 
            w.is_available && 
            gameStartTime >= w.start_time && 
            gameEndTime <= w.end_time
          );
          
          if (hasPositiveAvailability) {
            availabilityStatus = 'available';
            availabilityNote = 'Specifically available for this time';
          } else {
            availabilityStatus = 'not_specified';
            availabilityNote = 'No specific availability set for this time';
          }
        }
      }

      return {
        ...referee,
        availabilityScore: referee.availabilityScore || 0,
        availabilityStatus,
        availabilityNote,
        availabilityWindows: windows
      };
    });

    return ResponseFormatter.sendSuccess(res, {
      referees: enhancedReferees,
      gameTime: {
        date: game.game_date,
        startTime: gameStartTime,
        endTime: gameEndTime
      },
      summary: {
        total: enhancedReferees.length,
        available: enhancedReferees.filter(r => r.availabilityStatus === 'available').length,
        notSpecified: enhancedReferees.filter(r => r.availabilityStatus === 'not_specified').length,
        unknown: enhancedReferees.filter(r => r.availabilityStatus === 'unknown').length
      }
    }, 'Available referees retrieved successfully');
  })
);

module.exports = router;