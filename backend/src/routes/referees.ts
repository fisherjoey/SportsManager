/**
 * @fileoverview Referees Routes - TypeScript Implementation
 * @description Express routes for referee management with comprehensive functionality
 * including CRUD operations, profile management, role assignments, and advanced features.
 */

import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Database, UUID, AuthenticatedRequest, PaginatedResult } from '../types';
import { authenticateToken, requireRole, requirePermission, requireAnyPermission } from '../middleware/auth';
import { ResponseFormatter } from '../utils/response-formatters';
import { enhancedAsyncHandler } from '../middleware/enhanced-error-handling';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { UserSchemas, RefereeSchemas, FilterSchemas, IdParamSchema } from '../utils/validation-schemas';
import { ErrorFactory } from '../utils/errors';
import { UserService } from '../services/UserService';
import RefereeService from '../services/RefereeService';
import db from '../config/database';

const router = express.Router();

// Type definitions for this route module
interface RefereeListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  referee_type?: 'Senior Referee' | 'Junior Referee' | 'Rookie Referee';
  wage_min?: number;
  wage_max?: number;
  experience_min?: number;
  is_white_whistle?: boolean;
  is_available?: boolean;
}

interface RefereeUpdateBody {
  name?: string;
  email?: string;
  phone?: string;
  is_available?: boolean;
  wage_amount?: number;
  [key: string]: any;
}

interface AvailabilityUpdateBody {
  is_available: boolean;
}

interface LevelUpdateBody {
  new_referee_level: string;
  is_white_whistle?: boolean;
}

interface RoleActionBody {
  action: 'assign' | 'remove';
  role_name: string;
}

interface WageUpdateBody {
  wage_amount: number;
  notes?: string;
}

interface TypeChangeBody {
  referee_type: 'Senior Referee' | 'Junior Referee' | 'Rookie Referee';
  update_wage_to_default?: boolean;
  reason?: string;
}

interface ProfileCreateBody {
  referee_type: 'Senior Referee' | 'Junior Referee' | 'Rookie Referee';
  wage_amount?: number;
  year_started_refereeing?: number;
  certification_number?: string;
  certification_date?: Date;
  certification_expiry?: Date;
  certification_level?: string;
  emergency_contact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  special_qualifications?: string[];
  notes?: string;
}

interface ProfileUpdateBody {
  year_started_refereeing?: number;
  evaluation_score?: number;
  certification_number?: string;
  certification_date?: Date;
  certification_expiry?: Date;
  certification_level?: string;
  is_white_whistle?: boolean;
  max_weekly_games?: number;
  preferred_positions?: string[];
  availability_pattern?: Record<string, any>;
  emergency_contact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  special_qualifications?: string[];
  notes?: string;
  is_active?: boolean;
}

// Initialize services
const userService = new UserService(db);
const refereeService = new RefereeService(db);

// Route initialization function (kept for backwards compatibility)
export function initializeRoutes(database: Database): express.Router {
  return router;
}

// GET /api/referees/test - Simple test endpoint
router.get('/test', (req: Request, res: Response): void => {
  res.json({
    message: 'Referees API is working',
    timestamp: new Date().toISOString()
  });
});

// GET /api/referees - Get all referees with optional filters and pagination
router.get('/',
  authenticateToken,
  requireAnyPermission(['referees:read', 'referees:manage']),
  validateQuery(Joi.object<RefereeListQueryParams>({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().trim().max(255),
    referee_type: Joi.string().valid('Senior Referee', 'Junior Referee', 'Rookie Referee'),
    wage_min: Joi.number().min(0),
    wage_max: Joi.number().min(0),
    experience_min: Joi.number().integer().min(0),
    is_white_whistle: Joi.boolean(),
    is_available: Joi.boolean()
  })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, any, RefereeListQueryParams>, res: Response): Promise<void> => {
    const { page = 1, limit = 50, ...filters } = req.query;

    // Use RefereeService to get paginated profiles with enhanced data
    const result: PaginatedResult<any> = await refereeService.getRefereeProfiles(filters, page, limit);

    ResponseFormatter.sendSuccess(res, result, 'Referees retrieved successfully');
  })
);

