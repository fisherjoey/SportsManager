/**
 * @fileoverview Advanced Performance Monitoring Middleware - Package 3C
 * @description Enhanced performance tracking with deep monitoring capabilities,
 * real-time alerting, resource usage tracking, and performance trend analysis.
 * Builds on existing performanceMonitor.js with advanced features.
 */

const { EventEmitter } = require('events');
const { trackDbQuery, trackCacheOperation } = require('./performanceMonitor');
const { ErrorLogger } = require('./enhanced-error-handling');

/**
 * Performance event emitter for real-time alerting
 */
const performanceEvents = new EventEmitter();

/**
 * Advanced performance metrics storage
 */
class AdvancedPerformanceMetrics {
  constructor() {
    this.metrics = {
      // Request metrics
      requests: {
        total: 0,
        active: 0,
        slowCount: 0,
        verySlowCount: 0,
        errorCount: 0,
        totalResponseTime: 0,
        byEndpoint: new Map(),
        byStatusCode: new Map(),
        byUserAgent: new Map(),
        byIpAddress: new Map()
      },
      
      // Resource metrics
      resources: {
        memory: {
          heapUsed: [],
          heapTotal: [],
          external: [],
          rss: [],
          maxHeapUsed: 0,
          maxHeapTotal: 0,
          maxExternal: 0,
          maxRss: 0
        },
        cpu: {
          usage: [],
          maxUsage: 0
        },
        eventLoop: {
          lag: [],
          maxLag: 0
        }
      },
      
      // Database metrics
      database: {
        queries: {
          total: 0,
          slow: 0,
          verySlow: 0,
          errors: 0,
          totalTime: 0,
          byTable: new Map(),
          byOperation: new Map(),
          connectionPool: {
            active: 0,
            idle: 0,
            waiting: 0,
            max: 0
          }
        }
      },
      
      // Cache metrics
      cache: {
        operations: {
          total: 0,
          hits: 0,
          misses: 0,
          invalidations: 0,
          errors: 0
        },
        performance: {
          hitRateHistory: [],
          averageHitRate: 0
        }
      },
      
      // Alert metrics
      alerts: {
        triggered: 0,
        byType: new Map(),
        recent: [],
        maxRecent: 100
      },
      
      // Trend data (circular buffers for performance)
      trends: {
        responseTime: [],
        requestRate: [],
        errorRate: [],
        memoryUsage: [],
        cpuUsage: [],
        maxTrendSize: 288 // 24 hours at 5-minute intervals
      },
      
      // Collection metadata
      metadata: {
        startTime: Date.now(),
        lastReset: Date.now(),
        collectionInterval: 5000, // 5 seconds
        samplingRate: 1.0 // Sample 100% of requests
      }
    };
    
    // Start resource monitoring
    this.startResourceMonitoring();
    this.startTrendCollection();
  }

  /**
   * Record request metrics
   */
  recordRequest(req, res, responseTime, error = null) {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const statusCode = res.statusCode;
    const userAgent = req.get('User-Agent') || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Update counters
    this.metrics.requests.total++;
    this.metrics.requests.totalResponseTime += responseTime;
    
    if (error) {
      this.metrics.requests.errorCount++;
    }
    
    // Categorize response time
    if (responseTime > 5000) { // Very slow: > 5 seconds
      this.metrics.requests.verySlowCount++;
      this.emitAlert('very_slow_request', {
        endpoint,
        responseTime,
        statusCode,
        userAgent,
        ipAddress,
        error: error?.message
      });
    } else if (responseTime > 1000) { // Slow: > 1 second
      this.metrics.requests.slowCount++;
      this.emitAlert('slow_request', {
        endpoint,
        responseTime,
        statusCode,
        userAgent,
        ipAddress
      });
    }
    
    // Update endpoint metrics
    if (!this.metrics.requests.byEndpoint.has(endpoint)) {
      this.metrics.requests.byEndpoint.set(endpoint, {
        count: 0,
        totalTime: 0,
        errorCount: 0,
        slowCount: 0,
        verySlowCount: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        statusCodes: new Map(),
        recentRequests: []
      });
    }
    
    const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
    endpointMetrics.count++;
    endpointMetrics.totalTime += responseTime;
    endpointMetrics.averageTime = endpointMetrics.totalTime / endpointMetrics.count;
    endpointMetrics.minTime = Math.min(endpointMetrics.minTime, responseTime);
    endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, responseTime);
    
