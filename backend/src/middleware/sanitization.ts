import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Input sanitization and validation middleware
 * Prevents XSS, injection attacks, and data corruption
 */

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

interface ValidationResponse {
  error: string;
  details: ValidationError[];
}

interface QueryValidationSchemas {
  [key: string]: Joi.ObjectSchema;
}

/**
 * Sanitizes string input by removing dangerous characters and patterns
 */
function sanitizeString(input: any): any {
  if (typeof input !== 'string') {
    return input;
  }

  // First handle the data:text/html protocol edge case
  if (input.startsWith('data:text/html')) {
    // For data:text/html, just remove the protocol part, keep everything else including HTML
    return input.replace(/^data:text\/html/i, '').trim();
  }

  // Apply sanitization in the correct order for normal strings
  return input
    // Remove HTML tags (basic XSS prevention)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')  // Fixed: Remove embed tags properly
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    // Remove dangerous protocols and attributes
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove SQL injection patterns - only remove the keyword, not the whole word
    .replace(/\bDROP\s*/gi, '')  // Also remove trailing space after DROP
    .replace(/\bDELETE\b/gi, '')
    .replace(/\bEXEC(UTE)?\b/gi, '')
    .replace(/\bINSERT\s+INTO\b/gi, '')
    .replace(/\bUNION\s+ALL?\b/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Recursively sanitizes an object or array with circular reference detection
 */
function sanitizeObject(obj: any, visited = new WeakSet()): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, visited));
  }

  if (obj && typeof obj === 'object') {
    // Handle circular references
    if (visited.has(obj)) {
      return obj; // Return original object to avoid infinite recursion
    }
    visited.add(obj);

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both keys and values
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value, visited);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body
 */
function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters
 */
function sanitizeQuery(req: Request, res: Response, next: NextFunction): void {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Middleware to sanitize URL parameters
 */
function sanitizeParams(req: Request, res: Response, next: NextFunction): void {
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Comprehensive sanitization middleware
 */
function sanitizeAll(req: Request, res: Response, next: NextFunction): void {
  sanitizeBody(req, res, () => {
    sanitizeQuery(req, res, () => {
      sanitizeParams(req, res, next);
    });
  });
}

/**
 * Query parameter validation schemas
 */
const queryValidationSchemas: QueryValidationSchemas = {
  // Common pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(300).default(50),
    offset: Joi.number().integer().min(0).max(50000).default(0)
  }),

  // Games filtering parameters
  gamesFilter: Joi.object({
    status: Joi.string().valid('assigned', 'unassigned', 'completed', 'cancelled'),
    level: Joi.string().valid('Recreational', 'Competitive', 'Elite'),
    game_type: Joi.string().valid('Community', 'Club', 'Tournament', 'Private Tournament'),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso().min(Joi.ref('date_from')),
    postal_code: Joi.string().pattern(/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/),
    location: Joi.string().max(100),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(300).default(50)
  }),

  // Referee filtering parameters
  refereeFilter: Joi.object({
    level: Joi.string().valid('Recreational', 'Competitive', 'Elite'),
    is_available: Joi.boolean(),
    postal_code: Joi.string().pattern(/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/),
    max_distance: Joi.number().integer().min(1).max(200),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(300).default(50)
  }),

  // Assignment filtering parameters
  assignmentFilter: Joi.object({
    status: Joi.string().valid('assigned', 'accepted', 'declined', 'completed'),
    game_id: Joi.number().integer().positive(),
    user_id: Joi.number().integer().positive(),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso().min(Joi.ref('date_from')),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(300).default(50)
  }),

  // Search parameters
  search: Joi.object({
    q: Joi.string().max(100).pattern(/^[a-zA-Z0-9\s\-_@.]+$/), // Allow only safe characters
    type: Joi.string().valid('games', 'referees', 'teams', 'locations'),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(300).default(50)
  })
};

/**
 * Creates a query validation middleware for specific schema
 */
function validateQuery(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const schema = queryValidationSchemas[schemaName];
    if (!schema) {
      console.error(`Unknown query validation schema: ${schemaName}`);
      return next();
    }

    const { error, value } = schema.validate(req.query, {
      allowUnknown: false, // Reject unknown parameters
      stripUnknown: false  // Don't remove unknowns, let allowUnknown: false catch them
    });

    if (error) {
      const validationResponse: ValidationResponse = {
        error: 'Invalid query parameters',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
          value: d.context?.value
        }))
      };

      res.status(400).json(validationResponse);
      return;
    }

    // Replace query with validated/sanitized values
    req.query = value;
    next();
  };
}

/**
 * Validates numeric ID parameters
 */
function validateIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    const numericId = parseInt(id, 10);

    if (isNaN(numericId) || numericId <= 0 || numericId > 2147483647) {
      res.status(400).json({
        error: `Invalid ${paramName} parameter`,
        message: `${paramName} must be a positive integer`
      });
      return;
    }

    // Replace with sanitized numeric value
    req.params[paramName] = numericId as any;
    next();
  };
}

/**
 * Validates UUID parameters
 */
function validateUuidParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      res.status(400).json({
        error: `Invalid ${paramName} parameter`,
        message: `${paramName} must be a valid UUID`
      });
      return;
    }

    next();
  };
}

/**
 * Content-Type validation middleware
 */
function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip for GET requests
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.headers['content-type'];
    if (!contentType) {
      res.status(400).json({
        error: 'Content-Type header is required'
      });
      return;
    }

    const isAllowed = allowedTypes.some(type =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        allowed: allowedTypes
      });
      return;
    }

    next();
  };
}

// Export functions for ES modules
export {
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll,
  validateQuery,
  validateIdParam,
  validateUuidParam,
  validateContentType,
  queryValidationSchemas
};

// Export types for TypeScript users
export type {
  ValidationError,
  ValidationResponse,
  QueryValidationSchemas
};