// GET /api/referees/:id - Get specific referee with enhanced profile data
router.get('/:id',
  authenticateToken,
  requireAnyPermission(['referees:read', 'referees:manage']),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }>, res: Response): Promise<void> => {
    const refereeId = req.params.id;

    // Use RefereeService to get complete referee profile
    const profile = await refereeService.getRefereeProfile(refereeId, { includeUser: true });

    if (!profile) {
      throw ErrorFactory.notFound('Referee profile not found', refereeId);
    }

    // Get assignment data for backward compatibility
    const assignmentData = await userService.getUserWithRefereeDetails(refereeId, {
      assignmentLimit: 50
    });

    const enhancedProfile = {
      ...profile,
      // Include assignment data if available
      assignments: assignmentData?.recent_assignments || [],
      assignment_stats: assignmentData?.assignment_stats || {}
    };

    ResponseFormatter.sendSuccess(res, enhancedProfile, 'Referee profile retrieved successfully');
  })
);

// POST /api/referees - Create new referee
router.post('/',
  authenticateToken,
  requireAnyPermission(['referees:create', 'referees:manage']),
  validateBody(UserSchemas.create),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, any>, res: Response): Promise<void> => {
    // Ensure role is set to referee
    const value = { ...req.body, role: 'referee' };

    // Use UserService to create referee with proper defaults
    const referee = await userService.createReferee(value);

    ResponseFormatter.sendCreated(
      res,
      referee,
      'Referee created successfully',
      `/api/referees/${referee.id}`
    );
  })
);

// PUT /api/referees/:id - Update referee (admin can update wage, referees cannot)
router.put('/:id',
  authenticateToken,
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, RefereeUpdateBody>, res: Response): Promise<void> => {
    const refereeId = req.params.id;

    // Check if user is admin or updating their own profile
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = (req.user as any).referee_id === refereeId || req.user.id === refereeId;

    if (!isAdmin && !isOwnProfile) {
      throw ErrorFactory.forbidden('Can only update your own profile');
    }

    // Use appropriate schema based on user role
    const schema = isAdmin ? UserSchemas.adminUpdate : UserSchemas.update;
    const { error, value } = schema.validate(req.body);
    if (error) {
      throw ErrorFactory.fromJoiError(error);
    }

    // Check if email already exists for another user
    if (value.email) {
      const existingUsers = await userService.findWhere({ email: value.email });
      const existingUser = existingUsers.find(user => user.id !== refereeId);

      if (existingUser) {
        throw ErrorFactory.conflict('Email already exists', { email: value.email });
      }
    }

    // Verify referee exists before update
    const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
    if (!existingReferee || existingReferee.role !== 'referee') {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    // Use UserService to update referee
    const updatedReferee = await userService.update(refereeId, value);

    ResponseFormatter.sendSuccess(res, updatedReferee, 'Referee updated successfully');
  })
);

// PATCH /api/referees/:id/availability - Update referee availability
router.patch('/:id/availability',
  validateParams(IdParamSchema),
  validateBody(Joi.object<AvailabilityUpdateBody>({
    is_available: Joi.boolean().required()
  })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, AvailabilityUpdateBody>, res: Response): Promise<void> => {
    const { is_available } = req.body;
    const refereeId = req.params.id;

    // Use UserService to update availability
    const updatedReferee = await userService.updateAvailability(refereeId, is_available);

    ResponseFormatter.sendSuccess(res, updatedReferee, 'Referee availability updated successfully');
  })
);

// GET /api/referees/available/:gameId - Get available referees for a specific game
router.get('/available/:gameId',
  validateParams(IdParamSchema.keys({ gameId: Joi.string().uuid().required() })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ gameId: UUID }>, res: Response): Promise<void> => {
    const gameId = req.params.gameId;

    // First verify the game exists
    const game = await db('games').where('id', gameId).first();
    if (!game) {
      throw ErrorFactory.notFound('Game', gameId);
    }

    // Use UserService to find available referees for the specific game date/time
    const availableReferees = await userService.findAvailableReferees(
      game.game_date,
      game.game_time,
      {
        level: game.level,
        location: game.location
      }
    );

    // Filter out referees already assigned to this specific game
    const assignedRefereeIds = await db('game_assignments')
      .where('game_id', gameId)
      .pluck('user_id');

    const filteredReferees = availableReferees.filter(
      referee => !assignedRefereeIds.includes(referee.id)
    );

    ResponseFormatter.sendSuccess(res, filteredReferees, 'Available referees retrieved successfully');
  })
);

// PATCH /api/referees/:id/level - Update referee level
router.patch('/:id/level',
  authenticateToken,
  requirePermission('referees:manage'),
  validateParams(IdParamSchema),
  validateBody(UserSchemas.levelUpdate),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, LevelUpdateBody>, res: Response): Promise<void> => {
    const refereeId = req.params.id;
    const { new_referee_level, is_white_whistle } = req.body;

    // Verify referee exists
    const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
    if (!existingReferee || existingReferee.role !== 'referee') {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    // Update referee level using UserService
    const updatedReferee = await userService.updateRefereeLevel(
      refereeId,
      new_referee_level,
      is_white_whistle
    );

    ResponseFormatter.sendSuccess(
      res,
      updatedReferee,
      `Referee level updated to ${new_referee_level} successfully`
    );
  })
);

