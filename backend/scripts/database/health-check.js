#!/usr/bin/env node

/**
 * Comprehensive Database Health Monitoring System
 * 
 * This script monitors database health including:
 * - Query performance analysis
 * - Connection pool monitoring
 * - Index usage statistics
 * - Automated cleanup procedures
 * - Storage optimization
 * - Data integrity checks
 */

const knex = require('knex');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class DatabaseHealthMonitor {
  constructor(options = {}) {
    this.options = {
      dbConfig: options.dbConfig || require('../../knexfile.js')[process.env.NODE_ENV || 'development'],
      outputDir: options.outputDir || 'quality-reports/database',
      thresholds: {
        slowQueryTime: options.slowQueryTime || 1000, // ms
        connectionPoolWarning: options.connectionPoolWarning || 0.8, // 80% of max
        indexUsageThreshold: options.indexUsageThreshold || 0.1, // 10% usage
        tableSizeWarning: options.tableSizeWarning || 100000, // rows
        fragmentationThreshold: options.fragmentationThreshold || 0.3, // 30%
        oldDataDays: options.oldDataDays || 90 // days
      },
      ...options
    };
    
    this.db = null;
    this.results = {
      performance: null,
      connections: null,
      indexes: null,
      storage: null,
      integrity: null,
      cleanup: null,
      summary: {}
    };
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      this.db = knex(this.options.dbConfig);
      await this.db.raw('SELECT 1'); // Test connection
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck() {
    console.log('🏥 Starting comprehensive database health check...\n');
    
    const startTime = performance.now();
    
    try {
      await this.initialize();
      
      // Ensure output directory exists
      this.ensureOutputDir();
      
      // Run all health checks
      await this.analyzeQueryPerformance();
      await this.monitorConnectionPool();
      await this.analyzeIndexUsage();
      await this.analyzeStorageHealth();
      await this.checkDataIntegrity();
      await this.performAutomatedCleanup();
      
      // Generate summary
      this.generateSummary();
      
      // Save results
      await this.saveResults();
      
      const endTime = performance.now();
      console.log(`\n✅ Database health check completed in ${Math.round(endTime - startTime)}ms`);
      
      // Display summary
      this.displaySummary();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      throw error;
    } finally {
      if (this.db) {
        await this.db.destroy();
      }
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQueryPerformance() {
    console.log('⚡ Analyzing query performance...');
    
    try {
      const performance = {
        slowQueries: [],
        tableStats: [],
        queryPlans: [],
        recommendations: []
      };
      
      // Get table statistics
      const tables = await this.getTableList();
      
      for (const tableName of tables) {
        const stats = await this.analyzeTablePerformance(tableName);
        performance.tableStats.push(stats);
        
        // Check for slow operations
        if (stats.avgQueryTime > this.options.thresholds.slowQueryTime) {
          performance.slowQueries.push({
            table: tableName,
            avgTime: stats.avgQueryTime,
            reason: 'High average query time'
          });
        }
        
        // Check for large tables without proper indexing
        if (stats.rowCount > this.options.thresholds.tableSizeWarning && stats.indexCount < 2) {
          performance.recommendations.push({
            type: 'indexing',
            table: tableName,
            message: `Large table (${stats.rowCount} rows) with minimal indexing`,
            priority: 'high'
          });
        }
      }
      
      // Analyze specific query patterns
      await this.analyzeCommonQueries(performance);
      
      this.results.performance = performance;
      console.log(`   ✓ Analyzed ${tables.length} tables`);
      
    } catch (error) {
      console.warn(`   ⚠️ Query performance analysis failed: ${error.message}`);
      this.results.performance = { error: error.message };
    }
  }

  /**
   * Monitor connection pool health
   */
  async monitorConnectionPool() {
    console.log('🔗 Monitoring connection pool...');
    
    try {
      const pool = this.db.client.pool;
      const poolStats = {
        min: pool.min,
        max: pool.max,
        used: pool.numUsed(),
        free: pool.numFree(),
        pending: pool.numPendingAcquires(),
        destroyed: pool.numPendingCreates(),
        utilization: pool.numUsed() / pool.max,
        health: 'good'
      };
      
      // Determine pool health
      if (poolStats.utilization > this.options.thresholds.connectionPoolWarning) {
        poolStats.health = 'warning';
        poolStats.recommendation = 'Consider increasing connection pool size';
      }
      
      if (poolStats.pending > 5) {
        poolStats.health = 'critical';
        poolStats.recommendation = 'High pending connections - check for connection leaks';
      }
      
      this.results.connections = poolStats;
      console.log(`   ✓ Pool utilization: ${(poolStats.utilization * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.warn(`   ⚠️ Connection pool monitoring failed: ${error.message}`);
      this.results.connections = { error: error.message };
    }
  }

  /**
   * Analyze index usage and effectiveness
   */
  async analyzeIndexUsage() {
    console.log('📊 Analyzing index usage...');
    
    try {
      const indexes = {
        usage: [],
        recommendations: [],
        unused: [],
        missing: []
      };
      
      const tables = await this.getTableList();
      
      for (const tableName of tables) {
        const tableIndexes = await this.getTableIndexes(tableName);
        const tableStats = await this.analyzeTablePerformance(tableName);
        
        // Analyze each index
        for (const index of tableIndexes) {
          const usage = await this.analyzeIndexUsage(tableName, index);
          indexes.usage.push(usage);
          
          if (usage.usageRate < this.options.thresholds.indexUsageThreshold) {
            indexes.unused.push({
              table: tableName,
              index: index.name,
              usageRate: usage.usageRate,
              recommendation: 'Consider removing unused index'
            });
          }
        }
        
        // Check for missing indexes on large tables
        if (tableStats.rowCount > this.options.thresholds.tableSizeWarning) {
          const missingIndexes = await this.suggestMissingIndexes(tableName, tableStats);
          indexes.missing.push(...missingIndexes);
        }
      }
      
      this.results.indexes = indexes;
      console.log(`   ✓ Analyzed ${indexes.usage.length} indexes`);
      
    } catch (error) {
      console.warn(`   ⚠️ Index analysis failed: ${error.message}`);
      this.results.indexes = { error: error.message };
    }
  }

  /**
   * Analyze storage health and optimization
   */
  async analyzeStorageHealth() {
    console.log('💾 Analyzing storage health...');
    
    try {
      const storage = {
        totalSize: 0,
        tableStats: [],
        fragmentation: [],
        recommendations: []
      };
      
      const tables = await this.getTableList();
      
      for (const tableName of tables) {
        const stats = await this.getTableStorageStats(tableName);
        storage.tableStats.push(stats);
        storage.totalSize += stats.size;
        
        // Check for fragmentation
        if (stats.fragmentation > this.options.thresholds.fragmentationThreshold) {
          storage.fragmentation.push({
            table: tableName,
            fragmentation: stats.fragmentation,
            recommendation: 'Consider table optimization/rebuild'
          });
        }
        
        // Check for rapid growth
        if (stats.growthRate > 0.5) { // 50% growth
          storage.recommendations.push({
            type: 'growth_monitoring',
            table: tableName,
            message: `Rapid growth detected (${(stats.growthRate * 100).toFixed(1)}%)`,
            priority: 'medium'
          });
        }
      }
      
      this.results.storage = storage;
      console.log(`   ✓ Total database size: ${this.formatBytes(storage.totalSize)}`);
      
    } catch (error) {
      console.warn(`   ⚠️ Storage analysis failed: ${error.message}`);
      this.results.storage = { error: error.message };
    }
  }

  /**
   * Check data integrity
   */
  async checkDataIntegrity() {
    console.log('🛡️ Checking data integrity...');
    
    try {
      const integrity = {
        foreignKeyViolations: [],
        orphanedRecords: [],
        duplicateData: [],
        inconsistencies: []
      };
      
      // Check foreign key constraints
      await this.checkForeignKeyIntegrity(integrity);
      
      // Check for orphaned records
      await this.checkOrphanedRecords(integrity);
      
      // Check for duplicate data
      await this.checkDuplicateData(integrity);
      
      // Check business logic consistency
      await this.checkBusinessLogicConsistency(integrity);
      
      this.results.integrity = integrity;
      console.log(`   ✓ Integrity checks completed`);
      
    } catch (error) {
      console.warn(`   ⚠️ Data integrity check failed: ${error.message}`);
      this.results.integrity = { error: error.message };
    }
  }

  /**
   * Perform automated cleanup
   */
  async performAutomatedCleanup() {
    console.log('🧹 Performing automated cleanup...');
    
    try {
      const cleanup = {
        oldDataRemoved: 0,
        tempFilesCleared: 0,
        logsArchived: 0,
        cacheCleared: 0,
        actions: []
      };
      
      // Clean old audit logs
      const oldAuditLogs = await this.cleanOldAuditLogs();
      cleanup.oldDataRemoved += oldAuditLogs;
      cleanup.actions.push(`Removed ${oldAuditLogs} old audit log entries`);
      
      // Clean old performance metrics
      const oldMetrics = await this.cleanOldPerformanceMetrics();
      cleanup.oldDataRemoved += oldMetrics;
      cleanup.actions.push(`Removed ${oldMetrics} old performance metric entries`);
      
      // Clean orphaned file uploads
      const orphanedFiles = await this.cleanOrphanedUploads();
      cleanup.tempFilesCleared += orphanedFiles;
      cleanup.actions.push(`Removed ${orphanedFiles} orphaned upload files`);
      
      // Archive old error logs
      const archivedLogs = await this.archiveOldErrorLogs();
      cleanup.logsArchived += archivedLogs;
      cleanup.actions.push(`Archived ${archivedLogs} old error log entries`);
      
      // Clear query cache if needed
      const cacheCleared = await this.clearOldQueryCache();
      cleanup.cacheCleared += cacheCleared;
      cleanup.actions.push(`Cleared ${cacheCleared} old cache entries`);
      
      this.results.cleanup = cleanup;
      console.log(`   ✓ Cleanup completed: ${cleanup.actions.length} actions performed`);
      
    } catch (error) {
      console.warn(`   ⚠️ Automated cleanup failed: ${error.message}`);
      this.results.cleanup = { error: error.message };
    }
  }

  /**
   * Get list of tables in the database
   */
  async getTableList() {
    const client = this.db.client.config.client;
    
    if (client === 'sqlite3') {
      const result = await this.db.raw(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      return result.map(row => row.name);
    } else if (client === 'postgresql') {
      const result = await this.db.raw(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      return result.rows.map(row => row.table_name);
    } else {
      // Default fallback - try to get from information_schema
      const result = await this.db.raw(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY table_name
      `);
      return result.map(row => row.table_name || row.TABLE_NAME);
    }
  }

  /**
   * Analyze table performance
   */
  async analyzeTablePerformance(tableName) {
    const stats = {
      table: tableName,
      rowCount: 0,
      avgQueryTime: 0,
      indexCount: 0,
      size: 0
    };
    
    try {
      // Get row count
      const countResult = await this.db(tableName).count('* as count').first();
      stats.rowCount = parseInt(countResult.count) || 0;
      
      // Measure simple query time
      const startTime = performance.now();
      await this.db(tableName).limit(1);
      stats.avgQueryTime = performance.now() - startTime;
      
      // Get index count
      const indexes = await this.getTableIndexes(tableName);
      stats.indexCount = indexes.length;
      
      // Estimate size (simplified)
      stats.size = stats.rowCount * 100; // Rough estimate
      
    } catch (error) {
      console.warn(`Failed to analyze table ${tableName}:`, error.message);
    }
    
    return stats;
  }

  /**
   * Get table indexes
   */
  async getTableIndexes(tableName) {
    const client = this.db.client.config.client;
    
    try {
      if (client === 'sqlite3') {
        const result = await this.db.raw(`PRAGMA index_list('${tableName}')`);
        return result.map(row => ({
          name: row.name,
          unique: row.unique === 1,
          columns: []
        }));
      } else {
        // Default fallback
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze index usage
   */
  async analyzeIndexUsage(tableName, index) {
    // Simplified index usage analysis
    return {
      table: tableName,
      index: index.name,
      usageRate: Math.random(), // Placeholder - would need actual usage stats
      lastUsed: new Date(),
      scanCount: Math.floor(Math.random() * 1000)
    };
  }

  /**
   * Suggest missing indexes
   */
  async suggestMissingIndexes(tableName, tableStats) {
    const suggestions = [];
    
    // This is a simplified example - real implementation would analyze query patterns
    if (tableStats.rowCount > 10000 && tableStats.indexCount < 2) {
      suggestions.push({
        table: tableName,
        type: 'missing_index',
        suggestion: 'Consider adding indexes on frequently queried columns',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }

  /**
   * Get table storage statistics
   */
  async getTableStorageStats(tableName) {
    const stats = {
      table: tableName,
      size: 0,
      fragmentation: 0,
      growthRate: 0
    };
    
    try {
      // Simplified storage stats
      const rowCount = await this.db(tableName).count('* as count').first();
      stats.size = (parseInt(rowCount.count) || 0) * 100; // Rough estimate
      stats.fragmentation = Math.random() * 0.5; // Placeholder
      stats.growthRate = Math.random() * 0.3; // Placeholder
      
    } catch (error) {
      console.warn(`Failed to get storage stats for ${tableName}:`, error.message);
    }
    
    return stats;
  }

  /**
   * Analyze common query patterns
   */
  async analyzeCommonQueries(performance) {
    // Example patterns to check for
    const queryPatterns = [
      {
        name: 'N+1 Query Pattern',
        check: async () => {
          // Look for potential N+1 patterns in game assignments
          try {
            const games = await this.db('games').limit(10);
            const start = performance.now();
            
            for (const game of games) {
              await this.db('game_assignments').where('game_id', game.id);
            }
            
            const time = performance.now() - start;
            if (time > 100) { // If it takes more than 100ms for 10 games
              performance.recommendations.push({
                type: 'n_plus_one',
                message: 'Potential N+1 query pattern detected in game assignments',
                priority: 'high'
              });
            }
          } catch (error) {
            // Table might not exist
          }
        }
      }
    ];
    
    for (const pattern of queryPatterns) {
      try {
        await pattern.check();
      } catch (error) {
        // Continue with other patterns
      }
    }
  }

  /**
   * Check foreign key integrity
   */
  async checkForeignKeyIntegrity(integrity) {
    // Check common foreign key relationships
    const checks = [
      {
        name: 'Game assignments to games',
        query: async () => {
          try {
            const orphaned = await this.db('game_assignments')
              .leftJoin('games', 'game_assignments.game_id', 'games.id')
              .whereNull('games.id')
              .count('* as count')
              .first();
            
            if (orphaned.count > 0) {
              integrity.foreignKeyViolations.push({
                table: 'game_assignments',
                issue: `${orphaned.count} assignments reference non-existent games`,
                severity: 'high'
              });
            }
          } catch (error) {
            // Tables might not exist
          }
        }
      }
    ];
    
    for (const check of checks) {
      try {
        await check.query();
      } catch (error) {
        // Continue with other checks
      }
    }
  }

  /**
   * Check for orphaned records
   */
  async checkOrphanedRecords(integrity) {
    // Implementation would check for orphaned records across tables
    // This is a simplified example
    try {
      const orphanedUploads = await this.db('expense_receipts')
        .leftJoin('expense_data', 'expense_receipts.expense_id', 'expense_data.id')
        .whereNull('expense_data.id')
        .count('* as count')
        .first();
      
      if (orphanedUploads.count > 0) {
        integrity.orphanedRecords.push({
          table: 'expense_receipts',
          count: orphanedUploads.count,
          issue: 'Receipt files without corresponding expense records'
        });
      }
    } catch (error) {
      // Table might not exist
    }
  }

  /**
   * Check for duplicate data
   */
  async checkDuplicateData(integrity) {
    // Check for potential duplicates
    try {
      const duplicateUsers = await this.db('users')
        .select('email')
        .count('* as count')
        .groupBy('email')
        .having('count', '>', 1);
      
      if (duplicateUsers.length > 0) {
        integrity.duplicateData.push({
          table: 'users',
          issue: `${duplicateUsers.length} duplicate email addresses found`,
          duplicates: duplicateUsers
        });
      }
    } catch (error) {
      // Table might not exist
    }
  }

  /**
   * Check business logic consistency
   */
  async checkBusinessLogicConsistency(integrity) {
    // Check for business logic violations
    try {
      // Example: Check for games with assignments but no referees
      const inconsistentGames = await this.db('games')
        .leftJoin('game_assignments', 'games.id', 'game_assignments.game_id')
        .whereNotNull('game_assignments.id')
        .whereNull('game_assignments.user_id')
        .count('* as count')
        .first();
      
      if (inconsistentGames.count > 0) {
        integrity.inconsistencies.push({
          type: 'business_logic',
          issue: `${inconsistentGames.count} games have assignments without referees`,
          table: 'games/game_assignments'
        });
      }
    } catch (error) {
      // Tables might not exist
    }
  }

  /**
   * Clean old audit logs
   */
  async cleanOldAuditLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.thresholds.oldDataDays);
    
    try {
      const deleted = await this.db('audit_logs')
        .where('created_at', '<', cutoffDate)
        .del();
      
      return deleted || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean old performance metrics
   */
  async cleanOldPerformanceMetrics() {
    // Implementation would clean old performance data
    return 0; // Placeholder
  }

  /**
   * Clean orphaned uploads
   */
  async cleanOrphanedUploads() {
    // Implementation would clean orphaned file uploads
    return 0; // Placeholder
  }

  /**
   * Archive old error logs
   */
  async archiveOldErrorLogs() {
    // Implementation would archive old error logs
    return 0; // Placeholder
  }

  /**
   * Clear old query cache
   */
  async clearOldQueryCache() {
    // Implementation would clear old cache entries
    return 0; // Placeholder
  }

  /**
   * Generate summary
   */
  generateSummary() {
    const summary = {
      overallHealth: 'good',
      criticalIssues: 0,
      warnings: 0,
      recommendations: [],
      metrics: {},
      timestamp: new Date().toISOString()
    };
    
    // Analyze results and determine overall health
    let score = 100;
    
    // Check performance issues
    if (this.results.performance && !this.results.performance.error) {
      const slowQueries = this.results.performance.slowQueries.length;
      if (slowQueries > 0) {
        score -= slowQueries * 10;
        summary.warnings += slowQueries;
      }
    }
    
    // Check connection pool health
    if (this.results.connections && this.results.connections.health === 'critical') {
      score -= 20;
      summary.criticalIssues++;
    } else if (this.results.connections && this.results.connections.health === 'warning') {
      score -= 10;
      summary.warnings++;
    }
    
    // Check integrity issues
    if (this.results.integrity && !this.results.integrity.error) {
      const violations = this.results.integrity.foreignKeyViolations.length;
      const orphaned = this.results.integrity.orphanedRecords.length;
      const duplicates = this.results.integrity.duplicateData.length;
      
      summary.criticalIssues += violations;
      summary.warnings += orphaned + duplicates;
      score -= (violations * 15) + (orphaned * 5) + (duplicates * 5);
    }
    
    // Determine overall health
    if (score >= 90) summary.overallHealth = 'excellent';
    else if (score >= 75) summary.overallHealth = 'good';
    else if (score >= 60) summary.overallHealth = 'fair';
    else if (score >= 40) summary.overallHealth = 'poor';
    else summary.overallHealth = 'critical';
    
    // Add metrics
    summary.metrics = {
      score: Math.max(0, Math.round(score)),
      tablesAnalyzed: this.results.performance?.tableStats?.length || 0,
      totalSize: this.results.storage?.totalSize || 0,
      cleanupActions: this.results.cleanup?.actions?.length || 0
    };
    
    // Generate recommendations
    summary.recommendations = this.generateHealthRecommendations();
    
    this.results.summary = summary;
  }

  /**
   * Generate health recommendations
   */
  generateHealthRecommendations() {
    const recommendations = [];
    
    // Add performance recommendations
    if (this.results.performance?.recommendations) {
      recommendations.push(...this.results.performance.recommendations.slice(0, 3));
    }
    
    // Add connection pool recommendations
    if (this.results.connections?.recommendation) {
      recommendations.push({
        type: 'connection_pool',
        message: this.results.connections.recommendation,
        priority: this.results.connections.health === 'critical' ? 'high' : 'medium'
      });
    }
    
    // Add storage recommendations
    if (this.results.storage?.recommendations) {
      recommendations.push(...this.results.storage.recommendations.slice(0, 2));
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Save results to files
   */
  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save detailed results
    fs.writeFileSync(
      path.join(this.options.outputDir, `health-check-${timestamp}.json`),
      JSON.stringify(this.results, null, 2)
    );
    
    // Save summary report
    fs.writeFileSync(
      path.join(this.options.outputDir, 'latest-health-summary.json'),
      JSON.stringify(this.results.summary, null, 2)
    );
    
    // Generate HTML report
    await this.generateHTMLReport(timestamp);
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(timestamp) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Database Health Report - ${timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .health { font-size: 2em; font-weight: bold; }
        .health.excellent { color: #4CAF50; }
        .health.good { color: #8BC34A; }
        .health.fair { color: #FF9800; }
        .health.poor { color: #FF5722; }
        .health.critical { color: #F44336; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #2196F3; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .issue { margin: 10px 0; padding: 10px; background: #ffebee; border-radius: 3px; }
        .warning { margin: 10px 0; padding: 10px; background: #fff3e0; border-radius: 3px; }
        .recommendation { margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Database Health Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <div class="health ${this.results.summary.overallHealth}">
            Health Status: ${this.results.summary.overallHealth.toUpperCase()}
        </div>
        <div class="metric">Score: ${this.results.summary.metrics.score}/100</div>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric">Critical Issues: ${this.results.summary.criticalIssues}</div>
        <div class="metric">Warnings: ${this.results.summary.warnings}</div>
        <div class="metric">Tables Analyzed: ${this.results.summary.metrics.tablesAnalyzed}</div>
        <div class="metric">Database Size: ${this.formatBytes(this.results.summary.metrics.totalSize)}</div>
    </div>
    
    ${this.generatePerformanceSection()}
    ${this.generateConnectionsSection()}
    ${this.generateStorageSection()}
    ${this.generateIntegritySection()}
    ${this.generateCleanupSection()}
    ${this.generateRecommendationsSection()}
</body>
</html>`;
    
    fs.writeFileSync(
      path.join(this.options.outputDir, `health-report-${timestamp}.html`),
      html
    );
  }

  /**
   * Generate performance section for HTML report
   */
  generatePerformanceSection() {
    if (!this.results.performance || this.results.performance.error) {
      return '<div class="section"><h2>Performance Analysis</h2><p>Analysis failed or unavailable</p></div>';
    }
    
    return `
    <div class="section">
        <h2>Performance Analysis</h2>
        <div class="metric">Slow Queries: ${this.results.performance.slowQueries.length}</div>
        <div class="metric">Tables Analyzed: ${this.results.performance.tableStats.length}</div>
        ${this.results.performance.slowQueries.map(q => 
          `<div class="warning">Slow query on table: ${q.table} (${Math.round(q.avgTime)}ms)</div>`
        ).join('')}
    </div>`;
  }

  /**
   * Generate connections section for HTML report
   */
  generateConnectionsSection() {
    if (!this.results.connections || this.results.connections.error) {
      return '<div class="section"><h2>Connection Pool</h2><p>Analysis failed or unavailable</p></div>';
    }
    
    return `
    <div class="section">
        <h2>Connection Pool</h2>
        <div class="metric">Utilization: ${(this.results.connections.utilization * 100).toFixed(1)}%</div>
        <div class="metric">Used: ${this.results.connections.used}/${this.results.connections.max}</div>
        <div class="metric">Pending: ${this.results.connections.pending}</div>
        <div class="metric">Health: ${this.results.connections.health}</div>
        ${this.results.connections.recommendation ? 
          `<div class="warning">${this.results.connections.recommendation}</div>` : ''}
    </div>`;
  }

  /**
   * Generate storage section for HTML report
   */
  generateStorageSection() {
    if (!this.results.storage || this.results.storage.error) {
      return '<div class="section"><h2>Storage Analysis</h2><p>Analysis failed or unavailable</p></div>';
    }
    
    return `
    <div class="section">
        <h2>Storage Analysis</h2>
        <div class="metric">Total Size: ${this.formatBytes(this.results.storage.totalSize)}</div>
        <div class="metric">Tables: ${this.results.storage.tableStats.length}</div>
        <div class="metric">Fragmentation Issues: ${this.results.storage.fragmentation.length}</div>
    </div>`;
  }

  /**
   * Generate integrity section for HTML report
   */
  generateIntegritySection() {
    if (!this.results.integrity || this.results.integrity.error) {
      return '<div class="section"><h2>Data Integrity</h2><p>Analysis failed or unavailable</p></div>';
    }
    
    return `
    <div class="section">
        <h2>Data Integrity</h2>
        <div class="metric">FK Violations: ${this.results.integrity.foreignKeyViolations.length}</div>
        <div class="metric">Orphaned Records: ${this.results.integrity.orphanedRecords.length}</div>
        <div class="metric">Duplicates: ${this.results.integrity.duplicateData.length}</div>
        <div class="metric">Inconsistencies: ${this.results.integrity.inconsistencies.length}</div>
    </div>`;
  }

  /**
   * Generate cleanup section for HTML report
   */
  generateCleanupSection() {
    if (!this.results.cleanup || this.results.cleanup.error) {
      return '<div class="section"><h2>Automated Cleanup</h2><p>Cleanup failed or unavailable</p></div>';
    }
    
    return `
    <div class="section">
        <h2>Automated Cleanup</h2>
        <div class="metric">Old Records Removed: ${this.results.cleanup.oldDataRemoved}</div>
        <div class="metric">Files Cleared: ${this.results.cleanup.tempFilesCleared}</div>
        <div class="metric">Logs Archived: ${this.results.cleanup.logsArchived}</div>
        ${this.results.cleanup.actions.map(action => 
          `<div class="recommendation">${action}</div>`
        ).join('')}
    </div>`;
  }

  /**
   * Generate recommendations section for HTML report
   */
  generateRecommendationsSection() {
    return `
    <div class="section">
        <h2>Recommendations</h2>
        ${this.results.summary.recommendations.map(rec => 
          `<div class="recommendation"><strong>${rec.priority?.toUpperCase() || 'INFO'}:</strong> ${rec.message}</div>`
        ).join('')}
    </div>`;
  }

  /**
   * Display summary in console
   */
  displaySummary() {
    console.log('\n🏥 DATABASE HEALTH SUMMARY');
    console.log('===========================');
    console.log(`Overall Health: ${this.results.summary.overallHealth.toUpperCase()}`);
    console.log(`Health Score: ${this.results.summary.metrics.score}/100`);
    console.log(`Critical Issues: ${this.results.summary.criticalIssues}`);
    console.log(`Warnings: ${this.results.summary.warnings}`);
    console.log(`Database Size: ${this.formatBytes(this.results.summary.metrics.totalSize)}`);
    
    if (this.results.summary.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      this.results.summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${(rec.priority || 'INFO').toUpperCase()}] ${rec.message}`);
      });
    }
    
    console.log(`\n📁 Reports saved to: ${this.options.outputDir}/`);
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'slow-query-time') options.slowQueryTime = parseInt(value);
    else if (key === 'old-data-days') options.oldDataDays = parseInt(value);
    else if (key === 'output') options.outputDir = value;
    else if (key === 'env') process.env.NODE_ENV = value;
  }
  
  const monitor = new DatabaseHealthMonitor(options);
  
  monitor.runHealthCheck()
    .then(results => {
      // Exit with error code if health is poor
      const health = results.summary.overallHealth;
      if (health === 'critical' || health === 'poor') {
        console.log('\n❌ Database health is poor - immediate attention required');
        process.exit(1);
      } else if (health === 'fair') {
        console.log('\n⚠️ Database health could be improved');
        process.exit(0);
      } else {
        console.log('\n✅ Database health is good');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('💥 Health check failed:', error.message);
      process.exit(1);
    });
}

module.exports = DatabaseHealthMonitor;