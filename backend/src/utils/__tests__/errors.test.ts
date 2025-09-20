/**
 * Comprehensive tests for the errors utility TypeScript implementation
 */

import {
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
  ConfigurationError,
  ErrorFactory,
  ErrorUtils,
  HTTP_STATUS,
  ERROR_CODES,
  type ErrorDetails,
  type ValidationErrorDetail,
  type HttpStatusCode,
  type ErrorCode
} from '../errors';

describe('Error Classes', () => {
  describe('ApiError', () => {
    it('should create basic ApiError with defaults', () => {
      const error = new ApiError('Test error');

      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeNull();
      expect(error.code).toBeNull();
      expect(error.timestamp).toBeDefined();
      expect(error.stack).toBeDefined();
    });

    it('should create ApiError with custom parameters', () => {
      const details = { key: 'value' };
      const error = new ApiError(
        'Custom error',
        HTTP_STATUS.BAD_REQUEST,
        false,
        details,
        ERROR_CODES.VALIDATION_ERROR
      );

      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.isOperational).toBe(false);
      expect(error.details).toBe(details);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should serialize to JSON correctly', () => {
      const error = new ApiError('Test error', HTTP_STATUS.BAD_REQUEST, true, { test: true }, ERROR_CODES.VALIDATION_ERROR);
      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'ApiError',
        message: 'Test error',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_ERROR,
        details: { test: true },
        timestamp: expect.any(String)
      });
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new ApiError('Test error');
      const json = error.toJSON();

      expect(json.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new ApiError('Test error');
      const json = error.toJSON();

      expect(json.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should have working type guard', () => {
      const apiError = new ApiError('Test');
      const standardError = new Error('Test');

      expect(ApiError.isApiError(apiError)).toBe(true);
      expect(ApiError.isApiError(standardError)).toBe(false);
      expect(ApiError.isApiError(null)).toBe(false);
      expect(ApiError.isApiError(undefined)).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with defaults', () => {
      const error = new ValidationError();

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.validationErrors).toBeNull();
    });

    it('should create ValidationError with validation details', () => {
      const validationErrors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Invalid email format', value: 'invalid-email' },
        { field: 'age', message: 'Must be positive', value: -5 }
      ];

      const error = new ValidationError('Validation failed', null, validationErrors);
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should serialize with validation errors', () => {
      const validationErrors: ValidationErrorDetail[] = [
        { field: 'name', message: 'Required', value: '' }
      ];

      const error = new ValidationError('Test', null, validationErrors);
      const json = error.toJSON();

      expect(json.validationErrors).toEqual(validationErrors);
    });

    it('should have working type guard', () => {
      const validationError = new ValidationError();
      const apiError = new ApiError('Test');

      expect(ValidationError.isValidationError(validationError)).toBe(true);
      expect(ValidationError.isValidationError(apiError)).toBe(false);
    });
  });

  describe('AuthenticationError', () => {
    it('should create AuthenticationError with correct defaults', () => {
      const error = new AuthenticationError();

      expect(error.name).toBe('AuthenticationError');
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.code).toBe(ERROR_CODES.AUTHENTICATION_ERROR);
      expect(error.message).toBe('Authentication required');
    });

    it('should have working type guard', () => {
      const authError = new AuthenticationError();
      const apiError = new ApiError('Test');

      expect(AuthenticationError.isAuthenticationError(authError)).toBe(true);
      expect(AuthenticationError.isAuthenticationError(apiError)).toBe(false);
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with correct defaults', () => {
      const error = new AuthorizationError();

      expect(error.name).toBe('AuthorizationError');
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(error.code).toBe(ERROR_CODES.AUTHORIZATION_ERROR);
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with resource only', () => {
      const error = new NotFoundError('User');

      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('User not found');
      expect(error.resource).toBe('User');
      expect(error.identifier).toBeNull();
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
    });

    it('should create NotFoundError with resource and identifier', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe("User with identifier '123' not found");
      expect(error.identifier).toBe('123');
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with conflict type', () => {
      const error = new ConflictError('Duplicate email', { constraint: 'unique_email' }, 'DUPLICATE');

      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(error.conflictType).toBe('DUPLICATE');
      expect(error.details).toEqual({ constraint: 'unique_email' });
    });
  });

  describe('DatabaseError', () => {
    it('should create DatabaseError with original error', () => {
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('DB Error', originalError, 'SELECT');

      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.isOperational).toBe(false);
      expect(error.originalError).toBe(originalError);
      expect(error.operation).toBe('SELECT');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create ExternalServiceError with service info', () => {
      const error = new ExternalServiceError('API failed', 'payment-service');

      expect(error.statusCode).toBe(HTTP_STATUS.BAD_GATEWAY);
      expect(error.service).toBe('payment-service');
    });
  });

  describe('RateLimitError', () => {
    it('should create RateLimitError with retry after', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('TimeoutError', () => {
    it('should create TimeoutError with operation details', () => {
      const error = new TimeoutError('Operation timed out', 'database-query', 5000);

      expect(error.statusCode).toBe(HTTP_STATUS.REQUEST_TIMEOUT);
      expect(error.operation).toBe('database-query');
      expect(error.timeout).toBe(5000);
    });
  });
});

describe('ErrorFactory', () => {
  describe('fromJoiError', () => {
    it('should create ValidationError from Joi error', () => {
      const joiError = {
        details: [
          {
            message: 'Email is required',
            path: ['email'],
            context: { value: undefined }
          },
          {
            message: 'Invalid format',
            path: ['user', 'name'],
            context: { value: 'test@' }
          }
        ]
      };

      const error = ErrorFactory.fromJoiError(joiError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.validationErrors).toHaveLength(2);
      expect(error.validationErrors![0]).toEqual({
        field: 'email',
        message: 'Email is required',
        value: undefined
      });
      expect(error.validationErrors![1]).toEqual({
        field: 'user.name',
        message: 'Invalid format',
        value: 'test@'
      });
    });
  });

  describe('fromDatabaseError', () => {
    it('should handle unique constraint violation', () => {
      const dbError = {
        code: '23505',
        constraint: 'users_email_unique',
        name: 'DatabaseError',
        message: 'Duplicate key'
      };

      const error = ErrorFactory.fromDatabaseError(dbError);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Duplicate entry detected');
      expect(error.details).toEqual({ constraint: 'users_email_unique' });
    });

    it('should handle foreign key violation', () => {
      const dbError = {
        code: '23503',
        constraint: 'fk_user_organization',
        name: 'DatabaseError',
        message: 'Foreign key violation'
      };

      const error = ErrorFactory.fromDatabaseError(dbError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Referenced record not found');
    });

    it('should handle not null violation', () => {
      const dbError = {
        code: '23502',
        column: 'email',
        name: 'DatabaseError',
        message: 'Not null violation'
      };

      const error = ErrorFactory.fromDatabaseError(dbError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Required field missing');
      expect(error.details).toEqual({ column: 'email' });
    });

    it('should handle connection errors', () => {
      const dbError = {
        code: 'ECONNREFUSED',
        name: 'DatabaseError',
        message: 'Connection refused'
      };

      const error = ErrorFactory.fromDatabaseError(dbError, 'SELECT');

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Database connection failed');
      expect((error as DatabaseError).operation).toBe('SELECT');
    });

    it('should handle unknown database errors', () => {
      const dbError = {
        code: 'UNKNOWN',
        name: 'DatabaseError',
        message: 'Unknown error'
      };

      const error = ErrorFactory.fromDatabaseError(dbError);

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Database operation failed');
    });
  });

  describe('Factory methods', () => {
    it('should create not found error', () => {
      const error = ErrorFactory.notFound('User', '123');
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.resource).toBe('User');
      expect(error.identifier).toBe('123');
    });

    it('should create unauthorized error', () => {
      const error = ErrorFactory.unauthorized('Token expired');
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Token expired');
    });

    it('should create forbidden error', () => {
      const error = ErrorFactory.forbidden('Access denied');
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.message).toBe('Access denied');
    });

    it('should create conflict error', () => {
      const error = ErrorFactory.conflict('Email exists', { email: 'test@test.com' }, 'DUPLICATE');
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.conflictType).toBe('DUPLICATE');
    });

    it('should create business logic error', () => {
      const error = ErrorFactory.businessLogic('Invalid operation', 'BUSINESS_RULE', { context: 'test' });
      expect(error).toBeInstanceOf(BusinessLogicError);
      expect(error.rule).toBe('BUSINESS_RULE');
    });

    it('should create referee level validation error', () => {
      const error = ErrorFactory.invalidRefereeLevel('Invalid');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Invalid referee level: Invalid');
    });

    it('should create referee role error', () => {
      const error = ErrorFactory.refereeRoleError('Role error', 'assign', { gameId: 123 });
      expect(error).toBeInstanceOf(BusinessLogicError);
      expect(error.rule).toBe('REFEREE_ROLE_OPERATION');
    });

    it('should create white whistle error', () => {
      const error = ErrorFactory.whiteWhistleError('Senior', true, 'Invalid config');
      expect(error).toBeInstanceOf(BusinessLogicError);
      expect(error.rule).toBe('WHITE_WHISTLE_LOGIC');
      expect(error.context).toEqual({ level: 'Senior', flag: true, reason: 'Invalid config' });
    });

    it('should create additional factory methods', () => {
      expect(ErrorFactory.rateLimitExceeded(30)).toBeInstanceOf(RateLimitError);
      expect(ErrorFactory.operationTimeout('query', 5000)).toBeInstanceOf(TimeoutError);
      expect(ErrorFactory.externalServiceFailure('API')).toBeInstanceOf(ExternalServiceError);
      expect(ErrorFactory.fileProcessingFailure('test.jpg', 'upload')).toBeInstanceOf(FileProcessingError);
      expect(ErrorFactory.configurationMissing('API_KEY')).toBeInstanceOf(ConfigurationError);
    });
  });
});

