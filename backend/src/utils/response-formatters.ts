/**
 * @fileoverview Standardized API response formatting utilities
 * @description This module provides consistent response formatting across all API endpoints.
 * It ensures uniform structure for success responses, error responses, and paginated results.
 */

import { Response } from 'express';

/**
 * HTTP status codes commonly used in the application
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Base structure for all API responses
 */
interface BaseResponse {
  success: boolean;
  timestamp: string;
}

/**
 * Structure for successful responses
 */
interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data?: T;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Structure for error responses
 */
interface ErrorResponse extends BaseResponse {
  success: false;
  message: string;
  details?: any;
  code?: string;
  errors?: ValidationError[];
}

/**
 * Structure for paginated responses
 */
interface PaginatedResponse<T = any> extends BaseResponse {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

/**
 * Structure for created resource responses
 */
interface CreatedResponse<T = any> extends SuccessResponse<T> {
  location?: string;
}

/**
 * Pagination metadata structure
 */
interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Input pagination data structure
 */
interface PaginationInput {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * Validation error structure
 */
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Joi validation error structure
 */
interface JoiValidationError {
  path?: string[] | null;
  message: string;
  context?: {
    value?: any;
    [key: string]: any;
  };
}

/**
 * Express middleware function type
 */
type AsyncRouteHandler = (req: any, res: Response, next: any) => Promise<void> | void;

/**
 * ResponseFormatter class containing static methods for standardized responses
 */
export class ResponseFormatter {
  /**
   * Format a successful response
   * @param data - The response data
   * @param message - Optional success message
   * @param meta - Optional metadata
   * @returns Formatted success response
   * @example
   * const response = ResponseFormatter.success(user, 'User created successfully');
   */
  static success<T>(data?: T | null, message?: string, meta?: Record<string, any>): SuccessResponse<T> {
    const response: SuccessResponse<T> = {
      success: true,
      timestamp: new Date().toISOString()
    };

    if (data !== null && data !== undefined) {
      response.data = data;
    }

    if (message) {
      response.message = message;
    }

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Format an error response
   * @param message - Error message
   * @param details - Additional error details
   * @param code - Error code for client handling
   * @param errors - Array of validation errors
   * @returns Formatted error response
   * @example
   * const response = ResponseFormatter.error(
   *   'Validation failed',
   *   { field: 'email', issue: 'Invalid format' },
   *   'VALIDATION_ERROR'
   * );
   */
  static error(
    message: string,
    details?: any,
    code?: string,
    errors?: ValidationError[]
  ): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (details !== null && details !== undefined) {
      response.details = details;
    }

    if (code) {
      response.code = code;
    }

    if (errors && Array.isArray(errors)) {
      response.errors = errors;
    }

    return response;
  }

  /**
   * Format a paginated response
   * @param data - Array of data items
   * @param pagination - Pagination metadata
   * @param message - Optional message
   * @returns Formatted paginated response
   * @example
   * const response = ResponseFormatter.paginated(
   *   games,
   *   { page: 1, limit: 10, totalCount: 100, totalPages: 10 }
   * );
   */
  static paginated<T>(
    data: T[],
    pagination: PaginationInput,
    message?: string
  ): PaginatedResponse<T> {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 50,
        totalCount: pagination.totalCount || 0,
        totalPages: pagination.totalPages || 0,
        hasNextPage: pagination.hasNextPage || false,
        hasPrevPage: pagination.hasPrevPage || false
      },
      timestamp: new Date().toISOString()
    };

    if (message) {
      response.message = message;
    }

    return response;
  }

  /**
   * Format a response for created resources
   * @param data - The created resource data
   * @param message - Success message
   * @param location - Resource location/URL
   * @returns Formatted creation response
   * @example
   * const response = ResponseFormatter.created(
   *   newGame,
   *   'Game created successfully',
   *   '/api/games/123'
   * );
   */
  static created<T>(
    data: T,
    message: string = 'Resource created successfully',
    location?: string
  ): CreatedResponse<T> {
    const response = this.success(data, message) as CreatedResponse<T>;

    if (location) {
      response.location = location;
    }

    return response;
  }

