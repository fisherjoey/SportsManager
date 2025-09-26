import { CerbosAuthService } from '../CerbosAuthService';

jest.mock('@cerbos/core', () => ({
  PlanKind: {
    ALWAYS_ALLOWED: 'KIND_ALWAYS_ALLOWED',
    ALWAYS_DENIED: 'KIND_ALWAYS_DENIED',
    CONDITIONAL: 'KIND_CONDITIONAL',
  },
}));

import { PlanKind } from '@cerbos/core';
import type {
  CerbosPrincipal,
  CerbosResource,
  ResourceAction,
  CerbosCheckResult,
  CerbosBatchCheckResult,
} from '../../types/cerbos.types';

jest.mock('@cerbos/grpc', () => {
  const mockMethods = {
    checkResource: jest.fn(),
    checkResources: jest.fn(),
    planResources: jest.fn(),
  };

  (global as any).__mockClient__ = mockMethods;

  class MockGRPC {
    checkResource = mockMethods.checkResource;
    checkResources = mockMethods.checkResources;
    planResources = mockMethods.planResources;
  }

  return {
    GRPC: MockGRPC,
  };
});

const mockClientMethods = (global as any).__mockClient__;

describe('CerbosAuthService', () => {
  let service: CerbosAuthService;
  let mockCerbosClient: any;

  const mockPrincipal: CerbosPrincipal = {
    id: 'user-123',
    roles: ['assignor'],
    attr: {
      organizationId: 'org-456',
      primaryRegionId: 'region-789',
      regionIds: ['region-789', 'region-101'],
      permissions: ['game:create', 'game:view'],
      email: 'assignor@example.com',
      isActive: true,
    },
  };

  const mockResource: CerbosResource = {
    kind: 'game',
    id: 'game-111',
    attr: {
      organizationId: 'org-456',
      regionId: 'region-789',
      ownerId: 'user-222',
      createdBy: 'user-222',
      status: 'scheduled',
      level: 'varsity',
    },
  };

  beforeEach(() => {
    mockClientMethods.checkResource.mockClear();
    mockClientMethods.checkResources.mockClear();
    mockClientMethods.planResources.mockClear();
    (CerbosAuthService as any).instance = null;
    service = CerbosAuthService.getInstance();
    mockCerbosClient = mockClientMethods;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = CerbosAuthService.getInstance();
      const instance2 = CerbosAuthService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with correct Cerbos configuration', () => {
      expect(service).toBeInstanceOf(CerbosAuthService);
      expect((service as any).client).toBeDefined();
      expect((service as any).client.checkResource).toBeDefined();
    });

    it('should use environment variables for configuration', () => {
      process.env.CERBOS_HOST = 'cerbos-server:3592';
      process.env.CERBOS_TLS = 'true';

      (CerbosAuthService as any).instance = null;
      const testService = new CerbosAuthService();

      expect(testService).toBeInstanceOf(CerbosAuthService);
      expect((testService as any).client).toBeDefined();
    });
  });

  describe('checkPermission', () => {
it('should return true when permission is allowed', async () => {
      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => action === 'view',
      });

      const result = await service.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      expect(result.allowed).toBe(true);
      expect(mockCerbosClient.checkResource).toHaveBeenCalledWith({
        principal: {
          id: mockPrincipal.id,
          roles: mockPrincipal.roles,
          attr: mockPrincipal.attr,
        },
        resource: {
          kind: mockResource.kind,
          id: mockResource.id,
          attr: mockResource.attr,
        },
        actions: ['view'],
      });
    });

    it('should return false when permission is denied', async () => {
      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => false,
      });

      const result = await service.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'delete',
      });

      expect(result.allowed).toBe(false);
    });

    it('should enforce organization boundary', async () => {
      const crossOrgResource: CerbosResource = {
        ...mockResource,
        attr: {
          ...mockResource.attr,
          organizationId: 'different-org',
        },
      };

      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => false,
      });

      const result = await service.checkPermission({
        principal: mockPrincipal,
        resource: crossOrgResource,
        action: 'view',
      });

      expect(result.allowed).toBe(false);
    });

    it('should include auxData when provided', async () => {
      const auxData = {
        currentTime: new Date().toISOString(),
        ipAddress: '192.168.1.1',
      };

      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => true,
      });

      await service.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
        auxData,
      });

      expect(mockCerbosClient.checkResource).toHaveBeenCalledWith(
        expect.objectContaining({
          auxData,
        })
      );
    });

    it('should handle Cerbos connection errors gracefully', async () => {
      mockCerbosClient.checkResource.mockRejectedValue(
        new Error('Connection refused')
      );

      await expect(
        service.checkPermission({
          principal: mockPrincipal,
          resource: mockResource,
          action: 'view',
        })
      ).rejects.toThrow('Connection refused');
    });

    it('should handle validation errors', async () => {
      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => false,
        validationErrors: [
          { message: 'Invalid resource attribute', path: '/attr/regionId' },
        ],
      });

      const result = await service.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      expect(result.allowed).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors?.length).toBeGreaterThan(0);
    });
  });

  describe('batchCheckPermissions', () => {
    it('should check multiple resources and actions', async () => {
      const resource1: CerbosResource = {
        kind: 'game',
        id: 'game-1',
        attr: {
          organizationId: 'org-456',
          regionId: 'region-789',
        },
      };

      const resource2: CerbosResource = {
        kind: 'game',
        id: 'game-2',
        attr: {
          organizationId: 'org-456',
          regionId: 'region-101',
        },
      };

      mockCerbosClient.checkResources.mockResolvedValue({
        results: [
          {
            resource: { id: 'game-1' },
            actions: {
              view: { allowed: true },
              update: { allowed: true },
              delete: { allowed: false },
            },
          },
          {
            resource: { id: 'game-2' },
            actions: {
              view: { allowed: true },
              update: { allowed: false },
              delete: { allowed: false },
            },
          },
        ],
      });

      const results = await service.batchCheckPermissions({
        principal: mockPrincipal,
        resources: [
          { resource: resource1, actions: ['view', 'update', 'delete'] },
          { resource: resource2, actions: ['view', 'update', 'delete'] },
        ],
      });

      expect(results).toHaveLength(2);
      expect(results[0].resourceId).toBe('game-1');
      expect(results[0].actions.view).toBe(true);
      expect(results[0].actions.update).toBe(true);
      expect(results[0].actions.delete).toBe(false);
      expect(results[1].resourceId).toBe('game-2');
      expect(results[1].actions.view).toBe(true);
      expect(results[1].actions.update).toBe(false);
    });

    it('should handle empty resource list', async () => {
      mockCerbosClient.checkResources.mockResolvedValue({
        results: [],
      });

      const results = await service.batchCheckPermissions({
        principal: mockPrincipal,
        resources: [],
      });

      expect(results).toHaveLength(0);
    });

    it('should optimize batch requests with same actions', async () => {
      const resources = Array.from({ length: 10 }, (_, i) => ({
        resource: {
          kind: 'game' as const,
          id: `game-${i}`,
          attr: {
            organizationId: 'org-456',
            regionId: 'region-789',
          },
        },
        actions: ['view' as ResourceAction, 'update' as ResourceAction],
      }));

      mockCerbosClient.checkResources.mockResolvedValue({
        results: resources.map((r) => ({
          resource: { id: r.resource.id },
          actions: {
            view: { allowed: true },
            update: { allowed: true },
          },
        })),
      });

      await service.batchCheckPermissions({
        principal: mockPrincipal,
        resources,
      });

      expect(mockCerbosClient.checkResources).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQueryPlan', () => {
    it('should return ALWAYS_ALLOWED for unrestricted resources', async () => {
      mockCerbosClient.planResources.mockResolvedValue({
        kind: PlanKind.ALWAYS_ALLOWED,
        cerbosCallId: 'test-call',
        requestId: 'test-req',
        validationErrors: [],
        metadata: undefined,
      });

      const result = await service.getQueryPlan({
        principal: mockPrincipal,
        resource: {
          kind: 'game',
          attr: {
            organizationId: 'org-456',
          },
        },
        action: 'view',
      });

      expect(result.filter.kind).toBe('ALWAYS_ALLOWED');
    });

    it('should return ALWAYS_DENIED for completely restricted resources', async () => {
      const restrictedPrincipal: CerbosPrincipal = {
        id: 'user-999',
        roles: ['guest'],
        attr: {
          organizationId: 'org-456',
          regionIds: [],
          permissions: [],
          isActive: false,
        },
      };

      mockCerbosClient.planResources.mockResolvedValue({
        kind: PlanKind.ALWAYS_DENIED,
        cerbosCallId: 'test-call',
        requestId: 'test-req',
        validationErrors: [],
        metadata: undefined,
      });

      const result = await service.getQueryPlan({
        principal: restrictedPrincipal,
        resource: {
          kind: 'game',
        },
        action: 'delete',
      });

      expect(result.filter.kind).toBe('ALWAYS_DENIED');
    });

    it('should return CONDITIONAL with filter expression', async () => {
      mockCerbosClient.planResources.mockResolvedValue({
        kind: PlanKind.CONDITIONAL,
        condition: {
          expression: {
            operator: 'in',
            operands: [
              { variable: 'request.resource.attr.regionId' },
              { value: mockPrincipal.attr.regionIds },
            ],
          },
        },
        cerbosCallId: 'test-call',
        requestId: 'test-req',
        validationErrors: [],
        metadata: undefined,
      });

      const result = await service.getQueryPlan({
        principal: mockPrincipal,
        resource: {
          kind: 'game',
          attr: {
            organizationId: 'org-456',
          },
        },
        action: 'view',
      });

      expect(result.filter.kind).toBe('CONDITIONAL');
      expect(result.filter.condition).toBeDefined();
    });

    it('should generate SQL-compatible conditions', async () => {
      mockCerbosClient.planResources.mockResolvedValue({
        kind: PlanKind.CONDITIONAL,
        condition: {
          expression: {
            operator: 'and',
            operands: [
              {
                operator: 'eq',
                operands: [
                  { variable: 'request.resource.attr.organizationId' },
                  { value: 'org-456' },
                ],
              },
              {
                operator: 'in',
                operands: [
                  { variable: 'request.resource.attr.regionId' },
                  { value: ['region-789', 'region-101'] },
                ],
              },
            ],
          },
        },
        cerbosCallId: 'test-call',
        requestId: 'test-req',
        validationErrors: [],
        metadata: undefined,
      });

      const result = await service.getQueryPlan({
        principal: mockPrincipal,
        resource: { kind: 'game' },
        action: 'view',
      });

      expect(result.filter.kind).toBe('CONDITIONAL');
    });
  });

  describe('isHealthy', () => {
    it('should return true when Cerbos is healthy', async () => {
      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: () => false,
      });

      const healthy = await service.isHealthy();

      expect(healthy).toBe(true);
      expect(mockCerbosClient.checkResource).toHaveBeenCalled();
    });

    it('should return false when Cerbos is unhealthy', async () => {
      mockCerbosClient.checkResource.mockRejectedValue(new Error('Connection failed'));

      const healthy = await service.isHealthy();

      expect(healthy).toBe(false);
    });

    it('should return false on connection error', async () => {
      mockCerbosClient.checkResource.mockRejectedValue(
        new Error('Connection timeout')
      );

      const healthy = await service.isHealthy();

      expect(healthy).toBe(false);
    });

    it('should cache health check results', async () => {
      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: () => false,
      });

      await service.isHealthy();
      await service.isHealthy();
      await service.isHealthy();

      expect(mockCerbosClient.checkResource).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance', () => {
    it('should complete permission check within 20ms', async () => {
      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => true,
      });

      const start = Date.now();
      await service.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(20);
    });

    it('should handle 100 batch checks efficiently', async () => {
      const resources = Array.from({ length: 100 }, (_, i) => ({
        resource: {
          kind: 'game' as const,
          id: `game-${i}`,
          attr: {
            organizationId: 'org-456',
            regionId: 'region-789',
          },
        },
        actions: ['view' as ResourceAction],
      }));

      mockCerbosClient.checkResources.mockResolvedValue({
        results: resources.map((r) => ({
          resource: { id: r.resource.id },
          actions: { view: { allowed: true } },
        })),
      });

      const start = Date.now();
      await service.batchCheckPermissions({
        principal: mockPrincipal,
        resources,
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('error handling', () => {
    it('should provide detailed error messages', async () => {
      const error = new Error('Policy not found: game.yaml');
      mockCerbosClient.checkResource.mockRejectedValue(error);

      await expect(
        service.checkPermission({
          principal: mockPrincipal,
          resource: mockResource,
          action: 'view',
        })
      ).rejects.toThrow('Policy not found: game.yaml');
    });

    it('should handle invalid principal data', async () => {
      const invalidPrincipal = {
        id: '',
        roles: [],
        attr: {} as any,
      };

      mockCerbosClient.checkResource.mockRejectedValue(
        new Error('Invalid principal ID')
      );

      await expect(
        service.checkPermission({
          principal: invalidPrincipal,
          resource: mockResource,
          action: 'view',
        })
      ).rejects.toThrow();
    });

    it('should handle invalid resource data', async () => {
      const invalidResource = {
        kind: 'game' as const,
        id: '',
        attr: {} as any,
      };

      mockCerbosClient.checkResource.mockRejectedValue(
        new Error('Invalid resource ID')
      );

      await expect(
        service.checkPermission({
          principal: mockPrincipal,
          resource: invalidResource,
          action: 'view',
        })
      ).rejects.toThrow();
    });
  });

  describe('caching', () => {
    it('should cache permission check results when enabled', async () => {
      process.env.CERBOS_CACHE_ENABLED = 'true';
      const cachedService = new CerbosAuthService();
      (cachedService as any).client = mockCerbosClient;

      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => true,
      });

      await cachedService.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      await cachedService.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      expect(mockCerbosClient.checkResource).toHaveBeenCalledTimes(1);
    });

    it('should not cache when caching is disabled', async () => {
      process.env.CERBOS_CACHE_ENABLED = 'false';
      const uncachedService = new CerbosAuthService();
      (uncachedService as any).client = mockCerbosClient;

      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => true,
      });

      await uncachedService.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      await uncachedService.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      expect(mockCerbosClient.checkResource).toHaveBeenCalledTimes(2);
    });

    it('should respect cache TTL', async () => {
      process.env.CERBOS_CACHE_ENABLED = 'true';
      process.env.CERBOS_CACHE_TTL = '100';

      const cachedService = new CerbosAuthService();
      (cachedService as any).client = mockCerbosClient;

      mockCerbosClient.checkResource.mockResolvedValue({
        isAllowed: (action: string) => true,
      });

      await cachedService.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      await cachedService.checkPermission({
        principal: mockPrincipal,
        resource: mockResource,
        action: 'view',
      });

      expect(mockCerbosClient.checkResource).toHaveBeenCalledTimes(2);
    });
  });
});