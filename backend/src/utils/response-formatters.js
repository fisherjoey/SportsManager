/**
 * @fileoverview Standardized API response formatting utilities
 * @description This module provides consistent response formatting across all API endpoints.
 * It ensures uniform structure for success responses, error responses, and paginated results.
 */

/**
 * HTTP status codes commonly used in the application
 */
const HTTP_STATUS = {
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
};

/**
 * ResponseFormatter class containing static methods for standardized responses
 */
class ResponseFormatter {
  /**
   * Format a successful response
   * @param {*} data - The response data
   * @param {string} message - Optional success message
   * @param {Object} meta - Optional metadata
   * @returns {Object} Formatted success response
   * @example
   * const response = ResponseFormatter.success(user, 'User created successfully');
   */
  static success(data = null, message = null, meta = null) {
    const response = {
      success: true,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
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
   * @param {string} message - Error message
   * @param {*} details - Additional error details
   * @param {string} code - Error code for client handling
   * @param {Array} errors - Array of validation errors
   * @returns {Object} Formatted error response
   * @example
   * const response = ResponseFormatter.error(
   *   'Validation failed',
   *   { field: 'email', issue: 'Invalid format' },
   *   'VALIDATION_ERROR'
   * );
   */
  static error(message, details = null, code = null, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (details !== null) {
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
   * @param {Array} data - Array of data items
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Optional message
   * @returns {Object} Formatted paginated response
   * @example
   * const response = ResponseFormatter.paginated(
   *   games,
   *   { page: 1, limit: 10, totalCount: 100, totalPages: 10 }
   * );
   */
  static paginated(data, pagination, message = null) {
    const response = {
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
   * @param {*} data - The created resource data
   * @param {string} message - Success message
   * @param {string} location - Resource location/URL
   * @returns {Object} Formatted creation response
   * @example
   * const response = ResponseFormatter.created(
   *   newGame,
   *   'Game created successfully',
   *   '/api/games/123'
   * );
   */
  static created(data, message = 'Resource created successfully', location = null) {
    const response = this.success(data, message);
    
    if (location) {
      response.location = location;
    }

    return response;
  }

  /**
   * Format a response for updated resources
   * @param {*} data - The updated resource data
   * @param {string} message - Success message
   * @returns {Object} Formatted update response
   * @example
   * const response = ResponseFormatter.updated(
   *   updatedUser,
   *   'User updated successfully'
   * );
   */
  static updated(data, message = 'Resource updated successfully') {
    return this.success(data, message);
  }

  /**
   * Format a response for deleted resources
   * @param {string} message - Success message
   * @param {*} data - Optional data about the deleted resource
   * @returns {Object} Formatted deletion response
   * @example
   * const response = ResponseFormatter.deleted('Game deleted successfully');
   */
  static deleted(message = 'Resource deleted successfully', data = null) {
    return this.success(data, message);
  }

  /**
   * Format a validation error response
   * @param {Array|Object} validationErrors - Joi validation errors or custom errors
   * @param {string} message - Overall error message
   * @returns {Object} Formatted validation error response
   * @example
   * const response = ResponseFormatter.validationError(
   *   joiError.details,
   *   'Request validation failed'
   * );
   */
  static validationError(validationErrors, message = 'Validation failed') {
    let formattedErrors = [];

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
   * @param {string} resource - The resource that wasn't found
   * @param {string} identifier - The identifier used to search
   * @returns {Object} Formatted not found response
   * @example
   * const response = ResponseFormatter.notFound('Game', '123');
   */
  static notFound(resource = 'Resource', identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    return this.error(message, null, 'NOT_FOUND');
  }

  /**
   * Format an unauthorized error response
   * @param {string} message - Error message
   * @returns {Object} Formatted unauthorized response
   * @example
   * const response = ResponseFormatter.unauthorized('Invalid credentials');
   */
  static unauthorized(message = 'Authentication required') {
    return this.error(message, null, 'UNAUTHORIZED');
  }

  /**
   * Format a forbidden error response
   * @param {string} message - Error message
   * @returns {Object} Formatted forbidden response
   * @example
   * const response = ResponseFormatter.forbidden('Insufficient permissions');
   */
  static forbidden(message = 'Access denied') {
    return this.error(message, null, 'FORBIDDEN');
  }

  /**
   * Format a conflict error response
   * @param {string} message - Error message
   * @param {*} details - Conflict details
   * @returns {Object} Formatted conflict response
   * @example
   * const response = ResponseFormatter.conflict(
   *   'Email already exists',
   *   { email: 'user@example.com' }
   * );
   */
  static conflict(message, details = null) {
    return this.error(message, details, 'CONFLICT');
  }

  /**
   * Format an internal server error response
   * @param {string} message - Error message
   * @param {*} details - Error details (should be sanitized for production)
   * @returns {Object} Formatted server error response
   * @example
   * const response = ResponseFormatter.serverError('Database connection failed');
   */
  static serverError(message = 'Internal server error', details = null) {
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
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {Object} responseData - Formatted response data
   * @example
   * ResponseFormatter.send(res, 200, ResponseFormatter.success(data));
   */
  static send(res, statusCode, responseData) {
    return res.status(statusCode).json(responseData);
  }

  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   * @example
   * ResponseFormatter.sendSuccess(res, user, 'User retrieved successfully');
   */
  static sendSuccess(res, data = null, message = null, statusCode = HTTP_STATUS.OK) {
    return this.send(res, statusCode, this.success(data, message));
  }

  /**
   * Send a created response
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   * @param {string} location - Resource location
   * @example
   * ResponseFormatter.sendCreated(res, newGame, 'Game created', '/api/games/123');
   */
  static sendCreated(res, data, message = 'Resource created successfully', location = null) {
    return this.send(res, HTTP_STATUS.CREATED, this.created(data, message, location));
  }

  /**
   * Send a paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Data array
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Optional message
   * @example
   * ResponseFormatter.sendPaginated(res, games, paginationData);
   */
  static sendPaginated(res, data, pagination, message = null) {
    return this.send(res, HTTP_STATUS.OK, this.paginated(data, pagination, message));
  }

  /**
   * Send a validation error response
   * @param {Object} res - Express response object
   * @param {Array|Object} validationErrors - Validation errors
   * @param {string} message - Error message
   * @example
   * ResponseFormatter.sendValidationError(res, joiError.details);
   */
  static sendValidationError(res, validationErrors, message = 'Validation failed') {
    return this.send(
      res, 
      HTTP_STATUS.UNPROCESSABLE_ENTITY, 
      this.validationError(validationErrors, message)
    );
  }

  /**
   * Send a not found error response
   * @param {Object} res - Express response object
   * @param {string} resource - Resource name
   * @param {string} identifier - Resource identifier
   * @example
   * ResponseFormatter.sendNotFound(res, 'Game', '123');
   */
  static sendNotFound(res, resource = 'Resource', identifier = null) {
    return this.send(res, HTTP_STATUS.NOT_FOUND, this.notFound(resource, identifier));
  }

  /**
   * Send an unauthorized error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @example
   * ResponseFormatter.sendUnauthorized(res, 'Invalid token');
   */
  static sendUnauthorized(res, message = 'Authentication required') {
    return this.send(res, HTTP_STATUS.UNAUTHORIZED, this.unauthorized(message));
  }

  /**
   * Send a forbidden error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @example
   * ResponseFormatter.sendForbidden(res, 'Admin access required');
   */
  static sendForbidden(res, message = 'Access denied') {
    return this.send(res, HTTP_STATUS.FORBIDDEN, this.forbidden(message));
  }

  /**
   * Send a server error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {*} details - Error details
   * @example
   * ResponseFormatter.sendServerError(res, 'Database error', error.message);
   */
  static sendServerError(res, message = 'Internal server error', details = null) {
    return this.send(
      res, 
      HTTP_STATUS.INTERNAL_SERVER_ERROR, 
      this.serverError(message, details)
    );
  }
}

/**
 * Helper middleware to wrap async route handlers and format responses
 * @param {Function} handler - Async route handler function
 * @returns {Function} Express middleware function
 * @example
 * router.get('/games', ResponseFormatter.asyncHandler(async (req, res) => {
 *   const games = await db('games').select();
 *   return ResponseFormatter.sendSuccess(res, games);
 * }));
 */
const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
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

module.exports = {
  ResponseFormatter,
  asyncHandler,
  HTTP_STATUS
};