  /**
   * Format a response for updated resources
   * @param data - The updated resource data
   * @param message - Success message
   * @returns Formatted update response
   * @example
   * const response = ResponseFormatter.updated(
   *   updatedUser,
   *   'User updated successfully'
   * );
   */
  static updated<T>(data: T, message: string = 'Resource updated successfully'): SuccessResponse<T> {
    return this.success(data, message);
  }

  /**
   * Format a response for deleted resources
   * @param message - Success message
   * @param data - Optional data about the deleted resource
   * @returns Formatted deletion response
   * @example
   * const response = ResponseFormatter.deleted('Game deleted successfully');
   */
  static deleted<T>(message: string = 'Resource deleted successfully', data?: T): SuccessResponse<T> {
    return this.success(data, message);
  }

  /**
   * Format a validation error response
   * @param validationErrors - Joi validation errors or custom errors
   * @param message - Overall error message
   * @returns Formatted validation error response
   * @example
   * const response = ResponseFormatter.validationError(
   *   joiError.details,
   *   'Request validation failed'
   * );
   */
  static validationError(
    validationErrors: JoiValidationError[] | Record<string, string>,
    message: string = 'Validation failed'
  ): ErrorResponse {
    let formattedErrors: ValidationError[] = [];

    if (Array.isArray(validationErrors)) {
      // Handle Joi validation errors
      formattedErrors = validationErrors.map(error => ({
        field: error.path ? error.path.join('.') : 'unknown',
        message: error.message,
        value: error.context ? error.context.value : undefined
      }));
    } else if (validationErrors && typeof validationErrors === 'object') {
      // Handle custom validation errors
      formattedErrors = Object.entries(validationErrors).map(([field, msg]) => ({
        field,
        message: msg
      }));
    }

    return this.error(message, null, 'VALIDATION_ERROR', formattedErrors);
  }

  /**
   * Format a not found error response
   * @param resource - The resource that wasn't found
   * @param identifier - The identifier used to search
   * @returns Formatted not found response
   * @example
   * const response = ResponseFormatter.notFound('Game', '123');
   */
  static notFound(resource: string = 'Resource', identifier?: string): ErrorResponse {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    return this.error(message, null, 'NOT_FOUND');
  }

  /**
   * Format an unauthorized error response
   * @param message - Error message
   * @returns Formatted unauthorized response
   * @example
   * const response = ResponseFormatter.unauthorized('Invalid credentials');
   */
  static unauthorized(message: string = 'Authentication required'): ErrorResponse {
    return this.error(message, null, 'UNAUTHORIZED');
  }

  /**
   * Format a forbidden error response
   * @param message - Error message
   * @returns Formatted forbidden response
   * @example
   * const response = ResponseFormatter.forbidden('Insufficient permissions');
   */
  static forbidden(message: string = 'Access denied'): ErrorResponse {
    return this.error(message, null, 'FORBIDDEN');
  }

  /**
   * Format a conflict error response
   * @param message - Error message
   * @param details - Conflict details
   * @returns Formatted conflict response
   * @example
   * const response = ResponseFormatter.conflict(
   *   'Email already exists',
   *   { email: 'user@example.com' }
   * );
   */
  static conflict(message: string, details?: any): ErrorResponse {
    return this.error(message, details, 'CONFLICT');
  }

  /**
   * Format an internal server error response
   * @param message - Error message
   * @param details - Error details (should be sanitized for production)
   * @returns Formatted server error response
   * @example
   * const response = ResponseFormatter.serverError('Database connection failed');
   */
  static serverError(message: string = 'Internal server error', details?: any): ErrorResponse {
    // In production, don't expose detailed error information
    const isProduction = process.env.NODE_ENV === 'production';

    return this.error(
      message,
      isProduction ? null : details,
      'INTERNAL_SERVER_ERROR'
    );
  }

  /**
   * Send a formatted response using Express response object
   * @param res - Express response object
   * @param statusCode - HTTP status code
   * @param responseData - Formatted response data
   * @example
   * ResponseFormatter.send(res, 200, ResponseFormatter.success(data));
   */
  static send(res: Response, statusCode: number, responseData: BaseResponse): Response {
    return res.status(statusCode).json(responseData);
  }

