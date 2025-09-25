/**
 * @fileoverview Unit tests for Communications Routes
 * @requires jest
 * @requires supertest
 * @requires ../communications
 *
 * Test Coverage:
 * - Communication CRUD operations
 * - Target audience resolution
 * - Publishing and archiving
 * - Read tracking and acknowledgments
 * - Statistics and analytics
 * - File upload handling
 * - Authorization and access control
 *
 * @author Claude Assistant
 * @date 2025-01-23
 */

import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('pg');
jest.mock('../middleware/auth');
jest.mock('../middleware/fileUpload');

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

(Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool as any);

const { authenticateToken, requireRole, requireAnyRole } = require('../../middleware/auth');
const { receiptUploader } = require('../../middleware/fileUpload');

// Mock middleware
authenticateToken.mockImplementation((req: any, res: any, next: any) => {
  req.user = { id: 'user-123', role: 'admin', name: 'Test User' };
  next();
});

requireRole.mockImplementation((role: string) => (req: any, res: any, next: any) => next());
requireAnyRole.mockImplementation((...roles: string[]) => (req: any, res: any, next: any) => next());

receiptUploader.array = jest.fn().mockImplementation((fieldName: string, maxCount: number) =>
  (req: any, res: any, next: any) => {
    req.files = [];
    next();
  }
);

import communicationsRouter from '../communications';

const app = express();
app.use(express.json());
app.use('/communications', communicationsRouter);

