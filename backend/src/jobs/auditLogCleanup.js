/**
 * Audit Log Cleanup Job
 * 
 * Scheduled job to clean old audit logs based on retention policy.
 * Supports configurable retention periods and archiving options before deletion.
 * 
 * Features:
 * - Configurable retention period (default: 90 days)
 * - Archive logs before deletion (optional)
 * - Batch processing for large datasets
 * - Comprehensive logging and error handling
 * - Statistics reporting
 * - Safe deletion with transaction support
 */

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const ResourceAuditService = require('../services/ResourceAuditService');
const logger = require('../utils/logger');
const db = require('../config/database');

class AuditLogCleanupJob {
  constructor() {
    this.auditService = new ResourceAuditService();
    this.isRunning = false;
    this.config = {
      retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90,
      batchSize: parseInt(process.env.AUDIT_CLEANUP_BATCH_SIZE) || 1000,
      enableArchiving: process.env.AUDIT_LOG_ARCHIVE_ENABLED === 'true',
      archiveDirectory: process.env.AUDIT_LOG_ARCHIVE_DIR || path.join(__dirname, '../../archives/audit-logs'),
      cronSchedule: process.env.AUDIT_CLEANUP_CRON || '0 2 * * 0', // Weekly at 2 AM on Sunday
      enableJob: process.env.AUDIT_CLEANUP_ENABLED !== 'false' // Enabled by default
    };
  }

  /**
   * Initialize and start the cleanup job
   */
  init() {
    if (!this.config.enableJob) {
      logger.info('Audit log cleanup job is disabled');
      return;
    }

    logger.info('Initializing audit log cleanup job', {
      retentionDays: this.config.retentionDays,
      cronSchedule: this.config.cronSchedule,
      enableArchiving: this.config.enableArchiving
    });

    // Schedule the cleanup job
    cron.schedule(this.config.cronSchedule, () => {
      this.runCleanup().catch(error => {
        logger.error('Scheduled audit log cleanup failed:', error);
      });
    });

    logger.info('Audit log cleanup job scheduled successfully');
  }