    if (error) {
      endpointMetrics.errorCount++;
    }
    if (responseTime > 1000) {
      endpointMetrics.slowCount++;
    }
    if (responseTime > 5000) {
      endpointMetrics.verySlowCount++;
    }
    
    // Track status codes for endpoint
    const currentStatusCount = endpointMetrics.statusCodes.get(statusCode) || 0;
    endpointMetrics.statusCodes.set(statusCode, currentStatusCount + 1);
    
    // Keep recent requests (last 10)
    endpointMetrics.recentRequests.push({
      timestamp: Date.now(),
      responseTime,
      statusCode,
      error: error?.message
    });
    if (endpointMetrics.recentRequests.length > 10) {
      endpointMetrics.recentRequests.shift();
    }
    
    // Update global status code tracking
    const globalStatusCount = this.metrics.requests.byStatusCode.get(statusCode) || 0;
    this.metrics.requests.byStatusCode.set(statusCode, globalStatusCount + 1);
    
    // Update user agent tracking
    const userAgentCount = this.metrics.requests.byUserAgent.get(userAgent) || 0;
    this.metrics.requests.byUserAgent.set(userAgent, userAgentCount + 1);
    
    // Update IP address tracking
    const ipCount = this.metrics.requests.byIpAddress.get(ipAddress) || 0;
    this.metrics.requests.byIpAddress.set(ipAddress, ipCount + 1);
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(duration, sql, table = 'unknown', operation = 'unknown', cached = false, error = null) {
    this.metrics.database.queries.total++;
    this.metrics.database.queries.totalTime += duration;
    
    if (error) {
      this.metrics.database.queries.errors++;
    }
    
    if (cached) {
      this.metrics.cache.operations.hits++;
    } else {
      this.metrics.cache.operations.misses++;
    }
    this.metrics.cache.operations.total++;
    
    // Categorize query performance
    if (duration > 2000) { // Very slow: > 2 seconds
      this.metrics.database.queries.verySlow++;
      this.emitAlert('very_slow_query', {
        duration,
        sql: sql?.substring(0, 200),
        table,
        operation,
        cached,
        error: error?.message
      });
    } else if (duration > 500) { // Slow: > 500ms
      this.metrics.database.queries.slow++;
      this.emitAlert('slow_query', {
        duration,
        sql: sql?.substring(0, 200),
        table,
        operation,
        cached
      });
    }
    
    // Update per-table metrics
    if (!this.metrics.database.queries.byTable.has(table)) {
      this.metrics.database.queries.byTable.set(table, {
        count: 0,
        totalTime: 0,
        slowCount: 0,
        verySlowCount: 0,
        errorCount: 0,
        averageTime: 0
      });
    }
    
    const tableMetrics = this.metrics.database.queries.byTable.get(table);
    tableMetrics.count++;
    tableMetrics.totalTime += duration;
    tableMetrics.averageTime = tableMetrics.totalTime / tableMetrics.count;
    if (error) {
      tableMetrics.errorCount++;
    }
    if (duration > 500) {
      tableMetrics.slowCount++;
    }
    if (duration > 2000) {
      tableMetrics.verySlowCount++;
    }
    
    // Update per-operation metrics
    if (!this.metrics.database.queries.byOperation.has(operation)) {
      this.metrics.database.queries.byOperation.set(operation, {
        count: 0,
        totalTime: 0,
        averageTime: 0
      });
    }
    
    const operationMetrics = this.metrics.database.queries.byOperation.get(operation);
    operationMetrics.count++;
    operationMetrics.totalTime += duration;
    operationMetrics.averageTime = operationMetrics.totalTime / operationMetrics.count;
    
    // Also track in existing performanceMonitor for compatibility
    trackDbQuery(duration, sql, cached);
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(operation, hit = null, error = null) {
    this.metrics.cache.operations.total++;
    
    if (error) {
      this.metrics.cache.operations.errors++;
    } else if (operation === 'invalidate') {
      this.metrics.cache.operations.invalidations++;
    } else if (hit === true) {
      this.metrics.cache.operations.hits++;
    } else if (hit === false) {
      this.metrics.cache.operations.misses++;
    }
    
    // Calculate hit rate
    const totalCacheOps = this.metrics.cache.operations.hits + this.metrics.cache.operations.misses;
    if (totalCacheOps > 0) {
      const hitRate = (this.metrics.cache.operations.hits / totalCacheOps) * 100;
      this.metrics.cache.performance.averageHitRate = hitRate;
      
      // Add to history
      this.metrics.cache.performance.hitRateHistory.push({
        timestamp: Date.now(),
        hitRate
      });
      
      // Keep only last 100 entries
      if (this.metrics.cache.performance.hitRateHistory.length > 100) {
        this.metrics.cache.performance.hitRateHistory.shift();
      }
      
      // Alert on low hit rate
      if (hitRate < 30 && totalCacheOps > 100) {
        this.emitAlert('low_cache_hit_rate', { hitRate, totalOperations: totalCacheOps });
      }
    }
    
    // Also track in existing performanceMonitor for compatibility
    trackCacheOperation(hit);
  }

  /**
   * Start monitoring system resources
   */
  startResourceMonitoring() {
    const monitorResources = () => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Update memory metrics
      this.metrics.resources.memory.heapUsed.push({
        timestamp: Date.now(),
        value: memUsage.heapUsed
      });
      this.metrics.resources.memory.heapTotal.push({
        timestamp: Date.now(),
        value: memUsage.heapTotal
      });
      this.metrics.resources.memory.external.push({
        timestamp: Date.now(),
        value: memUsage.external
      });
      this.metrics.resources.memory.rss.push({
        timestamp: Date.now(),
        value: memUsage.rss
      });
      
      // Update max values
      this.metrics.resources.memory.maxHeapUsed = Math.max(
        this.metrics.resources.memory.maxHeapUsed,
        memUsage.heapUsed
      );
      this.metrics.resources.memory.maxHeapTotal = Math.max(
        this.metrics.resources.memory.maxHeapTotal,
        memUsage.heapTotal
      );
      this.metrics.resources.memory.maxExternal = Math.max(
        this.metrics.resources.memory.maxExternal,
        memUsage.external
      );
      this.metrics.resources.memory.maxRss = Math.max(
        this.metrics.resources.memory.maxRss,
        memUsage.rss
      );
      
      // Keep only last 100 entries for each metric
      ['heapUsed', 'heapTotal', 'external', 'rss'].forEach(metric => {
        if (this.metrics.resources.memory[metric].length > 100) {
          this.metrics.resources.memory[metric].shift();
        }
      });
      
      // CPU usage calculation (simplified)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert microseconds to seconds
      this.metrics.resources.cpu.usage.push({
        timestamp: Date.now(),
        value: cpuPercent
      });
      this.metrics.resources.cpu.maxUsage = Math.max(
        this.metrics.resources.cpu.maxUsage,
        cpuPercent
      );
      
      if (this.metrics.resources.cpu.usage.length > 100) {
        this.metrics.resources.cpu.usage.shift();
      }
      
      // Memory alerts
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;
      if (memUsageMB > 1000) { // > 1GB
        this.emitAlert('high_memory_usage', { 
          heapUsed: memUsageMB, 
          heapTotal: memUsage.heapTotal / 1024 / 1024 
        });
      }
      
      // Event loop lag measurement (simplified)
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        this.metrics.resources.eventLoop.lag.push({
          timestamp: Date.now(),
          value: lag
        });
        this.metrics.resources.eventLoop.maxLag = Math.max(
          this.metrics.resources.eventLoop.maxLag,
          lag
        );
        
        if (this.metrics.resources.eventLoop.lag.length > 100) {
          this.metrics.resources.eventLoop.lag.shift();
        }
        
        // Alert on high event loop lag
        if (lag > 100) { // > 100ms
          this.emitAlert('high_event_loop_lag', { lag });
        }
      });
    };
    
    // Monitor every 5 seconds
    this.resourceMonitorInterval = setInterval(monitorResources, this.metrics.metadata.collectionInterval);
    
    // Initial measurement
    monitorResources();
  }

  /**
   * Start trend data collection
   */
  startTrendCollection() {
    const collectTrends = () => {
      const now = Date.now();
      
      // Calculate current rates
      const averageResponseTime = this.metrics.requests.total > 0 
        ? this.metrics.requests.totalResponseTime / this.metrics.requests.total 
        : 0;
      
      const errorRate = this.metrics.requests.total > 0 
        ? (this.metrics.requests.errorCount / this.metrics.requests.total) * 100 
        : 0;
      
      // Add to trend data
      this.addToTrend('responseTime', averageResponseTime);
      this.addToTrend('errorRate', errorRate);
      
      // Memory usage trend
      const currentMemory = this.metrics.resources.memory.heapUsed.length > 0
        ? this.metrics.resources.memory.heapUsed[this.metrics.resources.memory.heapUsed.length - 1].value
        : 0;
      this.addToTrend('memoryUsage', currentMemory / 1024 / 1024); // MB
      
      // CPU usage trend
      const currentCpu = this.metrics.resources.cpu.usage.length > 0
        ? this.metrics.resources.cpu.usage[this.metrics.resources.cpu.usage.length - 1].value
        : 0;
      this.addToTrend('cpuUsage', currentCpu);
    };
    
    // Collect trends every 5 minutes
    this.trendCollectionInterval = setInterval(collectTrends, 5 * 60 * 1000);
  }

  /**
   * Add data point to trend
   */
  addToTrend(trendName, value) {
    if (!this.metrics.trends[trendName]) {
      this.metrics.trends[trendName] = [];
    }
    
    this.metrics.trends[trendName].push({
      timestamp: Date.now(),
      value
    });
    
    // Keep only maxTrendSize entries
    if (this.metrics.trends[trendName].length > this.metrics.trends.maxTrendSize) {
      this.metrics.trends[trendName].shift();
    }
  }

  /**
   * Emit performance alert
   */
  emitAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: Date.now(),
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Update alert metrics
    this.metrics.alerts.triggered++;
    const typeCount = this.metrics.alerts.byType.get(type) || 0;
    this.metrics.alerts.byType.set(type, typeCount + 1);
    
    // Add to recent alerts
    this.metrics.alerts.recent.push(alert);
    if (this.metrics.alerts.recent.length > this.metrics.alerts.maxRecent) {
      this.metrics.alerts.recent.shift();
    }
    
    // Emit event
    performanceEvents.emit('alert', alert);
    
    // Log alert
    ErrorLogger.logSecurityEvent('PERFORMANCE_ALERT', null, alert);
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      computed: {
        uptime: Date.now() - this.metrics.metadata.startTime,
        averageResponseTime: this.metrics.requests.total > 0 
          ? this.metrics.requests.totalResponseTime / this.metrics.requests.total 
          : 0,
        requestRate: this.calculateRequestRate(),
        errorRate: this.metrics.requests.total > 0 
          ? (this.metrics.requests.errorCount / this.metrics.requests.total) * 100 
          : 0,
        slowRequestRate: this.metrics.requests.total > 0 
          ? (this.metrics.requests.slowCount / this.metrics.requests.total) * 100 
          : 0,
        dbQueryRate: this.calculateDbQueryRate(),
        cacheHitRate: this.metrics.cache.performance.averageHitRate,
        currentMemoryUsageMB: this.getCurrentMemoryUsage(),
        currentCpuUsage: this.getCurrentCpuUsage(),
        currentEventLoopLag: this.getCurrentEventLoopLag()
      }
    };
  }

  /**
   * Calculate current request rate (requests per minute)
   */
  calculateRequestRate() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    let recentRequests = 0;
    
    // This is simplified - in production you'd want more sophisticated rate calculation
    this.metrics.requests.byEndpoint.forEach(endpointMetrics => {
      endpointMetrics.recentRequests.forEach(request => {
        if (request.timestamp > oneMinuteAgo) {
          recentRequests++;
        }
      });
    });
    
    return recentRequests;
  }

  /**
   * Calculate database query rate (queries per minute)
   */
  calculateDbQueryRate() {
    // Simplified calculation - in production you'd track timestamps
    const uptime = (Date.now() - this.metrics.metadata.startTime) / 1000 / 60; // minutes
    return uptime > 0 ? this.metrics.database.queries.total / uptime : 0;
  }

  /**
   * Get current memory usage in MB
   */
  getCurrentMemoryUsage() {
    const current = this.metrics.resources.memory.heapUsed;
    return current.length > 0 ? current[current.length - 1].value / 1024 / 1024 : 0;
  }

  /**
   * Get current CPU usage
   */
  getCurrentCpuUsage() {
    const current = this.metrics.resources.cpu.usage;
    return current.length > 0 ? current[current.length - 1].value : 0;
  }

  /**
   * Get current event loop lag
   */
  getCurrentEventLoopLag() {
    const current = this.metrics.resources.eventLoop.lag;
    return current.length > 0 ? current[current.length - 1].value : 0;
  }

  /**
   * Reset metrics
   */
  reset() {
    // Clear intervals
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
    }
    if (this.trendCollectionInterval) {
      clearInterval(this.trendCollectionInterval);
    }
    
    // Reset all metrics
    this.metrics = {
      requests: {
        total: 0,
        active: 0,
        slowCount: 0,
        verySlowCount: 0,
        errorCount: 0,
        totalResponseTime: 0,
        byEndpoint: new Map(),
        byStatusCode: new Map(),
        byUserAgent: new Map(),
        byIpAddress: new Map()
      },
      resources: {
        memory: {
          heapUsed: [],
          heapTotal: [],
          external: [],
          rss: [],
          maxHeapUsed: 0,
          maxHeapTotal: 0,
          maxExternal: 0,
          maxRss: 0
        },
        cpu: {
          usage: [],
          maxUsage: 0
        },
        eventLoop: {
          lag: [],
          maxLag: 0
        }
      },
      database: {
        queries: {
          total: 0,
          slow: 0,
          verySlow: 0,
          errors: 0,
          totalTime: 0,
          byTable: new Map(),
          byOperation: new Map(),
          connectionPool: {
            active: 0,
            idle: 0,
            waiting: 0,
            max: 0
          }
        }
      },
      cache: {
        operations: {
          total: 0,
          hits: 0,
          misses: 0,
          invalidations: 0,
          errors: 0
        },
        performance: {
          hitRateHistory: [],
          averageHitRate: 0
        }
      },
      alerts: {
        triggered: 0,
        byType: new Map(),
        recent: [],
        maxRecent: 100
      },
      trends: {
        responseTime: [],
        requestRate: [],
        errorRate: [],
        memoryUsage: [],
        cpuUsage: [],
        maxTrendSize: 288
      },
      metadata: {
        startTime: Date.now(),
        lastReset: Date.now(),
        collectionInterval: 5000,
        samplingRate: 1.0
      }
    };
    
    // Restart monitoring
    this.startResourceMonitoring();
    this.startTrendCollection();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
    }
    if (this.trendCollectionInterval) {
      clearInterval(this.trendCollectionInterval);
    }
  }
}

