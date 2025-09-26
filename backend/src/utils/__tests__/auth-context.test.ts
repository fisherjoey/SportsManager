import { Request } from 'express';
import type { AuthenticatedUser } from '../../types/auth.types';
import { UserRole } from '../../types/index';

const mockToPrincipal = jest.fn();
const mockToResource = jest.fn();

jest.mock('../cerbos-helpers', () => ({
  toPrincipal: mockToPrincipal,
  toResource: mockToResource,
}));

import {
  getAuthContext,
  getOrganizationId,
  getPrimaryRegionId,
  getRegionIds,
  createPrincipalFromRequest,
  createResourceFromRequest,
  hasOrganizationAccess,
} from '../auth-context';

describe('Auth Context Helper Functions', () => {
  let mockRequest: Partial<Request>;
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
    roles: [],
  };

  beforeEach(() => {
    mockRequest = {
      user: mockUser,
      params: {},
      body: {},
      query: {},
    };

    mockToPrincipal.mockClear();
    mockToResource.mockClear();
  });

  describe('getAuthContext', () => {
    it('should extract full auth context from request with organization', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-456',
        primaryRegionId: 'region-789',
        regionIds: ['region-789', 'region-101'],
      };

      const context = getAuthContext(mockRequest as Request);

      expect(context).toEqual({
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
        }),
        organizationId: 'org-456',
        primaryRegionId: 'region-789',
        regionIds: ['region-789', 'region-101'],
      });
    });

    it('should return null organization when user has none', () => {
      const context = getAuthContext(mockRequest as Request);

      expect(context.organizationId).toBeNull();
      expect(context.primaryRegionId).toBeNull();
      expect(context.regionIds).toEqual([]);
    });

    it('should throw error when user is not authenticated', () => {
      mockRequest.user = undefined;

      expect(() => getAuthContext(mockRequest as Request)).toThrow(
        'User not authenticated'
      );
    });

    it('should handle user with only organization no regions', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-123',
      };

      const context = getAuthContext(mockRequest as Request);

      expect(context.organizationId).toBe('org-123');
      expect(context.primaryRegionId).toBeNull();
      expect(context.regionIds).toEqual([]);
    });
  });

  describe('getOrganizationId', () => {
    it('should extract organization ID from user', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-999',
      };

      const orgId = getOrganizationId(mockRequest as Request);

      expect(orgId).toBe('org-999');
    });

    it('should return null when no organization', () => {
      const orgId = getOrganizationId(mockRequest as Request);

      expect(orgId).toBeNull();
    });

    it('should throw when user not authenticated', () => {
      mockRequest.user = undefined;

      expect(() => getOrganizationId(mockRequest as Request)).toThrow();
    });
  });

  describe('getPrimaryRegionId', () => {
    it('should extract primary region ID from user', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        primaryRegionId: 'region-primary',
      };

      const regionId = getPrimaryRegionId(mockRequest as Request);

      expect(regionId).toBe('region-primary');
    });

    it('should return null when no primary region', () => {
      const regionId = getPrimaryRegionId(mockRequest as Request);

      expect(regionId).toBeNull();
    });

    it('should throw when user not authenticated', () => {
      mockRequest.user = undefined;

      expect(() => getPrimaryRegionId(mockRequest as Request)).toThrow();
    });
  });

  describe('getRegionIds', () => {
    it('should extract region IDs from user', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        regionIds: ['region-1', 'region-2', 'region-3'],
      };

      const regionIds = getRegionIds(mockRequest as Request);

      expect(regionIds).toEqual(['region-1', 'region-2', 'region-3']);
    });

    it('should return empty array when no regions', () => {
      const regionIds = getRegionIds(mockRequest as Request);

      expect(regionIds).toEqual([]);
    });

    it('should throw when user not authenticated', () => {
      mockRequest.user = undefined;

      expect(() => getRegionIds(mockRequest as Request)).toThrow();
    });
  });

  describe('createPrincipalFromRequest', () => {
    it('should create principal with organization context', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-456',
        primaryRegionId: 'region-789',
        regionIds: ['region-789', 'region-101'],
      };

      mockToPrincipal.mockReturnValue({
        id: 'user-123',
        roles: ['assignor'],
        attr: {
          organizationId: 'org-456',
          primaryRegionId: 'region-789',
          regionIds: ['region-789', 'region-101'],
          permissions: ['game:create', 'game:view'],
        },
      });

      const principal = createPrincipalFromRequest(mockRequest as Request);

      expect(mockToPrincipal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123' }),
        'org-456',
        'region-789',
        ['region-789', 'region-101']
      );

      expect(principal).toEqual({
        id: 'user-123',
        roles: ['assignor'],
        attr: expect.objectContaining({
          organizationId: 'org-456',
        }),
      });
    });

    it('should handle user without organization', () => {
      mockToPrincipal.mockReturnValue({
        id: 'user-123',
        roles: ['guest'],
        attr: {
          organizationId: null,
          permissions: [],
        },
      });

      const principal = createPrincipalFromRequest(mockRequest as Request);

      expect(mockToPrincipal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123' }),
        null,
        null,
        []
      );

      expect(principal.attr.organizationId).toBeNull();
    });

    it('should throw when user not authenticated', () => {
      mockRequest.user = undefined;

      expect(() => createPrincipalFromRequest(mockRequest as Request)).toThrow(
        'User not authenticated'
      );
    });
  });

  describe('createResourceFromRequest', () => {
    it('should create resource from request params', () => {
      mockRequest.params = { id: 'game-456' };

      mockToResource.mockReturnValue({
        kind: 'game',
        id: 'game-456',
        attr: {
          organizationId: 'org-123',
        },
      });

      const resource = createResourceFromRequest(
        mockRequest as Request,
        'game',
        { organizationId: 'org-123' }
      );

      expect(mockToResource).toHaveBeenCalledWith('game', {
        id: 'game-456',
        organizationId: 'org-123',
      });

      expect(resource.kind).toBe('game');
      expect(resource.id).toBe('game-456');
    });

    it('should use custom ID from attributes', () => {
      mockToResource.mockReturnValue({
        kind: 'assignment',
        id: 'assignment-999',
        attr: {},
      });

      const resource = createResourceFromRequest(
        mockRequest as Request,
        'assignment',
        { id: 'assignment-999', gameId: 'game-1' }
      );

      expect(mockToResource).toHaveBeenCalledWith('assignment', {
        id: 'assignment-999',
        gameId: 'game-1',
      });
    });

    it('should generate ID when not provided', () => {
      mockRequest.params = {};

      mockToResource.mockReturnValue({
        kind: 'game',
        id: 'game-123',
        attr: {},
      });

      const resource = createResourceFromRequest(
        mockRequest as Request,
        'game',
        {}
      );

      expect(mockToResource).toHaveBeenCalledWith('game', {
        id: expect.any(String),
      });
    });

    it('should merge request params ID with attributes', () => {
      mockRequest.params = { id: 'resource-789' };

      mockToResource.mockReturnValue({
        kind: 'referee',
        id: 'resource-789',
        attr: {
          organizationId: 'org-1',
          certificationLevel: 'Level 3',
        },
      });

      const resource = createResourceFromRequest(
        mockRequest as Request,
        'referee',
        {
          organizationId: 'org-1',
          certificationLevel: 'Level 3',
        }
      );

      expect(mockToResource).toHaveBeenCalledWith('referee', {
        id: 'resource-789',
        organizationId: 'org-1',
        certificationLevel: 'Level 3',
      });
    });
  });

  describe('hasOrganizationAccess', () => {
    it('should return true when user has organization access', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-456',
      };

      const hasAccess = hasOrganizationAccess(
        mockRequest as Request,
        'org-456'
      );

      expect(hasAccess).toBe(true);
    });

    it('should return false when user has different organization', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-123',
      };

      const hasAccess = hasOrganizationAccess(
        mockRequest as Request,
        'org-456'
      );

      expect(hasAccess).toBe(false);
    });

    it('should return false when user has no organization', () => {
      const hasAccess = hasOrganizationAccess(
        mockRequest as Request,
        'org-456'
      );

      expect(hasAccess).toBe(false);
    });

    it('should throw when user not authenticated', () => {
      mockRequest.user = undefined;

      expect(() =>
        hasOrganizationAccess(mockRequest as Request, 'org-456')
      ).toThrow('User not authenticated');
    });

    it('should handle null organization check', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-123',
      };

      const hasAccess = hasOrganizationAccess(mockRequest as Request, null);

      expect(hasAccess).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle user with undefined organization properties', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: undefined,
        primaryRegionId: undefined,
        regionIds: undefined,
      };

      const context = getAuthContext(mockRequest as Request);

      expect(context.organizationId).toBeNull();
      expect(context.primaryRegionId).toBeNull();
      expect(context.regionIds).toEqual([]);
    });

    it('should handle empty regionIds array', () => {
      (mockRequest.user as any) = {
        ...mockUser,
        organizationId: 'org-1',
        regionIds: [],
      };

      const regionIds = getRegionIds(mockRequest as Request);

      expect(regionIds).toEqual([]);
    });

    it('should handle request without params', () => {
      mockRequest.params = undefined;

      mockToResource.mockReturnValue({
        kind: 'game',
        id: 'generated-id',
        attr: {},
      });

      const resource = createResourceFromRequest(
        mockRequest as Request,
        'game',
        {}
      );

      expect(resource).toBeDefined();
    });
  });
});