/**
 * ResourceVersionService - Service for resource version control
 * 
 * This service provides comprehensive version control functionality for resources including:
 * - Creating new versions when resources are updated
 * - Retrieving version history with detailed information
 * - Restoring previous versions with rollback capability
 * - Comparing versions with detailed diff analysis
 * - Version metadata and change tracking
 */

const BaseService = require('./BaseService');
const db = require('../config/database');

class ResourceVersionService extends BaseService {
  constructor() {
    super('resource_versions', db, {
      defaultOrderBy: 'version_number',
      defaultOrderDirection: 'desc'
    });

    // Maximum number of versions to keep per resource (configurable)
    this.maxVersionsPerResource = 50;
  }

  /**
   * Create a new version when a resource is updated
   * @param {string} resourceId - Resource ID
   * @param {Object} resourceData - Current resource data
   * @param {string} userId - User making the change
   * @param {string} changeReason - Reason for the change (optional)
   * @param {Object} metadata - Additional version metadata
   * @returns {Object} Created version record
   */
  async createVersion(resourceId, resourceData, userId, changeReason = null, metadata = {}) {
    try {
      // Get the current highest version number for this resource
      const latestVersion = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .orderBy('version_number', 'desc')
        .first();

      const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

      // Prepare version data
      const versionData = {
        resource_id: resourceId,
        version_number: nextVersionNumber,
        title: resourceData.title,
        description: resourceData.description,
        content: resourceData.metadata?.content || null,
        file_url: resourceData.file_url || null,
        file_name: resourceData.file_name || null,
        file_size: resourceData.file_size || null,
        mime_type: resourceData.mime_type || null,
        external_url: resourceData.external_url || null,
        type: resourceData.type,
        category_id: resourceData.category_id,
        metadata: resourceData.metadata || {},
        is_featured: resourceData.is_featured || false,
        change_reason: changeReason,
        created_by: userId,
        created_at: new Date()
      };

      // Add version-specific metadata
      versionData.version_metadata = {
        ...metadata,
        creation_timestamp: new Date().toISOString(),
        resource_state: 'active',
        version_type: nextVersionNumber === 1 ? 'initial' : 'update'
      };

      const [version] = await this.db('resource_versions')
        .insert(versionData)
        .returning('*');

      // Clean up old versions if we exceed the maximum
      await this.cleanupOldVersions(resourceId);

      return version;
    } catch (error) {
      console.error('Error creating resource version:', error);
      throw new Error(`Failed to create resource version: ${error.message}`);
    }
  }

  /**
   * Get version history for a resource
   * @param {string} resourceId - Resource ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of versions to return
   * @param {number} options.offset - Offset for pagination
   * @param {boolean} options.includeContent - Whether to include full content
   * @returns {Object} Version history with pagination
   */
  async getVersionHistory(resourceId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        includeContent = false
      } = options;

      let query = this.db('resource_versions')
        .select([
          'resource_versions.*',
          'users.email as created_by_email'
        ])
        .leftJoin('users', 'resource_versions.created_by', 'users.id')
        .where('resource_versions.resource_id', resourceId)
        .orderBy('resource_versions.version_number', 'desc');

      // Exclude content by default for performance (unless requested)
      if (!includeContent) {
        query = query.select([
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
      }

      // Get total count for pagination
      const [{ count }] = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .count('id as count');

      // Apply pagination
      const versions = await query
        .limit(limit)
        .offset(offset);

      return {
        versions,
        pagination: {
          total: parseInt(count),
          limit,
          offset,
          hasMore: offset + limit < parseInt(count)
        }
      };
    } catch (error) {
      console.error('Error getting version history:', error);
      throw new Error(`Failed to get version history: ${error.message}`);
    }
  }

  /**
   * Get a specific version
   * @param {string} resourceId - Resource ID
   * @param {number} versionNumber - Version number to retrieve
   * @returns {Object|null} Version data or null if not found
   */
  async getVersion(resourceId, versionNumber) {
    try {
      const version = await this.db('resource_versions')
        .select([
          'resource_versions.*',
          'users.email as created_by_email'
        ])
        .leftJoin('users', 'resource_versions.created_by', 'users.id')
        .where('resource_versions.resource_id', resourceId)
        .where('resource_versions.version_number', versionNumber)
        .first();

      return version || null;
    } catch (error) {
      console.error('Error getting version:', error);
      throw new Error(`Failed to get version: ${error.message}`);
    }
  }

  /**
   * Get the latest version for a resource
   * @param {string} resourceId - Resource ID
   * @returns {Object|null} Latest version or null if no versions exist
   */
  async getLatestVersion(resourceId) {
    try {
      const version = await this.db('resource_versions')
        .select([
          'resource_versions.*',
          'users.email as created_by_email'
        ])
        .leftJoin('users', 'resource_versions.created_by', 'users.id')
        .where('resource_versions.resource_id', resourceId)
        .orderBy('resource_versions.version_number', 'desc')
        .first();

      return version || null;
    } catch (error) {
      console.error('Error getting latest version:', error);
      throw new Error(`Failed to get latest version: ${error.message}`);
    }
  }

