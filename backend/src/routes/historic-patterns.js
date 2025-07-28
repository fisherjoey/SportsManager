const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schemas
const applyPatternSchema = Joi.object({
  pattern_id: Joi.string().uuid().required(),
  game_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  override_conflicts: Joi.boolean().default(false)
});

const analyzePatternSchema = Joi.object({
  referee_id: Joi.string().uuid().optional(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  min_frequency: Joi.number().integer().min(1).default(2)
});

// Historic Pattern Analysis Service
class HistoricPatternService {
  static async analyzeAndCreatePatterns() {
    // Analyze completed assignments from the last 6 months
    const assignments = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .where('game_assignments.status', 'completed')
      .where('games.game_date', '>=', db.raw("NOW() - INTERVAL '6 months'"))
      .select(
        'game_assignments.user_id as referee_id',
        'users.name as referee_name',
        'games.game_date',
        'games.game_time',
        'games.location',
        'games.level',
        'game_assignments.status'
      );

    const patterns = {};

    // Group assignments by pattern criteria
    for (const assignment of assignments) {
      const dayOfWeek = new Date(assignment.game_date).toLocaleDateString('en-US', { weekday: 'long' });
      const timeSlot = this.categorizeTimeSlot(assignment.game_time);
      
      const patternKey = `${assignment.referee_id}-${dayOfWeek}-${assignment.location}-${timeSlot}-${assignment.level}`;
      
      if (!patterns[patternKey]) {
        patterns[patternKey] = {
          referee_id: assignment.referee_id,
          referee_name: assignment.referee_name,
          day_of_week: dayOfWeek,
          location: assignment.location,
          time_slot: timeSlot,
          level: assignment.level,
          assignments: [],
          frequency_count: 0,
          completed_assignments: 0,
          declined_assignments: 0
        };
      }

      patterns[patternKey].assignments.push(assignment);
      patterns[patternKey].frequency_count++;
      
      if (assignment.status === 'completed') {
        patterns[patternKey].completed_assignments++;
      } else if (assignment.status === 'declined') {
        patterns[patternKey].declined_assignments++;
      }
    }

    // Filter patterns with minimum frequency and calculate success rates
    const validPatterns = Object.values(patterns)
      .filter(pattern => pattern.frequency_count >= 2)
      .map(pattern => {
        const successRate = pattern.completed_assignments / pattern.frequency_count * 100;
        const assignments = pattern.assignments.sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
        
        return {
          ...pattern,
          success_rate: Math.round(successRate * 100) / 100,
          first_assigned: assignments[0]?.game_date,
          last_assigned: assignments[assignments.length - 1]?.game_date,
          total_assignments: pattern.frequency_count
        };
      });

    // Update database with patterns
    await this.updatePatternsInDatabase(validPatterns);
    
    return validPatterns;
  }

  static categorizeTimeSlot(gameTime) {
    const hour = parseInt(gameTime.split(':')[0]);
    
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  static async updatePatternsInDatabase(patterns) {
    // Clear existing patterns older than a week
    await db('assignment_patterns')
      .where('updated_at', '<', db.raw("NOW() - INTERVAL '7 days'"))
      .del();

    for (const pattern of patterns) {
      const existingPattern = await db('assignment_patterns')
        .where({
          referee_id: pattern.referee_id,
          day_of_week: pattern.day_of_week,
          location: pattern.location,
          time_slot: pattern.time_slot,
          level: pattern.level
        })
        .first();

      const patternData = {
        referee_id: pattern.referee_id,
        referee_name: pattern.referee_name,
        day_of_week: pattern.day_of_week,
        location: pattern.location,
        time_slot: pattern.time_slot,
        level: pattern.level,
        frequency_count: pattern.frequency_count,
        success_rate: pattern.success_rate,
        first_assigned: pattern.first_assigned,
        last_assigned: pattern.last_assigned,
        total_assignments: pattern.total_assignments,
        completed_assignments: pattern.completed_assignments,
        declined_assignments: pattern.declined_assignments
      };

      if (existingPattern) {
        await db('assignment_patterns')
          .where('id', existingPattern.id)
          .update({
            ...patternData,
            updated_at: new Date()
          });
      } else {
        await db('assignment_patterns').insert({
          ...patternData,
          id: require('crypto').randomUUID()
        });
      }
    }
  }

  static async findMatchingGames(pattern, gameIds) {
    const games = await db('games')
      .whereIn('id', gameIds)
      .where('location', pattern.location)
      .where('level', pattern.level);

    return games.filter(game => {
      const dayOfWeek = new Date(game.game_date).toLocaleDateString('en-US', { weekday: 'long' });
      const gameTimeSlot = this.categorizeTimeSlot(game.game_time);
      
      return dayOfWeek === pattern.day_of_week && gameTimeSlot === pattern.time_slot;
    });
  }

  static async checkConflicts(refereeId, games) {
    const conflicts = [];

    for (const game of games) {
      // Check for existing assignments
      const existingAssignment = await db('game_assignments')
        .where('game_id', game.id)
        .whereIn('status', ['pending', 'accepted'])
        .first();

      if (existingAssignment) {
        conflicts.push({
          game_id: game.id,
          type: 'already_assigned',
          message: 'Game is already assigned to another referee'
        });
        continue;
      }

      // Check for referee time conflicts
      const timeConflicts = await db('game_assignments')
        .join('games as conflict_games', 'game_assignments.game_id', 'conflict_games.id')
        .where('game_assignments.user_id', refereeId)
        .where('conflict_games.game_date', game.game_date)
        .whereRaw(`
          (conflict_games.game_time, conflict_games.game_time + INTERVAL '2 hours') OVERLAPS 
          (?, ? + INTERVAL '2 hours')
        `, [game.game_time, game.game_time])
        .whereIn('game_assignments.status', ['pending', 'accepted']);

      if (timeConflicts.length > 0) {
        conflicts.push({
          game_id: game.id,
          type: 'time_conflict',
          message: 'Referee has overlapping assignment',
          conflicting_assignments: timeConflicts
        });
      }
    }

    return conflicts;
  }
}

// GET /api/assignments/patterns - Get historic patterns
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { 
      referee_id, 
      min_frequency = 2, 
      start_date, 
      end_date,
      page = 1, 
      limit = 50 
    } = req.query;

    // Refresh patterns periodically
    const lastUpdate = await db('assignment_patterns')
      .max('updated_at as last_updated')
      .first();

    const shouldRefresh = !lastUpdate.last_updated || 
      new Date() - new Date(lastUpdate.last_updated) > 24 * 60 * 60 * 1000; // 24 hours

    if (shouldRefresh) {
      await HistoricPatternService.analyzeAndCreatePatterns();
    }

    let query = db('assignment_patterns')
      .where('is_active', true)
      .where('frequency_count', '>=', min_frequency)
      .orderBy('success_rate', 'desc')
      .orderBy('frequency_count', 'desc');

    if (referee_id) {
      query = query.where('referee_id', referee_id);
    }

    if (start_date && end_date) {
      query = query.whereBetween('last_assigned', [start_date, end_date]);
    }

    const offset = (page - 1) * limit;
    const patterns = await query.limit(limit).offset(offset);

    res.json({
      success: true,
      data: {
        patterns: patterns.map(pattern => ({
          id: pattern.id,
          referee_id: pattern.referee_id,
          referee_name: pattern.referee_name,
          pattern: {
            day_of_week: pattern.day_of_week,
            location: pattern.location,
            time_slot: pattern.time_slot,
            level: pattern.level
          },
          frequency: pattern.frequency_count,
          success_rate: pattern.success_rate,
          last_assigned: pattern.last_assigned,
          total_assignments: pattern.total_assignments
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching historic patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historic patterns'
    });
  }
});

// POST /api/assignments/patterns/apply - Apply pattern to games
router.post('/apply', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = applyPatternSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { pattern_id, game_ids, override_conflicts } = value;

    // Get pattern details
    const pattern = await db('assignment_patterns')
      .where('id', pattern_id)
      .where('is_active', true)
      .first();

    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Pattern not found'
      });
    }

    // Find matching games
    const matchingGames = await HistoricPatternService.findMatchingGames(pattern, game_ids);

    if (matchingGames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No games match the pattern criteria'
      });
    }

    // Check for conflicts
    const conflicts = await HistoricPatternService.checkConflicts(pattern.referee_id, matchingGames);

    if (conflicts.length > 0 && !override_conflicts) {
      return res.status(409).json({
        success: false,
        error: 'Assignment conflicts detected',
        data: { conflicts }
      });
    }

    // Create assignments for non-conflicted games
    const assignmentsToCreate = override_conflicts 
      ? matchingGames 
      : matchingGames.filter(game => !conflicts.find(c => c.game_id === game.id));

    const assignments = [];
    let conflictsOverridden = 0;

    for (const game of assignmentsToCreate) {
      // Remove existing assignment if overriding conflicts
      if (override_conflicts) {
        const existingAssignment = await db('game_assignments')
          .where('game_id', game.id)
          .first();

        if (existingAssignment) {
          await db('game_assignments').where('id', existingAssignment.id).del();
          conflictsOverridden++;
        }
      }

      // Create new assignment
      const assignmentData = {
        game_id: game.id,
        user_id: pattern.referee_id,
        position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b', // Default referee position
        assigned_by: req.user.userId,
        status: 'pending'
      };

      const [assignment] = await db('game_assignments').insert(assignmentData).returning('*');
      assignments.push(assignment);
    }

    // Update pattern usage
    await db('assignment_patterns')
      .where('id', pattern_id)
      .increment('total_assignments', assignments.length)
      .update('last_assigned', new Date());

    res.json({
      success: true,
      data: {
        assignments_created: assignments.length,
        conflicts_overridden: conflictsOverridden,
        assignments: assignments.map(a => ({
          id: a.id,
          game_id: a.game_id,
          referee_id: a.user_id,
          status: a.status
        }))
      },
      message: `Applied pattern to ${assignments.length} games`
    });

  } catch (error) {
    console.error('Error applying pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply pattern'
    });
  }
});

