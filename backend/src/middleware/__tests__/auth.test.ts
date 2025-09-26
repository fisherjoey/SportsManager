/**
 * @fileoverview Authentication Middleware Tests
 * @description Comprehensive unit tests for authentication and authorization middleware
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  testUsers,
  generateTestToken
} from '../../test-utils/setup';

// Mock PermissionService
jest.mock('../../services/PermissionService', () => {
  return jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn().mockResolvedValue(false),
    hasAnyPermission: jest.fn().mockResolvedValue(false),
    hasAllPermissions: jest.fn().mockResolvedValue(false),
    getUserPermissions: jest.fn().mockResolvedValue([])
  }));
});

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    let authenticateToken: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        authenticateToken = auth.authenticateToken;
      });
    });

    test('should accept valid JWT token', () => {
      const token = generateTestToken(testUsers.admin);
      mockRequest = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.email).toBe(testUsers.admin.email);
    });

    test('should reject missing authorization header', () => {
      mockRequest = createMockRequest({
        headers: {}
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject empty authorization header', () => {
      mockRequest = createMockRequest({
        headers: { authorization: '' }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject authorization header without Bearer prefix', () => {
      const token = generateTestToken(testUsers.admin);
      mockRequest = createMockRequest({
        headers: { authorization: token }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject malformed Bearer token', () => {
      mockRequest = createMockRequest({
        headers: { authorization: 'Bearer ' }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid JWT token', () => {
      mockRequest = createMockRequest({
        headers: { authorization: 'Bearer invalid.token.here' }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: 'test', email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      mockRequest = createMockRequest({
        headers: { authorization: `Bearer ${expiredToken}` }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should standardize user object with userId field', () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      mockRequest = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockRequest.user?.id).toBe('user-123');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle token with roles array', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com', roles: ['admin', 'referee'] },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      mockRequest = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      });

      authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockRequest.user?.roles).toEqual(['admin', 'referee']);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    let requireRole: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        requireRole = auth.requireRole;
      });
    });

    test('should allow access with required role', () => {
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireRole('referee');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should deny access without required role', () => {
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireRole('admin');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow admin to bypass role requirements', () => {
      mockRequest = createMockRequest({
        user: { id: 'admin-123', roles: ['admin'] }
      });

      const middleware = requireRole('referee');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should handle Super Admin role', () => {
      mockRequest = createMockRequest({
        user: { id: 'admin-123', roles: ['Super Admin'] }
      });

      const middleware = requireRole('referee');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should require authentication first', () => {
      mockRequest = createMockRequest({ user: null });

      const middleware = requireRole('admin');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle user without roles array', () => {
      mockRequest = createMockRequest({
        user: { id: 'user-123' }
      });

      const middleware = requireRole('referee');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });

  describe('requireAnyRole', () => {
    let requireAnyRole: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        requireAnyRole = auth.requireAnyRole;
      });
    });

    test('should allow access with any matching role', () => {
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireAnyRole('admin', 'referee', 'assignor');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should deny access with no matching roles', () => {
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['viewer'] }
      });

      const middleware = requireAnyRole('admin', 'referee', 'assignor');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow admin to bypass requirements', () => {
      mockRequest = createMockRequest({
        user: { id: 'admin-123', roles: ['admin'] }
      });

      const middleware = requireAnyRole('referee', 'assignor');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should require authentication first', () => {
      mockRequest = createMockRequest({ user: null });

      const middleware = requireAnyRole('admin', 'referee');
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('requirePermission', () => {
    let requirePermission: any;
    let mockPermissionService: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        requirePermission = auth.requirePermission;
        mockPermissionService = auth.permissionService;
      });
    });

    test('should allow access with required permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValueOnce(true);
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requirePermission('games.view');
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('user-123', 'games.view');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should deny access without required permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValueOnce(false);
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requirePermission('games.delete');
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: 'games.delete'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow admin to bypass permission check', async () => {
      mockRequest = createMockRequest({
        user: { id: 'admin-123', roles: ['admin'] }
      });

      const middleware = requirePermission('games.delete');
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle permission service errors', async () => {
      mockPermissionService.hasPermission.mockRejectedValueOnce(new Error('Database error'));
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requirePermission('games.view');
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Permission check failed' });
    });

    test('should require authentication first', async () => {
      mockRequest = createMockRequest({ user: null });

      const middleware = requirePermission('games.view');
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission', () => {
    let requireAnyPermission: any;
    let mockPermissionService: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        requireAnyPermission = auth.requireAnyPermission;
        mockPermissionService = auth.permissionService;
      });
    });

    test('should allow access with any matching permission', async () => {
      mockPermissionService.hasAnyPermission.mockResolvedValueOnce(true);
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireAnyPermission(['games.view', 'games.create']);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockPermissionService.hasAnyPermission).toHaveBeenCalledWith(
        'user-123',
        ['games.view', 'games.create']
      );
      expect(mockNext).toHaveBeenCalled();
    });

    test('should deny access with no matching permissions', async () => {
      mockPermissionService.hasAnyPermission.mockResolvedValueOnce(false);
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireAnyPermission(['games.delete', 'games.create']);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: 'One of: games.delete, games.create'
      });
    });

    test('should validate permission array', async () => {
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireAnyPermission([]);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid permission configuration' });
    });

    test('should allow admin bypass', async () => {
      mockRequest = createMockRequest({
        user: { id: 'admin-123', roles: ['admin'] }
      });

      const middleware = requireAnyPermission(['games.delete', 'games.create']);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockPermissionService.hasAnyPermission).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAllPermissions', () => {
    let requireAllPermissions: any;
    let mockPermissionService: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        requireAllPermissions = auth.requireAllPermissions;
        mockPermissionService = auth.permissionService;
      });
    });

    test('should allow access with all required permissions', async () => {
      mockPermissionService.hasAllPermissions.mockResolvedValueOnce(true);
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['assignor'] }
      });

      const middleware = requireAllPermissions(['games.view', 'games.create']);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockPermissionService.hasAllPermissions).toHaveBeenCalledWith(
        'user-123',
        ['games.view', 'games.create']
      );
      expect(mockNext).toHaveBeenCalled();
    });

    test('should deny access if any permission missing', async () => {
      mockPermissionService.hasAllPermissions.mockResolvedValueOnce(false);
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireAllPermissions(['games.view', 'games.create', 'games.delete']);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: 'All of: games.view, games.create, games.delete'
      });
    });

    test('should validate permission array', async () => {
      mockRequest = createMockRequest({
        user: { id: 'user-123', roles: ['referee'] }
      });

      const middleware = requireAllPermissions([]);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid permission configuration' });
    });

    test('should allow admin bypass', async () => {
      mockRequest = createMockRequest({
        user: { id: 'admin-123', roles: ['Super Admin'] }
      });

      const middleware = requireAllPermissions(['games.delete', 'users.delete']);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockPermissionService.hasAllPermissions).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    let hasRole: any;
    let hasPermission: any;
    let getUserPermissions: any;
    let mockPermissionService: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        hasRole = auth.hasRole;
        hasPermission = auth.hasPermission;
        getUserPermissions = auth.getUserPermissions;
        mockPermissionService = auth.permissionService;
      });
    });

    describe('hasRole', () => {
      test('should return true if user has role', () => {
        const user = { roles: ['admin', 'referee'] };
        expect(hasRole(user, 'referee')).toBe(true);
      });

      test('should return false if user lacks role', () => {
        const user = { roles: ['referee'] };
        expect(hasRole(user, 'admin')).toBe(false);
      });

      test('should handle admin bypass', () => {
        const user = { roles: ['admin'] };
        expect(hasRole(user, 'referee')).toBe(true);
      });

      test('should handle null user', () => {
        expect(hasRole(null, 'admin')).toBe(false);
      });

      test('should handle undefined roles', () => {
        const user = { id: 'user-123' };
        expect(hasRole(user, 'admin')).toBe(false);
      });
    });

    describe('hasPermission', () => {
      test('should check permission through service', async () => {
        mockPermissionService.hasPermission.mockResolvedValueOnce(true);
        const user = { id: 'user-123', roles: ['referee'] };

        const result = await hasPermission(user, 'games.view');

        expect(result).toBe(true);
        expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('user-123', 'games.view');
      });

      test('should allow admin bypass', async () => {
        const user = { id: 'admin-123', roles: ['admin'] };

        const result = await hasPermission(user, 'users.delete');

        expect(result).toBe(true);
        expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
      });

      test('should handle null user', async () => {
        const result = await hasPermission(null, 'games.view');
        expect(result).toBe(false);
      });

      test('should handle service errors', async () => {
        mockPermissionService.hasPermission.mockRejectedValueOnce(new Error('Database error'));
        const user = { id: 'user-123', roles: ['referee'] };

        const result = await hasPermission(user, 'games.view');

        expect(result).toBe(false);
      });
    });

    describe('getUserPermissions', () => {
      test('should retrieve user permissions', async () => {
        const permissions = [{ name: 'games.view' }, { name: 'games.create' }];
        mockPermissionService.getUserPermissions.mockResolvedValueOnce(permissions);

        const result = await getUserPermissions('user-123');

        expect(result).toEqual(['games.view', 'games.create']);
        expect(mockPermissionService.getUserPermissions).toHaveBeenCalledWith('user-123', true);
      });

      test('should handle cache parameter', async () => {
        mockPermissionService.getUserPermissions.mockResolvedValueOnce([]);

        await getUserPermissions('user-123', false);

        expect(mockPermissionService.getUserPermissions).toHaveBeenCalledWith('user-123', false);
      });

      test('should handle string permissions', async () => {
        mockPermissionService.getUserPermissions.mockResolvedValueOnce(['games.view', 'games.create']);

        const result = await getUserPermissions('user-123');

        expect(result).toEqual(['games.view', 'games.create']);
      });

      test('should handle service errors', async () => {
        mockPermissionService.getUserPermissions.mockRejectedValueOnce(new Error('Database error'));

        const result = await getUserPermissions('user-123');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Convenience Middleware', () => {
    let requireAdmin: any;
    let requireSuperAdmin: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        const auth = require('../auth');
        requireAdmin = auth.requireAdmin;
        requireSuperAdmin = auth.requireSuperAdmin;
      });
    });

    test('requireAdmin should check for admin role', () => {
      mockRequest = createMockRequest({
        user: { id: 'admin-123', roles: ['admin'] }
      });

      requireAdmin(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requireSuperAdmin should check for Super Admin role', () => {
      mockRequest = createMockRequest({
        user: { id: 'super-123', roles: ['Super Admin'] }
      });

      requireSuperAdmin(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});