  /**
   * Restore a resource to a previous version
   * @param {string} resourceId - Resource ID
   * @param {number} versionNumber - Version number to restore to
   * @param {string} userId - User performing the restore
   * @param {string} restoreReason - Reason for the restore
   * @returns {Object} Updated resource data
   */
  async restoreVersion(resourceId, versionNumber, userId, restoreReason = 'Version restored') {
    const trx = await this.db.transaction();
    
    try {
      // Get the version to restore
      const versionToRestore = await trx('resource_versions')
        .where('resource_id', resourceId)
        .where('version_number', versionNumber)
        .first();

      if (!versionToRestore) {
        throw new Error(`Version ${versionNumber} not found for resource ${resourceId}`);
      }

      // Get current resource data for comparison
      const currentResource = await trx('resources')
        .where('id', resourceId)
        .first();

      if (!currentResource) {
        throw new Error(`Resource ${resourceId} not found`);
      }

      // Prepare restored data
      const restoredData = {
        title: versionToRestore.title,
        description: versionToRestore.description,
        content: versionToRestore.content,
        file_url: versionToRestore.file_url,
        file_name: versionToRestore.file_name,
        file_size: versionToRestore.file_size,
        mime_type: versionToRestore.mime_type,
        external_url: versionToRestore.external_url,
        type: versionToRestore.type,
        category_id: versionToRestore.category_id,
        metadata: versionToRestore.metadata,
        is_featured: versionToRestore.is_featured,
        updated_by: userId,
        updated_at: new Date()
      };

      // Update the resource
      const [updatedResource] = await trx('resources')
        .where('id', resourceId)
        .update(restoredData)
        .returning('*');

      // Create a new version entry for the restore operation
      await this.createVersionInTransaction(
        trx,
        resourceId,
        updatedResource,
        userId,
        `${restoreReason} (restored to version ${versionNumber})`,
        {
          restored_from_version: versionNumber,
          restore_timestamp: new Date().toISOString(),
          operation_type: 'restore'
        }
      );

      await trx.commit();

      return updatedResource;
    } catch (error) {
      await trx.rollback();
      console.error('Error restoring version:', error);
      throw new Error(`Failed to restore version: ${error.message}`);
    }
  }

