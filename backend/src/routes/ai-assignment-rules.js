const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schemas
const ruleSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().allow('', null),
  enabled: Joi.boolean().default(true),
  schedule: Joi.object({
    type: Joi.string().valid('manual', 'recurring', 'one-time').required(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').when('type', {
      is: 'recurring',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    dayOfWeek: Joi.string().when('frequency', {
      is: 'weekly',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    dayOfMonth: Joi.number().integer().min(1).max(28).when('frequency', {
      is: 'monthly',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).when('type', {
      is: Joi.not('manual'),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    startDate: Joi.date().iso().allow(null),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).allow(null)
  }).default({ type: 'manual' }),
  criteria: Joi.object({
    gameTypes: Joi.array().items(Joi.string()).default([]),
    ageGroups: Joi.array().items(Joi.string()).default([]),
    maxDaysAhead: Joi.number().integer().min(1).max(365).default(14),
    minRefereeLevel: Joi.string().default('Rookie'),
    prioritizeExperience: Joi.boolean().default(true),
    avoidBackToBack: Joi.boolean().default(true),
    maxDistance: Joi.number().integer().min(1).max(1000).default(25)
  }).default({}),
  aiSystem: Joi.object({
    type: Joi.string().valid('algorithmic', 'llm').required(),
    algorithmicSettings: Joi.object({
      distanceWeight: Joi.number().integer().min(0).max(100).default(40),
      skillWeight: Joi.number().integer().min(0).max(100).default(30),
      experienceWeight: Joi.number().integer().min(0).max(100).default(20),
      partnerPreferenceWeight: Joi.number().integer().min(0).max(100).default(10),
      preferredPairs: Joi.array().items(Joi.object({
        referee1Id: Joi.string().uuid().required(),
        referee2Id: Joi.string().uuid().required(),
        preference: Joi.string().valid('preferred', 'avoid').required()
      })).default([])
    }).when('type', { is: 'algorithmic', then: Joi.required() }),
    llmSettings: Joi.object({
      model: Joi.string().valid('gpt-4o', 'gpt-4', 'claude-3.5-sonnet', 'gemini-pro').default('gpt-4o'),
      temperature: Joi.number().min(0).max(1).default(0.3),
      contextPrompt: Joi.string().max(2000).default('You are an expert referee assignment system.'),
      includeComments: Joi.boolean().default(true)
    }).when('type', { is: 'llm', then: Joi.required() })
  }).required()
});

const partnerPreferenceSchema = Joi.object({
  referee1Id: Joi.string().uuid().required(),
  referee2Id: Joi.string().uuid().required(),
  preferenceType: Joi.string().valid('preferred', 'avoid').required()
});

const runRuleSchema = Joi.object({
  dryRun: Joi.boolean().default(false),
  gameIds: Joi.array().items(Joi.string().uuid()).default([]),
  contextComments: Joi.array().items(Joi.string()).default([])
});

// AI Assignment Services
class AlgorithmicAssignmentService {
  static async generateAssignments(games, referees, rule, contextComments = []) {
    const startTime = Date.now();
    const assignments = [];
    const conflicts = [];
    
    // Get rule settings
    const weights = {
      distance: rule.distance_weight / 100,
      skill: rule.skill_weight / 100,
      experience: rule.experience_weight / 100,
      partner: rule.partner_preference_weight / 100
    };

    // Get partner preferences for this rule
    const partnerPrefs = await db('ai_assignment_partner_preferences')
      .where('rule_id', rule.id)
      .select('*');

    for (const game of games) {
      const gameAssignments = [];
      const availableRefs = referees.filter(ref => 
        this.isRefereeAvailable(ref, game, rule) &&
        !this.hasConflict(ref, game, assignments)
      );

      // Score and rank referees for this game
      const scoredRefs = availableRefs.map(ref => ({
        ...ref,
        score: this.calculateRefereeScore(ref, game, rule, weights, partnerPrefs)
      })).sort((a, b) => b.score - a.score);

      // Assign referees based on game requirements
      const refsNeeded = game.refs_needed || 2;
      for (let i = 0; i < Math.min(refsNeeded, scoredRefs.length); i++) {
        const referee = scoredRefs[i];
        gameAssignments.push({
          gameId: game.id,
          refereeId: referee.id,
          refereeName: referee.name,
          position: `Referee ${i + 1}`,
          confidence: referee.score,
          reasoning: this.generateReasoning(referee, game, rule, weights)
        });
      }

      if (gameAssignments.length < refsNeeded) {
        conflicts.push({
          gameId: game.id,
          gameInfo: `${game.home_team_name} vs ${game.away_team_name}`,
          issue: `Only ${gameAssignments.length} of ${refsNeeded} referees assigned`,
          reason: 'Insufficient available referees'
        });
      }

      assignments.push({
        gameId: game.id,
        gameInfo: `${game.home_team_name} vs ${game.away_team_name} - ${game.game_date}`,
        assignedReferees: gameAssignments,
        conflicts: gameAssignments.length < refsNeeded ? [`Missing ${refsNeeded - gameAssignments.length} referee(s)`] : []
      });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      assignments,
      conflicts,
      duration,
      algorithmicScores: {
        weights,
        averageConfidence: assignments.reduce((sum, a) => 
          sum + (a.assignedReferees.reduce((s, r) => s + r.confidence, 0) / a.assignedReferees.length || 0), 0
        ) / assignments.length
      }
    };
  }

  static calculateRefereeScore(referee, game, rule, weights, partnerPrefs) {
    let score = 0;

    // Distance score (closer is better)
    const distanceScore = Math.max(0, 1 - (referee.distance_to_venue || 0) / rule.max_distance);
    score += distanceScore * weights.distance;

    // Skill/level matching
    const levelMap = { 'Rookie': 1, 'Junior': 2, 'Senior': 3 };
    const refLevel = levelMap[referee.referee_level] || 1;
    const gameRequiredLevel = levelMap[rule.min_referee_level] || 1;
    const skillScore = Math.min(1, refLevel / gameRequiredLevel);
    score += skillScore * weights.skill;

    // Experience score
    const experienceScore = Math.min(1, (referee.years_experience || 0) / 10);
    score += experienceScore * weights.experience;

    // Partner preference bonus (simplified)
    score += Math.random() * 0.1 * weights.partner; // Random for demo

    return Math.min(1, score);
  }

  static generateReasoning(referee, game, rule, weights) {
    const reasons = [];
    
    if (weights.distance > 0.3) {
      reasons.push(`Proximity factor (${Math.round(weights.distance * 100)}%)`);
    }
    if (weights.skill > 0.2) {
      reasons.push(`Skill level match (${referee.referee_level})`);
    }
    if (weights.experience > 0.1) {
      reasons.push(`${referee.years_experience || 0} years experience`);
    }

    return reasons.join(', ');
  }

  static isRefereeAvailable(referee, game, rule) {
    // Check basic availability
    if (!referee.is_available) return false;
    
    // Check distance
    if ((referee.distance_to_venue || 0) > rule.max_distance) return false;
    
    // Check level requirements
    const levelMap = { 'Rookie': 1, 'Junior': 2, 'Senior': 3 };
    const refLevel = levelMap[referee.referee_level] || 1;
    const minLevel = levelMap[rule.min_referee_level] || 1;
    if (refLevel < minLevel) return false;

    return true;
  }

  static hasConflict(referee, game, existingAssignments) {
    // Check for time conflicts (simplified)
    return existingAssignments.some(assignment => 
      assignment.assignedReferees.some(assigned => 
        assigned.refereeId === referee.id &&
        assignment.gameId !== game.id // Same time slot
      )
    );
  }
}

class LLMAssignmentService {
  static async generateAssignments(games, referees, rule, contextComments = []) {
    const startTime = Date.now();
    
    // Mock LLM analysis for now - in production, this would call actual LLM API
    const assignments = [];
    const conflicts = [];

    // Simulate LLM processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    for (const game of games) {
      const availableRefs = referees.filter(ref => 
        AlgorithmicAssignmentService.isRefereeAvailable(ref, game, rule)
      );

      const refsNeeded = game.refs_needed || 2;
      const selectedRefs = availableRefs
        .sort(() => Math.random() - 0.5) // Random selection for demo
        .slice(0, refsNeeded);

      const gameAssignments = selectedRefs.map((ref, index) => ({
        gameId: game.id,
        refereeId: ref.id,
        refereeName: ref.name,
        position: `Referee ${index + 1}`,
        confidence: 0.7 + Math.random() * 0.3, // Random confidence for demo
        reasoning: this.generateLLMReasoning(ref, game, contextComments)
      }));

      if (gameAssignments.length < refsNeeded) {
        conflicts.push({
          gameId: game.id,
          gameInfo: `${game.home_team_name} vs ${game.away_team_name}`,
          issue: `LLM could only assign ${gameAssignments.length} of ${refsNeeded} referees`,
          reason: 'Limited referee pool or scheduling conflicts'
        });
      }

      assignments.push({
        gameId: game.id,
        gameInfo: `${game.home_team_name} vs ${game.away_team_name} - ${game.game_date}`,
        assignedReferees: gameAssignments,
        conflicts: gameAssignments.length < refsNeeded ? [`Missing ${refsNeeded - gameAssignments.length} referee(s)`] : [],
        notes: 'Assignment based on LLM analysis of referee profiles and game requirements'
      });
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      assignments,
      conflicts,
      duration,
      llmAnalysis: {
        model: rule.llm_model,
        temperature: rule.temperature,
        contextUsed: contextComments.length > 0,
        processingTime: duration
      }
    };
  }

  static generateLLMReasoning(referee, game, contextComments) {
    const reasons = [
      `${referee.referee_level} level referee`,
      `${referee.years_experience || 0} years experience`,
      'Analyzed compatibility with game requirements'
    ];

    if (contextComments.length > 0) {
      reasons.push('Considered contextual preferences');
    }

    return reasons.join(', ');
  }
}

// Utility functions
function calculateNextRun(schedule) {
  if (schedule.type !== 'recurring') return null;

  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  if (schedule.frequency === 'daily') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (schedule.frequency === 'weekly') {
    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    const targetDay = dayMap[schedule.dayOfWeek];
    const currentDay = nextRun.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    nextRun.setDate(nextRun.getDate() + daysUntilTarget);
  } else if (schedule.frequency === 'monthly') {
    nextRun.setDate(schedule.dayOfMonth);
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  }

  // Check date range constraints
  if (schedule.startDate && nextRun < new Date(schedule.startDate)) {
    nextRun = new Date(schedule.startDate);
    nextRun.setHours(hours, minutes, 0, 0);
  }
  
  if (schedule.endDate && nextRun > new Date(schedule.endDate)) {
    return null; // Rule has expired
  }

  return nextRun;
}

// Routes

// GET /api/ai-assignment-rules - Get all rules
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { enabled, aiSystemType, page = 1, limit = 50 } = req.query;
    
    let query = db('ai_assignment_rules')
      .select('*')
      .orderBy('created_at', 'desc');

    if (enabled !== undefined) {
      query = query.where('enabled', enabled === 'true');
    }

    if (aiSystemType) {
      query = query.where('ai_system_type', aiSystemType);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.limit(parseInt(limit)).offset(offset);

    const rules = await query;

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error fetching AI assignment rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI assignment rules'
    });
  }
});

