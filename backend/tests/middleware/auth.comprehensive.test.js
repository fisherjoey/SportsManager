/**
 * @fileoverview Comprehensive Authentication & Authorization Tests
 * Tests all authentication middleware functions with edge cases
 * Critical for security - any failure here compromises the entire system
 */

const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, requireAnyRole, hasRole } = require('../../src/middleware/auth');

// Mock response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn();

describe('Authentication Middleware - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('authenticateToken Function', () => {
    describe('Valid Token Cases', () => {
      it('should authenticate valid Bearer token', () => {
        const validToken = jwt.sign(
          { userId: 'user123', email: 'test@example.com', role: 'referee' },
          'test-secret-key',
          { expiresIn: '1h' }
        );

        const req = {
          headers: {
            authorization: `Bearer ${validToken}`
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(req.user).toBeDefined();
        expect(req.user.userId).toBe('user123');
        expect(req.user.email).toBe('test@example.com');
        expect(req.user.role).toBe('referee');
        expect(mockNext).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should handle token with roles array', () => {
        const tokenWithRoles = jwt.sign(
          { 
            userId: 'user123', 
            email: 'admin@example.com', 
            role: 'admin',
            roles: ['admin', 'referee']
          },
          'test-secret-key',
          { expiresIn: '1h' }
        );

        const req = {
          headers: {
            authorization: `Bearer ${tokenWithRoles}`
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(req.user.roles).toEqual(['admin', 'referee']);
        expect(req.user.role).toBe('admin');
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle token at expiration boundary', () => {
        // Create token that expires in 1 second
        const shortToken = jwt.sign(
          { userId: 'user123', role: 'referee' },
          'test-secret-key',
          { expiresIn: '1s' }
        );

        const req = {
          headers: {
            authorization: `Bearer ${shortToken}`
          }
        };
        const res = createMockResponse();

        // Should work immediately
        authenticateToken(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Invalid Token Cases', () => {
      it('should reject missing authorization header', () => {
        const req = { headers: {} };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject malformed authorization header', () => {
        const req = {
          headers: {
            authorization: 'InvalidFormat token123'
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject missing Bearer keyword', () => {
        const req = {
          headers: {
            authorization: 'token123'
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      });

      it('should reject empty Bearer token', () => {
        const req = {
          headers: {
            authorization: 'Bearer '
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      });

      it('should reject invalid JWT format', () => {
        const req = {
          headers: {
            authorization: 'Bearer invalid.jwt.token'
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject token with wrong secret', () => {
        const wrongSecretToken = jwt.sign(
          { userId: 'user123', role: 'referee' },
          'wrong-secret',
          { expiresIn: '1h' }
        );

        const req = {
          headers: {
            authorization: `Bearer ${wrongSecretToken}`
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      });

      it('should reject expired token', async () => {
        // Create already expired token
        const expiredToken = jwt.sign(
          { userId: 'user123', role: 'referee' },
          'test-secret-key',
          { expiresIn: '-1h' } // Expired 1 hour ago
        );

        const req = {
          headers: {
            authorization: `Bearer ${expiredToken}`
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle completely malformed token', () => {
        const req = {
          headers: {
            authorization: 'Bearer notajwttoken'
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      });
    });

    describe('Edge Cases', () => {
      it('should handle null authorization header', () => {
        const req = {
          headers: {
            authorization: null
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      });

      it('should handle undefined authorization header', () => {
        const req = {
          headers: {
            authorization: undefined
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
      });

      it('should handle case-sensitive Bearer keyword', () => {
        const validToken = jwt.sign({ userId: 'user123' }, 'test-secret-key');
        
        const req = {
          headers: {
            authorization: `bearer ${validToken}` // lowercase
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      });

      it('should handle extra spaces in authorization header', () => {
        const validToken = jwt.sign({ userId: 'user123' }, 'test-secret-key');
        
        const req = {
          headers: {
            authorization: `Bearer  ${validToken}` // Extra space
          }
        };
        const res = createMockResponse();

        authenticateToken(req, res, mockNext);

        // Should still work as split(' ')[1] handles multiple spaces
        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('requireRole Function', () => {
    describe('Valid Role Access', () => {
      it('should allow admin access to admin-only resource', () => {
        const req = {
          user: { userId: 'admin123', role: 'admin' }
        };
        const res = createMockResponse();
        const requireAdminRole = requireRole('admin');

        requireAdminRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow referee access to referee resource', () => {
        const req = {
          user: { userId: 'ref123', role: 'referee' }
        };
        const res = createMockResponse();
        const requireRefereeRole = requireRole('referee');

        requireRefereeRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow admin access to any role (admin privilege)', () => {
        const req = {
          user: { userId: 'admin123', role: 'admin' }
        };
        const res = createMockResponse();
        const requireRefereeRole = requireRole('referee');

        requireRefereeRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle roles array with required role', () => {
        const req = {
          user: { 
            userId: 'user123', 
            role: 'referee',
            roles: ['referee', 'evaluator']
          }
        };
        const res = createMockResponse();
        const requireEvaluatorRole = requireRole('evaluator');

        requireEvaluatorRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should prioritize roles array over legacy role field', () => {
        const req = {
          user: { 
            userId: 'user123', 
            role: 'referee', // Legacy field
            roles: ['evaluator'] // New field takes precedence
          }
        };
        const res = createMockResponse();
        const requireEvaluatorRole = requireRole('evaluator');

        requireEvaluatorRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Role Access Denied', () => {
      it('should deny referee access to admin resource', () => {
        const req = {
          user: { userId: 'ref123', role: 'referee' }
        };
        const res = createMockResponse();
        const requireAdminRole = requireRole('admin');

        requireAdminRole(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should deny access when user has no required role', () => {
        const req = {
          user: { 
            userId: 'user123', 
            role: 'referee',
            roles: ['referee']
          }
        };
        const res = createMockResponse();
        const requireEvaluatorRole = requireRole('evaluator');

        requireEvaluatorRole(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      });

      it('should deny access when user is null', () => {
        const req = { user: null };
        const res = createMockResponse();
        const requireAdminRole = requireRole('admin');

        requireAdminRole(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      });

      it('should deny access when user is undefined', () => {
        const req = {}; // No user property
        const res = createMockResponse();
        const requireAdminRole = requireRole('admin');

        requireAdminRole(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty roles array', () => {
        const req = {
          user: { 
            userId: 'user123', 
            role: 'referee',
            roles: [] // Empty array
          }
        };
        const res = createMockResponse();
        const requireRefereeRole = requireRole('referee');

        // Should fall back to legacy role field
        requireRefereeRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle null roles array', () => {
        const req = {
          user: { 
            userId: 'user123', 
            role: 'referee',
            roles: null
          }
        };
        const res = createMockResponse();
        const requireRefereeRole = requireRole('referee');

        requireRefereeRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle case-sensitive role names', () => {
        const req = {
          user: { userId: 'user123', role: 'Admin' } // Capital A
        };
        const res = createMockResponse();
        const requireAdminRole = requireRole('admin'); // lowercase

        requireAdminRole(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      });

      it('should handle special characters in role names', () => {
        const req = {
          user: { userId: 'user123', roles: ['referee-level-1'] }
        };
        const res = createMockResponse();
        const requireSpecialRole = requireRole('referee-level-1');

        requireSpecialRole(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('requireAnyRole Function', () => {
    describe('Multiple Role Access', () => {
      it('should allow access when user has first role', () => {
        const req = {
          user: { userId: 'user123', roles: ['referee', 'evaluator'] }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'mentor');

        requireAnyOfRoles(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow access when user has second role', () => {
        const req = {
          user: { userId: 'user123', roles: ['evaluator', 'mentor'] }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'mentor');

        requireAnyOfRoles(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow access when user has any of multiple roles', () => {
        const req = {
          user: { userId: 'user123', roles: ['referee'] }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'evaluator', 'mentor');

        requireAnyOfRoles(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow admin access regardless of specified roles', () => {
        const req = {
          user: { userId: 'admin123', role: 'admin', roles: ['admin'] }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'evaluator');

        requireAnyOfRoles(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should deny access when user has none of required roles', () => {
        const req = {
          user: { userId: 'user123', roles: ['observer'] }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'evaluator', 'mentor');

        requireAnyOfRoles(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      });
    });

    describe('Fallback to Legacy Role', () => {
      it('should check legacy role when roles array is empty', () => {
        const req = {
          user: { 
            userId: 'user123', 
            role: 'referee',
            roles: []
          }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'evaluator');

        requireAnyOfRoles(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should check legacy role when roles array is null', () => {
        const req = {
          user: { 
            userId: 'user123', 
            role: 'referee',
            roles: null
          }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'evaluator');

        requireAnyOfRoles(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Error Cases', () => {
      it('should handle no arguments', () => {
        const req = {
          user: { userId: 'user123', roles: ['referee'] }
        };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole(); // No roles specified

        requireAnyOfRoles(req, res, mockNext);

        // Should deny access as no roles match empty requirements
        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should handle null user', () => {
        const req = { user: null };
        const res = createMockResponse();
        const requireAnyOfRoles = requireAnyRole('referee', 'admin');

        requireAnyOfRoles(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      });
    });
  });

  describe('hasRole Helper Function', () => {
    describe('Role Detection', () => {
      it('should return true for user with matching role', () => {
        const user = { userId: 'user123', role: 'referee' };
        const result = hasRole(user, 'referee');
        expect(result).toBe(true);
      });

      it('should return false for user without matching role', () => {
        const user = { userId: 'user123', role: 'referee' };
        const result = hasRole(user, 'admin');
        expect(result).toBe(false);
      });

      it('should return true for admin regardless of requested role', () => {
        const user = { userId: 'admin123', role: 'admin' };
        const result = hasRole(user, 'referee');
        expect(result).toBe(true);
      });

      it('should check roles array when available', () => {
        const user = { 
          userId: 'user123', 
          role: 'referee',
          roles: ['referee', 'evaluator']
        };
        const result = hasRole(user, 'evaluator');
        expect(result).toBe(true);
      });

      it('should prioritize roles array over legacy role', () => {
        const user = { 
          userId: 'user123', 
          role: 'referee', // Legacy
          roles: ['evaluator'] // New system
        };
        const resultEvaluator = hasRole(user, 'evaluator');
        const resultReferee = hasRole(user, 'referee');
        
        expect(resultEvaluator).toBe(true);
        expect(resultReferee).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should return false for null user', () => {
        const result = hasRole(null, 'admin');
        expect(result).toBe(false);
      });

      it('should return false for undefined user', () => {
        const result = hasRole(undefined, 'admin');
        expect(result).toBe(false);
      });

      it('should return false for user with no role properties', () => {
        const user = { userId: 'user123' }; // No role or roles
        const result = hasRole(user, 'referee');
        expect(result).toBe(false);
      });

      it('should handle empty roles array', () => {
        const user = { 
          userId: 'user123', 
          role: 'referee',
          roles: []
        };
        const result = hasRole(user, 'referee');
        expect(result).toBe(true); // Falls back to legacy role
      });

      it('should handle null roles array', () => {
        const user = { 
          userId: 'user123', 
          role: 'referee',
          roles: null
        };
        const result = hasRole(user, 'referee');
        expect(result).toBe(true);
      });

      it('should be case-sensitive', () => {
        const user = { userId: 'user123', role: 'Admin' };
        const result = hasRole(user, 'admin');
        expect(result).toBe(false);
      });

      it('should handle special characters in role names', () => {
        const user = { userId: 'user123', roles: ['referee-level-2'] };
        const result = hasRole(user, 'referee-level-2');
        expect(result).toBe(true);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', () => {
      // Step 1: Authenticate token
      const validToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com', roles: ['referee', 'evaluator'] },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const req = {
        headers: { authorization: `Bearer ${validToken}` }
      };
      const res = createMockResponse();

      // Step 2: Authenticate
      authenticateToken(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();

      // Step 3: Check role authorization
      const requireRefereeRole = requireRole('referee');
      jest.clearAllMocks();

      requireRefereeRole(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle authentication success but authorization failure', () => {
      const validToken = jwt.sign(
        { userId: 'user123', role: 'referee' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const req = {
        headers: { authorization: `Bearer ${validToken}` }
      };
      const res = createMockResponse();

      // Authenticate successfully
      authenticateToken(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Fail authorization
      const requireAdminRole = requireRole('admin');
      jest.clearAllMocks();

      requireAdminRole(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });
});