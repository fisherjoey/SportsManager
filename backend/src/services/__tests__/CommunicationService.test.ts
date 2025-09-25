/**
 * @fileoverview Unit tests for Communication Service
 * @requires jest
 * @requires ../CommunicationService
 *
 * Test Coverage:
 * - Communication CRUD operations
 * - Target audience resolution
 * - Publishing and archiving workflow
 * - Read tracking and acknowledgments
 * - Statistics calculation
 * - Error handling
 *
 * @author Claude Assistant
 * @date 2025-01-23
 */

import { Pool, PoolClient } from 'pg';
import { CommunicationService } from '../CommunicationService';
import {
  CreateCommunicationRequest,
  TargetAudience,
  CommunicationFilters
} from '../../types/communication';

// Mock pg
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn(),
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('CommunicationService', () => {
  let service: CommunicationService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    };
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(mockClient);
    service = new CommunicationService(mockPool as Pool);
  });

  describe('getCommunications', () => {
    const mockCommunications = [
      {
        id: 'comm-1',
        title: 'Test Communication',
        content: 'Test content',
        type: 'announcement',
        priority: 'normal',
        author_name: 'Test Author',
        target_audience: '{"all_users": true}',
        attachments: '[]',
        tags: '["test"]',
        sent_at: new Date(),
        read_at: null,
        acknowledged_at: null,
        delivery_status: 'delivered',
        is_unread: true,
        requires_ack: false
      }
    ];

    it('should fetch communications with default filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCommunications });

      const result = await service.getCommunications('user-123', 'admin', {});

      expect(result.communications).toHaveLength(1);
      expect(result.communications[0]).toMatchObject({
        id: 'comm-1',
        title: 'Test Communication',
        type: 'announcement'
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1
      });
    });

    it('should apply type filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCommunications });

      const filters: CommunicationFilters = { type: 'announcement' };
      await service.getCommunications('user-123', 'admin', filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.type = $3'),
        expect.arrayContaining(['announcement'])
      );
    });

    it('should apply priority filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCommunications });

      const filters: CommunicationFilters = { priority: 'urgent' };
      await service.getCommunications('user-123', 'admin', filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.priority = $3'),
        expect.arrayContaining(['urgent'])
      );
    });

    it('should apply unread_only filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCommunications });

      const filters: CommunicationFilters = { unread_only: true };
      await service.getCommunications('user-123', 'admin', filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND cr.read_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should handle pagination', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCommunications });

      const filters: CommunicationFilters = { page: 2, limit: 10 };
      await service.getCommunications('user-123', 'admin', filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $3 OFFSET $4'),
        expect.arrayContaining([10, 10])
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getCommunications('user-123', 'admin', {})
      ).rejects.toThrow('Failed to fetch communications');
    });
  });

  describe('getCommunicationById', () => {
    const mockCommunication = {
      id: 'comm-1',
      title: 'Test Communication',
      content: 'Test content',
      author_name: 'Test Author',
      target_audience: '{"all_users": true}',
      attachments: '[]',
      tags: '["test"]',
      sent_at: new Date(),
      read_at: null,
      acknowledged_at: null,
      delivery_status: 'delivered'
    };

    it('should fetch single communication by ID', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockCommunication] });

      const result = await service.getCommunicationById('comm-1', 'user-123', 'admin');

      expect(result).toBeDefined();
      expect(result?.id).toBe('comm-1');
      expect(result?.title).toBe('Test Communication');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1'),
        ['comm-1', 'user-123', 'admin']
      );
    });

    it('should return null for non-existent communication', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getCommunicationById('non-existent', 'user-123', 'admin');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getCommunicationById('comm-1', 'user-123', 'admin')
      ).rejects.toThrow('Failed to fetch communication');
    });
  });

  describe('markAsRead', () => {
    it('should mark communication as read', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.markAsRead('comm-1', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE communication_recipients SET read_at = CURRENT_TIMESTAMP WHERE communication_id = $1 AND recipient_id = $2',
        ['comm-1', 'user-123']
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.markAsRead('comm-1', 'user-123')
      ).rejects.toThrow('Failed to mark communication as read');
    });
  });

  describe('createCommunication', () => {
    const mockCommunicationData: CreateCommunicationRequest = {
      title: 'New Communication',
      content: 'Communication content',
      type: 'announcement',
      priority: 'normal',
      target_audience: {
        all_users: true
      },
      requires_acknowledgment: false,
      tags: ['test']
    };

    const mockRecipients = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];

    beforeEach(() => {
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO internal_communications')) {
          return Promise.resolve({
            rows: [{
              id: 'comm-new',
              ...mockCommunicationData,
              author_id: 'user-123',
              status: 'draft',
              created_at: new Date(),
              target_audience: JSON.stringify(mockCommunicationData.target_audience),
              attachments: '[]',
              tags: JSON.stringify(mockCommunicationData.tags)
            }]
          });
        }
        if (query.includes('INSERT INTO communication_recipients')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE internal_communications')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should create new communication successfully', async () => {
      // Mock recipient resolution
      mockPool.query.mockResolvedValueOnce({ rows: mockRecipients });

      const result = await service.createCommunication(
        mockCommunicationData,
        'user-123',
        []
      );

      expect(result).toHaveProperty('id', 'comm-new');
      expect(result).toHaveProperty('recipient_count', 3);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle attachments', async () => {
      const attachments = [
        {
          filename: 'document.pdf',
          path: '/uploads/document.pdf',
          size: 12345,
          mimetype: 'application/pdf'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRecipients });

      await service.createCommunication(
        mockCommunicationData,
        'user-123',
        attachments
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO internal_communications'),
        expect.arrayContaining([
          expect.stringContaining('[{"filename":"document.pdf"')
        ])
      );
    });

    it('should publish immediately if publish_date is in the past', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const dataWithPastDate = { ...mockCommunicationData, publish_date: pastDate };

      mockPool.query.mockResolvedValueOnce({ rows: mockRecipients });

      await service.createCommunication(dataWithPastDate, 'user-123', []);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE internal_communications SET status = $1 WHERE id = $2',
        ['published', 'comm-new']
      );
    });

    it('should handle database errors during creation', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.createCommunication(mockCommunicationData, 'user-123', [])
      ).rejects.toThrow('Failed to create communication');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('acknowledgeCommunication', () => {
    it('should acknowledge communication successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ requires_acknowledgment: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 'recipient-1' }] });

      const result = await service.acknowledgeCommunication('comm-1', 'user-123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE communication_recipients'),
        ['comm-1', 'user-123']
      );
    });

    it('should return false for non-acknowledgeable communication', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.acknowledgeCommunication('comm-1', 'user-123');

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.acknowledgeCommunication('comm-1', 'user-123')
      ).rejects.toThrow('Failed to acknowledge communication');
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread communications count', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ unread_count: '5' }] });

      const result = await service.getUnreadCount('user-123');

      expect(result).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as unread_count'),
        ['user-123']
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getUnreadCount('user-123')
      ).rejects.toThrow('Failed to fetch unread count');
    });
  });

  describe('getPendingAcknowledgments', () => {
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

      const result = await service.getPendingAcknowledgments('user-123');

      expect(result).toEqual(mockPendingAcks);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('c.requires_acknowledgment = true'),
        ['user-123']
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getPendingAcknowledgments('user-123')
      ).rejects.toThrow('Failed to fetch pending acknowledgments');
    });
  });

  describe('getCommunicationStats', () => {
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
      { type: 'memo', count: '15', published_count: '15' }
    ];

    it('should get comprehensive communication statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOverviewStats] })
        .mockResolvedValueOnce({ rows: [mockEngagementStats] })
        .mockResolvedValueOnce({ rows: mockTypeBreakdown });

      const result = await service.getCommunicationStats();

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('engagement');
      expect(result).toHaveProperty('typeBreakdown');
      expect(result.overview.total_communications).toBe(50);
      expect(result.engagement.total_recipients).toBe(1000);
      expect(result.typeBreakdown).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getCommunicationStats()
      ).rejects.toThrow('Failed to fetch communication statistics');
    });
  });

  describe('Target Audience Resolution', () => {
    beforeEach(() => {
      // Reset mock client setup for target audience tests
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO internal_communications')) {
          return Promise.resolve({
            rows: [{
              id: 'comm-new',
              title: 'Test',
              content: 'Test',
              type: 'announcement',
              author_id: 'author-123',
              status: 'draft',
              created_at: new Date(),
              target_audience: '{}',
              attachments: '[]',
              tags: '[]'
            }]
          });
        }
        if (query.includes('INSERT INTO communication_recipients')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE internal_communications')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should resolve all_users target audience', async () => {
      const targetAudience: TargetAudience = { all_users: true };
      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];

      mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

      const communicationData: CreateCommunicationRequest = {
        title: 'Test',
        content: 'Test',
        type: 'announcement',
        target_audience: targetAudience
      };

      await service.createCommunication(communicationData, 'author-123', []);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE active = true'
      );
    });

    it('should resolve specific_users target audience', async () => {
      const specificUsers = ['user-1', 'user-2'];
      const targetAudience: TargetAudience = {
        all_users: false,
        specific_users: specificUsers
      };

      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
      mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

      const communicationData: CreateCommunicationRequest = {
        title: 'Test',
        content: 'Test',
        type: 'announcement',
        target_audience: targetAudience
      };

      const result = await service.createCommunication(communicationData, 'author-123', []);

      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('u.id = ANY($1)'),
        [specificUsers]
      );
    });

    it('should resolve departments target audience', async () => {
      const departments = ['dept-1', 'dept-2'];
      const targetAudience: TargetAudience = {
        all_users: false,
        departments: departments
      };

      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
      mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

      const communicationData: CreateCommunicationRequest = {
        title: 'Test',
        content: 'Test',
        type: 'announcement',
        target_audience: targetAudience
      };

      const result = await service.createCommunication(communicationData, 'author-123', []);

      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('e.department_id = ANY($1)'),
        [departments]
      );
    });

    it('should resolve roles target audience', async () => {
      const roles = ['admin', 'manager'];
      const targetAudience: TargetAudience = {
        all_users: false,
        roles: roles
      };

      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
      mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

      const communicationData: CreateCommunicationRequest = {
        title: 'Test',
        content: 'Test',
        type: 'announcement',
        target_audience: targetAudience
      };

      const result = await service.createCommunication(communicationData, 'author-123', []);

      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('u.role = ANY($1)'),
        [roles]
      );
    });

    it('should combine multiple target audience criteria', async () => {
      const targetAudience: TargetAudience = {
        all_users: false,
        specific_users: ['user-1'],
        departments: ['dept-1'],
        roles: ['admin']
      };

      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];
      mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

      const communicationData: CreateCommunicationRequest = {
        title: 'Test',
        content: 'Test',
        type: 'announcement',
        target_audience: targetAudience
      };

      const result = await service.createCommunication(communicationData, 'author-123', []);

      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('u.id = ANY($1) OR e.department_id = ANY($2) OR u.role = ANY($3)'),
        [['user-1'], ['dept-1'], ['admin']]
      );
    });
  });
});