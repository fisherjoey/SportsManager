/**
 * @fileoverview Custom error classes for the Sports Management App
 * @description Provides standardized error classes for different types of operational
 * and programming errors. These classes help differentiate between expected business
 * errors and unexpected system errors.
 */

/**
 * Base class for all operational errors (expected errors in business logic)
 * These errors are safe to expose to clients and represent expected conditions
 */
class ApiError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {boolean} isOperational - Whether this is an operational error
   * @param {*} details - Additional error details
   * @param {string} code - Error code for client handling
   */
  constructor(message, statusCode = 500, isOperational = true, details = null, code = null) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.code = code;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

/**
 * Validation error - 400 Bad Request
 * Used when request data fails validation
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null, validationErrors = null) {
    super(message, 400, true, details, 'VALIDATION_ERROR');
    this.validationErrors = validationErrors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Authentication error - 401 Unauthorized
 * Used when authentication is required or fails
 */
class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, true, details, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error - 403 Forbidden
 * Used when user lacks permissions for the requested action
 */
class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions', details = null) {
    super(message, 403, true, details, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource', identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, 404, true, { resource, identifier }, 'NOT_FOUND_ERROR');
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Conflict error - 409 Conflict
 * Used when request conflicts with current state (duplicates, business rules)
 */
class ConflictError extends ApiError {
  constructor(message, details = null, conflictType = null) {
    super(message, 409, true, details, 'CONFLICT_ERROR');
    this.conflictType = conflictType;
  }
}

/**
 * Unprocessable entity error - 422 Unprocessable Entity
 * Used when request is well-formed but contains semantic errors
 */
class UnprocessableEntityError extends ApiError {
  constructor(message = 'Unprocessable entity', details = null) {
    super(message, 422, true, details, 'UNPROCESSABLE_ENTITY_ERROR');
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 * Used when rate limits are exceeded
 */
class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, true, { retryAfter }, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

/**
 * Database error - 500 Internal Server Error
 * Used for database-specific errors (connection, constraints, etc.)
 */
class DatabaseError extends ApiError {
  constructor(message = 'Database error occurred', originalError = null, operation = null) {
    super(message, 500, false, { operation }, 'DATABASE_ERROR');
    this.originalError = originalError;
    this.operation = operation;
  }
}

/**
 * External service error - 502 Bad Gateway
 * Used when external service calls fail
 */
class ExternalServiceError extends ApiError {
  constructor(message = 'External service error', service = null, originalError = null) {
    super(message, 502, true, { service }, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * File processing error - 500 Internal Server Error
 * Used for file upload, processing, and storage errors
 */
class FileProcessingError extends ApiError {
  constructor(message = 'File processing failed', filename = null, operation = null) {
    super(message, 500, true, { filename, operation }, 'FILE_PROCESSING_ERROR');
    this.filename = filename;
    this.operation = operation;
  }
}

/**
 * Business logic error - 400 Bad Request
 * Used for domain-specific business rule violations
 */
class BusinessLogicError extends ApiError {
  constructor(message, rule = null, context = null) {
    super(message, 400, true, { rule, context }, 'BUSINESS_LOGIC_ERROR');
    this.rule = rule;
    this.context = context;
  }
}

/**
 * Timeout error - 408 Request Timeout
 * Used when operations exceed time limits
 */
class TimeoutError extends ApiError {
  constructor(message = 'Request timeout', operation = null, timeout = null) {
    super(message, 408, true, { operation, timeout }, 'TIMEOUT_ERROR');
    this.operation = operation;
    this.timeout = timeout;
  }
}

/**
 * Configuration error - 500 Internal Server Error
 * Used when configuration is invalid or missing
 */
class ConfigurationError extends ApiError {
  constructor(message = 'Configuration error', configKey = null) {
    super(message, 500, false, { configKey }, 'CONFIGURATION_ERROR');
    this.configKey = configKey;
  }
}

/**
 * Error factory functions for common scenarios
 */
class ErrorFactory {
  /**
   * Create validation error from Joi validation result
   */
  static fromJoiError(joiError, message = 'Validation failed') {
    const validationErrors = joiError.details.map(detail => ({
      field: detail.path ? detail.path.join('.') : 'unknown',
      message: detail.message,
      value: detail.context ? detail.context.value : undefined
    }));

    return new ValidationError(message, null, validationErrors);
  }

  /**
   * Create database error from database exception
   */
  static fromDatabaseError(error, operation = null) {
    let message = 'Database operation failed';
    let statusCode = 500;

    // Handle specific database error types
    if (error.code) {
      switch (error.code) {
      case '23505': // Unique violation
        message = 'Duplicate entry detected';
        statusCode = 409;
        return new ConflictError(message, { constraint: error.constraint });
        
      case '23503': // Foreign key violation
        message = 'Referenced record not found';
        statusCode = 400;
        return new ValidationError(message, { constraint: error.constraint });
        
      case '23502': // Not null violation
        message = 'Required field missing';
        statusCode = 400;
        return new ValidationError(message, { column: error.column });
        
      case '23514': // Check constraint violation
        message = 'Data validation failed';
        statusCode = 400;
        return new ValidationError(message, { constraint: error.constraint });
        
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
        message = 'Database connection failed';
        return new DatabaseError(message, error, operation);
        
      default:
        return new DatabaseError(message, error, operation);
      }
    }

    return new DatabaseError(message, error, operation);
  }

  /**
   * Create not found error for specific resource
   */
  static notFound(resource, identifier = null) {
    return new NotFoundError(resource, identifier);
  }

  /**
   * Create unauthorized error
   */
  static unauthorized(message = 'Authentication required') {
    return new AuthenticationError(message);
  }

  /**
   * Create forbidden error
   */
  static forbidden(message = 'Access denied') {
    return new AuthorizationError(message);
  }

  /**
   * Create conflict error
   */
  static conflict(message, details = null, conflictType = null) {
    return new ConflictError(message, details, conflictType);
  }

  /**
   * Create business logic error
   */
  static businessLogic(message, rule = null, context = null) {
    return new BusinessLogicError(message, rule, context);
  }

  /**
   * Create referee level validation error
   */
  static invalidRefereeLevel(level) {
    return new ValidationError(
      `Invalid referee level: ${level}. Must be one of: Rookie, Junior, Senior`,
      { 
        field: 'new_referee_level', 
        value: level, 
        allowed: ['Rookie', 'Junior', 'Senior'] 
      }
    );
  }

  /**
   * Create referee role error
   */
  static refereeRoleError(message, operation = null, roleData = null) {
    return new BusinessLogicError(
      message,
      'REFEREE_ROLE_OPERATION',
      { operation, roleData }
    );
  }

  /**
   * Create white whistle logic error
   */
  static whiteWhistleError(level, flag, reason) {
    return new BusinessLogicError(
      `White whistle configuration invalid for ${level} level: ${reason}`,
      'WHITE_WHISTLE_LOGIC',
      { level, flag, reason }
    );
  }
}

/**
 * Utility functions for error handling
 */
class ErrorUtils {
  /**
   * Check if error is operational (safe to expose to client)
   */
  static isOperational(error) {
    if (error instanceof ApiError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Extract error details for logging
   */
  static getErrorContext(error, req = null) {
    const context = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    if (error instanceof ApiError) {
      context.statusCode = error.statusCode;
      context.code = error.code;
      context.details = error.details;
      context.isOperational = error.isOperational;
    }

    if (req) {
      context.request = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        organizationId: req.user?.organization_id
      };
    }

    return context;
  }

  /**
   * Sanitize error for client response
   */
  static sanitizeForClient(error) {
    if (error instanceof ApiError && error.isOperational) {
      return {
        message: error.message,
        code: error.code,
        details: error.details,
        ...(error instanceof ValidationError && { validationErrors: error.validationErrors })
      };
    }

    // For non-operational errors, return generic message
    return {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR'
    };
  }

  /**
   * Generate unique error ID for tracking
   */
  static generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = {
  // Base error class
  ApiError,
  
  // Specific error classes
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  FileProcessingError,
  BusinessLogicError,
  TimeoutError,
  ConfigurationError,
  
  // Utility classes
  ErrorFactory,
  ErrorUtils
};