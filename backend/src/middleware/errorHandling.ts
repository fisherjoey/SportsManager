/**
 * @fileoverview Enhanced error handling and logging middleware with TypeScript
 * @description Provides comprehensive error handling with proper typing, security-conscious
 * error message formatting, audit logging integration, and Express middleware compatibility.
 * Prevents information leakage while maintaining debugging capabilities.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { createAuditLog, AUDIT_EVENTS, AUDIT_SEVERITY } from './auditTrail';

/**
 * Error types for categorization and handling
 */
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'validation_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  AUTHORIZATION_ERROR: 'authorization_error',
  NOT_FOUND_ERROR: 'not_found_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  DATABASE_ERROR: 'database_error',
  INTERNAL_ERROR: 'internal_error',
  EXTERNAL_SERVICE_ERROR: 'external_service_error'
} as const;

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

/**
 * Error severity levels for logging and alerting
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ERROR_SEVERITY[keyof typeof ERROR_SEVERITY];

/**
 * Database-specific error details
 */
export interface DatabaseErrorDetails {
  code?: string;
  detail?: string;
  constraint?: string;
  column?: string;
  table?: string;
  schema?: string;
}

/**
 * Validation error details
 */
export interface ValidationErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Error response structure for API clients
 */
export interface ErrorResponse {
  error: string;
  type?: ErrorType;
  timestamp: string;
  path: string;
  method: string;
  details?: ValidationErrorDetails | Record<string, any>;
  stack?: string;
  originalError?: string;
}

/**
 * Error logging data structure
 */
export interface ErrorLogData {
  timestamp: string;
  severity: ErrorSeverity;
  type: ErrorType | 'unknown';
  message: string;
  statusCode: number;
  path: string;
  method: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  userEmail?: string;
  stack?: string;
  originalError?: Error;
}

/**
 * Application Error base class for structured error handling
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public originalError?: Error;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ERROR_TYPES.INTERNAL_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
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
export class DatabaseError extends AppError {
  public readonly dbDetails: DatabaseErrorDetails;

  constructor(message: string, originalError?: Error & DatabaseErrorDetails) {
    super(message, 500, ERROR_TYPES.DATABASE_ERROR);
    
    this.originalError = originalError;
    this.dbDetails = originalError ? {
      code: originalError.code,
      detail: originalError.detail,
      constraint: originalError.constraint,
      column: originalError.column,
      table: originalError.table,
      schema: originalError.schema
    } : {};
  }
}

/**
 * Validation Error class for input validation errors
 */
export class ValidationError extends AppError {
  public readonly details: ValidationErrorDetails | null;

  constructor(message: string, details: ValidationErrorDetails | null = null) {
    super(message, 400, ERROR_TYPES.VALIDATION_ERROR);
    this.details = details;
  }
}

/**
 * Authentication Error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, ERROR_TYPES.AUTHENTICATION_ERROR);
  }
}

/**
 * Authorization Error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, ERROR_TYPES.AUTHORIZATION_ERROR);
  }
}

/**
 * Not Found Error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, ERROR_TYPES.NOT_FOUND_ERROR);
  }
}

/**
 * Rate Limit Error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, ERROR_TYPES.RATE_LIMIT_ERROR);
  }
}

/**
 * External Service Error class
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(message: string, service: string, statusCode: number = 502) {
    super(message, statusCode, ERROR_TYPES.EXTERNAL_SERVICE_ERROR);
    this.service = service;
  }
}

/**
 * Type guard to check if error is an AppError instance
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is a database error
 */
export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Type guard to check if error is a validation error
 */
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Determine error severity based on error details and request context
 */
export function determineErrorSeverity(
  error: AppError | Error,
  req: Request | AuthenticatedRequest
): ErrorSeverity {
  const appError = isAppError(error) ? error : null;
  
  // Critical: Authentication bypass attempts, security violations
  if (appError?.type === ERROR_TYPES.AUTHENTICATION_ERROR && 
      req.path.includes('/admin')) {
    return ERROR_SEVERITY.CRITICAL;
  }
  
  // High: Database errors, internal server errors, security issues
  if (appError?.type === ERROR_TYPES.DATABASE_ERROR || 
      (appError?.statusCode && appError.statusCode >= 500) ||
      appError?.type === ERROR_TYPES.AUTHORIZATION_ERROR) {
    return ERROR_SEVERITY.HIGH;
  }
  
  // Medium: Client errors, validation errors
  if (appError?.statusCode && 
      appError.statusCode >= 400 && 
      appError.statusCode < 500) {
    return ERROR_SEVERITY.MEDIUM;
  }
  
  return ERROR_SEVERITY.LOW;
}

/**
 * Sanitize error for client response - prevents information leakage
 */