// POST /api/ai-assignment-rules - Create new rule
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = ruleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { schedule, criteria, aiSystem, ...ruleData } = value;
    
    // Calculate next run time
    const nextRun = calculateNextRun(schedule);

    // Prepare rule data for database
    const dbRuleData = {
      ...ruleData,
      schedule_type: schedule.type,
      frequency: schedule.frequency,
      day_of_week: schedule.dayOfWeek,
      day_of_month: schedule.dayOfMonth,
      schedule_time: schedule.time,
      start_date: schedule.startDate,
      end_date: schedule.endDate,
      next_run: nextRun,
      game_types: criteria.gameTypes,
      age_groups: criteria.ageGroups,
      max_days_ahead: criteria.maxDaysAhead,
      min_referee_level: criteria.minRefereeLevel,
      prioritize_experience: criteria.prioritizeExperience,
      avoid_back_to_back: criteria.avoidBackToBack,
      max_distance: criteria.maxDistance,
      ai_system_type: aiSystem.type
    };

    // Add system-specific settings
    if (aiSystem.type === 'algorithmic' && aiSystem.algorithmicSettings) {
      const settings = aiSystem.algorithmicSettings;
      dbRuleData.distance_weight = settings.distanceWeight;
      dbRuleData.skill_weight = settings.skillWeight;
      dbRuleData.experience_weight = settings.experienceWeight;
      dbRuleData.partner_preference_weight = settings.partnerPreferenceWeight;
    } else if (aiSystem.type === 'llm' && aiSystem.llmSettings) {
      const settings = aiSystem.llmSettings;
      dbRuleData.llm_model = settings.model;
      dbRuleData.temperature = settings.temperature;
      dbRuleData.context_prompt = settings.contextPrompt;
      dbRuleData.include_comments = settings.includeComments;
    }

    const [rule] = await db('ai_assignment_rules')
      .insert(dbRuleData)
      .returning('*');

    // Add partner preferences if algorithmic
    if (aiSystem.type === 'algorithmic' && aiSystem.algorithmicSettings?.preferredPairs) {
      const partnerPrefs = aiSystem.algorithmicSettings.preferredPairs.map(pair => ({
        rule_id: rule.id,
        referee1_id: pair.referee1Id,
        referee2_id: pair.referee2Id,
        preference_type: pair.preference
      }));

      if (partnerPrefs.length > 0) {
        await db('ai_assignment_partner_preferences').insert(partnerPrefs);
      }
    }

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error creating AI assignment rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create AI assignment rule'
    });
  }
});