// Global metrics instance
const advancedMetrics = new AdvancedPerformanceMetrics();

/**
 * Advanced performance monitoring middleware
 */
function advancedPerformanceMonitor(options = {}) {
  const {
    slowThreshold = 1000,
    verySlowThreshold = 5000,
    trackMemory = true,
    trackCpu = true,
    enableAlerting = true,
    samplingRate = 1.0,
    excludeEndpoints = [],
    trackUserAgents = true,
    trackIpAddresses = true
  } = options;

  return (req, res, next) => {
    // Skip monitoring for excluded endpoints
    const endpoint = `${req.method} ${req.path}`;
    if (excludeEndpoints.some(pattern => endpoint.includes(pattern))) {
      return next();
    }
    
    // Apply sampling
    if (Math.random() > samplingRate) {
      return next();
    }
    
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    // Track active requests
    advancedMetrics.metrics.requests.active++;
    
    // Override res.end to capture completion metrics
    const originalEnd = res.end;
    let ended = false;
    
    res.end = function(...args) {
      if (ended) {
        return;
      }
      ended = true;
      
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const endMemory = process.memoryUsage();
      
      // Track active requests
      advancedMetrics.metrics.requests.active--;
      
      // Record request metrics
      advancedMetrics.recordRequest(req, res, responseTime, res.locals.error);
      
      // Track memory delta if enabled
      if (trackMemory) {
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        if (memoryDelta > 10 * 1024 * 1024) { // > 10MB increase
          advancedMetrics.emitAlert('high_memory_delta', {
            endpoint,
            memoryDelta: memoryDelta / 1024 / 1024, // MB
            responseTime
          });
        }
      }
      
      // Set performance headers
      res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
      res.set('X-Memory-Delta', `${((endMemory.heapUsed - startMemory.heapUsed) / 1024).toFixed(2)}KB`);
      res.set('X-Request-ID', req.requestId || 'unknown');
      
      return originalEnd.apply(this, args);
    };
    
    // Track errors
    res.on('error', (error) => {
      res.locals.error = error;
      advancedMetrics.emitAlert('request_error', {
        endpoint,
        error: error.message,
        statusCode: res.statusCode
      });
    });
    
    next();
  };
}

