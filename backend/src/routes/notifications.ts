import express, { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
const { authenticateToken } = require('../middleware/auth');
const { requireCerbosPermission } = require('../middleware/requireCerbosPermission');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { ResponseFormatter } = require('../utils/response-formatters');
const { validateParams, validateBody } = require('../middleware/validation');
import notificationService from '../services/NotificationService';
import db from '../config/database';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const IdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const UpdatePreferencesSchema = Joi.object({
  email_assignments: Joi.boolean().optional(),
  email_reminders: Joi.boolean().optional(),
  email_status_changes: Joi.boolean().optional(),
  sms_assignments: Joi.boolean().optional(),
  sms_reminders: Joi.boolean().optional(),
  in_app_enabled: Joi.boolean().optional()
});

const BroadcastNotificationSchema = Joi.object({
  title: Joi.string().max(255).required(),
  message: Joi.string().required(),
  type: Joi.string().valid('assignment', 'status_change', 'reminder', 'system').default('system'),
  link: Joi.string().max(500).optional(),
  target_audience: Joi.object({
    roles: Joi.array().items(Joi.string()).optional(),
    specific_users: Joi.array().items(Joi.string().uuid()).optional(),
    all_users: Joi.boolean().default(false)
  }).required(),
  metadata: Joi.object().optional()
});

/**
 * GET /api/notifications - Get user's notifications
 */
const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;
  const unreadOnly = ((req as any).query.unread_only as string) === 'true';
  const limit = parseInt(((req as any).query.limit as string) || '20');
  const offset = parseInt(((req as any).query.offset as string) || '0');

  const result = await notificationService.getUserNotifications(userId, {
    unreadOnly,
    limit,
    offset
  });

  return ResponseFormatter.sendSuccess(res, result);
};

/**
 * GET /api/notifications/unread-count - Get unread count only
 */
const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;
  const unreadCount = await notificationService.getUnreadCount(userId);

  return ResponseFormatter.sendSuccess(res, {
    unreadCount
  });
};

/**
 * PATCH /api/notifications/:id/read - Mark as read
 */
const markAsRead = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<Response> => {
  await notificationService.markAsRead((req as any).params.id);
  return ResponseFormatter.sendSuccess(res, { success: true });
};

/**
 * PATCH /api/notifications/mark-all-read - Mark all as read
 */
const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;
  const count = await notificationService.markAllAsRead(userId);

  return ResponseFormatter.sendSuccess(res, {
    markedAsRead: count
  });
};

/**
 * DELETE /api/notifications/:id - Delete notification
 */
const deleteNotification = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<Response> => {
  await notificationService.deleteNotification((req as any).params.id);
  return ResponseFormatter.sendSuccess(res, { success: true });
};

/**
 * GET /api/notifications/preferences - Get user preferences
 */
const getPreferences = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;
  const preferences = await notificationService.getUserPreferences(userId);

  return ResponseFormatter.sendSuccess(res, preferences);
};

/**
 * PATCH /api/notifications/preferences - Update user preferences
 */
const updatePreferences = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = req.user!.id;
  const preferences = await notificationService.updateUserPreferences(userId, (req as any).body);

  return ResponseFormatter.sendSuccess(res, preferences, 'Notification preferences updated');
};

/**
 * POST /api/notifications/broadcast - Broadcast notification to multiple users
 * Requires admin permission
 */
const broadcastNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const { title, message, type, link, target_audience, metadata } = (req as any).body;

  // Resolve target users
  let targetUserIds: string[] = [];

  if (target_audience.all_users) {
    // Get all active users
    const allUsersResult = await (db as any)('users')
      .where('is_active', true)
      .select('id');
    targetUserIds = allUsersResult.map((u: any) => u.id);
  } else {
    // Get users by roles
    if (target_audience.roles && target_audience.roles.length > 0) {
      const roleUsersResult = await (db as any)('users')
        .join('user_roles', 'users.id', 'user_roles.user_id')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .whereIn('roles.name', target_audience.roles)
        .where('users.is_active', true)
        .distinct('users.id');
      targetUserIds.push(...roleUsersResult.map((u: any) => u.id));
    }

    // Get specific users
    if (target_audience.specific_users && target_audience.specific_users.length > 0) {
      targetUserIds.push(...target_audience.specific_users);
    }

    // Remove duplicates
    targetUserIds = [...new Set(targetUserIds)];
  }

  if (targetUserIds.length === 0) {
    return ResponseFormatter.sendError(res, 'No users match the target audience', 400);
  }

  // Create notifications for all target users
  const createdCount = await Promise.all(
    targetUserIds.map(userId =>
      notificationService.createNotification({
        user_id: userId,
        type,
        title,
        message,
        link,
        metadata
      }).catch(err => {
        console.error(`Failed to create notification for user ${userId}:`, err);
        return null;
      })
    )
  ).then(results => results.filter(r => r !== null).length);

  return ResponseFormatter.sendSuccess(res, {
    success: true,
    recipientCount: targetUserIds.length,
    createdCount,
    message: `Notification broadcast to ${createdCount} users`
  });
};

// Routes
router.get('/', authenticateToken, enhancedAsyncHandler(getNotifications));
router.get('/unread-count', authenticateToken, enhancedAsyncHandler(getUnreadCount));
router.patch('/:id/read', authenticateToken, validateParams(IdParamSchema), enhancedAsyncHandler(markAsRead));
router.patch('/mark-all-read', authenticateToken, enhancedAsyncHandler(markAllAsRead));
router.delete('/:id', authenticateToken, validateParams(IdParamSchema), enhancedAsyncHandler(deleteNotification));
router.get('/preferences', authenticateToken, enhancedAsyncHandler(getPreferences));
router.patch('/preferences', authenticateToken, validateBody(UpdatePreferencesSchema), enhancedAsyncHandler(updatePreferences));

// Broadcast notification (admin only)
router.post('/broadcast',
  authenticateToken,
  requireCerbosPermission({
    resource: 'notification',
    action: 'broadcast'
  }),
  validateBody(BroadcastNotificationSchema),
  enhancedAsyncHandler(broadcastNotification)
);

export default router;
