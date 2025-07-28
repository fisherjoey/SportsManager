const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schemas
const generateSuggestionsSchema = Joi.object({
  game_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  factors: Joi.object({
    proximity_weight: Joi.number().min(0).max(1).default(0.3),
    availability_weight: Joi.number().min(0).max(1).default(0.4),
    experience_weight: Joi.number().min(0).max(1).default(0.2),
    performance_weight: Joi.number().min(0).max(1).default(0.1)
  }).default({})
});

const rejectSuggestionSchema = Joi.object({
  reason: Joi.string().max(500).optional()
});

// AI suggestion generation service (mock implementation)
class AIAssignmentService {
  static async generateSuggestions(games, referees, factors = {}) {
    const suggestions = [];
    
    for (const game of games) {
      // Get available referees for this time slot
      const availableReferees = await this.getAvailableReferees(game);
      
      for (const referee of availableReferees) {
        const suggestion = await this.calculateSuggestion(game, referee, factors);
        if (suggestion.confidence_score >= 0.3) { // Minimum confidence threshold
          suggestions.push(suggestion);
        }
      }
    }
    
    // Sort by confidence score descending
    return suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
  }

  static async getAvailableReferees(game) {
    // Get referees who are not already assigned to overlapping games
    const conflictingAssignments = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .where('games.game_date', game.game_date)
      .whereRaw(`
        (games.game_time, games.game_time + INTERVAL '2 hours') OVERLAPS 
        (?, ? + INTERVAL '2 hours')
      `, [game.game_time, game.game_time])
      .whereIn('game_assignments.status', ['pending', 'accepted'])
      .select('game_assignments.user_id');

    const conflictingUserIds = conflictingAssignments.map(a => a.user_id);

    return await db('users')
      .join('referees', 'users.id', 'referees.user_id')
      .where('referees.is_available', true)
      .whereNotIn('users.id', conflictingUserIds)
      .select('users.*', 'referees.*');
  }

  static async calculateSuggestion(game, referee, factors) {
    // Calculate individual factor scores
    const proximityScore = await this.calculateProximityScore(game, referee);
    const availabilityScore = await this.calculateAvailabilityScore(game, referee);
    const experienceScore = this.calculateExperienceScore(game, referee);
    const performanceScore = await this.calculatePerformanceScore(referee);

    // Calculate weighted confidence score
    const confidenceScore = (
      (proximityScore * (factors.proximity_weight || 0.3)) +
      (availabilityScore * (factors.availability_weight || 0.4)) +
      (experienceScore * (factors.experience_weight || 0.2)) +
      (performanceScore * (factors.performance_weight || 0.1))
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      proximityScore, availabilityScore, experienceScore, performanceScore
    );

    return {
      id: require('crypto').randomUUID(),
      game_id: game.id,
      referee_id: referee.id,
      confidence_score: Math.min(1, Math.max(0, confidenceScore)),
      reasoning,
      proximity_score: proximityScore,
      availability_score: availabilityScore,
      experience_score: experienceScore,
      performance_score: performanceScore,
      status: 'pending',
      created_at: new Date()
    };
  }

  static async calculateProximityScore(game, referee) {
    // Mock proximity calculation - in real implementation would use Google Maps API
    if (!referee.postal_code || !game.postal_code) return 0.5;
    
    // Simple distance approximation based on postal code similarity
    const refereePostal = referee.postal_code.substring(0, 3);
    const gamePostal = (game.postal_code || '').substring(0, 3);
    
    if (refereePostal === gamePostal) return 0.9;
    return 0.6; // Default moderate proximity
  }

  static async calculateAvailabilityScore(game, referee) {
    // Check referee availability windows
    const availabilityWindows = await db('referee_availability')
      .where('user_id', referee.id)
      .where('date', game.game_date)
      .whereRaw(`
        (start_time, end_time) OVERLAPS (?, ? + INTERVAL '2 hours')
      `, [game.game_time, game.game_time]);

    if (availabilityWindows.length > 0) {
      return 1.0; // Explicitly available
    }

    // Check for blackout periods if using blacklist strategy
    if (referee.availability_strategy === 'BLACKLIST') {
      const blackouts = await db('referee_availability')
        .where('user_id', referee.id)
        .where('date', game.game_date)
        .where('is_available', false);
      
      return blackouts.length === 0 ? 0.8 : 0.2;
    }

    return 0.7; // Default availability
  }

  static calculateExperienceScore(game, referee) {
    // Calculate based on referee level and game level
    const levelMapping = {
      'Rookie': 0.3,
      'Junior': 0.6,
      'Senior': 0.9,
      'Elite': 1.0
    };

    const refereeScore = levelMapping[referee.level] || 0.5;
    
    // Adjust based on game level requirements
    if (game.level === 'Recreational' && refereeScore >= 0.3) return Math.min(1.0, refereeScore + 0.2);
    if (game.level === 'Competitive' && refereeScore >= 0.6) return refereeScore;
    if (game.level === 'Elite' && refereeScore >= 0.9) return refereeScore;
    
    return refereeScore * 0.8; // Penalty for level mismatch
  }

  static async calculatePerformanceScore(referee) {
    // Calculate based on past assignment completion rate
    const assignments = await db('game_assignments')
      .where('user_id', referee.id)
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '6 months'"));

    if (assignments.length === 0) return 0.5; // No history

    const completed = assignments.filter(a => a.status === 'completed').length;
    const declined = assignments.filter(a => a.status === 'declined').length;
    const total = assignments.length;

    const completionRate = completed / total;
    const declineRate = declined / total;

    return Math.max(0, Math.min(1, completionRate - (declineRate * 0.5)));
  }

