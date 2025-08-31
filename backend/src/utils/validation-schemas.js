const Joi = require('joi');

/**
 * @fileoverview Shared validation schemas for consistent input validation across the API
 * @description This module provides standardized Joi validation schemas for common entities
 * and operations in the Sports Management App backend. These schemas ensure consistent
 * validation rules and error messages across all routes.
 */

/**
 * Common patterns and constraints used across schemas
 */
const COMMON_PATTERNS = {
  TIME: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  POSTAL_CODE: /^[A-Za-z0-9\s-]{3,10}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/
};

/**
 * Base schemas for common field types
 */
const BaseSchemas = {
  id: Joi.string().uuid().required(),
  optionalId: Joi.string().uuid().optional(),
  name: Joi.string().min(1).max(100).trim().required(),
  optionalName: Joi.string().min(1).max(100).trim().optional(),
  email: Joi.string().email().lowercase().required(),
  optionalEmail: Joi.string().email().lowercase().optional(),
  phone: Joi.string().pattern(COMMON_PATTERNS.PHONE).max(20).optional(),
  postalCode: Joi.string().pattern(COMMON_PATTERNS.POSTAL_CODE).required(),
  optionalPostalCode: Joi.string().pattern(COMMON_PATTERNS.POSTAL_CODE).optional(),
  time: Joi.string().pattern(COMMON_PATTERNS.TIME).required(),
  date: Joi.date().required(),
  optionalDate: Joi.date().optional(),
  currency: Joi.number().precision(2).min(0).required(),
  optionalCurrency: Joi.number().precision(2).min(0).optional(),
  description: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional()
};

/**
 * User-related validation schemas
 */
const UserSchemas = {
  /**
   * Schema for user creation
   */
  create: Joi.object({
    name: BaseSchemas.name,
    email: BaseSchemas.email,
    password: Joi.string().min(8).max(128).required(),
    role: Joi.string().valid('admin', 'assignor', 'referee', 'manager').default('referee'),
    phone: BaseSchemas.phone,
    postal_code: BaseSchemas.postalCode,
    max_distance: Joi.number().integer().min(1).max(500).default(25),
    is_available: Joi.boolean().default(true),
    white_whistle: Joi.boolean().default(false)
  }),

  /**
   * Schema for user updates
   */
  update: Joi.object({
    name: BaseSchemas.optionalName,
    email: BaseSchemas.optionalEmail,
    phone: BaseSchemas.phone,
    postal_code: BaseSchemas.optionalPostalCode,
    max_distance: Joi.number().integer().min(1).max(500).optional(),
    is_available: Joi.boolean().optional(),
    white_whistle: Joi.boolean().optional(),
    availability_strategy: Joi.string().valid('WHITELIST', 'BLACKLIST').optional()
  }),

  /**
   * Schema for admin user updates (more permissive)
   */
  adminUpdate: Joi.object({
    name: BaseSchemas.optionalName,
    email: BaseSchemas.optionalEmail,
    phone: BaseSchemas.phone,
    postal_code: BaseSchemas.optionalPostalCode,
    max_distance: Joi.number().integer().min(1).max(500).optional(),
    is_available: Joi.boolean().optional(),
    white_whistle: Joi.boolean().optional(),
    availability_strategy: Joi.string().valid('WHITELIST', 'BLACKLIST').optional(),
    role: Joi.string().valid('admin', 'assignor', 'referee', 'manager').optional(),
    wage_per_game: Joi.number().min(0).optional()
  })
};

/**
 * Game-related validation schemas
 */
