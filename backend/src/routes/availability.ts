/**
 * @fileoverview Availability Routes - TypeScript Implementation
 * @description Express routes for referee availability management with comprehensive functionality
 * including CRUD operations, conflict checking, and bulk operations.
 */

import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Database, UUID, AuthenticatedRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { ResponseFormatter } from '../utils/response-formatters';
import { enhancedAsyncHandler } from '../middleware/enhanced-error-handling';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { ErrorFactory } from '../utils/errors';

const router = express.Router();

// Type definitions for this route module
interface AvailabilityQueryParams {
  startDate?: string;
  endDate?: string;
}

interface AvailabilityCreateBody {
  date: string;
  start_time: string;
  end_time: string;
  is_available?: boolean;
  reason?: string;
}

interface AvailabilityUpdateBody {
  date?: string;
  start_time?: string;
  end_time?: string;
  is_available?: boolean;
  reason?: string;
}

interface BulkAvailabilityCreateBody {
  referee_id: UUID;
  windows: Array<{
    date: string;
    start_time: string;
    end_time: string;
    is_available?: boolean;
    reason?: string;
  }>;
}

interface ConflictQueryParams {
  date: string;
  start_time: string;
  end_time: string;
  referee_id?: UUID;
}

interface AvailabilityWindow {
  id: UUID;
  referee_id: UUID;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  reason?: string;
  created_at: Date;
  updated_at: Date;
}

interface AvailabilityConflict {
  id: UUID;
  referee_id: UUID;
  referee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  reason?: string;
}

interface GameConflict {
  id: UUID;
  referee_id: UUID;
  referee_name: string;
  game_id: UUID;
  game_date: string;
  game_time: string;
}

interface ConflictCheckResult {
  availabilityConflicts: AvailabilityConflict[];
  gameConflicts: GameConflict[];
  totalConflicts: number;
}

interface BulkCreateResult {
  created: AvailabilityWindow[];
  skipped: Array<{
    window: any;
    reason: string;
  }>;
}

// Initialize database connection (will be injected)
let db: Database;

// Route initialization function
export function initializeRoutes(database: Database): express.Router {
  db = database;
  return router;
}

// Validation schemas
const availabilityCreateSchema = Joi.object<AvailabilityCreateBody>({
  date: Joi.string().required(),
  start_time: Joi.string().required(),
  end_time: Joi.string().required(),
  is_available: Joi.boolean().default(true),
  reason: Joi.string().allow('')
});

const availabilityUpdateSchema = Joi.object<AvailabilityUpdateBody>({
  date: Joi.string(),
  start_time: Joi.string(),
  end_time: Joi.string(),
  is_available: Joi.boolean(),
  reason: Joi.string().allow('')
});

const bulkCreateSchema = Joi.object<BulkAvailabilityCreateBody>({
  referee_id: Joi.string().uuid().required(),
  windows: Joi.array().items(
    Joi.object({
      date: Joi.string().required(),
      start_time: Joi.string().required(),
      end_time: Joi.string().required(),
      is_available: Joi.boolean().default(true),
      reason: Joi.string().allow('')
    })
  ).min(1).required()
});

const availabilityQuerySchema = Joi.object<AvailabilityQueryParams>({
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate()
});

