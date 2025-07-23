const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');

const refereeSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20),
  location: Joi.string(),
  postal_code: Joi.string().max(10).required(),
  max_distance: Joi.number().integer().min(1).max(200).default(25),
  is_available: Joi.boolean().default(true),
  wage_per_game: Joi.number().min(0).default(0)
});

const refereeUpdateSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string().max(20).allow(''),
  location: Joi.string().allow(''),
  postal_code: Joi.string().max(10).allow(''),
  max_distance: Joi.number().integer().min(1).max(200),
  is_available: Joi.boolean()
});

const adminRefereeUpdateSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string().max(20).allow(''),
  location: Joi.string().allow(''),
  postal_code: Joi.string().max(10).allow(''),
  max_distance: Joi.number().integer().min(1).max(200),
  is_available: Joi.boolean(),
  wage_per_game: Joi.number().min(0)
});

// GET /api/referees - Get all referees with optional filters
router.get('/', async (req, res) => {
  try {
    const { level, postal_code, is_available, page = 1, limit = 50 } = req.query;
    
    let query = db('referees')
      .select('*')
      .orderBy('name', 'asc');

    if (level) {
      query = query.where('level', level);
    }
    
    if (postal_code) {
      query = query.where('postal_code', postal_code);
    }
    
    if (is_available !== undefined) {
      query = query.where('is_available', is_available === 'true');
    }

    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const referees = await query;
    
    res.json({
      data: referees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching referees:', error);
    res.status(500).json({ error: 'Failed to fetch referees' });
  }
});

// GET /api/referees/:id - Get specific referee
router.get('/:id', async (req, res) => {
  try {
    const referee = await db('referees').where('id', req.params.id).first();
    
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    // Get referee's assignments
    const assignments = await db('game_assignments')
      .join('games', 'game_assignments.game_id', 'games.id')
      .join('positions', 'game_assignments.position_id', 'positions.id')
      .select('games.*', 'positions.name as position_name', 'game_assignments.status as assignment_status')
      .where('game_assignments.referee_id', referee.id)
      .orderBy('games.game_date', 'desc');

    referee.assignments = assignments;
    
    res.json(referee);
  } catch (error) {
    console.error('Error fetching referee:', error);
    res.status(500).json({ error: 'Failed to fetch referee' });
  }
});

// POST /api/referees - Create new referee
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = refereeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if email already exists
    const existingReferee = await db('referees').where('email', value.email).first();
    if (existingReferee) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const [referee] = await db('referees').insert(value).returning('*');
    res.status(201).json(referee);
  } catch (error) {
    console.error('Error creating referee:', error);
    res.status(500).json({ error: 'Failed to create referee' });
  }
});

// PUT /api/referees/:id - Update referee (admin can update wage, referees cannot)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or updating their own profile
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = req.user.referee_id === req.params.id || req.user.id === req.params.id;
    
    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Forbidden: Can only update your own profile' });
    }
    
    // Use appropriate schema based on user role
    const schema = isAdmin ? adminRefereeUpdateSchema : refereeUpdateSchema;
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if email already exists for another referee
    const existingReferee = await db('referees')
      .where('email', value.email)
      .where('id', '!=', req.params.id)
      .first();
    
    if (existingReferee) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const [referee] = await db('referees')
      .where('id', req.params.id)
      .update({ ...value, updated_at: new Date() })
      .returning('*');

    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    res.json(referee);
  } catch (error) {
    console.error('Error updating referee:', error);
    res.status(500).json({ error: 'Failed to update referee' });
  }
});

// PATCH /api/referees/:id/availability - Update referee availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { is_available } = req.body;
    
    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available must be a boolean' });
    }

    const [referee] = await db('referees')
      .where('id', req.params.id)
      .update({ is_available, updated_at: new Date() })
      .returning('*');

    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    res.json(referee);
  } catch (error) {
    console.error('Error updating referee availability:', error);
    res.status(500).json({ error: 'Failed to update referee availability' });
  }
});

// GET /api/referees/available/:gameId - Get available referees for a specific game
router.get('/available/:gameId', async (req, res) => {
  try {
    const game = await db('games').where('id', req.params.gameId).first();
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get available referees for the game
    const availableReferees = await db('referees')
      .select('referees.*')
      .where('referees.is_available', true)
      .whereNotExists(function() {
        this.select('*')
          .from('game_assignments')
          .whereRaw('game_assignments.referee_id = referees.id')
          .where('game_assignments.game_id', req.params.gameId);
      });

    res.json(availableReferees);
  } catch (error) {
    console.error('Error fetching available referees:', error);
    res.status(500).json({ error: 'Failed to fetch available referees' });
  }
});

// DELETE /api/referees/:id - Delete referee
router.delete('/:id', async (req, res) => {
  try {
    const deletedCount = await db('referees').where('id', req.params.id).del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Referee not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting referee:', error);
    res.status(500).json({ error: 'Failed to delete referee' });
  }
});

module.exports = router;