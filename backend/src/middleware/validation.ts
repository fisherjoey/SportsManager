/**
 * @fileoverview Request validation middleware for the Sports Management App
 * @description Provides comprehensive request validation using Joi schemas with
 * support for conditional validation, custom sanitization, and detailed error reporting.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { 
  UserSchemas, 
  GameSchemas, 
  AssignmentSchemas, 
  BudgetSchemas, 
  AuthSchemas,
  FilterSchemas,
  IdParamSchema,
  PaginationSchema,
  AvailabilitySchemas
} from '../utils/validation-schemas';
import { ErrorFactory, ValidationError } from '../utils/errors';

/**
 * Multer file interface definition
 */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

/**
 * Extended Request interface with validated file and multer properties
 */
interface RequestWithValidatedFile extends Request {
  validatedFile?: any;
  file?: MulterFile;
  files?: { [fieldname: string]: MulterFile[] } | MulterFile[];
}

/**
 * Validation options for different contexts
 */
interface ValidationOptions extends Joi.ValidationOptions {
  abortEarly: boolean;
  allowUnknown: boolean;
  stripUnknown: boolean;
  presence?: 'required' | 'optional';
  convert?: boolean;
}

/**
 * Conditional validation condition interface
 */
interface ValidationCondition {
  when: (req: Request) => boolean;
  schema: Joi.Schema;
  source?: 'body' | 'query' | 'params';
  options?: ValidationOptions;
  message?: string;
}

/**
 * Schema registry structure
 */
interface SchemaRegistry {
  [routePrefix: string]: {
    [routeMethod: string]: Joi.Schema;
  };
}

/**
 * Custom validator function type
 */
type CustomValidator = (value: any, helpers: Joi.CustomHelpers) => any;

/**
 * Custom validator registry
 */
interface CustomValidators {
  [validatorName: string]: CustomValidator;
}

/**
 * Validation options for different contexts
 */
const VALIDATION_OPTIONS: {
  strict: ValidationOptions;
  flexible: ValidationOptions;
  query: ValidationOptions;
  upload: ValidationOptions;
} = {
  // Standard validation - strict by default
  strict: {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false,
    presence: 'required'
  },
  
  // Flexible validation for updates (allows partial data)
  flexible: {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    presence: 'optional'
  },
  
  // Query validation (more permissive)
  query: {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
    convert: true
  },
  
  // File upload validation
  upload: {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  }
};

/**
 * Registry of validation schemas organized by route and method
 */
