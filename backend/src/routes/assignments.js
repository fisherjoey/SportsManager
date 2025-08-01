const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { calculateFinalWage, getWageBreakdown } = require('../utils/wage-calculator');
const { checkTimeOverlap, hasSchedulingConflict, findAvailableReferees } = require('../utils/availability');
const { checkAssignmentConflicts } = require('../services/conflictDetectionService');
const { getOrganizationSettings } = require('../utils/organization-settings');
const { validateQuery, validateIdParam } = require('../middleware/sanitization');
const { asyncHandler } = require('../middleware/errorHandling');
const { assignmentLimiter } = require('../middleware/rateLimiting');
const { createAuditLog, AUDIT_EVENTS } = require('../middleware/auditTrail');
const AssignmentService = require('../services/AssignmentService');

// Initialize AssignmentService
const assignmentService = new AssignmentService(db);

const assignmentSchema = Joi.object({
  game_id: Joi.string().required(),
  user_id: Joi.string().required(),
  position_id: Joi.string().required(),
  assigned_by: Joi.string()
});

// GET /api/assignments - Get all assignments with optional filters - OPTIMIZED VERSION
router.get('/', authenticateToken, validateQuery('assignmentFilter'), asyncHandler(async (req, res) => {
  try {
    const { game_id, referee_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // PERFORMANCE OPTIMIZATION: Build more efficient query with better join order
    // Start with most selective filters first
    let baseQuery = db('game_assignments');
    
    // Apply filters early for better index usage
    if (game_id) {
      baseQuery = baseQuery.where('game_assignments.game_id', game_id);
    }
    if (referee_id) {
      baseQuery = baseQuery.where('game_assignments.user_id', referee_id);
    }
    if (status) {
      baseQuery = baseQuery.where('game_assignments.status', status);
    }

    // OPTIMIZATION: Execute org settings and assignments query in parallel
    const [orgSettingsPromise, assignmentsPromise] = await Promise.all([
      getOrganizationSettings(),
      baseQuery.clone()
        .join('games', 'game_assignments.game_id', 'games.id')
        .join('users', 'game_assignments.user_id', 'users.id')
        .join('positions', 'game_assignments.position_id', 'positions.id')
        .join('teams as home_team', 'games.home_team_id', 'home_team.id')
        .join('teams as away_team', 'games.away_team_id', 'away_team.id')
        .select(
          // OPTIMIZATION: Select only necessary fields
          'game_assignments.id',
          'game_assignments.game_id',
          'game_assignments.user_id as referee_id',
          'game_assignments.position_id',
          'game_assignments.assigned_at',
          'game_assignments.assigned_by',
          'game_assignments.status',
          'game_assignments.created_at',
          'game_assignments.updated_at',
          'game_assignments.calculated_wage',
          'home_team.name as home_team_name',
          'away_team.name as away_team_name',
          'games.game_date',
          'games.game_time',
          'games.location',
          'games.pay_rate',
          'games.level',
          'games.wage_multiplier',
          'games.wage_multiplier_reason',
          'users.name as referee_name',
          'positions.name as position_name'
        )
        .orderBy('games.game_date', 'asc')
        .limit(limit)
        .offset(offset)
    ]);

    const [orgSettings, assignments] = await Promise.allSettled([orgSettingsPromise, assignmentsPromise]);
    
    // Handle potential failures gracefully
    const resolvedOrgSettings = orgSettings.status === 'fulfilled' ? orgSettings.value : { payment_model: 'INDIVIDUAL' };
    const resolvedAssignments = assignments.status === 'fulfilled' ? assignments.value : [];
    
    // OPTIMIZATION: Only fetch referee counts if needed and assignments exist
    let gameRefereeCounts = {};
    if (resolvedOrgSettings.payment_model === 'FLAT_RATE' && resolvedAssignments.length > 0) {
      const gameIds = [...new Set(resolvedAssignments.map(a => a.game_id))];
      const refereeCounts = await db('game_assignments')
        .whereIn('game_id', gameIds)
        .whereIn('status', ['pending', 'accepted'])
        .groupBy('game_id')
        .select('game_id')
        .count('* as count');
      
      // OPTIMIZATION: Use forEach instead of reduce for better performance
      refereeCounts.forEach(rc => {
        gameRefereeCounts[rc.game_id] = parseInt(rc.count);
      });
    }
    
    // Transform assignments to include game object and wage calculations
    const transformedAssignments = assignments.map(assignment => {
      const baseWage = assignment.calculated_wage || assignment.pay_rate || 0;
      const multiplier = assignment.wage_multiplier || 1.0;
      const assignedRefereesCount = gameRefereeCounts[assignment.game_id] || 1;
      
      const finalWage = assignment.calculated_wage || calculateFinalWage(
        baseWage, 
        multiplier, 
        orgSettings.payment_model, 
        orgSettings.default_game_rate, 
        assignedRefereesCount
      );
      
      return {
        id: assignment.id,
        gameId: assignment.game_id,
        refereeId: assignment.referee_id,
        positionId: assignment.position_id,
        assignedAt: assignment.assigned_at,
        assignedBy: assignment.assigned_by,
        status: assignment.status,
        createdAt: assignment.created_at,
        updatedAt: assignment.updated_at,
        calculatedWage: finalWage,
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
          finalWage: finalWage
        }
      };
    });
    
    res.json({
      success: true,
      data: {
        assignments: transformedAssignments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}));

// GET /api/assignments/:id - Get specific assignment
router.get('/:id', async (req, res) => {
  try {
    const assignment = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .join('teams as home_team', 'games.home_team_id', 'home_team.id')
      .join('teams as away_team', 'games.away_team_id', 'away_team.id')
      .select(
        'game_assignments.*',
        'games.*',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        'users.name as referee_name',
        'users.email as referee_email',
        'positions.name as position_name'
      )
      .where('game_assignments.id', req.params.id)
      .first();
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /api/assignments - Create new assignment
router.post('/', async (req, res) => {
  try {
    const { error, value } = assignmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if game exists
    const game = await db('games').where('id', value.game_id).first();
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if referee exists and get level info
    const referee = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .select(
        'users.*',
        'referee_levels.name as level_name',
        'referee_levels.allowed_divisions'
      )
      .where('users.id', value.user_id)
      .where('users.role', 'referee')
      .first();
    
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    // Check if position exists
    const position = await db('positions').where('id', value.position_id).first();
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Check if position is already filled for this game
    const existingPositionAssignment = await db('game_assignments')
      .where('game_id', value.game_id)
      .where('position_id', value.position_id)
      .first();
    
    if (existingPositionAssignment) {
      return res.status(409).json({ error: 'Position already filled for this game' });
    }

    // Check if referee is already assigned to this game
    const existingRefereeAssignment = await db('game_assignments')
      .where('game_id', value.game_id)
      .where('user_id', value.user_id)
      .first();
    
    if (existingRefereeAssignment) {
      return res.status(409).json({ error: 'Referee already assigned to this game' });
    }

    // Check if game has reached maximum number of referees
    const currentAssignments = await db('game_assignments')
      .where('game_id', value.game_id)
      .whereIn('status', ['pending', 'accepted'])
      .count('* as count')
      .first();
    
    if (parseInt(currentAssignments.count) >= game.refs_needed) {
      return res.status(409).json({ error: 'Game has reached maximum number of referees' });
    }

    // Run comprehensive conflict detection
    const conflictAnalysis = await checkAssignmentConflicts(value);
    
    // Handle conflicts - block assignment if there are serious conflicts
    if (conflictAnalysis.hasConflicts) {
      return res.status(409).json({ 
        error: 'Assignment conflicts detected',
        details: conflictAnalysis.errors,
        conflicts: conflictAnalysis.conflicts
      });
    }

    // Get organization settings and existing assignments count for wage calculation
    const orgSettings = await getOrganizationSettings();
    
    // Get current referee count for this game (including this new assignment)
    const existingAssignments = await db('game_assignments')
      .where('game_id', value.game_id)
      .whereIn('status', ['pending', 'accepted'])
      .count('* as count')
      .first();
    
    const assignedRefereesCount = parseInt(existingAssignments.count) + 1; // +1 for this new assignment
    
    // Calculate final wage using organization payment model
    const finalWage = calculateFinalWage(
      referee.wage_per_game, 
      game.wage_multiplier, 
      orgSettings.payment_model, 
      orgSettings.default_game_rate, 
      assignedRefereesCount
    );
    
    const wageBreakdown = getWageBreakdown(
      referee.wage_per_game, 
      game.wage_multiplier, 
      game.wage_multiplier_reason, 
      orgSettings.payment_model, 
      orgSettings.default_game_rate, 
      assignedRefereesCount
    );
    
    // Create assignment with pending status and calculated wage
    const assignmentData = {
      ...value,
      status: 'pending',
      assigned_at: new Date(),
      calculated_wage: finalWage
    };
    
    const [assignment] = await db('game_assignments').insert(assignmentData).returning('*');

    // Update game status using AssignmentService
    await assignmentService.updateGameStatus(value.game_id);

    const response = {
      success: true,
      data: { 
        assignment,
        wageBreakdown 
      }
    };
    
    // Include warnings from conflict analysis
    if (conflictAnalysis.warnings && conflictAnalysis.warnings.length > 0) {
      response.warnings = conflictAnalysis.warnings;
      response.warning = conflictAnalysis.warnings.join('; '); // For backward compatibility
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// POST /api/assignments/bulk-update - Bulk update assignment statuses
router.post('/bulk-update', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { updates } = req.body;
  
  // Basic validation
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Updates array is required and cannot be empty' });
  }

  if (updates.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 assignments can be updated at once' });
  }

  // Validation schema for bulk updates
  const bulkUpdateSchema = Joi.object({
    assignment_id: Joi.string().uuid().required(),
    status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').required(),
    calculated_wage: Joi.number().min(0).optional()
  });

  // Validate each update
  const validationErrors = [];
  const validatedUpdates = [];

  for (let i = 0; i < updates.length; i++) {
    const { error, value } = bulkUpdateSchema.validate(updates[i]);
    if (error) {
      validationErrors.push({
        index: i,
        update: updates[i],
        error: error.details[0].message
      });
    } else {
      validatedUpdates.push({ ...value, index: i });
    }
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed for some updates',
      validationErrors,
      totalErrors: validationErrors.length,
      totalUpdates: updates.length
    });
  }

  // Use AssignmentService for bulk updates
  const results = await assignmentService.bulkUpdateAssignments(validatedUpdates);

  const response = {
    success: true,
    data: {
      updatedAssignments: results.updatedAssignments,
      summary: results.summary
    }
  };

  if (results.updateErrors && results.updateErrors.length > 0) {
    response.warnings = results.updateErrors;
    response.partialSuccess = true;
  }

  res.json(response);
}));

// DELETE /api/assignments/bulk-remove - Bulk remove assignments
router.delete('/bulk-remove', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { assignment_ids } = req.body;
  
  // Basic validation
  if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
    return res.status(400).json({ error: 'Assignment IDs array is required and cannot be empty' });
  }

  if (assignment_ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 assignments can be removed at once' });
  }

  // Validate all assignment IDs are UUIDs
  const uuidSchema = Joi.string().uuid();
  const invalidIds = [];
  const validIds = [];

  for (let i = 0; i < assignment_ids.length; i++) {
    const { error, value } = uuidSchema.validate(assignment_ids[i]);
    if (error) {
      invalidIds.push({
        index: i,
        id: assignment_ids[i],
        error: error.details[0].message
      });
    } else {
      validIds.push(value);
    }
  }

  if (invalidIds.length > 0) {
    return res.status(400).json({ 
      error: 'Invalid assignment IDs provided',
      invalidIds,
      totalInvalid: invalidIds.length,
      totalProvided: assignment_ids.length
    });
  }

  // Use AssignmentService for bulk removal
  const results = await assignmentService.bulkRemoveAssignments(validIds);

  const response = {
    success: true,
    data: {
      deletedCount: results.deletedCount,
      affectedGames: results.affectedGames,
      summary: results.summary
    }
  };

  if (results.warnings && results.warnings.length > 0) {
    response.warnings = results.warnings.map(warning => ({
      message: warning,
      notFoundIds: results.summary.notFound > 0 ? 
        assignment_ids.filter(id => !validIds.includes(id)) : undefined
    }));
  }

  res.json(response);
}));

// PATCH /api/assignments/:id/status - Update assignment status
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'accepted', 'declined', 'completed'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Use AssignmentService for single status update
  const results = await assignmentService.bulkUpdateAssignments([{
    assignment_id: req.params.id,
    status
  }]);

  if (results.summary.failedUpdates > 0) {
    const error = results.updateErrors[0];
    if (error.error === 'Assignment not found') {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    return res.status(500).json({ error: error.error });
  }

  res.json({
    success: true,
    data: { assignment: results.updatedAssignments[0] }
  });
}));

// DELETE /api/assignments/:id - Remove assignment
router.delete('/:id', asyncHandler(async (req, res) => {
  // Use AssignmentService for single assignment removal
  const results = await assignmentService.bulkRemoveAssignments([req.params.id]);

  if (results.summary.successfullyDeleted === 0) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  res.status(204).send();
}));

// POST /api/assignments/bulk - Bulk assign referees to a game
router.post('/bulk', async (req, res) => {
  try {
    const { game_id, assignments, assigned_by } = req.body;
    
    if (!game_id || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'game_id and assignments array are required' });
    }

    const game = await db('games').where('id', game_id).first();
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const trx = await db.transaction();
    
    try {
      const createdAssignments = [];
      
      for (const assignment of assignments) {
        const { user_id, position_id } = assignment;
        
        // Validate each assignment
        const referee = await trx('users').where('id', user_id).where('role', 'referee').first();
        if (!referee || !referee.is_available) {
          throw new Error(`Referee ${user_id} not found or not available`);
        }
        
        const position = await trx('positions').where('id', position_id).first();
        if (!position) {
          throw new Error(`Position ${position_id} not found`);
        }
        
        // Check conflicts
        const existingAssignment = await trx('game_assignments')
          .where('game_id', game_id)
          .where(function() {
            this.where('user_id', user_id).orWhere('position_id', position_id);
          })
          .first();
        
        if (existingAssignment) {
          throw new Error(`Conflict: Referee or position already assigned`);
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
          throw new Error(`Referee ${user_id} has a time conflict with another game`);
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
      
      res.status(201).json({ assignments: createdAssignments });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating bulk assignments:', error);
    res.status(500).json({ error: error.message || 'Failed to create bulk assignments' });
  }
});

// POST /api/assignments/check-conflicts - Check for conflicts before assignment
router.post('/check-conflicts', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = assignmentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const conflictAnalysis = await checkAssignmentConflicts(value);
    
    res.json({
      success: true,
      data: {
        hasConflicts: conflictAnalysis.hasConflicts,
        conflicts: conflictAnalysis.conflicts || [],
        warnings: conflictAnalysis.warnings || [],
        errors: conflictAnalysis.errors || [],
        isQualified: conflictAnalysis.isQualified || true,
        canAssign: !conflictAnalysis.hasConflicts
      }
    });
  } catch (error) {
    console.error('Error checking assignment conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
}));

// GET /api/assignments/available-referees/:game_id - Get available referees for a specific game
router.get('/available-referees/:game_id', async (req, res) => {
  try {
    const game = await db('games').where('id', req.params.game_id).first();
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
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
    // DISABLED: referee_availability table no longer exists
    const refereeIds = potentialReferees.map(ref => ref.id);
    const availabilityWindows = []; // await db('referee_availability').whereIn('referee_id', refereeIds).where('date', game.game_date);

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

    res.json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    console.error('Error fetching available referees:', error);
    res.status(500).json({ error: 'Failed to fetch available referees' });
  }
});

module.exports = router;