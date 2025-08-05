const { createAuditLog, AUDIT_EVENTS, AUDIT_SEVERITY } = require('./auditTrail');

/**
 * Enhanced error handling and logging middleware
 * Prevents information leakage while maintaining debugging capabilities
 */

/**
 * Error types for categorization
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 'validation_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  AUTHORIZATION_ERROR: 'authorization_error',
  NOT_FOUND_ERROR: 'not_found_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  DATABASE_ERROR: 'database_error',
  INTERNAL_ERROR: 'internal_error',
  EXTERNAL_SERVICE_ERROR: 'external_service_error'
};

/**
 * Error severity levels for logging
 */
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Application Error class for structured error handling
 */
class AppError extends Error {
  constructor(message, statusCode = 500, type = ERROR_TYPES.INTERNAL_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database Error class for database-specific errors
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, ERROR_TYPES.DATABASE_ERROR);
    this.originalError = originalError;
  }
}

/**
 * Validation Error class for input validation errors
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ERROR_TYPES.VALIDATION_ERROR);
    this.details = details;
  }
}

/**
 * Authentication Error class
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ERROR_TYPES.AUTHENTICATION_ERROR);
  }
}

/**
 * Authorization Error class
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ERROR_TYPES.AUTHORIZATION_ERROR);
  }
}

/**
 * Not Found Error class
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ERROR_TYPES.NOT_FOUND_ERROR);
  }
}

/**
 * Rate Limit Error class
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, ERROR_TYPES.RATE_LIMIT_ERROR);
  }
}

/**
 * Determine error severity based on error details
 */
function determineErrorSeverity(error, req) {
  // Critical: Authentication bypass attempts, security violations
  if (error.type === ERROR_TYPES.AUTHENTICATION_ERROR && req.path.includes('/admin')) {
    return ERROR_SEVERITY.CRITICAL;
  }
  
  // High: Database errors, internal server errors, security issues
  if (error.type === ERROR_TYPES.DATABASE_ERROR || 
      error.statusCode >= 500 ||
      error.type === ERROR_TYPES.AUTHORIZATION_ERROR) {
    return ERROR_SEVERITY.HIGH;
  }
  
  // Medium: Client errors, validation errors
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return ERROR_SEVERITY.MEDIUM;
  }
  
  return ERROR_SEVERITY.LOW;
}

/**
 * Sanitize error for client response
 */
