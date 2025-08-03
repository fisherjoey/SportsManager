/**
 * Performance Monitoring Routes - Enhanced with Package 3C Advanced Monitoring
 * 
 * Provides comprehensive endpoints for monitoring API performance, cache statistics,
 * database query performance, system health metrics, and real-time alerting.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createPerformanceRoute, getPerformanceStats, resetPerformanceStats } = require('../middleware/performanceMonitor');
const { getCacheStats, clearAllCache } = require('../middleware/responseCache');
const { getAdvancedMetrics, resetAdvancedMetrics } = require('../middleware/advanced-performance');
const { getQueryPerformanceStats, resetQueryPerformanceStats } = require('../utils/query-performance');
const { getAggregatedMetrics, getMetricsSummary, resetAllMetrics, updateMetricsConfig } = require('../utils/metrics-collector');

/**
 * GET /api/performance/metrics
 * Get comprehensive aggregated metrics from all collectors
 */
router.get('/metrics', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const aggregatedMetrics = getAggregatedMetrics();
    
    res.json({
      success: true,
      data: aggregatedMetrics
    });
  } catch (error) {
    console.error('Error getting aggregated metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve aggregated metrics'
    });
  }
});

/**
 * GET /api/performance/summary
 * Get quick performance summary for dashboards
 */
router.get('/summary', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const summary = getMetricsSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics summary'
    });
  }
});

/**
 * GET /api/performance/advanced
 * Get advanced performance metrics with real-time monitoring data
 */
router.get('/advanced', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const basicStats = getPerformanceStats();
    const advancedStats = getAdvancedMetrics();
    const queryStats = getQueryPerformanceStats();
    
    // Combine all metrics into comprehensive response
    const combinedStats = {
      timestamp: new Date(),
      system: {
        uptime: advancedStats.computed.uptime,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      },
      performance: {
        requests: {
          total: advancedStats.requests.total,
          active: advancedStats.requests.active,
          rate: advancedStats.computed.requestRate,
          averageResponseTime: advancedStats.computed.averageResponseTime,
          slowCount: advancedStats.requests.slowCount,
          verySlowCount: advancedStats.requests.verySlowCount,
          errorCount: advancedStats.requests.errorCount,
          errorRate: advancedStats.computed.errorRate,
          slowRequestRate: advancedStats.computed.slowRequestRate
        },
        database: {
          queries: queryStats.summary,
          topSlowQueries: queryStats.topSlowQueries,
          tablePerformance: queryStats.tablePerformance,
          connectionPool: queryStats.connectionPool
        },
        cache: {
          hitRate: advancedStats.computed.cacheHitRate,
          operations: advancedStats.cache.operations,
          performance: advancedStats.cache.performance
        },
        resources: {
          memory: {
            current: advancedStats.computed.currentMemoryUsageMB,
            max: advancedStats.resources.memory.maxHeapUsed / 1024 / 1024,
            trend: advancedStats.trends.memoryUsage.slice(-12) // Last hour if 5-min intervals
          },
          cpu: {
            current: advancedStats.computed.currentCpuUsage,
            max: advancedStats.resources.cpu.maxUsage,
            trend: advancedStats.trends.cpuUsage.slice(-12)
          },
          eventLoop: {
            current: advancedStats.computed.currentEventLoopLag,
            max: advancedStats.resources.eventLoop.maxLag
          }
        }
      },
      alerts: {
        recent: advancedStats.alerts.recent.slice(-10),
        byType: Object.fromEntries(advancedStats.alerts.byType),
        total: advancedStats.alerts.triggered
      },
      trends: {
        responseTime: advancedStats.trends.responseTime.slice(-24), // Last 2 hours
        errorRate: advancedStats.trends.errorRate.slice(-24),
        memoryUsage: advancedStats.trends.memoryUsage.slice(-24)
      },
      recommendations: [
        ...basicStats.recommendations || [],
        ...queryStats.recommendations || [],
        ...generateAdvancedRecommendations(advancedStats, queryStats)
      ]
    };
    
    res.json({
      success: true,
      data: combinedStats
    });
  } catch (error) {
    console.error('Error getting advanced performance stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve advanced performance statistics'
    });
  }
});

/**
 * GET /api/performance/database
 * Get detailed database performance metrics
 */