const conflictQuerySchema = Joi.object<ConflictQueryParams>({
  date: Joi.string().required(),
  start_time: Joi.string().required(),
  end_time: Joi.string().required(),
  referee_id: Joi.string().uuid()
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const windowIdParamSchema = Joi.object({
  windowId: Joi.string().uuid().required()
});

// Helper function to check if user is a referee and can modify availability
const canModifyAvailability = async (req: AuthenticatedRequest, refereeId: UUID): Promise<boolean> => {
  const isAdmin = req.user.role === 'admin';
  if (isAdmin) return true;

  const isReferee = req.user.roles && req.user.roles.some((role: any) =>
    ['referee', 'Referee'].includes(role.name || role) ||
    (typeof role === 'object' && role.name && ['referee', 'Referee'].includes(role.name))
  );

  if (isReferee) {
    // Get the referee record for this user to compare referee_id
    const referee = await db('referees').where('user_id', req.user.userId).first();
    return referee && referee.id === refereeId;
  }

  return false;
};

// Helper function to check for overlapping availability windows
const checkOverlappingWindows = async (
  refereeId: UUID,
  date: string,
  startTime: string,
  endTime: string,
  excludeWindowId?: UUID
): Promise<AvailabilityWindow[]> => {
  let query = db('referee_availability')
    .where('referee_id', refereeId)
    .where('date', date)
    .where(function() {
      this.where(function() {
        // New window starts during existing window
        this.where('start_time', '<=', startTime)
          .where('end_time', '>', startTime);
      }).orWhere(function() {
        // New window ends during existing window
        this.where('start_time', '<', endTime)
          .where('end_time', '>=', endTime);
      }).orWhere(function() {
        // New window completely contains existing window
        this.where('start_time', '>=', startTime)
          .where('end_time', '<=', endTime);
      });
    });

  if (excludeWindowId) {
    query = query.where('id', '!=', excludeWindowId);
  }

  return await query;
};

// GET /api/availability/referees/:id - Get referee's availability windows
router.get('/referees/:id',
  authenticateToken,
  validateParams(idParamSchema),
  validateQuery(availabilityQuerySchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, any, AvailabilityQueryParams>, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query;
    const refereeId = req.params.id;

    let query = db('referee_availability')
      .where('referee_id', refereeId)
      .orderBy('date', 'asc')
      .orderBy('start_time', 'asc');

    // Filter by date range if provided
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const availability: AvailabilityWindow[] = await query;

    ResponseFormatter.sendSuccess(res, {
      refereeId,
      availability,
      count: availability.length
    }, 'Availability retrieved successfully');
  })
);

// POST /api/availability/referees/:id - Create availability window
router.post('/referees/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'referee',
    action: 'update',
    getResourceId: (req) => req.params.id,
  }),
  validateParams(idParamSchema),
  validateBody(availabilityCreateSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ id: UUID }, any, AvailabilityCreateBody>, res: Response): Promise<void> => {
    const refereeId = req.params.id;
    const { date, start_time, end_time, is_available = true, reason } = req.body;

    // Verify referee exists
    const referee = await db('referees').where('id', refereeId).first();
    if (!referee) {
      throw ErrorFactory.notFound('Referee not found', refereeId);
    }

    // Check authorization
    if (!(await canModifyAvailability(req, refereeId))) {
      throw ErrorFactory.forbidden('Can only create availability for yourself');
    }

    // Check for overlapping windows
    const overlapping = await checkOverlappingWindows(refereeId, date, start_time, end_time);

    if (overlapping.length > 0) {
      throw ErrorFactory.conflict('Overlapping availability window exists', {
        conflicting: overlapping
      });
    }

    // Create availability window
    const [newWindow] = await db('referee_availability')
      .insert({
        referee_id: refereeId,
        date,
        start_time,
        end_time,
        is_available,
        reason
      })
      .returning('*');

    ResponseFormatter.sendCreated(
      res,
      newWindow,
      'Availability window created successfully',
      `/api/availability/${newWindow.id}`
    );
  })
);

// PUT /api/availability/:windowId - Update availability window
router.put('/:windowId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'referee',
    action: 'update',
  }),
  validateParams(windowIdParamSchema),
  validateBody(availabilityUpdateSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ windowId: UUID }, any, AvailabilityUpdateBody>, res: Response): Promise<void> => {
    const windowId = req.params.windowId;
    const { date, start_time, end_time, is_available, reason } = req.body;

    // Get existing window
    const existingWindow = await db('referee_availability').where('id', windowId).first();
    if (!existingWindow) {
      throw ErrorFactory.notFound('Availability window not found', windowId);
    }

    // Check authorization
    if (!(await canModifyAvailability(req, existingWindow.referee_id))) {
      throw ErrorFactory.forbidden('Can only update your own availability');
    }

    // Check for overlapping windows (exclude current window)
    if (date && start_time && end_time) {
      const overlapping = await checkOverlappingWindows(
        existingWindow.referee_id,
        date,
        start_time,
        end_time,
        windowId
      );

      if (overlapping.length > 0) {
        throw ErrorFactory.conflict('Overlapping availability window exists', {
          conflicting: overlapping
        });
      }
    }

    // Update window
    const updateData: any = {};
    if (date) updateData.date = date;
    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (typeof is_available === 'boolean') updateData.is_available = is_available;
    if (reason !== undefined) updateData.reason = reason;
    updateData.updated_at = new Date();

    const [updatedWindow] = await db('referee_availability')
      .where('id', windowId)
      .update(updateData)
      .returning('*');

    ResponseFormatter.sendSuccess(res, updatedWindow, 'Availability window updated successfully');
  })
);

// DELETE /api/availability/:windowId - Delete availability window
router.delete('/:windowId',
  authenticateToken,
  requireCerbosPermission({
    resource: 'referee',
    action: 'update',
  }),
  validateParams(windowIdParamSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<{ windowId: UUID }>, res: Response): Promise<void> => {
    const windowId = req.params.windowId;

    // Get existing window for authorization
    const existingWindow = await db('referee_availability').where('id', windowId).first();
    if (!existingWindow) {
      throw ErrorFactory.notFound('Availability window not found', windowId);
    }

    // Check authorization
    if (!(await canModifyAvailability(req, existingWindow.referee_id))) {
      throw ErrorFactory.forbidden('Can only delete your own availability');
    }

    await db('referee_availability').where('id', windowId).del();

    ResponseFormatter.sendSuccess(res, null, 'Availability window deleted successfully');
  })
);

