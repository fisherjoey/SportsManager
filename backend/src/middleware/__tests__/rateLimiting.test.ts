/**
 * Tests for Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Mock express-rate-limit
jest.mock('express-rate-limit');
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;

// Import the rate limiters to test - use dynamic import for TypeScript
let rateLimitingModule: any;

describe('Rate Limiting Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let rateLimiterMiddleware: jest.Mock;

  beforeAll(async () => {
    // Load the module once before all tests
    jest.isolateModules(() => {
      rateLimitingModule = require('../rateLimiting');
    });
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock the middleware function that rate limiters return
    rateLimiterMiddleware = jest.fn();
    mockRateLimit.mockReturnValue(rateLimiterMiddleware);

    // Setup mock request, response, and next
    mockReq = {
      ip: '127.0.0.1',
      body: {},
      user: undefined,
      path: '/api/test',
      method: 'POST'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('authLimiter', () => {
    it('should be configured with correct options for development', () => {
      // Set development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Re-require to get fresh configuration
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 50, // More permissive in development
          message: {
            error: 'Too many authentication attempts',
            retryAfter: '15 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false,
          skipFailedRequests: false
        })
      );

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should be configured with correct options for production', () => {
      // Set production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Re-require to get fresh configuration
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 5, // Stricter in production
          message: {
            error: 'Too many authentication attempts',
            retryAfter: '15 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false,
          skipFailedRequests: false
        })
      );

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should generate correct key for authenticated requests', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      const authLimiterCall = mockRateLimit.mock.calls.find(call =>
        call[0].message?.error === 'Too many authentication attempts'
      );

      expect(authLimiterCall).toBeDefined();
      const keyGenerator = authLimiterCall![0].keyGenerator;

      // Test with email in body
      const reqWithEmail = { ip: '192.168.1.1', body: { email: 'test@example.com' } };
      expect(keyGenerator(reqWithEmail as Request)).toBe('192.168.1.1:test@example.com');

      // Test without email
      const reqWithoutEmail = { ip: '192.168.1.1', body: {} };
      expect(keyGenerator(reqWithoutEmail as Request)).toBe('192.168.1.1:anonymous');
    });
  });

  describe('passwordResetLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 3, // 3 attempts per hour
          message: {
            error: 'Too many password reset attempts',
            retryAfter: '1 hour'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should generate correct key for password reset requests', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      const passwordResetCall = mockRateLimit.mock.calls.find(call =>
        call[0].message?.error === 'Too many password reset attempts'
      );

      expect(passwordResetCall).toBeDefined();
      const keyGenerator = passwordResetCall![0].keyGenerator;

      const reqWithEmail = { ip: '10.0.0.1', body: { email: 'reset@example.com' } };
      expect(keyGenerator(reqWithEmail as Request)).toBe('10.0.0.1:reset@example.com');
    });
  });

  describe('adminLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 5 * 60 * 1000, // 5 minutes
          max: 50, // 50 operations per 5 minutes
          message: {
            error: 'Too many administrative operations',
            retryAfter: '5 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should skip rate limiting for non-admin users', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      const adminLimiterCall = mockRateLimit.mock.calls.find(call =>
        call[0].message?.error === 'Too many administrative operations'
      );

      expect(adminLimiterCall).toBeDefined();
      const skipFunction = adminLimiterCall![0].skip;

      // Test non-authenticated user
      const reqNoUser = { user: undefined };
      expect(skipFunction(reqNoUser as Request, mockRes as Response)).toBe(true);

      // Test non-admin user with role
      const reqRegularUser = { user: { role: 'user', roles: ['user'] } };
      expect(skipFunction(reqRegularUser as Request, mockRes as Response)).toBe(true);

      // Test admin user with role property
      const reqAdminUser = { user: { role: 'admin', roles: ['admin'] } };
      expect(skipFunction(reqAdminUser as Request, mockRes as Response)).toBe(false);

      // Test admin user with roles array
      const reqAdminRoles = { user: { roles: ['admin', 'user'] } };
      expect(skipFunction(reqAdminRoles as Request, mockRes as Response)).toBe(false);
    });
  });

  describe('apiLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000, // 1000 requests per 15 minutes
          message: {
            error: 'Too many requests',
            retryAfter: '15 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });
  });

  describe('sensitiveLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 1000, // 1 minute
          max: 10, // 10 requests per minute
          message: {
            error: 'Too many requests to sensitive endpoint',
            retryAfter: '1 minute'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });
  });

  describe('uploadLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 1000, // 1 minute
          max: 5, // 5 uploads per minute
          message: {
            error: 'Too many upload attempts',
            retryAfter: '1 minute'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });
  });

  describe('registrationLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 5, // 5 registrations per hour
          message: {
            error: 'Too many registration attempts',
            retryAfter: '1 hour'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });
  });

  describe('assignmentLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 1000, // 1 minute
          max: 20, // 20 operations per minute
          message: {
            error: 'Too many assignment operations',
            retryAfter: '1 minute'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });
  });

  describe('invitationLimiter', () => {
    it('should be configured with correct options', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 50, // 50 invitations per hour
          message: {
            error: 'Too many invitation requests',
            retryAfter: '1 hour'
          },
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });
  });

  describe('Module exports', () => {
    it('should export all rate limiters', () => {
      delete require.cache[require.resolve('../rateLimiting')];
      const rateLimiters = require('../rateLimiting');

      expect(rateLimiters).toHaveProperty('authLimiter');
      expect(rateLimiters).toHaveProperty('passwordResetLimiter');
      expect(rateLimiters).toHaveProperty('adminLimiter');
      expect(rateLimiters).toHaveProperty('apiLimiter');
      expect(rateLimiters).toHaveProperty('sensitiveLimiter');
      expect(rateLimiters).toHaveProperty('uploadLimiter');
      expect(rateLimiters).toHaveProperty('registrationLimiter');
      expect(rateLimiters).toHaveProperty('assignmentLimiter');
      expect(rateLimiters).toHaveProperty('invitationLimiter');
    });

    it('should have consistent message format across all limiters', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      mockRateLimit.mock.calls.forEach((call) => {
        const config = call[0];
        expect(config.message).toHaveProperty('error');
        expect(config.message).toHaveProperty('retryAfter');
        expect(typeof config.message.error).toBe('string');
        expect(typeof config.message.retryAfter).toBe('string');
      });
    });

    it('should have standard headers enabled and legacy headers disabled', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      mockRateLimit.mock.calls.forEach((call) => {
        const config = call[0];
        expect(config.standardHeaders).toBe(true);
        expect(config.legacyHeaders).toBe(false);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle missing user gracefully in key generators', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      const authLimiterCall = mockRateLimit.mock.calls.find(call =>
        call[0].message?.error === 'Too many authentication attempts'
      );

      const keyGenerator = authLimiterCall![0].keyGenerator;
      const reqNoBody = { ip: '1.1.1.1' };

      expect(() => keyGenerator(reqNoBody as Request)).not.toThrow();
      expect(keyGenerator(reqNoBody as Request)).toBe('1.1.1.1:anonymous');
    });

    it('should handle missing roles array gracefully in admin skip function', () => {
      jest.isolateModules(() => {
        require('../rateLimiting');
      });

      const adminLimiterCall = mockRateLimit.mock.calls.find(call =>
        call[0].message?.error === 'Too many administrative operations'
      );

      const skipFunction = adminLimiterCall![0].skip;
      const reqNoRoles = { user: { role: 'admin' } };

      expect(() => skipFunction(reqNoRoles as Request, mockRes as Response)).not.toThrow();
      expect(skipFunction(reqNoRoles as Request, mockRes as Response)).toBe(false);
    });
  });
});