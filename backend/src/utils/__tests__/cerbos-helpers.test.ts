import {
  toPrincipal,
  toResource,
  createGameResource,
  createAssignmentResource,
  createRefereeResource,
} from '../cerbos-helpers';
import type { User, RoleEntity } from '../../types/database.types';
import type { AuthenticatedUser } from '../../types/auth.types';
import type {
  CerbosPrincipal,
  CerbosResource,
} from '../../types/cerbos.types';

describe('Cerbos Helper Functions', () => {
  describe('toPrincipal', () => {
    it('should convert AuthenticatedUser to CerbosPrincipal', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'assignor@example.com',
        name: 'John Assignor',
        role: 'assignor',
        is_active: true,
        email_verified: true,
        permissions: ['game:create', 'game:view', 'game:update'],
        resource_permissions: {
          game: ['create', 'view', 'update'],
          assignment: ['create', 'view'],
        },
        roles: [
          {
            id: 'role-1',
            name: 'assignor',
            description: 'Assignor role',
            is_system: true,
            is_active: true,
            priority: 100,
            permissions: ['game:create'],
            resource_permissions: {},
            settings: {} as any,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };

      const principal = toPrincipal(user, 'org-456', 'region-789', [
        'region-789',
        'region-101',
      ]);

      expect(principal).toEqual({
        id: 'user-123',
        roles: ['assignor'],
        attr: {
          organizationId: 'org-456',
          primaryRegionId: 'region-789',
          regionIds: ['region-789', 'region-101'],
          permissions: ['game:create', 'game:view', 'game:update'],
          email: 'assignor@example.com',
          isActive: true,
        },
      });
    });

    it('should handle user with multiple roles', () => {
      const user: AuthenticatedUser = {
        id: 'user-456',
        email: 'multi@example.com',
        name: 'Multi Role',
        role: 'assignor',
        is_active: true,
        email_verified: true,
        permissions: ['game:create'],
        resource_permissions: {},
        roles: [
          {
            id: 'role-1',
            name: 'assignor',
            is_system: true,
          } as RoleEntity,
          {
            id: 'role-2',
            name: 'referee',
            is_system: true,
          } as RoleEntity,
        ],
      };

      const principal = toPrincipal(user, 'org-1', 'region-1', ['region-1']);

      expect(principal.roles).toEqual(['assignor', 'referee']);
    });

    it('should handle user with no regions', () => {
      const user: AuthenticatedUser = {
        id: 'user-789',
        email: 'noreg@example.com',
        name: 'No Region',
        role: 'guest',
        is_active: true,
        email_verified: true,
        permissions: [],
        resource_permissions: {},
        roles: [],
      };

      const principal = toPrincipal(user, 'org-1');

      expect(principal.attr.regionIds).toEqual([]);
      expect(principal.attr.primaryRegionId).toBeUndefined();
    });

    it('should handle inactive user', () => {
      const user: AuthenticatedUser = {
        id: 'user-inactive',
        email: 'inactive@example.com',
        name: 'Inactive User',
        role: 'referee',
        is_active: false,
        email_verified: true,
        permissions: [],
        resource_permissions: {},
        roles: [],
      };

      const principal = toPrincipal(user, 'org-1');

      expect(principal.attr.isActive).toBe(false);
    });

    it('should extract unique role names from roles array', () => {
      const user: AuthenticatedUser = {
        id: 'user-dup',
        email: 'dup@example.com',
        name: 'Duplicate Roles',
        role: 'assignor',
        is_active: true,
        email_verified: true,
        permissions: [],
        resource_permissions: {},
        roles: [
          { id: 'r1', name: 'assignor' } as RoleEntity,
          { id: 'r2', name: 'assignor' } as RoleEntity,
          { id: 'r3', name: 'referee' } as RoleEntity,
        ],
      };

      const principal = toPrincipal(user, 'org-1');

      expect(principal.roles).toEqual(['assignor', 'referee']);
    });

    it('should fall back to user.role if roles array is empty', () => {
      const user: AuthenticatedUser = {
        id: 'user-fallback',
        email: 'fallback@example.com',
        name: 'Fallback User',
        role: 'referee',
        is_active: true,
        email_verified: true,
        permissions: [],
        resource_permissions: {},
        roles: [],
      };

      const principal = toPrincipal(user, 'org-1');

      expect(principal.roles).toEqual(['referee']);
    });
  });

  describe('toResource', () => {
    it('should convert generic resource to CerbosResource', () => {
      const gameData = {
        id: 'game-123',
        organization_id: 'org-456',
        region_id: 'region-789',
        created_by: 'user-111',
        status: 'scheduled',
        level: 'varsity',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
      };

      const resource = toResource('game', gameData);

      expect(resource.kind).toBe('game');
      expect(resource.id).toBe('game-123');
      expect(resource.attr).toMatchObject({
        organizationId: gameData.organization_id,
        regionId: gameData.region_id,
        createdBy: gameData.created_by,
        status: gameData.status,
        level: gameData.level,
      });
    });

    it('should handle resource without organization_id', () => {
      const resource = toResource('game', {
        id: 'game-999',
        status: 'scheduled',
      });

      expect(resource.attr.organizationId).toBeUndefined();
    });

    it('should include all provided attributes', () => {
      const customData = {
        id: 'res-1',
        organization_id: 'org-1',
        custom_field: 'custom_value',
        nested: { prop: 'value' },
        number_field: 42,
        boolean_field: true,
      };

      const resource = toResource('custom', customData);

      expect(resource.attr).toMatchObject({
        organizationId: 'org-1',
        custom_field: 'custom_value',
        nested: { prop: 'value' },
        number_field: 42,
        boolean_field: true,
      });
    });
  });

  describe('createGameResource', () => {
    it('should create game resource with all fields', () => {
      const game = {
        id: 'game-123',
        organization_id: 'org-456',
        region_id: 'region-789',
        created_by: 'user-111',
        status: 'scheduled',
        level: 'varsity',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        date: '2025-10-01',
        time: '19:00',
        location: 'Field A',
        type: 'regular',
        division: 'D1',
        age_group: 'U16',
        requires_certified_referee: true,
      };

      const resource = createGameResource(game);

      expect(resource.kind).toBe('game');
      expect(resource.id).toBe('game-123');
      expect(resource.attr).toMatchObject({
        organizationId: 'org-456',
        regionId: 'region-789',
        createdBy: 'user-111',
        status: 'scheduled',
        level: 'varsity',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        type: 'regular',
        division: 'D1',
        ageGroup: 'U16',
        requiresCertifiedReferee: true,
      });
    });

    it('should handle minimal game data', () => {
      const game = {
        id: 'game-minimal',
        organization_id: 'org-1',
        status: 'scheduled',
      };

      const resource = createGameResource(game);

      expect(resource.kind).toBe('game');
      expect(resource.id).toBe('game-minimal');
      expect(resource.attr.organizationId).toBe('org-1');
      expect(resource.attr.status).toBe('scheduled');
    });

    it('should convert snake_case to camelCase', () => {
      const game = {
        id: 'game-1',
        organization_id: 'org-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        requires_certified_referee: true,
      };

      const resource = createGameResource(game);

      expect(resource.attr).toHaveProperty('homeTeamId');
      expect(resource.attr).toHaveProperty('awayTeamId');
      expect(resource.attr).toHaveProperty('requiresCertifiedReferee');
      expect(resource.attr).not.toHaveProperty('home_team_id');
    });
  });

  describe('createAssignmentResource', () => {
    it('should create assignment resource', () => {
      const assignment = {
        id: 'assignment-123',
        organization_id: 'org-456',
        game_id: 'game-789',
        referee_id: 'referee-111',
        created_by: 'user-222',
        status: 'confirmed',
        position: 'head_referee',
        wage: 50,
      };

      const resource = createAssignmentResource(assignment);

      expect(resource.kind).toBe('assignment');
      expect(resource.id).toBe('assignment-123');
      expect(resource.attr).toMatchObject({
        organizationId: 'org-456',
        gameId: 'game-789',
        refereeId: 'referee-111',
        createdBy: 'user-222',
        status: 'confirmed',
        position: 'head_referee',
        wage: 50,
      });
    });

    it('should handle assignment without referee', () => {
      const assignment = {
        id: 'assignment-unassigned',
        organization_id: 'org-1',
        game_id: 'game-1',
        status: 'pending',
      };

      const resource = createAssignmentResource(assignment);

      expect(resource.attr.refereeId).toBeUndefined();
      expect(resource.attr.status).toBe('pending');
    });
  });

  describe('createRefereeResource', () => {
    it('should create referee resource with certification', () => {
      const referee = {
        id: 'referee-123',
        organization_id: 'org-456',
        user_id: 'user-789',
        certification_level: 'Level 3',
        primary_region_id: 'region-101',
        is_available: true,
        max_distance: 50,
        experience_years: 5,
      };

      const resource = createRefereeResource(referee);

      expect(resource.kind).toBe('referee');
      expect(resource.id).toBe('referee-123');
      expect(resource.attr).toMatchObject({
        organizationId: 'org-456',
        userId: 'user-789',
        certificationLevel: 'Level 3',
        primaryRegionId: 'region-101',
        isAvailable: true,
        maxDistance: 50,
        experienceYears: 5,
      });
    });

    it('should handle referee without certification', () => {
      const referee = {
        id: 'referee-new',
        organization_id: 'org-1',
        user_id: 'user-1',
        is_available: false,
      };

      const resource = createRefereeResource(referee);

      expect(resource.attr.certificationLevel).toBeUndefined();
      expect(resource.attr.isAvailable).toBe(false);
    });
  });

  describe('attribute normalization', () => {
    it('should normalize organization_id to organizationId', () => {
      const resource = toResource('test', {
        id: 'test-1',
        organization_id: 'org-1',
      });

      expect(resource.attr.organizationId).toBe('org-1');
      expect(resource.attr).not.toHaveProperty('organization_id');
    });

    it('should normalize region_id to regionId', () => {
      const resource = toResource('test', {
        id: 'test-1',
        region_id: 'region-1',
      });

      expect(resource.attr.regionId).toBe('region-1');
      expect(resource.attr).not.toHaveProperty('region_id');
    });

    it('should normalize created_by to createdBy', () => {
      const resource = toResource('test', {
        id: 'test-1',
        created_by: 'user-1',
      });

      expect(resource.attr.createdBy).toBe('user-1');
      expect(resource.attr).not.toHaveProperty('created_by');
    });

    it('should preserve camelCase attributes', () => {
      const resource = toResource('test', {
        id: 'test-1',
        alreadyCamelCase: 'value',
        anotherOne: 123,
      });

      expect(resource.attr.alreadyCamelCase).toBe('value');
      expect(resource.attr.anotherOne).toBe(123);
    });

    it('should handle mixed snake_case and camelCase', () => {
      const resource = toResource('test', {
        id: 'test-1',
        snake_case_field: 'snake',
        camelCaseField: 'camel',
        another_snake: 'value',
      });

      expect(resource.attr.snakeCaseField).toBe('snake');
      expect(resource.attr.camelCaseField).toBe('camel');
      expect(resource.attr.anotherSnake).toBe('value');
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      const resource = toResource('test', {
        id: 'test-1',
        null_field: null,
        organization_id: 'org-1',
      });

      expect(resource.attr.nullField).toBeNull();
    });

    it('should handle undefined values', () => {
      const resource = toResource('test', {
        id: 'test-1',
        undefined_field: undefined,
        organization_id: 'org-1',
      });

      expect(resource.attr).not.toHaveProperty('undefinedField');
    });

    it('should handle empty strings', () => {
      const resource = toResource('test', {
        id: 'test-1',
        empty_string: '',
        organization_id: 'org-1',
      });

      expect(resource.attr.emptyString).toBe('');
    });

    it('should handle array attributes', () => {
      const resource = toResource('test', {
        id: 'test-1',
        tags: ['tag1', 'tag2', 'tag3'],
        organization_id: 'org-1',
      });

      expect(resource.attr.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle nested object attributes', () => {
      const resource = toResource('test', {
        id: 'test-1',
        metadata: {
          key1: 'value1',
          nested: {
            key2: 'value2',
          },
        },
        organization_id: 'org-1',
      });

      expect(resource.attr.metadata).toEqual({
        key1: 'value1',
        nested: {
          key2: 'value2',
        },
      });
    });

    it('should handle date objects', () => {
      const date = new Date('2025-10-01T19:00:00Z');
      const resource = toResource('test', {
        id: 'test-1',
        scheduled_date: date,
        organization_id: 'org-1',
      });

      expect(resource.attr.scheduledDate).toBe(date);
    });
  });
});