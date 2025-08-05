/**
 * Structured logging utility with error tracking and metrics
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.currentLevel = this.logLevels[this.logLevel] || 2;
    
    // Create logs directory if it doesn't exist
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Metrics tracking
    this.metrics = {
      aiServiceCalls: 0,
      aiServiceErrors: 0,
      aiServiceLatency: [],
      assignmentRequests: 0,
      assignmentSuccess: 0,
      assignmentFailures: 0
    };
  }

  /**
   * Log error with structured data
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   * @param {Error} error - Error object
   */
  logError(message, context = {}, error = null) {
    const logEntry = this.createLogEntry('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null
    });

    this.writeLog(logEntry);
    
    // Track AI service errors
    if (context.service === 'ai' || context.component === 'aiServices') {
      this.metrics.aiServiceErrors++;
    }
    
    // Track assignment failures
    if (context.operation === 'assignment') {
      this.metrics.assignmentFailures++;
    }
  }

  /**
   * Log warning with structured data
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  logWarning(message, context = {}) {
    if (this.currentLevel < 1) {
      return;
    }
    
    const logEntry = this.createLogEntry('warn', message, context);
    this.writeLog(logEntry);
  }

  /**
   * Log info with structured data
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  logInfo(message, context = {}) {
    if (this.currentLevel < 2) {
      return;
    }
    
    const logEntry = this.createLogEntry('info', message, context);
    this.writeLog(logEntry);
  }

  /**
   * Log debug information
   * @param {string} message - Debug message
   * @param {Object} context - Additional context
   */
  logDebug(message, context = {}) {
    if (this.currentLevel < 3) {
      return;
    }
    
    const logEntry = this.createLogEntry('debug', message, context);
    this.writeLog(logEntry);
  }

  /**
   * Log AI service metrics
   * @param {string} operation - Operation type
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} success - Whether operation succeeded
   * @param {Object} context - Additional context
   */
  logAIMetrics(operation, duration, success, context = {}) {
    this.metrics.aiServiceCalls++;
    this.metrics.aiServiceLatency.push(duration);
    
    // Keep only last 1000 latency measurements
    if (this.metrics.aiServiceLatency.length > 1000) {
      this.metrics.aiServiceLatency = this.metrics.aiServiceLatency.slice(-1000);
    }

    this.logInfo('AI service call completed', {
      service: 'ai',
      operation,
      duration,
      success,
      ...context
    });
  }

  /**
   * Log assignment operation
   * @param {string} operation - Assignment operation
   * @param {boolean} success - Whether operation succeeded
   * @param {Object} context - Additional context
   */
  logAssignment(operation, success, context = {}) {
    this.metrics.assignmentRequests++;
    
    if (success) {
      this.metrics.assignmentSuccess++;
    } else {
      this.metrics.assignmentFailures++;
    }

    this.logInfo('Assignment operation completed', {
      operation: 'assignment',
      type: operation,
      success,
      ...context
    });
  }

  /**
   * Create structured log entry
   * @private
   */
  createLogEntry(level, message, context) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: context.requestId || 'unknown',
      userId: context.userId || 'anonymous',
      component: context.component || 'unknown',
      ...context
    };
  }

  /**
   * Write log entry to console and file
   * @private
   */
  writeLog(logEntry) {
    const logString = JSON.stringify(logEntry);
    
    // Console output with color coding
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m'  // Gray
    };
    
    const color = colors[logEntry.level] || '';
    const reset = '\x1b[0m';
    
    console.log(`${color}[${logEntry.level.toUpperCase()}] ${logEntry.timestamp} - ${logEntry.message}${reset}`);
    
    if (logEntry.level === 'error' || logEntry.level === 'warn') {
      console.log(logString);
    }

    // Write to file (errors and warnings always logged to file)
    if (logEntry.level === 'error' || logEntry.level === 'warn' || this.currentLevel >= 2) {
      const logFile = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, `${logString  }\n`);
    }
  }

  /**
   * Get current metrics summary
   * @returns {Object} Metrics summary
   */
  getMetrics() {
    const latencySum = this.metrics.aiServiceLatency.reduce((sum, val) => sum + val, 0);
    const avgLatency = this.metrics.aiServiceLatency.length > 0 
      ? latencySum / this.metrics.aiServiceLatency.length 
      : 0;

    return {
      aiService: {
        totalCalls: this.metrics.aiServiceCalls,
        totalErrors: this.metrics.aiServiceErrors,
        errorRate: this.metrics.aiServiceCalls > 0 
          ? `${(this.metrics.aiServiceErrors / this.metrics.aiServiceCalls * 100).toFixed(2)  }%`
          : '0%',
        averageLatency: `${Math.round(avgLatency)  }ms`,
        latencyP95: `${this.calculatePercentile(this.metrics.aiServiceLatency, 95)  }ms`
      },
      assignments: {
        totalRequests: this.metrics.assignmentRequests,
        successful: this.metrics.assignmentSuccess,
        failed: this.metrics.assignmentFailures,
        successRate: this.metrics.assignmentRequests > 0
          ? `${(this.metrics.assignmentSuccess / this.metrics.assignmentRequests * 100).toFixed(2)  }%`
          : '0%'
      }
    };
  }

  /**
   * Calculate percentile from array of numbers
   * @private
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) {
      return 0;
    }
    
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] || 0);
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics = {
      aiServiceCalls: 0,
      aiServiceErrors: 0,
      aiServiceLatency: [],
      assignmentRequests: 0,
      assignmentSuccess: 0,
      assignmentFailures: 0
    };
  }
}

// Export singleton instance
module.exports = new Logger();