// POST /api/assignments/patterns/analyze - Analyze patterns
router.post('/analyze', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = analyzePatternSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { referee_id, start_date, end_date, min_frequency } = value;

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    // Get assignments for analysis
    let query = db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('users', 'game_assignments.user_id', 'users.id')
      .whereBetween('games.game_date', [start_date, end_date])
      .whereIn('game_assignments.status', ['completed', 'declined']);

    if (referee_id) {
      query = query.where('game_assignments.user_id', referee_id);
    }

    const assignments = await query.select(
      'game_assignments.user_id as referee_id',
      'users.name as referee_name',
      'games.game_date',
      'games.game_time',
      'games.location',
      'games.level',
      'game_assignments.status'
    );

    // Analyze patterns
    const patterns = {};
    assignments.forEach(assignment => {
      const dayOfWeek = new Date(assignment.game_date).toLocaleDateString('en-US', { weekday: 'long' });
      const timeSlot = HistoricPatternService.categorizeTimeSlot(assignment.game_time);
      const key = `${assignment.referee_id}-${dayOfWeek}-${assignment.location}-${timeSlot}-${assignment.level}`;
      
      if (!patterns[key]) {
        patterns[key] = {
          referee_name: assignment.referee_name,
          day_of_week: dayOfWeek,
          location: assignment.location,
          time_slot: timeSlot,
          level: assignment.level,
          count: 0,
          completed: 0
        };
      }
      
      patterns[key].count++;
      if (assignment.status === 'completed') {
        patterns[key].completed++;
      }
    });

    // Filter and sort patterns
    const strongestPatterns = Object.values(patterns)
      .filter(p => p.count >= min_frequency)
      .map(p => ({
        ...p,
        success_rate: Math.round((p.completed / p.count) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const analysis = {
      total_assignments: assignments.length,
      patterns_identified: Object.keys(patterns).length,
      strong_patterns: strongestPatterns.length,
      strongest_patterns: strongestPatterns,
      date_range: { start_date, end_date },
      analysis_date: new Date()
    };

    res.json({
      success: true,
      data: { analysis }
    });

  } catch (error) {
    console.error('Error analyzing patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze patterns'
    });
  }
});

// GET /api/assignments/patterns/:id - Get specific pattern
router.get('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pattern = await db('assignment_patterns')
      .where('id', id)
      .first();

    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Pattern not found'
      });
    }

    // Get recent assignments for this pattern
    const assignments = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .where('game_assignments.user_id', pattern.referee_id)
      .where('games.location', pattern.location)
      .where('games.level', pattern.level)
      .whereRaw(`EXTRACT(DOW FROM games.game_date) = ?`, [
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(pattern.day_of_week)
      ])
      .orderBy('games.game_date', 'desc')
      .limit(20)
      .select(
        'game_assignments.*',
        'games.game_date',
        'games.game_time',
        'games.location'
      );

    res.json({
      success: true,
      data: {
        pattern: {
          id: pattern.id,
          referee_id: pattern.referee_id,
          referee_name: pattern.referee_name,
          pattern: {
            day_of_week: pattern.day_of_week,
            location: pattern.location,
            time_slot: pattern.time_slot,
            level: pattern.level
          },
          frequency: pattern.frequency_count,
          success_rate: pattern.success_rate,
          assignments: assignments
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pattern details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pattern details'
    });
  }
});

// DELETE /api/assignments/patterns/:id - Delete pattern
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db('assignment_patterns')
      .where('id', id)
      .del();

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pattern not found'
      });
    }

    res.json({
      success: true,
      message: 'Pattern deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete pattern'
    });
  }
});

module.exports = router;