const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const aiServices = require('../services/aiServices');
const logger = require('../utils/logger');
const { generateRequestId } = require('../utils/security');
const batchProcessor = require('../utils/batching');

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

// AI suggestion generation service using the enhanced AI service
class AIAssignmentService {
  static async generateSuggestions(games, referees, factors = {}) {
    try {
      // Use batching for large datasets
      const batchResult = await batchProcessor.processBatches(
        games, 
        referees, 
        async (batchGames, batchReferees) => {
          // Use the enhanced AI service for referee assignments
          const aiResult = await aiServices.generateRefereeAssignments(batchGames, batchReferees, factors);
          
          if (!aiResult.success) {
            throw new Error('AI assignment generation failed');
          }
          
          return aiResult.assignments;
        },
        {
          operation: 'generateSuggestions',
          totalGames: games.length,
          totalReferees: referees.length
        }
      );

      // Handle batched results
      let allAssignments = [];
      if (batchResult.results) {
        // Batched processing
        allAssignments = batchResult.results.flat();
        
        if (batchResult.errors && batchResult.errors.length > 0) {
          logger.logWarning('Some batches failed during AI suggestion generation', {
            component: 'AIAssignmentService',
            failedBatches: batchResult.errors.length,
            totalBatches: batchResult.batchInfo.totalBatches
          });
        }
      } else {
        // Single batch processing
        allAssignments = batchResult;
      }

      const suggestions = [];
      
      // Transform AI results to suggestions format
      for (const assignment of allAssignments) {
        const game = games.find(g => g.id === assignment.gameId);
        if (!game) {
          continue;
        }

        for (const refereeAssignment of assignment.assignedReferees) {
          const referee = referees.find(r => r.id === refereeAssignment.refereeId);
          if (!referee) {
            continue;
          }

          // Check for conflicts using existing conflict detection
          const conflictCheck = await this.checkRefereeConflicts(game, referee);
          
          const suggestion = {
            id: require('crypto').randomUUID(),
            game_id: game.id,
            referee_id: referee.id,
            confidence_score: refereeAssignment.confidence,
            reasoning: refereeAssignment.reasoning,
            proximity_score: refereeAssignment.factors?.proximity || 0.5,
            availability_score: refereeAssignment.factors?.availability || 0.5,
            experience_score: refereeAssignment.factors?.experience || 0.5,
            performance_score: refereeAssignment.factors?.level_match || 0.5,
            historical_bonus: 0, // Could be enhanced with historical data
            status: 'pending',
            created_at: new Date()
          };

          // Add conflict warnings if any exist
          if (conflictCheck.warnings.length > 0) {
            suggestion.conflict_warnings = conflictCheck.warnings;
            // Slightly reduce confidence for potential conflicts
            suggestion.confidence_score = Math.max(0.1, suggestion.confidence_score - 0.1);
          }

          if (suggestion.confidence_score >= 0.3) { // Minimum confidence threshold
            suggestions.push(suggestion);
          }
        }
      }
      
      // Sort by confidence score descending, then by conflict warnings (fewer warnings first)
      return suggestions.sort((a, b) => {
        if (Math.abs(a.confidence_score - b.confidence_score) < 0.05) {
          // If confidence scores are very close, prefer ones with fewer warnings
          const aWarnings = a.conflict_warnings ? a.conflict_warnings.length : 0;
          const bWarnings = b.conflict_warnings ? b.conflict_warnings.length : 0;
          return aWarnings - bWarnings;
        }
        return b.confidence_score - a.confidence_score;
      });

    } catch (error) {
      logger.logError('AI assignment service error', {
        component: 'AIAssignmentService',
        operation: 'generateSuggestions',
        gamesCount: games.length,
        refereesCount: referees.length
      }, error);
      
      // Fallback to the original mock implementation
      return this.generateSuggestionsLegacy(games, referees, factors);
    }
  }

