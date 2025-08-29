const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const Joi = require('joi');
const { authenticateToken, getUserPermissions } = require('../middleware/auth');
const { authLimiter, registrationLimiter, passwordResetLimiter } = require('../middleware/rateLimiting');
const { sanitizeAll } = require('../middleware/sanitization');
const { asyncHandler, AuthenticationError, ValidationError } = require('../middleware/errorHandling');
const { createAuditLog, AUDIT_EVENTS } = require('../middleware/auditTrail');
const LocationDataService = require('../services/LocationDataService');
const { ProductionMonitor } = require('../utils/monitor');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'referee').required(),
  // For referee registration, include user data directly
  name: Joi.when('role', {
    is: 'referee',
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  phone: Joi.string().max(20).optional(),
  location: Joi.string().optional(),
  postal_code: Joi.when('role', {
    is: 'referee',
    then: Joi.string().max(10).required(),
    otherwise: Joi.string().optional()
  }),
  max_distance: Joi.number().integer().min(1).max(200).default(25),
  referee_level_id: Joi.string().uuid().optional(),
  years_experience: Joi.number().integer().min(0).max(50).optional(),
  notes: Joi.string().optional()
});

// POST /api/auth/login
router.post('/login', authLimiter, sanitizeAll, asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password } = value;

  // Find user
  const user = await db('users').where('email', email).first();
  if (!user) {
    await createAuditLog({
      event_type: AUDIT_EVENTS.AUTH_LOGIN_FAILURE,
      user_email: email,
      ip_address: req.headers['x-forwarded-for'] || req.ip,
      user_agent: req.headers['user-agent'],
      success: false,
      error_message: 'Invalid credentials - user not found'
    });
    
    // Track critical path
    ProductionMonitor.logCriticalPath('auth.failure', {
      reason: 'user_not_found',
      email: email,
      ip: req.headers['x-forwarded-for'] || req.ip
    });
    
    throw new AuthenticationError('Invalid credentials');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    await createAuditLog({
      event_type: AUDIT_EVENTS.AUTH_LOGIN_FAILURE,
      user_id: user.id,
      user_email: email,
      ip_address: req.headers['x-forwarded-for'] || req.ip,
      user_agent: req.headers['user-agent'],
      success: false,
      error_message: 'Invalid credentials - wrong password'
    });
    
    // Track critical path
    ProductionMonitor.logCriticalPath('auth.failure', {
      reason: 'invalid_password',
      userId: user.id,
      ip: req.headers['x-forwarded-for'] || req.ip
    });
    
    throw new AuthenticationError('Invalid credentials');
  }

  // Get user permissions for the new RBAC system
  let permissions = [];
  try {
    permissions = await getUserPermissions(user.id);
  } catch (error) {
    console.warn('Failed to get user permissions during login:', error.message);
    // Don't fail login if permission retrieval fails
  }

  // Generate JWT token (include roles array for new system)
  const token = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,  // Keep for backward compatibility
      roles: user.roles || [user.role], // New roles array
      permissions: permissions.map(p => p.code || p.name) // Include permission codes in JWT
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Prepare user data (all referee data is now in the users table)
  const userData = {
    id: user.id,
    email: user.email,
    role: user.role, // Keep for backward compatibility
    roles: user.roles || [user.role], // New roles array
    permissions: permissions, // Include full permission objects
    name: user.name,
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

  // Log successful login
  await createAuditLog({
    event_type: AUDIT_EVENTS.AUTH_LOGIN_SUCCESS,
    user_id: user.id,
    user_email: email,
    ip_address: req.headers['x-forwarded-for'] || req.ip,
    user_agent: req.headers['user-agent'],
    success: true
  });
  
  // Track critical path
  ProductionMonitor.logCriticalPath('auth.login', {
    userId: user.id,
    role: user.role,
    ip: req.headers['x-forwarded-for'] || req.ip
  });

  res.json({
    token,
    user: userData
  });
}));

