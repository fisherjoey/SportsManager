/**
 * @fileoverview Database Query Performance Monitoring - Package 3C
 * @description Advanced database query performance tracking, optimization detection,
 * and recommendation system that integrates with existing query builders and cache.
 */

const { EventEmitter } = require('events');

// Lazy load dependencies to avoid circular references
let queryCache = null;
let QueryBuilder = null;

function getQueryCache() {
  if (!queryCache) {
    try {
      const cacheModule = require('./query-cache');
      queryCache = cacheModule.queryCache || { getStats: () => ({}) };
    } catch (error) {
      queryCache = { getStats: () => ({}) };
    }
  }
  return queryCache;
}

function getQueryBuilder() {
  if (!QueryBuilder) {
    try {
      const builderModule = require('./query-builders');
      QueryBuilder = builderModule.QueryBuilder || {};
    } catch (error) {
      QueryBuilder = {};
    }
  }
  return QueryBuilder;
}

/**
 * Query performance event emitter
 */
const queryPerformanceEvents = new EventEmitter();

/**
 * Database Query Performance Analyzer
 */
class QueryPerformanceAnalyzer {
  constructor() {
    this.queries = new Map(); // Query fingerprint -> performance data
    this.slowQueries = [];
    this.queryPatterns = new Map(); // Pattern -> frequency
    this.tableStats = new Map(); // Table -> access patterns
    this.indexUsage = new Map(); // Index -> usage stats
    this.connectionPool = {
      active: 0,
      idle: 0,
      waiting: 0,
      max: 10,
      history: []
    };
    
    this.config = {
      slowQueryThreshold: 500, // 500ms
      verySlowQueryThreshold: 2000, // 2 seconds
      maxSlowQueries: 1000,
      maxQueryFingerprints: 5000,
      enableQueryPlanAnalysis: true,
      trackIndexUsage: true,
      connectionPoolMonitoring: true
    };
    
    this.startConnectionPoolMonitoring();
  }

  /**
   * Analyze and record query performance
   */
  analyzeQuery(sql, duration, bindings = [], result = null, error = null) {
    const fingerprint = this.generateQueryFingerprint(sql);
    const queryInfo = this.parseQuery(sql);
    const timestamp = Date.now();
    
    // Get or create query stats
    if (!this.queries.has(fingerprint)) {
      this.queries.set(fingerprint, {
        fingerprint,
        sql: this.normalizeQuery(sql),
        table: queryInfo.table,
        operation: queryInfo.operation,
        firstSeen: timestamp,
        lastSeen: timestamp,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        slowCount: 0,
        verySlowCount: 0,
        errorCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        rowsAffected: [],
        executionPlans: [],
        recommendations: new Set()
      });
    }
    
    const queryStats = this.queries.get(fingerprint);
    
    // Update statistics
    queryStats.count++;
    queryStats.totalTime += duration;
    queryStats.averageTime = queryStats.totalTime / queryStats.count;
    queryStats.minTime = Math.min(queryStats.minTime, duration);
    queryStats.maxTime = Math.max(queryStats.maxTime, duration);
    queryStats.lastSeen = timestamp;
    
    if (error) {
      queryStats.errorCount++;
      this.emitQueryEvent('query_error', {
        fingerprint,
        sql: queryStats.sql,
        duration,
        error: error.message,
        table: queryInfo.table
      });
    }
    
    // Track rows affected if available
    if (result && result.rowCount !== undefined) {
      queryStats.rowsAffected.push(result.rowCount);
      if (queryStats.rowsAffected.length > 100) {
        queryStats.rowsAffected.shift();
      }
    }
    
    // Categorize by performance
    if (duration > this.config.verySlowQueryThreshold) {
      queryStats.verySlowCount++;
      this.addSlowQuery({
        fingerprint,
        sql: queryStats.sql,
        duration,
        timestamp,
        table: queryInfo.table,
        operation: queryInfo.operation,
        severity: 'very_slow',
        bindings,
        rowsAffected: result?.rowCount
      });
      
      this.emitQueryEvent('very_slow_query', {
        fingerprint,
        sql: queryStats.sql,
        duration,
        table: queryInfo.table,
        operation: queryInfo.operation
      });
    } else if (duration > this.config.slowQueryThreshold) {
      queryStats.slowCount++;
      this.addSlowQuery({
        fingerprint,
        sql: queryStats.sql,
        duration,
        timestamp,
        table: queryInfo.table,
        operation: queryInfo.operation,
        severity: 'slow',
        bindings,
        rowsAffected: result?.rowCount
      });
      
      this.emitQueryEvent('slow_query', {
        fingerprint,
        sql: queryStats.sql,
        duration,
        table: queryInfo.table,
        operation: queryInfo.operation
      });
    }
    
    // Update table statistics
    this.updateTableStats(queryInfo.table, queryInfo.operation, duration);
    
    // Update query patterns
    this.updateQueryPatterns(queryInfo);
    
    // Generate recommendations
    this.generateQueryRecommendations(queryStats, queryInfo);
    
    // Cleanup old entries if needed
    this.cleanupOldEntries();
    
    return {
      fingerprint,
      duration,
      performance: this.classifyPerformance(duration),
      recommendations: Array.from(queryStats.recommendations)
    };
  }

