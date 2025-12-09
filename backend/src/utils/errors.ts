/**
 * @fileoverview Comprehensive TypeScript error classes for the Sports Management App
 * @description Provides standardized, fully typed error classes for different types of operational
 * and programming errors. These classes help differentiate between expected business
 * errors and unexpected system errors.
 */

/**
 * Type definitions for error details and validation errors
 */
export interface ErrorDetails {
  [key: string]: unknown;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface ConflictDetails extends ErrorDetails {
  constraint?: string;
  conflictType?: string;
}

export interface DatabaseErrorDetails extends ErrorDetails {
  operation?: string;
  constraint?: string;
  column?: string;
}

export interface ExternalServiceDetails extends ErrorDetails {
  service?: string;
}

export interface FileProcessingDetails extends ErrorDetails {
  filename?: string;
  operation?: string;
}

export interface BusinessLogicDetails extends ErrorDetails {
  rule?: string;
  context?: unknown;
}

export interface TimeoutDetails extends ErrorDetails {
  operation?: string;
  timeout?: number;
}

export interface ConfigurationDetails extends ErrorDetails {
  configKey?: string;
}

export interface RateLimitDetails extends ErrorDetails {
  retryAfter?: number;
}

export interface RequestContext {
  method?: string;
  url?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  userId?: number;
  organizationId?: number;
}

export interface ErrorContext {
  name: string;
  message: string;
  stack?: string;
  timestamp: string;
  statusCode?: number;
  code?: string;
  details?: ErrorDetails;
  isOperational?: boolean;
  request?: RequestContext;
}

export interface ClientErrorResponse {
  message: string;
  code?: string;
  details?: ErrorDetails;
  validationErrors?: ValidationErrorDetail[];
}

export interface SerializedError {
  name: string;
  message: string;
  statusCode: number;
  code?: string;
  details?: ErrorDetails;
  timestamp: string;
  stack?: string;
}

/**
 * HTTP Status Code constants
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502
} as const;

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

/**
 * Error code constants for client handling
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  UNPROCESSABLE_ENTITY_ERROR: 'UNPROCESSABLE_ENTITY_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  FILE_PROCESSING_ERROR: 'FILE_PROCESSING_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Base class for all operational errors (expected errors in business logic)
 * These errors are safe to expose to clients and represent expected conditions
 */
export class ApiError extends Error {
  public readonly name: string;
  public readonly statusCode: HttpStatusCode;
  public readonly isOperational: boolean;
  public readonly details: ErrorDetails | null;
  public readonly code: ErrorCode | null;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details: ErrorDetails | null = null,
    code: ErrorCode | null = null
  ) {
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
  toJSON(): SerializedError {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code || undefined,
      details: this.details || undefined,
      timestamp: this.timestamp,
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }

  /**
   * Type guard to check if an error is an ApiError
   */
  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

/**
 * Validation error - 400 Bad Request
 * Used when request data fails validation
 */
export class ValidationError extends ApiError {
  public readonly validationErrors: ValidationErrorDetail[] | null;

  constructor(
    message: string = 'Validation failed',
    details: ErrorDetails | null = null,
    validationErrors: ValidationErrorDetail[] | null = null
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, details, ERROR_CODES.VALIDATION_ERROR);
    this.validationErrors = validationErrors;
  }

  toJSON(): SerializedError & { validationErrors?: ValidationErrorDetail[] } {
    return {
      ...super.toJSON(),
      ...(this.validationErrors && { validationErrors: this.validationErrors })
    };
  }

  static isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }
}

/**
 * Authentication error - 401 Unauthorized
 * Used when authentication is required or fails
 */
export class AuthenticationError extends ApiError {
  constructor(
    message: string = 'Authentication required',
    details: ErrorDetails | null = null
  ) {
    super(message, HTTP_STATUS.UNAUTHORIZED, true, details, ERROR_CODES.AUTHENTICATION_ERROR);
  }

  static isAuthenticationError(error: unknown): error is AuthenticationError {
    return error instanceof AuthenticationError;
  }
}

/**
 * Authorization error - 403 Forbidden
 * Used when user lacks permissions for the requested action
 */
export class AuthorizationError extends ApiError {
  constructor(
    message: string = 'Insufficient permissions',
    details: ErrorDetails | null = null
  ) {
    super(message, HTTP_STATUS.FORBIDDEN, true, details, ERROR_CODES.AUTHORIZATION_ERROR);
  }

  static isAuthorizationError(error: unknown): error is AuthorizationError {
    return error instanceof AuthorizationError;
  }
}

