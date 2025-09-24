// @ts-nocheck

/**
 * @fileoverview Unit tests for Resource Version Service
 * @requires jest
 * @requires ../ResourceVersionService
 * 
 * Test Coverage:
 * - Version creation and management
 * - Version history retrieval and pagination
 * - Version comparison and diff analysis
 * - Version restoration functionality
 * - Version cleanup and maintenance
 * - Statistics generation
 * - Error handling scenarios
 * 
 * @author Claude Assistant
 * @date 2025-01-23
 */

import ResourceVersionService from '../ResourceVersionService';

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
    commit: jest.fn(),
    rollback: jest.fn()
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
  }));
  
  Object.assign(callableMockKnex, mockKnex);
  
  // Add transaction mock
  callableMockKnex.transaction = jest.fn((callback) => {
    const mockTrx = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      commit: jest.fn(),
      rollback: jest.fn()
    };
    
    // Make mockTrx callable as a function too
    const callableMockTrx = jest.fn((table) => mockTrx);
    Object.assign(callableMockTrx, mockTrx);
    
    return callback ? callback(callableMockTrx) : Promise.resolve(callableMockTrx);
  });
  
  return callableMockKnex;
});

describe('ResourceVersionService', () => {
  let service;
  let mockDb;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = require('../config/database');
    service = new ResourceVersionService();
    
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
      expect(service.tableName).toBe('resource_versions');
      expect(service.options.defaultOrderBy).toBe('version_number');
      expect(service.options.defaultOrderDirection).toBe('desc');
      expect(service.maxVersionsPerResource).toBe(50);
    });
  });

  describe('createVersion', () => {
    const resourceId = 'resource-123';
    const resourceData = {
      title: 'Test Resource',
      description: 'Test Description',
      type: 'document',
      category_id: 'category-456',
      metadata: { content: 'Test content' },
      is_featured: false
    };
    const userId = 'user-789';
    const changeReason = 'Initial version';

    it('should create first version with version number 1', async () => {
      // Arrange
      mockDb().where().orderBy().first.mockResolvedValueOnce(null); // No existing versions
      const expectedVersion = { id: 'version-123', version_number: 1, ...resourceData };
      mockDb().insert().returning.mockResolvedValueOnce([expectedVersion]);
      jest.spyOn(service, 'cleanupOldVersions').mockResolvedValueOnce(0);

      // Act
      const result = await service.createVersion(resourceId, resourceData, userId, changeReason);

      // Assert
      expect(result).toEqual(expectedVersion);
      expect(mockDb().insert).toHaveBeenCalledWith(expect.objectContaining({
        resource_id: resourceId,
        version_number: 1,
        title: resourceData.title,
        description: resourceData.description,
        created_by: userId,
        change_reason: changeReason
      }));
    });

    it('should create subsequent version with incremented version number', async () => {
      // Arrange
      mockDb().where().orderBy().first.mockResolvedValueOnce({ version_number: 3 }); // Existing version
      const expectedVersion = { id: 'version-456', version_number: 4 };
      mockDb().insert().returning.mockResolvedValueOnce([expectedVersion]);
      jest.spyOn(service, 'cleanupOldVersions').mockResolvedValueOnce(0);

      // Act
      const result = await service.createVersion(resourceId, resourceData, userId, changeReason);

      // Assert
      expect(result.version_number).toBe(4);
      expect(mockDb().insert).toHaveBeenCalledWith(expect.objectContaining({
        version_number: 4
      }));
    });

    it('should include version metadata', async () => {
      // Arrange
      mockDb().where().orderBy().first.mockResolvedValueOnce(null);
      const expectedVersion = { id: 'version-123' };
      mockDb().insert().returning.mockResolvedValueOnce([expectedVersion]);
      jest.spyOn(service, 'cleanupOldVersions').mockResolvedValueOnce(0);

      const metadata = { custom_field: 'custom_value' };

      // Act
      await service.createVersion(resourceId, resourceData, userId, changeReason, metadata);

      // Assert
      expect(mockDb().insert).toHaveBeenCalledWith(expect.objectContaining({
        version_metadata: expect.objectContaining({
          ...metadata,
          creation_timestamp: expect.any(String),
          resource_state: 'active',
          version_type: 'initial'
        })
      }));
    });

    it('should cleanup old versions after creation', async () => {
      // Arrange
      mockDb().where().orderBy().first.mockResolvedValueOnce(null);
      mockDb().insert().returning.mockResolvedValueOnce([{ id: 'version-123' }]);
      jest.spyOn(service, 'cleanupOldVersions').mockResolvedValueOnce(5);

      // Act
      await service.createVersion(resourceId, resourceData, userId, changeReason);

      // Assert
      expect(service.cleanupOldVersions).toHaveBeenCalledWith(resourceId);
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDb().where().orderBy().first.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(
        service.createVersion(resourceId, resourceData, userId, changeReason)
      ).rejects.toThrow('Failed to create resource version: Database error');
    });
  });

  describe('getVersionHistory', () => {
    const resourceId = 'resource-123';
    const mockVersions = [
      { id: 'v1', version_number: 3, title: 'Version 3' },
      { id: 'v2', version_number: 2, title: 'Version 2' },
      { id: 'v3', version_number: 1, title: 'Version 1' }
    ];

    it('should return version history with pagination', async () => {
      // Arrange
      const options = { limit: 2, offset: 0, includeContent: false };
      
      mockDb().where().count.mockResolvedValueOnce([{ count: '3' }]);
      mockDb().select().leftJoin().where().orderBy().limit().offset.mockResolvedValueOnce(mockVersions.slice(0, 2));

      // Act
      const result = await service.getVersionHistory(resourceId, options);

      // Assert
      expect(result).toEqual({
        versions: mockVersions.slice(0, 2),
        pagination: {
          total: 3,
          limit: 2,
          offset: 0,
          hasMore: true
        }
      });
    });

    it('should exclude content by default for performance', async () => {
      // Arrange
      mockDb().where().count.mockResolvedValueOnce([{ count: '1' }]);
      mockDb().select().leftJoin().where().orderBy().limit().offset.mockResolvedValueOnce([mockVersions[0]]);

      // Act
      await service.getVersionHistory(resourceId);

      // Assert
      // Verify that content is not included in the select
      expect(mockDb().select).toHaveBeenCalledWith([
        'resource_versions.id',
        'resource_versions.resource_id',
        'resource_versions.version_number',
        'resource_versions.title',
        'resource_versions.description',
        'resource_versions.file_url',
        'resource_versions.file_name',
        'resource_versions.file_size',
        'resource_versions.mime_type',
        'resource_versions.external_url',
        'resource_versions.type',
        'resource_versions.category_id',
        'resource_versions.metadata',
        'resource_versions.version_metadata',
        'resource_versions.is_featured',
        'resource_versions.change_reason',
        'resource_versions.created_by',
        'resource_versions.created_at',
        'users.email as created_by_email'
      ]);
    });

    it('should include content when explicitly requested', async () => {
      // Arrange
      const options = { includeContent: true };
      mockDb().where().count.mockResolvedValueOnce([{ count: '1' }]);
      mockDb().select().leftJoin().where().orderBy().limit().offset.mockResolvedValueOnce([mockVersions[0]]);

      // Act
      await service.getVersionHistory(resourceId, options);

      // Assert
      expect(mockDb().select).toHaveBeenCalledWith([
        'resource_versions.*',
        'users.email as created_by_email'
      ]);
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDb().where().count.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(
        service.getVersionHistory(resourceId)
      ).rejects.toThrow('Failed to get version history: Database error');
    });
  });

  describe('getVersion', () => {
    const resourceId = 'resource-123';
    const versionNumber = 2;

    it('should return specific version with user information', async () => {
      // Arrange
      const expectedVersion = {
        id: 'version-456',
        resource_id: resourceId,
        version_number: versionNumber,
        title: 'Version 2',
        created_by_email: 'user@example.com'
      };
      mockDb().select().leftJoin().where().where().first.mockResolvedValueOnce(expectedVersion);

      // Act
      const result = await service.getVersion(resourceId, versionNumber);

      // Assert
      expect(result).toEqual(expectedVersion);
      expect(mockDb().where).toHaveBeenCalledWith('resource_versions.resource_id', resourceId);
      expect(mockDb().where).toHaveBeenCalledWith('resource_versions.version_number', versionNumber);
    });

    it('should return null when version not found', async () => {
      // Arrange
      mockDb().select().leftJoin().where().where().first.mockResolvedValueOnce(undefined);

      // Act
      const result = await service.getVersion(resourceId, versionNumber);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDb().select().leftJoin().where().where().first.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(
        service.getVersion(resourceId, versionNumber)
      ).rejects.toThrow('Failed to get version: Database error');
    });
  });

  describe('restoreVersion', () => {
    const resourceId = 'resource-123';
    const versionNumber = 2;
    const userId = 'user-789';
    const restoreReason = 'Rollback to working version';

    const mockVersion = {
      id: 'version-456',
      resource_id: resourceId,
      version_number: versionNumber,
      title: 'Previous Title',
      description: 'Previous Description',
      type: 'document',
      category_id: 'category-123'
    };

    const mockCurrentResource = {
      id: resourceId,
      title: 'Current Title',
      description: 'Current Description'
    };

    it('should restore resource to previous version successfully', async () => {
      // Arrange
      const mockTrx = {
        commit: jest.fn(),
        rollback: jest.fn()
      };
      
      mockDb.transaction.mockImplementation(async (callback) => {
        const trxObj = {
          ...mockTrx,
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn(),
          update: jest.fn().mockReturnThis(),
          returning: jest.fn().mockReturnThis()
        };
        
        // Make trxObj callable
        const callableTrx = jest.fn((table) => trxObj);
        Object.assign(callableTrx, trxObj);
        
        // Mock transaction queries
        trxObj.first
          .mockResolvedValueOnce(mockVersion) // version to restore
          .mockResolvedValueOnce(mockCurrentResource); // current resource
        
        const restoredResource = { ...mockCurrentResource, ...mockVersion };
        trxObj.returning.mockResolvedValueOnce([restoredResource]);
        
        return await callback(callableTrx);
      });

      jest.spyOn(service, 'createVersionInTransaction').mockResolvedValueOnce({ id: 'new-version' });

      // Act
      const result = await service.restoreVersion(resourceId, versionNumber, userId, restoreReason);

      // Assert
      expect(result).toBeDefined();
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(service.createVersionInTransaction).toHaveBeenCalled();
    });

    it('should handle version not found error', async () => {
      // Arrange
      const mockTrx = {
        commit: jest.fn(),
        rollback: jest.fn()
      };
      
      mockDb.transaction.mockImplementation(async (callback) => {
        const trxObj = {
          ...mockTrx,
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn()
        };
        
        const callableTrx = jest.fn((table) => trxObj);
        Object.assign(callableTrx, trxObj);
        
        trxObj.first.mockResolvedValueOnce(null); // Version not found
        
        return await callback(callableTrx);
      });

      // Act & Assert
      await expect(
        service.restoreVersion(resourceId, versionNumber, userId, restoreReason)
      ).rejects.toThrow(`Version ${versionNumber} not found for resource ${resourceId}`);
      
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    it('should handle resource not found error', async () => {
      // Arrange
      const mockTrx = {
        commit: jest.fn(),
        rollback: jest.fn()
      };
      
      mockDb.transaction.mockImplementation(async (callback) => {
        const trxObj = {
          ...mockTrx,
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn()
        };
        
        const callableTrx = jest.fn((table) => trxObj);
        Object.assign(callableTrx, trxObj);
        
        trxObj.first
          .mockResolvedValueOnce(mockVersion) // version exists
          .mockResolvedValueOnce(null); // resource not found
        
        return await callback(callableTrx);
      });

      // Act & Assert
      await expect(
        service.restoreVersion(resourceId, versionNumber, userId, restoreReason)
      ).rejects.toThrow(`Resource ${resourceId} not found`);
      
      expect(mockTrx.rollback).toHaveBeenCalled();
    });
  });

  describe('compareVersions', () => {
    const resourceId = 'resource-123';
    const version1 = 1;
    const version2 = 2;

    const mockVersion1 = {
      version_number: 1,
      title: 'Old Title',
      description: 'Old Description',
      type: 'document',
      created_at: '2025-01-01T00:00:00Z',
      created_by_email: 'user1@example.com',
      change_reason: 'Initial version',
      metadata: { old_field: 'old_value' }
    };

    const mockVersion2 = {
      version_number: 2,
      title: 'New Title',
      description: 'Old Description', // Same
      type: 'document', // Same
      created_at: '2025-01-02T00:00:00Z',
      created_by_email: 'user2@example.com',
      change_reason: 'Updated title',
      metadata: { new_field: 'new_value' }
    };

    it('should compare two versions and return differences', async () => {
      // Arrange
      jest.spyOn(service, 'getVersion')
        .mockResolvedValueOnce(mockVersion1)
        .mockResolvedValueOnce(mockVersion2);

      jest.spyOn(service, 'compareObjects').mockReturnValueOnce({
        added: [{ key: 'new_field', value: 'new_value' }],
        removed: [{ key: 'old_field', value: 'old_value' }],
        changed: []
      });

      // Act
      const result = await service.compareVersions(resourceId, version1, version2);

      // Assert
      expect(result).toEqual({
        resource_id: resourceId,
        version1: {
          number: version1,
          created_at: mockVersion1.created_at,
          created_by: mockVersion1.created_by_email,
          change_reason: mockVersion1.change_reason
        },
        version2: {
          number: version2,
          created_at: mockVersion2.created_at,
          created_by: mockVersion2.created_by_email,
          change_reason: mockVersion2.change_reason
        },
        differences: [
          {
            field: 'title',
            version1_value: 'Old Title',
            version2_value: 'New Title',
            change_type: 'modified'
          }
        ],
        similarities: [
          { field: 'description', value: 'Old Description' },
          { field: 'type', value: 'document' }
        ],
        metadata_differences: expect.any(Object),
        summary: expect.any(Object)
      });
    });

    it('should handle version not found error', async () => {
      // Arrange
      jest.spyOn(service, 'getVersion')
        .mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.compareVersions(resourceId, version1, version2)
      ).rejects.toThrow(`Version ${version1} not found`);
    });

    it('should handle comparison errors', async () => {
      // Arrange
      jest.spyOn(service, 'getVersion')
        .mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(
        service.compareVersions(resourceId, version1, version2)
      ).rejects.toThrow('Failed to compare versions: Database error');
    });
  });

  describe('getVersionStatistics', () => {
    const resourceId = 'resource-123';

    it('should return comprehensive version statistics', async () => {
      // Arrange
      mockDb().where().count.mockResolvedValueOnce([{ total_versions: '5' }]);
      
      const mockVersionsByUser = [
        { user_email: 'user1@example.com', count: '3' },
        { user_email: 'user2@example.com', count: '2' }
      ];
      mockDb().select().count().leftJoin().where().groupBy().orderBy.mockResolvedValueOnce(mockVersionsByUser);

      const mockFirstVersion = { version_number: 1, created_at: '2025-01-01', created_by: 'user-1' };
      const mockLatestVersion = { version_number: 5, created_at: '2025-01-05', created_by: 'user-2' };
      
      mockDb().where().orderBy().first
        .mockResolvedValueOnce(mockFirstVersion) // first version
        .mockResolvedValueOnce(mockLatestVersion); // latest version

      // Act
      const result = await service.getVersionStatistics(resourceId);

      // Assert
      expect(result).toEqual({
        total_versions: 5,
        first_version: {
          number: mockFirstVersion.version_number,
          created_at: mockFirstVersion.created_at,
          created_by: mockFirstVersion.created_by
        },
        latest_version: {
          number: mockLatestVersion.version_number,
          created_at: mockLatestVersion.created_at,
          created_by: mockLatestVersion.created_by
        },
        versions_by_user: [
          { user_email: 'user1@example.com', count: 3 },
          { user_email: 'user2@example.com', count: 2 }
        ]
      });
    });

    it('should handle resource with no versions', async () => {
      // Arrange
      mockDb().where().count.mockResolvedValueOnce([{ total_versions: '0' }]);
      mockDb().select().count().leftJoin().where().groupBy().orderBy.mockResolvedValueOnce([]);
      mockDb().where().orderBy().first
        .mockResolvedValueOnce(null) // no first version
        .mockResolvedValueOnce(null); // no latest version

      // Act
      const result = await service.getVersionStatistics(resourceId);

      // Assert
      expect(result).toEqual({
        total_versions: 0,
        first_version: null,
        latest_version: null,
        versions_by_user: []
      });
    });
  });

  describe('cleanupOldVersions', () => {
    const resourceId = 'resource-123';

    it('should not clean when within version limit', async () => {
      // Arrange
      service.setMaxVersionsPerResource(10);
      mockDb().where().count().first.mockResolvedValueOnce({ count: '8' });

      // Act
      const result = await service.cleanupOldVersions(resourceId);

      // Assert
      expect(result).toBe(0);
      expect(mockDb().del).not.toHaveBeenCalled();
    });

    it('should clean old versions when exceeding limit', async () => {
      // Arrange
      service.setMaxVersionsPerResource(3);
      mockDb().where().count().first.mockResolvedValueOnce({ count: '5' });
      
      const versionsToDelete = [
        { id: 'v1', version_number: 1 },
        { id: 'v2', version_number: 2 }
      ];
      mockDb().where().orderBy().offset.mockResolvedValueOnce(versionsToDelete);
      mockDb().whereIn().del.mockResolvedValueOnce(2);

      // Act
      const result = await service.cleanupOldVersions(resourceId);

      // Assert
      expect(result).toBe(2);
      expect(mockDb().whereIn).toHaveBeenCalledWith('id', ['v1', 'v2']);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Cleaned up 2 old versions for resource ${resourceId}`);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      mockDb().where().count().first.mockRejectedValueOnce(new Error('Cleanup error'));

      // Act
      const result = await service.cleanupOldVersions(resourceId);

      // Assert
      expect(result).toBe(0);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error cleaning up old versions:', expect.any(Error));
    });
  });

  describe('Helper Methods', () => {
    it('should determine change types correctly', () => {
      expect(service.getChangeType(null, 'new value')).toBe('added');
      expect(service.getChangeType(undefined, 'new value')).toBe('added');
      expect(service.getChangeType('old value', null)).toBe('removed');
      expect(service.getChangeType('old value', undefined)).toBe('removed');
      expect(service.getChangeType('old value', 'new value')).toBe('modified');
    });

    it('should compare objects correctly', () => {
      // Arrange
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 'changed', d: 4 };

      // Act
      const diff = service.compareObjects(obj1, obj2);

      // Assert
      expect(diff.added).toEqual([{ key: 'd', value: 4 }]);
      expect(diff.removed).toEqual([{ key: 'c', value: 3 }]);
      expect(diff.changed).toEqual([{ key: 'b', old_value: 2, new_value: 'changed' }]);
    });

    it('should get and set max versions correctly', () => {
      expect(service.getMaxVersionsPerResource()).toBe(50);
      
      service.setMaxVersionsPerResource(25);
      expect(service.getMaxVersionsPerResource()).toBe(25);
    });
  });

  describe('deleteResourceVersions', () => {
    const resourceId = 'resource-123';

    it('should delete all versions for a resource', async () => {
      // Arrange
      mockDb().where().del.mockResolvedValueOnce(3);

      // Act
      const result = await service.deleteResourceVersions(resourceId);

      // Assert
      expect(result).toBe(3);
      expect(mockDb().where).toHaveBeenCalledWith('resource_id', resourceId);
    });

    it('should handle deletion errors', async () => {
      // Arrange
      mockDb().where().del.mockRejectedValueOnce(new Error('Deletion failed'));

      // Act & Assert
      await expect(
        service.deleteResourceVersions(resourceId)
      ).rejects.toThrow('Failed to delete resource versions: Deletion failed');
    });
  });
});