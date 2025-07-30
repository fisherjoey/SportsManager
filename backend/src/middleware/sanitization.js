const Joi = require('joi');

/**
 * Input sanitization and validation middleware
 * Prevents XSS, injection attacks, and data corruption
 */

/**
 * Sanitizes string input by removing dangerous characters and patterns
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    // Remove HTML tags (basic XSS prevention)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^<]*>/gi, '')
    .replace(/<meta\b[^<]*>/gi, '')
    // Remove dangerous attributes
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    // Remove SQL injection patterns
    .replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( +INTO)?|MERGE|SELECT|UPDATE|UNION( +ALL)?)\b)/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Recursively sanitizes an object or array
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both keys and values
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize request body
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters
 */
function sanitizeQuery(req, res, next) {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Middleware to sanitize URL parameters
 */
function sanitizeParams(req, res, next) {
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Comprehensive sanitization middleware
 */
function sanitizeAll(req, res, next) {
  sanitizeBody(req, res, () => {
    sanitizeQuery(req, res, () => {
      sanitizeParams(req, res, next);
    });
  });
}

/**
 * Query parameter validation schemas
 */
const queryValidationSchemas = {
  // Common pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
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
    limit: Joi.number().integer().min(1).max(100).default(50)
  }),
  
  // Referee filtering parameters
  refereeFilter: Joi.object({
    level: Joi.string().valid('Recreational', 'Competitive', 'Elite'),
    is_available: Joi.boolean(),
    postal_code: Joi.string().pattern(/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/),
    max_distance: Joi.number().integer().min(1).max(200),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  }),
  
  // Assignment filtering parameters
  assignmentFilter: Joi.object({
    status: Joi.string().valid('assigned', 'accepted', 'declined', 'completed'),
    game_id: Joi.number().integer().positive(),
    user_id: Joi.number().integer().positive(),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso().min(Joi.ref('date_from')),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  }),
  
  // Search parameters
  search: Joi.object({
    q: Joi.string().max(100).pattern(/^[a-zA-Z0-9\s\-_@.]+$/), // Allow only safe characters
    type: Joi.string().valid('games', 'referees', 'teams', 'locations'),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  })
};

/**
 * Creates a query validation middleware for specific schema
 * @param {string} schemaName - Name of the schema to use
 * @returns {Function} - Express middleware function
 */
function validateQuery(schemaName) {
  return (req, res, next) => {
    const schema = queryValidationSchemas[schemaName];
    if (!schema) {
      console.error(`Unknown query validation schema: ${schemaName}`);
      return next();
    }
    
    const { error, value } = schema.validate(req.query, {
      allowUnknown: false, // Reject unknown parameters
      stripUnknown: true   // Remove unknown parameters
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
          value: d.context?.value
        }))
      });
    }
    
    // Replace query with validated/sanitized values
    req.query = value;
    next();
  };
}

/**
 * Validates numeric ID parameters
 */
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId <= 0 || numericId > 2147483647) {
      return res.status(400).json({
        error: `Invalid ${paramName} parameter`,
        message: `${paramName} must be a positive integer`
      });
    }
    
    // Replace with sanitized numeric value
    req.params[paramName] = numericId;
    next();
  };
}

/**
 * Validates UUID parameters
 */
function validateUuidParam(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: `Invalid ${paramName} parameter`,
        message: `${paramName} must be a valid UUID`
      });
    }
    
    next();
  };
}

/**
 * Content-Type validation middleware
 */
function validateContentType(allowedTypes = ['application/json']) {
  return (req, res, next) => {
    // Skip for GET requests
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    const contentType = req.headers['content-type'];
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required'
      });
    }
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        allowed: allowedTypes
      });
    }
    
    next();
  };
}

module.exports = {
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