const GameSchemas = {
  /**
   * Team schema used within games
   */
  team: Joi.object({
    organization: Joi.string().required(),
    ageGroup: Joi.string().required(),
    gender: Joi.string().valid('Boys', 'Girls').required(),
    rank: Joi.number().integer().min(1).required()
  }),

  /**
   * Schema for game creation
   */
  create: Joi.object({
    homeTeam: Joi.object({
      organization: Joi.string().required(),
      ageGroup: Joi.string().required(),
      gender: Joi.string().valid('Boys', 'Girls').required(),
      rank: Joi.number().integer().min(1).required()
    }).required(),
    awayTeam: Joi.object({
      organization: Joi.string().required(),
      ageGroup: Joi.string().required(),
      gender: Joi.string().valid('Boys', 'Girls').required(),
      rank: Joi.number().integer().min(1).required()
    }).required(),
    date: BaseSchemas.date,
    time: BaseSchemas.time,
    location: Joi.string().required(),
    postalCode: BaseSchemas.postalCode,
    level: Joi.string().required(),
    gameType: Joi.string().valid('Community', 'Club', 'Tournament', 'Private Tournament').default('Community'),
    division: Joi.string().required(),
    season: Joi.string().required(),
    payRate: BaseSchemas.currency,
    refsNeeded: Joi.number().integer().min(1).max(10).default(2),
    wageMultiplier: Joi.number().min(0.1).max(5.0).default(1.0),
    wageMultiplierReason: Joi.string().allow('').optional()
  }),

  /**
   * Schema for game updates (all fields optional)
   */
  update: Joi.object({
    homeTeam: Joi.object({
      organization: Joi.string().required(),
      ageGroup: Joi.string().required(),
      gender: Joi.string().valid('Boys', 'Girls').required(),
      rank: Joi.number().integer().min(1).required()
    }).optional(),
    awayTeam: Joi.object({
      organization: Joi.string().required(),
      ageGroup: Joi.string().required(),
      gender: Joi.string().valid('Boys', 'Girls').required(),
      rank: Joi.number().integer().min(1).required()
    }).optional(),
    date: BaseSchemas.optionalDate,
    time: Joi.string().pattern(COMMON_PATTERNS.TIME).optional(),
    location: Joi.string().optional(),
    postalCode: BaseSchemas.optionalPostalCode,
    level: Joi.string().optional(),
    gameType: Joi.string().valid('Community', 'Club', 'Tournament', 'Private Tournament').optional(),
    division: Joi.string().optional(),
    season: Joi.string().optional(),
    payRate: BaseSchemas.optionalCurrency,
    refsNeeded: Joi.number().integer().min(1).max(10).optional(),
    wageMultiplier: Joi.number().min(0.1).max(5.0).optional(),
    wageMultiplierReason: Joi.string().allow('').optional()
  })
};

/**
 * Assignment-related validation schemas
 */
const AssignmentSchemas = {
  /**
   * Schema for assignment creation
   */
  create: Joi.object({
    game_id: BaseSchemas.id,
    user_id: BaseSchemas.id,
    position_id: BaseSchemas.id,
    assigned_by: BaseSchemas.optionalId,
    status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').default('pending'),
    calculated_wage: BaseSchemas.optionalCurrency
  }),

  /**
   * Schema for assignment updates
   */
  update: Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').optional(),
    calculated_wage: BaseSchemas.optionalCurrency
  }),

  /**
   * Schema for bulk assignment operations
   */
  bulk: Joi.object({
    assignments: Joi.array().items(Joi.object({
      game_id: BaseSchemas.id,
      user_id: BaseSchemas.id,
      position_id: BaseSchemas.id,
      status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').default('pending')
    })).min(1).max(100).required()
  })
};

/**
 * Budget-related validation schemas
 */
const BudgetSchemas = {
  /**
   * Schema for budget period creation
   */
  period: Joi.object({
    name: BaseSchemas.name,
    description: BaseSchemas.description,
    start_date: BaseSchemas.date,
    end_date: Joi.date().greater(Joi.ref('start_date')).required(),
    budget_limit: BaseSchemas.currency,
    is_active: Joi.boolean().default(true)
  }),

  /**
   * Schema for budget item creation
   */
  item: Joi.object({
    name: BaseSchemas.name,
    description: BaseSchemas.description,
    category: Joi.string().required(),
    budgeted_amount: BaseSchemas.currency,
    actual_amount: BaseSchemas.optionalCurrency
  })
};

/**
 * Pagination validation schema
 */
const PaginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(300).default(50),
  sort_by: Joi.string().optional(),
  sort_order: Joi.string().valid('asc', 'desc').default('asc')
});

/**
 * Common filter schemas
 */
const FilterSchemas = {
  /**
   * Date range filter
   */
  dateRange: Joi.object({
    date_from: BaseSchemas.optionalDate,
    date_to: BaseSchemas.optionalDate
  }),

  /**
   * Game filters
   */
  games: Joi.object({
    status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled').optional(),
    level: Joi.string().optional(),
    game_type: Joi.string().valid('Community', 'Club', 'Tournament', 'Private Tournament').optional(),
    postal_code: BaseSchemas.optionalPostalCode,
    date_from: BaseSchemas.optionalDate,
    date_to: BaseSchemas.optionalDate
  }).concat(PaginationSchema),

  /**
   * Referee filters
   */
  referees: Joi.object({
    level: Joi.string().optional(),
    postal_code: BaseSchemas.optionalPostalCode,
    is_available: Joi.boolean().optional(),
    search: Joi.string().min(1).max(100).optional(),
    white_whistle: Joi.boolean().optional()
  }).concat(PaginationSchema),

  /**
   * Assignment filters
   */
  assignments: Joi.object({
    game_id: BaseSchemas.optionalId,
    gameId: BaseSchemas.optionalId,
    user_id: BaseSchemas.optionalId,
    referee_id: BaseSchemas.optionalId,
    refereeId: BaseSchemas.optionalId,
    status: Joi.string().valid('pending', 'accepted', 'declined', 'completed').optional(),
    date_from: BaseSchemas.optionalDate,
    date_to: BaseSchemas.optionalDate
  }).concat(PaginationSchema)
};