  // Keep the existing implementation as fallback
  static async generateSuggestionsLegacy(games, referees, factors = {}) {
    const suggestions = [];
    
    for (const game of games) {
      // Get available referees for this time slot (with conflict prevention)
      const availableReferees = await this.getAvailableReferees(game);
      
      for (const referee of availableReferees) {
        // Additional conflict check - prevent double-booking and over-assignment
        const conflictCheck = await this.checkRefereeConflicts(game, referee);
        
        if (!conflictCheck.hasConflict) {
          const suggestion = await this.calculateSuggestion(game, referee, factors);
          
          // Add conflict warnings if any exist
          if (conflictCheck.warnings.length > 0) {
            suggestion.conflict_warnings = conflictCheck.warnings;
            // Slightly reduce confidence for potential conflicts
            suggestion.confidence_score = Math.max(0.1, suggestion.confidence_score - 0.1);
          }
          
          if (suggestion.confidence_score >= 0.3) { // Minimum confidence threshold
            suggestions.push(suggestion);
          }
        }
      }
    }
    
    // Sort by confidence score descending, then by conflict warnings (fewer warnings first)
    return suggestions.sort((a, b) => {
      if (Math.abs(a.confidence_score - b.confidence_score) < 0.05) {
        // If confidence scores are very close, prefer ones with fewer warnings
        const aWarnings = a.conflict_warnings ? a.conflict_warnings.length : 0;
        const bWarnings = b.conflict_warnings ? b.conflict_warnings.length : 0;
        return aWarnings - bWarnings;
      }
      return b.confidence_score - a.confidence_score;
    });
  }

  static async getAvailableReferees(game) {
    // Enhanced conflict detection - get referees who are not already assigned to overlapping games
    const gameStart = new Date(`${game.game_date} ${game.game_time}`);
    const gameEnd = new Date(gameStart.getTime() + (2.5 * 60 * 60 * 1000)); // 2.5 hours for game + travel time

    // Check for time-based conflicts (overlapping games + buffer time)
    const conflictingAssignments = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .where('games.game_date', game.game_date)
      .whereRaw(`
        (games.game_time - INTERVAL '30 minutes', games.game_time + INTERVAL '2 hours 30 minutes') OVERLAPS 
        (? - INTERVAL '30 minutes', ? + INTERVAL '2 hours 30 minutes')
      `, [game.game_time, game.game_time])
      .whereIn('game_assignments.status', ['pending', 'accepted', 'completed'])
      .select('game_assignments.user_id');

    // Check for daily workload limits (max 4 games per day)
    const dailyWorkloadConflicts = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .where('games.game_date', game.game_date)
      .whereIn('game_assignments.status', ['pending', 'accepted', 'completed'])
      .groupBy('game_assignments.user_id')
      .havingRaw('COUNT(*) >= 4')
      .select('game_assignments.user_id');

    // Check for weekly workload limits (max 15 games per week)
    const weekStart = new Date(gameStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week

    const weeklyWorkloadConflicts = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .whereBetween('games.game_date', [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]])
      .whereIn('game_assignments.status', ['pending', 'accepted', 'completed'])
      .groupBy('game_assignments.user_id')
      .havingRaw('COUNT(*) >= 15')
      .select('game_assignments.user_id');

    // Check for explicit unavailability (blackout periods)
    const unavailableReferees = await db('referee_availability')
      .where('date', game.game_date)
      .where('is_available', false)
      .whereRaw(`
        (start_time, end_time) OVERLAPS (?, ? + INTERVAL '2 hours')
      `, [game.game_time, game.game_time])
      .select('user_id');

    // Combine all conflict types
    const allConflictingUserIds = [
      ...conflictingAssignments.map(a => a.user_id),
      ...dailyWorkloadConflicts.map(a => a.user_id),
      ...weeklyWorkloadConflicts.map(a => a.user_id),
      ...unavailableReferees.map(a => a.user_id)
    ];

    const uniqueConflictingUserIds = [...new Set(allConflictingUserIds)];

    return await db('users')
      .join('referees', 'users.id', 'referees.user_id')
      .where('referees.is_available', true)
      .whereNotIn('users.id', uniqueConflictingUserIds)
      .select('users.*', 'referees.*');
  }