function sanitizeError(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  
  // Base error response
  const errorResponse = {
    error: 'An error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };
  
  // For operational errors, we can safely expose the message
  if (error.isOperational) {
    errorResponse.error = error.message;
    errorResponse.type = error.type;
    
    // Include validation details for validation errors
    if (error instanceof ValidationError && error.details) {
      errorResponse.details = error.details;
    }
  }
  
  // In development/test, include more debugging information
  if (isDevelopment || isTest) {
    errorResponse.stack = error.stack;
    errorResponse.originalError = error.originalError?.message;
  }
  
  // Specific error message customization
  switch (error.type) {
  case ERROR_TYPES.AUTHENTICATION_ERROR:
    errorResponse.error = 'Authentication required';
    break;
  case ERROR_TYPES.AUTHORIZATION_ERROR:
    errorResponse.error = 'Insufficient permissions';
    break;
  case ERROR_TYPES.NOT_FOUND_ERROR:
    // Keep the original message for not found errors
    break;
  case ERROR_TYPES.RATE_LIMIT_ERROR:
    errorResponse.error = 'Too many requests, please try again later';
    break;
  case ERROR_TYPES.DATABASE_ERROR:
    errorResponse.error = 'Database operation failed';
    break;
  default:
    if (!error.isOperational) {
      errorResponse.error = 'Internal server error';
    }
  }
  
  return errorResponse;
}

/**
 * Log error details for debugging
 */
async function logError(error, req, res) {
  const severity = determineErrorSeverity(error, req);
  const clientIP = req.headers['x-forwarded-for'] || 
                  req.headers['x-real-ip'] || 
                  req.connection?.remoteAddress || 
                  req.ip || 
                  'unknown';
  
  // Console logging with severity-based formatting
  const logData = {
    timestamp: new Date().toISOString(),
    severity: severity,
    type: error.type || 'unknown',
    message: error.message,
    statusCode: error.statusCode || 500,
    path: req.path,
    method: req.method,
    ip: clientIP,
    userAgent: req.headers['user-agent'],
    userId: req.user?.userId || null,
    userEmail: req.user?.email || null,
    stack: error.stack
  };
  
  // Use different console methods based on severity
  switch (severity) {
  case ERROR_SEVERITY.CRITICAL:
    console.error('🚨 CRITICAL ERROR:', logData);
    break;
  case ERROR_SEVERITY.HIGH:
    console.error('❗ HIGH SEVERITY ERROR:', logData);
    break;
  case ERROR_SEVERITY.MEDIUM:
    console.warn('⚠️  MEDIUM SEVERITY ERROR:', logData);
    break;
  default:
    console.log('ℹ️  LOW SEVERITY ERROR:', logData);
  }
  
  // Create audit log entry
  try {
    await createAuditLog({
      event_type: getAuditEventType(error),
      user_id: req.user?.userId || null,
      user_email: req.user?.email || null,
      ip_address: clientIP,
      user_agent: req.headers['user-agent'],
      request_path: req.path,
      request_method: req.method,
      success: false,
      severity: severity,
      error_message: error.message,
      additional_data: {
        error_type: error.type,
        status_code: error.statusCode || 500,
        is_operational: error.isOperational || false,
        query_params: req.query,
        body_params: sanitizeBodyForLogging(req.body)
      }
    });
  } catch (auditError) {
    console.error('Failed to create audit log for error:', auditError);
  }
}

/**
 * Get appropriate audit event type for error
 */
function getAuditEventType(error) {
  switch (error.type) {
  case ERROR_TYPES.AUTHENTICATION_ERROR:
    return AUDIT_EVENTS.AUTH_LOGIN_FAILURE;
  case ERROR_TYPES.AUTHORIZATION_ERROR:
    return AUDIT_EVENTS.SECURITY_UNAUTHORIZED_ACCESS;
  case ERROR_TYPES.RATE_LIMIT_ERROR:
    return AUDIT_EVENTS.SECURITY_RATE_LIMIT_EXCEEDED;
  default:
    return AUDIT_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY;
  }
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBodyForLogging(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key', 'authorization'];
  const sanitized = { ...body };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

/**
 * Handle different types of database errors
 */
function handleDatabaseError(error) {
  // PostgreSQL specific error codes
  switch (error.code) {
  case '23505': // Unique constraint violation
    return new ValidationError('Duplicate entry found', {
      field: error.detail || 'unknown',
      constraint: error.constraint || 'unique_constraint'
    });
  case '23503': // Foreign key constraint violation
    return new ValidationError('Referenced record not found', {
      field: error.detail || 'unknown',
      constraint: error.constraint || 'foreign_key_constraint'
    });
  case '23502': // Not null constraint violation
    return new ValidationError('Required field missing', {
      field: error.column || 'unknown',
      constraint: 'not_null_constraint'
    });
  case '23514': // Check constraint violation
    return new ValidationError('Invalid field value', {
      field: error.detail || 'unknown',
      constraint: error.constraint || 'check_constraint'
    });
  case '42P01': // Undefined table
    return new DatabaseError('Database table not found');
  case '42703': // Undefined column
    return new DatabaseError('Database column not found');
  default:
    return new DatabaseError('Database operation failed', error);
  }
}

/**
 * Main error handling middleware
 */
function errorHandler(error, req, res, next) {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }
  
  let processedError = error;
  
  // Convert known error types
  if (error.name === 'ValidationError' && !error.isOperational) {
    processedError = new ValidationError(error.message, error.details);
  } else if (error.code && (error.code.startsWith('23') || error.code.startsWith('42'))) {
    processedError = handleDatabaseError(error);
  } else if (error.name === 'JsonWebTokenError') {
    processedError = new AuthenticationError('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    processedError = new AuthenticationError('Token expired');
  } else if (error.name === 'CastError') {
    processedError = new ValidationError('Invalid ID format');
  } else if (!error.isOperational) {
    // Wrap unexpected errors
    processedError = new AppError('Internal server error', 500, ERROR_TYPES.INTERNAL_ERROR, false);
    processedError.originalError = error;
  }
  
  // Log the error
  logError(processedError, req, res);
  
  // Sanitize error for client response
  const sanitizedError = sanitizeError(processedError, req);
  
  // Send error response
  res.status(processedError.statusCode || 500).json(sanitizedError);
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError('Route');
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error helper
 */
function createValidationError(message, details = null) {
  return new ValidationError(message, details);
}

/**
 * Database operation wrapper with error handling
 */
async function withDatabaseError(operation) {
  try {
    return await operation();
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

module.exports = {
  // Error classes
  AppError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  
  // Constants
  ERROR_TYPES,
  ERROR_SEVERITY,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Utilities
  createValidationError,
  withDatabaseError,
  sanitizeBodyForLogging,
  logError
};