/**
 * Structured logging utility with error tracking and metrics
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  requestId?: string;
  userId?: string;
  component?: string;
  service?: string;
  operation?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId: string;
  userId: string;
  component: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  } | null;
  [key: string]: any;
}

export interface AIServiceMetrics {
  totalCalls: number;
  totalErrors: number;
  errorRate: string;
  averageLatency: string;
  latencyP95: string;
}

export interface AssignmentMetrics {
  totalRequests: number;
  successful: number;
  failed: number;
  successRate: string;
}

export interface LoggerMetrics {
  aiService: AIServiceMetrics;
  assignments: AssignmentMetrics;
}

interface InternalMetrics {
  aiServiceCalls: number;
  aiServiceErrors: number;
  aiServiceLatency: number[];
  assignmentRequests: number;
  assignmentSuccess: number;
  assignmentFailures: number;
}

export class Logger {
  public readonly logLevel: LogLevel;
  public readonly currentLevel: number;
  private readonly logDir: string;
  private readonly logLevels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };
  private metrics: InternalMetrics;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.currentLevel = this.logLevels[this.logLevel] || 2;

    // Create logs directory if it doesn't exist
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize metrics tracking
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
   */
  public logError(message: string, context: LogContext = {}, error: Error | null = null): void {
    const logEntry = this.createLogEntry('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
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
   */
  public logWarning(message: string, context: LogContext = {}): void {
    if (this.currentLevel < 1) {
      return;
    }

    const logEntry = this.createLogEntry('warn', message, context);
    this.writeLog(logEntry);
  }

  /**
   * Log info with structured data
   */
  public logInfo(message: string, context: LogContext = {}): void {
    if (this.currentLevel < 2) {
      return;
    }

    const logEntry = this.createLogEntry('info', message, context);
    this.writeLog(logEntry);
  }

  /**
   * Log debug information
   */
  public logDebug(message: string, context: LogContext = {}): void {
    if (this.currentLevel < 3) {
      return;
    }

    const logEntry = this.createLogEntry('debug', message, context);
    this.writeLog(logEntry);
  }

  /**
   * Log AI service metrics
   */
  public logAIMetrics(
    operation: string,
    duration: number,
    success: boolean,
    context: LogContext = {}
  ): void {
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
   */
  public logAssignment(operation: string, success: boolean, context: LogContext = {}): void {
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
   * Get current metrics summary
   */
  public getMetrics(): LoggerMetrics {
    const latencySum = this.metrics.aiServiceLatency.reduce((sum, val) => sum + val, 0);
    const avgLatency = this.metrics.aiServiceLatency.length > 0
      ? latencySum / this.metrics.aiServiceLatency.length
      : 0;

    return {
      aiService: {
        totalCalls: this.metrics.aiServiceCalls,
        totalErrors: this.metrics.aiServiceErrors,
        errorRate: this.metrics.aiServiceCalls > 0
          ? `${(this.metrics.aiServiceErrors / this.metrics.aiServiceCalls * 100).toFixed(2)}%`
          : '0%',
        averageLatency: `${Math.round(avgLatency)}ms`,
        latencyP95: `${this.calculatePercentile(this.metrics.aiServiceLatency, 95)}ms`
      },
      assignments: {
        totalRequests: this.metrics.assignmentRequests,
        successful: this.metrics.assignmentSuccess,
        failed: this.metrics.assignmentFailures,
        successRate: this.metrics.assignmentRequests > 0
          ? `${(this.metrics.assignmentSuccess / this.metrics.assignmentRequests * 100).toFixed(2)}%`
          : '0%'
      }
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
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
   * Standard info method (alias for logInfo)
   */
  public info(message: string, context: LogContext = {}): void {
    this.logInfo(message, context);
  }

  /**
   * Standard error method (alias for logError)
   */
  public error(message: string, context: LogContext = {}, error: Error | null = null): void {
    this.logError(message, context, error);
  }

  /**
   * Standard warn method (alias for logWarning)
   */
  public warn(message: string, context: LogContext = {}): void {
    this.logWarning(message, context);
  }

  /**
   * Standard debug method (alias for logDebug)
   */
  public debug(message: string, context: LogContext = {}): void {
    this.logDebug(message, context);
  }

  /**
   * Success logging (using info level with success indicator)
   */
  public success(message: string, context: LogContext = {}): void {
    this.logInfo(message, { ...context, level: 'success' });
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context: LogContext): LogEntry {
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
   */
  private writeLog(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry);

    // Console output with color coding
    const colors: Record<LogLevel, string> = {
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
      fs.appendFileSync(logFile, `${logString}\n`);
    }
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) {
      return 0;
    }

    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] || 0);
  }
}

// Create and export singleton instance
const logger = new Logger();

// CommonJS compatibility
module.exports = logger;
(module.exports as any).Logger = Logger;
(module.exports as any).default = logger;