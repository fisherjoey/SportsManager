/**
 * Performance Monitoring Routes
 * 
 * Provides endpoints for monitoring API performance, cache statistics,
 * and system health metrics for administrators.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createPerformanceRoute, getPerformanceStats, resetPerformanceStats } = require('../middleware/performanceMonitor');
const { getCacheStats, clearAllCache } = require('../middleware/responseCache');

/**
 * GET /api/performance/stats
 * Get comprehensive performance statistics
 */
router.get('/stats', authenticateToken, requireRole('admin'), createPerformanceRoute());

/**
 * GET /api/performance/cache
 * Get cache performance statistics
 */
router.get('/cache', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const cacheStats = getCacheStats();
    
    res.json({
      success: true,
      data: {
        ...cacheStats,
        timestamp: new Date(),
        recommendations: generateCacheRecommendations(cacheStats)
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve cache statistics'
    });
  }
});

/**
 * POST /api/performance/reset
 * Reset performance statistics
 */
router.post('/reset', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    resetPerformanceStats();
    
    res.json({
      success: true,
      message: 'Performance statistics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting performance stats:', error);
    res.status(500).json({
      error: 'Failed to reset performance statistics'
    });
  }
});

/**
 * DELETE /api/performance/cache
 * Clear all cache
 */
router.delete('/cache', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const clearedCount = clearAllCache();
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} cached items`,
      clearedCount
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache'
    });
  }
});

/**
 * GET /api/performance/health
 * Get system health metrics
 */
router.get('/health', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const healthMetrics = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      timestamp: new Date()
    };
    
    // Add health status based on metrics
    healthMetrics.status = determineHealthStatus(healthMetrics);
    healthMetrics.recommendations = generateHealthRecommendations(healthMetrics);
    
    res.json({
      success: true,
      data: healthMetrics
    });
  } catch (error) {
    console.error('Error getting health metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve health metrics'
    });
  }
});

/**
 * Generate cache performance recommendations
 */
function generateCacheRecommendations(cacheStats) {
  const recommendations = [];
  
  if (cacheStats.hitRate < 50) {
    recommendations.push({
      type: 'low_hit_rate',
      message: `Cache hit rate is ${cacheStats.hitRate}%. Consider adjusting cache TTL or reviewing cache keys.`,
      priority: 'medium'
    });
  }
  
  if (cacheStats.keyCount > 1500) {
    recommendations.push({
      type: 'high_key_count',
      message: `High number of cached keys (${cacheStats.keyCount}). Consider cache cleanup or shorter TTL.`,
      priority: 'low'
    });
  }
  
  if (cacheStats.hitRate > 90 && cacheStats.keyCount > 100) {
    recommendations.push({
      type: 'excellent_performance',
      message: `Excellent cache performance with ${cacheStats.hitRate}% hit rate. Cache is working well.`,
      priority: 'info'
    });
  }
  
  return recommendations;
}

/**
 * Determine system health status
 */
function determineHealthStatus(metrics) {
  const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
  
  if (memoryUsagePercent > 90) {
    return 'critical';
  } else if (memoryUsagePercent > 70) {
    return 'warning';
  } else if (metrics.uptime < 300) { // Less than 5 minutes
    return 'starting';
  } else {
    return 'healthy';
  }
}

/**
 * Generate health recommendations
 */
function generateHealthRecommendations(metrics) {
  const recommendations = [];
  const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
  
  if (memoryUsagePercent > 80) {
    recommendations.push({
      type: 'high_memory_usage',
      message: `Memory usage is ${Math.round(memoryUsagePercent)}%. Consider implementing memory cleanup or restarting the service.`,
      priority: 'high'
    });
  }
  
  if (metrics.uptime > 86400 * 7) { // More than 7 days
    recommendations.push({
      type: 'long_uptime',
      message: `Service has been running for ${Math.round(metrics.uptime / 86400)} days. Consider scheduled restarts for optimal performance.`,
      priority: 'low'
    });
  }
  
  if (metrics.memory.external > 100) {
    recommendations.push({
      type: 'external_memory',
      message: `High external memory usage (${metrics.memory.external}MB). Check for memory leaks in native modules.`,
      priority: 'medium'
    });
  }
  
  return recommendations;
}

module.exports = router;