  static async checkRefereeConflicts(game, referee) {
    const warnings = [];
    const hasConflict = false;

    try {
      // Check for back-to-back games (less than 45 minutes between games)
      const nearbyGames = await db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .where('game_assignments.user_id', referee.id)
        .where('games.game_date', game.game_date)
        .whereRaw(`
          ABS(EXTRACT(EPOCH FROM (games.game_time - ?::time)) / 60) < 45
        `, [game.game_time])
        .whereIn('game_assignments.status', ['pending', 'accepted'])
        .select('games.*');

      if (nearbyGames.length > 0) {
        warnings.push('Back-to-back games with less than 45 minutes rest');
      }

      // Check for excessive daily workload (approaching limit)
      const todaysGames = await db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .where('game_assignments.user_id', referee.id)
        .where('games.game_date', game.game_date)
        .whereIn('game_assignments.status', ['pending', 'accepted', 'completed']);

      if (todaysGames.length >= 3) {
        warnings.push(`High daily workload (${todaysGames.length} games today)`);
      }

      // Check for distance conflicts (multiple distant venues in one day)
      if (game.postal_code && referee.postal_code) {
        const distantVenues = await db('game_assignments')
          .join('games', 'game_assignments.game_id', 'games.id')
          .where('game_assignments.user_id', referee.id)
          .where('games.game_date', game.game_date)
          .whereNot('games.postal_code', game.postal_code)
          .whereIn('game_assignments.status', ['pending', 'accepted'])
          .select('games.location', 'games.postal_code');

        if (distantVenues.length > 0) {
          warnings.push('Multiple venue locations on same day - consider travel time');
        }
      }

      // Check for referee level mismatch (significant over/under qualification)
      const levelMapping = { 'Rookie': 1, 'Junior': 2, 'Senior': 3, 'Elite': 4 };
      const refereeLevel = levelMapping[referee.level] || 1;
      const gameLevel = levelMapping[game.level] || 2;

      if (refereeLevel - gameLevel >= 2) {
        warnings.push('Referee may be overqualified for this game level');
      } else if (gameLevel - refereeLevel >= 2) {
        warnings.push('Referee may need more experience for this game level');
      }

      return {
        hasConflict,
        warnings
      };
    } catch (error) {
      console.warn('Error checking referee conflicts:', error);
      return { hasConflict: false, warnings: [] };
    }
  }

  static async calculateSuggestion(game, referee, factors) {
    // Calculate individual factor scores
    const proximityScore = await this.calculateProximityScore(game, referee);
    const availabilityScore = await this.calculateAvailabilityScore(game, referee);
    const experienceScore = this.calculateExperienceScore(game, referee);
    const performanceScore = await this.calculatePerformanceScore(referee);
    
    // Calculate historical pattern bonus
    const historicalBonus = await this.calculateHistoricalPatternBonus(game, referee);

    // Calculate weighted confidence score with historical learning
    const baseConfidenceScore = (
      (proximityScore * (factors.proximity_weight || 0.3)) +
      (availabilityScore * (factors.availability_weight || 0.4)) +
      (experienceScore * (factors.experience_weight || 0.2)) +
      (performanceScore * (factors.performance_weight || 0.1))
    );

    // Apply historical pattern bonus (up to 10% boost)
    const confidenceScore = Math.min(1, baseConfidenceScore + (historicalBonus * 0.1));

    // Generate enhanced reasoning
    const reasoning = this.generateEnhancedReasoning(
      proximityScore, availabilityScore, experienceScore, performanceScore, historicalBonus
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
      historical_bonus: historicalBonus,
      status: 'pending',
      created_at: new Date()
    };
  }