/**
 * Not found error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  public readonly resource: string;
  public readonly identifier: string | null;

  constructor(resource: string = 'Resource', identifier: string | null = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, HTTP_STATUS.NOT_FOUND, true, { resource, identifier }, ERROR_CODES.NOT_FOUND_ERROR);
    this.resource = resource;
    this.identifier = identifier;
  }

  static isNotFoundError(error: unknown): error is NotFoundError {
    return error instanceof NotFoundError;
  }
}

/**
 * Conflict error - 409 Conflict
 * Used when request conflicts with current state (duplicates, business rules)
 */
export class ConflictError extends ApiError {
  public readonly conflictType: string | null;

  constructor(
    message: string,
    details: ConflictDetails | null = null,
    conflictType: string | null = null
  ) {
    super(message, HTTP_STATUS.CONFLICT, true, details, ERROR_CODES.CONFLICT_ERROR);
    this.conflictType = conflictType;
  }

  static isConflictError(error: unknown): error is ConflictError {
    return error instanceof ConflictError;
  }
}

/**
 * Unprocessable entity error - 422 Unprocessable Entity
 * Used when request is well-formed but contains semantic errors
 */
export class UnprocessableEntityError extends ApiError {
  constructor(
    message: string = 'Unprocessable entity',
    details: ErrorDetails | null = null
  ) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, true, details, ERROR_CODES.UNPROCESSABLE_ENTITY_ERROR);
  }

  static isUnprocessableEntityError(error: unknown): error is UnprocessableEntityError {
    return error instanceof UnprocessableEntityError;
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 * Used when rate limits are exceeded
 */
export class RateLimitError extends ApiError {
  public readonly retryAfter: number | null;

  constructor(
    message: string = 'Too many requests',
    retryAfter: number | null = null
  ) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, true, { retryAfter }, ERROR_CODES.RATE_LIMIT_ERROR);
    this.retryAfter = retryAfter;
  }

  static isRateLimitError(error: unknown): error is RateLimitError {
    return error instanceof RateLimitError;
  }
}

/**
 * Database error - 500 Internal Server Error
 * Used for database-specific errors (connection, constraints, etc.)
 */
export class DatabaseError extends ApiError {
  public readonly originalError: Error | null;
  public readonly operation: string | null;

  constructor(
    message: string = 'Database error occurred',
    originalError: Error | null = null,
    operation: string | null = null
  ) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, { operation }, ERROR_CODES.DATABASE_ERROR);
    this.originalError = originalError;
    this.operation = operation;
  }

  static isDatabaseError(error: unknown): error is DatabaseError {
    return error instanceof DatabaseError;
  }
}

/**
 * External service error - 502 Bad Gateway
 * Used when external service calls fail
 */
export class ExternalServiceError extends ApiError {
  public readonly service: string | null;
  public readonly originalError: Error | null;

  constructor(
    message: string = 'External service error',
    service: string | null = null,
    originalError: Error | null = null
  ) {
    super(message, HTTP_STATUS.BAD_GATEWAY, true, { service }, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    this.service = service;
    this.originalError = originalError;
  }

  static isExternalServiceError(error: unknown): error is ExternalServiceError {
    return error instanceof ExternalServiceError;
  }
}

/**
 * File processing error - 500 Internal Server Error
 * Used for file upload, processing, and storage errors
 */
export class FileProcessingError extends ApiError {
  public readonly filename: string | null;
  public readonly operation: string | null;

  constructor(
    message: string = 'File processing failed',
    filename: string | null = null,
    operation: string | null = null
  ) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, true, { filename, operation }, ERROR_CODES.FILE_PROCESSING_ERROR);
    this.filename = filename;
    this.operation = operation;
  }

  static isFileProcessingError(error: unknown): error is FileProcessingError {
    return error instanceof FileProcessingError;
  }
}

/**
 * Business logic error - 400 Bad Request
 * Used for domain-specific business rule violations
 */
export class BusinessLogicError extends ApiError {
  public readonly rule: string | null;
  public readonly context: unknown;

  constructor(
    message: string,
    rule: string | null = null,
    context: unknown = null
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, { rule, context }, ERROR_CODES.BUSINESS_LOGIC_ERROR);
    this.rule = rule;
    this.context = context;
  }

  static isBusinessLogicError(error: unknown): error is BusinessLogicError {
    return error instanceof BusinessLogicError;
  }
}

/**
 * Timeout error - 408 Request Timeout
 * Used when operations exceed time limits
 */
export class TimeoutError extends ApiError {
  public readonly operation: string | null;
  public readonly timeout: number | null;