  /**
   * Run the cleanup process
   */
  async runCleanup() {
    if (this.isRunning) {
      logger.warn('Audit log cleanup is already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting audit log cleanup process', {
        retentionDays: this.config.retentionDays,
        enableArchiving: this.config.enableArchiving
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      // Get statistics before cleanup
      const beforeStats = await this.getCleanupStatistics(cutoffDate);
      logger.info('Audit logs before cleanup:', beforeStats);

      let archivedCount = 0;
      let deletedCount = 0;

      if (beforeStats.logsToCleanup === 0) {
        logger.info('No audit logs need cleanup');
        return { archivedCount: 0, deletedCount: 0, duration: Date.now() - startTime };
      }

      // Archive logs if enabled
      if (this.config.enableArchiving && beforeStats.logsToCleanup > 0) {
        logger.info('Archiving old audit logs before deletion');
        archivedCount = await this.archiveLogs(cutoffDate);
      }

      // Delete old logs in batches
      logger.info('Deleting old audit logs');
      deletedCount = await this.deleteOldLogs(cutoffDate);

      const duration = Date.now() - startTime;
      const result = {
        archivedCount,
        deletedCount,
        duration,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: this.config.retentionDays
      };

      logger.info('Audit log cleanup completed successfully:', result);
      return result;

    } catch (error) {
      logger.error('Audit log cleanup failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get statistics about logs that will be cleaned up
   * @private
   */
  async getCleanupStatistics(cutoffDate) {
    try {
      const totalLogs = await db('resource_audit_log').count('id as count').first();
      const logsToCleanup = await db('resource_audit_log')
        .where('timestamp', '<', cutoffDate)
        .count('id as count')
        .first();

      const oldestLog = await db('resource_audit_log')
        .select('timestamp')
        .orderBy('timestamp', 'asc')
        .first();

      const newestLogToCleanup = await db('resource_audit_log')
        .select('timestamp')
        .where('timestamp', '<', cutoffDate)
        .orderBy('timestamp', 'desc')
        .first();

      return {
        totalLogs: parseInt(totalLogs.count),
        logsToCleanup: parseInt(logsToCleanup.count),
        oldestLogDate: oldestLog?.timestamp || null,
        newestLogToCleanupDate: newestLogToCleanup?.timestamp || null,
        cutoffDate: cutoffDate.toISOString()
      };
    } catch (error) {
      logger.error('Failed to get cleanup statistics:', error);
      return { totalLogs: 0, logsToCleanup: 0 };
    }
  }

  /**
   * Archive logs to JSON files before deletion
   * @private
   */
  async archiveLogs(cutoffDate) {
    try {
      // Ensure archive directory exists
      await fs.mkdir(this.config.archiveDirectory, { recursive: true });

      let offset = 0;
      let totalArchived = 0;
      const archiveDate = new Date().toISOString().split('T')[0];
      const archiveFileName = `audit-logs-${archiveDate}.json`;
      const archiveFilePath = path.join(this.config.archiveDirectory, archiveFileName);

      logger.info('Creating archive file:', archiveFilePath);

      // Initialize archive file with metadata
      const archiveData = {
        archiveDate: new Date().toISOString(),
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: this.config.retentionDays,
        logs: []
      };

      // Fetch and archive logs in batches
      while (true) {
        const logs = await db('resource_audit_log')
          .select('*')
          .where('timestamp', '<', cutoffDate)
          .orderBy('timestamp', 'asc')
          .limit(this.config.batchSize)
          .offset(offset);

        if (logs.length === 0) {
          break;
        }

        // Parse JSON fields for proper archiving
        const processedLogs = logs.map(log => ({
          ...log,
          metadata: this.tryParseJSON(log.metadata),
          old_values: this.tryParseJSON(log.old_values),
          new_values: this.tryParseJSON(log.new_values),
          change_diff: this.tryParseJSON(log.change_diff)
        }));

        archiveData.logs.push(...processedLogs);
        totalArchived += logs.length;
        offset += this.config.batchSize;

        logger.debug(`Archived ${totalArchived} logs so far`);
      }

      // Write archive file
      await fs.writeFile(archiveFilePath, JSON.stringify(archiveData, null, 2));
      
      logger.info(`Successfully archived ${totalArchived} audit logs to ${archiveFilePath}`);
      return totalArchived;

    } catch (error) {
      logger.error('Failed to archive audit logs:', error);
      throw new Error(`Archive operation failed: ${error.message}`);
    }
  }

  /**
   * Delete old logs in batches
   * @private
   */
  async deleteOldLogs(cutoffDate) {
    try {
      let totalDeleted = 0;

      // Use transaction for safe deletion
      await db.transaction(async (trx) => {
        while (true) {
          const deleted = await trx('resource_audit_log')
            .where('timestamp', '<', cutoffDate)
            .limit(this.config.batchSize)
            .del();

          if (deleted === 0) {
            break;
          }

          totalDeleted += deleted;
          logger.debug(`Deleted ${totalDeleted} logs so far`);

          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      });

      logger.info(`Successfully deleted ${totalDeleted} old audit logs`);
      return totalDeleted;

    } catch (error) {
      logger.error('Failed to delete old audit logs:', error);
      throw new Error(`Delete operation failed: ${error.message}`);
    }
  }

  /**
   * Manually trigger cleanup (for testing or manual execution)
   */
  async manualCleanup(retentionDays = null) {
    const originalRetentionDays = this.config.retentionDays;
    
    if (retentionDays !== null) {
      this.config.retentionDays = retentionDays;
      logger.info(`Manual cleanup with custom retention: ${retentionDays} days`);
    }

    try {
      const result = await this.runCleanup();
      logger.info('Manual audit log cleanup completed:', result);
      return result;
    } finally {
      // Restore original retention setting
      this.config.retentionDays = originalRetentionDays;
    }
  }

  /**
   * Get cleanup job status and configuration
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      nextScheduledRun: this.getNextScheduledRun()
    };
  }

  /**
   * Get next scheduled run time (approximate)
   * @private
   */
  getNextScheduledRun() {
    try {
      // Simple calculation for weekly schedule (0 2 * * 0)
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextSunday.setHours(2, 0, 0, 0);
      
      // If it's already past 2 AM on Sunday, schedule for next week
      if (now.getDay() === 0 && now.getHours() >= 2) {
        nextSunday.setDate(nextSunday.getDate() + 7);
      }
      
      return nextSunday.toISOString();
    } catch (error) {
      return 'Unable to calculate next run time';
    }
  }

  /**
   * Safely parse JSON strings
   * @private
   */
  tryParseJSON(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return jsonString;
    }

    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString;
    }
  }

  /**
   * Get archive file listing
   */
  async getArchiveFiles() {
    try {
      if (!this.config.enableArchiving) {
        return [];
      }

      const files = await fs.readdir(this.config.archiveDirectory);
      const archiveFiles = files.filter(file => file.startsWith('audit-logs-') && file.endsWith('.json'));
      
      const fileDetails = await Promise.all(
        archiveFiles.map(async (file) => {
          const filePath = path.join(this.config.archiveDirectory, file);
          const stats = await fs.stat(filePath);
          return {
            filename: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
      );

      return fileDetails.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to get archive files:', error);
      return [];
    }
  }

  /**
   * Clean up archive files older than specified days
   */
  async cleanupArchiveFiles(archiveRetentionDays = 365) {
    try {
      if (!this.config.enableArchiving) {
        logger.info('Archiving is disabled, skipping archive cleanup');
        return 0;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - archiveRetentionDays);

      const archiveFiles = await this.getArchiveFiles();
      let deletedCount = 0;

      for (const file of archiveFiles) {
        if (file.created < cutoffDate) {
          await fs.unlink(file.path);
          deletedCount++;
          logger.info(`Deleted old archive file: ${file.filename}`);
        }
      }

      logger.info(`Archive cleanup completed. Deleted ${deletedCount} old archive files`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup archive files:', error);
      throw new Error(`Archive cleanup failed: ${error.message}`);
    }
  }
}

// Create singleton instance
const auditCleanupJob = new AuditLogCleanupJob();

/**
 * Express route handler for manual cleanup operations
 */
const createCleanupRoutes = (router) => {
  // Manual cleanup trigger (admin only)
  router.post('/cleanup/audit-logs', async (req, res) => {
    try {
      const { retentionDays } = req.body;
      const result = await auditCleanupJob.manualCleanup(retentionDays);
      
      res.json({
        success: true,
        message: 'Audit log cleanup completed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Manual audit cleanup failed:', error);
      res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: error.message
      });
    }
  });

  // Get cleanup job status
  router.get('/cleanup/audit-logs/status', (req, res) => {
    try {
      const status = auditCleanupJob.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get cleanup status',
        error: error.message
      });
    }
  });

  // Get archive files
  router.get('/cleanup/audit-logs/archives', async (req, res) => {
    try {
      const archives = await auditCleanupJob.getArchiveFiles();
      res.json({
        success: true,
        data: archives
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get archive files',
        error: error.message
      });
    }
  });

  // Clean up old archive files
  router.post('/cleanup/audit-logs/archives', async (req, res) => {
    try {
      const { archiveRetentionDays = 365 } = req.body;
      const deletedCount = await auditCleanupJob.cleanupArchiveFiles(archiveRetentionDays);
      
      res.json({
        success: true,
        message: 'Archive cleanup completed successfully',
        data: { deletedCount, archiveRetentionDays }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Archive cleanup failed',
        error: error.message
      });
    }
  });

  return router;
};

/**
 * Utility function to run cleanup from command line or scripts
 */
async function runCleanupFromCLI() {
  try {
    console.log('Starting manual audit log cleanup...');
    const result = await auditCleanupJob.manualCleanup();
    console.log('Cleanup completed:', result);
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Allow running from command line
if (require.main === module) {
  runCleanupFromCLI();
}

module.exports = {
  AuditLogCleanupJob,
  auditCleanupJob,
  createCleanupRoutes,
  runCleanupFromCLI
};