  static generateReasoning(proximity, availability, experience, performance) {
    const reasons = [];
    
    if (proximity >= 0.8) reasons.push('lives close to venue');
    if (availability >= 0.9) reasons.push('explicitly available during time slot');
    if (experience >= 0.8) reasons.push('high experience level for this game type');
    if (performance >= 0.8) reasons.push('excellent past performance and reliability');
    
    if (proximity < 0.5) reasons.push('significant travel distance required');
    if (availability < 0.5) reasons.push('potential availability conflict');
    if (experience < 0.5) reasons.push('may need experience development for this level');
    
    return reasons.length > 0 
      ? reasons.join(', ').replace(/^./, str => str.toUpperCase())
      : 'Standard assignment recommendation based on available data';
  }
}

// POST /api/assignments/ai-suggestions - Generate AI suggestions
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = generateSuggestionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { game_ids, factors } = value;

    // Validate all games exist and are unassigned
    const games = await db('games')
      .whereIn('id', game_ids)
      .whereNotExists(function() {
        this.select('*')
          .from('game_assignments')
          .whereRaw('game_assignments.game_id = games.id')
          .whereIn('status', ['pending', 'accepted']);
      });

    if (games.length !== game_ids.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more games not found or already assigned'
      });
    }

    // Clear any expired suggestions for these games
    await db('ai_suggestions')
      .whereIn('game_id', game_ids)
      .where('created_at', '<', db.raw("NOW() - INTERVAL '1 hour'"))
      .update({ status: 'expired' });

    // Generate new suggestions
    const suggestions = await AIAssignmentService.generateSuggestions(games, [], factors);

    // Store suggestions in database
    const suggestionInserts = suggestions.map(s => ({
      ...s,
      created_by: req.user.userId
    }));

    if (suggestionInserts.length > 0) {
      await db('ai_suggestions').insert(suggestionInserts);
    }

    res.json({
      success: true,
      data: {
        suggestions: suggestions.map(s => ({
          id: s.id,
          game_id: s.game_id,
          referee_id: s.referee_id,
          confidence_score: s.confidence_score,
          reasoning: s.reasoning,
          factors: {
            proximity: s.proximity_score,
            availability: s.availability_score,
            experience: s.experience_score,
            past_performance: s.performance_score
          },
          created_at: s.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI suggestions'
    });
  }
});

// GET /api/assignments/ai-suggestions - Get recent suggestions
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    let query = db('ai_suggestions')
      .join('games', 'ai_suggestions.game_id', 'games.id')
      .join('users', 'ai_suggestions.referee_id', 'users.id')
      .join('teams as home_team', 'games.home_team_id', 'home_team.id')
      .join('teams as away_team', 'games.away_team_id', 'away_team.id')
      .select(
        'ai_suggestions.*',
        'games.game_date',
        'games.game_time',
        'games.location',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        'users.name as referee_name'
      )
      .where('ai_suggestions.created_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .orderBy('ai_suggestions.confidence_score', 'desc');

    if (status !== 'all') {
      query = query.where('ai_suggestions.status', status);
    }

    const offset = (page - 1) * limit;
    const suggestions = await query.limit(limit).offset(offset);

    res.json({
      success: true,
      data: {
        suggestions: suggestions.map(s => ({
          id: s.id,
          game_id: s.game_id,
          referee_id: s.referee_id,
          referee_name: s.referee_name,
          game_details: {
            date: s.game_date,
            time: s.game_time,
            location: s.location,
            home_team: s.home_team_name,
            away_team: s.away_team_name
          },
          confidence_score: s.confidence_score,
          reasoning: s.reasoning,
          factors: {
            proximity: s.proximity_score,
            availability: s.availability_score,
            experience: s.experience_score,
            past_performance: s.performance_score
          },
          status: s.status,
          created_at: s.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI suggestions'
    });
  }
});

// PUT /api/assignments/ai-suggestions/:id/accept - Accept suggestion
router.put('/:id/accept', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get suggestion details
    const suggestion = await db('ai_suggestions')
      .where('id', id)
      .where('status', 'pending')
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '1 hour'"))
      .first();

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found or expired'
      });
    }

    // Check if game is still available
    const existingAssignment = await db('game_assignments')
      .where('game_id', suggestion.game_id)
      .whereIn('status', ['pending', 'accepted'])
      .first();

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        error: 'Game has already been assigned'
      });
    }

    // Create assignment
    const assignmentData = {
      game_id: suggestion.game_id,
      user_id: suggestion.referee_id,
      position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b', // Default referee position
      assigned_by: req.user.userId,
      status: 'pending'
    };

    const [assignment] = await db('game_assignments').insert(assignmentData).returning('*');

    // Update suggestion status
    await db('ai_suggestions')
      .where('id', id)
      .update({
        status: 'accepted',
        processed_by: req.user.userId,
        processed_at: new Date()
      });

    res.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          game_id: assignment.game_id,
          referee_id: assignment.user_id,
          status: assignment.status,
          assigned_at: assignment.assigned_at
        }
      },
      message: 'AI suggestion accepted and assignment created'
    });

  } catch (error) {
    console.error('Error accepting AI suggestion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept AI suggestion'
    });
  }
});

// PUT /api/assignments/ai-suggestions/:id/reject - Reject suggestion
router.put('/:id/reject', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = rejectSuggestionSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { reason } = value;

    // Update suggestion status
    const updated = await db('ai_suggestions')
      .where('id', id)
      .where('status', 'pending')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        processed_by: req.user.userId,
        processed_at: new Date()
      });

    if (updated === 0) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found'
      });
    }

    res.json({
      success: true,
      message: 'AI suggestion rejected'
    });

  } catch (error) {
    console.error('Error rejecting AI suggestion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject AI suggestion'
    });
  }
});

module.exports = router;