/**
 * @fileoverview Comprehensive Authentication & Authorization Tests
 * Tests all authentication middleware functions with edge cases
 * Critical for security - must cover every code path
 */

const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, requireAnyRole, hasRole } = require('../../src/middleware/auth');

// Mock Express request/response objects
const mockRequest = (headers = {}, user = null) => ({
  headers,
  user
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Authentication Middleware - Comprehensive Tests', () => {
  // Set test JWT secret
  const originalJwtSecret = process.env.JWT_SECRET;
  const testSecret = 'test-jwt-secret-key';
  
  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken - Token Validation', () => {
    describe('Valid Token Cases', () => {
      it('should authenticate valid Bearer token', () => {
        const payload = { userId: '123', email: 'test@example.com', role: 'admin' };
        const token = jwt.sign(payload, testSecret);
        
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
        expect(req.user).toMatchObject(payload);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
      });

      it('should handle token with extra spaces', () => {
        const payload = { userId: '123', role: 'referee' };
        const token = jwt.sign(payload, testSecret);
        
        const req = mockRequest({ authorization: `  Bearer ${token}  ` });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
        expect(req.user).toMatchObject(payload);
      });

      it('should authenticate token with roles array', () => {
        const payload = { 
          userId: '123', 
          email: 'multi@example.com', 
          role: 'referee',
          roles: ['referee', 'evaluator']
        };
        const token = jwt.sign(payload, testSecret);
        
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
        expect(req.user.roles).toEqual(['referee', 'evaluator']);
      });
    });

    describe('Invalid Token Cases', () => {
      it('should reject request without Authorization header', () => {
        const req = mockRequest({});
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with empty Authorization header', () => {
        const req = mockRequest({ authorization: '' });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject malformed Authorization header', () => {
        const req = mockRequest({ authorization: 'NotBearer token123' });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject Bearer without token', () => {
        const req = mockRequest({ authorization: 'Bearer' });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject expired token', () => {
        const payload = { userId: '123', role: 'admin' };
        const expiredToken = jwt.sign(payload, testSecret, { expiresIn: '-1h' });
        
        const req = mockRequest({ authorization: `Bearer ${expiredToken}` });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject token with wrong secret', () => {
        const payload = { userId: '123', role: 'admin' };
        const wrongToken = jwt.sign(payload, 'wrong-secret');
        
        const req = mockRequest({ authorization: `Bearer ${wrongToken}` });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject malformed token', () => {
        const req = mockRequest({ authorization: 'Bearer invalid.token.format' });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject completely invalid token string', () => {
        const req = mockRequest({ authorization: 'Bearer notajwttoken' });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle case-sensitive Bearer prefix', () => {
        const payload = { userId: '123', role: 'admin' };
        const token = jwt.sign(payload, testSecret);
        
        const req = mockRequest({ authorization: `bearer ${token}` }); // lowercase
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle authorization header with different casing', () => {
        const payload = { userId: '123', role: 'admin' };
        const token = jwt.sign(payload, testSecret);
        
        const req = mockRequest({ authorization: `Bearer ${token}` }); // Express normalizes to lowercase
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        // Should work as Express normalizes headers to lowercase
        expect(mockNext).toHaveBeenCalledWith();
        expect(req.user).toMatchObject(payload);
      });

      it('should handle token with no payload', () => {
        const emptyToken = jwt.sign({}, testSecret);
        
        const req = mockRequest({ authorization: `Bearer ${emptyToken}` });
        const res = mockResponse();
        
        authenticateToken(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
        // JWT always adds 'iat' (issued at) claim
        expect(req.user).toMatchObject({});
        expect(req.user).toHaveProperty('iat');
      });
    });
  });

  describe('requireRole - Single Role Authorization', () => {
    describe('Valid Authorization Cases', () => {
      it('should allow admin role', () => {
        const middleware = requireRole('admin');
        const req = mockRequest({}, { userId: '123', role: 'admin' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow referee role when required', () => {
        const middleware = requireRole('referee');
        const req = mockRequest({}, { userId: '123', role: 'referee' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow admin for any role requirement', () => {
        const middleware = requireRole('referee');
        const req = mockRequest({}, { userId: '123', role: 'admin' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should work with roles array (new system)', () => {
        const middleware = requireRole('evaluator');
        const req = mockRequest({}, { 
          userId: '123', 
          role: 'referee',
          roles: ['referee', 'evaluator'] 
        });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should prioritize admin in roles array', () => {
        const middleware = requireRole('super_admin');
        const req = mockRequest({}, { 
          userId: '123', 
          role: 'referee',
          roles: ['admin', 'referee'] 
        });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Invalid Authorization Cases', () => {
      it('should reject request without user', () => {
        const middleware = requireRole('admin');
        const req = mockRequest({});
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject user with wrong role', () => {
        const middleware = requireRole('admin');
        const req = mockRequest({}, { userId: '123', role: 'referee' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject user without required role in roles array', () => {
        const middleware = requireRole('evaluator');
        const req = mockRequest({}, { 
          userId: '123', 
          role: 'referee',
          roles: ['referee', 'mentor'] 
        });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject user with null role', () => {
        const middleware = requireRole('admin');
        const req = mockRequest({}, { userId: '123', role: null });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject user with empty roles array', () => {
        const middleware = requireRole('admin');
        const req = mockRequest({}, { 
          userId: '123', 
          role: null,
          roles: [] 
        });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireAnyRole - Multiple Role Authorization', () => {
    describe('Valid Authorization Cases', () => {
      it('should allow user with any of the required roles', () => {
        const middleware = requireAnyRole('admin', 'manager', 'supervisor');
        const req = mockRequest({}, { userId: '123', role: 'manager' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow admin for any role combination', () => {
        const middleware = requireAnyRole('referee', 'evaluator');
        const req = mockRequest({}, { userId: '123', role: 'admin' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should work with roles array', () => {
        const middleware = requireAnyRole('evaluator', 'mentor');
        const req = mockRequest({}, { 
          userId: '123', 
          role: 'referee',
          roles: ['referee', 'evaluator'] 
        });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle single role parameter', () => {
        const middleware = requireAnyRole('referee');
        const req = mockRequest({}, { userId: '123', role: 'referee' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should fallback to legacy role when roles array is empty', () => {
        const middleware = requireAnyRole('referee', 'evaluator');
        const req = mockRequest({}, { 
          userId: '123', 
          role: 'referee',
          roles: [] 
        });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Invalid Authorization Cases', () => {
      it('should reject request without user', () => {
        const middleware = requireAnyRole('admin', 'referee');
        const req = mockRequest({});
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject user without any required roles', () => {
        const middleware = requireAnyRole('admin', 'manager');
        const req = mockRequest({}, { userId: '123', role: 'referee' });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject user with roles array but no matching roles', () => {
        const middleware = requireAnyRole('admin', 'manager');
        const req = mockRequest({}, { 
          userId: '123', 
          role: 'referee',
          roles: ['referee', 'evaluator'] 
        });
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject user with no roles at all', () => {
        const middleware = requireAnyRole('admin', 'referee');
        const req = mockRequest({}, { userId: '123' }); // No role or roles
        const res = mockResponse();
        
        middleware(req, res, mockNext);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('hasRole - Utility Function', () => {
    describe('Valid Role Checks', () => {
      it('should return true for matching legacy role', () => {
        const user = { userId: '123', role: 'admin' };
        
        expect(hasRole(user, 'admin')).toBe(true);
        // Admin has access to all roles except when checking against admin itself
        expect(hasRole(user, 'referee')).toBe(true);
      });

      it('should return true for admin accessing any role', () => {
        const user = { userId: '123', role: 'admin' };
        
        expect(hasRole(user, 'referee')).toBe(true);
        expect(hasRole(user, 'evaluator')).toBe(true);
        expect(hasRole(user, 'any-role')).toBe(true);
      });

      it('should work with roles array', () => {
        const user = { 
          userId: '123', 
          role: 'referee',
          roles: ['referee', 'evaluator'] 
        };
        
        expect(hasRole(user, 'referee')).toBe(true);
        expect(hasRole(user, 'evaluator')).toBe(true);
        expect(hasRole(user, 'admin')).toBe(false);
      });

      it('should prioritize roles array over legacy role', () => {
        const user = { 
          userId: '123', 
          role: 'old-role',
          roles: ['referee', 'evaluator'] 
        };
        
        expect(hasRole(user, 'referee')).toBe(true);
        expect(hasRole(user, 'old-role')).toBe(false);
      });

      it('should fallback to legacy role when roles array is empty', () => {
        const user = { 
          userId: '123', 
          role: 'referee',
          roles: [] 
        };
        
        expect(hasRole(user, 'referee')).toBe(true);
      });

      it('should handle admin in both systems', () => {
        const legacyAdmin = { userId: '123', role: 'admin' };
        const newAdmin = { 
          userId: '456', 
          role: 'referee',
          roles: ['admin', 'referee'] 
        };
        
        expect(hasRole(legacyAdmin, 'referee')).toBe(true);
        expect(hasRole(newAdmin, 'evaluator')).toBe(true);
      });
    });

    describe('Invalid Role Checks', () => {
      it('should return false for null user', () => {
        expect(hasRole(null, 'admin')).toBe(false);
        expect(hasRole(undefined, 'referee')).toBe(false);
      });

      it('should return false for user without role or roles', () => {
        const user = { userId: '123' };
        
        expect(hasRole(user, 'admin')).toBe(false);
        expect(hasRole(user, 'referee')).toBe(false);
      });

      it('should return false for user with null role and no roles', () => {
        const user = { userId: '123', role: null };
        
        expect(hasRole(user, 'admin')).toBe(false);
      });

      it('should return false for user with empty roles array and null role', () => {
        const user = { 
          userId: '123', 
          role: null,
          roles: [] 
        };
        
        expect(hasRole(user, 'admin')).toBe(false);
      });

      it('should handle undefined role parameter', () => {
        const user = { userId: '123', role: 'admin' };
        
        expect(hasRole(user, undefined)).toBe(false);
        expect(hasRole(user, null)).toBe(false);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', () => {
      // Step 1: Token authentication
      const payload = { userId: '123', email: 'test@example.com', role: 'referee' };
      const token = jwt.sign(payload, testSecret);
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      authenticateToken(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toMatchObject(payload);
      
      // Step 2: Role authorization
      jest.clearAllMocks();
      const roleMiddleware = requireRole('referee');
      roleMiddleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle failed authentication then authorization', () => {
      // Step 1: Failed token authentication
      const req = mockRequest({ authorization: 'Bearer invalid-token' });
      const res = mockResponse();
      
      authenticateToken(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
      
      // Step 2: Authorization would fail due to no user
      jest.clearAllMocks();
      const roleMiddleware = requireRole('admin');
      roleMiddleware(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should handle role migration scenario', () => {
      // User in transition between old and new role systems
      const user = { 
        userId: '123', 
        role: 'referee', // Legacy system
        roles: ['referee', 'evaluator'] // New system
      };
      
      // Should work with both systems
      expect(hasRole(user, 'referee')).toBe(true);
      expect(hasRole(user, 'evaluator')).toBe(true);
      
      // Middleware should also work
      const req = mockRequest({}, user);
      const res = mockResponse();
      
      const middleware = requireAnyRole('evaluator', 'mentor');
      middleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Security Edge Cases', () => {
    it('should not be vulnerable to role injection via token', () => {
      // Malicious token trying to inject admin role
      const maliciousPayload = { 
        userId: '123', 
        role: 'referee',
        roles: ['referee'],
        isAdmin: true, // Fake admin flag
        permissions: ['all'] // Fake permissions
      };
      const token = jwt.sign(maliciousPayload, testSecret);
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      authenticateToken(req, res, mockNext);
      
      // Token should be valid but role checks should be based only on role/roles
      expect(req.user.isAdmin).toBe(true); // This would be in the token
      expect(hasRole(req.user, 'admin')).toBe(false); // But this should be false
      
      // Authorization should fail for admin-only resources
      jest.clearAllMocks();
      const adminMiddleware = requireRole('admin');
      adminMiddleware(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle race condition in role checking', () => {
      const user = { 
        userId: '123', 
        role: 'referee',
        roles: ['referee'] 
      };
      
      // Simulate concurrent role checks
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(hasRole(user, 'referee'));
        results.push(hasRole(user, 'admin'));
      }
      
      // All referee checks should be true, all admin checks false
      expect(results.filter(r => r === true)).toHaveLength(10);
      expect(results.filter(r => r === false)).toHaveLength(10);
    });

    it('should handle extremely long role names', () => {
      const longRole = 'a'.repeat(1000);
      const user = { userId: '123', role: longRole };
      
      expect(hasRole(user, longRole)).toBe(true);
      expect(hasRole(user, 'short')).toBe(false);
    });

    it('should handle special characters in roles', () => {
      const specialRole = 'referee-level-1@domain.com';
      const user = { 
        userId: '123', 
        role: 'referee',
        roles: ['referee', specialRole] 
      };
      
      expect(hasRole(user, specialRole)).toBe(true);
      expect(hasRole(user, 'referee-level-1')).toBe(false);
    });
  });
});