describe('ErrorUtils', () => {
  describe('Type guards', () => {
    it('should identify operational errors', () => {
      const operationalError = new ValidationError('Test');
      const systemError = new DatabaseError('Test');
      const standardError = new Error('Test');

      expect(ErrorUtils.isOperational(operationalError)).toBe(true);
      expect(ErrorUtils.isOperational(systemError)).toBe(false);
      expect(ErrorUtils.isOperational(standardError)).toBe(false);
    });

    it('should identify system errors', () => {
      const systemError = new DatabaseError('Test');
      const operationalError = new ValidationError('Test');

      expect(ErrorUtils.isSystemError(systemError)).toBe(true);
      expect(ErrorUtils.isSystemError(operationalError)).toBe(false);
    });
  });

  describe('getErrorContext', () => {
    it('should extract error context without request', () => {
      const error = new ValidationError('Test error');
      const context = ErrorUtils.getErrorContext(error);

      expect(context).toMatchObject({
        name: 'ValidationError',
        message: 'Test error',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_ERROR,
        isOperational: true,
        timestamp: expect.any(String)
      });
    });

    it('should extract error context with request', () => {
      const mockRequest = {
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        body: { name: 'test' },
        params: { id: '123' },
        query: { limit: '10' },
        ip: '192.168.1.1',
        user: { id: 456, organization_id: 789 },
        get: (header: string) => header === 'User-Agent' ? 'TestAgent/1.0' : undefined
      };

      const error = new ValidationError('Test error');
      const context = ErrorUtils.getErrorContext(error, mockRequest);

      expect(context.request).toMatchObject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        body: { name: 'test' },
        userAgent: 'TestAgent/1.0',
        userId: 456,
        organizationId: 789
      });
    });
  });

  describe('sanitizeForClient', () => {
    it('should sanitize operational errors for client', () => {
      const validationErrors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Invalid email' }
      ];
      const error = new ValidationError('Validation failed', null, validationErrors);

      const sanitized = ErrorUtils.sanitizeForClient(error);

      expect(sanitized).toEqual({
        message: 'Validation failed',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: null,
        validationErrors
      });
    });

    it('should sanitize non-operational errors', () => {
      const error = new DatabaseError('Connection failed');
      const sanitized = ErrorUtils.sanitizeForClient(error);

      expect(sanitized).toEqual({
        message: 'An unexpected error occurred',
        code: ERROR_CODES.CONFIGURATION_ERROR
      });
    });

    it('should sanitize standard errors', () => {
      const error = new Error('System error');
      const sanitized = ErrorUtils.sanitizeForClient(error);

      expect(sanitized).toEqual({
        message: 'An unexpected error occurred',
        code: ERROR_CODES.CONFIGURATION_ERROR
      });
    });
  });

  describe('Utility methods', () => {
    it('should generate unique error IDs', () => {
      const id1 = ErrorUtils.generateErrorId();
      const id2 = ErrorUtils.generateErrorId();

      expect(id1).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should format error for structured logging', () => {
      const error = new ValidationError('Test error');
      const formatted = ErrorUtils.formatErrorForLog(error, 'test-123');

      expect(formatted).toMatchObject({
        errorId: 'test-123',
        name: 'ValidationError',
        message: 'Test error',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_ERROR,
        isOperational: true,
        timestamp: expect.any(String)
      });
    });

    it('should determine error severity', () => {
      expect(ErrorUtils.getErrorSeverity(new ValidationError())).toBe('warn');
      expect(ErrorUtils.getErrorSeverity(new DatabaseError())).toBe('error');
      expect(ErrorUtils.getErrorSeverity(new Error())).toBe('error');
    });

    it('should determine if error should trigger alerts', () => {
      expect(ErrorUtils.shouldAlert(new ValidationError())).toBe(false);
      expect(ErrorUtils.shouldAlert(new DatabaseError())).toBe(true);
      expect(ErrorUtils.shouldAlert(new Error())).toBe(true);
    });

    it('should create error summary', () => {
      const error = new ValidationError('Test');
      const summary = ErrorUtils.createErrorSummary(error);

      expect(summary).toMatchObject({
        type: 'ValidationError',
        message: 'Test',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_ERROR,
        isOperational: true,
        timestamp: expect.any(String)
      });
    });

    it('should convert error to metrics tags', () => {
      const error = new ValidationError('Test');
      const tags = ErrorUtils.toMetricsTags(error);

      expect(tags).toEqual({
        error_type: 'ValidationError',
        error_name: 'ValidationError',
        status_code: '400',
        error_code: ERROR_CODES.VALIDATION_ERROR,
        operational: 'true'
      });
    });
  });
});

describe('Constants and Types', () => {
  it('should export HTTP status constants', () => {
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS.CONFLICT).toBe(409);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });

  it('should export error code constants', () => {
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
    expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
  });
});