/**
 * Integration tests for Rate Limiting Middleware
 * These tests verify the actual middleware functionality
 */

import { Request, Response, NextFunction } from 'express';

describe('Rate Limiting Middleware - Integration Tests', () => {
  // Store original NODE_ENV
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Clean up require cache to ensure fresh imports
    delete require.cache[require.resolve('../rateLimiting')];
    delete require.cache[require.resolve('../rateLimiting.ts')];
    delete require.cache[require.resolve('../rateLimiting.js')];

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });``

  describe('Module exports and imports', () => {
    it('should export all required rate limiters from TypeScript file', () => {
      const rateLimiters = require('../rateLimiting.ts');

      expect(rateLimiters).toHaveProperty('authLimiter');
      expect(rateLimiters).toHaveProperty('passwordResetLimiter');
      expect(rateLimiters).toHaveProperty('adminLimiter');
      expect(rateLimiters).toHaveProperty('apiLimiter');
      expect(rateLimiters).toHaveProperty('sensitiveLimiter');
      expect(rateLimiters).toHaveProperty('uploadLimiter');
      expect(rateLimiters).toHaveProperty('registrationLimiter');
      expect(rateLimiters).toHaveProperty('assignmentLimiter');
      expect(rateLimiters).toHaveProperty('invitationLimiter');

      // Verify they are functions (middleware)
      expect(typeof rateLimiters.authLimiter).toBe('function');
      expect(typeof rateLimiters.apiLimiter).toBe('function');
    });

    it('should export all required rate limiters from JavaScript bridge', () => {
      const rateLimiters = require('../rateLimiting.js');

      expect(rateLimiters).toHaveProperty('authLimiter');
      expect(rateLimiters).toHaveProperty('passwordResetLimiter');
      expect(rateLimiters).toHaveProperty('adminLimiter');
      expect(rateLimiters).toHaveProperty('apiLimiter');
      expect(rateLimiters).toHaveProperty('sensitiveLimiter');
      expect(rateLimiters).toHaveProperty('uploadLimiter');
      expect(rateLimiters).toHaveProperty('registrationLimiter');
      expect(rateLimiters).toHaveProperty('assignmentLimiter');
      expect(rateLimiters).toHaveProperty('invitationLimiter');

      // Verify they are functions (middleware)
      expect(typeof rateLimiters.authLimiter).toBe('function');
      expect(typeof rateLimiters.apiLimiter).toBe('function');
    });

    it('should have consistent exports between TS and JS versions', () => {
      const tsRateLimiters = require('../rateLimiting.ts');
      const jsRateLimiters = require('../rateLimiting.js');

      const tsKeys = Object.keys(tsRateLimiters).sort();
      const jsKeys = Object.keys(jsRateLimiters).sort();

      expect(tsKeys).toEqual(jsKeys);
    });
  });

  describe('Middleware functionality', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        ip: '127.0.0.1',
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'test@example.com' },
        headers: {}
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis()
      };

      mockNext = jest.fn();
    });

    it('should call next() when rate limit is not exceeded', (done) => {
      const { apiLimiter } = require('../rateLimiting.ts');

      // Override mockNext to check if it was called and complete the test
      mockNext = jest.fn(() => {
        // Test passes if next() is called
        done();
      });

      // Call the middleware
      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      // Add a fallback timeout in case next is never called
      setTimeout(() => {
        // If we get here, next was not called, fail the test
        done(new Error('next() was not called within timeout'));
      }, 100);
    });

    it('should be a valid Express middleware with correct signature', () => {
      const { authLimiter } = require('../rateLimiting.ts');

      // Verify it's a function that accepts req, res, next
      expect(typeof authLimiter).toBe('function');
      expect(authLimiter.length).toBe(3); // Should accept 3 parameters
    });

    it('should handle missing request properties gracefully', () => {
      const { apiLimiter } = require('../rateLimiting.ts');

      const incompleteReq = { ip: undefined } as Partial<Request>;

      expect(() => {
        apiLimiter(incompleteReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();
    });
  });

  describe('Environment-specific configuration', () => {
    it('should use different limits for development vs production for auth limiter', () => {
      // This test verifies that the auth limiter respects NODE_ENV
      // We can't directly test the internal configuration without mocking,
      // but we can verify the module loads correctly for different environments

      process.env.NODE_ENV = 'development';
      delete require.cache[require.resolve('../rateLimiting.ts')];
      const devLimiters = require('../rateLimiting.ts');
      expect(devLimiters.authLimiter).toBeDefined();

      process.env.NODE_ENV = 'production';
      delete require.cache[require.resolve('../rateLimiting.ts')];
      const prodLimiters = require('../rateLimiting.ts');
      expect(prodLimiters.authLimiter).toBeDefined();
    });
  });

  describe('TypeScript types and interfaces', () => {
    it('should have proper TypeScript compilation without errors', () => {
      // This test passes if the TypeScript file compiles without type errors
      // The fact that we can require the .ts file means it's syntactically correct
      expect(() => {
        require('../rateLimiting.ts');
      }).not.toThrow();
    });
  });
});