  /**
   * Generate unique fingerprint for query
   */
  generateQueryFingerprint(sql) {
    // Normalize SQL for fingerprinting
    const normalized = sql
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?') // Replace parameterized queries
      .replace(/'[^']*'/g, '?') // Replace string literals
      .replace(/\b\d+\b/g, '?') // Replace numbers
      .toLowerCase()
      .trim();
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `query_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Parse query to extract metadata
   */
  parseQuery(sql) {
    const cleanSql = sql.toLowerCase().trim();
    
    // Extract operation
    let operation = 'unknown';
    if (cleanSql.startsWith('select')) operation = 'select';
    else if (cleanSql.startsWith('insert')) operation = 'insert';
    else if (cleanSql.startsWith('update')) operation = 'update';
    else if (cleanSql.startsWith('delete')) operation = 'delete';
    else if (cleanSql.startsWith('create')) operation = 'create';
    else if (cleanSql.startsWith('drop')) operation = 'drop';
    else if (cleanSql.startsWith('alter')) operation = 'alter';
    else if (cleanSql.includes('join')) operation = 'join';
    
    // Extract table names
    const tables = this.extractTableNames(sql);
    const primaryTable = tables.length > 0 ? tables[0] : 'unknown';
    
    // Detect query patterns
    const patterns = [];
    if (cleanSql.includes('where')) patterns.push('filtered');
    if (cleanSql.includes('order by')) patterns.push('sorted');
    if (cleanSql.includes('group by')) patterns.push('grouped');
    if (cleanSql.includes('limit')) patterns.push('limited');
    if (cleanSql.includes('join')) patterns.push('joined');
    if (cleanSql.includes('subquery') || cleanSql.includes('select') && cleanSql.match(/select/g).length > 1) {
      patterns.push('complex');
    }
    
    return {
      operation,
      table: primaryTable,
      tables,
      patterns,
      complexity: this.calculateQueryComplexity(cleanSql, patterns)
    };
  }

  /**
   * Extract table names from SQL
   */
  extractTableNames(sql) {
    const tables = [];
    const tablePatterns = [
      /(?:from|into|update|join)\s+["`]?(\w+)["`]?/gi,
      /(?:table\s+)["`]?(\w+)["`]?/gi
    ];
    
    for (const pattern of tablePatterns) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        const tableName = match[1].toLowerCase();
        if (!tables.includes(tableName)) {
          tables.push(tableName);
        }
      }
    }
    
    return tables;
  }

  /**
   * Calculate query complexity score
   */
  calculateQueryComplexity(sql, patterns) {
    let complexity = 1;
    
    // Base complexity on patterns
    if (patterns.includes('joined')) complexity += 2;
    if (patterns.includes('complex')) complexity += 3;
    if (patterns.includes('grouped')) complexity += 1;
    if (patterns.includes('sorted')) complexity += 1;
    
    // Count subqueries
    const subqueryCount = (sql.match(/select/gi) || []).length - 1;
    complexity += subqueryCount * 2;
    
    // Count joins
    const joinCount = (sql.match(/join/gi) || []).length;
    complexity += joinCount;
    
    return Math.min(complexity, 10); // Cap at 10
  }

  /**
   * Normalize query for display
   */
  normalizeQuery(sql) {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .trim()
      .substring(0, 500); // Truncate long queries
  }

  /**
   * Add slow query to tracking
   */
  addSlowQuery(queryData) {
    this.slowQueries.push(queryData);
    
    // Keep only recent slow queries
    if (this.slowQueries.length > this.config.maxSlowQueries) {
      this.slowQueries.shift();
    }
  }

  /**
   * Update table access statistics
   */
  updateTableStats(table, operation, duration) {
    if (!this.tableStats.has(table)) {
      this.tableStats.set(table, {
        table,
        totalQueries: 0,
        totalTime: 0,
        averageTime: 0,
        operations: new Map(),
        slowQueries: 0,
        lastAccessed: Date.now(),
        accessPattern: 'unknown'
      });
    }
    
    const stats = this.tableStats.get(table);
    stats.totalQueries++;
    stats.totalTime += duration;
    stats.averageTime = stats.totalTime / stats.totalQueries;
    stats.lastAccessed = Date.now();
    
    if (duration > this.config.slowQueryThreshold) {
      stats.slowQueries++;
    }
    
    // Update operation stats
    if (!stats.operations.has(operation)) {
      stats.operations.set(operation, { count: 0, totalTime: 0, averageTime: 0 });
    }
    
    const opStats = stats.operations.get(operation);
    opStats.count++;
    opStats.totalTime += duration;
    opStats.averageTime = opStats.totalTime / opStats.count;
    
    // Determine access pattern
    stats.accessPattern = this.determineAccessPattern(stats);
  }

  /**
   * Determine table access pattern
   */
  determineAccessPattern(stats) {
    const readOps = (stats.operations.get('select') || { count: 0 }).count;
    const writeOps = ['insert', 'update', 'delete'].reduce((sum, op) => {
      return sum + (stats.operations.get(op) || { count: 0 }).count;
    }, 0);
    
    const total = readOps + writeOps;
    if (total === 0) return 'unknown';
    
    const readRatio = readOps / total;
    
    if (readRatio > 0.9) return 'read_heavy';
    if (readRatio < 0.1) return 'write_heavy';
    if (readRatio > 0.7) return 'read_mostly';
    if (readRatio < 0.3) return 'write_mostly';
    return 'balanced';
  }

  /**
   * Update query pattern statistics
   */
  updateQueryPatterns(queryInfo) {
    const patternKey = `${queryInfo.operation}_${queryInfo.patterns.sort().join('_')}`;
    
    if (!this.queryPatterns.has(patternKey)) {
      this.queryPatterns.set(patternKey, {
        pattern: patternKey,
        operation: queryInfo.operation,
        patterns: queryInfo.patterns,
        count: 0,
        averageComplexity: 0,
        totalComplexity: 0
      });
    }
    
    const pattern = this.queryPatterns.get(patternKey);
    pattern.count++;
    pattern.totalComplexity += queryInfo.complexity;
    pattern.averageComplexity = pattern.totalComplexity / pattern.count;
  }

  /**
   * Generate performance recommendations for query
   */
  generateQueryRecommendations(queryStats, queryInfo) {
    const recommendations = queryStats.recommendations;
    
    // High error rate
    if (queryStats.errorCount > queryStats.count * 0.1) {
      recommendations.add({
        type: 'high_error_rate',
        message: `Query has high error rate (${((queryStats.errorCount / queryStats.count) * 100).toFixed(1)}%). Review query logic and error handling.`,
        priority: 'high'
      });
    }
    
    // Consistently slow
    if (queryStats.averageTime > this.config.slowQueryThreshold && queryStats.count > 10) {
      recommendations.add({
        type: 'consistently_slow',
        message: `Query averages ${queryStats.averageTime.toFixed(0)}ms. Consider adding indexes or optimizing query structure.`,
        priority: 'high'
      });
    }
    
    // High frequency, moderate performance
    if (queryStats.count > 100 && queryStats.averageTime > 100) {
      recommendations.add({
        type: 'cache_candidate',
        message: `High-frequency query (${queryStats.count} executions) with moderate performance. Consider caching results.`,
        priority: 'medium'
      });
    }
    
    // Complex queries
    if (queryInfo.complexity > 5 && queryStats.averageTime > 200) {
      recommendations.add({
        type: 'complex_query',
        message: `Complex query with moderate performance. Consider breaking into smaller queries or optimizing joins.`,
        priority: 'medium'
      });
    }
    
    // Table-specific recommendations
    const tableStats = this.tableStats.get(queryInfo.table);
    if (tableStats && tableStats.slowQueries > tableStats.totalQueries * 0.2) {
      recommendations.add({
        type: 'table_performance',
        message: `Table '${queryInfo.table}' has high percentage of slow queries. Consider adding indexes.`,
        priority: 'medium'
      });
    }
    
    // N+1 query detection (simplified)
    if (queryInfo.operation === 'select' && queryStats.count > 50 && queryStats.averageTime < 50) {
      const similarQueries = Array.from(this.queries.values())
        .filter(q => q.table === queryInfo.table && q.operation === 'select' && q.count > 50);
      
      if (similarQueries.length > 1) {
        recommendations.add({
          type: 'potential_n_plus_1',
          message: `Potential N+1 query pattern detected for table '${queryInfo.table}'. Consider using joins or batch loading.`,
          priority: 'medium'
        });
      }
    }
  }

  /**
   * Classify query performance
   */
  classifyPerformance(duration) {
    if (duration > this.config.verySlowQueryThreshold) return 'very_slow';
    if (duration > this.config.slowQueryThreshold) return 'slow';
    if (duration > 100) return 'moderate';
    if (duration > 50) return 'good';
    return 'excellent';
  }

  /**
   * Start connection pool monitoring
   */
  startConnectionPoolMonitoring() {
    if (!this.config.connectionPoolMonitoring) return;
    
    const monitorPool = () => {
      // This would integrate with your actual database connection pool
      // For now, simulate connection pool metrics
      const timestamp = Date.now();
      
      this.connectionPool.history.push({
        timestamp,
        active: this.connectionPool.active,
        idle: this.connectionPool.idle,
        waiting: this.connectionPool.waiting
      });
      
      // Keep only last 100 entries
      if (this.connectionPool.history.length > 100) {
        this.connectionPool.history.shift();
      }
      
      // Alert on connection pool issues
      if (this.connectionPool.waiting > 0) {
        this.emitQueryEvent('connection_pool_waiting', {
          waiting: this.connectionPool.waiting,
          active: this.connectionPool.active,
          idle: this.connectionPool.idle
        });
      }
      
      if (this.connectionPool.active > this.connectionPool.max * 0.9) {
        this.emitQueryEvent('connection_pool_near_limit', {
          active: this.connectionPool.active,
          max: this.connectionPool.max,
          utilization: (this.connectionPool.active / this.connectionPool.max) * 100
        });
      }
    };
    
    // Monitor every 10 seconds
    this.poolMonitorInterval = setInterval(monitorPool, 10000);
  }

  /**
   * Emit query performance event
   */
  emitQueryEvent(type, data) {
    queryPerformanceEvents.emit('query_event', {
      type,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats() {
    const now = Date.now();
    
    // Convert Maps to Objects for JSON serialization
    const queryStats = Array.from(this.queries.values())
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 50); // Top 50 slowest queries
    
    const tableStats = Array.from(this.tableStats.values())
      .sort((a, b) => b.averageTime - a.averageTime);
    
    const queryPatterns = Array.from(this.queryPatterns.values())
      .sort((a, b) => b.count - a.count);
    
    // Calculate summary statistics
    const totalQueries = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.count, 0);
    
    const totalTime = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.totalTime, 0);
    
    const slowQueries = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.slowCount, 0);
    
    const verySlowQueries = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.verySlowCount, 0);
    
    const errorCount = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.errorCount, 0);
    
    return {
      summary: {
        totalQueries,
        totalTime,
        averageTime: totalQueries > 0 ? totalTime / totalQueries : 0,
        slowQueries,
        verySlowQueries,
        errorCount,
        slowQueryPercentage: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
        errorPercentage: totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0,
        uniqueQueries: this.queries.size,
        monitoredTables: this.tableStats.size
      },
      
      topSlowQueries: queryStats.slice(0, 10).map(q => ({
        fingerprint: q.fingerprint,
        sql: q.sql,
        table: q.table,
        operation: q.operation,
        count: q.count,
        averageTime: Math.round(q.averageTime),
        maxTime: q.maxTime,
        slowCount: q.slowCount,
        errorCount: q.errorCount,
        recommendations: Array.from(q.recommendations)
      })),
      
      tablePerformance: tableStats.map(t => ({
        table: t.table,
        totalQueries: t.totalQueries,
        averageTime: Math.round(t.averageTime),
        slowQueries: t.slowQueries,
        accessPattern: t.accessPattern,
        operations: Object.fromEntries(t.operations),
        lastAccessed: t.lastAccessed
      })),
      
      queryPatterns: queryPatterns.slice(0, 20),
      
      recentSlowQueries: this.slowQueries
        .slice(-20)
        .map(q => ({
          sql: q.sql,
          duration: q.duration,
          table: q.table,
          operation: q.operation,
          severity: q.severity,
          timestamp: q.timestamp
        })),
      
      connectionPool: {
        ...this.connectionPool,
        utilization: this.connectionPool.max > 0 
          ? (this.connectionPool.active / this.connectionPool.max) * 100 
          : 0
      },
      
      recommendations: [], // Generate recommendations separately to avoid circular calls
      
      timestamp: now
    };
  }

  /**
   * Generate global performance recommendations
   */
  generateGlobalRecommendations() {
    const recommendations = [];
    
    // Don't call getPerformanceStats() to avoid circular calls
    const totalQueries = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.count, 0);
    
    const slowQueries = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.slowCount, 0);
      
    const errorCount = Array.from(this.queries.values())
      .reduce((sum, q) => sum + q.errorCount, 0);
    
    const slowQueryPercentage = totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0;
    const errorPercentage = totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0;
    
    const stats = {
      summary: {
        slowQueryPercentage,
        errorPercentage,
        totalQueries
      },
      connectionPool: this.connectionPool,
      tablePerformance: Array.from(this.tableStats.values())
        .sort((a, b) => b.averageTime - a.averageTime)
    };
    
    // High percentage of slow queries
    if (stats.summary.slowQueryPercentage > 20) {
      recommendations.push({
        type: 'high_slow_query_rate',
        message: `${stats.summary.slowQueryPercentage.toFixed(1)}% of queries are slow. Review database indexes and query optimization.`,
        priority: 'high'
      });
    }
    
    // High error rate
    if (stats.summary.errorPercentage > 5) {
      recommendations.push({
        type: 'high_error_rate',
        message: `${stats.summary.errorPercentage.toFixed(1)}% of queries result in errors. Review query logic and database constraints.`,
        priority: 'high'
      });
    }
    
    // Connection pool utilization
    if (stats.connectionPool.utilization > 80) {
      recommendations.push({
        type: 'high_connection_utilization',
        message: `Connection pool is ${stats.connectionPool.utilization.toFixed(1)}% utilized. Consider increasing pool size or optimizing query performance.`,
        priority: 'medium'
      });
    }
    
    // Most problematic tables
    const problematicTables = stats.tablePerformance
      .filter(t => t.slowQueries > t.totalQueries * 0.3)
      .slice(0, 3);
    
    problematicTables.forEach(table => {
      recommendations.push({
        type: 'problematic_table',
        message: `Table '${table.table}' has poor performance (${((table.slowQueries / table.totalQueries) * 100).toFixed(1)}% slow queries). Consider adding indexes.`,
        priority: 'medium'
      });
    });
    
    return recommendations;
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  cleanupOldEntries() {
    // Remove old query fingerprints if we have too many
    if (this.queries.size > this.config.maxQueryFingerprints) {
      const oldestEntries = Array.from(this.queries.entries())
        .sort(([, a], [, b]) => a.lastSeen - b.lastSeen)
        .slice(0, Math.floor(this.config.maxQueryFingerprints * 0.1)); // Remove oldest 10%
      
      oldestEntries.forEach(([fingerprint]) => {
        this.queries.delete(fingerprint);
      });
    }
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.queries.clear();
    this.slowQueries.length = 0;
    this.queryPatterns.clear();
    this.tableStats.clear();
    this.indexUsage.clear();
    
    this.connectionPool = {
      active: 0,
      idle: 0,
      waiting: 0,
      max: 10,
      history: []
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.poolMonitorInterval) {
      clearInterval(this.poolMonitorInterval);
    }
  }
}

// Global analyzer instance
const queryAnalyzer = new QueryPerformanceAnalyzer();

/**
 * Wrap database connection with performance monitoring
 */
function wrapDatabaseConnection(db, options = {}) {
  const { enablePerformanceTracking = true, trackConnectionPool = true } = options;
  
  if (!enablePerformanceTracking) return db;
  
  // Track connection pool events if supported
  if (trackConnectionPool && db.pool) {
    db.pool.on('createSuccess', () => {
      queryAnalyzer.connectionPool.active++;
    });
    
    db.pool.on('createFail', () => {
      queryAnalyzer.emitQueryEvent('connection_create_failed', {});
    });
    
    db.pool.on('destroySuccess', () => {
      queryAnalyzer.connectionPool.active--;
    });
    
    db.pool.on('acquireRequest', () => {
      queryAnalyzer.connectionPool.waiting++;
    });
    
    db.pool.on('acquireSuccess', () => {
      queryAnalyzer.connectionPool.waiting--;
      queryAnalyzer.connectionPool.idle--;
    });
    
    db.pool.on('release', () => {
      queryAnalyzer.connectionPool.idle++;
    });
  }
  
  // Wrap query methods
  const originalRaw = db.raw;
  db.raw = function(sql, bindings) {
    const startTime = process.hrtime.bigint();
    
    const result = originalRaw.call(this, sql, bindings);
    
    if (result && typeof result.then === 'function') {
      return result
        .then(data => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1000000; // milliseconds
          
          queryAnalyzer.analyzeQuery(sql, duration, bindings, data);
          return data;
        })
        .catch(error => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1000000;
          
          queryAnalyzer.analyzeQuery(sql, duration, bindings, null, error);
          throw error;
        });
    }
    
    return result;
  };
  
  return db;
}

/**
 * Get query performance events
 */
function getQueryPerformanceEvents() {
  return queryPerformanceEvents;
}

/**
 * Get query performance statistics
 */
function getQueryPerformanceStats() {
  return queryAnalyzer.getPerformanceStats();
}

/**
 * Reset query performance statistics
 */
function resetQueryPerformanceStats() {
  queryAnalyzer.reset();
}

/**
 * Cleanup on process exit
 */
process.on('exit', () => {
  queryAnalyzer.cleanup();
});

module.exports = {
  QueryPerformanceAnalyzer,
  wrapDatabaseConnection,
  getQueryPerformanceEvents,
  getQueryPerformanceStats,
  resetQueryPerformanceStats,
  queryAnalyzer
};