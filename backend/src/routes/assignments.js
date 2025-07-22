const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { calculateFinalWage, getWageBreakdown } = require('../utils/wage-calculator');
const { checkTimeOverlap, hasSchedulingConflict, findAvailableReferees } = require('../utils/availability');

const assignmentSchema = Joi.object({
  game_id: Joi.string().required(),
  user_id: Joi.string().required(),
  position_id: Joi.string().required(),
  assigned_by: Joi.string()
});

// GET /api/assignments - Get all assignments with optional filters
router.get('/', async (req, res) => {
  try {
    const { game_id, referee_id, status, page = 1, limit = 50 } = req.query;
    
    let query = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .select(
        'game_assignments.*',
        'games.home_team_name',
        'games.away_team_name',
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
      .orderBy('games.game_date', 'asc');

    if (game_id) {
      query = query.where('game_assignments.game_id', game_id);
    }
    
    if (referee_id) {
      query = query.where('game_assignments.referee_id', referee_id);
    }
    
    if (status) {
      query = query.where('game_assignments.status', status);
    }

    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const assignments = await query;
    
    // Transform assignments to include game object and wage calculations
    const transformedAssignments = assignments.map(assignment => {
      const baseWage = assignment.calculated_wage || assignment.pay_rate || 0;
      const multiplier = assignment.wage_multiplier || 1.0;
      const finalWage = assignment.calculated_wage || calculateFinalWage(baseWage, multiplier);
      
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
});

// GET /api/assignments/:id - Get specific assignment
router.get('/:id', async (req, res) => {
  try {
    const assignment = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('referees', 'game_assignments.referee_id', 'referees.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .select(
        'game_assignments.*',
        'games.*',
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

    // Check if referee is available
    if (!referee.is_available) {
      return res.status(400).json({ error: 'Referee is not available' });
    }
    
    // Check referee level eligibility (for admin assignments, show warning but allow)
    let levelWarning = null;
    if (referee.allowed_divisions) {
      const allowedDivisions = JSON.parse(referee.allowed_divisions);
      if (!allowedDivisions.includes(game.level)) {
        levelWarning = `Warning: Referee level "${referee.level_name}" is not typically qualified for ${game.level} games. Allowed divisions: ${allowedDivisions.join(', ')}`;
      }
    } else if (referee.referee_level_id === null) {
      levelWarning = 'Warning: Referee has no assigned level. Consider assigning a level.';
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

    // Check if referee has time conflict with other games
    const timeConflictAssignment = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .where('game_assignments.user_id', value.user_id)
      .where('games.game_date', game.game_date)
      .where('games.game_time', game.game_time)
      .where('games.id', '!=', value.game_id)
      .first();
    
    if (timeConflictAssignment) {
      return res.status(409).json({ error: 'Referee has a time conflict with another game' });
    }

    // Check availability windows for the game time
    const availabilityWindows = await db('referee_availability')
      .where('referee_id', value.user_id)
      .where('date', game.game_date);

    // Calculate game end time (assuming 2-hour duration if not specified)
    const gameStartTime = game.game_time;
    const gameEndTime = game.end_time || (() => {
      const [hours, minutes] = gameStartTime.split(':').map(Number);
      const endHours = (hours + 2) % 24;
      return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    })();

    // Check for availability conflicts
    let availabilityWarning = null;
    if (availabilityWindows.length > 0) {
      const gameTime = { start: gameStartTime, end: gameEndTime };
      const hasConflict = hasSchedulingConflict(availabilityWindows, gameTime);
      
      if (hasConflict) {
        // Find the conflicting window for details
        const conflictingWindow = availabilityWindows.find(window => {
          if (!window.is_available && checkTimeOverlap(window, { start_time: gameStartTime, end_time: gameEndTime })) {
            return true;
          }
          return false;
        });
        
        if (conflictingWindow) {
          const conflictReason = conflictingWindow.reason ? ` (${conflictingWindow.reason})` : '';
          return res.status(409).json({ 
            error: `Referee is unavailable during game time: ${conflictingWindow.start_time}-${conflictingWindow.end_time}${conflictReason}` 
          });
        }
      }
      
      // Check if referee has marked availability for this time (positive indicator)
      const hasAvailabilityWindow = availabilityWindows.some(window => 
        window.is_available && 
        gameStartTime >= window.start_time && 
        gameEndTime <= window.end_time
      );
      
      if (!hasAvailabilityWindow) {
        availabilityWarning = 'Note: Referee has not specifically marked availability for this game time';
      }
    } else {
      availabilityWarning = 'Note: Referee has not set any availability windows for this date';
    }

    // Calculate final wage using referee's base wage and game multiplier
    const finalWage = calculateFinalWage(referee.wage_per_game, game.wage_multiplier);
    const wageBreakdown = getWageBreakdown(referee.wage_per_game, game.wage_multiplier, game.wage_multiplier_reason);
    
    // Create assignment with pending status and calculated wage
    const assignmentData = {
      ...value,
      status: 'pending',
      assigned_at: new Date(),
      calculated_wage: finalWage
    };
    
    const [assignment] = await db('game_assignments').insert(assignmentData).returning('*');

    // Update game status based on assignments
    const totalAssignments = await db('game_assignments')
      .where('game_id', value.game_id)
      .whereIn('status', ['pending', 'accepted'])
      .count('* as count')
      .first();

    let gameStatus = 'unassigned';
    if (parseInt(totalAssignments.count) > 0 && parseInt(totalAssignments.count) < game.refs_needed) {
      gameStatus = 'assigned'; // Partially assigned
    } else if (parseInt(totalAssignments.count) >= game.refs_needed) {
      gameStatus = 'assigned'; // Fully assigned
    }

    await db('games')
      .where('id', value.game_id)
      .update({ status: gameStatus, updated_at: new Date() });

    const response = {
      success: true,
      data: { 
        assignment,
        wageBreakdown 
      }
    };
    
    // Combine warnings
    const warnings = [];
    if (levelWarning) warnings.push(levelWarning);
    if (availabilityWarning) warnings.push(availabilityWarning);
    
    if (warnings.length > 0) {
      response.warnings = warnings;
      response.warning = warnings.join('; '); // For backward compatibility
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// PATCH /api/assignments/:id/status - Update assignment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'declined', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [assignment] = await db('game_assignments')
      .where('id', req.params.id)
      .update({ status, updated_at: new Date() })
      .returning('*');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Update game status based on assignments
    const game = await db('games').where('id', assignment.game_id).first();
    const activeAssignments = await db('game_assignments')
      .where('game_id', assignment.game_id)
      .whereIn('status', ['pending', 'accepted'])
      .count('* as count')
      .first();

    let gameStatus = 'unassigned';
    if (parseInt(activeAssignments.count) > 0 && parseInt(activeAssignments.count) < game.refs_needed) {
      gameStatus = 'assigned'; // Partially assigned
    } else if (parseInt(activeAssignments.count) >= game.refs_needed) {
      gameStatus = 'assigned'; // Fully assigned
    }

    await db('games')
      .where('id', assignment.game_id)
      .update({ status: gameStatus, updated_at: new Date() });

    res.json({
      success: true,
      data: { assignment }
    });
  } catch (error) {
    console.error('Error updating assignment status:', error);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
});

// DELETE /api/assignments/:id - Remove assignment
router.delete('/:id', async (req, res) => {
  try {
    const assignment = await db('game_assignments').where('id', req.params.id).first();
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const gameId = assignment.game_id;
    
    const deletedCount = await db('game_assignments').where('id', req.params.id).del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if game has any remaining assignments
    const remainingAssignments = await db('game_assignments')
      .where('game_id', gameId)
      .where('status', '!=', 'declined');
    
    if (remainingAssignments.length === 0) {
      await db('games')
        .where('id', gameId)
        .update({ status: 'unassigned', updated_at: new Date() });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

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
        const { referee_id, position_id } = assignment;
        
        // Validate each assignment
        const referee = await trx('referees').where('id', referee_id).first();
        if (!referee || !referee.is_available) {
          throw new Error(`Referee ${referee_id} not found or not available`);
        }
        
        const position = await trx('positions').where('id', position_id).first();
        if (!position) {
          throw new Error(`Position ${position_id} not found`);
        }
        
        // Check conflicts
        const existingAssignment = await trx('game_assignments')
          .where('game_id', game_id)
          .where(function() {
            this.where('referee_id', referee_id).orWhere('position_id', position_id);
          })
          .first();
        
        if (existingAssignment) {
          throw new Error(`Conflict: Referee or position already assigned`);
        }

        // Check if referee has time conflict with other games
        const timeConflictAssignment = await trx('game_assignments')
          .join('games', 'game_assignments.game_id', 'games.id')
          .where('game_assignments.referee_id', referee_id)
          .where('games.game_date', game.game_date)
          .where('games.game_time', game.game_time)
          .where('games.id', '!=', game_id)
          .first();
        
        if (timeConflictAssignment) {
          throw new Error(`Referee ${referee_id} has a time conflict with another game`);
        }
        
        const [newAssignment] = await trx('game_assignments')
          .insert({
            game_id,
            referee_id,
            position_id,
            assigned_by
          })
          .returning('*');
        
        createdAssignments.push(newAssignment);
      }
      
      // Update game status to assigned
      await trx('games')
        .where('id', game_id)
        .update({ status: 'assigned', updated_at: new Date() });
      
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
    const refereeIds = potentialReferees.map(ref => ref.id);
    const availabilityWindows = await db('referee_availability')
      .whereIn('referee_id', refereeIds)
      .where('date', game.game_date);

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