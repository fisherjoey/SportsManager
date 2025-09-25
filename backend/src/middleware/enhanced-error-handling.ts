// @ts-nocheck

/**
 * @fileoverview Enhanced error handling middleware for the Sports Management App
 * @description Provides comprehensive error handling, logging, and response formatting
 * with support for operational vs programming errors, request context tracking,
 * and production-safe error responses.
 */

import { ResponseFormatter  } from '../utils/response-formatters';
import { ApiError, 
  ErrorUtils, 
  ErrorFactory,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  RateLimitError,
  TimeoutError
 } from '../utils/errors';

/**
 * Request context storage for error tracking
 */
const requestContexts = new Map();

/**
 * Error metrics collection (in-memory for now, could be replaced with external service)
 */
class ErrorMetrics {
  constructor() {
    this.counters = {
      total: 0,
      byStatusCode: {},
      byErrorType: {},
      byEndpoint: {}
    };
    this.startTime = Date.now();
  }

  increment(error, req) {
    this.counters.total++;
    
    const statusCode = error.statusCode || 500;
    this.counters.byStatusCode[statusCode] = (this.counters.byStatusCode[statusCode] || 0) + 1;
    
    const errorType = error.constructor.name;
    this.counters.byErrorType[errorType] = (this.counters.byErrorType[errorType] || 0) + 1;
    
    if (req) {
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      this.counters.byEndpoint[endpoint] = (this.counters.byEndpoint[endpoint] || 0) + 1;
    }
  }

  getStats() {
    return {
      ...this.counters,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.counters = {
      total: 0,
      byStatusCode: {},
      byErrorType: {},
      byEndpoint: {}
    };
  }
}

const errorMetrics = new ErrorMetrics();

/**
 * Enhanced logging utility for errors
 */
class ErrorLogger {
  /**
   * Log error with appropriate level based on severity
   */
  static log(error, req, errorId) {
    const context = ErrorUtils.getErrorContext(error, req);
    context.errorId = errorId;
    
    // Determine log level based on error type and status code
    const logLevel = this.getLogLevel(error);
    
    // Create structured log entry
    const logEntry = {
      level: logLevel,
      timestamp: context.timestamp,
      errorId,
      message: error.message,
      statusCode: error.statusCode || 500,
      errorType: error.constructor.name,
      isOperational: ErrorUtils.isOperational(error),
      stack: error.stack,
      context: {
        request: context.request,
        user: req?.user ? {
          id: req.user.id,
          email: req.user.email,
          roles: req.user.roles,
          organizationId: req.user.organization_id
        } : null,
        ...error.details && { errorDetails: error.details }
      }
    };

    // Log based on level
    switch (logLevel) {
    case 'error':
      console.error('ERROR:', JSON.stringify(logEntry, null, 2));
      break;
    case 'warn':
      console.warn('WARNING:', JSON.stringify(logEntry, null, 2));
      break;
    case 'info':
      console.info('INFO:', JSON.stringify(logEntry, null, 2));
      break;
    default:
      console.log('LOG:', JSON.stringify(logEntry, null, 2));
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEntry);
    }
  }