/**
 * Database query performance monitoring wrapper
 */
function wrapDatabaseQuery(db) {
  const originalRaw = db.raw;
  const originalQuery = db.query;
  
  // Wrap raw queries
  db.raw = function(sql, bindings) {
    const startTime = process.hrtime.bigint();
    
    const result = originalRaw.call(this, sql, bindings);
    
    if (result && typeof result.then === 'function') {
      return result
        .then(data => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1000000; // milliseconds
          
          // Extract table and operation from SQL
          const { table, operation } = parseSqlQuery(sql);
          
          advancedMetrics.recordDbQuery(duration, sql, table, operation, false);
          return data;
        })
        .catch(error => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1000000;
          
          const { table, operation } = parseSqlQuery(sql);
          
          advancedMetrics.recordDbQuery(duration, sql, table, operation, false, error);
          throw error;
        });
    }
    
    return result;
  };
  
  return db;
}

/**
 * Parse SQL query to extract table and operation
 */
function parseSqlQuery(sql) {
  if (!sql || typeof sql !== 'string') {
    return { table: 'unknown', operation: 'unknown' };
  }
  
  const cleanSql = sql.toLowerCase().trim();
  
  // Extract operation
  let operation = 'unknown';
  if (cleanSql.startsWith('select')) {
    operation = 'select';
  } else if (cleanSql.startsWith('insert')) {
    operation = 'insert';
  } else if (cleanSql.startsWith('update')) {
    operation = 'update';
  } else if (cleanSql.startsWith('delete')) {
    operation = 'delete';
  } else if (cleanSql.startsWith('create')) {
    operation = 'create';
  } else if (cleanSql.startsWith('drop')) {
    operation = 'drop';
  } else if (cleanSql.startsWith('alter')) {
    operation = 'alter';
  }
  
  // Extract table name (simplified)
  let table = 'unknown';
  const tablePatterns = [
    /(?:from|into|update|join)\s+["`]?(\w+)["`]?/i,
    /(?:table\s+)["`]?(\w+)["`]?/i
  ];
  
  for (const pattern of tablePatterns) {
    const match = sql.match(pattern);
    if (match && match[1]) {
      table = match[1];
      break;
    }
  }
  
  return { table, operation };
}

/**
 * Get performance alert event emitter
 */
function getPerformanceEvents() {
  return performanceEvents;
}

/**
 * Get advanced metrics
 */
function getAdvancedMetrics() {
  return advancedMetrics.getMetrics();
}

/**
 * Reset advanced metrics
 */
function resetAdvancedMetrics() {
  advancedMetrics.reset();
}

/**
 * Setup performance alert handlers
 */
function setupAlertHandlers() {
  performanceEvents.on('alert', (alert) => {
    console.warn(`[PERFORMANCE ALERT] ${alert.type}:`, JSON.stringify(alert.data, null, 2));
    
    // Here you could integrate with external alerting systems
    // Examples: Slack, email, PagerDuty, etc.
    if (process.env.PERFORMANCE_ALERTS_WEBHOOK) {
      // Send to webhook
      sendAlertToWebhook(alert);
    }
  });
}

/**
 * Send alert to external webhook (placeholder)
 */
async function sendAlertToWebhook(alert) {
  try {
    // This would make an HTTP request to your alerting system
    // Implementation depends on your specific alerting needs
    console.log('Would send alert to webhook:', alert);
  } catch (error) {
    console.error('Failed to send performance alert to webhook:', error);
  }
}

/**
 * Cleanup on process exit
 */
process.on('exit', () => {
  advancedMetrics.cleanup();
});

process.on('SIGINT', () => {
  advancedMetrics.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  advancedMetrics.cleanup();
  process.exit(0);
});

module.exports = {
  advancedPerformanceMonitor,
  wrapDatabaseQuery,
  getPerformanceEvents,
  getAdvancedMetrics,
  resetAdvancedMetrics,
  setupAlertHandlers,
  AdvancedPerformanceMetrics
};