import express, { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
const { authenticateToken } = require('../middleware/auth');
const { enhancedAsyncHandler } = require('../middleware/enhanced-error-handling');
const { ResponseFormatter } = require('../utils/response-formatters');
const { validateParams, validateBody } = require('../middleware/validation');
import notificationService from '../services/NotificationService';
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

// Routes
router.get('/', authenticateToken, enhancedAsyncHandler(getNotifications));
router.get('/unread-count', authenticateToken, enhancedAsyncHandler(getUnreadCount));
router.patch('/:id/read', authenticateToken, validateParams(IdParamSchema), enhancedAsyncHandler(markAsRead));
router.patch('/mark-all-read', authenticateToken, enhancedAsyncHandler(markAllAsRead));
router.delete('/:id', authenticateToken, validateParams(IdParamSchema), enhancedAsyncHandler(deleteNotification));
router.get('/preferences', authenticateToken, enhancedAsyncHandler(getPreferences));
router.patch('/preferences', authenticateToken, validateBody(UpdatePreferencesSchema), enhancedAsyncHandler(updatePreferences));

export default router;