/**
 * ID parameter validation schema
 */
const IdParamSchema = Joi.object({
  id: BaseSchemas.id
});

/**
 * Authentication and authorization schemas
 */
const AuthSchemas = {
  /**
   * Login schema
   */
  login: Joi.object({
    email: BaseSchemas.email,
    password: Joi.string().required()
  }),

  /**
   * Registration schema
   */
  register: Joi.object({
    name: BaseSchemas.name,
    email: BaseSchemas.email,
    password: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    phone: BaseSchemas.phone,
    postal_code: BaseSchemas.postalCode
  }),

  /**
   * Password reset schema
   */
  passwordReset: Joi.object({
    email: BaseSchemas.email
  }),

  /**
   * Password update schema
   */
  passwordUpdate: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  })
};

/**
 * File upload schemas
 */
const FileSchemas = {
  /**
   * Receipt upload schema
   */
  receipt: Joi.object({
    description: BaseSchemas.description,
    category: Joi.string().required(),
    amount: BaseSchemas.optionalCurrency
  })
};

/**
 * Referee-specific validation schemas
 */
const RefereeSchemas = {
  /**
   * Schema for referee level assignment
   */
  levelAssignment: Joi.object({
    user_id: Joi.string().uuid().required(),
    new_referee_level: Joi.string().valid('Rookie', 'Junior', 'Senior').required(),
    is_white_whistle: Joi.boolean().optional()
  }),

  /**
   * Schema for referee role assignment
   */
  roleAssignment: Joi.object({
    user_id: Joi.string().uuid().required(),
    role_name: Joi.string().required()
  }),

  /**
   * Schema for creating/updating referee roles
   */
  roleDefinition: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(500).optional(),
    permissions: Joi.object({
      can_officiate: Joi.boolean().default(false),
      can_evaluate: Joi.boolean().default(false),
      can_mentor: Joi.boolean().default(false),
      can_assign: Joi.boolean().default(false),
      can_inspect: Joi.boolean().default(false),
      can_audit: Joi.boolean().default(false),
      can_be_assigned: Joi.boolean().default(true),
      receives_full_fee: Joi.boolean().default(false),
      has_admin_access: Joi.boolean().default(false),
      has_scheduling_access: Joi.boolean().default(false),
      can_view_all_games: Joi.boolean().default(false),
      can_coordinate: Joi.boolean().default(false),
      is_default: Joi.boolean().default(false)
    }).default({}),
    is_active: Joi.boolean().default(true)
  })
};

/**
 * Availability schemas
 */
const AvailabilitySchemas = {
  /**
   * Availability creation schema
   */
  create: Joi.object({
    start_date: BaseSchemas.date,
    end_date: BaseSchemas.date,
    start_time: BaseSchemas.time,
    end_time: BaseSchemas.time,
    is_available: Joi.boolean().required(),
    max_games: Joi.number().integer().min(0).max(10).optional(),
    preferred_locations: Joi.array().items(Joi.string()).optional(),
    comments: Joi.string().max(500).optional()
  }),

  /**
   * Availability update schema
   */
  update: Joi.object({
    start_date: BaseSchemas.optionalDate,
    end_date: BaseSchemas.optionalDate,
    start_time: Joi.string().pattern(COMMON_PATTERNS.TIME).optional(),
    end_time: Joi.string().pattern(COMMON_PATTERNS.TIME).optional(),
    is_available: Joi.boolean().optional(),
    max_games: Joi.number().integer().min(0).max(10).optional(),
    preferred_locations: Joi.array().items(Joi.string()).optional(),
    comments: Joi.string().max(500).optional()
  })
};

module.exports = {
  // Base schemas
  BaseSchemas,
  COMMON_PATTERNS,
  
  // Entity schemas
  UserSchemas,
  RefereeSchemas,
  GameSchemas,
  AssignmentSchemas,
  BudgetSchemas,
  AuthSchemas,
  FileSchemas,
  AvailabilitySchemas,
  
  // Utility schemas
  PaginationSchema,
  FilterSchemas,
  IdParamSchema
};