  /**
   * Determine appropriate log level for error
   */
  static getLogLevel(error) {
    if (!ErrorUtils.isOperational(error)) {
      return 'error'; // Programming errors are critical
    }

    const statusCode = error.statusCode || 500;
    
    if (statusCode >= 500) {
      return 'error';
    }
    if (statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  }

  /**
   * Send log entry to external logging service (placeholder)
   */
  static sendToExternalLogger(logEntry) {
    // Implement integration with external logging service
    // Examples: Winston, Bunyan, Datadog, New Relic, etc.
    
    // For now, just indicate where external logging would happen
    if (process.env.EXTERNAL_LOGGING_ENABLED === 'true') {
      // External logging implementation would go here
    }
  }

  /**
   * Log security-related events
   */
  static logSecurityEvent(event, req, details = {}) {
    const securityLogEntry = {
      level: 'warn',
      type: 'SECURITY_EVENT',
      event,
      timestamp: new Date().toISOString(),
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      userId: req?.user?.id,
      organizationId: req?.user?.organization_id,
      details
    };

    console.warn('SECURITY EVENT:', JSON.stringify(securityLogEntry, null, 2));
    
    // In production, immediately send security events to monitoring
    if (process.env.NODE_ENV === 'production') {
      this.sendToSecurityMonitoring(securityLogEntry);
    }
  }

  static sendToSecurityMonitoring(logEntry) {
    // Send to security monitoring service
    // Examples: Datadog Security, AWS Security Hub, etc.
  }
}

/**
 * Middleware to add request context tracking
 */
const requestContextMiddleware = (req, res, next) => {
  // Generate unique request ID
  req.requestId = req.get('X-Request-ID') || ErrorUtils.generateErrorId();
  
  // Add request ID to response headers
  res.set('X-Request-ID', req.requestId);
  
  // Store request context for error handling
  requestContexts.set(req.requestId, {
    startTime: Date.now(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    organizationId: req.user?.organization_id
  });

  // Clean up context after response
  res.on('finish', () => {
    requestContexts.delete(req.requestId);
  });

  next();
};

/**
 * Enhanced async handler with better error capture
 */
const enhancedAsyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // Ensure we have an error ID for tracking
      if (!error.errorId) {
        error.errorId = ErrorUtils.generateErrorId();
      }

      // Convert known error types to ApiError instances
      if (!(error instanceof ApiError)) {
        if (error.name === 'ValidationError' && error.details) {
          error = ErrorFactory.fromJoiError(error);
        } else if (error.code && error.code.startsWith('23')) {
          error = ErrorFactory.fromDatabaseError(error);
        } else {
          // Log the actual error before wrapping
          console.error('ENHANCED ERROR HANDLER - ACTUAL ERROR:', error);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          // Wrap unknown errors
          const wrappedError = new Error('An unexpected error occurred');
          wrappedError.originalError = error;
          wrappedError.statusCode = 500;
          wrappedError.isOperational = false;
          error = wrappedError;
        }
      }

      next(error);
    }
  };
};

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Generate error ID if not present
  const errorId = error.errorId || ErrorUtils.generateErrorId();
  error.errorId = errorId;

  // Update metrics
  errorMetrics.increment(error, req);

  // Log the error
  ErrorLogger.log(error, req, errorId);

  // Handle specific error types
  let statusCode = 500;
  let responseData;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    
    if (error.isOperational) {
      // Safe to expose operational errors
      responseData = ResponseFormatter.error(
        error.message,
        error.details,
        error.code,
        error instanceof ValidationError ? error.validationErrors : null
      );
    } else {
      // Don't expose programming errors in production
      responseData = ResponseFormatter.serverError(
        process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        process.env.NODE_ENV === 'development' ? error.details : null
      );
    }
  } else {
    // Handle native JavaScript errors and unknown errors
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (error.name === 'CastError') {
      statusCode = 400;
      responseData = ResponseFormatter.validationError(
        [{ field: error.path, message: 'Invalid format' }]
      );
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      responseData = ResponseFormatter.validationError(
        Object.values(error.errors || {}).map(err => ({
          field: err.path,
          message: err.message
        }))
      );
    } else if (error.code === 11000) {
      // MongoDB duplicate key error
      statusCode = 409;
      responseData = ResponseFormatter.conflict('Duplicate entry detected');
    } else {
      // Generic server error
      responseData = ResponseFormatter.serverError(
        isProduction ? 'An unexpected error occurred' : error.message,
        isProduction ? null : error.stack
      );
    }
  }

  // Add error tracking ID to response
  responseData.errorId = errorId;
  responseData.requestId = req.requestId;

  // Add retry information for retryable errors
  if (error instanceof TimeoutError || error instanceof RateLimitError) {
    if (error.retryAfter) {
      res.set('Retry-After', error.retryAfter);
    }
  }

  // Send error response
  res.status(statusCode).json(responseData);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const error = ErrorFactory.notFound('Endpoint', `${req.method} ${req.path}`);
  next(error);
};

/**
 * Graceful error handling for uncaught exceptions
 */
const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    ErrorLogger.log(error, null, ErrorUtils.generateErrorId());
    
    // In production, you might want to restart the server
    if (process.env.NODE_ENV === 'production') {
      console.error('Uncaught exception detected. Server should be restarted.');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
    
    const error = reason instanceof Error ? reason : new Error(String(reason));
    ErrorLogger.log(error, null, ErrorUtils.generateErrorId());
    
    // In production, you might want to restart the server
    if (process.env.NODE_ENV === 'production') {
      console.error('Unhandled rejection detected. Server should be restarted.');
      process.exit(1);
    }
  });
};

/**
 * Health check endpoint for error monitoring
 */
const errorHealthCheck = (req, res) => {
  const stats = errorMetrics.getStats();
  const isHealthy = stats.total < 1000; // Example threshold
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    errorStats: stats,
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware to validate request and throw appropriate errors
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      throw ErrorFactory.fromJoiError(error);
    }
    
    // Replace request data with validated/sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Error boundary for critical operations
 */
const withErrorBoundary = (operation, fallback = null) => {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      console.error('Error boundary caught:', error);
      
      if (fallback && typeof fallback === 'function') {
        return fallback(error);
      }
      
      throw error;
    }
  };
};

export {
  // Main middleware
  errorHandler,
  notFoundHandler,
  requestContextMiddleware,
  enhancedAsyncHandler,
  
  // Validation middleware
  validateRequest,
  
  // Utilities
  ErrorLogger,
  errorMetrics,
  setupGlobalErrorHandlers,
  errorHealthCheck,
  withErrorBoundary,
  
  // For testing and monitoring
  ErrorMetrics
};