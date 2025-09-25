/**
 * @fileoverview Comprehensive tests for response-formatters utility
 * @description Tests all response formatting methods with full coverage
 */

import { ResponseFormatter, asyncHandler, HTTP_STATUS } from '../response-formatters';

// Mock Express response object
const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    headersSent: false
  };
  return res;
};

// Mock Express request object
const createMockRequest = (data: any = {}) => ({
  body: data.body || {},
  params: data.params || {},
  query: data.query || {},
  user: data.user || null
});

describe('HTTP_STATUS constants', () => {
  test('should export correct HTTP status codes', () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.CREATED).toBe(201);
    expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS.CONFLICT).toBe(409);
    expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });
});

describe('ResponseFormatter.success', () => {
  test('should format basic success response', () => {
    const result = ResponseFormatter.success();

    expect(result).toMatchObject({
      success: true,
      timestamp: expect.any(String)
    });
    expect(result.data).toBeUndefined();
    expect(result.message).toBeUndefined();
    expect(result.meta).toBeUndefined();
  });

  test('should format success response with data', () => {
    const data = { id: 1, name: 'Test' };
    const result = ResponseFormatter.success(data);

    expect(result).toMatchObject({
      success: true,
      data,
      timestamp: expect.any(String)
    });
  });

  test('should format success response with data and message', () => {
    const data = { id: 1, name: 'Test' };
    const message = 'Operation successful';
    const result = ResponseFormatter.success(data, message);

    expect(result).toMatchObject({
      success: true,
      data,
      message,
      timestamp: expect.any(String)
    });
  });

  test('should format success response with data, message, and meta', () => {
    const data = { id: 1, name: 'Test' };
    const message = 'Operation successful';
    const meta = { version: '1.0' };
    const result = ResponseFormatter.success(data, message, meta);

    expect(result).toMatchObject({
      success: true,
      data,
      message,
      meta,
      timestamp: expect.any(String)
    });
  });

  test('should handle null data explicitly', () => {
    const result = ResponseFormatter.success(null, 'No content');

    expect(result).toMatchObject({
      success: true,
      message: 'No content',
      timestamp: expect.any(String)
    });
    expect(result.data).toBeUndefined();
  });

  test('should handle empty string data', () => {
    const result = ResponseFormatter.success('', 'Empty data');

    expect(result).toMatchObject({
      success: true,
      data: '',
      message: 'Empty data',
      timestamp: expect.any(String)
    });
  });

  test('should handle boolean false data', () => {
    const result = ResponseFormatter.success(false, 'Boolean result');

    expect(result).toMatchObject({
      success: true,
      data: false,
      message: 'Boolean result',
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.error', () => {
  test('should format basic error response', () => {
    const message = 'Something went wrong';
    const result = ResponseFormatter.error(message);

    expect(result).toMatchObject({
      success: false,
      message,
      timestamp: expect.any(String)
    });
    expect(result.details).toBeUndefined();
    expect(result.code).toBeUndefined();
    expect(result.errors).toBeUndefined();
  });

  test('should format error response with details', () => {
    const message = 'Validation failed';
    const details = { field: 'email', issue: 'Invalid format' };
    const result = ResponseFormatter.error(message, details);

    expect(result).toMatchObject({
      success: false,
      message,
      details,
      timestamp: expect.any(String)
    });
  });

  test('should format error response with code', () => {
    const message = 'Not found';
    const code = 'RESOURCE_NOT_FOUND';
    const result = ResponseFormatter.error(message, null, code);

    expect(result).toMatchObject({
      success: false,
      message,
      code,
      timestamp: expect.any(String)
    });
  });

  test('should format error response with validation errors array', () => {
    const message = 'Validation failed';
    const errors = [
      { field: 'email', message: 'Email is required' },
      { field: 'name', message: 'Name must be at least 2 characters' }
    ];
    const result = ResponseFormatter.error(message, null, 'VALIDATION_ERROR', errors);

    expect(result).toMatchObject({
      success: false,
      message,
      code: 'VALIDATION_ERROR',
      errors,
      timestamp: expect.any(String)
    });
  });

  test('should not include errors if not an array', () => {
    const message = 'Error occurred';
    const invalidErrors = 'not an array';
    const result = ResponseFormatter.error(message, null, null, invalidErrors as any);

    expect(result).toMatchObject({
      success: false,
      message,
      timestamp: expect.any(String)
    });
    expect(result.errors).toBeUndefined();
  });
});

describe('ResponseFormatter.paginated', () => {
  test('should format paginated response with minimal data', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const pagination = { page: 1, limit: 10, totalCount: 2, totalPages: 1 };
    const result = ResponseFormatter.paginated(data, pagination);

    expect(result).toMatchObject({
      success: true,
      data,
      pagination: {
        page: 1,
        limit: 10,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      timestamp: expect.any(String)
    });
  });

  test('should format paginated response with message', () => {
    const data = [{ id: 1 }];
    const pagination = { page: 2, limit: 5, totalCount: 10, totalPages: 2 };
    const message = 'Games retrieved successfully';
    const result = ResponseFormatter.paginated(data, pagination, message);

    expect(result).toMatchObject({
      success: true,
      data,
      message,
      pagination: {
        page: 2,
        limit: 5,
        totalCount: 10,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: false
      },
      timestamp: expect.any(String)
    });
  });

  test('should use default values for missing pagination properties', () => {
    const data = [];
    const pagination = {};
    const result = ResponseFormatter.paginated(data, pagination);

    expect(result.pagination).toMatchObject({
      page: 1,
      limit: 50,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false
    });
  });

  test('should preserve hasNextPage and hasPrevPage when provided', () => {
    const data = [{ id: 1 }];
    const pagination = {
      page: 2,
      limit: 10,
      totalCount: 30,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true
    };
    const result = ResponseFormatter.paginated(data, pagination);

    expect(result.pagination).toMatchObject({
      page: 2,
      limit: 10,
      totalCount: 30,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true
    });
  });
});

describe('ResponseFormatter.created', () => {
  test('should format created response with default message', () => {
    const data = { id: 1, name: 'New Game' };
    const result = ResponseFormatter.created(data);

    expect(result).toMatchObject({
      success: true,
      data,
      message: 'Resource created successfully',
      timestamp: expect.any(String)
    });
    expect(result.location).toBeUndefined();
  });

  test('should format created response with custom message and location', () => {
    const data = { id: 1, name: 'New Game' };
    const message = 'Game created successfully';
    const location = '/api/games/1';
    const result = ResponseFormatter.created(data, message, location);

    expect(result).toMatchObject({
      success: true,
      data,
      message,
      location,
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.updated', () => {
  test('should format updated response', () => {
    const data = { id: 1, name: 'Updated Game' };
    const result = ResponseFormatter.updated(data);

    expect(result).toMatchObject({
      success: true,
      data,
      message: 'Resource updated successfully',
      timestamp: expect.any(String)
    });
  });

  test('should format updated response with custom message', () => {
    const data = { id: 1, name: 'Updated Game' };
    const message = 'Game updated successfully';
    const result = ResponseFormatter.updated(data, message);

    expect(result).toMatchObject({
      success: true,
      data,
      message,
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.deleted', () => {
  test('should format deleted response with default message', () => {
    const result = ResponseFormatter.deleted();

    expect(result).toMatchObject({
      success: true,
      message: 'Resource deleted successfully',
      timestamp: expect.any(String)
    });
    expect(result.data).toBeUndefined();
  });

  test('should format deleted response with custom message and data', () => {
    const message = 'Game deleted successfully';
    const data = { deletedId: 1 };
    const result = ResponseFormatter.deleted(message, data);

    expect(result).toMatchObject({
      success: true,
      data,
      message,
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.validationError', () => {
  test('should format Joi validation errors', () => {
    const joiErrors = [
      {
        path: ['email'],
        message: 'Email is required',
        context: { value: undefined }
      },
      {
        path: ['name', 'first'],
        message: 'Name must be at least 2 characters',
        context: { value: 'A' }
      }
    ];

    const result = ResponseFormatter.validationError(joiErrors);

    expect(result).toMatchObject({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: [
        {
          field: 'email',
          message: 'Email is required',
          value: undefined
        },
        {
          field: 'name.first',
          message: 'Name must be at least 2 characters',
          value: 'A'
        }
      ],
      timestamp: expect.any(String)
    });
  });

  test('should format custom validation errors object', () => {
    const customErrors = {
      email: 'Email format is invalid',
      password: 'Password must be at least 8 characters'
    };

    const result = ResponseFormatter.validationError(customErrors, 'Custom validation failed');

    expect(result).toMatchObject({
      success: false,
      message: 'Custom validation failed',
      code: 'VALIDATION_ERROR',
      errors: [
        { field: 'email', message: 'Email format is invalid' },
        { field: 'password', message: 'Password must be at least 8 characters' }
      ],
      timestamp: expect.any(String)
    });
  });

  test('should handle Joi errors without path', () => {
    const joiErrors = [
      {
        path: null,
        message: 'General validation error',
        context: { value: 'test' }
      }
    ];

    const result = ResponseFormatter.validationError(joiErrors);

    expect(result.errors[0]).toMatchObject({
      field: 'unknown',
      message: 'General validation error',
      value: 'test'
    });
  });

  test('should handle empty validation errors', () => {
    const result = ResponseFormatter.validationError([]);

    expect(result).toMatchObject({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: [],
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.notFound', () => {
  test('should format not found response with default values', () => {
    const result = ResponseFormatter.notFound();

    expect(result).toMatchObject({
      success: false,
      message: 'Resource not found',
      code: 'NOT_FOUND',
      timestamp: expect.any(String)
    });
  });

  test('should format not found response with resource name', () => {
    const result = ResponseFormatter.notFound('Game');

    expect(result).toMatchObject({
      success: false,
      message: 'Game not found',
      code: 'NOT_FOUND',
      timestamp: expect.any(String)
    });
  });

  test('should format not found response with resource and identifier', () => {
    const result = ResponseFormatter.notFound('Game', '123');

    expect(result).toMatchObject({
      success: false,
      message: "Game with identifier '123' not found",
      code: 'NOT_FOUND',
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.unauthorized', () => {
  test('should format unauthorized response with default message', () => {
    const result = ResponseFormatter.unauthorized();

    expect(result).toMatchObject({
      success: false,
      message: 'Authentication required',
      code: 'UNAUTHORIZED',
      timestamp: expect.any(String)
    });
  });

  test('should format unauthorized response with custom message', () => {
    const message = 'Invalid credentials';
    const result = ResponseFormatter.unauthorized(message);

    expect(result).toMatchObject({
      success: false,
      message,
      code: 'UNAUTHORIZED',
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.forbidden', () => {
  test('should format forbidden response with default message', () => {
    const result = ResponseFormatter.forbidden();

    expect(result).toMatchObject({
      success: false,
      message: 'Access denied',
      code: 'FORBIDDEN',
      timestamp: expect.any(String)
    });
  });

  test('should format forbidden response with custom message', () => {
    const message = 'Insufficient permissions';
    const result = ResponseFormatter.forbidden(message);

    expect(result).toMatchObject({
      success: false,
      message,
      code: 'FORBIDDEN',
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.conflict', () => {
  test('should format conflict response without details', () => {
    const message = 'Email already exists';
    const result = ResponseFormatter.conflict(message);

    expect(result).toMatchObject({
      success: false,
      message,
      code: 'CONFLICT',
      timestamp: expect.any(String)
    });
    expect(result.details).toBeUndefined();
  });

  test('should format conflict response with details', () => {
    const message = 'Email already exists';
    const details = { email: 'user@example.com' };
    const result = ResponseFormatter.conflict(message, details);

    expect(result).toMatchObject({
      success: false,
      message,
      details,
      code: 'CONFLICT',
      timestamp: expect.any(String)
    });
  });
});

describe('ResponseFormatter.serverError', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('should format server error with default message in development', () => {
    process.env.NODE_ENV = 'development';
    const result = ResponseFormatter.serverError();

    expect(result).toMatchObject({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: expect.any(String)
    });
  });

  test('should format server error with details in development', () => {
    process.env.NODE_ENV = 'development';
    const message = 'Database connection failed';
    const details = { error: 'Connection timeout' };
    const result = ResponseFormatter.serverError(message, details);

    expect(result).toMatchObject({
      success: false,
      message,
      details,
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: expect.any(String)
    });
  });

  test('should hide details in production', () => {
    process.env.NODE_ENV = 'production';
    const message = 'Database connection failed';
    const details = { error: 'Connection timeout' };
    const result = ResponseFormatter.serverError(message, details);

    expect(result).toMatchObject({
      success: false,
      message,
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: expect.any(String)
    });
    expect(result.details).toBeUndefined();
  });
});

describe('ResponseFormatter send methods', () => {
  let mockRes: any;

  beforeEach(() => {
    mockRes = createMockResponse();
  });

  test('send should call response status and json methods', () => {
    const statusCode = 200;
    const responseData = { success: true };

    ResponseFormatter.send(mockRes, statusCode, responseData);

    expect(mockRes.status).toHaveBeenCalledWith(statusCode);
    expect(mockRes.json).toHaveBeenCalledWith(responseData);
  });

  test('sendSuccess should send success response with correct status', () => {
    const data = { id: 1 };
    const message = 'Success';

    ResponseFormatter.sendSuccess(mockRes, data, message);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data,
        message
      })
    );
  });

  test('sendSuccess should accept custom status code', () => {
    const data = { id: 1 };
    const message = 'Success';
    const statusCode = 202;

    ResponseFormatter.sendSuccess(mockRes, data, message, statusCode);

    expect(mockRes.status).toHaveBeenCalledWith(statusCode);
  });

  test('sendCreated should send created response', () => {
    const data = { id: 1 };
    const message = 'Created';
    const location = '/api/resource/1';

    ResponseFormatter.sendCreated(mockRes, data, message, location);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data,
        message,
        location
      })
    );
  });

  test('sendPaginated should send paginated response', () => {
    const data = [{ id: 1 }];
    const pagination = { page: 1, limit: 10, totalCount: 1, totalPages: 1 };
    const message = 'Data retrieved';

    ResponseFormatter.sendPaginated(mockRes, data, pagination, message);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data,
        message,
        pagination: expect.objectContaining(pagination)
      })
    );
  });

  test('sendValidationError should send validation error response', () => {
    const validationErrors = [{ field: 'email', message: 'Required' }];
    const message = 'Validation failed';

    ResponseFormatter.sendValidationError(mockRes, validationErrors, message);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message,
        code: 'VALIDATION_ERROR'
      })
    );
  });

  test('sendNotFound should send not found response', () => {
    const resource = 'Game';
    const identifier = '123';

    ResponseFormatter.sendNotFound(mockRes, resource, identifier);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Game with identifier '123' not found",
        code: 'NOT_FOUND'
      })
    );
  });

  test('sendUnauthorized should send unauthorized response', () => {
    const message = 'Invalid token';

    ResponseFormatter.sendUnauthorized(mockRes, message);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message,
        code: 'UNAUTHORIZED'
      })
    );
  });

  test('sendForbidden should send forbidden response', () => {
    const message = 'Admin access required';

    ResponseFormatter.sendForbidden(mockRes, message);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message,
        code: 'FORBIDDEN'
      })
    );
  });

  test('sendServerError should send server error response', () => {
    const message = 'Database error';
    const details = { error: 'Connection failed' };

    ResponseFormatter.sendServerError(mockRes, message, details);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message,
        code: 'INTERNAL_SERVER_ERROR'
      })
    );
  });
});

describe('asyncHandler', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should execute handler successfully', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should handle ValidationError', async () => {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    (validationError as any).details = [{ field: 'email', message: 'Required' }];

    const handler = jest.fn().mockRejectedValue(validationError);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should handle not found errors', async () => {
    const notFoundError = new Error('Resource not found');
    const handler = jest.fn().mockRejectedValue(notFoundError);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should handle generic errors as server errors', async () => {
    const genericError = new Error('Something went wrong');
    const handler = jest.fn().mockRejectedValue(genericError);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should call next if response headers already sent', async () => {
    mockRes.headersSent = true;
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should log errors to console', async () => {
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(console.error).toHaveBeenCalledWith('Route handler error:', error);
  });
});

describe('Integration tests', () => {
  test('should format complete API response flow', () => {
    // Test a typical success flow
    const userData = { id: 1, name: 'John Doe', email: 'john@example.com' };
    const successResponse = ResponseFormatter.success(userData, 'User retrieved successfully');

    expect(successResponse).toMatchObject({
      success: true,
      data: userData,
      message: 'User retrieved successfully',
      timestamp: expect.any(String)
    });

    // Test error flow
    const errorResponse = ResponseFormatter.validationError(
      [{ path: ['email'], message: 'Email is required' }],
      'User validation failed'
    );

    expect(errorResponse).toMatchObject({
      success: false,
      message: 'User validation failed',
      code: 'VALIDATION_ERROR',
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: 'Email is required'
        })
      ]),
      timestamp: expect.any(String)
    });
  });

  test('should handle edge cases gracefully', () => {
    // Test with undefined values
    expect(() => ResponseFormatter.success(undefined)).not.toThrow();
    expect(() => ResponseFormatter.error(undefined as any)).not.toThrow();

    // Test with complex nested objects
    const complexData = {
      user: { id: 1, profile: { settings: { theme: 'dark' } } },
      metadata: { timestamp: new Date(), version: '1.0' }
    };

    const response = ResponseFormatter.success(complexData);
    expect(response.data).toEqual(complexData);
  });
});