  constructor(
    message: string = 'Request timeout',
    operation: string | null = null,
    timeout: number | null = null
  ) {
    super(message, HTTP_STATUS.REQUEST_TIMEOUT, true, { operation, timeout }, ERROR_CODES.TIMEOUT_ERROR);
    this.operation = operation;
    this.timeout = timeout;
  }

  static isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError;
  }
}

/**
 * Configuration error - 500 Internal Server Error
 * Used when configuration is invalid or missing
 */
export class ConfigurationError extends ApiError {
  public readonly configKey: string | null;

  constructor(
    message: string = 'Configuration error',
    configKey: string | null = null
  ) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, { configKey }, ERROR_CODES.CONFIGURATION_ERROR);
    this.configKey = configKey;
  }

  static isConfigurationError(error: unknown): error is ConfigurationError {
    return error instanceof ConfigurationError;
  }
}

/**
 * Database error interface for PostgreSQL-specific errors
 */
interface DatabaseException extends Error {
  code?: string;
  constraint?: string;
  column?: string;
  detail?: string;
}

/**
 * Joi validation error interface
 */
interface JoiValidationError {
  details: Array<{
    message: string;
    path?: (string | number)[];
    context?: {
      value?: unknown;
      [key: string]: unknown;
    };
  }>;
}

/**
 * Express Request interface (simplified)
 */
interface ExpressRequest {
  method?: string;
  url?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  ip?: string;
  user?: {
    id?: number;
    organization_id?: number;
  };
  get?(header: string): string | undefined;
}

/**
 * Error factory functions for common scenarios with comprehensive typing
 */
export class ErrorFactory {
  /**
   * Create validation error from Joi validation result
   */
  static fromJoiError(joiError: JoiValidationError, message: string = 'Validation failed'): ValidationError {
    const validationErrors: ValidationErrorDetail[] = joiError.details.map(detail => ({
      field: detail.path ? detail.path.join('.') : 'unknown',
      message: detail.message,
      value: detail.context?.value
    }));

    return new ValidationError(message, null, validationErrors);
  }