const SCHEMA_REGISTRY: SchemaRegistry = {
  // User routes
  users: {
    'POST /': UserSchemas.create,
    'PUT /:id': UserSchemas.adminUpdate,
    'PATCH /:id': UserSchemas.update,
    'GET /': FilterSchemas.referees, // Users can be filtered like referees
    'GET /:id': IdParamSchema
  },
  
  // Referee routes
  referees: {
    'POST /': UserSchemas.create,
    'PUT /:id': UserSchemas.adminUpdate,
    'PATCH /:id': UserSchemas.update,
    'GET /': FilterSchemas.referees,
    'GET /:id': IdParamSchema,
    'PATCH /:id/availability': Joi.object({
      is_available: Joi.boolean().required()
    })
  },
  
  // Game routes
  games: {
    'POST /': GameSchemas.create,
    'PUT /:id': GameSchemas.update,
    'PATCH /:id/status': Joi.object({
      status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled').required()
    }),
    'GET /': FilterSchemas.games,
    'GET /:id': IdParamSchema,
    'POST /bulk-import': Joi.object({
      games: Joi.array().items(GameSchemas.create).min(1).max(100).required()
    })
  },
  
  // Assignment routes
  assignments: {
    'POST /': AssignmentSchemas.create,
    'PUT /:id': AssignmentSchemas.update,
    'PATCH /:id/status': Joi.object({
      status: Joi.string().valid('assigned', 'accepted', 'declined', 'completed').required()
    }),
    'GET /': FilterSchemas.assignments,
    'GET /:id': IdParamSchema,
    'POST /bulk': AssignmentSchemas.bulk,
    'POST /check-conflicts': AssignmentSchemas.create
  },
  
  // Budget routes
  budgets: {
    'POST /': BudgetSchemas.item,
    'PUT /:id': BudgetSchemas.item,
    'GET /': Joi.object({
      period_id: Joi.string().uuid().optional(),
      category_id: Joi.string().uuid().optional(),
      status: Joi.string().valid('draft', 'approved', 'active', 'locked', 'closed').optional(),
      owner_id: Joi.string().uuid().optional(),
      include_allocations: Joi.boolean().default(false),
      include_summary: Joi.boolean().default(false)
    }).concat(PaginationSchema),
    'GET /:id': IdParamSchema,
    'POST /periods': BudgetSchemas.period,
    'GET /periods': Joi.object({
      status: Joi.string().valid('draft', 'active', 'closed', 'archived').optional()
    }).concat(PaginationSchema)
  },
  
  // Authentication routes
  auth: {
    'POST /login': AuthSchemas.login,
    'POST /register': AuthSchemas.register,
    'POST /forgot-password': AuthSchemas.passwordReset,
    'POST /reset-password': Joi.object({
      token: Joi.string().required(),
      password: Joi.string().min(8).max(128).required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    }),
    'POST /change-password': AuthSchemas.passwordUpdate
  },
  
  // Availability routes
  availability: {
    'POST /': AvailabilitySchemas.create,
    'PUT /:id': AvailabilitySchemas.update,
    'GET /:id': IdParamSchema,
    'GET /': Joi.object({
      user_id: Joi.string().uuid().optional(),
      start_date: Joi.date().optional(),
      end_date: Joi.date().optional(),
      is_available: Joi.boolean().optional()
    }).concat(PaginationSchema)
  }
};

/**
 * Custom validation rules for business logic
 */
const CUSTOM_VALIDATORS: CustomValidators = {
  /**
   * Validate date is not in the past
   */
  futureDate: (value: Date, helpers: Joi.CustomHelpers) => {
    if (value <= new Date()) {
      return helpers.error('date.future');
    }
    return value;
  },
  
  /**
   * Validate time is in valid business hours
   */
  businessHours: (value: string, helpers: Joi.CustomHelpers) => {
    const [hours] = value.split(':').map(Number);
    if (hours < 6 || hours > 23) {
      return helpers.error('time.businessHours');
    }
    return value;
  },
  
  /**
   * Validate postal code format based on context
   */
  postalCodeByRegion: (value: string, helpers: Joi.CustomHelpers) => {
    // This could be enhanced to validate based on user's region
    const cleanValue = value.replace(/\s+/g, '').toUpperCase();
    
    // Canadian postal code pattern
    if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanValue)) {
      return cleanValue;
    }
    
    // US ZIP code pattern
    if (/^\d{5}(-\d{4})?$/.test(cleanValue)) {
      return cleanValue;
    }
    
    return helpers.error('postalCode.invalid');
  }
};

/**
 * Enhanced error messages for better user experience
 */
const ERROR_MESSAGES: Joi.LanguageMessages = {
  'date.future': 'Date must be in the future',
  'time.businessHours': 'Time must be between 6:00 AM and 11:00 PM',
  'postalCode.invalid': 'Invalid postal code format',
  'string.email': 'Please provide a valid email address',
  'string.min': 'Field must be at least {#limit} characters long',
  'string.max': 'Field must not exceed {#limit} characters',
  'number.min': 'Value must be at least {#limit}',
  'number.max': 'Value must not exceed {#limit}',
  'any.required': 'This field is required',
  'array.min': 'Must contain at least {#limit} items',
  'array.max': 'Must not contain more than {#limit} items'
};

/**
 * Create validation middleware for a specific schema and source
 */
