/**
 * @fileoverview Authentication routes with comprehensive TypeScript typing
 * @description Secure authentication endpoints with JWT, RBAC, rate limiting, and audit logging
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { Knex } from 'knex';

// Types
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  ProfileResponse,
  RefreshPermissionsResponse,
  ApiResponse
} from '../types/api.types';
import { JWTPayload, AuthenticatedUser, AuthenticatedRequest } from '../types/auth.types';
import { UUID, Timestamp } from '../types';

// Services and Database
import db from '../config/database';

// Middleware imports
import { authenticateToken, getUserPermissions } from '../middleware/auth';
import { authLimiter, registrationLimiter, passwordResetLimiter } from '../middleware/rateLimiting';
import { sanitizeAll } from '../middleware/sanitization';
import { asyncHandler, AuthenticationError, ValidationError } from '../middleware/errorHandling';
import { createAuditLog, AUDIT_EVENTS } from '../middleware/auditTrail';

// Services
const LocationDataService = require('../services/LocationDataService');
const { ProductionMonitor } = require('../utils/monitor');

// Validation schemas with enhanced security
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
  year_started_refereeing: Joi.number().integer().min(1970).max(new Date().getFullYear()).optional(),
  notes: Joi.string().optional()
});

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
const login = async (
  req: Request<{}, LoginResponse, LoginRequest>, 
  res: Response<LoginResponse | ApiResponse>
): Promise<void> => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password }: LoginRequest = value;

  // Find user with comprehensive error handling
  const user = await db('users').where('email', email).first();
  if (!user) {
    await createAuditLog({
      event_type: AUDIT_EVENTS.AUTH_LOGIN_FAILURE,
      user_email: email,
      ip_address: req.headers['x-forwarded-for'] as string || req.ip,
      user_agent: req.headers['user-agent'],
      success: false,
      error_message: 'Invalid credentials - user not found'
    });
    
    // Track critical path for security monitoring
    ProductionMonitor.logCriticalPath('auth.failure', {
      reason: 'user_not_found',
      email: email,
      ip: req.headers['x-forwarded-for'] || req.ip
    });
    
    throw new AuthenticationError('Invalid credentials');
  }

  // Secure password comparison
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    await createAuditLog({
      event_type: AUDIT_EVENTS.AUTH_LOGIN_FAILURE,
      user_id: user.id,
      user_email: email,
      ip_address: req.headers['x-forwarded-for'] as string || req.ip,
      user_agent: req.headers['user-agent'],
      success: false,
      error_message: 'Invalid credentials - wrong password'
    });
    
    ProductionMonitor.logCriticalPath('auth.failure', {
      reason: 'invalid_password',
      userId: user.id,
      ip: req.headers['x-forwarded-for'] || req.ip
    });
    
    throw new AuthenticationError('Invalid credentials');
  }

  // Get user permissions with error handling
  let permissions: string[] = [];
  
  try {
    permissions = await getUserPermissions(user.id);
  } catch (error) {
    console.warn('Failed to get user permissions during login:', (error as Error).message);
    // Don't fail login if permission retrieval fails
  }

  // Get user roles from RBAC system
  let userRoles: string[] = [];
  try {
    const roleRecords = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .where('roles.is_active', true)
      .select('roles.name', 'roles.id');
    
    userRoles = roleRecords.map((r: any) => r.name);
  } catch (error) {
    console.warn('Failed to get user roles during login:', (error as Error).message);
    userRoles = [];
  }

  if (userRoles.length === 0) {
    console.warn(`User ${user.email} has no roles assigned`);
  }

  // Generate JWT token with comprehensive payload
  const jwtPayload: Omit<JWTPayload, 'iat' | 'exp'> = { 
    userId: user.id, 
    email: user.email, 
    role: user.role, // Keep legacy role for backwards compatibility
    permissions: permissions
  };

  const token = jwt.sign(
    {
      ...jwtPayload,
      roles: userRoles, // New RBAC roles array
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Prepare comprehensive user response data
  const userData: LoginResponse['user'] = {
    id: user.id,
    email: user.email,
    roles: userRoles,
    permissions: permissions,
    name: user.name,
    phone: user.phone,
    location: user.location,
    postal_code: user.postal_code,
    max_distance: user.max_distance,
    is_available: user.is_available,
    wage_per_game: user.wage_per_game,
    referee_level_id: user.referee_level_id,
    year_started_refereeing: user.year_started_refereeing,
    games_refereed_season: user.games_refereed_season,
    evaluation_score: user.evaluation_score,
    notes: user.notes,
    created_at: user.created_at as Timestamp,
    updated_at: user.updated_at as Timestamp
  };

  // Log successful authentication
  await createAuditLog({
    event_type: AUDIT_EVENTS.AUTH_LOGIN_SUCCESS,
    user_id: user.id,
    user_email: email,
    ip_address: req.headers['x-forwarded-for'] as string || req.ip,
    user_agent: req.headers['user-agent'],
    success: true
  });
  
  ProductionMonitor.logCriticalPath('auth.login', {
    userId: user.id,
    roles: userRoles,
    ip: req.headers['x-forwarded-for'] || req.ip
  });

  res.json({
    token,
    user: userData
  });
};

/**
 * POST /api/auth/register
 * Register new user with role-based validation
 */