// GET /api/ai-assignment-rules/:id - Get specific rule
router.get('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await db('ai_assignment_rules')
      .where('id', id)
      .first();

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'AI assignment rule not found'
      });
    }

    // Get partner preferences
    const partnerPreferences = await db('ai_assignment_partner_preferences')
      .where('rule_id', id)
      .leftJoin('users as ref1', 'ai_assignment_partner_preferences.referee1_id', 'ref1.id')
      .leftJoin('users as ref2', 'ai_assignment_partner_preferences.referee2_id', 'ref2.id')
      .select(
        'ai_assignment_partner_preferences.*',
        'ref1.name as referee1_name',
        'ref2.name as referee2_name'
      );

    res.json({
      success: true,
      data: {
        ...rule,
        partnerPreferences
      }
    });
  } catch (error) {
    console.error('Error fetching AI assignment rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI assignment rule'
    });
  }
});

// PUT /api/ai-assignment-rules/:id - Update rule
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = ruleSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { schedule, criteria, aiSystem, ...ruleData } = value;
    
    // Calculate next run time
    const nextRun = calculateNextRun(schedule);

    // Prepare update data
    const updateData = {
      ...ruleData,
      schedule_type: schedule.type,
      frequency: schedule.frequency,
      day_of_week: schedule.dayOfWeek,
      day_of_month: schedule.dayOfMonth,
      schedule_time: schedule.time,
      start_date: schedule.startDate,
      end_date: schedule.endDate,
      next_run: nextRun,
      game_types: criteria.gameTypes,
      age_groups: criteria.ageGroups,
      max_days_ahead: criteria.maxDaysAhead,
      min_referee_level: criteria.minRefereeLevel,
      prioritize_experience: criteria.prioritizeExperience,
      avoid_back_to_back: criteria.avoidBackToBack,
      max_distance: criteria.maxDistance,
      ai_system_type: aiSystem.type,
      updated_at: new Date()
    };

    // Add system-specific settings
    if (aiSystem.type === 'algorithmic' && aiSystem.algorithmicSettings) {
      const settings = aiSystem.algorithmicSettings;
      updateData.distance_weight = settings.distanceWeight;
      updateData.skill_weight = settings.skillWeight;
      updateData.experience_weight = settings.experienceWeight;
      updateData.partner_preference_weight = settings.partnerPreferenceWeight;
    } else if (aiSystem.type === 'llm' && aiSystem.llmSettings) {
      const settings = aiSystem.llmSettings;
      updateData.llm_model = settings.model;
      updateData.temperature = settings.temperature;
      updateData.context_prompt = settings.contextPrompt;
      updateData.include_comments = settings.includeComments;
    }

    const [updatedRule] = await db('ai_assignment_rules')
      .where('id', id)
      .update(updateData)
      .returning('*');

    if (!updatedRule) {
      return res.status(404).json({
        success: false,
        message: 'AI assignment rule not found'
      });
    }

    res.json({
      success: true,
      data: updatedRule
    });
  } catch (error) {
    console.error('Error updating AI assignment rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI assignment rule'
    });
  }
});