// POST /api/auth/register
router.post('/register', registrationLimiter, sanitizeAll, asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { 
    email, 
    password, 
    role, 
    name, 
    phone, 
    location, 
    postal_code, 
    max_distance,
    referee_level_id,
    years_experience,
    notes
  } = value;

  // Check if user already exists
  const existingUser = await db('users').where('email', email).first();
  if (existingUser) {
    throw new ValidationError('Email already registered');
  }

  // Hash password
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  const trx = await db.transaction();
  
  try {
    // Prepare user data
    const userData = {
      email,
      password_hash,
      role
    };

    // Add referee-specific fields if registering as referee
    if (role === 'referee') {
      userData.name = name;
      userData.phone = phone;
      userData.location = location;
      userData.postal_code = postal_code;
      userData.max_distance = max_distance || 25;
      userData.referee_level_id = referee_level_id;
      userData.years_experience = years_experience;
      userData.notes = notes;
      userData.is_available = true; // Default to available
      userData.games_refereed_season = 0; // Default to 0
    }

    // Create user
    const [user] = await trx('users').insert(userData).returning('*');

    await trx.commit();

    // If referee with postal code, create location data asynchronously
    if (role === 'referee' && postal_code) {
      // Don't await this as it can take time and might fail
      // Run location data creation in background
      setImmediate(async () => {
        try {
          const locationService = new LocationDataService();
          await locationService.createOrUpdateUserLocation(
            user.id, 
            location || postal_code
          );
          console.log(`Location data created for new user ${user.id}`);
        } catch (error) {
          console.error(`Failed to create location data for user ${user.id}:`, error.message);
        }
      });
    }

    // Prepare response user data
    const responseUserData = {
      id: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role],
      permissions: permissions,
      name: user.name,
      phone: user.phone,
      location: user.location,
      postal_code: user.postal_code,
      max_distance: user.max_distance,
      is_available: user.is_available
    };

    // Get user permissions for the new RBAC system
    let permissions = [];
    try {
      permissions = await getUserPermissions(user.id);
    } catch (error) {
      console.warn('Failed to get user permissions during registration:', error.message);
      // Don't fail registration if permission retrieval fails
    }

    // Generate JWT token (include roles array for new system)
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, // Keep for backward compatibility
        roles: user.roles || [user.role], // New roles array
        permissions: permissions.map(p => p.code || p.name) // Include permission codes in JWT
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Log successful registration
    await createAuditLog({
      event_type: AUDIT_EVENTS.AUTH_REGISTER,
      user_id: user.id,
      user_email: email,
      ip_address: req.headers['x-forwarded-for'] || req.ip,
      user_agent: req.headers['user-agent'],
      success: true,
      additional_data: { role: role }
    });
    
    // Track critical path
    ProductionMonitor.logCriticalPath('auth.register', {
      userId: user.id,
      role: role,
      ip: req.headers['x-forwarded-for'] || req.ip
    });
    
    // Track referee registration specifically
    if (role === 'referee') {
      ProductionMonitor.logCriticalPath('referee.registered', {
        userId: user.id,
        postalCode: postal_code,
        maxDistance: max_distance
      });
    }

    res.status(201).json({
      token,
      user: responseUserData
    });
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}));

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db('users')
      .select('*') // Select all fields to ensure we have everything we need
      .where('id', req.user.id)
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user permissions for the new RBAC system
    let permissions = [];
    try {
      permissions = await getUserPermissions(user.id);
    } catch (error) {
      console.warn('Failed to get user permissions for profile:', error.message);
      // Don't fail profile retrieval if permission retrieval fails
    }

    const userData = {
      id: user.id,
      email: user.email,
      role: user.role, // Keep for backward compatibility
      roles: user.roles || [user.role], // New roles array
      permissions: permissions, // Include full permission objects
      name: user.name,
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

    res.json({ user: userData });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// POST /api/auth/refresh-permissions - Refresh user permissions
router.post('/refresh-permissions', authenticateToken, async (req, res) => {
  try {
    // Get fresh permissions from database (bypass cache)
    const permissions = await getUserPermissions(req.user.id, false);

    res.json({
      success: true,
      data: { permissions },
      message: 'Permissions refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing permissions:', error);
    res.status(500).json({ 
      error: 'Failed to refresh permissions',
      details: error.message 
    });
  }
});

module.exports = router;