// GET /api/availability/conflicts - Check for scheduling conflicts
router.get('/conflicts',
  authenticateToken,
  requireCerbosPermission({
    resource: 'referee',
    action: 'view:list',
  }),
  validateQuery(conflictQuerySchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, any, ConflictQueryParams>, res: Response): Promise<void> => {
    const { date, start_time, end_time, referee_id } = req.query;

    let availabilityQuery = db('referee_availability as ra')
      .join('referees as r', 'ra.referee_id', 'r.id')
      .select('ra.*', 'r.name as referee_name')
      .where('ra.date', date)
      .where('ra.is_available', false)
      .where(function() {
        this.where(function() {
          this.where('ra.start_time', '<=', start_time)
            .where('ra.end_time', '>', start_time);
        }).orWhere(function() {
          this.where('ra.start_time', '<', end_time)
            .where('ra.end_time', '>=', end_time);
        }).orWhere(function() {
          this.where('ra.start_time', '>=', start_time)
            .where('ra.end_time', '<=', end_time);
        });
      });

    // Filter by specific referee if provided
    if (referee_id) {
      availabilityQuery = availabilityQuery.where('ra.referee_id', referee_id);
    }

    const availabilityConflicts: AvailabilityConflict[] = await availabilityQuery;

    // Also check game assignments for double-booking
    let gameQuery = db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('referees as r', 'ga.referee_id', 'r.id')
      .select('ga.*', 'g.game_date', 'g.game_time', 'r.name as referee_name')
      .where('g.game_date', date)
      .where('g.game_time', '>=', start_time)
      .where('g.game_time', '<', end_time);

    if (referee_id) {
      gameQuery = gameQuery.where('ga.referee_id', referee_id);
    }

    const gameConflicts: GameConflict[] = await gameQuery;

    const result: ConflictCheckResult = {
      availabilityConflicts,
      gameConflicts,
      totalConflicts: availabilityConflicts.length + gameConflicts.length
    };

    ResponseFormatter.sendSuccess(res, result, 'Conflicts checked successfully');
  })
);

// POST /api/availability/bulk - Bulk create availability windows
router.post('/bulk',
  authenticateToken,
  requireCerbosPermission({
    resource: 'referee',
    action: 'update',
  }),
  validateBody(bulkCreateSchema),
  enhancedAsyncHandler(async (req: AuthenticatedRequest<any, any, BulkAvailabilityCreateBody>, res: Response): Promise<void> => {
    const { referee_id, windows } = req.body;

    // Verify referee exists
    const referee = await db('referees').where('id', referee_id).first();
    if (!referee) {
      throw ErrorFactory.notFound('Referee not found', referee_id);
    }

    // Check authorization
    if (!(await canModifyAvailability(req, referee_id))) {
      throw ErrorFactory.forbidden('Can only create availability for yourself');
    }

    // Process in transaction
    const results = await db.transaction(async (trx) => {
      const created: AvailabilityWindow[] = [];
      const skipped: Array<{ window: any; reason: string }> = [];

      for (const window of windows) {
        // Check for overlapping windows
        const overlapping = await trx('referee_availability')
          .where('referee_id', referee_id)
          .where('date', window.date)
          .where(function() {
            this.where(function() {
              this.where('start_time', '<=', window.start_time)
                .where('end_time', '>', window.start_time);
            }).orWhere(function() {
              this.where('start_time', '<', window.end_time)
                .where('end_time', '>=', window.end_time);
            }).orWhere(function() {
              this.where('start_time', '>=', window.start_time)
                .where('end_time', '<=', window.end_time);
            });
          });

        if (overlapping.length > 0) {
          skipped.push({ window, reason: 'Overlapping window exists' });
          continue;
        }

        // Create window
        const [newWindow] = await trx('referee_availability')
          .insert({
            referee_id,
            date: window.date,
            start_time: window.start_time,
            end_time: window.end_time,
            is_available: window.is_available !== undefined ? window.is_available : true,
            reason: window.reason
          })
          .returning('*');

        created.push(newWindow);
      }

      return { created, skipped };
    });

    ResponseFormatter.sendCreated(
      res,
      results,
      `Created ${results.created.length} availability windows. ${results.skipped.length} skipped.`,
      `/api/availability/referees/${referee_id}`
    );
  })
);

export default router;