const register = async (
  req: Request<{}, ApiResponse<LoginResponse['user']>, RegisterRequest>, 
  res: Response<ApiResponse<LoginResponse['user']>>
): Promise<void> => {
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
    year_started_refereeing,
    notes
  }: RegisterRequest = value;

  // Check for existing user
  const existingUser = await db('users').where('email', email).first();
  if (existingUser) {
    throw new ValidationError('Email already registered');
  }

  // Secure password hashing
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  const trx = await db.transaction();
  
  try {
    // Prepare user data with type safety
    const userData: any = {
      email,
      password_hash,
      role
    };

    // Add referee-specific fields with validation
    if (role === 'referee') {
      userData.name = name;
      userData.phone = phone;
      userData.location = location;
      userData.postal_code = postal_code;
      userData.max_distance = max_distance || 25;
      userData.referee_level_id = referee_level_id;
      userData.year_started_refereeing = year_started_refereeing;
      userData.notes = notes;
      userData.is_available = true;
      userData.games_refereed_season = 0;
    }

    // Create user with transaction safety
    const [user] = await trx('users').insert(userData).returning('*');
    await trx.commit();

    // Background location data creation for referees
    if (role === 'referee' && postal_code) {
      setImmediate(async () => {
        try {
          const locationService = new LocationDataService();
          await locationService.createOrUpdateUserLocation(
            user.id, 
            location || postal_code
          );
          console.log(`Location data created for new user ${user.id}`);
        } catch (error) {
          console.error(`Failed to create location data for user ${user.id}:`, (error as Error).message);
        }
      });
    }

    // Get user permissions for new user
    let permissions: string[] = [];
    
    try {
      permissions = await getUserPermissions(user.id);
    } catch (error) {
      console.warn('Failed to get user permissions during registration:', (error as Error).message);
    }

    // Generate JWT for new user
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        roles: [], // New users start with empty roles array
        permissions: permissions
      },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Prepare response data
    const responseUserData: LoginResponse['user'] = {
      id: user.id,
      email: user.email,
      roles: [],
      permissions: permissions,
      name: user.name,
      phone: user.phone,
      location: user.location,
      postal_code: user.postal_code,
      max_distance: user.max_distance,
      is_available: user.is_available,
      wage_per_game: user.wage_per_game,
      referee_level_id: user.referee_level_id,
      year_started_refereeing: user.year_started_refereeing,
      games_refereed_season: user.games_refereed_season,
      evaluation_score: user.evaluation_score,
      notes: user.notes,
      created_at: user.created_at as Timestamp,
      updated_at: user.updated_at as Timestamp
    };

    // Audit successful registration
    await createAuditLog({
      event_type: AUDIT_EVENTS.AUTH_REGISTER,
      user_id: user.id,
      user_email: email,
      ip_address: req.headers['x-forwarded-for'] as string || req.ip,
      user_agent: req.headers['user-agent'],
      success: true,
      additional_data: { role: role }
    });
    
    ProductionMonitor.logCriticalPath('auth.register', {
      userId: user.id,
      role: role,
      ip: req.headers['x-forwarded-for'] || req.ip
    });
    
    if (role === 'referee') {
      ProductionMonitor.logCriticalPath('referee.registered', {
        userId: user.id,
        postalCode: postal_code,
        maxDistance: max_distance
      });
    }

    res.status(201).json({
      success: true,
      data: responseUserData
    });
  } catch (error) {
    await trx.rollback();
    throw error;
  }
};

/**
 * GET /api/auth/me
 * Get current user profile with comprehensive data
 */
const getProfile = async (
  req: AuthenticatedRequest, 
  res: Response<ProfileResponse>
): Promise<void> => {
  const user = await db('users')
    .select('*')
    .where('id', req.user.id)
    .first();

  if (!user) {
    res.status(404).json({ 
      user: {} as ProfileResponse['user'] 
    });
    return;
  }

  // Get comprehensive user permissions
  let permissions: string[] = [];
  
  try {
    permissions = await getUserPermissions(user.id);
  } catch (error) {
    console.warn('Failed to get user permissions for profile:', (error as Error).message);
  }

  // Get current user roles
  let userRoles: string[] = [];
  try {
    const roleRecords = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .where('roles.is_active', true)
      .select('roles.name', 'roles.id');
    
    userRoles = roleRecords.map((r: any) => r.name);
  } catch (error) {
    console.warn('Failed to get user roles for profile:', (error as Error).message);
    userRoles = [];
  }

  const userData: ProfileResponse['user'] = {
    id: user.id,
    email: user.email,
    roles: userRoles,
    permissions: permissions,
    name: user.name,
    phone: user.phone,
    location: user.location,
    postal_code: user.postal_code,
    max_distance: user.max_distance,
    is_available: user.is_available,
    wage_per_game: user.wage_per_game,
    referee_level_id: user.referee_level_id,
    year_started_refereeing: user.year_started_refereeing,
    games_refereed_season: user.games_refereed_season,
    evaluation_score: user.evaluation_score,
    notes: user.notes,
    created_at: user.created_at as Timestamp,
    updated_at: user.updated_at as Timestamp
  };

  res.json({ user: userData });
};

/**
 * POST /api/auth/refresh-permissions
 * Refresh user permissions cache
 */
const refreshPermissions = async (
  req: AuthenticatedRequest, 
  res: Response<RefreshPermissionsResponse>
): Promise<void> => {
  // Get fresh permissions from database (bypass cache)
  const permissions = await getUserPermissions(req.user.id, false);

  res.json({
    success: true,
    data: { permissions },
    message: 'Permissions refreshed successfully'
  });
};

// Route definitions with middleware and proper typing
router.post('/login', 
  authLimiter, 
  sanitizeAll, 
  asyncHandler(login)
);

router.post('/register', 
  registrationLimiter, 
  sanitizeAll, 
  asyncHandler(register)
);

router.get('/me', 
  authenticateToken, 
  asyncHandler(getProfile)
);

router.post('/refresh-permissions', 
  authenticateToken, 
  asyncHandler(refreshPermissions)
);

export default router;