// PATCH /api/referees/:id/roles - Manage referee roles
router.patch('/:id/roles',
  authenticateToken,
  requirePermission('referees:manage'),
  validateParams(IdParamSchema),
  validateBody(Joi.object<RoleActionBody>({
    action: Joi.string().valid('assign', 'remove').required(),
    role_name: Joi.string().required()
  })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, RoleActionBody>, res: Response): Promise<void> => {
    const refereeId = req.params.id;
    const { action, role_name } = req.body;

    // Verify referee exists
    const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
    if (!existingReferee || existingReferee.role !== 'referee') {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    try {
      if (action === 'assign') {
        await userService.assignRefereeRole(refereeId, role_name, req.user.id);
        ResponseFormatter.sendSuccess(
          res,
          null,
          `Role '${role_name}' assigned successfully`
        );
      } else if (action === 'remove') {
        // Prevent removal of default 'Referee' role
        if (role_name === 'Referee') {
          throw ErrorFactory.forbidden('Cannot remove default Referee role');
        }

        const success = await userService.removeRefereeRole(refereeId, role_name);
        if (!success) {
          throw ErrorFactory.notFound('Role assignment not found');
        }

        ResponseFormatter.sendSuccess(
          res,
          null,
          `Role '${role_name}' removed successfully`
        );
      }
    } catch (error: any) {
      if (error.message.includes('already has role') ||
          error.message.includes('not found')) {
        throw ErrorFactory.conflict(error.message);
      }
      throw error;
    }
  })
);

// GET /api/referees/:id/white-whistle-status - Get white whistle display status
router.get('/:id/white-whistle-status',
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }>, res: Response): Promise<void> => {
    const refereeId = req.params.id;

    // Get referee with level information
    const referee = await userService.getUserWithRefereeDetails(refereeId);

    if (!referee || referee.role !== 'referee') {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    const status = {
      user_id: referee.id,
      name: referee.name,
      current_level: (referee as any).new_referee_level || (referee as any).level_name,
      is_white_whistle: (referee as any).is_white_whistle,
      should_display_white_whistle: (referee as any).should_display_white_whistle,
      white_whistle_logic: {
        rookie: 'Always displays white whistle',
        junior: 'Displays based on individual flag',
        senior: 'Never displays white whistle'
      }
    };

    ResponseFormatter.sendSuccess(
      res,
      status,
      'White whistle status retrieved successfully'
    );
  })
);

// DELETE /api/referees/:id - Delete referee
router.delete('/:id',
  authenticateToken,
  requirePermission('referees:delete'),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }>, res: Response): Promise<void> => {
    const refereeId = req.params.id;

    // Verify referee exists before deletion
    const existingReferee = await userService.findById(refereeId, { select: ['id', 'role'] });
    if (!existingReferee || existingReferee.role !== 'referee') {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    // Use UserService to delete referee
    const deleted = await userService.delete(refereeId);

    if (!deleted) {
      throw ErrorFactory.notFound('Referee', refereeId);
    }

    ResponseFormatter.sendSuccess(res, null, 'Referee deleted successfully');
  })
);

// GET /api/referees/levels/summary - Get summary of referee levels
router.get('/levels/summary',
  authenticateToken,
  requireAnyPermission(['referees:read', 'referees:manage']),
  enhancedAsyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Get referee level distribution
    const levelDistribution = await db('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .select(
        'referee_levels.name as level_name',
        'users.new_referee_level',
        db.raw('COUNT(*) as count')
      )
      .join('user_roles', 'users.id', 'user_roles.user_id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .whereIn('roles.name', ['Referee', 'Senior Referee'])
      .groupBy('referee_levels.name', 'users.new_referee_level')
      .orderBy('referee_levels.name');

    // Get white whistle statistics
    const whiteWhistleStats = await db('users')
      .select(
        'new_referee_level',
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN is_white_whistle = true THEN 1 END) as with_white_whistle')
      )
      .join('user_roles', 'users.id', 'user_roles.user_id')
      .join('roles as r2', 'user_roles.role_id', 'r2.id')
      .whereIn('r2.name', ['Referee', 'Senior Referee'])
      .whereNotNull('new_referee_level')
      .groupBy('new_referee_level')
      .orderBy('new_referee_level');

    // Get role distribution
    const roleDistribution = await db('user_referee_roles')
      .join('referee_roles', 'user_referee_roles.referee_role_id', 'referee_roles.id')
      .join('users', 'user_referee_roles.user_id', 'users.id')
      .select(
        'referee_roles.name as role_name',
        db.raw('COUNT(*) as count')
      )
      .where('user_referee_roles.is_active', true)
      .where('referee_roles.is_active', true)
      .join('user_roles', 'users.id', 'user_roles.user_id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .whereIn('roles.name', ['Referee', 'Senior Referee'])
      .groupBy('referee_roles.name')
      .orderBy('referee_roles.name');

    const summary = {
      level_distribution: levelDistribution,
      white_whistle_stats: whiteWhistleStats,
      role_distribution: roleDistribution,
      level_system: {
        rookie: 'Always displays white whistle',
        junior: 'Conditionally displays white whistle',
        senior: 'Never displays white whistle'
      }
    };

    ResponseFormatter.sendSuccess(res, summary, 'Referee levels summary retrieved successfully');
  })
);

