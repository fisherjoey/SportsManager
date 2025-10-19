import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../../types/auth.types';
import { UserRole } from '../../types/index';


const mockCheckPermission = jest.fn();

jest.mock('../../services/CerbosAuthService', () => {
  return {
    CerbosAuthService: {
      getInstance: jest.fn().mockReturnValue({
        checkPermission: mockCheckPermission,
      }),
    },
  };
});

const mockToPrincipal = jest.fn();
const mockToResource = jest.fn();

jest.mock('../../utils/cerbos-helpers', () => ({
  toPrincipal: mockToPrincipal,
  toResource: mockToResource,
}));

// Mock logger first before any imports
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

jest.mock('../../utils/logger', () => mockLogger);

import { requireCerbosPermission } from '../requireCerbosPermission';

describe('requireCerbosPermission middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.ASSIGNOR,
    is_active: true,
    email_verified: true,
    permissions: ['game:create', 'game:view'],
    resource_permissions: {
      game: ['create', 'view'],
    },
    roles: [{
      id: 'role-123',
      name: 'Assignor',
      code: 'assignor',
      description: 'Game assignor role',
      is_system: false,
      is_active: true,
      color: '#0066cc',
      priority: 10,
      permissions: ['game:create', 'game:view'],
      resource_permissions: {
        game: ['create', 'view'],
      },
      settings: {
        advanced: {
          canManageOwnProfile: true,
          canViewOwnAssignments: true,
          canModifyAvailability: true,
          canViewPayments: false,
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
    }],
  };

  beforeEach(() => {
    mockRequest = {
      user: mockUser,
      params: { id: 'game-123' },
      body: {},
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

    // Set up CerbosAuthService mock properly
    const { CerbosAuthService } = require('../../services/CerbosAuthService');
    CerbosAuthService.getInstance.mockReturnValue({
      checkPermission: mockCheckPermission,
    });

    // Set up cerbos-helpers mocks
    mockToPrincipal.mockImplementation((user, orgId, primaryRegionId, regionIds) => ({
      id: user.id,
      roles: [user.role],
      attr: {
        organizationId: orgId,
        primaryRegionId,
        regionIds,
        permissions: user.permissions,
        email: user.email,
        isActive: user.is_active,
      },
    }));

    mockToResource.mockImplementation((kind, data) => ({
      kind,
      id: data.id,
      attr: { ...data },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic permission checks', () => {
    it('should allow access when permission is granted', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when permission is denied', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: false,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
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

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    });
  });

  describe('resource ID resolution', () => {
    it('should use resource ID from params', async () => {
      mockRequest.params = { id: 'game-456' };
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
        getResourceId: (req) => req.params.id,
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            id: 'game-456',
          }),
        })
      );
    });

    it('should use custom resource ID getter', async () => {
      mockRequest.body = { gameId: 'custom-789' };
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
        getResourceId: (req) => req.body.gameId,
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            id: 'custom-789',
          }),
        })
      );
    });

    it('should handle missing resource ID gracefully', async () => {
      mockRequest.params = {};
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'create',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            id: expect.any(String),
          }),
        })
      );
    });
  });

  describe('resource attributes', () => {
    it('should include resource attributes from database', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'update',
        getResourceAttributes: async (req) => ({
          organizationId: 'org-123',
          regionId: 'region-456',
          createdBy: 'user-789',
          status: 'scheduled',
        }),
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            attr: expect.objectContaining({
              organizationId: 'org-123',
              regionId: 'region-456',
              createdBy: 'user-789',
              status: 'scheduled',
            }),
          }),
        })
      );
    });

    it('should handle getResourceAttributes errors', async () => {
      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
        getResourceAttributes: async () => {
          throw new Error('Database error');
        },
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    });
  });

  describe('organization context', () => {
    it('should extract organization from user context', async () => {
      (mockRequest.user as any).organizationId = 'org-999';
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: expect.objectContaining({
            attr: expect.objectContaining({
              organizationId: 'org-999',
            }),
          }),
        })
      );
    });

    it('should use default organization if not specified', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: expect.objectContaining({
            attr: expect.objectContaining({
              organizationId: expect.any(String),
            }),
          }),
        })
      );
    });
  });

  describe('custom error messages', () => {
    it('should use custom forbidden message', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: false,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'delete',
        forbiddenMessage: 'You cannot delete this game',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'You cannot delete this game',
      });
    });
  });

  describe('validation errors', () => {
    it('should handle validation errors from Cerbos', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: false,
        validationErrors: [
          '/attr/organizationId: required field missing',
        ],
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          validationErrors: expect.arrayContaining([
            expect.stringContaining('organizationId'),
          ]),
        })
      );
    });
  });

  describe('request context storage', () => {
    it('should store permission result in response locals', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.locals).toHaveProperty('cerbosResult');
      expect(mockResponse.locals?.cerbosResult).toEqual({
        allowed: true,
      });
    });
  });

  describe('error handling', () => {
    it('should handle Cerbos service errors', async () => {
      mockCheckPermission.mockRejectedValue(
        new Error('Cerbos connection failed')
      );

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    });

    it('should not expose error details in production', async () => {
      process.env.NODE_ENV = 'production';
      mockCheckPermission.mockRejectedValue(
        new Error('Internal error with sensitive data')
      );

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('details');
      expect(callArgs).not.toHaveProperty('stack');
    });
  });

  describe('multiple actions', () => {
    it('should check multiple actions and allow if all pass', async () => {
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

    it('should deny if any action fails', async () => {
      mockCheckPermission
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false });

      const middleware = requireCerbosPermission({
        resource: 'game',
        actions: ['view', 'delete'],
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

  describe('performance', () => {
    it('should complete permission check within 50ms', async () => {
      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'view',
      });

      const start = Date.now();
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Super Admin Bypass - RoleEntity Type Safety', () => {
    it('should bypass permission check for super admin with RoleEntity name "Super Admin"', async () => {
      const superAdminRole = {
        id: 'role-super-admin',
        name: 'Super Admin',
        code: 'super_admin',
        description: 'Super Administrator role',
        is_system: true,
        is_active: true,
        priority: 100,
        permissions: [],
        resource_permissions: {},
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
            visibility: 'public' as const,
            showContactInfo: true,
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
      };

      mockRequest.user = {
        ...mockUser,
        roles: [superAdminRole],
      };

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'delete',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockCheckPermission).not.toHaveBeenCalled();
    });

    it('should bypass permission check for super admin with RoleEntity code "super_admin"', async () => {
      const superAdminRole = {
        id: 'role-super-admin',
        name: 'Super Administrator',
        code: 'super_admin',
        description: 'Super Administrator role',
        is_system: true,
        is_active: true,
        priority: 100,
        permissions: [],
        resource_permissions: {},
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
            visibility: 'public' as const,
            showContactInfo: true,
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
      };

      mockRequest.user = {
        ...mockUser,
        roles: [superAdminRole],
      };

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'delete',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockCheckPermission).not.toHaveBeenCalled();
    });

    it('should NOT bypass permission check for non-super-admin RoleEntity objects', async () => {
      const adminRole = {
        id: 'role-admin',
        name: 'Admin',
        code: 'admin',
        description: 'Administrator role',
        is_system: true,
        is_active: true,
        priority: 50,
        permissions: [],
        resource_permissions: {},
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
            visibility: 'public' as const,
            showContactInfo: true,
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
      };

      mockRequest.user = {
        ...mockUser,
        roles: [adminRole],
      };

      mockCheckPermission.mockResolvedValue({
        allowed: true,
      });

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'delete',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockCheckPermission).toHaveBeenCalled();
    });

    it('should handle mixed RoleEntity array with super admin', async () => {
      const superAdminRole = {
        id: 'role-super-admin',
        name: 'Super Admin',
        code: 'super_admin',
        description: 'Super Administrator role',
        is_system: true,
        is_active: true,
        priority: 100,
        permissions: [],
        resource_permissions: {},
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
            visibility: 'public' as const,
            showContactInfo: true,
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
      };

      const adminRole = {
        id: 'role-admin',
        name: 'Admin',
        code: 'admin',
        description: 'Administrator role',
        is_system: true,
        is_active: true,
        priority: 50,
        permissions: [],
        resource_permissions: {},
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
            visibility: 'public' as const,
            showContactInfo: true,
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
      };

      mockRequest.user = {
        ...mockUser,
        roles: [adminRole, superAdminRole],
      };

      const middleware = requireCerbosPermission({
        resource: 'game',
        action: 'delete',
      });

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockCheckPermission).not.toHaveBeenCalled();
    });
  });
});