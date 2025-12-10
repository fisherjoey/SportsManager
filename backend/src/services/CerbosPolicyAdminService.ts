import { logger } from '../utils/logger';

// Types for Cerbos Admin API
export interface PolicyRule {
  actions: string[];
  effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
  roles?: string[];
  derivedRoles?: string[];
  name?: string;
  condition?: {
    match?: {
      expr?: string;
      all?: { of: Array<{ expr: string }> };
      any?: { of: Array<{ expr: string }> };
    };
  };
}

export interface ResourcePolicy {
  apiVersion: string;
  resourcePolicy: {
    resource: string;
    version: string;
    importDerivedRoles?: string[];
    rules: PolicyRule[];
  };
}

export interface DerivedRole {
  name: string;
  parentRoles: string[];
  condition?: {
    match: {
      expr: string;
    };
  };
}

export interface DerivedRolesPolicy {
  apiVersion: string;
  derivedRoles: {
    name: string;
    definitions: DerivedRole[];
  };
}

export interface PrincipalPolicy {
  apiVersion: string;
  principalPolicy: {
    principal: string;
    version: string;
    rules: Array<{
      resource: string;
      actions: Array<{
        action: string;
        effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
        condition?: { match: { expr: string } };
      }>;
    }>;
  };
}

export interface PolicyInfo {
  id: string;
  kind: 'RESOURCE' | 'PRINCIPAL' | 'DERIVED_ROLES';
  name: string;
  version: string;
  description?: string;
  disabled: boolean;
}

export interface ResourceInfo {
  kind: string;
  version: string;
  actions: string[];
  rules: PolicyRule[];
  policyId?: string;
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

export class CerbosPolicyAdminService {
  private readonly adminApiUrl: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;
  private readonly authHeader: string;