// ===== NEW ENHANCED REFEREE SYSTEM ENDPOINTS =====

// GET /api/referees/:id/profile - Get complete referee profile
router.get('/:id/profile',
  authenticateToken,
  requireAnyPermission(['referees:read', 'referees:manage']),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }>, res: Response): Promise<void> => {
    const refereeId = req.params.id;

    const profile = await refereeService.getRefereeProfile(refereeId, { includeUser: true });
    if (!profile) {
      throw ErrorFactory.notFound('Referee profile not found', refereeId);
    }

    ResponseFormatter.sendSuccess(res, { profile }, 'Referee profile retrieved successfully');
  })
);

// PUT /api/referees/:id/wage - Update individual referee wage
router.put('/:id/wage',
  authenticateToken,
  requireAnyPermission(['referees:update', 'referees:manage']),
  validateParams(IdParamSchema),
  validateBody(Joi.object<WageUpdateBody>({
    wage_amount: Joi.number().positive().precision(2).max(500).required(),
    notes: Joi.string().max(500).optional()
  })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, WageUpdateBody>, res: Response): Promise<void> => {
    const refereeId = req.params.id;
    const { wage_amount, notes } = req.body;

    await refereeService.updateWage(refereeId, wage_amount, req.user.id, { notes });

    ResponseFormatter.sendSuccess(res, {}, 'Referee wage updated successfully');
  })
);

// PUT /api/referees/:id/type - Change referee type (role reassignment)
router.put('/:id/type',
  authenticateToken,
  requirePermission('referees:manage'),
  validateParams(IdParamSchema),
  validateBody(Joi.object<TypeChangeBody>({
    referee_type: Joi.string()
      .valid('Senior Referee', 'Junior Referee', 'Rookie Referee')
      .required(),
    update_wage_to_default: Joi.boolean().default(false),
    reason: Joi.string().max(255).optional()
  })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, TypeChangeBody>, res: Response): Promise<void> => {
    const refereeId = req.params.id;
    const { referee_type, update_wage_to_default, reason } = req.body;

    const result = await refereeService.changeRefereeType(
      refereeId,
      referee_type,
      req.user.id,
      {
        updateWageToDefault: update_wage_to_default
      }
    );

    ResponseFormatter.sendSuccess(res, result, 'Referee type updated successfully');
  })
);

// GET /api/referees/types - Get available referee types with configurations
router.get('/types',
  authenticateToken,
  requireAnyPermission(['referees:read', 'referees:manage']),
  enhancedAsyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const types = await refereeService.getRefereeTypes();

    ResponseFormatter.sendSuccess(res, { types }, 'Referee types retrieved successfully');
  })
);

// GET /api/referees/capabilities - Get available referee capabilities
router.get('/capabilities',
  authenticateToken,
  requireAnyPermission(['referees:read', 'referees:manage']),
  enhancedAsyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const capabilities = await refereeService.getUserRefereeCapabilities(req.user.id);

    ResponseFormatter.sendSuccess(res, { capabilities }, 'Referee capabilities retrieved successfully');
  })
);