  static async calculateProximityScore(game, referee) {
    // Enhanced proximity calculation with better distance estimation
    if (!referee.postal_code || !game.postal_code) {
      return 0.5;
    }
    
    // More sophisticated postal code distance calculation
    const refereePostal = referee.postal_code.replace(/\s/g, '').toUpperCase();
    const gamePostal = (game.postal_code || '').replace(/\s/g, '').toUpperCase();
    
    // First 3 characters (forward sortation area in Canada, ZIP code prefix in US)
    const refereeFSA = refereePostal.substring(0, 3);
    const gameFSA = gamePostal.substring(0, 3);
    
    // Same FSA/ZIP prefix = very close (0-15km typically)
    if (refereeFSA === gameFSA) {
      return 0.95;
    }
    
    // Calculate character differences for approximate distance
    let differences = 0;
    for (let i = 0; i < Math.min(refereeFSA.length, gameFSA.length); i++) {
      if (refereeFSA[i] !== gameFSA[i]) {
        differences++;
      }
    }
    
    // Score based on character differences (more differences = farther distance)
    if (differences === 1) {
      return 0.8;
    } // Adjacent areas (~15-30km)
    if (differences === 2) {
      return 0.6;
    } // Nearby areas (~30-50km)
    if (differences === 3) {
      return 0.4;
    } // Distant areas (~50-100km)
    
    return 0.3; // Very distant or unknown
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
    if (game.level === 'Recreational' && refereeScore >= 0.3) {
      return Math.min(1.0, refereeScore + 0.2);
    }
    if (game.level === 'Competitive' && refereeScore >= 0.6) {
      return refereeScore;
    }
    if (game.level === 'Elite' && refereeScore >= 0.9) {
      return refereeScore;
    }
    
    return refereeScore * 0.8; // Penalty for level mismatch
  }

  static async calculatePerformanceScore(referee) {
    // Enhanced performance calculation with workload balancing and historical patterns
    const assignments = await db('game_assignments')
      .where('user_id', referee.id)
      .where('created_at', '>=', db.raw('NOW() - INTERVAL \'6 months\''));

    if (assignments.length === 0) {
      return 0.6;
    } // Neutral score for new referees

    // Calculate completion and decline rates
    const completed = assignments.filter(a => a.status === 'completed').length;
    const declined = assignments.filter(a => a.status === 'declined').length;
    const accepted = assignments.filter(a => a.status === 'accepted').length;
    const total = assignments.length;

    const completionRate = completed / total;
    const declineRate = declined / total;
    const acceptanceRate = (completed + accepted) / total;

    // Calculate recent workload (last 30 days) for balancing
    const recentAssignments = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .where('game_assignments.user_id', referee.id)
      .where('games.game_date', '>=', db.raw('NOW() - INTERVAL \'30 days\''))
      .whereIn('game_assignments.status', ['pending', 'accepted', 'completed']);

    // Workload balancing factor (prefer less loaded referees)
    const recentWorkload = recentAssignments.length;
    const workloadFactor = Math.max(0.2, 1 - (recentWorkload * 0.05)); // Reduce score for overloaded refs

    // Historical success factor
    const reliabilityScore = (acceptanceRate * 0.6) + (completionRate * 0.4) - (declineRate * 0.3);

    // Combine factors with workload balancing
    const baseScore = Math.max(0.1, Math.min(1, reliabilityScore));
    const balancedScore = baseScore * workloadFactor;

    return Math.max(0.1, Math.min(1, balancedScore));
  }

