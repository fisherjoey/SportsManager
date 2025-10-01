import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { CerbosPolicyService } from '../CerbosPolicyService';

const TEST_POLICIES_PATH = path.join(__dirname, '../../../test-policies');

describe('CerbosPolicyService', () => {
  let service: CerbosPolicyService;

  beforeEach(async () => {
    await fs.mkdir(TEST_POLICIES_PATH, { recursive: true });
    await fs.mkdir(path.join(TEST_POLICIES_PATH, 'resources'), { recursive: true });
    await fs.mkdir(path.join(TEST_POLICIES_PATH, 'derived_roles'), { recursive: true });
    service = new CerbosPolicyService(TEST_POLICIES_PATH);
  });

  afterEach(async () => {
    await fs.rm(TEST_POLICIES_PATH, { recursive: true, force: true });
  });

  describe('listResources', () => {
    it('should return empty array when no policies exist', async () => {
      const resources = await service.listResources();
      expect(resources).toEqual([]);
    });

    it('should list all resource policies', async () => {
      const testPolicy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: 'test_resource',
          version: 'default',
          rules: [
            {
              actions: ['view', 'list'],
              effect: 'EFFECT_ALLOW' as const,
              roles: ['admin'],
            },
          ],
        },
      };

      await fs.writeFile(
        path.join(TEST_POLICIES_PATH, 'resources', 'test_resource.yaml'),
        `apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: test_resource
  version: default
  rules:
    - actions: [view, list]
      effect: EFFECT_ALLOW
      roles: [admin]
`
      );

      const resources = await service.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].kind).toBe('test_resource');
      expect(resources[0].version).toBe('default');
      expect(resources[0].actions).toContain('view');
      expect(resources[0].actions).toContain('list');
    });
  });

  describe('getResource', () => {
    it('should return null for non-existent resource', async () => {
      const resource = await service.getResource('nonexistent');
      expect(resource).toBeNull();
    });

    it('should return resource policy', async () => {
      await fs.writeFile(
        path.join(TEST_POLICIES_PATH, 'resources', 'test.yaml'),
        `apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: test
  version: default
  rules:
    - actions: [view]
      effect: EFFECT_ALLOW
      roles: [admin]
`
      );

      const resource = await service.getResource('test');
      expect(resource).not.toBeNull();
      expect(resource?.resourcePolicy.resource).toBe('test');
    });
  });

  describe('createResource', () => {
    it('should create new resource policy', async () => {
      const policy = await service.createResource('new_resource', 'default', ['common_roles']);

      expect(policy.apiVersion).toBe('api.cerbos.dev/v1');
      expect(policy.resourcePolicy.resource).toBe('new_resource');
      expect(policy.resourcePolicy.version).toBe('default');
      expect(policy.resourcePolicy.importDerivedRoles).toContain('common_roles');
      expect(policy.resourcePolicy.rules).toEqual([]);

      const fileExists = await fs
        .access(path.join(TEST_POLICIES_PATH, 'resources', 'new_resource.yaml'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should throw error if resource already exists', async () => {
      await service.createResource('existing', 'default');

      await expect(service.createResource('existing', 'default')).rejects.toThrow(
        'Resource existing already exists'
      );
    });
  });

  describe('updateResource', () => {
    it('should update existing resource', async () => {
      const created = await service.createResource('updatable', 'default');

      created.resourcePolicy.rules.push({
        actions: ['view'],
        effect: 'EFFECT_ALLOW',
        roles: ['admin'],
      });

      const updated = await service.updateResource('updatable', created);

      expect(updated.resourcePolicy.rules).toHaveLength(1);
      expect(updated.resourcePolicy.rules[0].actions).toContain('view');
    });

    it('should throw error for non-existent resource', async () => {
      const policy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: 'nonexistent',
          version: 'default',
          rules: [],
        },
      };

      await expect(service.updateResource('nonexistent', policy)).rejects.toThrow(
        'Resource nonexistent not found'
      );
    });
  });

  describe('deleteResource', () => {
    it('should delete existing resource', async () => {
      await service.createResource('deletable', 'default');

      const deleted = await service.deleteResource('deletable');
      expect(deleted).toBe(true);

      const resource = await service.getResource('deletable');
      expect(resource).toBeNull();
    });

    it('should return false for non-existent resource', async () => {
      const deleted = await service.deleteResource('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('addAction', () => {
    beforeEach(async () => {
      await service.createResource('actionable', 'default');
    });

    it('should add action with default deny for guest', async () => {
      const policy = await service.addAction('actionable', 'new_action');

      expect(policy.resourcePolicy.rules).toHaveLength(1);
      expect(policy.resourcePolicy.rules[0].actions).toContain('new_action');
      expect(policy.resourcePolicy.rules[0].effect).toBe('EFFECT_DENY');
      expect(policy.resourcePolicy.rules[0].roles).toContain('guest');
    });

    it('should add action with custom role rules', async () => {
      const policy = await service.addAction('actionable', 'custom_action', {
        admin: { effect: 'EFFECT_ALLOW' },
        assignor: {
          effect: 'EFFECT_ALLOW',
          condition: 'R.attr.organizationId == P.attr.organizationId',
        },
      });

      expect(policy.resourcePolicy.rules).toHaveLength(2);

      const adminRule = policy.resourcePolicy.rules.find(r => r.roles?.includes('admin'));
      expect(adminRule?.effect).toBe('EFFECT_ALLOW');

      const assignorRule = policy.resourcePolicy.rules.find(r => r.roles?.includes('assignor'));
      expect(assignorRule?.effect).toBe('EFFECT_ALLOW');
      expect(assignorRule?.condition?.match?.expr).toBe(
        'R.attr.organizationId == P.attr.organizationId'
      );
    });

    it('should throw error if action already exists', async () => {
      await service.addAction('actionable', 'duplicate_action');

      await expect(service.addAction('actionable', 'duplicate_action')).rejects.toThrow(
        'Action duplicate_action already exists'
      );
    });
  });

  describe('removeAction', () => {
    beforeEach(async () => {
      await service.createResource('removable', 'default');
      await service.addAction('removable', 'removable_action');
    });

    it('should remove action from resource', async () => {
      const policy = await service.removeAction('removable', 'removable_action');

      const hasAction = policy.resourcePolicy.rules.some(rule =>
        rule.actions.includes('removable_action')
      );
      expect(hasAction).toBe(false);
    });

    it('should handle removing non-existent action gracefully', async () => {
      const policy = await service.removeAction('removable', 'nonexistent_action');
      expect(policy).toBeDefined();
    });
  });

  describe('getRoleRules', () => {
    beforeEach(async () => {
      await service.createResource('roleable', 'default');
      await service.addAction('roleable', 'view', {
        admin: { effect: 'EFFECT_ALLOW' },
        referee: { effect: 'EFFECT_DENY' },
      });
    });

    it('should get rules for specific role', async () => {
      const rules = await service.getRoleRules('roleable', 'admin');

      expect(rules).toHaveLength(1);
      expect(rules[0].action).toBe('view');
      expect(rules[0].roles.admin.effect).toBe('EFFECT_ALLOW');
    });

    it('should return empty array for role with no rules', async () => {
      const rules = await service.getRoleRules('roleable', 'guest');
      expect(rules).toEqual([]);
    });
  });

  describe('setRoleRules', () => {
    beforeEach(async () => {
      await service.createResource('configurable', 'default');
    });

    it('should set role rules for multiple actions', async () => {
      const policy = await service.setRoleRules('configurable', 'assignor', {
        view: { effect: 'EFFECT_ALLOW' },
        create: {
          effect: 'EFFECT_ALLOW',
          condition: 'R.attr.organizationId == P.attr.organizationId',
        },
        delete: { effect: 'EFFECT_DENY' },
      });

      expect(policy.resourcePolicy.rules).toHaveLength(3);

      const viewRule = policy.resourcePolicy.rules.find(
        r => r.actions.includes('view') && r.roles?.includes('assignor')
      );
      expect(viewRule?.effect).toBe('EFFECT_ALLOW');

      const createRule = policy.resourcePolicy.rules.find(
        r => r.actions.includes('create') && r.roles?.includes('assignor')
      );
      expect(createRule?.condition?.match?.expr).toBe(
        'R.attr.organizationId == P.attr.organizationId'
      );
    });

    it('should replace existing role rules', async () => {
      await service.setRoleRules('configurable', 'assignor', {
        view: { effect: 'EFFECT_ALLOW' },
      });

      const policy = await service.setRoleRules('configurable', 'assignor', {
        create: { effect: 'EFFECT_ALLOW' },
      });

      const viewRule = policy.resourcePolicy.rules.find(
        r => r.actions.includes('view') && r.roles?.includes('assignor')
      );
      expect(viewRule).toBeUndefined();

      const createRule = policy.resourcePolicy.rules.find(
        r => r.actions.includes('create') && r.roles?.includes('assignor')
      );
      expect(createRule).toBeDefined();
    });
  });

  describe('validatePolicy', () => {
    it('should validate correct policy', async () => {
      const policy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: 'test',
          version: 'default',
          rules: [
            {
              actions: ['view'],
              effect: 'EFFECT_ALLOW' as const,
              roles: ['admin'],
            },
          ],
        },
      };

      const result = await service.validatePolicy(policy);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject policy without apiVersion', async () => {
      const policy = {
        resourcePolicy: {
          resource: 'test',
          version: 'default',
          rules: [],
        },
      } as any;

      const result = await service.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('apiVersion is required');
    });

    it('should reject policy without resource', async () => {
      const policy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          version: 'default',
          rules: [],
        },
      } as any;

      const result = await service.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('resource is required');
    });

    it('should reject rule without actions', async () => {
      const policy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: 'test',
          version: 'default',
          rules: [
            {
              effect: 'EFFECT_ALLOW' as const,
              roles: ['admin'],
            } as any,
          ],
        },
      };

      const result = await service.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('actions must be a non-empty array'))).toBe(true);
    });

    it('should reject rule with invalid effect', async () => {
      const policy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: 'test',
          version: 'default',
          rules: [
            {
              actions: ['view'],
              effect: 'INVALID_EFFECT' as any,
              roles: ['admin'],
            },
          ],
        },
      };

      const result = await service.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(
        result.errors?.some(e => e.includes('effect must be EFFECT_ALLOW or EFFECT_DENY'))
      ).toBe(true);
    });
  });
});