router.get('/database', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const queryStats = getQueryPerformanceStats();
    
    res.json({
      success: true,
      data: {
        ...queryStats,
        insights: generateDatabaseInsights(queryStats)
      }
    });
  } catch (error) {
    console.error('Error getting database performance stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve database performance statistics'
    });
  }
});

/**
 * GET /api/performance/alerts
 * Get recent performance alerts and alerting configuration
 */
router.get('/alerts', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const advancedStats = getAdvancedMetrics();
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;
    
    let alerts = advancedStats.alerts.recent;
    
    // Filter by type if specified
    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }
    
    // Apply limit
    alerts = alerts.slice(-limit);
    
    res.json({
      success: true,
      data: {
        alerts: alerts.reverse(), // Most recent first
        summary: {
          total: advancedStats.alerts.triggered,
          byType: Object.fromEntries(advancedStats.alerts.byType),
          last24Hours: alerts.filter(alert => 
            Date.now() - alert.timestamp < 24 * 60 * 60 * 1000
          ).length
        },
        configuration: {
          slowRequestThreshold: 1000,
          verySlowRequestThreshold: 5000,
          slowQueryThreshold: 500,
          verySlowQueryThreshold: 2000,
          highMemoryThreshold: 1000,
          eventLoopLagThreshold: 100
        }
      }
    });
  } catch (error) {
    console.error('Error getting performance alerts:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance alerts'
    });
  }
});

/**
 * GET /api/performance/trends
 * Get performance trend data for charts and analysis
 */
router.get('/trends', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const advancedStats = getAdvancedMetrics();
    const hours = parseInt(req.query.hours) || 24;
    const metric = req.query.metric;
    
    // Calculate how many data points to return (5-minute intervals)
    const dataPoints = Math.min(hours * 12, advancedStats.trends.maxTrendSize);
    
    let trendData = {};
    
    if (metric && advancedStats.trends[metric]) {
      // Return specific metric
      trendData[metric] = advancedStats.trends[metric].slice(-dataPoints);
    } else {
      // Return all trends
      Object.keys(advancedStats.trends).forEach(key => {
        if (key !== 'maxTrendSize' && Array.isArray(advancedStats.trends[key])) {
          trendData[key] = advancedStats.trends[key].slice(-dataPoints);
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        trends: trendData,
        metadata: {
          intervalMinutes: 5,
          dataPoints: dataPoints,
          timeRange: `${hours} hours`,
          lastUpdate: advancedStats.metadata.lastReset
        }
      }
    });
  } catch (error) {
    console.error('Error getting performance trends:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance trends'
    });
  }
});

/**
 * GET /api/performance/stats
 * Get comprehensive performance statistics (legacy endpoint, enhanced)
 */
router.get('/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const basicStats = getPerformanceStats();
    const advancedStats = getAdvancedMetrics();
    
    // Combine basic and advanced stats for backward compatibility
    const enhancedStats = {
      ...basicStats,
      advanced: {
        activeRequests: advancedStats.requests.active,
        requestRate: advancedStats.computed.requestRate,
        errorRate: advancedStats.computed.errorRate,
        currentMemoryMB: advancedStats.computed.currentMemoryUsageMB,
        eventLoopLag: advancedStats.computed.currentEventLoopLag,
        alertsTriggered: advancedStats.alerts.triggered
      }
    };
    
    res.json(enhancedStats);
  } catch (error) {
    console.error('Error getting performance stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance statistics'
    });
  }
});

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
 * Reset performance statistics (enhanced with aggregated metrics)
 */
router.post('/reset', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const resetType = req.body.type || 'all';
    
    switch (resetType) {
      case 'basic':
        resetPerformanceStats();
        break;
      case 'advanced':
        resetAdvancedMetrics();
        break;
      case 'database':
        resetQueryPerformanceStats();
        break;
      case 'aggregated':
        resetAllMetrics();
        break;
      case 'all':
      default:
        resetPerformanceStats();
        resetAdvancedMetrics();
        resetQueryPerformanceStats();
        resetAllMetrics();
        break;
    }
    
    res.json({
      success: true,
      message: `Performance statistics reset successfully (${resetType})`,
      resetType,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error resetting performance stats:', error);
    res.status(500).json({
      error: 'Failed to reset performance statistics'
    });
  }
});

/**
 * POST /api/performance/config
 * Update metrics collection configuration
 */