  static async calculateHistoricalPatternBonus(game, referee) {
    // Look for successful historical assignments with similar patterns
    try {
      // Check for successful assignments at the same venue
      const venueHistory = await db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .where('game_assignments.user_id', referee.id)
        .where('games.location', game.location)
        .where('game_assignments.status', 'completed')
        .where('games.game_date', '>=', db.raw('NOW() - INTERVAL \'1 year\''));

      // Check for successful assignments with similar teams
      const teamHistory = await db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .where('game_assignments.user_id', referee.id)
        .where(function() {
          this.where('games.home_team_id', game.home_team_id)
            .orWhere('games.away_team_id', game.away_team_id);
        })
        .where('game_assignments.status', 'completed')
        .where('games.game_date', '>=', db.raw('NOW() - INTERVAL \'1 year\''));

      // Check for successful assignments on same day of week and time
      const gameDate = new Date(game.game_date);
      const dayOfWeek = gameDate.getDay();
      const gameHour = new Date(`${game.game_date} ${game.game_time}`).getHours();

      const timePatternHistory = await db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .where('game_assignments.user_id', referee.id)
        .whereRaw('EXTRACT(DOW FROM games.game_date) = ?', [dayOfWeek])
        .whereRaw('EXTRACT(HOUR FROM games.game_time) BETWEEN ? AND ?', [gameHour - 1, gameHour + 1])
        .where('game_assignments.status', 'completed')
        .where('games.game_date', '>=', db.raw('NOW() - INTERVAL \'6 months\''));

      // Calculate bonus based on historical success patterns
      let bonus = 0;
      
      if (venueHistory.length >= 3) {
        bonus += 0.3;
      } // Strong venue familiarity
      else if (venueHistory.length >= 1) {
        bonus += 0.1;
      } // Some venue experience
      
      if (teamHistory.length >= 2) {
        bonus += 0.2;
      } // Team familiarity
      else if (teamHistory.length >= 1) {
        bonus += 0.1;
      }
      
      if (timePatternHistory.length >= 3) {
        bonus += 0.2;
      } // Good time slot fit
      else if (timePatternHistory.length >= 1) {
        bonus += 0.1;
      }

      return Math.min(1, bonus); // Cap at 1.0
    } catch (error) {
      console.warn('Error calculating historical pattern bonus:', error);
      return 0;
    }
  }

  static generateReasoning(proximity, availability, experience, performance) {
    const reasons = [];
    
    if (proximity >= 0.8) {
      reasons.push('lives close to venue');
    }
    if (availability >= 0.9) {
      reasons.push('explicitly available during time slot');
    }
    if (experience >= 0.8) {
      reasons.push('high experience level for this game type');
    }
    if (performance >= 0.8) {
      reasons.push('excellent past performance and reliability');
    }
    
    if (proximity < 0.5) {
      reasons.push('significant travel distance required');
    }
    if (availability < 0.5) {
      reasons.push('potential availability conflict');
    }
    if (experience < 0.5) {
      reasons.push('may need experience development for this level');
    }
    
    return reasons.length > 0 
      ? reasons.join(', ').replace(/^./, str => str.toUpperCase())
      : 'Standard assignment recommendation based on available data';
  }

  static generateEnhancedReasoning(proximity, availability, experience, performance, historicalBonus) {
    const reasons = [];
    
    // Proximity factors
    if (proximity >= 0.9) {
      reasons.push('very close to venue');
    } else if (proximity >= 0.8) {
      reasons.push('close to venue');
    } else if (proximity < 0.4) {
      reasons.push('significant travel distance');
    }
    
    // Availability factors
    if (availability >= 0.9) {
      reasons.push('explicitly available during time slot');
    } else if (availability >= 0.7) {
      reasons.push('generally available');
    } else if (availability < 0.5) {
      reasons.push('potential availability conflict');
    }
    
    // Experience factors
    if (experience >= 0.9) {
      reasons.push('excellent experience match for game level');
    } else if (experience >= 0.7) {
      reasons.push('good experience level');
    } else if (experience < 0.5) {
      reasons.push('may need development for this level');
    }
    
    // Performance factors
    if (performance >= 0.8) {
      reasons.push('excellent reliability and past performance');
    } else if (performance >= 0.6) {
      reasons.push('good track record');
    } else if (performance < 0.4) {
      reasons.push('limited recent activity or mixed performance');
    }
    
    // Historical pattern bonuses
    if (historicalBonus >= 0.5) {
      reasons.push('strong historical success pattern at this venue/time');
    } else if (historicalBonus >= 0.3) {
      reasons.push('previous successful assignments in similar games');
    } else if (historicalBonus >= 0.1) {
      reasons.push('some relevant experience with venue or teams');
    }

    // Workload considerations
    if (performance < 0.6) {
      reasons.push('balanced workload distribution considered');
    }

    return reasons.length > 0 
      ? reasons.join(', ').replace(/^./, str => str.toUpperCase())
      : 'Standard assignment recommendation with enhanced AI analysis';
  }
}

