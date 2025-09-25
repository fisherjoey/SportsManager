/**
 * Tests for Sanitization Middleware
 */

import { Request, Response, NextFunction } from 'express';

// Import the sanitization module to test
const sanitizationModule = require('../sanitization');

describe('Sanitization Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      method: 'POST',
      headers: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('sanitizeString', () => {
    const { sanitizeString } = sanitizationModule;

    it('should remove script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      expect(sanitizeString(malicious)).toBe('Hello');
    });

    it('should remove iframe tags', () => {
      const malicious = '<iframe src="evil.com"></iframe>Safe content';
      expect(sanitizeString(malicious)).toBe('Safe content');
    });

    it('should remove object and embed tags', () => {
      const malicious = '<object data="evil.swf"></object><embed src="evil.swf">Text';
      expect(sanitizeString(malicious)).toBe('Text');
    });

    it('should remove link and meta tags', () => {
      const malicious = '<link rel="stylesheet" href="evil.css"><meta name="evil">Content';
      expect(sanitizeString(malicious)).toBe('Content');
    });

    it('should remove javascript: protocols', () => {
      const malicious = 'javascript:alert("xss")';
      expect(sanitizeString(malicious)).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const malicious = 'onclick=alert("xss") onload=evil()';
      expect(sanitizeString(malicious)).toBe('alert("xss") evil()');
    });

    it('should remove data:text/html protocols', () => {
      const malicious = 'data:text/html,<script>alert(1)</script>';
      expect(sanitizeString(malicious)).toBe(',<script>alert(1)</script>');
    });

    it('should remove SQL injection patterns', () => {
      const malicious = "'; DROP TABLE users; --";
      expect(sanitizeString(malicious)).toBe("'; TABLE users; --");
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeString(123 as any)).toBe(123);
      expect(sanitizeString(null as any)).toBe(null);
      expect(sanitizeString(undefined as any)).toBe(undefined);
      expect(sanitizeString(true as any)).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should preserve safe content', () => {
      const safe = 'This is a safe string with numbers 123 and symbols @#$%';
      expect(sanitizeString(safe)).toBe(safe);
    });
  });

  describe('sanitizeObject', () => {
    const { sanitizeObject } = sanitizationModule;

    it('should sanitize string values in objects', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com'
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('should sanitize arrays', () => {
      const input = ['<script>alert("xss")</script>', 'safe string'];
      const result = sanitizeObject(input);
      expect(result[0]).toBe('');
      expect(result[1]).toBe('safe string');
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<script>alert("xss")</script>John',
          profile: {
            bio: 'javascript:alert("bio")'
          }
        }
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('John');
      expect(result.user.profile.bio).toBe('alert("bio")');
    });

    it('should sanitize object keys', () => {
      const input = {
        'javascript:alert("key")': 'value',
        'normal_key': 'normal_value'
      };
      const result = sanitizeObject(input);
      expect(result['alert("key")']).toBe('value');
      expect(result['normal_key']).toBe('normal_value');
    });

    it('should preserve non-string primitive values', () => {
      const input = {
        number: 123,
        boolean: true,
        null_value: null,
        undefined_value: undefined
      };
      const result = sanitizeObject(input);
      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
      expect(result.null_value).toBe(null);
      expect(result.undefined_value).toBe(undefined);
    });

    it('should handle circular references gracefully', () => {
      const input: any = { name: 'test' };
      input.self = input;

      // Should not throw an error (though behavior may vary)
      expect(() => sanitizeObject(input)).not.toThrow();
    });
  });

  describe('sanitizeBody middleware', () => {
    const { sanitizeBody } = sanitizationModule;

    it('should sanitize request body', () => {
      mockReq.body = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com'
      };

      sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.email).toBe('john@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      mockReq.body = undefined;

      expect(() => {
        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-object body', () => {
      mockReq.body = 'string body';

      sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toBe('string body');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeQuery middleware', () => {
    const { sanitizeQuery } = sanitizationModule;

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: '<script>alert("xss")</script>term',
        filter: 'safe value'
      };

      sanitizeQuery(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.search).toBe('term');
      expect(mockReq.query.filter).toBe('safe value');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeParams middleware', () => {
    const { sanitizeParams } = sanitizationModule;

    it('should sanitize URL parameters', () => {
      mockReq.params = {
        id: '123',
        slug: '<script>alert("xss")</script>safe-slug'
      };

      sanitizeParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.params.id).toBe('123');
      expect(mockReq.params.slug).toBe('safe-slug');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeAll middleware', () => {
    const { sanitizeAll } = sanitizationModule;

    it('should sanitize body, query, and params', () => {
      mockReq.body = { name: '<script>alert("body")</script>John' };
      mockReq.query = { search: '<script>alert("query")</script>term' };
      mockReq.params = { id: '<script>alert("params")</script>123' };

      sanitizeAll(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.query.search).toBe('term');
      expect(mockReq.params.id).toBe('123');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateIdParam', () => {
    const { validateIdParam } = sanitizationModule;

    it('should validate and convert valid ID parameters', () => {
      mockReq.params = { id: '123' };

      validateIdParam()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.params.id).toBe(123);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid ID parameters', () => {
      mockReq.params = { id: 'invalid' };

      validateIdParam()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid id parameter',
        message: 'id must be a positive integer'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject negative ID parameters', () => {
      mockReq.params = { id: '-1' };

      validateIdParam()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject zero ID parameters', () => {
      mockReq.params = { id: '0' };

      validateIdParam()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject very large ID parameters', () => {
      mockReq.params = { id: '2147483648' }; // Larger than max int32

      validateIdParam()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate custom parameter names', () => {
      mockReq.params = { userId: '456' };

      validateIdParam('userId')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.params.userId).toBe(456);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateUuidParam', () => {
    const { validateUuidParam } = sanitizationModule;

    it('should validate valid UUID parameters', () => {
      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      validateUuidParam()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid UUID parameters', () => {
      mockReq.params = { id: 'invalid-uuid' };

      validateUuidParam()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid id parameter',
        message: 'id must be a valid UUID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate custom parameter names', () => {
      mockReq.params = { sessionId: '550e8400-e29b-41d4-a716-446655440000' };

      validateUuidParam('sessionId')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateContentType', () => {
    const { validateContentType } = sanitizationModule;

    it('should allow valid content types', () => {
      mockReq.headers = { 'content-type': 'application/json' };

      validateContentType()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid content types', () => {
      mockReq.headers = { 'content-type': 'text/plain' };

      validateContentType()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unsupported Media Type',
        allowed: ['application/json']
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip validation for GET requests', () => {
      mockReq.method = 'GET';
      mockReq.headers = {};

      validateContentType()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip validation for DELETE requests', () => {
      mockReq.method = 'DELETE';
      mockReq.headers = {};

      validateContentType()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject missing content-type header for POST requests', () => {
      mockReq.headers = {};

      validateContentType()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Content-Type header is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept custom allowed types', () => {
      mockReq.headers = { 'content-type': 'application/xml' };

      validateContentType(['application/xml'])(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    const { validateQuery } = sanitizationModule;

    it('should validate pagination query parameters', () => {
      mockReq.query = { page: '2', limit: '25' };

      validateQuery('pagination')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.page).toBe(2);
      expect(mockReq.query.limit).toBe(25);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should apply default values for missing parameters', () => {
      mockReq.query = {};

      validateQuery('pagination')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.page).toBe(1);
      expect(mockReq.query.limit).toBe(50);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid query parameters', () => {
      mockReq.query = { page: 'invalid', limit: '25' };

      validateQuery('pagination')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid query parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
            message: expect.stringContaining('number')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unknown query parameters', () => {
      mockReq.query = { page: '1', limit: '25', unknown_param: 'value' };

      validateQuery('pagination')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unknown schema gracefully', () => {
      // Mock console.error to avoid noise in tests
      const originalConsoleError = console.error;
      console.error = jest.fn();

      validateQuery('unknown_schema')(mockReq as Request, mockRes as Response, mockNext);

      expect(console.error).toHaveBeenCalledWith('Unknown query validation schema: unknown_schema');
      expect(mockNext).toHaveBeenCalled();

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should validate games filter parameters', () => {
      mockReq.query = {
        status: 'assigned',
        level: 'Competitive',
        date_from: '2023-01-01T00:00:00.000Z'
      };

      validateQuery('gamesFilter')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.status).toBe('assigned');
      expect(mockReq.query.level).toBe('Competitive');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate search parameters', () => {
      mockReq.query = {
        q: 'search term',
        type: 'games',
        page: '1'
      };

      validateQuery('search')(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.q).toBe('search term');
      expect(mockReq.query.type).toBe('games');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Module exports', () => {
    it('should export all required functions', () => {
      expect(sanitizationModule).toHaveProperty('sanitizeString');
      expect(sanitizationModule).toHaveProperty('sanitizeObject');
      expect(sanitizationModule).toHaveProperty('sanitizeBody');
      expect(sanitizationModule).toHaveProperty('sanitizeQuery');
      expect(sanitizationModule).toHaveProperty('sanitizeParams');
      expect(sanitizationModule).toHaveProperty('sanitizeAll');
      expect(sanitizationModule).toHaveProperty('validateQuery');
      expect(sanitizationModule).toHaveProperty('validateIdParam');
      expect(sanitizationModule).toHaveProperty('validateUuidParam');
      expect(sanitizationModule).toHaveProperty('validateContentType');
      expect(sanitizationModule).toHaveProperty('queryValidationSchemas');
    });

    it('should export validation schemas', () => {
      const { queryValidationSchemas } = sanitizationModule;

      expect(queryValidationSchemas).toHaveProperty('pagination');
      expect(queryValidationSchemas).toHaveProperty('gamesFilter');
      expect(queryValidationSchemas).toHaveProperty('refereeFilter');
      expect(queryValidationSchemas).toHaveProperty('assignmentFilter');
      expect(queryValidationSchemas).toHaveProperty('search');
    });
  });
});