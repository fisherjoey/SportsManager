import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../types/auth.types';
import { UserRole } from '../types/index';

const mockCheckPermission = jest.fn();
const mockToPrincipal = jest.fn();
const mockToResource = jest.fn();

jest.mock('../services/CerbosAuthService', () => ({
  CerbosAuthService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../utils/cerbos-helpers', () => ({
  toPrincipal: mockToPrincipal,
  toResource: mockToResource,
}));

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

jest.mock('../utils/logger', () => mockLogger);

// Import after all mocks are set up
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import {
  getAuthContext,
  createPrincipalFromRequest,
  createResourceFromRequest,
  hasOrganizationAccess,
} from '../utils/auth-context';

describe('Auth Flow Integration Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const assignorUser: AuthenticatedUser = {
    id: 'assignor-123',
    email: 'assignor@example.com',
    name: 'John Assignor',
    role: UserRole.ASSIGNOR,
    is_active: true,
    email_verified: true,
    permissions: ['game:create', 'game:view', 'game:update', 'game:delete'],
    resource_permissions: {
      game: ['create', 'view', 'update', 'delete'],
      assignment: ['create', 'view', 'update', 'delete'],
    },
    roles: [
      {
        id: 'role-assignor',
        name: 'assignor',
        description: 'Game assignor',
        is_system: true,
        is_active: true,
        color: '#0066cc',
        priority: 100,
        permissions: ['game:create', 'game:view', 'game:update', 'game:delete'],
        resource_permissions: {
          game: ['create', 'view', 'update', 'delete'],
        },
        settings: {
          advanced: {
            canManageOwnProfile: true,
            canViewOwnAssignments: true,
            canModifyAvailability: true,
            canViewPayments: true,
            requireApprovalForAssignments: false,
            maxAssignmentsPerWeek: null,
            allowConflictingAssignments: false,
            canSelfAssign: true,
          },
          profile: {
            visibility: 'public',
            showContactInfo: true,
            showLocation: true,
            showExperience: true,
            showStats: true,
          },
          notifications: {
            email: true,
            push: true,
            sms: false,
            assignmentReminders: true,
            scheduleUpdates: true,
          },
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'admin-123',
        updated_by: 'admin-123',
      },
    ],
  };

  const refereeUser: AuthenticatedUser = {
    id: 'referee-456',
    email: 'referee@example.com',
    name: 'Jane Referee',
    role: UserRole.REFEREE,
    is_active: true,
    email_verified: true,
    permissions: ['game:view', 'assignment:view'],
    resource_permissions: {
      game: ['view'],
      assignment: ['view'],
    },
    roles: [
      {
        id: 'role-referee',
        name: 'referee',
        description: 'Game referee',
        is_system: true,
        is_active: true,
        color: '#00cc66',
        priority: 50,
        permissions: ['game:view', 'assignment:view'],
        resource_permissions: {
          game: ['view'],
          assignment: ['view'],
        },
        settings: {
          advanced: {
            canManageOwnProfile: true,
            canViewOwnAssignments: true,
            canModifyAvailability: true,
            canViewPayments: true,
            requireApprovalForAssignments: true,
            maxAssignmentsPerWeek: 10,
            allowConflictingAssignments: false,
            canSelfAssign: false,
          },
          profile: {
            visibility: 'public',
            showContactInfo: false,
            showLocation: true,
            showExperience: true,
            showStats: true,
          },
          notifications: {
            email: true,
            push: true,
            sms: true,
            assignmentReminders: true,
            scheduleUpdates: true,
          },
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'admin-123',
        updated_by: 'admin-123',
      },
    ],
  };

  beforeEach(() => {
    mockRequest = {
      user: assignorUser,
      params: { id: 'game-123' },
      body: {},
      query: {},
      get: jest.fn(),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    };

    nextFunction = jest.fn();
    mockCheckPermission.mockClear();
    mockToPrincipal.mockClear();
    mockToResource.mockClear();
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();

    // Set up the CerbosAuthService mock using require to get the mocked version
    const { CerbosAuthService } = require('../services/CerbosAuthService');
    const mockInstance = {
      checkPermission: mockCheckPermission,
    };

    CerbosAuthService.getInstance = jest.fn().mockReturnValue(mockInstance);

    // Mock toPrincipal to match the exact signature and ensure all required fields are present
    mockToPrincipal.mockImplementation((user, orgId, primaryRegionId, regionIds = []) => {
      return {
        id: user.id,
        roles: user.roles?.map((r: any) => r.name) || [user.role],
        attr: {
          organizationId: orgId || '00000000-0000-0000-0000-000000000001', // Ensure we always have an orgId
          primaryRegionId,
          regionIds: regionIds || [],
          permissions: user.permissions || [],
          email: user.email,
          isActive: user.is_active,
        },
      };
    });

    // Mock toResource to match the exact signature
    mockToResource.mockImplementation((kind, data) => {
      return {
        kind,
        id: data.id,
        attr: { ...data },
      };
    });
  });

  describe('Full auth flow for assignor creating a game', () => {
    it('should allow assignor to create game in their organization', async () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-sports-league',
        primaryRegionId: 'region-north',
        regionIds: ['region-north', 'region-south'],
      };

      // Clear the default implementation and set specific expectation
      mockCheckPermission.mockResolvedValue({ allowed: true });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'create',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          id: 'assignor-123',
          roles: expect.arrayContaining(['assignor']),
          attr: expect.objectContaining({
            organizationId: 'org-sports-league',
            primaryRegionId: 'region-north',
            regionIds: ['region-north', 'region-south'],
          }),
        }),
        resource: expect.objectContaining({
          kind: 'game',
          attr: expect.objectContaining({
            organizationId: 'org-sports-league',
          }),
        }),
        action: 'create',
      });

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should use auth context helper to extract organization', () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-test',
        primaryRegionId: 'region-1',
        regionIds: ['region-1'],
      };

      const context = getAuthContext(mockRequest as Request);

      expect(context).toEqual({
        user: expect.objectContaining({ id: 'assignor-123' }),
        organizationId: 'org-test',
        primaryRegionId: 'region-1',
        regionIds: ['region-1'],
      });
    });
  });

  describe('Full auth flow for referee viewing game', () => {
    it('should allow referee to view game', async () => {
      (mockRequest.user as any) = {
        ...refereeUser,
        organizationId: 'org-sports-league',
        primaryRegionId: 'region-north',
        regionIds: ['region-north'],
      };

      mockCheckPermission.mockResolvedValue({ allowed: true });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          id: 'referee-456',
          roles: expect.arrayContaining(['referee']),
        }),
        resource: expect.objectContaining({
          kind: 'game',
        }),
        action: 'view',
      });

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny referee from updating game', async () => {
      (mockRequest.user as any) = {
        ...refereeUser,
        organizationId: 'org-sports-league',
      };

      mockCheckPermission.mockResolvedValue({ allowed: false });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'update',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
      });
    });
  });

  describe('Organization isolation', () => {
    it('should verify user has access to their organization', () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-123',
      };

      expect(hasOrganizationAccess(mockRequest as Request, 'org-123')).toBe(
        true
      );
      expect(hasOrganizationAccess(mockRequest as Request, 'org-456')).toBe(
        false
      );
    });

    it('should prevent cross-organization access in middleware', async () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-league-a',
      };

      mockCheckPermission.mockResolvedValue({ allowed: false });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
        getResourceAttributes: async (req) => ({
          organizationId: 'org-league-b',
          status: 'scheduled',
        }),
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          attr: expect.objectContaining({
            organizationId: 'org-league-a',
          }),
        }),
        resource: expect.objectContaining({
          attr: expect.objectContaining({
            organizationId: 'org-league-b',
          }),
        }),
        action: 'view',
      });

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Region-based access', () => {
    it('should pass region context to permission check', async () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-1',
        primaryRegionId: 'region-east',
        regionIds: ['region-east', 'region-west'],
      };

      mockCheckPermission.mockResolvedValue({ allowed: true });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
        getResourceAttributes: async (req) => ({
          organizationId: 'org-1',
          regionId: 'region-east',
        }),
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          attr: expect.objectContaining({
            regionIds: ['region-east', 'region-west'],
            primaryRegionId: 'region-east',
          }),
        }),
        resource: expect.objectContaining({
          attr: expect.objectContaining({
            regionId: 'region-east',
          }),
        }),
        action: 'view',
      });

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access to games in regions user does not have access to', async () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-1',
        regionIds: ['region-east'],
      };

      mockCheckPermission.mockResolvedValue({ allowed: false });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'update',
        getResourceAttributes: async (req) => ({
          organizationId: 'org-1',
          regionId: 'region-west',
        }),
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Helper integration with middleware', () => {
    it('should create principal from request using helper', () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-999',
        primaryRegionId: 'region-central',
        regionIds: ['region-central'],
      };

      const principal = createPrincipalFromRequest(mockRequest as Request);

      expect(principal).toEqual({
        id: 'assignor-123',
        roles: expect.arrayContaining(['assignor']),
        attr: expect.objectContaining({
          organizationId: 'org-999',
          primaryRegionId: 'region-central',
          regionIds: ['region-central'],
          permissions: expect.arrayContaining(['game:create']),
        }),
      });
    });

    it('should create resource from request using helper', () => {
      mockRequest.params = { id: 'game-999' };

      const resource = createResourceFromRequest(
        mockRequest as Request,
        'game',
        {
          organizationId: 'org-123',
          status: 'scheduled',
          level: 'varsity',
        }
      );

      expect(resource).toEqual({
        kind: 'game',
        id: 'game-999',
        attr: expect.objectContaining({
          organizationId: 'org-123',
          status: 'scheduled',
          level: 'varsity',
        }),
      });
    });
  });

  describe('Multiple action checks', () => {
    it('should check multiple actions and allow when all pass', async () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-1',
      };

      mockCheckPermission
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: true });

      const middleware = requireCerbosPermission({
        resource: 'game',
        actions: ['view', 'update'],
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledTimes(2);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny when any action fails in multi-action check', async () => {
      (mockRequest.user as any) = {
        ...refereeUser,
        organizationId: 'org-1',
      };

      mockCheckPermission
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false });

      const middleware = requireCerbosPermission({
        resource: 'game',
        actions: ['view', 'update'],
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledTimes(2);
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Error handling in full flow', () => {
    it('should handle Cerbos service errors gracefully', async () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-1',
      };

      mockCheckPermission.mockRejectedValue(
        new Error('Cerbos connection failed')
      );

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'create',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission check failed',
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    });

    it('should handle resource attribute fetch errors', async () => {
      (mockRequest.user as any) = {
        ...assignorUser,
        organizationId: 'org-1',
      };

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
        getResourceAttributes: async (req) => {
          throw new Error('Database error');
        },
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get resource attributes',
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Unauthenticated requests', () => {
    it('should reject unauthenticated requests', async () => {
      mockRequest.user = undefined;

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).not.toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    });

    it('should throw when helpers are called without authenticated user', () => {
      mockRequest.user = undefined;

      expect(() => getAuthContext(mockRequest as Request)).toThrow(
        'User not authenticated'
      );
      expect(() =>
        createPrincipalFromRequest(mockRequest as Request)
      ).toThrow('User not authenticated');
    });
  });
});