describe('Communications Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockImplementation((query: string, params?: any[]) => {
      if (query.includes('BEGIN') || query.includes('COMMIT') || query.includes('ROLLBACK')) {
        return Promise.resolve();
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  describe('GET /', () => {
    const mockCommunications = [
      {
        id: 'comm-1',
        title: 'Test Communication',
        content: 'Test content',
        type: 'announcement',
        priority: 'normal',
        author_name: 'Test Author',
        sent_at: new Date(),
        read_at: null,
        acknowledged_at: null,
        delivery_status: 'delivered',
        is_unread: true,
        requires_ack: false
      },
      {
        id: 'comm-2',
        title: 'Urgent Update',
        content: 'Urgent content',
        type: 'emergency',
        priority: 'urgent',
        author_name: 'Admin User',
        sent_at: new Date(),
        read_at: new Date(),
        acknowledged_at: null,
        delivery_status: 'delivered',
        is_unread: false,
        requires_ack: true
      }
    ];

    it('should fetch all communications with default pagination', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCommunications });

      const response = await request(app)
        .get('/communications')
        .expect(200);

      expect(response.body).toHaveProperty('communications');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.communications).toEqual(mockCommunications);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 50,
        total: mockCommunications.length
      });
    });

    it('should apply filters correctly', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockCommunications[1]] });

      const response = await request(app)
        .get('/communications')
        .query({
          type: 'emergency',
          priority: 'urgent',
          unread_only: 'false',
          page: 1,
          limit: 10
        })
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.type = $3'),
        expect.arrayContaining(['emergency'])
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.priority = $4'),
        expect.arrayContaining(['urgent'])
      );
    });

    it('should apply unread_only filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockCommunications[0]] });

      await request(app)
        .get('/communications')
        .query({ unread_only: 'true' })
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND cr.read_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should handle pagination correctly', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCommunications });

      const response = await request(app)
        .get('/communications')
        .query({ page: 2, limit: 1 })
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $3 OFFSET $4'),
        expect.arrayContaining([1, 1])
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/communications')
        .expect(500);
    });
  });

  describe('GET /:id', () => {
    const mockCommunication = {
      id: 'comm-1',
      title: 'Test Communication',
      content: 'Test content',
      author_name: 'Test Author',
      sent_at: new Date(),
      read_at: null,
      acknowledged_at: null,
      delivery_status: 'delivered'
    };

    it('should fetch single communication by ID', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockCommunication] })
        .mockResolvedValueOnce({ rows: [] }); // Mark as read query

      const response = await request(app)
        .get('/communications/comm-1')
        .expect(200);

      expect(response.body).toEqual(mockCommunication);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1'),
        ['comm-1', 'user-123', 'admin']
      );
    });

    it('should mark communication as read when accessed', async () => {
      const unreadComm = { ...mockCommunication, sent_at: new Date(), read_at: null };
      mockPool.query
        .mockResolvedValueOnce({ rows: [unreadComm] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/communications/comm-1')
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE communication_recipients SET read_at = CURRENT_TIMESTAMP WHERE communication_id = $1 AND recipient_id = $2',
        ['comm-1', 'user-123']
      );
    });

    it('should return 404 for non-existent communication', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/communications/non-existent')
        .expect(404);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/communications/comm-1')
        .expect(500);
    });
  });

  describe('POST /', () => {
    const validCommunicationData = {
      title: 'New Communication',
      content: 'Communication content',
      type: 'announcement',
      priority: 'normal',
      target_audience: {
        all_users: true,
        departments: null,
        roles: null,
        specific_users: null
      },
      requires_acknowledgment: false,
      tags: ['test', 'announcement']
    };

    beforeEach(() => {
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO internal_communications')) {
          return Promise.resolve({
            rows: [{
              id: 'comm-new',
              ...validCommunicationData,
              author_id: 'user-123',
              status: 'draft',
              created_at: new Date()
            }]
          });
        }
        if (query.includes('INSERT INTO communication_recipients')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should create new communication successfully', async () => {
      // Mock recipient resolution
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }]
      });

      const response = await request(app)
        .post('/communications')
        .send(validCommunicationData)
        .expect(201);

      expect(response.body).toHaveProperty('id', 'comm-new');
      expect(response.body).toHaveProperty('recipient_count', 3);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validCommunicationData };
      delete invalidData.title;

      await request(app)
        .post('/communications')
        .send(invalidData)
        .expect(400);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should validate communication type', async () => {
      const invalidData = { ...validCommunicationData, type: 'invalid_type' };

      await request(app)
        .post('/communications')
        .send(invalidData)
        .expect(400);
    });

    it('should validate priority level', async () => {
      const invalidData = { ...validCommunicationData, priority: 'invalid_priority' };

      await request(app)
        .post('/communications')
        .send(invalidData)
        .expect(400);
    });

    it('should handle file attachments', async () => {
      receiptUploader.array.mockImplementationOnce((fieldName: string, maxCount: number) =>
        (req: any, res: any, next: any) => {
          req.files = [
            {
              originalname: 'document.pdf',
              path: '/uploads/document.pdf',
              size: 12345,
              mimetype: 'application/pdf'
            }
          ];
          next();
        }
      );

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

      const response = await request(app)
        .post('/communications')
        .send(validCommunicationData)
        .expect(201);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO internal_communications'),
        expect.arrayContaining([
          expect.stringContaining('[{"filename":"document.pdf"')
        ])
      );
    });

    it('should publish immediately if publish_date is in the past', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const dataWithPastDate = { ...validCommunicationData, publish_date: pastDate };

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

      await request(app)
        .post('/communications')
        .send(dataWithPastDate)
        .expect(201);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE internal_communications SET status = $1 WHERE id = $2',
        ['published', 'comm-new']
      );
    });

    it('should handle database errors during creation', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .post('/communications')
        .send(validCommunicationData)
        .expect(500);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('PUT /:id', () => {
    const updateData = {
      title: 'Updated Communication',
      content: 'Updated content',
      priority: 'high'
    };

    it('should update draft communication successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ status: 'draft', author_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'comm-1', ...updateData }] });

      const response = await request(app)
        .put('/communications/comm-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE internal_communications'),
        expect.arrayContaining(['Updated Communication', 'Updated content', 'high', 'comm-1'])
      );
    });

    it('should prevent editing published communications', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ status: 'published', author_id: 'user-123' }]
      });

      await request(app)
        .put('/communications/comm-1')
        .send(updateData)
        .expect(400);
    });

    it('should return 404 for non-existent communication', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .put('/communications/non-existent')
        .send(updateData)
        .expect(404);
    });

    it('should validate update data', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ status: 'draft', author_id: 'user-123' }]
      });

      const invalidData = { type: 'invalid_type' };

      await request(app)
        .put('/communications/comm-1')
        .send(invalidData)
        .expect(400);
    });

    it('should handle empty updates', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ status: 'draft', author_id: 'user-123' }]
      });

      await request(app)
        .put('/communications/comm-1')
        .send({})
        .expect(400);
    });
  });

  describe('POST /:id/publish', () => {
    const mockCommunication = {
      id: 'comm-1',
      title: 'Draft Communication',
      target_audience: { all_users: true }
    };

    beforeEach(() => {
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('SELECT') && query.includes('target_audience')) {
          return Promise.resolve({ rows: [mockCommunication] });
        }
        if (query.includes('INSERT INTO communication_recipients')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE internal_communications')) {
          return Promise.resolve({
            rows: [{ ...mockCommunication, status: 'published' }]
          });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should publish draft communication successfully', async () => {
      // Mock recipient resolution
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'user-1' }, { id: 'user-2' }]
      });

      const response = await request(app)
        .post('/communications/comm-1/publish')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'published');
      expect(response.body).toHaveProperty('recipient_count', 2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should return 404 for non-existent draft', async () => {
      mockClient.query.mockImplementationOnce(() =>
        Promise.resolve({ rows: [] })
      );

      await request(app)
        .post('/communications/non-existent/publish')
        .expect(404);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle database errors during publishing', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .post('/communications/comm-1/publish')
        .expect(500);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('POST /:id/archive', () => {
    it('should archive communication successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'comm-1', status: 'archived' }]
      });

      const response = await request(app)
        .post('/communications/comm-1/archive')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'archived');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE internal_communications'),
        expect.arrayContaining(['comm-1', 'user-123', 'admin'])
      );
    });

    it('should return 404 for non-existent communication', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/communications/non-existent/archive')
        .expect(404);
    });
  });

  describe('POST /:id/acknowledge', () => {
    beforeEach(() => {
      mockPool.query
        .mockResolvedValueOnceOnce({ rows: [{ requires_acknowledgment: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 'recipient-1' }] });
    });

    it('should acknowledge communication successfully', async () => {
      const response = await request(app)
        .post('/communications/comm-1/acknowledge')
        .send({ acknowledgment_text: 'Acknowledged' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Communication acknowledged successfully');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE communication_recipients'),
        ['comm-1', 'user-123']
      );
    });

    it('should return 404 for non-acknowledgeable communication', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/communications/comm-1/acknowledge')
        .expect(404);
    });

    it('should handle missing recipient record', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ requires_acknowledgment: true }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/communications/comm-1/acknowledge')
        .expect(404);
    });
  });

  describe('GET /:id/recipients', () => {
    const mockRecipients = [
      {
        id: 'recipient-1',
        recipient_name: 'User One',
        recipient_email: 'user1@example.com',
        employee_id: 'EMP001',
        department_name: 'IT',
        delivery_status: 'delivered',
        read_at: new Date(),
        acknowledged_at: null
      },
      {
        id: 'recipient-2',
        recipient_name: 'User Two',
        recipient_email: 'user2@example.com',
        employee_id: 'EMP002',
        department_name: 'HR',
        delivery_status: 'delivered',
        read_at: null,
        acknowledged_at: null
      }
    ];

    it('should get communication recipients successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ author_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: mockRecipients });

      const response = await request(app)
        .get('/communications/comm-1/recipients')
        .expect(200);

      expect(response.body).toHaveProperty('recipients', mockRecipients);
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toEqual({
        total_recipients: 2,
        delivered: 2,
        read: 1,
        acknowledged: 0,
        failed: 0
      });
    });

    it('should return 404 for unauthorized access', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/communications/comm-1/recipients')
        .expect(404);
    });
  });

  describe('GET /unread/count', () => {
    it('should get unread communications count', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ unread_count: '5' }] });

      const response = await request(app)
        .get('/communications/unread/count')
        .expect(200);

      expect(response.body).toEqual({ unread_count: 5 });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as unread_count'),
        ['user-123']
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/communications/unread/count')
        .expect(500);
    });
  });

  describe('GET /acknowledgments/pending', () => {
    const mockPendingAcks = [
      {
        id: 'comm-1',
        title: 'Urgent Policy Update',
        type: 'policy_update',
        priority: 'urgent',
        publish_date: new Date(),
        requires_acknowledgment: true,
        sent_at: new Date(),
        read_at: new Date()
      }
    ];

    it('should get pending acknowledgments', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockPendingAcks });

      const response = await request(app)
        .get('/communications/acknowledgments/pending')
        .expect(200);

      expect(response.body).toEqual(mockPendingAcks);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('c.requires_acknowledgment = true'),
        ['user-123']
      );
    });
  });

  describe('GET /stats/overview', () => {
    const mockOverviewStats = {
      total_communications: '50',
      draft_communications: '5',
      published_communications: '40',
      archived_communications: '5',
      emergency_communications: '2',
      urgent_communications: '8',
      acknowledgment_required: '15'
    };

    const mockEngagementStats = {
      total_recipients: '1000',
      total_read: '800',
      total_acknowledged: '600',
      delivery_failures: '10',
      avg_hours_to_read: '2.5'
    };

    const mockTypeBreakdown = [
      { type: 'announcement', count: '25', published_count: '20' },
      { type: 'memo', count: '15', published_count: '15' },
      { type: 'policy_update', count: '10', published_count: '8' }
    ];

    it('should get comprehensive communication statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOverviewStats] })
        .mockResolvedValueOnce({ rows: [mockEngagementStats] })
        .mockResolvedValueOnce({ rows: mockTypeBreakdown });

      const response = await request(app)
        .get('/communications/stats/overview')
        .expect(200);

      expect(response.body).toHaveProperty('overview', mockOverviewStats);
      expect(response.body).toHaveProperty('engagement', mockEngagementStats);
      expect(response.body).toHaveProperty('typeBreakdown', mockTypeBreakdown);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/communications/stats/overview')
        .expect(500);
    });
  });

  describe('Target Audience Resolution', () => {
    describe('getTargetRecipients helper function', () => {
      // Note: This tests the internal helper function logic through integration

      it('should resolve all_users target audience', async () => {
        const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];
        mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

        const communicationData = {
          ...{
            title: 'Test',
            content: 'Test',
            type: 'announcement',
            target_audience: { all_users: true }
          }
        };

        await request(app)
          .post('/communications')
          .send(communicationData)
          .expect(201);

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id FROM users WHERE active = true',
          undefined
        );
      });

      it('should resolve specific_users target audience', async () => {
        const specificUsers = ['user-1', 'user-2'];
        const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
        mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

        const communicationData = {
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: {
            all_users: false,
            specific_users: specificUsers
          }
        };

        await request(app)
          .post('/communications')
          .send(communicationData)
          .expect(201);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('u.id = ANY($1)'),
          [specificUsers]
        );
      });

      it('should resolve departments target audience', async () => {
        const departments = ['dept-1', 'dept-2'];
        const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
        mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

        const communicationData = {
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: {
            all_users: false,
            departments: departments
          }
        };

        await request(app)
          .post('/communications')
          .send(communicationData)
          .expect(201);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('e.department_id = ANY($1)'),
          [departments]
        );
      });

      it('should resolve roles target audience', async () => {
        const roles = ['admin', 'manager'];
        const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
        mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

        const communicationData = {
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: {
            all_users: false,
            roles: roles
          }
        };

        await request(app)
          .post('/communications')
          .send(communicationData)
          .expect(201);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('u.role = ANY($1)'),
          [roles]
        );
      });

      it('should combine multiple target audience criteria', async () => {
        const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
        mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

        const communicationData = {
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: {
            all_users: false,
            specific_users: ['user-1'],
            departments: ['dept-1'],
            roles: ['admin']
          }
        };

        await request(app)
          .post('/communications')
          .send(communicationData)
          .expect(201);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('u.id = ANY($1) OR e.department_id = ANY($2) OR u.role = ANY($3)'),
          [['user-1'], ['dept-1'], ['admin']]
        );
      });
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 'user-123', role: 'employee', name: 'Regular User' };
        next();
      });
    });

    it('should deny access to creation for non-privileged users', async () => {
      requireAnyRole.mockImplementationOnce((...roles: string[]) =>
        (req: any, res: any, next: any) => {
          if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        }
      );

      await request(app)
        .post('/communications')
        .send({
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: { all_users: true }
        })
        .expect(403);
    });

    it('should deny access to statistics for non-privileged users', async () => {
      requireAnyRole.mockImplementationOnce((...roles: string[]) =>
        (req: any, res: any, next: any) => {
          if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        }
      );

      await request(app)
        .get('/communications/stats/overview')
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/communications')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle database connection errors', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await request(app)
        .post('/communications')
        .send({
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: { all_users: true }
        })
        .expect(500);
    });

    it('should handle transaction rollback on partial failures', async () => {
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO internal_communications')) {
          return Promise.resolve({ rows: [{ id: 'comm-1' }] });
        }
        if (query.includes('INSERT INTO communication_recipients')) {
          throw new Error('Recipient insertion failed');
        }
        return Promise.resolve({ rows: [] });
      });

      await request(app)
        .post('/communications')
        .send({
          title: 'Test',
          content: 'Test',
          type: 'announcement',
          target_audience: { all_users: true }
        })
        .expect(500);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});