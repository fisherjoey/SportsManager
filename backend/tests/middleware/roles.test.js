const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');
const jwt = require('jsonwebtoken');
const { requireRole, requireAnyRole, hasRole } = require('../../src/middleware/auth');

describe('Role-Based Access Control Middleware', () => {
  let adminToken, refereeToken, refereeCoachToken, evaluatorToken, multiRoleToken;
  let adminUser, refereeUser;

  beforeEach(async () => {
    // Create test users with different role configurations
    const adminResult = await db('users').insert({
      email: 'admin@test.com',
      password_hash: 'hashedpassword',
      role: 'admin',
      roles: JSON.stringify(['admin']),
      name: 'Test Admin'
    }).returning('*');
    adminUser = adminResult[0];

    const refereeResult = await db('users').insert({
      email: 'referee@test.com', 
      password_hash: 'hashedpassword',
      role: 'referee',
      roles: JSON.stringify(['referee']),
      name: 'Test Referee'
    }).returning('*');
    refereeUser = refereeResult[0];

    // Create tokens for different role combinations
    adminToken = jwt.sign({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      roles: ['admin']
    }, process.env.JWT_SECRET || 'test-secret');

    refereeToken = jwt.sign({
      userId: refereeUser.id,
      email: refereeUser.email,
      role: 'referee', 
      roles: ['referee']
    }, process.env.JWT_SECRET || 'test-secret');

    refereeCoachToken = jwt.sign({
      userId: refereeUser.id,
      email: refereeUser.email,
      role: 'referee',
      roles: ['referee', 'referee_coach']
    }, process.env.JWT_SECRET || 'test-secret');

    evaluatorToken = jwt.sign({
      userId: refereeUser.id,
      email: refereeUser.email,
      role: 'referee',
      roles: ['referee', 'evaluator']
    }, process.env.JWT_SECRET || 'test-secret');

    multiRoleToken = jwt.sign({
      userId: refereeUser.id,
      email: refereeUser.email,
      role: 'referee',
      roles: ['referee', 'referee_coach', 'evaluator']
    }, process.env.JWT_SECRET || 'test-secret');
  });

  describe('requireRole() middleware', () => {
    it('should allow admin access to any role requirement', async () => {
      const response = await request(app)
        .get('/api/roles/available')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow user with specific role', async () => {
      // Test with role array system
      const mockReq = {
        user: { role: 'referee', roles: ['referee'] }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('referee');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user without specific role', async () => {
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

    it('should handle legacy role system fallback', async () => {
      // Test fallback to legacy role field when roles array is missing
      const mockReq = {
        user: { role: 'admin', roles: null }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
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
    it('should allow user with any of the specified roles', async () => {
      const mockReq = {
        user: { role: 'referee', roles: ['referee', 'evaluator'] }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireAnyRole('referee_coach', 'evaluator');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user without any of the specified roles', async () => {
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

    it('should allow admin access to any role combination', async () => {
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

  describe('Role transitions and backward compatibility', () => {
    it('should handle users with only legacy role field', async () => {
      // Create user without roles array (simulating pre-migration user)
      const legacyUser = await db('users').insert({
        email: 'legacy@test.com',
        password_hash: 'hashedpassword', 
        role: 'referee',
        roles: null,
        name: 'Legacy User'
      }).returning('*');

      const legacyToken = jwt.sign({
        userId: legacyUser[0].id,
        email: legacyUser[0].email,
        role: 'referee'
        // No roles array in token
      }, process.env.JWT_SECRET || 'test-secret');

      // Should still work with requireRole
      const mockReq = {
        user: { role: 'referee' } // No roles array
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = requireRole('referee');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize roles array over legacy role field', async () => {
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
});