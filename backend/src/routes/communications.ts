/**
 * @fileoverview Communications Routes - TypeScript implementation
 * @description RESTful API endpoints for internal communications management
 * @author Claude Assistant
 * @date 2025-01-23
 */

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import Joi from 'joi';
import { authenticateToken, requireRole, requireAnyRole } from '../middleware/auth';
import { receiptUploader } from '../middleware/fileUpload';
import { CommunicationService } from '../services/CommunicationService';
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

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
  files?: Express.Multer.File[];
}

// Type guard for authenticated requests
function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}

// COMMUNICATIONS ENDPOINTS

/**
 * Get all communications (with access control)
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const filters: CommunicationFilters = {
      type: req.query.type as CommunicationType,
      priority: req.query.priority as CommunicationPriority,
      status: req.query.status as any,
      unread_only: req.query.unread_only === 'true',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    };

    const result = await communicationService.getCommunications(
      req.user.id,
      req.user.role,
      filters
    );

    res.json(result);
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get single communication by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const communication = await communicationService.getCommunicationById(
      req.params.id,
      req.user.id,
      req.user.role
    );

    if (!communication) {
      res.status(404).json({ error: 'Communication not found or access denied' });
      return;
    }

    // Mark as read if user is a recipient and hasn't read it yet
    if (communication.sent_at && !communication.read_at) {
      await communicationService.markAsRead(req.params.id, req.user.id);
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
  requireAnyRole('admin', 'hr', 'manager'),
  receiptUploader.array('attachments', 5),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = communicationSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const communicationData: CreateCommunicationRequest = value;

      // Handle file attachments
      let attachments: CommunicationAttachment[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        attachments = req.files.map((file: Express.Multer.File) => ({
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        }));
      }

      const communication = await communicationService.createCommunication(
        communicationData,
        req.user.id,
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
  requireAnyRole('admin', 'hr', 'manager'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = communicationSchema.partial().validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const updateData: UpdateCommunicationRequest = value;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      const communication = await communicationService.updateCommunication(
        req.params.id,
        updateData,
        req.user.id,
        req.user.role
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
  requireAnyRole('admin', 'hr', 'manager'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const communication = await communicationService.publishCommunication(
        req.params.id,
        req.user.id,
        req.user.role
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
  requireAnyRole('admin', 'hr'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const communication = await communicationService.archiveCommunication(
        req.params.id,
        req.user.id,
        req.user.role
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { acknowledgment_text }: AcknowledgmentRequest = req.body;

      const acknowledged = await communicationService.acknowledgeCommunication(
        req.params.id,
        req.user.id,
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
  requireAnyRole('admin', 'hr', 'manager'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const recipients = await communicationService.getCommunicationRecipients(
        req.params.id,
        req.user.id,
        req.user.role
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
router.get('/unread/count', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const unreadCount = await communicationService.getUnreadCount(req.user.id);
    res.json({ unread_count: unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get pending acknowledgments for user
 */
router.get(
  '/acknowledgments/pending',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const pendingAcknowledgments = await communicationService.getPendingAcknowledgments(
        req.user.id
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
  requireAnyRole('admin', 'hr'),
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