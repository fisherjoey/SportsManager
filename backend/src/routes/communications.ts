/**
 * @fileoverview Communications Routes - TypeScript implementation
 * @description RESTful API endpoints for internal communications management
 * @author Claude Assistant
 * @date 2025-01-23
 */

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { receiptUploader } from '../middleware/fileUpload';
import { CommunicationService } from '../services/CommunicationService';
import db, { pool } from '../config/database';
import {
  CreateCommunicationRequest,
  UpdateCommunicationRequest,
  CommunicationFilters,
  RequestWithUser,
  AcknowledgmentRequest,
  CommunicationAttachment,
  CommunicationType,
  CommunicationPriority
} from '../types/communication';

const router = express.Router();

// Use the shared pool from database configuration
const communicationService = new CommunicationService(pool);

// Validation schemas
const communicationSchema = Joi.object({
  title: Joi.string().max(200).required(),
  content: Joi.string().required(),
  type: Joi.string().valid('announcement', 'memo', 'policy_update', 'emergency', 'newsletter').required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  target_audience: Joi.object({
    departments: Joi.array().items(Joi.string().uuid()).allow(null),
    roles: Joi.array().items(Joi.string()).allow(null),
    specific_users: Joi.array().items(Joi.string().uuid()).allow(null),
    all_users: Joi.boolean().default(false)
  }).required(),
  publish_date: Joi.date().default(() => new Date()),
  expiration_date: Joi.date().allow(null),
  requires_acknowledgment: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string()).allow(null)
});

// Extend Request interface for typed user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    name: string;
  };
  files?: any[];
}

// Type guard for authenticated requests
function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return 'user' in req && (req as any).user !== undefined;
}

// COMMUNICATIONS ENDPOINTS

/**
 * Get all communications (with access control)
 */
router.get('/', authenticateToken, requireCerbosPermission({
  resource: 'communication',
  action: 'view:list',
}), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Extract role safely
    const userRoles = ((req as any).user as any).roles || [];
    const primaryRole = Array.isArray(userRoles) && userRoles.length > 0
      ? (typeof userRoles[0] === 'object' ? userRoles[0].name : userRoles[0])
      : 'user';

    // Get communications with error handling
    const filters: CommunicationFilters = {
      type: (req as any).query.type as CommunicationType,
      priority: (req as any).query.priority as CommunicationPriority,
      status: (req as any).query.status as any || 'published',
      unread_only: (req as any).query.unread_only === 'true',
      page: parseInt((req as any).query.page as string) || 1,
      limit: parseInt((req as any).query.limit as string) || 10
    };

    const result = await communicationService.getCommunications(
      (req as any).user.id,
      primaryRole,
      filters
    );

    // Always return valid JSON, even on error
    res.json(result || { items: [], total: 0, page: 1, limit: filters.limit });
  } catch (error) {
    console.error('Communications API error:', error);
    // Return empty result instead of crashing
    res.json({
      items: [],
      total: 0,
      page: 1,
      limit: parseInt((req as any).query.limit as string) || 10
    });
  }
});

/**
 * Get single communication by ID
 */
