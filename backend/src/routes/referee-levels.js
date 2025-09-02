const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

const refereeLevelSchema = Joi.object({
  name: Joi.string().required(),
  wage_amount: Joi.number().min(0).required(),
  description: Joi.string(),
  allowed_divisions: Joi.array().items(Joi.string()),
  experience_requirements: Joi.object(),
  capability_requirements: Joi.object()
});

// GET /api/referee-levels - Get all referee levels
router.get('/', async (req, res) => {
  try {
    const levels = await db('referee_levels').select('*').orderBy('wage_amount', 'asc');
    res.json({ success: true, data: levels });
  } catch (error) {
    console.error('Error fetching referee levels:', error);
    res.status(500).json({ error: 'Failed to fetch referee levels' });
  }
});

// PUT /api/referee-levels/:refereeId/assign - Assign referee to a level (admin only)
router.put('/:refereeId/assign', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { referee_level_id, year_started_refereeing, evaluation_score, notes } = req.body;
    
    // Validate referee level exists
    const level = await db('referee_levels').where('id', referee_level_id).first();
    if (!level) {
      return res.status(404).json({ error: 'Referee level not found' });
    }
    
    // Update referee with new level and wage
    const [referee] = await db('referees')
      .where('id', req.params.refereeId)
      .update({
        referee_level_id,
        wage_per_game: level.wage_amount,
        year_started_refereeing: year_started_refereeing,
        evaluation_score,
        notes,
        updated_at: new Date()
      })
      .returning('*');
    
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }
    
    res.json({ 
      success: true, 
      data: { referee },
      message: `Referee assigned to ${level.name} level ($${level.wage_amount} per game)`
    });
  } catch (error) {
    console.error('Error assigning referee level:', error);
    res.status(500).json({ error: 'Failed to assign referee level' });
  }
});

// GET /api/referee-levels/check-assignment/:gameId/:refereeId - Check if referee can be assigned to game
router.get('/check-assignment/:gameId/:refereeId', authenticateToken, async (req, res) => {
  try {
    const { gameId, refereeId } = req.params;
    
    // Get game details
    const game = await db('games').where('id', gameId).first();
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Get referee with level info
    const referee = await db('referees')
      .leftJoin('referee_levels', 'referees.referee_level_id', 'referee_levels.id')
      .select(
        'referees.*',
        'referee_levels.name as level_name',
        'referee_levels.allowed_divisions'
      )
      .where('referees.id', refereeId)
      .first();
    
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }
    
    let canAssign = true;
    let warning = null;
    
    // Check if referee level allows this game division
    if (referee.allowed_divisions) {
      const allowedDivisions = JSON.parse(referee.allowed_divisions);
      if (!allowedDivisions.includes(game.level)) {
        canAssign = false;
        warning = `Referee level "${referee.level_name}" is not qualified for ${game.level} games. Allowed divisions: ${allowedDivisions.join(', ')}`;
      }
    } else {
      warning = 'Referee has no assigned level. Please assign a level before scheduling games.';
    }
    
    res.json({
      success: true,
      data: {
        canAssign,
        warning,
        referee_level: referee.level_name,
        game_level: game.level,
        allowed_divisions: referee.allowed_divisions ? JSON.parse(referee.allowed_divisions) : []
      }
    });
  } catch (error) {
    console.error('Error checking assignment:', error);
    res.status(500).json({ error: 'Failed to check assignment eligibility' });
  }
});

module.exports = router;