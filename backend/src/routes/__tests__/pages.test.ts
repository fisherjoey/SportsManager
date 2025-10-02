/**
 * Unit tests for page permission endpoints
 * Tests authentication, authorization, and error handling
 */

import request from 'supertest';
import express, { Application } from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

// Mock Cerbos packages before any imports
jest.mock('@cerbos/grpc', () => ({
  GRPC: jest.fn(),
}));

jest.mock('@cerbos/core', () => ({
  PlanKind: {
    CONDITIONAL: 'CONDITIONAL',
    ALWAYS_ALLOWED: 'ALWAYS_ALLOWED',
    ALWAYS_DENIED: 'ALWAYS_DENIED',
  },
}));

// Mock the logger with proper default export
jest.mock('../../utils/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  };
});

// Mock the CerbosAuthService with proper typing
const mockCheckPermission = jest.fn();
const mockBatchCheckPermissions = jest.fn();
const mockGetQueryPlan = jest.fn();
const mockIsHealthy = jest.fn();

jest.mock('../../services/CerbosAuthService', () => ({
  CerbosAuthService: {
    getInstance: jest.fn(() => ({
      checkPermission: mockCheckPermission,
      batchCheckPermissions: mockBatchCheckPermissions,
      getQueryPlan: mockGetQueryPlan,
      isHealthy: mockIsHealthy,
    })),
  },
}));

import pagesRouter from '../pages';