  /**
   * Compare two versions of a resource
   * @param {string} resourceId - Resource ID
   * @param {number} version1 - First version number
   * @param {number} version2 - Second version number
   * @returns {Object} Detailed comparison result
   */
  async compareVersions(resourceId, version1, version2) {
    try {
      // Get both versions
      const [v1, v2] = await Promise.all([
        this.getVersion(resourceId, version1),
        this.getVersion(resourceId, version2)
      ]);

      if (!v1) {
        throw new Error(`Version ${version1} not found`);
      }
      if (!v2) {
        throw new Error(`Version ${version2} not found`);
      }

      // Fields to compare
      const fieldsToCompare = [
        'title',
        'description',
        'content',
        'file_url',
        'file_name',
        'external_url',
        'type',
        'category_id',
        'is_featured'
      ];

      const differences = [];
      const similarities = [];

      for (const field of fieldsToCompare) {
        const value1 = v1[field];
        const value2 = v2[field];

        if (value1 !== value2) {
          differences.push({
            field,
            version1_value: value1,
            version2_value: value2,
            change_type: this.getChangeType(value1, value2)
          });
        } else if (value1 !== null && value1 !== undefined) {
          similarities.push({
            field,
            value: value1
          });
        }
      }

      // Compare metadata if present
      let metadataDiff = null;
      if (v1.metadata || v2.metadata) {
        metadataDiff = this.compareObjects(v1.metadata || {}, v2.metadata || {});
      }

      return {
        resource_id: resourceId,
        version1: {
          number: version1,
          created_at: v1.created_at,
          created_by: v1.created_by_email,
          change_reason: v1.change_reason
        },
        version2: {
          number: version2,
          created_at: v2.created_at,
          created_by: v2.created_by_email,
          change_reason: v2.change_reason
        },
        differences,
        similarities,
        metadata_differences: metadataDiff,
        summary: {
          total_differences: differences.length,
          total_similarities: similarities.length,
          has_metadata_changes: metadataDiff && (
            metadataDiff.added.length > 0 ||
            metadataDiff.removed.length > 0 ||
            metadataDiff.changed.length > 0
          )
        }
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      throw new Error(`Failed to compare versions: ${error.message}`);
    }
  }

  /**
   * Get version statistics for a resource
   * @param {string} resourceId - Resource ID
   * @returns {Object} Version statistics
   */
  async getVersionStatistics(resourceId) {
    try {
      const [{ total_versions }] = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .count('id as total_versions');

      const versionsByUser = await this.db('resource_versions')
        .select('users.email as user_email')
        .count('resource_versions.id as count')
        .leftJoin('users', 'resource_versions.created_by', 'users.id')
        .where('resource_versions.resource_id', resourceId)
        .groupBy('resource_versions.created_by', 'users.email')
        .orderBy('count', 'desc');

      const firstVersion = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .orderBy('version_number', 'asc')
        .first();

      const latestVersion = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .orderBy('version_number', 'desc')
        .first();

      return {
        total_versions: parseInt(total_versions),
        first_version: firstVersion ? {
          number: firstVersion.version_number,
          created_at: firstVersion.created_at,
          created_by: firstVersion.created_by
        } : null,
        latest_version: latestVersion ? {
          number: latestVersion.version_number,
          created_at: latestVersion.created_at,
          created_by: latestVersion.created_by
        } : null,
        versions_by_user: versionsByUser.map(stat => ({
          user_email: stat.user_email,
          count: parseInt(stat.count)
        }))
      };
    } catch (error) {
      console.error('Error getting version statistics:', error);
      throw new Error(`Failed to get version statistics: ${error.message}`);
    }
  }

  /**
   * Delete all versions for a resource (when resource is deleted)
   * @param {string} resourceId - Resource ID
   * @returns {number} Number of versions deleted
   */
  async deleteResourceVersions(resourceId) {
    try {
      const deleted = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .del();

      return deleted;
    } catch (error) {
      console.error('Error deleting resource versions:', error);
      throw new Error(`Failed to delete resource versions: ${error.message}`);
    }
  }

  /**
   * Create version within a transaction (internal helper)
   * @param {Object} trx - Database transaction
   * @param {string} resourceId - Resource ID
   * @param {Object} resourceData - Resource data
   * @param {string} userId - User ID
   * @param {string} changeReason - Change reason
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created version
   * @private
   */
  async createVersionInTransaction(trx, resourceId, resourceData, userId, changeReason, metadata = {}) {
    // Get the current highest version number for this resource
    const latestVersion = await trx('resource_versions')
      .where('resource_id', resourceId)
      .orderBy('version_number', 'desc')
      .first();

    const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

    // Prepare version data
    const versionData = {
      resource_id: resourceId,
      version_number: nextVersionNumber,
      title: resourceData.title,
      description: resourceData.description,
      content: resourceData.metadata?.content || null,
      file_url: resourceData.file_url || null,
      file_name: resourceData.file_name || null,
      file_size: resourceData.file_size || null,
      mime_type: resourceData.mime_type || null,
      external_url: resourceData.external_url || null,
      type: resourceData.type,
      category_id: resourceData.category_id,
      metadata: resourceData.metadata || {},
      is_featured: resourceData.is_featured || false,
      change_reason: changeReason,
      created_by: userId,
      created_at: new Date(),
      version_metadata: {
        ...metadata,
        creation_timestamp: new Date().toISOString()
      }
    };

    const [version] = await trx('resource_versions')
      .insert(versionData)
      .returning('*');

    return version;
  }

  /**
   * Clean up old versions beyond the maximum limit
   * @param {string} resourceId - Resource ID
   * @returns {number} Number of versions deleted
   * @private
   */
  async cleanupOldVersions(resourceId) {
    try {
      const totalVersions = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .count('id as count')
        .first();

      const count = parseInt(totalVersions.count);

      if (count <= this.maxVersionsPerResource) {
        return 0; // No cleanup needed
      }

      // Get versions to delete (keep the most recent maxVersionsPerResource versions)
      const versionsToDelete = await this.db('resource_versions')
        .where('resource_id', resourceId)
        .orderBy('version_number', 'desc')
        .offset(this.maxVersionsPerResource);

      if (!versionsToDelete.length) {
        return 0;
      }

      const versionIdsToDelete = versionsToDelete.map(v => v.id);

      const deleted = await this.db('resource_versions')
        .whereIn('id', versionIdsToDelete)
        .del();

      console.log(`Cleaned up ${deleted} old versions for resource ${resourceId}`);
      return deleted;
    } catch (error) {
      console.error('Error cleaning up old versions:', error);
      return 0; // Don't throw error - cleanup is not critical
    }
  }

  /**
   * Determine the type of change between two values
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   * @returns {string} Change type
   * @private
   */
  getChangeType(oldValue, newValue) {
    if (oldValue === null || oldValue === undefined) {
      return 'added';
    } else if (newValue === null || newValue === undefined) {
      return 'removed';
    } else {
      return 'modified';
    }
  }

  /**
   * Compare two objects and return differences
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {Object} Comparison result
   * @private
   */
  compareObjects(obj1, obj2) {
    const diff = {
      added: [],
      removed: [],
      changed: []
    };

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      const value1 = obj1[key];
      const value2 = obj2[key];

      if (value1 === undefined && value2 !== undefined) {
        diff.added.push({ key, value: value2 });
      } else if (value1 !== undefined && value2 === undefined) {
        diff.removed.push({ key, value: value1 });
      } else if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        diff.changed.push({ key, old_value: value1, new_value: value2 });
      }
    }

    return diff;
  }

  /**
   * Set maximum versions per resource
   * @param {number} maxVersions - Maximum versions to keep
   */
  setMaxVersionsPerResource(maxVersions) {
    this.maxVersionsPerResource = maxVersions;
  }

  /**
   * Get current maximum versions setting
   * @returns {number} Maximum versions per resource
   */
  getMaxVersionsPerResource() {
    return this.maxVersionsPerResource;
  }
}

module.exports = ResourceVersionService;