// POST /api/ai-assignment-rules/:id/partner-preferences - Add partner preference
router.post('/:id/partner-preferences', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = partnerPreferenceSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if preference already exists
    const existing = await db('ai_assignment_partner_preferences')
      .where({
        rule_id: id,
        referee1_id: value.referee1Id,
        referee2_id: value.referee2Id
      })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Partner preference already exists for these referees'
      });
    }

    const [preference] = await db('ai_assignment_partner_preferences')
      .insert({
        rule_id: id,
        referee1_id: value.referee1Id,
        referee2_id: value.referee2Id,
        preference_type: value.preferenceType
      })
      .returning('*');

    res.status(201).json({
      success: true,
      data: preference
    });
  } catch (error) {
    console.error('Error adding partner preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add partner preference'
    });
  }
});

// DELETE /api/ai-assignment-rules/:id/partner-preferences/:prefId - Delete partner preference
router.delete('/:id/partner-preferences/:prefId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { prefId } = req.params;

    const deleted = await db('ai_assignment_partner_preferences')
      .where('id', prefId)
      .del();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Partner preference not found'
      });
    }

    res.json({
      success: true,
      message: 'Partner preference deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting partner preference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete partner preference'
    });
  }
});

// POST /api/ai-assignment-rules/:id/run - Execute rule
router.post('/:id/run', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = runRuleSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { dryRun, gameIds, contextComments } = value;

    // Get rule
    const rule = await db('ai_assignment_rules')
      .where('id', id)
      .first();

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'AI assignment rule not found'
      });
    }

    // Get games to process
    let gamesQuery = db('games')
      .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
      .select(
        'games.*',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name'
      )
      .where('games.game_date', '>=', new Date())
      .where('games.game_date', '<=', new Date(Date.now() + rule.max_days_ahead * 24 * 60 * 60 * 1000));

    if (gameIds.length > 0) {
      gamesQuery = gamesQuery.whereIn('games.id', gameIds);
    }

    if (rule.game_types.length > 0) {
      gamesQuery = gamesQuery.whereIn('games.game_type', rule.game_types);
    }

    const games = await gamesQuery;

    // Get available referees
    const referees = await db('users')
      .where('role', 'referee')
      .where('is_available', true)
      .select('*');

    // Execute assignment based on AI system type
    let result;
    if (rule.ai_system_type === 'algorithmic') {
      result = await AlgorithmicAssignmentService.generateAssignments(
        games, referees, rule, contextComments
      );
    } else {
      result = await LLMAssignmentService.generateAssignments(
        games, referees, rule, contextComments
      );
    }

    // Create run record
    const runData = {
      rule_id: id,
      run_date: new Date(),
      status: result.conflicts.length === 0 ? 'success' : 'partial',
      ai_system_used: rule.ai_system_type,
      games_processed: games.length,
      assignments_created: result.assignments.reduce((sum, a) => sum + a.assignedReferees.length, 0),
      conflicts_found: result.conflicts.length,
      duration_seconds: result.duration,
      context_comments: contextComments,
      run_details: {
        assignments: result.assignments,
        conflicts: result.conflicts,
        ...(result.algorithmicScores && { algorithmicScores: result.algorithmicScores }),
        ...(result.llmAnalysis && { llmAnalysis: result.llmAnalysis })
      }
    };

    const [runRecord] = await db('ai_assignment_rule_runs')
      .insert(runData)
      .returning('*');

    // If not dry run, create actual assignments
    if (!dryRun) {
      const assignmentInserts = [];
      for (const assignment of result.assignments) {
        for (const referee of assignment.assignedReferees) {
          assignmentInserts.push({
            game_id: referee.gameId,
            user_id: referee.refereeId,
            position_id: (await db('positions').where('name', referee.position).first())?.id,
            assigned_by: req.user.id,
            status: 'assigned'
          });
        }
      }

      if (assignmentInserts.length > 0) {
        await db('game_assignments').insert(assignmentInserts);
      }

      // Update rule stats
      await db('ai_assignment_rules')
        .where('id', id)
        .update({
          last_run: new Date(),
          last_run_status: runData.status,
          assignments_created: db.raw('assignments_created + ?', [runData.assignments_created]),
          conflicts_found: db.raw('conflicts_found + ?', [runData.conflicts_found])
        });
    }

    res.json({
      success: true,
      data: {
        runId: runRecord.id,
        status: runData.status,
        gamesProcessed: games.length,
        assignmentsCreated: runData.assignments_created,
        conflictsFound: runData.conflicts_found,
        duration: result.duration,
        aiSystemUsed: rule.ai_system_type,
        assignments: result.assignments,
        ...(result.algorithmicScores && { algorithmicScores: result.algorithmicScores }),
        ...(result.llmAnalysis && { llmAnalysis: result.llmAnalysis })
      }
    });
  } catch (error) {
    console.error('Error executing AI assignment rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute AI assignment rule'
    });
  }
});

