/**
 * Performance Monitoring Middleware
 * 
 * Tracks API response times, database query counts, and identifies slow endpoints
 * for performance optimization insights. Enhanced with query cache monitoring.
 */

const { queryCache } = require('../utils/query-cache');

const performanceStats = {
  requests: new Map(),
  slowQueries: [],
  averageResponseTimes: new Map(),
  totalRequests: 0,
  totalResponseTime: 0,
  queryMetrics: {
    totalDbQueries: 0,
    slowDbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0
  }
};

/**
 * Performance monitoring middleware
 */
function performanceMonitor(options = {}) {
  const {
    slowThreshold = 1000,    // 1 second
    logSlowRequests = true,
    trackQueryCount = true,
    maxSlowQueries = 100
  } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const endpoint = `${req.method} ${req.path}`;
    
    // Track query count if enabled
    let queryCount = 0;
    if (trackQueryCount && req.db) {
      const originalQuery = req.db.raw;
      req.db.raw = function(...args) {
        queryCount++;
        return originalQuery.apply(this, args);
      };
    }

    // Override res.send to capture response time
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Update statistics
      performanceStats.totalRequests++;
      performanceStats.totalResponseTime += responseTime;
      
      // Track per-endpoint stats
      if (!performanceStats.requests.has(endpoint)) {
        performanceStats.requests.set(endpoint, {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          maxTime: 0,
          minTime: Infinity,
          slowCount: 0
        });
      }
      
      const endpointStats = performanceStats.requests.get(endpoint);
      endpointStats.count++;
      endpointStats.totalTime += responseTime;
      endpointStats.averageTime = endpointStats.totalTime / endpointStats.count;
      endpointStats.maxTime = Math.max(endpointStats.maxTime, responseTime);
      endpointStats.minTime = Math.min(endpointStats.minTime, responseTime);
      
      // Track slow requests
      if (responseTime > slowThreshold) {
        endpointStats.slowCount++;
        
        const slowQuery = {
          endpoint,
          responseTime,
          queryCount,
          timestamp: new Date(),
          statusCode: res.statusCode,
          userId: req.user?.id,
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress
        };
        
        performanceStats.slowQueries.push(slowQuery);
        
        // Keep only the most recent slow queries
        if (performanceStats.slowQueries.length > maxSlowQueries) {
          performanceStats.slowQueries.shift();
        }
        
        if (logSlowRequests) {
          console.warn(`[SLOW REQUEST] ${endpoint} took ${responseTime}ms (${queryCount} queries) - Status: ${res.statusCode}`);
        }
      }
      
      // Set performance headers
      res.set('X-Response-Time', `${responseTime}ms`);
      if (trackQueryCount) {
        res.set('X-Query-Count', queryCount.toString());
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Get performance statistics with enhanced query cache monitoring
 */
function getPerformanceStats() {
  const overallAverage = performanceStats.totalRequests > 0 
    ? performanceStats.totalResponseTime / performanceStats.totalRequests 
    : 0;

  // Convert Map to object for JSON serialization
  const endpointStats = Object.fromEntries(
    Array.from(performanceStats.requests.entries())
      .sort(([, a], [, b]) => b.averageTime - a.averageTime) // Sort by average response time
  );

  // Get top 10 slowest endpoints
  const slowestEndpoints = Object.entries(endpointStats)
    .slice(0, 10)
    .map(([endpoint, stats]) => ({
      endpoint,
      averageTime: Math.round(stats.averageTime),
      maxTime: stats.maxTime,
      count: stats.count,
      slowCount: stats.slowCount,
      slowPercentage: ((stats.slowCount / stats.count) * 100).toFixed(1)
    }));

  // Get cache statistics
  const cacheStats = queryCache.getStats();
  const totalQueries = performanceStats.queryMetrics.cacheHits + performanceStats.queryMetrics.cacheMisses;
  const cacheHitRate = totalQueries > 0 ? (performanceStats.queryMetrics.cacheHits / totalQueries * 100).toFixed(2) : 0;

  return {
    overall: {
      totalRequests: performanceStats.totalRequests,
      averageResponseTime: Math.round(overallAverage),
      totalResponseTime: performanceStats.totalResponseTime,
      uptime: process.uptime()
    },
    database: {
      totalQueries: performanceStats.queryMetrics.totalDbQueries,
      slowQueries: performanceStats.queryMetrics.slowDbQueries,
      slowQueryPercentage: performanceStats.queryMetrics.totalDbQueries > 0 
        ? ((performanceStats.queryMetrics.slowDbQueries / performanceStats.queryMetrics.totalDbQueries) * 100).toFixed(2)
        : 0
    },
    cache: {
      hits: performanceStats.queryMetrics.cacheHits,
      misses: performanceStats.queryMetrics.cacheMisses,
      hitRate: `${cacheHitRate}%`,
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      activeEntries: cacheStats.active
    },
    endpoints: endpointStats,
    slowestEndpoints,
    recentSlowQueries: performanceStats.slowQueries.slice(-20), // Last 20 slow queries
    memoryUsage: process.memoryUsage(),
    timestamp: new Date()
  };
}

/**
 * Track database query performance
 */
function trackDbQuery(duration, sql, cached = false) {
  performanceStats.queryMetrics.totalDbQueries++;
  
  if (cached) {
    performanceStats.queryMetrics.cacheHits++;
  } else {
    performanceStats.queryMetrics.cacheMisses++;
  }
  
  // Track slow queries (>500ms)
  if (duration > 500) {
    performanceStats.queryMetrics.slowDbQueries++;
    
    // Log very slow queries (>2000ms)
    if (duration > 2000) {
      console.warn(`[VERY SLOW QUERY] ${duration}ms: ${sql?.substring(0, 100)}...`);
    }
  }
}

/**
 * Track cache operation
 */
function trackCacheOperation(hit = true) {
  if (hit) {
    performanceStats.queryMetrics.cacheHits++;
  } else {
    performanceStats.queryMetrics.cacheMisses++;
  }
}

/**
 * Reset performance statistics
 */
function resetPerformanceStats() {
  performanceStats.requests.clear();
  performanceStats.slowQueries.length = 0;
  performanceStats.averageResponseTimes.clear();
  performanceStats.totalRequests = 0;
  performanceStats.totalResponseTime = 0;
  performanceStats.queryMetrics = {
    totalDbQueries: 0,
    slowDbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
}

/**
 * Get slow queries summary
 */
function getSlowQueriesSummary() {
  const endpointCounts = {};
  
  performanceStats.slowQueries.forEach(query => {
    if (!endpointCounts[query.endpoint]) {
      endpointCounts[query.endpoint] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0
      };
    }
    
    const stats = endpointCounts[query.endpoint];
    stats.count++;
    stats.totalTime += query.responseTime;
    stats.averageTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, query.responseTime);
  });

  return Object.entries(endpointCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([endpoint, stats]) => ({
      endpoint,
      ...stats,
      averageTime: Math.round(stats.averageTime)
    }));
}

/**
 * Performance monitoring route handler
 */
function createPerformanceRoute() {
  return (req, res) => {
    const stats = getPerformanceStats();
    const slowSummary = getSlowQueriesSummary();
    
    res.json({
      ...stats,
      slowQueriesSummary: slowSummary,
      recommendations: generateRecommendations(stats)
    });
  };
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(stats) {
  const recommendations = [];
  
  // Check for consistently slow endpoints
  stats.slowestEndpoints.forEach(endpoint => {
    if (endpoint.averageTime > 2000) {
      recommendations.push({
        type: 'slow_endpoint',
        endpoint: endpoint.endpoint,
        message: `Endpoint has average response time of ${endpoint.averageTime}ms. Consider optimizing database queries or adding caching.`,
        priority: 'high'
      });
    } else if (endpoint.slowPercentage > 20) {
      recommendations.push({
        type: 'inconsistent_performance',
        endpoint: endpoint.endpoint,
        message: `${endpoint.slowPercentage}% of requests are slow. Check for N+1 queries or database performance issues.`,
        priority: 'medium'
      });
    }
  });
  
  // Check overall performance
  if (stats.overall.averageResponseTime > 1000) {
    recommendations.push({
      type: 'overall_performance',
      message: `Overall average response time is ${stats.overall.averageResponseTime}ms. Consider adding database indexes or caching.`,
      priority: 'high'
    });
  }
  
  // Check memory usage
  const memUsageMB = stats.memoryUsage.heapUsed / 1024 / 1024;
  if (memUsageMB > 500) {
    recommendations.push({
      type: 'memory_usage',
      message: `High memory usage detected (${Math.round(memUsageMB)}MB). Consider implementing memory cleanup or pagination.`,
      priority: 'medium'
    });
  }
  
  return recommendations;
}

module.exports = {
  performanceMonitor,
  getPerformanceStats,
  resetPerformanceStats,
  getSlowQueriesSummary,
  createPerformanceRoute,
  trackDbQuery,
  trackCacheOperation
};