  constructor() {
    this.adminApiUrl = process.env.CERBOS_ADMIN_URL || 'http://localhost:3592';
    this.adminUsername = process.env.CERBOS_ADMIN_USER || 'cerbos';
    this.adminPassword = process.env.CERBOS_ADMIN_PASS || 'cerbosAdmin';
    this.authHeader = `Basic ${Buffer.from(`${this.adminUsername}:${this.adminPassword}`).toString('base64')}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.adminApiUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const text = await response.text();

      if (!response.ok) {
        logger.error('Cerbos Admin API error', {
          status: response.status,
          url,
          body: text
        });
        throw new Error(`Cerbos Admin API error (${response.status}): ${text}`);
      }

      return text ? JSON.parse(text) : null;
    } catch (error: any) {
      if (error.message.includes('Cerbos Admin API error')) {
        throw error;
      }
      logger.error('Failed to connect to Cerbos Admin API', { url, error: error.message });
      throw new Error(`Failed to connect to Cerbos Admin API: ${error.message}`);
    }
  }

  async listPolicies(): Promise<PolicyInfo[]> {
    try {
      const response = await this.request<{ policyIds: string[] }>('GET', '/admin/policies');

      // Parse policy IDs into PolicyInfo objects
      const policies: PolicyInfo[] = [];
      for (const id of response.policyIds || []) {
        const parts = id.split('.');
        const kind = parts[0]?.toUpperCase() as 'RESOURCE' | 'PRINCIPAL' | 'DERIVED_ROLES';
        const name = parts[1] || '';
        const version = parts[2] || 'default';

        policies.push({
          id,
          kind: kind === 'RESOURCE' ? 'RESOURCE' :
                kind === 'PRINCIPAL' ? 'PRINCIPAL' : 'DERIVED_ROLES',
          name,
          version,
          disabled: false,
        });
      }

      return policies;
    } catch (error: any) {
      logger.error('Failed to list policies', { error: error.message });
      throw new Error(`Failed to list policies: ${error.message}`);
    }
  }

  async listResources(): Promise<ResourceInfo[]> {
    try {
      const policies = await this.listPolicies();
      const resourcePolicies = policies.filter(p => p.kind === 'RESOURCE');

      const resources: ResourceInfo[] = [];
      for (const policy of resourcePolicies) {
        try {
          const fullPolicy = await this.getPolicy(policy.id);
          if (fullPolicy?.resourcePolicy) {
            const actions = new Set<string>();
            fullPolicy.resourcePolicy.rules.forEach((rule: PolicyRule) => {
              rule.actions.forEach(action => actions.add(action));
            });

            resources.push({
              kind: fullPolicy.resourcePolicy.resource,
              version: fullPolicy.resourcePolicy.version,
              actions: Array.from(actions),
              rules: fullPolicy.resourcePolicy.rules,
              policyId: policy.id,
            });
          }
        } catch (err) {
          logger.warn('Failed to fetch policy details', { policyId: policy.id });
        }
      }

      return resources;
    } catch (error: any) {
      logger.error('Failed to list resources', { error: error.message });
      throw new Error(`Failed to list resources: ${error.message}`);
    }
  }

  async getPolicy(policyId: string): Promise<any> {
    try {
      const response = await this.request<{ policies: any[] }>('GET', `/admin/policy?id=${encodeURIComponent(policyId)}`);
      return response.policies?.[0];
    } catch (error: any) {
      logger.error('Failed to get policy', { policyId, error: error.message });
      throw new Error(`Failed to get policy ${policyId}: ${error.message}`);
    }
  }

  async getResource(kind: string): Promise<ResourcePolicy | null> {
    try {
      // Try different policy ID formats
      const policyIds = [
        `resource.${kind}.default`,
        `resource.${kind}.vdefault`,
      ];

      for (const policyId of policyIds) {
        try {
          const response = await this.request<{ policies: any[] }>('GET', `/admin/policy?id=${encodeURIComponent(policyId)}`);
          if (response.policies?.[0]) {
            return response.policies[0];
          }
        } catch {
          // Try next format
        }
      }

      // If not found by ID, search through all policies
      const allPolicies = await this.listPolicies();
      const resourcePolicy = allPolicies.find(p =>
        p.kind === 'RESOURCE' && p.name === kind
      );

      if (resourcePolicy) {
        const response = await this.request<{ policies: any[] }>(
          'GET',
          `/admin/policy?id=${encodeURIComponent(resourcePolicy.id)}`
        );
        return response.policies?.[0] || null;
      }

      return null;
    } catch (error: any) {
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

      await this.putPolicy(policy);
      logger.info('Resource created via Admin API', { kind, version });

      return policy;
    } catch (error: any) {
      logger.error('Failed to create resource', { kind, error: error.message });
      throw new Error(`Failed to create resource ${kind}: ${error.message}`);
    }
  }

  async updateResource(kind: string, policy: ResourcePolicy): Promise<ResourcePolicy> {
    try {
      const validation = await this.validatePolicy(policy);
      if (!validation.valid) {
        throw new Error(`Policy validation failed: ${validation.errors?.join(', ')}`);
      }

      await this.putPolicy(policy);
      logger.info('Resource updated via Admin API', { kind });

      return policy;
    } catch (error: any) {
      logger.error('Failed to update resource', { kind, error: error.message });
      throw new Error(`Failed to update resource ${kind}: ${error.message}`);
    }
  }

  async deleteResource(kind: string): Promise<boolean> {
    try {
      const policyId = `resource.${kind}.default`;
      await this.request('DELETE', `/admin/policy?id=${encodeURIComponent(policyId)}`);
      logger.info('Resource deleted via Admin API', { kind });
      return true;
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        return false;
      }
      logger.error('Failed to delete resource', { kind, error: error.message });
      throw new Error(`Failed to delete resource ${kind}: ${error.message}`);
    }
  }

  async putPolicy(policy: ResourcePolicy | DerivedRolesPolicy | PrincipalPolicy): Promise<void> {
    try {
      await this.request('PUT', '/admin/policy', { policies: [policy] });
    } catch (error: any) {
      logger.error('Failed to put policy', { error: error.message });
      throw new Error(`Failed to save policy: ${error.message}`);
    }
  }

  async addAction(kind: string, action: string, rules?: ActionRule['roles']): Promise<ResourcePolicy> {
    try {
      const policy = await this.getResource(kind);
      if (!policy) {
        throw new Error(`Resource ${kind} not found`);
      }

      const actionExists = policy.resourcePolicy.rules.some((rule: PolicyRule) =>
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

      await this.putPolicy(policy);
      logger.info('Action added to resource via Admin API', { kind, action });

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

      policy.resourcePolicy.rules = policy.resourcePolicy.rules.filter((rule: PolicyRule) => {
        if (rule.actions.length === 1 && rule.actions[0] === action) {
          return false;
        }

        if (rule.actions.includes(action)) {
          rule.actions = rule.actions.filter((a: string) => a !== action);
          return rule.actions.length > 0;
        }

        return true;
      });

      await this.putPolicy(policy);
      logger.info('Action removed from resource via Admin API', { kind, action });

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

      // Remove existing rules for this role
      policy.resourcePolicy.rules = policy.resourcePolicy.rules.filter(
        (rule: PolicyRule) => !rule.roles?.includes(role) && !rule.derivedRoles?.includes(role)
      );

      // Add new rules
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

      await this.putPolicy(policy);
      logger.info('Role rules updated via Admin API', { kind, role });

      return policy;
    } catch (error: any) {
      logger.error('Failed to set role rules', { kind, role, error: error.message });
      throw new Error(`Failed to set role rules for ${role} in ${kind}: ${error.message}`);
    }
  }

  async validatePolicy(policy: ResourcePolicy): Promise<{ valid: boolean; errors?: string[] }> {
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
  }

  async getDerivedRoles(): Promise<DerivedRolesPolicy | null> {
    try {
      const policies = await this.listPolicies();
      const derivedRolesPolicy = policies.find(p => p.kind === 'DERIVED_ROLES');

      if (derivedRolesPolicy) {
        const response = await this.request<{ policies: any[] }>(
          'GET',
          `/admin/policy?id=${encodeURIComponent(derivedRolesPolicy.id)}`
        );
        return response.policies?.[0] || null;
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to get derived roles', { error: error.message });
      throw new Error(`Failed to get derived roles: ${error.message}`);
    }
  }

  async updateDerivedRoles(policy: DerivedRolesPolicy): Promise<DerivedRolesPolicy> {
    try {
      await this.putPolicy(policy);
      logger.info('Derived roles updated via Admin API');
      return policy;
    } catch (error: any) {
      logger.error('Failed to update derived roles', { error: error.message });
      throw new Error(`Failed to update derived roles: ${error.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.adminApiUrl}/_cerbos/health`);
      const data = await response.json() as { status?: string };
      return data.status === 'SERVING';
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    totalPolicies: number;
    resourcePolicies: number;
    derivedRoles: number;
    principalPolicies: number;
  }> {
    try {
      const policies = await this.listPolicies();
      return {
        totalPolicies: policies.length,
        resourcePolicies: policies.filter(p => p.kind === 'RESOURCE').length,
        derivedRoles: policies.filter(p => p.kind === 'DERIVED_ROLES').length,
        principalPolicies: policies.filter(p => p.kind === 'PRINCIPAL').length,
      };
    } catch {
      return {
        totalPolicies: 0,
        resourcePolicies: 0,
        derivedRoles: 0,
        principalPolicies: 0,
      };
    }
  }
}

export default CerbosPolicyAdminService;
