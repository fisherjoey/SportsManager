import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';

interface PolicyRule {
  actions: string[];
  effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
  roles?: string[];
  derivedRoles?: string[];
  condition?: {
    match?: {
      expr?: string;
      all?: { of: Array<{ expr: string }> };
      any?: { of: Array<{ expr: string }> };
    };
  };
}

interface ResourcePolicy {
  apiVersion: string;
  resourcePolicy: {
    resource: string;
    version: string;
    importDerivedRoles?: string[];
    rules: PolicyRule[];
  };
}

interface DerivedRole {
  name: string;
  parentRoles: string[];
  condition?: {
    match: {
      expr: string;
    };
  };
}

interface DerivedRolesPolicy {
  apiVersion: string;
  derivedRoles: {
    name: string;
    definitions: DerivedRole[];
  };
}

export interface ResourceInfo {
  kind: string;
  version: string;
  actions: string[];
  rules: PolicyRule[];
  filePath: string;
}

export interface ActionRule {
  action: string;
  roles: {
    [role: string]: {
      effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
      condition?: string;
    };
  };
}

export class CerbosPolicyService {
  private readonly policiesPath: string;
  private readonly resourcesPath: string;
  private readonly derivedRolesPath: string;

  constructor(policiesBasePath?: string) {
    this.policiesPath = policiesBasePath || path.join(__dirname, '../../../cerbos-policies');
    this.resourcesPath = path.join(this.policiesPath, 'resources');
    this.derivedRolesPath = path.join(this.policiesPath, 'derived_roles');
  }