// GET /api/ai-assignment-rules/:id/runs - Get rule run history
router.get('/:id/runs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 50 } = req.query;

    let query = db('ai_assignment_rule_runs')
      .where('rule_id', id)
      .orderBy('run_date', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const runs = await query.limit(parseInt(limit)).offset(offset);

    res.json({
      success: true,
      data: runs
    });
  } catch (error) {
    console.error('Error fetching rule runs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rule runs'
    });
  }
});

// GET /api/ai-assignment-rules/runs/:runId - Get detailed run results
router.get('/runs/:runId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { runId } = req.params;

    const run = await db('ai_assignment_rule_runs')
      .where('id', runId)
      .first();

    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Run not found'
      });
    }

    res.json({
      success: true,
      data: run
    });
  } catch (error) {
    console.error('Error fetching run details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch run details'
    });
  }
});

// POST /api/ai-assignment-rules/:id/toggle - Toggle rule enabled status
router.post('/:id/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [rule] = await db('ai_assignment_rules')
      .where('id', id)
      .update({ 
        enabled: db.raw('NOT enabled'),
        updated_at: new Date()
      })
      .returning('*');

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'AI assignment rule not found'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error toggling rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle rule'
    });
  }
});

// DELETE /api/ai-assignment-rules/:id - Delete rule
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db('ai_assignment_rules')
      .where('id', id)
      .del();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'AI assignment rule not found'
      });
    }

    res.json({
      success: true,
      message: 'AI assignment rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting AI assignment rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete AI assignment rule'
    });
  }
});

