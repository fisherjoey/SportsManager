const { ResponseFormatter, asyncHandler, HTTP_STATUS } = require('../../src/utils/response-formatters');

describe('ResponseFormatter', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };
  });

  describe('success', () => {
    it('should format basic success response', () => {
      const data = { id: 1, name: 'Test' };
      const result = ResponseFormatter.success(data);

      expect(result).toMatchObject({
        success: true,
        data,
        timestamp: expect.any(String)
      });
    });

    it('should include message when provided', () => {
      const result = ResponseFormatter.success(null, 'Operation successful');

      expect(result).toMatchObject({
        success: true,
        message: 'Operation successful',
        timestamp: expect.any(String)
      });
    });

    it('should include metadata when provided', () => {
      const meta = { version: '1.0', requestId: '123' };
      const result = ResponseFormatter.success(null, null, meta);

      expect(result).toMatchObject({
        success: true,
        meta,
        timestamp: expect.any(String)
      });
    });

    it('should handle null data', () => {
      const result = ResponseFormatter.success(null);

      expect(result).toMatchObject({
        success: true,
        timestamp: expect.any(String)
      });
      expect(result).not.toHaveProperty('data');
    });

    it('should include all parameters when provided', () => {
      const data = { test: true };
      const message = 'Success';
      const meta = { count: 1 };

      const result = ResponseFormatter.success(data, message, meta);

      expect(result).toMatchObject({
        success: true,
        data,
        message,
        meta,
        timestamp: expect.any(String)
      });
    });
  });

  describe('error', () => {
    it('should format basic error response', () => {
      const result = ResponseFormatter.error('Something went wrong');

      expect(result).toMatchObject({
        success: false,
        message: 'Something went wrong',
        timestamp: expect.any(String)
      });
    });

    it('should include details when provided', () => {
      const details = { field: 'email', issue: 'required' };
      const result = ResponseFormatter.error('Validation failed', details);

      expect(result).toMatchObject({
        success: false,
        message: 'Validation failed',
        details,
        timestamp: expect.any(String)
      });
    });

    it('should include error code when provided', () => {
      const result = ResponseFormatter.error('Not found', null, 'NOT_FOUND');

      expect(result).toMatchObject({
        success: false,
        message: 'Not found',
        code: 'NOT_FOUND',
        timestamp: expect.any(String)
      });
    });

    it('should include errors array when provided', () => {
      const errors = [
        { field: 'email', message: 'Invalid format' },
        { field: 'name', message: 'Required' }
      ];
      const result = ResponseFormatter.error('Validation failed', null, 'VALIDATION_ERROR', errors);

      expect(result).toMatchObject({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors,
        timestamp: expect.any(String)
      });
    });

    it('should handle null details', () => {
      const result = ResponseFormatter.error('Error', null);

      expect(result).toMatchObject({
        success: false,
        message: 'Error',
        timestamp: expect.any(String)
      });
      expect(result).not.toHaveProperty('details');
    });
  });

  describe('paginated', () => {
    it('should format paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        totalCount: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPrevPage: false
      };

      const result = ResponseFormatter.paginated(data, pagination);

      expect(result).toMatchObject({
        success: true,
        data,
        pagination,
        timestamp: expect.any(String)
      });
    });

    it('should apply default pagination values', () => {
      const data = [];
      const pagination = {};

      const result = ResponseFormatter.paginated(data, pagination);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      });
    });

    it('should include message when provided', () => {
      const result = ResponseFormatter.paginated([], {}, 'Retrieved successfully');

      expect(result).toMatchObject({
        success: true,
        message: 'Retrieved successfully',
        timestamp: expect.any(String)
      });
    });
  });

  describe('created', () => {
    it('should format created response with default message', () => {
      const data = { id: 1, name: 'New Item' };
      const result = ResponseFormatter.created(data);

      expect(result).toMatchObject({
        success: true,
        data,
        message: 'Resource created successfully',
        timestamp: expect.any(String)
      });
    });

    it('should include custom message', () => {
      const result = ResponseFormatter.created({}, 'User created');

      expect(result).toMatchObject({
        success: true,
        message: 'User created',
        timestamp: expect.any(String)
      });
    });

    it('should include location when provided', () => {
      const result = ResponseFormatter.created({}, 'Created', '/api/users/123');

      expect(result).toMatchObject({
        success: true,
        message: 'Created',
        location: '/api/users/123',
        timestamp: expect.any(String)
      });
    });
  });

  describe('updated', () => {
    it('should format updated response', () => {
      const data = { id: 1, name: 'Updated Item' };
      const result = ResponseFormatter.updated(data);

      expect(result).toMatchObject({
        success: true,
        data,
        message: 'Resource updated successfully',
        timestamp: expect.any(String)
      });
    });

    it('should include custom message', () => {
      const result = ResponseFormatter.updated({}, 'User updated');

      expect(result).toMatchObject({
        success: true,
        message: 'User updated',
        timestamp: expect.any(String)
      });
    });
  });

  describe('deleted', () => {
    it('should format deleted response with default message', () => {
      const result = ResponseFormatter.deleted();

      expect(result).toMatchObject({
        success: true,
        message: 'Resource deleted successfully',
        timestamp: expect.any(String)
      });
    });

    it('should include custom message and data', () => {
      const data = { deletedId: 123 };
      const result = ResponseFormatter.deleted('User deleted', data);

      expect(result).toMatchObject({
        success: true,
        data,
        message: 'User deleted',
        timestamp: expect.any(String)
      });
    });
  });

  describe('validationError', () => {
    it('should format Joi validation errors', () => {
      const joiErrors = [
        {
          path: ['email'],
          message: 'Email is required',
          context: { value: '' }
        },
        {
          path: ['name', 'first'],
          message: 'First name is required',
          context: { value: undefined }
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
            value: ''
          },
          {
            field: 'name.first',
            message: 'First name is required',
            value: undefined
          }
        ],
        timestamp: expect.any(String)
      });
    });

    it('should format custom validation errors object', () => {
      const customErrors = {
        email: 'Invalid email format',
        password: 'Password too weak'
      };

      const result = ResponseFormatter.validationError(customErrors);

      expect(result).toMatchObject({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too weak' }
        ],
        timestamp: expect.any(String)
      });
    });

    it('should handle custom message', () => {
      const result = ResponseFormatter.validationError([], 'Request invalid');

      expect(result).toMatchObject({
        success: false,
        message: 'Request invalid',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String)
      });
    });
  });

  describe('notFound', () => {
    it('should format not found response with default message', () => {
      const result = ResponseFormatter.notFound();

      expect(result).toMatchObject({
        success: false,
        message: 'Resource not found',
        code: 'NOT_FOUND',
        timestamp: expect.any(String)
      });
    });

    it('should format not found with resource name', () => {
      const result = ResponseFormatter.notFound('User');

      expect(result).toMatchObject({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
        timestamp: expect.any(String)
      });
    });

    it('should include identifier in message', () => {
      const result = ResponseFormatter.notFound('Game', '123');

      expect(result).toMatchObject({
        success: false,
        message: "Game with identifier '123' not found",
        code: 'NOT_FOUND',
        timestamp: expect.any(String)
      });
    });
  });

  describe('unauthorized', () => {
    it('should format unauthorized response with default message', () => {
      const result = ResponseFormatter.unauthorized();

      expect(result).toMatchObject({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(String)
      });
    });

    it('should include custom message', () => {
      const result = ResponseFormatter.unauthorized('Invalid token');

      expect(result).toMatchObject({
        success: false,
        message: 'Invalid token',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(String)
      });
    });
  });

  describe('forbidden', () => {
    it('should format forbidden response', () => {
      const result = ResponseFormatter.forbidden('Insufficient permissions');

      expect(result).toMatchObject({
        success: false,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        timestamp: expect.any(String)
      });
    });
  });

  describe('conflict', () => {
    it('should format conflict response', () => {
      const details = { email: 'user@example.com' };
      const result = ResponseFormatter.conflict('Email already exists', details);

      expect(result).toMatchObject({
        success: false,
        message: 'Email already exists',
        details,
        code: 'CONFLICT',
        timestamp: expect.any(String)
      });
    });
  });

  describe('serverError', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should format server error in development', () => {
      process.env.NODE_ENV = 'development';
      const details = { stack: 'Error stack trace' };
      
      const result = ResponseFormatter.serverError('Database error', details);

      expect(result).toMatchObject({
        success: false,
        message: 'Database error',
        details,
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: expect.any(String)
      });
    });

    it('should hide details in production', () => {
      process.env.NODE_ENV = 'production';
      const details = { stack: 'Error stack trace' };
      
      const result = ResponseFormatter.serverError('Database error', details);

      expect(result).toMatchObject({
        success: false,
        message: 'Database error',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: expect.any(String)
      });
      expect(result).not.toHaveProperty('details');
    });

    it('should use default message', () => {
      const result = ResponseFormatter.serverError();

      expect(result).toMatchObject({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: expect.any(String)
      });
    });
  });

  describe('send', () => {
    it('should send response with status code', () => {
      const responseData = { success: true };
      
      ResponseFormatter.send(mockRes, 200, responseData);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(responseData);
    });
  });

  describe('sendSuccess', () => {
    it('should send success response with default status', () => {
      const data = { test: true };
      
      ResponseFormatter.sendSuccess(mockRes, data, 'Success');

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data,
        message: 'Success'
      }));
    });

    it('should send success response with custom status', () => {
      ResponseFormatter.sendSuccess(mockRes, null, null, 202);

      expect(mockRes.status).toHaveBeenCalledWith(202);
    });
  });

  describe('sendCreated', () => {
    it('should send created response', () => {
      const data = { id: 1 };
      
      ResponseFormatter.sendCreated(mockRes, data, 'Created', '/api/items/1');

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data,
        message: 'Created',
        location: '/api/items/1'
      }));
    });
  });

  describe('sendPaginated', () => {
    it('should send paginated response', () => {
      const data = [{ id: 1 }];
      const pagination = { page: 1, limit: 10, totalCount: 1 };
      
      ResponseFormatter.sendPaginated(mockRes, data, pagination);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data,
        pagination: expect.objectContaining(pagination)
      }));
    });
  });

  describe('sendValidationError', () => {
    it('should send validation error response', () => {
      const errors = [{ field: 'email', message: 'Required' }];
      
      ResponseFormatter.sendValidationError(mockRes, errors);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'VALIDATION_ERROR'
      }));
    });
  });

  describe('sendNotFound', () => {
    it('should send not found response', () => {
      ResponseFormatter.sendNotFound(mockRes, 'User', '123');

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'NOT_FOUND',
        message: "User with identifier '123' not found"
      }));
    });
  });

  describe('sendUnauthorized', () => {
    it('should send unauthorized response', () => {
      ResponseFormatter.sendUnauthorized(mockRes, 'Invalid token');

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Invalid token'
      }));
    });
  });

  describe('sendForbidden', () => {
    it('should send forbidden response', () => {
      ResponseFormatter.sendForbidden(mockRes, 'Admin required');

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'FORBIDDEN',
        message: 'Admin required'
      }));
    });
  });

  describe('sendServerError', () => {
    it('should send server error response', () => {
      ResponseFormatter.sendServerError(mockRes, 'Database error', 'Connection failed');

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database error'
      }));
    });
  });
});

describe('asyncHandler', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };
    mockNext = jest.fn();
  });

  it('should execute handler successfully', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = [{ field: 'email', message: 'Required' }];

    const handler = jest.fn().mockRejectedValue(validationError);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'VALIDATION_ERROR'
    }));
  });

  it('should handle not found errors', async () => {
    const notFoundError = new Error('User not found');
    const handler = jest.fn().mockRejectedValue(notFoundError);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false
    }));
  });

  it('should handle generic errors', async () => {
    const genericError = new Error('Something went wrong');
    const handler = jest.fn().mockRejectedValue(genericError);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'INTERNAL_SERVER_ERROR'
    }));
  });

  it('should call next if response already sent', async () => {
    mockRes.headersSent = true;
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should log errors to console', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    const wrappedHandler = asyncHandler(handler);

    await wrappedHandler(mockReq, mockRes, mockNext);

    expect(consoleSpy).toHaveBeenCalledWith('Route handler error:', error);
    consoleSpy.mockRestore();
  });
});

describe('HTTP_STATUS', () => {
  it('should export common HTTP status codes', () => {
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