describe('Pages Routes', () => {
  let app: Application;
  const JWT_SECRET = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh app instance for each test
    app = express();
    app.use(express.json());
    app.use('/api/pages', pagesRouter);
  });

  // Helper function to generate a valid JWT token
  const generateToken = (payload: any) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  };

  describe('POST /api/pages/check-access', () => {
    it('should return allowed true when user has permission to view page', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['view:pages'],
      });

      mockCheckPermission.mockResolvedValue({
        allowed: true,
        validationErrors: [],
      });

      const response = await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: 'games' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          allowed: true,
          reason: 'User has permission to view this page',
        },
      });

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: expect.objectContaining({
            id: 'user-123',
            roles: ['admin'],
          }),
          resource: expect.objectContaining({
            kind: 'page',
            id: 'games',
          }),
          action: 'view',
        })
      );
    });

    it('should return allowed false when user does not have permission', async () => {
      const token = generateToken({
        userId: 'user-456',
        email: 'referee@example.com',
        roles: ['referee'],
        permissions: [],
      });

      mockCheckPermission.mockResolvedValue({
        allowed: false,
        validationErrors: [],
      });

      const response = await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: 'admin-settings' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          allowed: false,
          reason: 'User does not have permission to view this page',
        },
      });
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app)
        .post('/api/pages/check-access')
        .send({ pageId: 'games' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should return 403 when token is invalid', async () => {
      const response = await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', 'Bearer invalid-token')
        .send({ pageId: 'games' })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should return 400 when pageId is missing', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
      });

      const response = await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
      });
    });

    it('should return 400 when pageId is empty', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
      });

      const response = await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: '' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
      });
    });

    it('should return 503 when Cerbos service is unavailable', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
      });

      mockCheckPermission.mockRejectedValue(
        Object.assign(new Error('Cerbos connection failed'), { code: 'UNAVAILABLE' })
      );

      const response = await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: 'games' })
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Permission service temporarily unavailable',
      });
    });

    it('should return 500 for other errors', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
      });

      mockCheckPermission.mockRejectedValue(
        new Error('Internal error')
      );

      const response = await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: 'games' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to check page access',
      });
    });
  });

  describe('GET /api/pages/permissions', () => {
    it('should return all page permissions for admin user', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['*'],
      });

      const mockBatchResults = [
        {
          resourceId: 'games',
          actions: { view: true, access: true },
        },
        {
          resourceId: 'financial-dashboard',
          actions: { view: true, access: true },
        },
        {
          resourceId: 'admin-settings',
          actions: { view: true, access: true },
        },
      ];

      mockBatchCheckPermissions.mockResolvedValue(mockBatchResults as any);

      const response = await request(app)
        .get('/api/pages/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toHaveLength(3);
      expect(response.body.data.permissions[0]).toMatchObject({
        pageId: 'games',
        actions: { view: true, access: true },
      });
    });

    it('should return limited permissions for referee user', async () => {
      const token = generateToken({
        userId: 'user-456',
        email: 'referee@example.com',
        roles: ['referee'],
        permissions: ['view:games', 'view:assignments'],
      });

      const mockBatchResults = [
        {
          resourceId: 'games',
          actions: { view: true, access: true },
        },
        {
          resourceId: 'financial-dashboard',
          actions: { view: false, access: false },
        },
        {
          resourceId: 'admin-settings',
          actions: { view: false, access: false },
        },
      ];

      mockBatchCheckPermissions.mockResolvedValue(mockBatchResults as any);

      const response = await request(app)
        .get('/api/pages/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toHaveLength(3);

      const gamesPermission = response.body.data.permissions.find(
        (p: any) => p.pageId === 'games'
      );
      expect(gamesPermission?.actions.view).toBe(true);

      const adminPermission = response.body.data.permissions.find(
        (p: any) => p.pageId === 'admin-settings'
      );
      expect(adminPermission?.actions.view).toBe(false);
    });

    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app)
        .get('/api/pages/permissions')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should return 403 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/pages/permissions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should return 503 when Cerbos service is unavailable', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
      });

      mockBatchCheckPermissions.mockRejectedValue(
        Object.assign(new Error('Cerbos connection failed'), { code: 'UNAVAILABLE' })
      );

      const response = await request(app)
        .get('/api/pages/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Permission service temporarily unavailable',
      });
    });

    it('should call batchCheckPermissions with all common pages', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
      });

      mockBatchCheckPermissions.mockResolvedValue([]);

      await request(app)
        .get('/api/pages/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockBatchCheckPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: expect.objectContaining({
            id: 'user-123',
            roles: ['admin'],
          }),
          resources: expect.arrayContaining([
            expect.objectContaining({
              resource: expect.objectContaining({
                kind: 'page',
                id: 'games',
              }),
              actions: ['view', 'access'],
            }),
            expect.objectContaining({
              resource: expect.objectContaining({
                kind: 'page',
                id: 'financial-dashboard',
              }),
              actions: ['view', 'access'],
            }),
          ]),
        })
      );
    });

    it('should handle empty batch results gracefully', async () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'admin@example.com',
        roles: ['admin'],
      });

      mockBatchCheckPermissions.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/pages/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          permissions: [],
        },
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should extract user info from JWT token correctly', async () => {
      const token = generateToken({
        userId: 'user-789',
        email: 'manager@example.com',
        roles: ['manager', 'referee'],
        permissions: ['view:games'],
        organizationId: 'org-123',
      });

      mockCheckPermission.mockResolvedValue({
        allowed: true,
        validationErrors: [],
      });

      await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: 'games' })
        .expect(200);

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: expect.objectContaining({
            id: 'user-789',
            roles: ['manager', 'referee'],
            attr: expect.objectContaining({
              email: 'manager@example.com',
              organizationId: 'org-123',
              permissions: ['view:games'],
            }),
          }),
        })
      );
    });

    it('should use default organizationId when not provided in token', async () => {
      const token = generateToken({
        userId: 'user-999',
        email: 'user@example.com',
        roles: ['referee'],
      });

      mockCheckPermission.mockResolvedValue({
        allowed: true,
        validationErrors: [],
      });

      await request(app)
        .post('/api/pages/check-access')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageId: 'games' })
        .expect(200);

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: expect.objectContaining({
            attr: expect.objectContaining({
              organizationId: 'default-org',
            }),
          }),
        })
      );
    });
  });
});