router.post('/config', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const config = req.body;
    const allowedConfigs = [
      'collectionInterval',
      'retentionPeriod',
      'alertThresholds',
      'enableAutoRecommendations',
      'enableTrendAnalysis',
      'enableAnomalyDetection'
    ];
    
    // Filter config to only allowed properties
    const filteredConfig = {};
    Object.keys(config).forEach(key => {
      if (allowedConfigs.includes(key)) {
        filteredConfig[key] = config[key];
      }
    });
    
    if (Object.keys(filteredConfig).length === 0) {
      return res.status(400).json({
        error: 'No valid configuration properties provided',
        allowedProperties: allowedConfigs
      });
    }
    
    updateMetricsConfig(filteredConfig);
    
    res.json({
      success: true,
      message: 'Metrics configuration updated successfully',
      updatedConfig: filteredConfig,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error updating metrics config:', error);
    res.status(500).json({
      error: 'Failed to update metrics configuration'
    });
  }
});

/**
 * GET /api/performance/insights
 * Get performance insights and recommendations
 */
router.get('/insights', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const aggregatedMetrics = getAggregatedMetrics();
    
    res.json({
      success: true,
      data: {
        insights: aggregatedMetrics.insights,
        recommendations: aggregatedMetrics.recommendations,
        systemHealth: aggregatedMetrics.summary.systemHealth,
        alerts: aggregatedMetrics.alerts,
        timestamp: aggregatedMetrics.timestamp
      }
    });
  } catch (error) {
    console.error('Error getting performance insights:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance insights'
    });
  }
});

/**
 * GET /api/performance/realtime
 * Get real-time performance metrics for live monitoring
 */
