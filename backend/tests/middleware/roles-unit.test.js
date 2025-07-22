const { requireRole, requireAnyRole, hasRole } = require('../../src/middleware/auth');

describe('Role-Based Access Control Middleware (Unit Tests)', () => {
  describe('requireRole() middleware', () => {
    it('should allow admin access to any role requirement', () => {
      const mockReq = {
        user: { role: 'admin', roles: ['admin'] }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('referee');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow user with specific role', () => {
      const mockReq = {
        user: { role: 'referee', roles: ['referee'] }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('referee');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user without specific role', () => {
      const mockReq = {
        user: { role: 'referee', roles: ['referee'] }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle legacy role system fallback', () => {
      const mockReq = {
        user: { role: 'admin', roles: null }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should require authentication', () => {
      const mockReq = { user: null };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('requireAnyRole() middleware', () => {
    it('should allow user with any of the specified roles', () => {
      const mockReq = {
        user: { role: 'referee', roles: ['referee', 'evaluator'] }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireAnyRole('referee_coach', 'evaluator');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user without any of the specified roles', () => {
      const mockReq = {
        user: { role: 'referee', roles: ['referee'] }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = requireAnyRole('referee_coach', 'evaluator');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should allow admin access to any role combination', () => {
      const mockReq = {
        user: { role: 'admin', roles: ['admin'] }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireAnyRole('referee_coach', 'evaluator');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('hasRole() helper function', () => {
    it('should correctly identify when user has role', () => {
      const user = { role: 'referee', roles: ['referee', 'evaluator'] };
      
      expect(hasRole(user, 'referee')).toBe(true);
      expect(hasRole(user, 'evaluator')).toBe(true);
      expect(hasRole(user, 'referee_coach')).toBe(false);
    });

    it('should handle admin role correctly', () => {
      const adminUser = { role: 'admin', roles: ['admin'] };
      
      expect(hasRole(adminUser, 'admin')).toBe(true);
      expect(hasRole(adminUser, 'referee')).toBe(true); // Admin has access to everything
      expect(hasRole(adminUser, 'referee_coach')).toBe(true);
    });

    it('should handle null/undefined user', () => {
      expect(hasRole(null, 'admin')).toBe(false);
      expect(hasRole(undefined, 'admin')).toBe(false);
    });

    it('should fall back to legacy role system', () => {
      const legacyUser = { role: 'referee', roles: null };
      
      expect(hasRole(legacyUser, 'referee')).toBe(true);
      expect(hasRole(legacyUser, 'admin')).toBe(false);
    });
  });

  describe('Multi-role scenarios', () => {
    it('should handle referee with coach privileges', () => {
      const user = { 
        role: 'referee', 
        roles: ['referee', 'referee_coach'] 
      };

      expect(hasRole(user, 'referee')).toBe(true);
      expect(hasRole(user, 'referee_coach')).toBe(true);
      expect(hasRole(user, 'evaluator')).toBe(false);
    });

    it('should handle referee with evaluator privileges', () => {
      const user = { 
        role: 'referee',
        roles: ['referee', 'evaluator'] 
      };

      expect(hasRole(user, 'referee')).toBe(true);
      expect(hasRole(user, 'evaluator')).toBe(true);
      expect(hasRole(user, 'referee_coach')).toBe(false);
    });

    it('should handle user with all possible roles', () => {
      const user = { 
        role: 'referee',
        roles: ['referee', 'referee_coach', 'evaluator'] 
      };

      expect(hasRole(user, 'referee')).toBe(true);
      expect(hasRole(user, 'referee_coach')).toBe(true);
      expect(hasRole(user, 'evaluator')).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty roles array', () => {
      const user = { role: 'referee', roles: [] };
      
      expect(hasRole(user, 'referee')).toBe(true); // Falls back to legacy role
      expect(hasRole(user, 'admin')).toBe(false);
    });

    it('should handle malformed roles data', () => {
      const user = { role: 'referee', roles: 'invalid' };
      
      // Should fall back to legacy role system
      expect(hasRole(user, 'referee')).toBe(true);
      expect(hasRole(user, 'admin')).toBe(false);
    });

    it('should handle user without role or roles', () => {
      const user = { id: 1, email: 'test@test.com' };
      
      expect(hasRole(user, 'admin')).toBe(false);
      expect(hasRole(user, 'referee')).toBe(false);
    });
  });

  describe('Backward compatibility', () => {
    it('should prioritize roles array over legacy role field', () => {
      const mockReq = {
        user: { 
          role: 'referee',           // Legacy says referee
          roles: ['admin']           // New system says admin
        }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled(); // Should succeed because roles array has admin
    });

    it('should work with legacy tokens that have no roles array', () => {
      const mockReq = {
        user: { 
          role: 'referee'
          // No roles array
        }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('referee');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled(); // Should work with legacy role field
    });
  });
});