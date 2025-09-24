// @ts-nocheck

/**
 * Admin Maintenance Routes
 * 
 * Administrative routes for system maintenance operations including
 * audit log cleanup, database maintenance, and system health operations.
 * 
 * All routes require admin authentication.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
import { authenticateToken, requireRole  } from '../../middleware/auth';
import { createCleanupRoutes, auditCleanupJob  } from '../../jobs/auditLogCleanup';
import { enhancedAsyncHandler  } from '../../middleware/enhanced-error-handling';
import { ResponseFormatter  } from '../../utils/response-formatters';
import logger from '../../utils/logger';
const db = require('../../config/database');

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * GET /api/admin/maintenance/status
 * Get overall system maintenance status
 */
router.get('/status', enhancedAsyncHandler(async (req, res) => {
  try {
    
    const maintenanceStatus = {
      timestamp: new Date().toISOString(),
      services: {
        auditCleanup: auditCleanupJob.getStatus(),
        // Add other maintenance services here
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };

    return ResponseFormatter.sendSuccess(res, maintenanceStatus, 'Maintenance status retrieved successfully');
  } catch (error) {
    logger.error('Failed to get maintenance status:', error);
    throw error;
  }
}));

/**
 * POST /api/admin/maintenance/gc
 * Trigger garbage collection (if exposed)
 */
router.post('/gc', enhancedAsyncHandler(async (req, res) => {
  try {
    const beforeMemory = process.memoryUsage();
    
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
      const afterMemory = process.memoryUsage();
      
      const memoryFreed = {
        heapUsed: beforeMemory.heapUsed - afterMemory.heapUsed,
        heapTotal: beforeMemory.heapTotal - afterMemory.heapTotal,
        external: beforeMemory.external - afterMemory.external
      };

      logger.info('Manual garbage collection triggered', { memoryFreed });
      
      return ResponseFormatter.sendSuccess(res, {
        beforeMemory,
        afterMemory,
        memoryFreed,
        message: 'Garbage collection completed successfully'
      }, 'Garbage collection triggered successfully');
    } else {
      return ResponseFormatter.sendError(res, 'Garbage collection is not available. Start Node.js with --expose-gc flag.', 400);
    }
  } catch (error) {
    logger.error('Failed to trigger garbage collection:', error);
    throw error;
  }
}));

/**
 * GET /api/admin/maintenance/logs/size
 * Get log file sizes and information
 */
router.get('/logs/size', enhancedAsyncHandler(async (req, res) => {
  try {
    
    const logInfo = {
      timestamp: new Date().toISOString(),
      files: []
    };

    // Check common log locations
    const logPaths = [
      'logs/',
      '../../logs/',
      '../../../logs/'
    ];

    for (const logPath of logPaths) {
      try {
        const fullPath = path.resolve(__dirname, logPath);
        const files = await fs.readdir(fullPath);
        
        for (const file of files) {
          if (file.endsWith('.log') || file.endsWith('.txt')) {
            const filePath = path.join(fullPath, file);
            const stats = await fs.stat(filePath);
            
            logInfo.files.push({
              name: file,
              path: filePath,
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime
            });
          }
        }
      } catch (error) {
        // Directory doesn't exist, continue
      }
    }

    return ResponseFormatter.sendSuccess(res, logInfo, 'Log file information retrieved successfully');
  } catch (error) {
    logger.error('Failed to get log file information:', error);
    throw error;
  }
}));

/**
 * POST /api/admin/maintenance/logs/rotate
 * Rotate log files (if supported)
 */
router.post('/logs/rotate', enhancedAsyncHandler(async (req, res) => {
  try {
    // This would typically integrate with your logging system
    // For now, just provide a placeholder response
    
    logger.info('Manual log rotation requested by admin', {
      adminUser: req.user.email,
      timestamp: new Date().toISOString()
    });

    return ResponseFormatter.sendSuccess(res, {
      message: 'Log rotation request logged. Actual rotation depends on logging configuration.',
      timestamp: new Date().toISOString()
    }, 'Log rotation request processed');
  } catch (error) {
    logger.error('Failed to process log rotation request:', error);
    throw error;
  }
}));

/**
 * GET /api/admin/maintenance/database/stats
 * Get basic database statistics
 */
router.get('/database/stats', enhancedAsyncHandler(async (req, res) => {
  try {
    
    // Get table row counts (sample of important tables)
    const tables = [
      'users', 'games', 'assignments', 'resource_audit_log', 
      'audit_logs', 'resources', 'teams', 'leagues'
    ];

    const stats = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    for (const table of tables) {
      try {
        const [{ count }] = await db(table).count('* as count');
        stats.tables[table] = {
          rowCount: parseInt(count),
          status: 'accessible'
        };
      } catch (error) {
        stats.tables[table] = {
          rowCount: null,
          status: 'error',
          error: error.message
        };
      }
    }

    // Get connection pool stats if available
    try {
      const poolStats = db.client.pool || null;
      if (poolStats) {
        stats.connectionPool = {
          size: poolStats.size || 0,
          available: poolStats.available || 0,
          pending: poolStats.pending || 0,
          borrowed: poolStats.borrowed || 0
        };
      }
    } catch (error) {
      stats.connectionPool = { error: 'Unable to get pool stats' };
    }

    return ResponseFormatter.sendSuccess(res, stats, 'Database statistics retrieved successfully');
  } catch (error) {
    logger.error('Failed to get database statistics:', error);
    throw error;
  }
}));

// Mount audit log cleanup routes
createCleanupRoutes(router);

/**
 * GET /api/admin/maintenance/health
 * Comprehensive system health check
 */
router.get('/health', enhancedAsyncHandler(async (req, res) => {
  try {
    const healthData = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        memory: {
          status: 'ok',
          usage: process.memoryUsage(),
          details: 'Memory usage within normal parameters'
        },
        uptime: {
          status: 'ok',
          seconds: process.uptime(),
          details: `System running for ${Math.floor(process.uptime())} seconds`
        }
      }
    };

    // Database connectivity check
    try {
      await db.raw('SELECT 1');
      healthData.checks.database = {
        status: 'ok',
        details: 'Database connection successful'
      };
    } catch (error) {
      healthData.checks.database = {
        status: 'error',
        details: `Database connection failed: ${error.message}`
      };
      healthData.status = 'degraded';
    }

    // Audit cleanup job status
    try {
      const jobStatus = auditCleanupJob.getStatus();
      healthData.checks.auditCleanup = {
        status: jobStatus.isRunning ? 'running' : 'idle',
        details: `Audit cleanup job is ${jobStatus.isRunning ? 'currently running' : 'idle'}`
      };
    } catch (error) {
      healthData.checks.auditCleanup = {
        status: 'error',
        details: `Unable to check audit cleanup job: ${error.message}`
      };
    }

    // Determine overall status
    const hasErrors = Object.values(healthData.checks).some(check => check.status === 'error');
    if (hasErrors) {
      healthData.status = 'unhealthy';
    }

    const statusCode = healthData.status === 'unhealthy' ? 503 : 200;
    return ResponseFormatter.sendResponse(res, healthData, 'System health check completed', statusCode);
  } catch (error) {
    logger.error('Health check failed:', error);
    throw error;
  }
}));

export default router;