router.get('/:id', authenticateToken, requireCerbosPermission({
  resource: 'communication',
  action: 'view:details',
  getResourceId: (req) => (req as any).params.id,
}), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Extract the primary role from the roles array
    const userRoles = ((req as any).user as any).roles || [];
    const primaryRole = userRoles.length > 0 ? userRoles[0]?.name || userRoles[0] : 'user';

    const communication = await communicationService.getCommunicationById(
      (req as any).params.id,
      (req as any).user.id,
      primaryRole
    );

    if (!communication) {
      res.status(404).json({ error: 'Communication not found or access denied' });
      return;
    }

    // Mark as read if user is a recipient and hasn't read it yet
    if (communication.sent_at && !communication.read_at) {
      await communicationService.markAsRead((req as any).params.id, (req as any).user.id);
    }

    res.json(communication);
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new communication
 */
router.post(
  '/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'create',
  }),
  receiptUploader.array('attachments', 5),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = communicationSchema.validate((req as any).body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const communicationData: CreateCommunicationRequest = value;

      // Handle file attachments
      let attachments: CommunicationAttachment[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        attachments = req.files.map((file: any) => ({
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        }));
      }

      const communication = await communicationService.createCommunication(
        communicationData,
        (req as any).user.id,
        attachments
      );

      res.status(201).json(communication);
    } catch (error) {
      console.error('Error creating communication:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Update communication (only drafts)
 */
router.put(
  '/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'update',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = (communicationSchema as any).partial().validate((req as any).body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const updateData: UpdateCommunicationRequest = value;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      // Extract the primary role from the roles array
      const userRoles = ((req as any).user as any).roles || [];
      const primaryRole = userRoles.length > 0 ? userRoles[0]?.name || userRoles[0] : 'user';

      const communication = await communicationService.updateCommunication(
        (req as any).params.id,
        updateData,
        (req as any).user.id,
        primaryRole
      );

      if (!communication) {
        res.status(404).json({ error: 'Communication not found or permission denied' });
        return;
      }

      res.json(communication);
    } catch (error) {
      if (error instanceof Error && error.message === 'Only draft communications can be edited') {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Error updating communication:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Publish communication
 */
router.post(
  '/:id/publish',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'publish',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Extract the primary role from the roles array
      const userRoles = ((req as any).user as any).roles || [];
      const primaryRole = userRoles.length > 0 ? userRoles[0]?.name || userRoles[0] : 'user';

      const communication = await communicationService.publishCommunication(
        (req as any).params.id,
        (req as any).user.id,
        primaryRole
      );

      res.json(communication);
    } catch (error) {
      if (error instanceof Error && error.message === 'Draft communication not found or permission denied') {
        res.status(404).json({ error: error.message });
        return;
      }
      console.error('Error publishing communication:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Archive communication
 */
router.post(
  '/:id/archive',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'archive',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Extract the primary role from the roles array
      const userRoles = ((req as any).user as any).roles || [];
      const primaryRole = userRoles.length > 0 ? userRoles[0]?.name || userRoles[0] : 'user';

      const communication = await communicationService.archiveCommunication(
        (req as any).params.id,
        (req as any).user.id,
        primaryRole
      );

      if (!communication) {
        res.status(404).json({ error: 'Communication not found or permission denied' });
        return;
      }

      res.json(communication);
    } catch (error) {
      console.error('Error archiving communication:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Acknowledge communication
 */
router.post(
  '/:id/acknowledge',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'acknowledge',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { acknowledgment_text }: AcknowledgmentRequest = (req as any).body;

      const acknowledged = await communicationService.acknowledgeCommunication(
        (req as any).params.id,
        (req as any).user.id,
        acknowledgment_text
      );

      if (!acknowledged) {
        res.status(404).json({
          error: 'Communication not found or does not require acknowledgment'
        });
        return;
      }

      res.json({ message: 'Communication acknowledged successfully' });
    } catch (error) {
      console.error('Error acknowledging communication:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Get communication recipients and their status
 */
router.get(
  '/:id/recipients',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'admin:view_recipients',
    getResourceId: (req) => (req as any).params.id,
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Extract the primary role from the roles array
      const userRoles = ((req as any).user as any).roles || [];
      const primaryRole = userRoles.length > 0 ? userRoles[0]?.name || userRoles[0] : 'user';

      const recipients = await communicationService.getCommunicationRecipients(
        (req as any).params.id,
        (req as any).user.id,
        primaryRole
      );

      if (!recipients) {
        res.status(404).json({ error: 'Communication not found or permission denied' });
        return;
      }

      res.json(recipients);
    } catch (error) {
      console.error('Error fetching communication recipients:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Get user's unread communications count
 */
// router.get('/unread/count', authenticateToken, requireCerbosPermission({
//   resource: 'communication',
//   action: 'view:unread_count',
// }), async (req: Request, res: Response): Promise<void> => {
//   try {
//     if (!isAuthenticated(req)) {
//       res.status(401).json({ error: 'Authentication required' });
//       return;
//     }
// 
//     const unreadCount = await communicationService.getUnreadCount((req as any).user.id);
//     res.json({ unread_count: unreadCount });
//   } catch (error) {
//     console.error('Error fetching unread count:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

/**
 * Get pending acknowledgments for user
 */
router.get(
  '/acknowledgments/pending',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'view:pending_acknowledgments',
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const pendingAcknowledgments = await communicationService.getPendingAcknowledgments(
        (req as any).user.id
      );
      res.json(pendingAcknowledgments);
    } catch (error) {
      console.error('Error fetching pending acknowledgments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Get communication statistics
 */
router.get(
  '/stats/overview',
  authenticateToken,
  requireCerbosPermission({
    resource: 'communication',
    action: 'admin:view_stats',
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const stats = await communicationService.getCommunicationStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching communication statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;