export function sanitizeError(
  error: AppError | Error,
  req: Request | AuthenticatedRequest
): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  const appError = isAppError(error) ? error : null;
  
  // Base error response
  const errorResponse: ErrorResponse = {
    error: 'An error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };
  
  // For operational errors, we can safely expose the message
  if (appError?.isOperational) {
    errorResponse.error = appError.message;
    errorResponse.type = appError.type;
    
    // Include validation details for validation errors
    if (isValidationError(appError) && appError.details) {
      errorResponse.details = appError.details;
    }
  }
  
  // In development/test, include more debugging information
  if (isDevelopment || isTest) {
    errorResponse.stack = error.stack;
    if (appError?.originalError) {
      errorResponse.originalError = appError.originalError.message;
    }
  }
  
  // Specific error message customization for security
  if (appError) {
    switch (appError.type) {
      case ERROR_TYPES.AUTHENTICATION_ERROR:
        // Keep the original message for authentication errors (e.g., "Invalid credentials")
        // Only override with generic message if it's not a specific error
        if (appError.message === 'Authentication required' || !appError.message) {
          errorResponse.error = 'Authentication required';
        }
        // Otherwise keep the specific error message (like "Invalid credentials")
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
        if (!appError.isOperational) {
          errorResponse.error = 'Internal server error';
        }
    }
  }
  
  return errorResponse;
}

/**
 * Log error details for debugging and monitoring
 */
export async function logError(
  error: AppError | Error,
  req: Request | AuthenticatedRequest,
  res: Response
): Promise<void> {
  const appError = isAppError(error) ? error : null;
  const severity = determineErrorSeverity(error, req);
  const authReq = req as AuthenticatedRequest;
  
  const clientIP = req.headers['x-forwarded-for'] as string || 
                  req.headers['x-real-ip'] as string || 
                  req.connection?.remoteAddress || 
                  req.ip || 
                  'unknown';
  
  // Console logging with severity-based formatting
  const logData: ErrorLogData = {
    timestamp: new Date().toISOString(),
    severity,
    type: appError?.type || 'unknown',
    message: error.message,
    statusCode: appError?.statusCode || 500,
    path: req.path,
    method: req.method,
    ip: clientIP,
    userAgent: req.headers['user-agent'],
    userId: authReq.user?.id || undefined,
    userEmail: authReq.user?.email || undefined,
    stack: error.stack
  };
  
  if (appError?.originalError) {
    logData.originalError = appError.originalError;
  }
  
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
      event_type: getAuditEventType(appError),
      user_id: authReq.user?.id || null,
      user_email: authReq.user?.email || null,
      ip_address: clientIP,
      user_agent: req.headers['user-agent'] as string,
      request_path: req.path,
      request_method: req.method,
      success: false,
      severity,
      error_message: error.message,
      additional_data: {
        error_type: appError?.type,
        status_code: appError?.statusCode || 500,
        is_operational: appError?.isOperational || false,
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
function getAuditEventType(error: AppError | null): string {
  if (!error) {
    return AUDIT_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY;
  }
  
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
export function sanitizeBodyForLogging(body: any): any {
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
 * Handle different types of database errors with proper typing
 */
export function handleDatabaseError(error: Error & Partial<DatabaseErrorDetails>): AppError {
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
      return new DatabaseError('Database table not found', error);
    case '42703': // Undefined column
      return new DatabaseError('Database column not found', error);
    default:
      return new DatabaseError('Database operation failed', error);
  }
}

/**
 * Main error handling middleware with comprehensive typing
 */
export const errorHandler: ErrorRequestHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }
  
  let processedError: AppError = error;
  
  // Convert known error types
  if (error.name === 'ValidationError' && !isAppError(error)) {
    processedError = new ValidationError(error.message, error.details);
  } else if (error.code && (error.code.startsWith('23') || error.code.startsWith('42'))) {
    processedError = handleDatabaseError(error);
  } else if (error.name === 'JsonWebTokenError') {
    processedError = new AuthenticationError('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    processedError = new AuthenticationError('Token expired');
  } else if (error.name === 'CastError') {
    processedError = new ValidationError('Invalid ID format');
  } else if (!isAppError(error)) {
    // Log the actual error before wrapping
    console.error('ACTUAL ERROR BEFORE WRAPPING:', error);
    console.error('Error stack:', error.stack);
    // Wrap unexpected errors
    processedError = new AppError('Internal server error', 500, ERROR_TYPES.INTERNAL_ERROR, false);
    processedError.originalError = error;
  }
  
  // Log the error
  logError(processedError, req, res).catch(logErr => {
    console.error('Failed to log error:', logErr);
  });
  
  // Sanitize error for client response
  const sanitizedError = sanitizeError(processedError, req);
  
  // Send error response
  res.status(processedError.statusCode || 500).json(sanitizedError);
};

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError('Route');
  next(error);
}

/**
 * Async error wrapper for route handlers with proper typing
 */
export function asyncHandler<T = any>(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  }
}

/**
 * Generic async handler for regular requests
 */
export function asyncHandlerGeneric<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }
}

/**
 * Validation error helper with proper typing
 */
export function createValidationError(
  message: string,
  details: ValidationErrorDetails | null = null
): ValidationError {
  return new ValidationError(message, details);
}

/**
 * Database operation wrapper with error handling and typing
 */
export async function withDatabaseError<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw handleDatabaseError(error as Error & Partial<DatabaseErrorDetails>);
  }
}

/**
 * Performance monitoring wrapper for async operations
 */
export async function withPerformanceMonitoring<T>(
  operationName: string,
  operation: () => Promise<T>,
  req?: Request
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (duration > 1000) { // Log slow operations (>1s)
      console.warn(`Slow operation detected: ${operationName} took ${duration}ms`, {
        path: req?.path,
        method: req?.method,
        duration
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Operation failed: ${operationName} after ${duration}ms`, {
      path: req?.path,
      method: req?.method,
      duration,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Note: Error classes are already exported via their class declarations above