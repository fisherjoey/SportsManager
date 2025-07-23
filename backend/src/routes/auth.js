const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'referee').required(),
  referee_data: Joi.when('role', {
    is: 'referee',
    then: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().max(20),
      level: Joi.string().valid('Recreational', 'Competitive', 'Elite').required(),
      location: Joi.string(),
      postal_code: Joi.string().max(10).required(),
      max_distance: Joi.number().integer().min(1).max(200).default(25)
    }).required(),
    otherwise: Joi.forbidden()
  })
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Find user
    const user = await db('users').where('email', email).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token (include roles array for new system)
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,  // Keep for backward compatibility
        roles: user.roles || [user.role] // New roles array
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Prepare user data (all referee data is now in the users table)
    let userData = {
      id: user.id,
      email: user.email,
      role: user.role, // Keep for backward compatibility
      roles: user.roles || [user.role] // New roles array
    };

    if (user.role === 'referee' || user.role === 'admin') {
      // Get referee record to include proper referee_id
      const referee = await db('referees').where('user_id', user.id).first();
      if (referee) {
        userData.referee_id = referee.id;
        userData.referee = {
          id: referee.id,
          user_id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: user.location,
          postal_code: user.postal_code,
          max_distance: user.max_distance,
          is_available: user.is_available,
          wage_per_game: user.wage_per_game,
          referee_level_id: user.referee_level_id,
          years_experience: user.years_experience,
          games_refereed_season: user.games_refereed_season,
          evaluation_score: user.evaluation_score,
          notes: user.notes,
          created_at: user.created_at,
          updated_at: user.updated_at
        };
      }
    }

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, role, referee_data } = value;

    // Check if user already exists
    const existingUser = await db('users').where('email', email).first();
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const trx = await db.transaction();
    
    try {
      // Create user
      const [user] = await trx('users').insert({
        email,
        password_hash,
        role
      }).returning('*');

      let userData = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      // If registering as referee, create referee record
      if (role === 'referee' && referee_data) {
        const [referee] = await trx('referees').insert({
          user_id: user.id,
          email: email, // Use same email as user
          ...referee_data
        }).returning('*');
        
        userData.referee = referee;
      }

      await trx.commit();

      // Generate JWT token (include roles array for new system)
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role, // Keep for backward compatibility
          roles: user.roles || [user.role] // New roles array
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        token,
        user: userData
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error during registration:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db('users')
      .select('*') // Select all fields to ensure we have everything we need
      .where('id', req.user.userId)
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userData = {
      id: user.id,
      email: user.email,
      role: user.role, // Keep for backward compatibility
      roles: user.roles || [user.role], // New roles array
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    if (user.role === 'referee' || user.role === 'admin') {
      // Include referee fields if they exist (they're in the users table now)
      userData.referee = {
        id: user.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        postal_code: user.postal_code,
        max_distance: user.max_distance,
        is_available: user.is_available,
        wage_per_game: user.wage_per_game,
        referee_level_id: user.referee_level_id,
        years_experience: user.years_experience,
        games_refereed_season: user.games_refereed_season,
        evaluation_score: user.evaluation_score,
        notes: user.notes,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    }

    res.json({ user: userData });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router;