  /**
   * Create database error from database exception with comprehensive error mapping
   */
  static fromDatabaseError(error: DatabaseException, operation?: string): ApiError {
    let message = 'Database operation failed';

    // Handle specific database error types
    if (error.code) {
      switch (error.code) {
      case '23505': // Unique violation
        message = 'Duplicate entry detected';
        return new ConflictError(message, { constraint: error.constraint });
        
      case '23503': // Foreign key violation
        message = 'Referenced record not found';
        return new ValidationError(message, { constraint: error.constraint });
        
      case '23502': // Not null violation
        message = 'Required field missing';
        return new ValidationError(message, { column: error.column });
        
      case '23514': // Check constraint violation
        message = 'Data validation failed';
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
  static notFound(resource: string, identifier?: string | null): NotFoundError {
    return new NotFoundError(resource, identifier || null);
  }

  /**
   * Create unauthorized error
   */
  static unauthorized(message: string = 'Authentication required'): AuthenticationError {
    return new AuthenticationError(message);
  }

  /**
   * Create forbidden error
   */
  static forbidden(message: string = 'Access denied'): AuthorizationError {
    return new AuthorizationError(message);
  }

  /**
   * Create conflict error
   */
  static conflict(
    message: string,
    details: ConflictDetails | null = null,
    conflictType: string | null = null
  ): ConflictError {
    return new ConflictError(message, details, conflictType);
  }

  /**
   * Create business logic error
   */
  static businessLogic(
    message: string,
    rule: string | null = null,
    context: unknown = null
  ): BusinessLogicError {
    return new BusinessLogicError(message, rule, context);
  }

  /**
   * Create referee level validation error
   */
  static invalidRefereeLevel(level: string): ValidationError {
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
  static refereeRoleError(
    message: string,
    operation: string | null = null,
    roleData: unknown = null
  ): BusinessLogicError {
    return new BusinessLogicError(
      message,
      'REFEREE_ROLE_OPERATION',
      { operation, roleData }
    );
  }

  /**
   * Create white whistle logic error
   */
  static whiteWhistleError(level: string, flag: boolean, reason: string): BusinessLogicError {
    return new BusinessLogicError(
      `White whistle configuration invalid for ${level} level: ${reason}`,
      'WHITE_WHISTLE_LOGIC',
      { level, flag, reason }
    );
  }

  /**
   * Create rate limit error with retry after
   */
  static rateLimitExceeded(retryAfter?: number): RateLimitError {
    return new RateLimitError('Rate limit exceeded', retryAfter || null);
  }

  /**
   * Create timeout error for operation
   */
  static operationTimeout(operation: string, timeout?: number): TimeoutError {
    return new TimeoutError(`Operation '${operation}' timed out`, operation, timeout || null);
  }

  /**
   * Create external service error
   */
  static externalServiceFailure(
    service: string,
    message: string = 'External service unavailable',
    originalError?: Error
  ): ExternalServiceError {
    return new ExternalServiceError(message, service, originalError || null);
  }

  /**
   * Create file processing error
   */
  static fileProcessingFailure(
    filename: string,
    operation: string,
    message: string = 'File processing failed'
  ): FileProcessingError {
    return new FileProcessingError(message, filename, operation);
  }

  /**
   * Create configuration error
   */
  static configurationMissing(configKey: string): ConfigurationError {
    return new ConfigurationError(`Missing configuration: ${configKey}`, configKey);
  }
}

/**
 * Comprehensive utility functions for error handling with full typing
 */
export class ErrorUtils {
  /**
   * Type guard to check if error is operational (safe to expose to client)
   */
  static isOperational(error: unknown): error is ApiError {
    return error instanceof ApiError && error.isOperational;
  }

  /**
   * Type guard to check if error is a system error (should not be exposed)
   */
  static isSystemError(error: unknown): error is ApiError {
    return error instanceof ApiError && !error.isOperational;
  }

  /**
   * Extract comprehensive error details for logging
   */
  static getErrorContext(error: Error, req?: ExpressRequest | null): ErrorContext {
    const context: ErrorContext = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    if (ApiError.isApiError(error)) {
      context.statusCode = error.statusCode;
      context.code = error.code || undefined;
      context.details = error.details || undefined;
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
        userAgent: req.get?.('User-Agent'),
        userId: req.user?.id,
        organizationId: req.user?.organization_id
      };
    }

    return context;
  }

  /**
   * Sanitize error for client response with comprehensive filtering
   */
  static sanitizeForClient(error: Error): ClientErrorResponse {
    if (ApiError.isApiError(error) && error.isOperational) {
      const response: ClientErrorResponse = {
        message: error.message,
        code: error.code || undefined,
        details: error.details || undefined
      };

      if (ValidationError.isValidationError(error)) {
        response.validationErrors = error.validationErrors || undefined;
      }

      return response;
    }

    // For non-operational errors, return generic message
    return {
      message: 'An unexpected error occurred',
      code: ERROR_CODES.CONFIGURATION_ERROR
    };
  }

  /**
   * Generate unique error ID for tracking and correlation
   */
  static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format error for structured logging
   */
  static formatErrorForLog(error: Error, errorId?: string): Record<string, unknown> {
    const logEntry: Record<string, unknown> = {
      errorId: errorId || this.generateErrorId(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    if (ApiError.isApiError(error)) {
      logEntry.statusCode = error.statusCode;
      logEntry.code = error.code;
      logEntry.details = error.details;
      logEntry.isOperational = error.isOperational;
    }

    return logEntry;
  }

  /**
   * Determine error severity level for logging
   */
  static getErrorSeverity(error: Error): 'error' | 'warn' | 'info' {
    if (ApiError.isApiError(error)) {
      if (!error.isOperational) {return 'error';}
      if (error.statusCode >= 500) {return 'error';}
      if (error.statusCode >= 400) {return 'warn';}
      return 'info';
    }
    return 'error';
  }

  /**
   * Check if error should trigger monitoring alerts
   */
  static shouldAlert(error: Error): boolean {
    if (!ApiError.isApiError(error)) {return true;}
    return !error.isOperational || error.statusCode >= 500;
  }

  /**
   * Create error summary for monitoring dashboards
   */
  static createErrorSummary(error: Error): Record<string, unknown> {
    return {
      type: error.constructor.name,
      message: error.message,
      statusCode: ApiError.isApiError(error) ? error.statusCode : 500,
      code: ApiError.isApiError(error) ? error.code : 'UNKNOWN_ERROR',
      isOperational: ApiError.isApiError(error) ? error.isOperational : false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Convert error to metrics tags for monitoring
   */
  static toMetricsTags(error: Error): Record<string, string> {
    const tags: Record<string, string> = {
      error_type: error.constructor.name,
      error_name: error.name
    };

    if (ApiError.isApiError(error)) {
      tags.status_code = error.statusCode.toString();
      tags.error_code = error.code || 'UNKNOWN';
      tags.operational = error.isOperational.toString();
    }

    return tags;
  }
}

// Export all error types for easy importing
export const Errors = {
  ApiError,
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
  ConfigurationError
} as const;

// Type for all error classes
export type ErrorClass = typeof Errors[keyof typeof Errors];

// Export legacy compatible object for CommonJS compatibility
export const errorClasses = {
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

// Default export for backward compatibility
export default errorClasses;