  async listResources(): Promise<ResourceInfo[]> {
    try {
      const files = await fs.readdir(this.resourcesPath);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      const resources: ResourceInfo[] = [];

      for (const file of yamlFiles) {
        const filePath = path.join(this.resourcesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const policy = yaml.load(content) as ResourcePolicy;

        if (policy.resourcePolicy) {
          const actions = new Set<string>();
          policy.resourcePolicy.rules.forEach(rule => {
            rule.actions.forEach(action => actions.add(action));
          });

          resources.push({
            kind: policy.resourcePolicy.resource,
            version: policy.resourcePolicy.version,
            actions: Array.from(actions),
            rules: policy.resourcePolicy.rules,
            filePath,
          });
        }
      }

      return resources;
    } catch (error: any) {
      logger.error('Failed to list resources', { error: error.message });
      throw new Error(`Failed to list resources: ${error.message}`);
    }
  }

  async getResource(kind: string): Promise<ResourcePolicy | null> {
    try {
      const filePath = path.join(this.resourcesPath, `${kind}.yaml`);
      const content = await fs.readFile(filePath, 'utf-8');
      return yaml.load(content) as ResourcePolicy;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      logger.error('Failed to get resource', { kind, error: error.message });
      throw new Error(`Failed to get resource ${kind}: ${error.message}`);
    }
  }

  async createResource(
    kind: string,
    version: string = 'default',
    importDerivedRoles: string[] = []
  ): Promise<ResourcePolicy> {
    try {
      const existing = await this.getResource(kind);
      if (existing) {
        throw new Error(`Resource ${kind} already exists`);
      }

      const policy: ResourcePolicy = {
        apiVersion: 'api.cerbos.dev/v1',
        resourcePolicy: {
          resource: kind,
          version,
          importDerivedRoles: importDerivedRoles.length > 0 ? importDerivedRoles : undefined,
          rules: [],
        },
      };

      await this.saveResource(kind, policy);
      logger.info('Resource created', { kind, version });

      return policy;
    } catch (error: any) {
      logger.error('Failed to create resource', { kind, error: error.message });
      throw new Error(`Failed to create resource ${kind}: ${error.message}`);
    }
  }

  async updateResource(kind: string, policy: ResourcePolicy): Promise<ResourcePolicy> {
    try {
      const existing = await this.getResource(kind);
      if (!existing) {
        throw new Error(`Resource ${kind} not found`);
      }

      await this.saveResource(kind, policy);
      logger.info('Resource updated', { kind });

      return policy;
    } catch (error: any) {
      logger.error('Failed to update resource', { kind, error: error.message });
      throw new Error(`Failed to update resource ${kind}: ${error.message}`);
    }
  }

  async deleteResource(kind: string): Promise<boolean> {
    try {
      const filePath = path.join(this.resourcesPath, `${kind}.yaml`);
      await fs.unlink(filePath);
      logger.info('Resource deleted', { kind });
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      logger.error('Failed to delete resource', { kind, error: error.message });
      throw new Error(`Failed to delete resource ${kind}: ${error.message}`);
    }
  }

  async addAction(kind: string, action: string, rules?: ActionRule['roles']): Promise<ResourcePolicy> {
    try {
      const policy = await this.getResource(kind);
      if (!policy) {
        throw new Error(`Resource ${kind} not found`);
      }

      const actionExists = policy.resourcePolicy.rules.some(rule =>
        rule.actions.includes(action)
      );

      if (actionExists) {
        throw new Error(`Action ${action} already exists in resource ${kind}`);
      }

      if (rules) {
        for (const [role, config] of Object.entries(rules)) {
          const rule: PolicyRule = {
            actions: [action],
            effect: config.effect,
            roles: [role],
          };

          if (config.condition) {
            rule.condition = {
              match: {
                expr: config.condition,
              },
            };
          }

          policy.resourcePolicy.rules.push(rule);
        }
      } else {
        policy.resourcePolicy.rules.push({
          actions: [action],
          effect: 'EFFECT_DENY',
          roles: ['guest'],
        });
      }

      await this.saveResource(kind, policy);
      logger.info('Action added to resource', { kind, action });

      return policy;
    } catch (error: any) {
      logger.error('Failed to add action', { kind, action, error: error.message });
      throw new Error(`Failed to add action ${action} to ${kind}: ${error.message}`);
    }
  }

  async removeAction(kind: string, action: string): Promise<ResourcePolicy> {
    try {
      const policy = await this.getResource(kind);
      if (!policy) {
        throw new Error(`Resource ${kind} not found`);
      }

      policy.resourcePolicy.rules = policy.resourcePolicy.rules.filter(rule => {
        if (rule.actions.length === 1 && rule.actions[0] === action) {
          return false;
        }

        if (rule.actions.includes(action)) {
          rule.actions = rule.actions.filter(a => a !== action);
          return rule.actions.length > 0;
        }

        return true;
      });

      await this.saveResource(kind, policy);
      logger.info('Action removed from resource', { kind, action });

      return policy;
    } catch (error: any) {
      logger.error('Failed to remove action', { kind, action, error: error.message });
      throw new Error(`Failed to remove action ${action} from ${kind}: ${error.message}`);
    }
  }

  async getRoleRules(kind: string, role: string): Promise<ActionRule[]> {
    try {
      const policy = await this.getResource(kind);
      if (!policy) {
        throw new Error(`Resource ${kind} not found`);
      }

      const roleRules: ActionRule[] = [];
      const actionMap = new Map<string, ActionRule>();

      for (const rule of policy.resourcePolicy.rules) {
        if (rule.roles?.includes(role) || rule.derivedRoles?.includes(role)) {
          for (const action of rule.actions) {
            if (!actionMap.has(action)) {
              actionMap.set(action, {
                action,
                roles: {},
              });
            }

            const actionRule = actionMap.get(action)!;
            actionRule.roles[role] = {
              effect: rule.effect,
              condition: rule.condition?.match?.expr,
            };
          }
        }
      }

      return Array.from(actionMap.values());
    } catch (error: any) {
      logger.error('Failed to get role rules', { kind, role, error: error.message });
      throw new Error(`Failed to get role rules for ${role} in ${kind}: ${error.message}`);
    }
  }

  async setRoleRules(
    kind: string,
    role: string,
    actions: { [action: string]: { effect: 'EFFECT_ALLOW' | 'EFFECT_DENY'; condition?: string } }
  ): Promise<ResourcePolicy> {
    try {
      const policy = await this.getResource(kind);
      if (!policy) {
        throw new Error(`Resource ${kind} not found`);
      }

      policy.resourcePolicy.rules = policy.resourcePolicy.rules.filter(
        rule => !rule.roles?.includes(role) && !rule.derivedRoles?.includes(role)
      );

      for (const [action, config] of Object.entries(actions)) {
        const rule: PolicyRule = {
          actions: [action],
          effect: config.effect,
          roles: [role],
        };

        if (config.condition) {
          rule.condition = {
            match: {
              expr: config.condition,
            },
          };
        }

        policy.resourcePolicy.rules.push(rule);
      }

      await this.saveResource(kind, policy);
      logger.info('Role rules updated', { kind, role });

      return policy;
    } catch (error: any) {
      logger.error('Failed to set role rules', { kind, role, error: error.message });
      throw new Error(`Failed to set role rules for ${role} in ${kind}: ${error.message}`);
    }
  }

  async validatePolicy(policy: ResourcePolicy): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const errors: string[] = [];

      if (!policy.apiVersion) {
        errors.push('apiVersion is required');
      }

      if (!policy.resourcePolicy) {
        errors.push('resourcePolicy is required');
        return { valid: false, errors };
      }

      if (!policy.resourcePolicy.resource) {
        errors.push('resource is required');
      }

      if (!policy.resourcePolicy.version) {
        errors.push('version is required');
      }

      if (!Array.isArray(policy.resourcePolicy.rules)) {
        errors.push('rules must be an array');
      } else {
        policy.resourcePolicy.rules.forEach((rule, index) => {
          if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
            errors.push(`Rule ${index}: actions must be a non-empty array`);
          }

          if (!rule.effect || !['EFFECT_ALLOW', 'EFFECT_DENY'].includes(rule.effect)) {
            errors.push(`Rule ${index}: effect must be EFFECT_ALLOW or EFFECT_DENY`);
          }

          if (!rule.roles && !rule.derivedRoles) {
            errors.push(`Rule ${index}: must specify either roles or derivedRoles`);
          }
        });
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    } catch (error: any) {
      logger.error('Policy validation failed', { error: error.message });
      return { valid: false, errors: [error.message] };
    }
  }

  private async saveResource(kind: string, policy: ResourcePolicy): Promise<void> {
    const filePath = path.join(this.resourcesPath, `${kind}.yaml`);
    const tempPath = `${filePath}.tmp`;

    try {
      const validation = await this.validatePolicy(policy);
      if (!validation.valid) {
        throw new Error(`Policy validation failed: ${validation.errors?.join(', ')}`);
      }

      const yamlContent = yaml.dump(policy, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });

      await fs.writeFile(tempPath, yamlContent, 'utf-8');
      await fs.rename(tempPath, filePath);

      logger.info('Policy saved', { kind, filePath });
    } catch (error: any) {
      try {
        await fs.unlink(tempPath);
      } catch {}

      throw error;
    }
  }

  async getDerivedRoles(): Promise<DerivedRolesPolicy | null> {
    try {
      const filePath = path.join(this.derivedRolesPath, 'common_roles.yaml');
      const content = await fs.readFile(filePath, 'utf-8');
      return yaml.load(content) as DerivedRolesPolicy;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      logger.error('Failed to get derived roles', { error: error.message });
      throw new Error(`Failed to get derived roles: ${error.message}`);
    }
  }
}

export default CerbosPolicyService;