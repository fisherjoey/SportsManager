/**
 * @fileoverview Unit tests for Resource Audit Service
 * @requires jest
 * @requires ../ResourceAuditService
 * 
 * Test Coverage:
 * - Audit log creation and storage
 * - Change diff calculation
 * - Audit log querying and filtering
 * - Audit statistics generation
 * - Export functionality
 * - Error handling and data integrity
 * 
 * @author Claude Assistant
 * @date 2025-01-23
 */

const ResourceAuditService = require('../ResourceAuditService');

// Mock dependencies
jest.mock('../config/database', () => {
  const mockKnex = {
    transaction: jest.fn(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    first: jest.fn(),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
  };
  
  // Make mockKnex callable as a function
  const callableMockKnex = jest.fn((table) => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    first: jest.fn(),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
  }));
  
  Object.assign(callableMockKnex, mockKnex);
  return callableMockKnex;
});

describe('ResourceAuditService', () => {
  let service;
  let mockDb;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = require('../config/database');
    service = new ResourceAuditService();
    
    // Spy on console to test logging behavior
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with correct table and default options', () => {
      expect(service.tableName).toBe('resource_audit_log');
      expect(service.options.defaultOrderBy).toBe('timestamp');
      expect(service.options.defaultOrderDirection).toBe('desc');
    });
  });

  describe('logAction', () => {
    const mockActionData = {
      user_id: 'user-123',
      resource_id: 'resource-456',
      action: 'edit',
      entity_type: 'resource',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      old_values: { title: 'Old Title' },
      new_values: { title: 'New Title' },
      metadata: { source: 'web_ui' }
    };

    it('should create audit log entry successfully', async () => {
      // Arrange
      const expectedLogEntry = {
        id: 'log-entry-123',
        ...mockActionData,
        timestamp: expect.any(Date),
        change_diff: expect.any(Object)
      };
      mockDb().insert().returning.mockResolvedValueOnce([expectedLogEntry]);

      // Act
      const result = await service.logAction(mockActionData);

      // Assert
      expect(result).toEqual(expectedLogEntry);
      expect(mockDb().insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockActionData.user_id,
        resource_id: mockActionData.resource_id,
        action: mockActionData.action,
        entity_type: mockActionData.entity_type,
        timestamp: expect.any(Date),
        change_diff: expect.any(Object)
      }));
    });

    it('should calculate diff when old and new values are provided', async () => {
      // Arrange
      jest.spyOn(service, 'calculateDiff');
      mockDb().insert().returning.mockResolvedValueOnce([{ id: 'log-123' }]);

      // Act
      await service.logAction(mockActionData);

      // Assert
      expect(service.calculateDiff).toHaveBeenCalledWith(
        mockActionData.old_values,
        mockActionData.new_values
      );
    });

    it('should handle missing optional fields', async () => {
      // Arrange
      const minimalActionData = {
        user_id: 'user-123',
        action: 'view'
      };
      mockDb().insert().returning.mockResolvedValueOnce([{ id: 'log-123' }]);

      // Act
      const result = await service.logAction(minimalActionData);

      // Assert
      expect(result).toBeDefined();
      expect(mockDb().insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: minimalActionData.user_id,
        resource_id: null,
        category_id: null,
        action: minimalActionData.action,
        entity_type: 'resource',
        metadata: {}
      }));
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDb().insert().returning.mockRejectedValueOnce(new Error('Database error'));

      // Act
      const result = await service.logAction(mockActionData);

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error logging resource action:',
        expect.any(Error)
      );
    });
  });

  describe('logResourceCreation', () => {
    const userId = 'user-123';
    const resourceId = 'resource-456';
    const resourceData = {
      title: 'New Resource',
      category_id: 'category-789',
      type: 'document'
    };
    const metadata = {
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0'
    };

    it('should log resource creation with correct parameters', async () => {
      // Arrange
      jest.spyOn(service, 'logAction').mockResolvedValueOnce({ id: 'log-123' });

      // Act
      await service.logResourceCreation(userId, resourceId, resourceData, metadata);

      // Assert
      expect(service.logAction).toHaveBeenCalledWith({
        user_id: userId,
        resource_id: resourceId,
        category_id: resourceData.category_id,
        action: 'create',
        entity_type: 'resource',
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        new_values: resourceData,
        metadata: {
          ...metadata,
          resource_type: resourceData.type,
          resource_title: resourceData.title
        }
      });
    });
  });

  describe('logResourceUpdate', () => {
    const userId = 'user-123';
    const resourceId = 'resource-456';
    const oldData = { title: 'Old Title', description: 'Old Description' };
    const newData = { title: 'New Title', description: 'New Description', category_id: 'category-789' };
    const metadata = { ip_address: '192.168.1.1' };

    it('should log resource update with old and new values', async () => {
      // Arrange
      jest.spyOn(service, 'logAction').mockResolvedValueOnce({ id: 'log-123' });

      // Act
      await service.logResourceUpdate(userId, resourceId, oldData, newData, metadata);

      // Assert
      expect(service.logAction).toHaveBeenCalledWith({
        user_id: userId,
        resource_id: resourceId,
        category_id: newData.category_id,
        action: 'edit',
        entity_type: 'resource',
        ip_address: metadata.ip_address,
        user_agent: undefined,
        old_values: oldData,
        new_values: newData,
        metadata: {
          ...metadata,
          resource_type: newData.type || oldData.type,
          resource_title: newData.title || oldData.title
        }
      });
    });
  });

  describe('getAuditLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        action: 'create',
        user_email: 'user1@example.com',
        resource_title: 'Resource 1'
      },
      {
        id: 'log-2',
        action: 'edit',
        user_email: 'user2@example.com',
        resource_title: 'Resource 2'
      }
    ];

    beforeEach(() => {
      // Setup default mock chain for complex query
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis()
      };

      mockDb.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
    });

    it('should return audit logs with pagination', async () => {
      // Arrange
      const filters = { user_id: 'user-123', limit: 10, offset: 0 };
      
      // Mock the count query and the main query
      mockDb().count().mockResolvedValueOnce([{ count: '25' }]);
      mockDb().orderBy().limit().offset.mockResolvedValueOnce(mockLogs);

      // Act
      const result = await service.getAuditLogs(filters);

      // Assert
      expect(result).toEqual({
        logs: mockLogs,
        pagination: {
          total: 25,
          limit: 10,
          offset: 0,
          hasMore: true
        }
      });
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const filters = {
        user_id: 'user-123',
        resource_id: 'resource-456',
        action: ['create', 'edit'],
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
        search: 'test search'
      };

      mockDb().count().mockResolvedValueOnce([{ count: '5' }]);
      mockDb().orderBy().limit().offset.mockResolvedValueOnce(mockLogs);

      // Act
      await service.getAuditLogs(filters);

      // Assert - verify that where clauses were called for each filter
      expect(mockDb().where).toHaveBeenCalledWith('resource_audit_log.user_id', filters.user_id);
      expect(mockDb().where).toHaveBeenCalledWith('resource_audit_log.resource_id', filters.resource_id);
      expect(mockDb().whereIn).toHaveBeenCalledWith('resource_audit_log.action', filters.action);
      expect(mockDb().where).toHaveBeenCalledWith('resource_audit_log.timestamp', '>=', filters.start_date);
      expect(mockDb().where).toHaveBeenCalledWith('resource_audit_log.timestamp', '<=', filters.end_date);
    });

    it('should handle single action filter', async () => {
      // Arrange
      const filters = { action: 'create' };
      mockDb().count().mockResolvedValueOnce([{ count: '1' }]);
      mockDb().orderBy().limit().offset.mockResolvedValueOnce([mockLogs[0]]);

      // Act
      await service.getAuditLogs(filters);

      // Assert
      expect(mockDb().where).toHaveBeenCalledWith('resource_audit_log.action', 'create');
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDb().leftJoin.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act & Assert
      await expect(service.getAuditLogs({})).rejects.toThrow('Failed to get audit logs: Database connection failed');
    });
  });

  describe('getAuditStatistics', () => {
    it('should return comprehensive audit statistics', async () => {
      // Arrange
      const mockStats = {
        total_actions: [{ total_actions: '100' }],
        actions_by_type: [
          { action: 'create', count: '30' },
          { action: 'edit', count: '40' },
          { action: 'view', count: '30' }
        ],
        entity_stats: [
          { entity_type: 'resource', count: '80' },
          { entity_type: 'category', count: '20' }
        ],
        user_stats: [
          { user_email: 'admin@example.com', count: '50' },
          { user_email: 'user@example.com', count: '30' }
        ],
        resource_stats: [
          { resource_title: 'Popular Resource', count: '25' },
          { resource_title: 'Another Resource', count: '15' }
        ]
      };

      // Mock each statistical query
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis()
      };

      mockDb.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);

      // Chain the mock returns for different queries
      mockQueryBuilder.count.mockResolvedValueOnce(mockStats.total_actions);
      mockQueryBuilder.groupBy.mockResolvedValueOnce(mockStats.actions_by_type);
      mockQueryBuilder.groupBy.mockResolvedValueOnce(mockStats.entity_stats);
      mockQueryBuilder.leftJoin.mockResolvedValueOnce(mockStats.user_stats);
      mockQueryBuilder.where.mockResolvedValueOnce(mockStats.resource_stats);

      // Act
      const result = await service.getAuditStatistics();

      // Assert
      expect(result).toEqual({
        total_actions: 100,
        actions_by_type: [
          { action: 'create', count: 30 },
          { action: 'edit', count: 40 },
          { action: 'view', count: 30 }
        ],
        actions_by_entity: [
          { entity_type: 'resource', count: 80 },
          { entity_type: 'category', count: 20 }
        ],
        most_active_users: [
          { user_email: 'admin@example.com', count: 50 },
          { user_email: 'user@example.com', count: 30 }
        ],
        most_accessed_resources: [
          { resource_title: 'Popular Resource', count: 25 },
          { resource_title: 'Another Resource', count: 15 }
        ]
      });
    });

    it('should apply date filters to statistics', async () => {
      // Arrange
      const filters = {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31')
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis()
      };

      mockDb.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);

      // Mock minimal returns
      mockQueryBuilder.count.mockResolvedValueOnce([{ total_actions: '10' }]);
      mockQueryBuilder.groupBy.mockResolvedValueOnce([]);
      mockQueryBuilder.groupBy.mockResolvedValueOnce([]);
      mockQueryBuilder.leftJoin.mockResolvedValueOnce([]);
      mockQueryBuilder.where.mockResolvedValueOnce([]);

      // Act
      await service.getAuditStatistics(filters);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('timestamp', '>=', filters.start_date);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('timestamp', '<=', filters.end_date);
    });
  });

  describe('calculateDiff', () => {
    it('should detect added fields', () => {
      // Arrange
      const oldValues = { title: 'Old Title' };
      const newValues = { title: 'Old Title', description: 'New Description' };

      // Act
      const diff = service.calculateDiff(oldValues, newValues);

      // Assert
      expect(diff.added).toEqual([{ field: 'description', value: 'New Description' }]);
      expect(diff.changed).toEqual([]);
      expect(diff.removed).toEqual([]);
    });

    it('should detect removed fields', () => {
      // Arrange
      const oldValues = { title: 'Old Title', description: 'Old Description' };
      const newValues = { title: 'Old Title' };

      // Act
      const diff = service.calculateDiff(oldValues, newValues);

      // Assert
      expect(diff.added).toEqual([]);
      expect(diff.changed).toEqual([]);
      expect(diff.removed).toEqual([{ field: 'description', value: 'Old Description' }]);
    });

    it('should detect changed fields', () => {
      // Arrange
      const oldValues = { title: 'Old Title', status: 'draft' };
      const newValues = { title: 'New Title', status: 'published' };

      // Act
      const diff = service.calculateDiff(oldValues, newValues);

      // Assert
      expect(diff.added).toEqual([]);
      expect(diff.changed).toEqual([
        { field: 'title', old_value: 'Old Title', new_value: 'New Title' },
        { field: 'status', old_value: 'draft', new_value: 'published' }
      ]);
      expect(diff.removed).toEqual([]);
    });

    it('should handle null and undefined values', () => {
      // Arrange
      const oldValues = { title: null, description: undefined };
      const newValues = { title: 'New Title', other: 'value' };

      // Act
      const diff = service.calculateDiff(oldValues, newValues);

      // Assert
      expect(diff.added).toEqual([{ field: 'other', value: 'value' }]);
      expect(diff.changed).toEqual([{ field: 'title', old_value: null, new_value: 'New Title' }]);
      expect(diff.removed).toEqual([]);
    });

    it('should handle errors gracefully', () => {
      // Arrange
      const invalidOldValues = null;
      const newValues = { title: 'Title' };

      // Act
      const diff = service.calculateDiff(invalidOldValues, newValues);

      // Assert
      expect(diff.error).toBe('Failed to calculate diff');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error calculating diff:', expect.any(Error));
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete logs older than specified days', async () => {
      // Arrange
      const daysToKeep = 90;
      mockDb().where().del.mockResolvedValueOnce(15);

      // Act
      const result = await service.cleanOldLogs(daysToKeep);

      // Assert
      expect(result).toBe(15);
      expect(mockDb().where).toHaveBeenCalledWith('timestamp', '<', expect.any(Date));
      expect(consoleSpy.log).toHaveBeenCalledWith('Cleaned 15 old audit log entries older than 90 days');
    });

    it('should handle database errors during cleanup', async () => {
      // Arrange
      mockDb().where().del.mockRejectedValueOnce(new Error('Cleanup failed'));

      // Act & Assert
      await expect(service.cleanOldLogs(30)).rejects.toThrow('Failed to clean old audit logs: Cleanup failed');
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs with statistics', async () => {
      // Arrange
      const filters = { user_id: 'user-123' };
      const mockLogs = [{ id: 'log-1', action: 'create' }];
      const mockStats = { total_actions: 1 };

      jest.spyOn(service, 'getAuditLogs').mockResolvedValueOnce({ logs: mockLogs });
      jest.spyOn(service, 'getAuditStatistics').mockResolvedValueOnce(mockStats);

      // Act
      const result = await service.exportAuditLogs(filters);

      // Assert
      expect(result).toEqual({
        export_date: expect.any(String),
        filters,
        statistics: mockStats,
        logs: mockLogs
      });
    });

    it('should handle export errors', async () => {
      // Arrange
      jest.spyOn(service, 'getAuditLogs').mockRejectedValueOnce(new Error('Export failed'));

      // Act & Assert
      await expect(service.exportAuditLogs({})).rejects.toThrow('Failed to export audit logs: Export failed');
    });
  });

  describe('Specialized Audit Methods', () => {
    it('should log category actions correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const categoryId = 'category-456';
      const action = 'create';
      const newData = { name: 'New Category' };
      const metadata = { ip_address: '192.168.1.1' };

      jest.spyOn(service, 'logAction').mockResolvedValueOnce({ id: 'log-123' });

      // Act
      await service.logCategoryAction(userId, categoryId, action, null, newData, metadata);

      // Assert
      expect(service.logAction).toHaveBeenCalledWith({
        user_id: userId,
        category_id: categoryId,
        action,
        entity_type: 'category',
        ip_address: metadata.ip_address,
        user_agent: undefined,
        old_values: null,
        new_values: newData,
        metadata: {
          ...metadata,
          category_name: newData.name
        }
      });
    });

    it('should log permission changes correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceId = 'resource-456';
      const action = 'set_permissions';
      const permissionData = { role_id: 'role-789', permissions: ['view', 'edit'] };
      const metadata = { ip_address: '192.168.1.1' };

      jest.spyOn(service, 'logAction').mockResolvedValueOnce({ id: 'log-123' });

      // Act
      await service.logPermissionChange(userId, resourceId, null, action, permissionData, metadata);

      // Assert
      expect(service.logAction).toHaveBeenCalledWith({
        user_id: userId,
        resource_id: resourceId,
        category_id: null,
        action,
        entity_type: 'permission',
        ip_address: metadata.ip_address,
        user_agent: undefined,
        new_values: permissionData,
        metadata
      });
    });
  });

  describe('User and Resource History', () => {
    it('should get user recent activity', async () => {
      // Arrange
      const userId = 'user-123';
      const mockActivities = [
        { id: 'log-1', action: 'create', resource_title: 'Resource 1' },
        { id: 'log-2', action: 'edit', resource_title: 'Resource 2' }
      ];

      mockDb().select().leftJoin().leftJoin().where().orderBy().limit.mockResolvedValueOnce(mockActivities);

      // Act
      const result = await service.getUserRecentActivity(userId, 10);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(mockDb().where).toHaveBeenCalledWith('resource_audit_log.user_id', userId);
      expect(mockDb().limit).toHaveBeenCalledWith(10);
    });

    it('should get resource history', async () => {
      // Arrange
      const resourceId = 'resource-123';
      const mockHistory = [
        { id: 'log-1', action: 'create', user_email: 'user1@example.com' },
        { id: 'log-2', action: 'edit', user_email: 'user2@example.com' }
      ];

      mockDb().select().leftJoin().where().orderBy().limit.mockResolvedValueOnce(mockHistory);

      // Act
      const result = await service.getResourceHistory(resourceId, 50);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockDb().where).toHaveBeenCalledWith('resource_audit_log.resource_id', resourceId);
      expect(mockDb().limit).toHaveBeenCalledWith(50);
    });
  });
});