  /**
   * Send a success response
   * @param res - Express response object
   * @param data - Response data
   * @param message - Success message
   * @param statusCode - HTTP status code (default: 200)
   * @example
   * ResponseFormatter.sendSuccess(res, user, 'User retrieved successfully');
   */
  static sendSuccess<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    return this.send(res, statusCode, this.success(data, message));
  }

  /**
   * Send a created response
   * @param res - Express response object
   * @param data - Created resource data
   * @param message - Success message
   * @param location - Resource location
   * @example
   * ResponseFormatter.sendCreated(res, newGame, 'Game created', '/api/games/123');
   */
  static sendCreated<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully',
    location?: string
  ): Response {
    return this.send(res, HTTP_STATUS.CREATED, this.created(data, message, location));
  }

  /**
   * Send a paginated response
   * @param res - Express response object
   * @param data - Data array
   * @param pagination - Pagination metadata
   * @param message - Optional message
   * @example
   * ResponseFormatter.sendPaginated(res, games, paginationData);
   */
  static sendPaginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationInput,
    message?: string
  ): Response {
    return this.send(res, HTTP_STATUS.OK, this.paginated(data, pagination, message));
  }

  /**
   * Send a validation error response
   * @param res - Express response object
   * @param validationErrors - Validation errors
   * @param message - Error message
   * @example
   * ResponseFormatter.sendValidationError(res, joiError.details);
   */
  static sendValidationError(
    res: Response,
    validationErrors: JoiValidationError[] | Record<string, string>,
    message: string = 'Validation failed'
  ): Response {
    return this.send(
      res,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      this.validationError(validationErrors, message)
    );
  }

  /**
   * Send a not found error response
   * @param res - Express response object
   * @param resource - Resource name
   * @param identifier - Resource identifier
   * @example
   * ResponseFormatter.sendNotFound(res, 'Game', '123');
   */
  static sendNotFound(res: Response, resource: string = 'Resource', identifier?: string): Response {
    return this.send(res, HTTP_STATUS.NOT_FOUND, this.notFound(resource, identifier));
  }

  /**
   * Send an unauthorized error response
   * @param res - Express response object
   * @param message - Error message
   * @example
   * ResponseFormatter.sendUnauthorized(res, 'Invalid token');
   */
  static sendUnauthorized(res: Response, message: string = 'Authentication required'): Response {
    return this.send(res, HTTP_STATUS.UNAUTHORIZED, this.unauthorized(message));
  }

  /**
   * Send a forbidden error response
   * @param res - Express response object
   * @param message - Error message
   * @example
   * ResponseFormatter.sendForbidden(res, 'Admin access required');
   */
  static sendForbidden(res: Response, message: string = 'Access denied'): Response {
    return this.send(res, HTTP_STATUS.FORBIDDEN, this.forbidden(message));
  }

  /**
   * Send a server error response
   * @param res - Express response object
   * @param message - Error message
   * @param details - Error details
   * @example
   * ResponseFormatter.sendServerError(res, 'Database error', error.message);
   */
  static sendServerError(res: Response, message: string = 'Internal server error', details?: any): Response {
    return this.send(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      this.serverError(message, details)
    );
  }
}

/**
 * Helper middleware to wrap async route handlers and format responses
 * @param handler - Async route handler function
 * @returns Express middleware function
 * @example
 * router.get('/games', ResponseFormatter.asyncHandler(async (req, res) => {
 *   const games = await db('games').select();
 *   return ResponseFormatter.sendSuccess(res, games);
 * }));
 */
export const asyncHandler = (handler: AsyncRouteHandler) => {
  return async (req: any, res: Response, next: any) => {
    try {
      await handler(req, res, next);
    } catch (error: any) {
      console.error('Route handler error:', error);

      // Check if response was already sent
      if (res.headersSent) {
        return next(error);
      }

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return ResponseFormatter.sendValidationError(res, error.details);
      }

      if (error.message && error.message.includes('not found')) {
        return ResponseFormatter.sendNotFound(res);
      }

      // Default to server error
      return ResponseFormatter.sendServerError(
        res,
        'An unexpected error occurred',
        error.message
      );
    }
  };
};

// Export types for external use
export type {
  BaseResponse,
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  CreatedResponse,
  PaginationMeta,
  PaginationInput,
  ValidationError,
  JoiValidationError,
  AsyncRouteHandler
};