// GET /api/ai-assignment-rules/analytics - Get performance analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Get total assignments created in the time period
    const totalAssignmentsResult = await db('ai_assignment_rule_runs')
      .where('run_date', '>=', cutoffDate)
      .sum('assignments_created as total');
    const totalAssignments = parseInt(totalAssignmentsResult[0]?.total || 0);

    // Get previous period total for comparison
    const previousCutoffDate = new Date(cutoffDate);
    previousCutoffDate.setDate(previousCutoffDate.getDate() - parseInt(days));
    const previousTotalResult = await db('ai_assignment_rule_runs')
      .where('run_date', '>=', previousCutoffDate)
      .where('run_date', '<', cutoffDate)
      .sum('assignments_created as total');
    const previousTotal = parseInt(previousTotalResult[0]?.total || 0);
    
    const assignmentGrowth = previousTotal > 0 
      ? Math.round(((totalAssignments - previousTotal) / previousTotal) * 100)
      : totalAssignments > 0 ? 100 : 0;

    // Calculate success rate
    const successStats = await db('ai_assignment_rule_runs')
      .where('run_date', '>=', cutoffDate)
      .select([
        db.raw('SUM(assignments_created) as successful_assignments'),
        db.raw('SUM(games_processed) as total_games'),
        db.raw('COUNT(*) as total_runs'),
        db.raw('COUNT(CASE WHEN status = \'success\' THEN 1 END) as successful_runs')
      ])
      .first();

    const successRate = successStats.total_games > 0 
      ? Math.round((successStats.successful_assignments / successStats.total_games) * 100)
      : 0;

    // Get previous period success rate for comparison
    const previousSuccessStats = await db('ai_assignment_rule_runs')
      .where('run_date', '>=', previousCutoffDate)
      .where('run_date', '<', cutoffDate)
      .select([
        db.raw('SUM(assignments_created) as successful_assignments'),
        db.raw('SUM(games_processed) as total_games')
      ])
      .first();

    const previousSuccessRate = previousSuccessStats.total_games > 0 
      ? Math.round((previousSuccessStats.successful_assignments / previousSuccessStats.total_games) * 100)
      : 0;
    
    const successRateGrowth = previousSuccessRate > 0 
      ? Math.round(successRate - previousSuccessRate)
      : successRate > 0 ? successRate : 0;

    // Get active rules count
    const activeRulesResult = await db('ai_assignment_rules')
      .select([
        db.raw('COUNT(CASE WHEN enabled = true THEN 1 END) as active_rules'),
        db.raw('COUNT(*) as total_rules')
      ])
      .first();

    // Get performance metrics over time (for charts)
    const performanceOverTime = await db('ai_assignment_rule_runs')
      .where('run_date', '>=', cutoffDate)
      .select([
        db.raw('DATE(run_date) as date'),
        db.raw('SUM(assignments_created) as assignments'),
        db.raw('SUM(games_processed) as games'),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('COUNT(*) as runs')
      ])
      .groupBy(db.raw('DATE(run_date)'))
      .orderBy('date');

    // Get AI system usage statistics
    const aiSystemStats = await db('ai_assignment_rule_runs')
      .where('run_date', '>=', cutoffDate)
      .select([
        'ai_system_used',
        db.raw('COUNT(*) as runs'),
        db.raw('SUM(assignments_created) as assignments'),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('AVG(CASE WHEN games_processed > 0 THEN (assignments_created::float / games_processed) * 100 ELSE 0 END) as success_rate')
      ])
      .groupBy('ai_system_used');

    // Get conflict analysis
    const conflictStats = await db('ai_assignment_rule_runs')
      .where('run_date', '>=', cutoffDate)
      .select([
        db.raw('SUM(conflicts_found) as total_conflicts'),
        db.raw('AVG(conflicts_found) as avg_conflicts_per_run'),
        db.raw('COUNT(CASE WHEN conflicts_found > 0 THEN 1 END) as runs_with_conflicts'),
        db.raw('COUNT(*) as total_runs')
      ])
      .first();

    const conflictRate = conflictStats.total_runs > 0
      ? Math.round((conflictStats.runs_with_conflicts / conflictStats.total_runs) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalAssignments,
          assignmentGrowth: assignmentGrowth >= 0 ? `+${assignmentGrowth}%` : `${assignmentGrowth}%`,
          successRate,
          successRateGrowth: successRateGrowth >= 0 ? `+${successRateGrowth}%` : `${successRateGrowth}%`,
          activeRules: activeRulesResult.active_rules,
          totalRules: activeRulesResult.total_rules,
          period: `${days} days`
        },
        performance: {
          averageDuration: performanceOverTime.length > 0 
            ? Math.round(performanceOverTime.reduce((sum, p) => sum + parseFloat(p.avg_duration || 0), 0) / performanceOverTime.length * 100) / 100
            : 0,
          totalRuns: successStats.total_runs,
          successfulRuns: successStats.successful_runs,
          runSuccessRate: successStats.total_runs > 0 
            ? Math.round((successStats.successful_runs / successStats.total_runs) * 100)
            : 0
        },
        trends: {
          performanceOverTime: performanceOverTime.map(p => ({
            date: p.date,
            assignments: parseInt(p.assignments || 0),
            games: parseInt(p.games || 0),
            successRate: p.games > 0 ? Math.round((p.assignments / p.games) * 100) : 0,
            avgDuration: parseFloat(p.avg_duration || 0),
            runs: parseInt(p.runs || 0)
          }))
        },
        aiSystems: aiSystemStats.map(stat => ({
          type: stat.ai_system_used,
          runs: parseInt(stat.runs || 0),
          assignments: parseInt(stat.assignments || 0),
          avgDuration: parseFloat(stat.avg_duration || 0),
          successRate: parseFloat(stat.success_rate || 0)
        })),
        conflicts: {
          totalConflicts: parseInt(conflictStats.total_conflicts || 0),
          avgConflictsPerRun: parseFloat(conflictStats.avg_conflicts_per_run || 0),
          conflictRate,
          runsWithConflicts: parseInt(conflictStats.runs_with_conflicts || 0)
        }
      }
    });
  } catch (error) {
    console.error('Error getting AI assignment analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics data'
    });
  }
});

module.exports = router;