// POST /api/assignments/ai-suggestions - Generate AI suggestions
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    logger.logInfo('AI suggestions request received', {
      component: 'ai-suggestions',
      operation: 'generate',
      requestId,
      userId: req.user.userId
    });
    
    const { error, value } = generateSuggestionsSchema.validate(req.body);
    if (error) {
      logger.logWarning('Invalid request data for AI suggestions', {
        component: 'ai-suggestions',
        requestId,
        validationError: error.details[0].message
      });
      
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        requestId
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
      logger.logWarning('Some games not found or already assigned', {
        component: 'ai-suggestions',
        requestId,
        requestedGames: game_ids.length,
        foundGames: games.length
      });
      
      return res.status(404).json({
        success: false,
        error: 'One or more games not found or already assigned',
        requestId
      });
    }

    // Clear any expired suggestions for these games
    await db('ai_suggestions')
      .whereIn('game_id', game_ids)
      .where('created_at', '<', db.raw('NOW() - INTERVAL \'1 hour\''))
      .update({ status: 'expired' });

    // Get available referees for all games
    const availableReferees = await db('users')
      .join('referees', 'users.id', 'referees.user_id')
      .where('referees.is_available', true)
      .select('users.*', 'referees.*');

    // Generate new suggestions using enhanced AI service
    const suggestions = await AIAssignmentService.generateSuggestions(games, availableReferees, factors);

    // Store suggestions in database
    const suggestionInserts = suggestions.map(s => ({
      ...s,
      created_by: req.user.userId
    }));

    if (suggestionInserts.length > 0) {
      await db('ai_suggestions').insert(suggestionInserts);
    }

    const duration = Date.now() - startTime;
    
    logger.logAssignment('generate_suggestions', true, {
      requestId,
      duration,
      suggestionsGenerated: suggestions.length,
      gamesProcessed: games.length
    });

    res.json({
      success: true,
      requestId,
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
            past_performance: s.performance_score,
            historical_bonus: s.historical_bonus || 0
          },
          score_breakdown: {
            base_score: Math.round((s.proximity_score * 0.3 + s.availability_score * 0.4 + s.experience_score * 0.2 + s.performance_score * 0.1) * 100),
            proximity_points: Math.round(s.proximity_score * 30),
            availability_points: Math.round(s.availability_score * 40),
            experience_points: Math.round(s.experience_score * 20),
            performance_points: Math.round(s.performance_score * 10),
            historical_bonus_points: Math.round((s.historical_bonus || 0) * 10),
            final_score: Math.round(s.confidence_score * 100)
          },
          conflict_warnings: s.conflict_warnings || [],
          created_at: s.created_at
        }))
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.logError('Error generating AI suggestions', {
      component: 'ai-suggestions',
      operation: 'generate',
      requestId,
      duration,
      userId: req.user.userId
    }, error);
    
    logger.logAssignment('generate_suggestions', false, {
      requestId,
      duration,
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI suggestions',
      requestId
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
      .where('ai_suggestions.created_at', '>=', db.raw('NOW() - INTERVAL \'24 hours\''))
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
            past_performance: s.performance_score,
            historical_bonus: s.historical_bonus || 0
          },
          score_breakdown: {
            base_score: Math.round((s.proximity_score * 0.3 + s.availability_score * 0.4 + s.experience_score * 0.2 + s.performance_score * 0.1) * 100),
            proximity_points: Math.round(s.proximity_score * 30),
            availability_points: Math.round(s.availability_score * 40),
            experience_points: Math.round(s.experience_score * 20),
            performance_points: Math.round(s.performance_score * 10),
            historical_bonus_points: Math.round((s.historical_bonus || 0) * 10),
            final_score: Math.round(s.confidence_score * 100)
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
      .where('created_at', '>=', db.raw('NOW() - INTERVAL \'1 hour\''))
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