router.get('/realtime', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const advancedStats = getAdvancedMetrics();
    const summary = getMetricsSummary();
    
    const realTimeData = {
      timestamp: Date.now(),
      activeRequests: advancedStats.requests?.active || 0,
      currentResponseTime: advancedStats.computed?.averageResponseTime || 0,
      currentErrorRate: advancedStats.computed?.errorRate || 0,
      memoryUsage: advancedStats.computed?.currentMemoryUsageMB || 0,
      cpuUsage: advancedStats.computed?.currentCpuUsage || 0,
      eventLoopLag: advancedStats.computed?.currentEventLoopLag || 0,
      activeAlerts: summary.alerts?.active || 0,
      systemHealth: summary.systemHealth,
      requestRate: advancedStats.computed?.requestRate || 0,
      cacheHitRate: advancedStats.computed?.cacheHitRate || 0,
      dbConnectionPool: {
        active: advancedStats.database?.queries?.connectionPool?.active || 0,
        waiting: advancedStats.database?.queries?.connectionPool?.waiting || 0,
        utilization: advancedStats.database?.queries?.connectionPool?.utilization || 0
      }
    };
    
    res.json({
      success: true,
      data: realTimeData
    });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve real-time metrics'
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

/**
 * Generate advanced performance recommendations
 */
function generateAdvancedRecommendations(advancedStats, queryStats) {
  const recommendations = [];
  
  // High active requests
  if (advancedStats.requests.active > 50) {
    recommendations.push({
      type: 'high_active_requests',
      message: `High number of active requests (${advancedStats.requests.active}). Monitor for potential bottlenecks.`,
      priority: 'medium'
    });
  }
  
  // Very slow request rate
  if (advancedStats.computed.slowRequestRate > 10) {
    recommendations.push({
      type: 'high_slow_request_rate',
      message: `${advancedStats.computed.slowRequestRate.toFixed(1)}% of requests are slow. Review performance optimizations.`,
      priority: 'high'
    });
  }
  
  // High event loop lag
  if (advancedStats.computed.currentEventLoopLag > 50) {
    recommendations.push({
      type: 'high_event_loop_lag',
      message: `Event loop lag is ${advancedStats.computed.currentEventLoopLag.toFixed(1)}ms. Check for blocking operations.`,
      priority: 'high'
    });
  }
  
  // Connection pool utilization
  if (queryStats.connectionPool && queryStats.connectionPool.utilization > 80) {
    recommendations.push({
      type: 'high_connection_pool_usage',
      message: `Database connection pool is ${queryStats.connectionPool.utilization.toFixed(1)}% utilized. Consider scaling.`,
      priority: 'medium'
    });
  }
  
  // Trend-based recommendations
  if (advancedStats.trends.responseTime.length > 5) {
    const recentResponseTimes = advancedStats.trends.responseTime.slice(-5);
    const isIncreasing = recentResponseTimes.every((point, i) => 
      i === 0 || point.value >= recentResponseTimes[i - 1].value
    );
    
    if (isIncreasing) {
      recommendations.push({
        type: 'increasing_response_time_trend',
        message: 'Response times are trending upward. Monitor for performance degradation.',
        priority: 'medium'
      });
    }
  }
  
  return recommendations;
}

/**
 * Generate database performance insights
 */
function generateDatabaseInsights(queryStats) {
  const insights = [];
  
  // Most active tables
  const mostActiveTables = queryStats.tablePerformance
    .sort((a, b) => b.totalQueries - a.totalQueries)
    .slice(0, 5);
  
  if (mostActiveTables.length > 0) {
    insights.push({
      type: 'most_active_tables',
      title: 'Most Active Tables',
      data: mostActiveTables.map(table => ({
        table: table.table,
        queries: table.totalQueries,
        averageTime: table.averageTime
      }))
    });
  }
  
  // Query pattern analysis
  const patterns = queryStats.queryPatterns || [];
  const mostCommonPatterns = patterns
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  if (mostCommonPatterns.length > 0) {
    insights.push({
      type: 'common_query_patterns',
      title: 'Most Common Query Patterns',
      data: mostCommonPatterns.map(pattern => ({
        pattern: pattern.pattern,
        count: pattern.count,
        averageComplexity: pattern.averageComplexity
      }))
    });
  }
  
  // Performance hotspots
  const hotspots = queryStats.topSlowQueries
    .filter(query => query.count > 10) // Only frequent slow queries
    .slice(0, 3);
  
  if (hotspots.length > 0) {
    insights.push({
      type: 'performance_hotspots',
      title: 'Performance Hotspots',
      data: hotspots.map(query => ({
        table: query.table,
        operation: query.operation,
        averageTime: query.averageTime,
        count: query.count,
        recommendations: query.recommendations
      }))
    });
  }
  
  // Database health score
  const healthScore = calculateDatabaseHealthScore(queryStats);
  insights.push({
    type: 'health_score',
    title: 'Database Health Score',
    data: {
      score: healthScore.score,
      grade: healthScore.grade,
      factors: healthScore.factors
    }
  });
  
  return insights;
}

/**
 * Calculate database health score
 */
function calculateDatabaseHealthScore(queryStats) {
  let score = 100; // Start with perfect score
  const factors = [];
  
  // Deduct points for high slow query percentage
  if (queryStats.summary.slowQueryPercentage > 20) {
    const deduction = Math.min(30, queryStats.summary.slowQueryPercentage);
    score -= deduction;
    factors.push(`-${deduction}: High slow query rate (${queryStats.summary.slowQueryPercentage.toFixed(1)}%)`);
  }
  
  // Deduct points for high error rate
  if (queryStats.summary.errorPercentage > 5) {
    const deduction = Math.min(25, queryStats.summary.errorPercentage * 2);
    score -= deduction;
    factors.push(`-${deduction}: High error rate (${queryStats.summary.errorPercentage.toFixed(1)}%)`);
  }
  
  // Deduct points for high connection pool utilization
  if (queryStats.connectionPool && queryStats.connectionPool.utilization > 80) {
    const deduction = Math.min(15, (queryStats.connectionPool.utilization - 80) / 2);
    score -= deduction;
    factors.push(`-${deduction.toFixed(1)}: High connection pool utilization (${queryStats.connectionPool.utilization.toFixed(1)}%)`);
  }
  
  // Deduct points for very slow queries
  if (queryStats.summary.verySlowQueries > 0) {
    const verySlowPercentage = (queryStats.summary.verySlowQueries / queryStats.summary.totalQueries) * 100;
    if (verySlowPercentage > 1) {
      const deduction = Math.min(20, verySlowPercentage * 5);
      score -= deduction;
      factors.push(`-${deduction.toFixed(1)}: Very slow queries present (${verySlowPercentage.toFixed(1)}%)`);
    }
  }
  
  // Ensure score doesn't go below 0
  score = Math.max(0, Math.round(score));
  
  // Determine grade
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';
  
  return { score, grade, factors };
}

module.exports = router;