// POST /api/referees/:id/profile - Create referee profile (when assigning referee role)
router.post('/:id/profile',
  authenticateToken,
  requirePermission('referees:manage'),
  validateParams(IdParamSchema),
  validateBody(Joi.object<ProfileCreateBody>({
    referee_type: Joi.string()
      .valid('Senior Referee', 'Junior Referee', 'Rookie Referee')
      .required(),
    wage_amount: Joi.number().positive().precision(2).max(500).optional(),
    year_started_refereeing: Joi.number().integer().min(1970).max(new Date().getFullYear()).optional(),
    certification_number: Joi.string().max(50).optional(),
    certification_date: Joi.date().optional(),
    certification_expiry: Joi.date().optional(),
    certification_level: Joi.string().max(50).optional(),
    emergency_contact: Joi.object({
      name: Joi.string().max(100).optional(),
      phone: Joi.string().max(20).optional(),
      relationship: Joi.string().max(50).optional()
    }).optional(),
    special_qualifications: Joi.array().items(Joi.string()).optional(),
    notes: Joi.string().max(1000).optional()
  })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, ProfileCreateBody>, res: Response): Promise<void> => {
    const userId = req.params.id;
    const profileData = req.body;
    const { referee_type, ...initialData } = profileData;

    // Get the referee type role
    const refereeTypeRole = await db('roles')
      .where({ name: referee_type, category: 'referee_type' })
      .first();

    if (!refereeTypeRole) {
      throw ErrorFactory.conflict(`Invalid referee type: ${referee_type}`);
    }

    // Create the referee profile
    const profile = await refereeService.createRefereeProfile(
      userId,
      refereeTypeRole,
      initialData as any
    );

    // Assign the referee type role
    await db('user_roles').insert({
      user_id: userId,
      role_id: refereeTypeRole.id,
      assigned_by: req.user.id,
      assigned_at: new Date(),
      is_active: true
    });

    ResponseFormatter.sendCreated(
      res,
      profile,
      'Referee profile created successfully',
      `/api/referees/${userId}/profile`
    );
  })
);

// PATCH /api/referees/:id/profile - Update referee profile
router.patch('/:id/profile',
  authenticateToken,
  requireAnyPermission(['referees:update', 'referees:manage']),
  validateParams(IdParamSchema),
  validateBody(Joi.object<ProfileUpdateBody>({
    year_started_refereeing: Joi.number().integer().min(1970).max(new Date().getFullYear()).optional(),
    evaluation_score: Joi.number().min(0).max(100).optional(),
    certification_number: Joi.string().max(50).optional(),
    certification_date: Joi.date().optional(),
    certification_expiry: Joi.date().optional(),
    certification_level: Joi.string().max(50).optional(),
    is_white_whistle: Joi.boolean().optional(),
    max_weekly_games: Joi.number().integer().min(1).max(20).optional(),
    preferred_positions: Joi.array().items(Joi.string()).optional(),
    availability_pattern: Joi.object().optional(),
    emergency_contact: Joi.object({
      name: Joi.string().max(100).optional(),
      phone: Joi.string().max(20).optional(),
      relationship: Joi.string().max(50).optional()
    }).optional(),
    special_qualifications: Joi.array().items(Joi.string()).optional(),
    notes: Joi.string().max(1000).optional(),
    is_active: Joi.boolean().optional()
  })),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, ProfileUpdateBody>, res: Response): Promise<void> => {
    const userId = req.params.id;
    const updateData = req.body;

    // Get current profile
    const profiles = await refereeService.findWhere({ user_id: userId, is_active: true });
    if (!profiles.length) {
      throw ErrorFactory.notFound('Referee profile not found');
    }

    // Update profile
    const updatedProfile = await refereeService.update(profiles[0].id, updateData as any);

    ResponseFormatter.sendSuccess(res, updatedProfile, 'Referee profile updated successfully');
  })
);

// GET /api/referees/:id/white-whistle - Get enhanced white whistle status
router.get('/:id/white-whistle',
  authenticateToken,
  requireAnyPermission(['referees:read', 'referees:manage']),
  validateParams(IdParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }>, res: Response): Promise<void> => {
    const refereeId = req.params.id;

    const [refereeType, profile, showWhiteWhistle] = await Promise.all([
      refereeService.getRefereeType(refereeId),
      refereeService.getRefereeProfile(refereeId),
      refereeService.shouldDisplayWhiteWhistle(refereeId)
    ]);

    if (!refereeType || !profile) {
      throw ErrorFactory.notFound('Referee not found or has no profile');
    }

    const status = {
      user_id: refereeId,
      referee_type: refereeType.name,
      individual_flag: profile.is_white_whistle,
      should_display: showWhiteWhistle,
      business_logic: {
        [refereeType.name]: refereeType.referee_config?.white_whistle || 'unknown'
      },
      explanation: showWhiteWhistle
        ? `White whistle displayed based on ${refereeType.name} rules`
        : `White whistle not displayed for ${refereeType.name}`
    };

    ResponseFormatter.sendSuccess(res, status, 'White whistle status retrieved successfully');
  })
);

export default router;