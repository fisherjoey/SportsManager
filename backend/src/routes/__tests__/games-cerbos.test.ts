import request from 'supertest';
import express from 'express';
import { UserRole } from '../../types/index';

const mockCheckPermission = jest.fn();
const mockToPrincipal = jest.fn();
const mockToResource = jest.fn();

jest.mock('../../services/CerbosAuthService', () => ({
  CerbosAuthService: {
    getInstance: jest.fn().mockReturnValue({
      checkPermission: mockCheckPermission,
    }),
  },
}));

jest.mock('../../utils/cerbos-helpers', () => ({
  toPrincipal: mockToPrincipal,
  toResource: mockToResource,
}));

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

jest.mock('../../utils/logger', () => mockLogger);

jest.mock('../../config/database', () => ({
  default: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({
      id: 'game-123',
      organization_id: 'org-sports-league',
      region_id: 'region-north',
      created_by: 'assignor-456',
      status: 'scheduled',
      level: 'varsity',
      game_type: 'regular',
    }),
  })),
}));

import gamesRouter from '../games';

describe('Games Routes - Cerbos Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.use((req: any, res, next) => {
      req.user = {
        id: 'assignor-456',
        email: 'assignor@test.com',
        name: 'Test Assignor',
        role: UserRole.ASSIGNOR,
        is_active: true,
        email_verified: true,
        permissions: ['game:create', 'game:view', 'game:update'],
        resource_permissions: { game: ['create', 'view', 'update'] },
        roles: [],
        organizationId: 'org-sports-league',
        primaryRegionId: 'region-north',
        regionIds: ['region-north'],
      };
      next();
    });

    app.use('/api/games', gamesRouter);

    mockCheckPermission.mockClear();
    mockToPrincipal.mockClear();
    mockToResource.mockClear();

    mockToPrincipal.mockImplementation((user, orgId, primaryRegionId, regionIds = []) => ({
      id: user.id,
      roles: [user.role],
      attr: {
        organizationId: orgId,
        primaryRegionId,
        regionIds,
        permissions: user.permissions || [],
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

  describe('GET /api/games', () => {
    it('should allow assignor to list games when Cerbos permits', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: true });

      const response = await request(app)
        .get('/api/games')
        .expect(200);

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          id: 'assignor-456',
          roles: ['assignor'],
        }),
        resource: expect.objectContaining({
          kind: 'game',
        }),
        action: 'list',
      });
    });

    it('should deny when Cerbos denies permission', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: false });

      await request(app)
        .get('/api/games')
        .expect(403);

      expect(mockCheckPermission).toHaveBeenCalled();
    });
  });

  describe('GET /api/games/:id', () => {
    it('should allow viewing game with resource attributes', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: true });

      const response = await request(app)
        .get('/api/games/game-123')
        .expect(200);

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          id: 'assignor-456',
        }),
        resource: expect.objectContaining({
          kind: 'game',
          id: 'game-123',
          attr: expect.objectContaining({
            organizationId: 'org-sports-league',
            regionId: 'region-north',
            createdBy: 'assignor-456',
            status: 'scheduled',
          }),
        }),
        action: 'view',
      });
    });

    it('should deny viewing game in different organization', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: false });

      await request(app)
        .get('/api/games/game-other-org')
        .expect(403);
    });
  });

  describe('POST /api/games', () => {
    it('should allow creating game when Cerbos permits', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: true });

      await request(app)
        .post('/api/games')
        .send({
          homeTeam: { organization: 'Org A', ageGroup: 'U16', gender: 'Boys', rank: 1 },
          awayTeam: { organization: 'Org B', ageGroup: 'U16', gender: 'Boys', rank: 2 },
          date: '2025-10-01',
          time: '19:00',
          location: 'Field A',
          postalCode: '12345',
          level: 'varsity',
          gameType: 'regular',
          division: 'D1',
          season: 'Fall 2025',
          payRate: 50,
          refsNeeded: 3,
          wageMultiplier: 1,
        })
        .expect(201);

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          id: 'assignor-456',
        }),
        resource: expect.objectContaining({
          kind: 'game',
        }),
        action: 'create',
      });
    });

    it('should deny referee from creating games', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: false });

      await request(app)
        .post('/api/games')
        .send({
          homeTeam: {},
          awayTeam: {},
          date: '2025-10-01',
          time: '19:00',
          location: 'Field A',
        })
        .expect(403);
    });
  });

  describe('PUT /api/games/:id', () => {
    it('should allow updating own scheduled game', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: true });

      await request(app)
        .put('/api/games/game-123')
        .send({
          location: 'New Field',
          time: '20:00',
        })
        .expect(200);

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          id: 'assignor-456',
        }),
        resource: expect.objectContaining({
          kind: 'game',
          id: 'game-123',
          attr: expect.objectContaining({
            organizationId: 'org-sports-league',
            createdBy: 'assignor-456',
            status: 'scheduled',
          }),
        }),
        action: 'update',
      });
    });

    it('should deny updating game not owned', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: false });

      await request(app)
        .put('/api/games/game-123')
        .send({ location: 'New Field' })
        .expect(403);
    });
  });

  describe('DELETE /api/games/:id', () => {
    it('should allow deleting own scheduled game', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: true });

      await request(app)
        .delete('/api/games/game-123')
        .expect(200);

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          id: 'assignor-456',
        }),
        resource: expect.objectContaining({
          kind: 'game',
          attr: expect.objectContaining({
            createdBy: 'assignor-456',
            status: 'scheduled',
          }),
        }),
        action: 'delete',
      });
    });

    it('should deny deleting with custom message', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: false });

      const response = await request(app)
        .delete('/api/games/game-123')
        .expect(403);

      expect(response.body.message).toBe('You do not have permission to delete this game');
    });
  });

  describe('Organization Isolation', () => {
    it('should pass organization context to Cerbos', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: true });

      await request(app).get('/api/games');

      expect(mockToPrincipal).toHaveBeenCalledWith(
        expect.any(Object),
        'org-sports-league',
        'region-north',
        ['region-north']
      );
    });
  });

  describe('Region-Based Access', () => {
    it('should pass region context to Cerbos', async () => {
      mockCheckPermission.mockResolvedValue({ allowed: true });

      await request(app).get('/api/games/game-123');

      expect(mockCheckPermission).toHaveBeenCalledWith({
        principal: expect.objectContaining({
          attr: expect.objectContaining({
            regionIds: ['region-north'],
            primaryRegionId: 'region-north',
          }),
        }),
        resource: expect.objectContaining({
          attr: expect.objectContaining({
            regionId: 'region-north',
          }),
        }),
        action: 'view',
      });
    });
  });
});