const createValidator = (
  schema: Joi.Schema, 
  source: 'body' | 'query' | 'params' = 'body', 
  options: ValidationOptions = VALIDATION_OPTIONS.strict
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = (req as any)[source];
      
      // Apply custom validation rules
      const extendedSchema = schema.messages(ERROR_MESSAGES);
      
      const { error, value } = extendedSchema.validate(data, options);
      
      if (error) {
        throw ErrorFactory.fromJoiError(error, `${source} validation failed`);
      }
      
      // Replace request data with validated and sanitized data
      (req as any)[source] = value;
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate request body
 */
const validateBody = (schema: Joi.Schema, options?: ValidationOptions) => {
  return createValidator(schema, 'body', options);
};

/**
 * Validate query parameters
 */
const validateQuery = (schema: Joi.Schema, options: ValidationOptions = VALIDATION_OPTIONS.query) => {
  return createValidator(schema, 'query', options);
};

/**
 * Validate URL parameters
 */
const validateParams = (schema: Joi.Schema, options: ValidationOptions = VALIDATION_OPTIONS.strict) => {
  return createValidator(schema, 'params', options);
};

/**
 * Validate file upload
 */
const validateFile = (schema: Joi.Schema, options: ValidationOptions = VALIDATION_OPTIONS.upload) => {
  return (req: RequestWithValidatedFile, res: Response, next: NextFunction): void => {
    try {
      if (!req.file && !req.files) {
        throw new ValidationError('File upload required');
      }
      
      const fileData = req.file || req.files;
      const { error, value } = schema.validate(fileData, options);
      
      if (error) {
        throw ErrorFactory.fromJoiError(error, 'File validation failed');
      }
      
      req.validatedFile = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Conditional validation based on request context
 */
const conditionalValidation = (conditions: ValidationCondition[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const condition of conditions) {
        if (condition.when(req)) {
          const source = condition.source || 'body';
          const { error, value } = condition.schema.validate(
            (req as any)[source], 
            condition.options || VALIDATION_OPTIONS.strict
          );
          
          if (error) {
            throw ErrorFactory.fromJoiError(error, condition.message || 'Conditional validation failed');
          }
          
          (req as any)[source] = value;
          break;
        }
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Auto-select validation schema based on route
 */
const autoValidate = (routePrefix: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const routeKey = `${req.method} ${req.route?.path || req.path}`;
      const schemas = SCHEMA_REGISTRY[routePrefix];
      
      if (!schemas || !schemas[routeKey]) {
        return next(); // No validation required
      }
      
      const schema = schemas[routeKey];
      const source = req.method === 'GET' ? 'query' : 'body';
      const options = req.method === 'GET' ? VALIDATION_OPTIONS.query : VALIDATION_OPTIONS.strict;
      
      const { error, value } = schema.validate((req as any)[source], options);
      
      if (error) {
        throw ErrorFactory.fromJoiError(error);
      }
      
      (req as any)[source] = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Sanitization middleware to clean and normalize input
 */
const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Trim whitespace
        sanitized[key] = value.trim();
        
        // Normalize email
        if (key.toLowerCase().includes('email')) {
          sanitized[key] = value.toLowerCase();
        }
        
        // Clean postal codes
        if (key.toLowerCase().includes('postal')) {
          sanitized[key] = value.replace(/\s+/g, '').toUpperCase();
        }
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(sanitizeObject);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };
  
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Validation summary middleware for debugging
 */
const validationSummary = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Validation Summary:', {
      method: req.method,
      path: req.path,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      queryKeys: req.query ? Object.keys(req.query) : [],
      paramsKeys: req.params ? Object.keys(req.params) : []
    });
  }
  next();
};

export {
  // Main validation functions
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  conditionalValidation,
  autoValidate,
  
  // Utility middleware
  sanitizeInput,
  validationSummary,
  
  // Schema creation
  createValidator,
  
  // Configuration
  VALIDATION_OPTIONS,
  SCHEMA_REGISTRY,
  CUSTOM_VALIDATORS,
  ERROR_MESSAGES,
  
  // Types
  type ValidationOptions,
  type ValidationCondition,
  type CustomValidators,
  type RequestWithValidatedFile
};