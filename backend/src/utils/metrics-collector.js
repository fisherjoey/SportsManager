/**
 * @fileoverview Comprehensive Metrics Collection System - Package 3C
 * @description Central metrics collection hub that aggregates performance data
 * from all monitoring components and provides unified reporting capabilities.
 */

const { EventEmitter } = require('events');

/**
 * Metrics collection event emitter
 */
const metricsEvents = new EventEmitter();

/**
 * Comprehensive Metrics Collector
 */
class MetricsCollector {
  constructor() {
    this.collectors = new Map();
    this.aggregatedMetrics = {
      timestamp: Date.now(),
      summary: {
        totalRequests: 0,
        totalErrors: 0,
        totalQueries: 0,
        averageResponseTime: 0,
        systemHealth: 'unknown',
        uptime: 0
      },
      performance: {
        requests: {},
        database: {},
        cache: {},
        system: {}
      },
      trends: {
        responseTime: [],
        errorRate: [],
        queryPerformance: [],
        resourceUsage: []
      },
      alerts: {
        active: [],
        recent: [],
        summary: {}
      },
      recommendations: [],
      insights: []
    };
    
    this.config = {
      collectionInterval: 30000, // 30 seconds
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        responseTime: 1000,
        errorRate: 5.0,
        memoryUsage: 80.0,
        cpuUsage: 75.0,
        queryTime: 500
      },
      enableAutoRecommendations: true,
      enableTrendAnalysis: true,
      enableAnomalyDetection: true
    };
    
    // Don't auto-start collection to avoid circular dependencies
    // Collection will be started manually when needed
    this.setupCleanupTasks();
  }

  /**
   * Register a metrics collector
   */
  registerCollector(name, collector) {
    this.collectors.set(name, {
      name,
      collector,
      lastCollection: 0,
      errors: 0,
      enabled: true
    });
    
    console.log(`[METRICS] Registered collector: ${name}`);
  }

  /**
   * Start metrics collection process
   */
  startCollection() {
    // Register built-in collectors with lazy loading to avoid circular dependencies
    this.registerCollector('performance', () => {
      const { getPerformanceStats } = require('../middleware/performanceMonitor');
      return getPerformanceStats();
    });
    
    this.registerCollector('advanced', () => {
      const { getAdvancedMetrics } = require('../middleware/advanced-performance');
      return getAdvancedMetrics();
    });
    
    this.registerCollector('database', () => {
      const { getQueryPerformanceStats } = require('./query-performance');
      return getQueryPerformanceStats();
    });
    
    // Start collection interval
    this.collectionInterval = setInterval(() => {
      this.collectAllMetrics();
    }, this.config.collectionInterval);
    
    // Initial collection
    this.collectAllMetrics();
    
    console.log(`[METRICS] Started metrics collection (interval: ${this.config.collectionInterval}ms)`);
  }

  /**
   * Collect metrics from all registered collectors
   */
  async collectAllMetrics() {
    const collectionTimestamp = Date.now();
    const collectedData = {};
    
    try {
      // Collect from all registered collectors
      for (const [name, collectorInfo] of this.collectors.entries()) {
        if (!collectorInfo.enabled) continue;
        
        try {
          const startTime = process.hrtime.bigint();
          const data = await this.collectFromSource(collectorInfo.collector);
          const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
          
          collectedData[name] = {
            data,
            collectionTime: duration,
            timestamp: collectionTimestamp
          };
          
          collectorInfo.lastCollection = collectionTimestamp;
          collectorInfo.errors = 0; // Reset error count on success
          
        } catch (error) {
          console.error(`[METRICS] Error collecting from ${name}:`, error.message);
          collectorInfo.errors++;
          
          // Disable collector if too many errors
          if (collectorInfo.errors > 5) {
            collectorInfo.enabled = false;
            console.warn(`[METRICS] Disabled collector ${name} due to repeated errors`);
          }
        }
      }
      
      // Aggregate collected data
      await this.aggregateMetrics(collectedData, collectionTimestamp);
      
      // Emit collection event
      metricsEvents.emit('metrics_collected', {
        timestamp: collectionTimestamp,
        collectors: Object.keys(collectedData),
        summary: this.aggregatedMetrics.summary
      });
      
    } catch (error) {
      console.error('[METRICS] Error during metrics collection:', error);
    }
  }

  /**
   * Collect data from a specific source
   */
  async collectFromSource(collector) {
    if (typeof collector === 'function') {
      const result = collector();
      // Handle both sync and async collectors
      return Promise.resolve(result);
    } else if (collector && typeof collector.collect === 'function') {
      return await collector.collect();
    } else {
      throw new Error('Invalid collector format');
    }
  }

  /**
   * Aggregate metrics from all sources
   */
  async aggregateMetrics(collectedData, timestamp) {
    const basic = collectedData.performance?.data || {};
    const advanced = collectedData.advanced?.data || {};
    const database = collectedData.database?.data || {};
    
    // Update summary metrics
    this.aggregatedMetrics.summary = {
      totalRequests: advanced.requests?.total || basic.overall?.totalRequests || 0,
      totalErrors: advanced.requests?.errorCount || 0,
      totalQueries: database.summary?.totalQueries || 0,
      averageResponseTime: advanced.computed?.averageResponseTime || basic.overall?.averageResponseTime || 0,
      systemHealth: this.calculateSystemHealth(advanced, database),
      uptime: advanced.computed?.uptime || basic.overall?.uptime || 0,
      lastUpdated: timestamp
    };
    
    // Update performance metrics
    this.aggregatedMetrics.performance = {
      requests: {
        total: advanced.requests?.total || 0,
        active: advanced.requests?.active || 0,
        rate: advanced.computed?.requestRate || 0,
        errorRate: advanced.computed?.errorRate || 0,
        slowRate: advanced.computed?.slowRequestRate || 0,
        averageTime: advanced.computed?.averageResponseTime || 0,
        byEndpoint: this.convertMapToObject(advanced.requests?.byEndpoint),
        statusCodes: this.convertMapToObject(advanced.requests?.byStatusCode)
      },
      database: {
        queries: database.summary || {},
        slowQueries: database.topSlowQueries || [],
        tablePerformance: database.tablePerformance || [],
        connectionPool: database.connectionPool || {}
      },
      cache: {
        hitRate: advanced.computed?.cacheHitRate || 0,
        operations: advanced.cache?.operations || {},
        performance: advanced.cache?.performance || {}
      },
      system: {
        memory: {
          current: advanced.computed?.currentMemoryUsageMB || 0,
          max: advanced.resources?.memory?.maxHeapUsed || 0,
          trend: advanced.trends?.memoryUsage?.slice(-12) || []
        },
        cpu: {
          current: advanced.computed?.currentCpuUsage || 0,
          max: advanced.resources?.cpu?.maxUsage || 0,
          trend: advanced.trends?.cpuUsage?.slice(-12) || []
        },
        eventLoop: {
          current: advanced.computed?.currentEventLoopLag || 0,
          max: advanced.resources?.eventLoop?.maxLag || 0
        }
      }
    };
    
    // Update trends
    if (this.config.enableTrendAnalysis) {
      this.updateTrends(timestamp);
    }
    
    // Update alerts
    this.updateAlerts(advanced, database);
    
    // Generate recommendations
    if (this.config.enableAutoRecommendations) {
      this.generateRecommendations();
    }
    
    // Generate insights
    this.generateInsights();
    
    // Detect anomalies
    if (this.config.enableAnomalyDetection) {
      this.detectAnomalies();
    }
    
    this.aggregatedMetrics.timestamp = timestamp;
  }

  /**
   * Calculate overall system health
   */
  calculateSystemHealth(advanced, database) {
    let score = 100;
    let status = 'excellent';
    
    // Deduct points for high error rate
    const errorRate = advanced.computed?.errorRate || 0;
    if (errorRate > 10) {
      score -= 30;
      status = 'critical';
    } else if (errorRate > 5) {
      score -= 15;
      status = 'warning';
    }
    
    // Deduct points for high response time
    const avgResponseTime = advanced.computed?.averageResponseTime || 0;
    if (avgResponseTime > 2000) {
      score -= 25;
      status = status === 'excellent' ? 'warning' : status;
    } else if (avgResponseTime > 1000) {
      score -= 10;
    }
    
    // Deduct points for high memory usage
    const memoryUsage = advanced.computed?.currentMemoryUsageMB || 0;
    if (memoryUsage > 1000) {
      score -= 20;
      status = status === 'excellent' ? 'warning' : status;
    }
    
    // Deduct points for database performance
    const slowQueryRate = database.summary?.slowQueryPercentage || 0;
    if (slowQueryRate > 20) {
      score -= 15;
      status = status === 'excellent' ? 'warning' : status;
    }
    
    // Determine final status
    if (score >= 90 && status === 'excellent') return 'excellent';
    if (score >= 75) return status === 'critical' ? 'critical' : 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Update trend data
   */
  updateTrends(timestamp) {
    const maxTrendSize = 100; // Keep last 100 data points
    
    // Response time trend
    this.addToTrend('responseTime', {
      timestamp,
      value: this.aggregatedMetrics.performance.requests.averageTime,
      label: 'Average Response Time (ms)'
    }, maxTrendSize);
    
    // Error rate trend
    this.addToTrend('errorRate', {
      timestamp,
      value: this.aggregatedMetrics.performance.requests.errorRate,
      label: 'Error Rate (%)'
    }, maxTrendSize);
    
    // Query performance trend
    this.addToTrend('queryPerformance', {
      timestamp,
      value: this.aggregatedMetrics.performance.database.queries.averageTime || 0,
      label: 'Average Query Time (ms)'
    }, maxTrendSize);
    
    // Resource usage trend
    this.addToTrend('resourceUsage', {
      timestamp,
      memory: this.aggregatedMetrics.performance.system.memory.current,
      cpu: this.aggregatedMetrics.performance.system.cpu.current,
      label: 'Resource Usage'
    }, maxTrendSize);
  }

  /**
   * Add data point to trend
   */
  addToTrend(trendName, dataPoint, maxSize) {
    if (!this.aggregatedMetrics.trends[trendName]) {
      this.aggregatedMetrics.trends[trendName] = [];
    }
    
    this.aggregatedMetrics.trends[trendName].push(dataPoint);
    
    // Keep only maxSize entries
    if (this.aggregatedMetrics.trends[trendName].length > maxSize) {
      this.aggregatedMetrics.trends[trendName].shift();
    }
  }

  /**
   * Update active alerts
   */
  updateAlerts(advanced, database) {
    const activeAlerts = [];
    const recentAlerts = advanced.alerts?.recent || [];
    
    // Check for critical issues
    const errorRate = advanced.computed?.errorRate || 0;
    if (errorRate > this.config.alertThresholds.errorRate) {
      activeAlerts.push({
        id: `high_error_rate_${Date.now()}`,
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate detected: ${errorRate.toFixed(1)}%`,
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate,
        timestamp: Date.now()
      });
    }
    
    const responseTime = advanced.computed?.averageResponseTime || 0;
    if (responseTime > this.config.alertThresholds.responseTime) {
      activeAlerts.push({
        id: `slow_response_${Date.now()}`,
        type: 'slow_response',
        severity: responseTime > 2000 ? 'critical' : 'warning',
        message: `Slow response time detected: ${responseTime.toFixed(0)}ms`,
        value: responseTime,
        threshold: this.config.alertThresholds.responseTime,
        timestamp: Date.now()
      });
    }
    
    const memoryUsage = advanced.computed?.currentMemoryUsageMB || 0;
    const memoryPercent = (memoryUsage / 1024) * 100; // Assuming 1GB as baseline
    if (memoryPercent > this.config.alertThresholds.memoryUsage) {
      activeAlerts.push({
        id: `high_memory_${Date.now()}`,
        type: 'high_memory_usage',
        severity: memoryPercent > 90 ? 'critical' : 'warning',
        message: `High memory usage: ${memoryUsage.toFixed(0)}MB`,
        value: memoryUsage,
        threshold: this.config.alertThresholds.memoryUsage,
        timestamp: Date.now()
      });
    }
    
    this.aggregatedMetrics.alerts = {
      active: activeAlerts,
      recent: recentAlerts.slice(-20), // Last 20 alerts
      summary: {
        total: recentAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        last24Hours: recentAlerts.filter(a => 
          Date.now() - a.timestamp < 24 * 60 * 60 * 1000
        ).length
      }
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const perf = this.aggregatedMetrics.performance;
    
    // High error rate recommendations
    if (perf.requests.errorRate > 5) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        title: 'High Error Rate Detected',
        description: `Error rate is ${perf.requests.errorRate.toFixed(1)}%. Review error logs and fix underlying issues.`,
        actions: [
          'Check application logs for error patterns',
          'Review recent deployments for breaking changes',
          'Monitor error tracking dashboard',
          'Implement better error handling'
        ],
        impact: 'User experience and system reliability'
      });
    }
    
    // Slow response time recommendations
    if (perf.requests.averageTime > 1000) {
      recommendations.push({
        type: 'response_time',
        priority: perf.requests.averageTime > 2000 ? 'high' : 'medium',
        title: 'Slow Response Times',
        description: `Average response time is ${perf.requests.averageTime.toFixed(0)}ms. Consider performance optimizations.`,
        actions: [
          'Optimize database queries',
          'Implement response caching',
          'Review endpoint performance',
          'Consider code-level optimizations'
        ],
        impact: 'User experience and system scalability'
      });
    }
    
    // Database performance recommendations
    if (perf.database.queries.slowQueryPercentage > 15) {
      recommendations.push({
        type: 'database_performance',
        priority: 'medium',
        title: 'Database Performance Issues',
        description: `${perf.database.queries.slowQueryPercentage}% of queries are slow. Database optimization needed.`,
        actions: [
          'Add missing database indexes',
          'Optimize slow queries',
          'Consider query result caching',
          'Review connection pool settings'
        ],
        impact: 'Application performance and scalability'
      });
    }
    
    // Memory usage recommendations
    if (perf.system.memory.current > 800) {
      recommendations.push({
        type: 'memory_usage',
        priority: 'medium',
        title: 'High Memory Usage',
        description: `Memory usage is ${perf.system.memory.current.toFixed(0)}MB. Consider memory optimization.`,
        actions: [
          'Investigate memory leaks',
          'Optimize data structures',
          'Implement garbage collection tuning',
          'Consider horizontal scaling'
        ],
        impact: 'System stability and performance'
      });
    }
    
    // Cache performance recommendations
    if (perf.cache.hitRate < 50 && perf.cache.operations.total > 100) {
      recommendations.push({
        type: 'cache_performance',
        priority: 'low',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${perf.cache.hitRate.toFixed(1)}%. Review caching strategy.`,
        actions: [
          'Review cache key strategies',
          'Adjust cache TTL settings',
          'Identify cacheable operations',
          'Consider cache warming strategies'
        ],
        impact: 'Performance and resource efficiency'
      });
    }
    
    this.aggregatedMetrics.recommendations = recommendations;
  }

  /**
   * Generate performance insights
   */
  generateInsights() {
    const insights = [];
    const perf = this.aggregatedMetrics.performance;
    const trends = this.aggregatedMetrics.trends;
    
    // Request pattern insights
    if (perf.requests.total > 0) {
      const topEndpoints = Object.entries(perf.requests.byEndpoint || {})
        .sort(([,a], [,b]) => (b.count || 0) - (a.count || 0))
        .slice(0, 5);
      
      if (topEndpoints.length > 0) {
        insights.push({
          type: 'request_patterns',
          title: 'Most Active Endpoints',
          description: 'Top 5 most frequently requested endpoints',
          data: topEndpoints.map(([endpoint, stats]) => ({
            endpoint,
            requests: stats.count || 0,
            averageTime: stats.averageTime || 0,
            errorRate: ((stats.errorCount || 0) / (stats.count || 1)) * 100
          }))
        });
      }
    }
    
    // Database insights
    if (perf.database.tablePerformance?.length > 0) {
      const slowestTables = perf.database.tablePerformance
        .filter(table => table.totalQueries > 10)
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 3);
      
      if (slowestTables.length > 0) {
        insights.push({
          type: 'database_performance',
          title: 'Slowest Database Tables',
          description: 'Tables with the highest average query times',
          data: slowestTables.map(table => ({
            table: table.table,
            queries: table.totalQueries,
            averageTime: table.averageTime,
            slowQueries: table.slowQueries
          }))
        });
      }
    }
    
    // Trend insights
    if (trends.responseTime?.length >= 10) {
      const recent = trends.responseTime.slice(-10);
      const isIncreasing = this.isTrendIncreasing(recent.map(p => p.value));
      const isDecreasing = this.isTrendDecreasing(recent.map(p => p.value));
      
      if (isIncreasing) {
        insights.push({
          type: 'performance_trend',
          title: 'Response Time Trending Up',
          description: 'Response times have been increasing over recent collections',
          severity: 'warning',
          recommendation: 'Monitor for performance degradation and consider optimization measures'
        });
      } else if (isDecreasing) {
        insights.push({
          type: 'performance_trend',
          title: 'Response Time Improving',
          description: 'Response times have been decreasing over recent collections',
          severity: 'info',
          recommendation: 'Performance improvements are working well'
        });
      }
    }
    
    // System health insight
    insights.push({
      type: 'system_health',
      title: 'System Health Status',
      description: `Overall system health is ${this.aggregatedMetrics.summary.systemHealth}`,
      data: {
        health: this.aggregatedMetrics.summary.systemHealth,
        uptime: this.aggregatedMetrics.summary.uptime,
        requests: this.aggregatedMetrics.summary.totalRequests,
        errors: this.aggregatedMetrics.summary.totalErrors,
        queries: this.aggregatedMetrics.summary.totalQueries
      }
    });
    
    this.aggregatedMetrics.insights = insights;
  }

  /**
   * Detect performance anomalies
   */
  detectAnomalies() {
    // Simple anomaly detection - could be enhanced with statistical methods
    const anomalies = [];
    const trends = this.aggregatedMetrics.trends;
    
    // Check for response time spikes
    if (trends.responseTime?.length >= 5) {
      const recent = trends.responseTime.slice(-5).map(p => p.value);
      const average = recent.reduce((a, b) => a + b, 0) / recent.length;
      const latest = recent[recent.length - 1];
      
      if (latest > average * 2 && latest > 1000) {
        anomalies.push({
          type: 'response_time_spike',
          description: `Response time spike detected: ${latest.toFixed(0)}ms (avg: ${average.toFixed(0)}ms)`,
          severity: 'warning',
          timestamp: Date.now()
        });
      }
    }
    
    // Check for memory usage spikes
    if (trends.resourceUsage?.length >= 5) {
      const recent = trends.resourceUsage.slice(-5).map(p => p.memory);
      const average = recent.reduce((a, b) => a + b, 0) / recent.length;
      const latest = recent[recent.length - 1];
      
      if (latest > average * 1.5 && latest > 500) {
        anomalies.push({
          type: 'memory_spike',
          description: `Memory usage spike detected: ${latest.toFixed(0)}MB (avg: ${average.toFixed(0)}MB)`,
          severity: 'warning',
          timestamp: Date.now()
        });
      }
    }
    
    // Add anomalies to insights
    if (anomalies.length > 0) {
      this.aggregatedMetrics.insights.push({
        type: 'anomaly_detection',
        title: 'Performance Anomalies Detected',
        description: `${anomalies.length} anomalies detected in recent data`,
        data: anomalies
      });
    }
  }

  /**
   * Check if trend is increasing
   */
  isTrendIncreasing(values) {
    if (values.length < 3) return false;
    
    let increasingCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        increasingCount++;
      }
    }
    
    return increasingCount >= values.length * 0.7; // 70% of points are increasing
  }

  /**
   * Check if trend is decreasing
   */
  isTrendDecreasing(values) {
    if (values.length < 3) return false;
    
    let decreasingCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i - 1]) {
        decreasingCount++;
      }
    }
    
    return decreasingCount >= values.length * 0.7; // 70% of points are decreasing
  }

  /**
   * Convert Map to plain object for JSON serialization
   */
  convertMapToObject(map) {
    if (!map || typeof map.entries !== 'function') return {};
    return Object.fromEntries(Array.from(map.entries()));
  }

  /**
   * Get aggregated metrics
   */
  getMetrics() {
    return {
      ...this.aggregatedMetrics,
      collectionInfo: {
        collectors: Array.from(this.collectors.keys()),
        lastCollection: Math.max(...Array.from(this.collectors.values()).map(c => c.lastCollection)),
        collectionInterval: this.config.collectionInterval,
        errors: Array.from(this.collectors.values()).reduce((sum, c) => sum + c.errors, 0)
      }
    };
  }

  /**
   * Get metrics summary for quick overview
   */
  getMetricsSummary() {
    return {
      timestamp: this.aggregatedMetrics.timestamp,
      summary: this.aggregatedMetrics.summary,
      alerts: {
        active: this.aggregatedMetrics.alerts.active.length,
        critical: this.aggregatedMetrics.alerts.summary.critical,
        warning: this.aggregatedMetrics.alerts.summary.warning
      },
      recommendations: this.aggregatedMetrics.recommendations.length,
      systemHealth: this.aggregatedMetrics.summary.systemHealth
    };
  }

  /**
   * Setup cleanup tasks
   */
  setupCleanupTasks() {
    // Clean up old data every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    
    // Clean up trend data
    Object.keys(this.aggregatedMetrics.trends).forEach(trendName => {
      if (Array.isArray(this.aggregatedMetrics.trends[trendName])) {
        this.aggregatedMetrics.trends[trendName] = this.aggregatedMetrics.trends[trendName]
          .filter(point => point.timestamp > cutoffTime);
      }
    });
    
    // Clean up old alerts
    this.aggregatedMetrics.alerts.recent = this.aggregatedMetrics.alerts.recent
      .filter(alert => alert.timestamp > cutoffTime);
    
    console.log(`[METRICS] Cleaned up data older than ${this.config.retentionPeriod / 1000 / 60} minutes`);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[METRICS] Configuration updated:', newConfig);
  }

  /**
   * Enable/disable collector
   */
  toggleCollector(name, enabled) {
    const collector = this.collectors.get(name);
    if (collector) {
      collector.enabled = enabled;
      console.log(`[METRICS] Collector ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Reset metrics
   */
  reset() {
    this.aggregatedMetrics = {
      timestamp: Date.now(),
      summary: {
        totalRequests: 0,
        totalErrors: 0,
        totalQueries: 0,
        averageResponseTime: 0,
        systemHealth: 'unknown',
        uptime: 0
      },
      performance: {
        requests: {},
        database: {},
        cache: {},
        system: {}
      },
      trends: {
        responseTime: [],
        errorRate: [],
        queryPerformance: [],
        resourceUsage: []
      },
      alerts: {
        active: [],
        recent: [],
        summary: {}
      },
      recommendations: [],
      insights: []
    };
    
    console.log('[METRICS] Metrics data reset');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    console.log('[METRICS] Metrics collector cleanup completed');
  }
}

// Global metrics collector instance (lazy initialization)
let metricsCollector = null;

function getMetricsCollectorInstance() {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector();
    // Start collection after instance is created
    metricsCollector.startCollection();
  }
  return metricsCollector;
}

/**
 * Get metrics collector instance
 */
function getMetricsCollector() {
  return getMetricsCollectorInstance();
}

/**
 * Get aggregated metrics
 */
function getAggregatedMetrics() {
  return getMetricsCollectorInstance().getMetrics();
}

/**
 * Get metrics summary
 */
function getMetricsSummary() {
  return getMetricsCollectorInstance().getMetricsSummary();
}

/**
 * Get metrics events
 */
function getMetricsEvents() {
  return metricsEvents;
}

/**
 * Reset all metrics
 */
function resetAllMetrics() {
  getMetricsCollectorInstance().reset();
}

/**
 * Update collector configuration
 */
function updateMetricsConfig(config) {
  getMetricsCollectorInstance().updateConfig(config);
}

/**
 * Cleanup on process exit
 */
process.on('exit', () => {
  if (metricsCollector) {
    metricsCollector.cleanup();
  }
});

process.on('SIGINT', () => {
  if (metricsCollector) {
    metricsCollector.cleanup();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (metricsCollector) {
    metricsCollector.cleanup();
  }
  process.exit(0);
});

module.exports = {
  MetricsCollector,
  getMetricsCollector,
  getAggregatedMetrics,
  getMetricsSummary,
  getMetricsEvents,
  resetAllMetrics,
  updateMetricsConfig
};