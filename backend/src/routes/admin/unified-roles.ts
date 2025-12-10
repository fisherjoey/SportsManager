/**
 * Unified Role Management Routes
 *
 * Manages roles with Cerbos as the source of truth for role definitions and permissions,
 * while the database stores user-role assignments and optional metadata.
 */

import express, { Response, NextFunction } from 'express';
import * as Joi from 'joi';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../../types/auth.types';
import db from '../../config/database';
import logger from '../../utils/logger';
import CerbosPolicyAdminService, { ResourceInfo, DerivedRolesPolicy, PolicyRule } from '../../services/CerbosPolicyAdminService';

const router = express.Router();

// Initialize Cerbos Admin API service
const cerbosAdmin = new CerbosPolicyAdminService();

// ==========================================
// Caching Infrastructure for Admin API calls
// ==========================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = {
  resources: null as CacheEntry<ResourceInfo[]> | null,
  derivedRoles: null as CacheEntry<DerivedRolesPolicy | null> | null,
};

const CACHE_TTL = 30000; // 30 seconds

function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) {return false;}
  return Date.now() - entry.timestamp < CACHE_TTL;
}

async function getCachedResources(): Promise<ResourceInfo[]> {
  if (isCacheValid(cache.resources)) {
    return cache.resources!.data;
  }

  const resources = await cerbosAdmin.listResources();
  cache.resources = { data: resources, timestamp: Date.now() };
  return resources;
}

async function getCachedDerivedRoles(): Promise<DerivedRolesPolicy | null> {
  if (isCacheValid(cache.derivedRoles)) {
    return cache.derivedRoles!.data;
  }

  const derivedRoles = await cerbosAdmin.getDerivedRoles();
  cache.derivedRoles = { data: derivedRoles, timestamp: Date.now() };
  return derivedRoles;
}

function invalidateCache(): void {
  cache.resources = null;
  cache.derivedRoles = null;
}

// Type definitions
interface UnifiedRole {
  name: string;
  description?: string;
  permissions: string[];
  pages?: string[];
  userCount?: number;
  color?: string;
  source: 'cerbos' | 'database' | 'both';
}

interface RoleCreateData {
  name: string;
  description?: string;
  permissions: string[];
  pages?: string[];
  color?: string;
}

interface RoleUpdateData {
  description?: string;
  permissions?: string[];
  pages?: string[];
  color?: string;
}

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required()
    .pattern(/^[a-z_]+$/)
    .message('Role name must be lowercase with underscores only (e.g., super_admin)'),
  description: Joi.string().max(500).allow('', null),
  permissions: Joi.array().items(Joi.string()).default([]),
  pages: Joi.array().items(Joi.string()).default([]),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6B7280').allow('', null)
});

const updateRoleSchema = Joi.object({
  description: Joi.string().max(500).allow('', null),
  permissions: Joi.array().items(Joi.string()),
  pages: Joi.array().items(Joi.string()),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow('', null)
}).min(1);

/**
 * Helper function to fetch roles from Cerbos via Admin API
 */
async function getCerbosRoles(): Promise<Set<string>> {
  const roles = new Set<string>();

  try {
    // Get all resource policies via Admin API (cached)
    const resources = await getCachedResources();

    for (const resource of resources) {
      for (const rule of resource.rules || []) {
        // Extract roles from rules
        if (rule.roles) {
          rule.roles.forEach((role: string) => roles.add(role));
        }
        // Extract derived roles
        if (rule.derivedRoles) {
          rule.derivedRoles.forEach((role: string) => roles.add(role));
        }
      }
    }

    // Also get derived roles definitions (cached)
    const derivedRolesPolicy = await getCachedDerivedRoles();
    if (derivedRolesPolicy?.derivedRoles?.definitions) {
      for (const def of derivedRolesPolicy.derivedRoles.definitions) {
        if (def.name) {
          roles.add(def.name);
        }
      }
    }
  } catch (error) {
    logger.error('Error getting roles from Cerbos Admin API:', error);
  }

  // Always include some default roles
  roles.add('super_admin');
  roles.add('admin');
  roles.add('referee');
  roles.add('assignor');

  return roles;
}

/**
 * Helper function to get role permissions from Cerbos via Admin API
 */
async function getRolePermissions(roleName: string): Promise<string[]> {
  const permissions: string[] = [];

  try {
    // Get all resource policies via Admin API (cached)
    const resources = await getCachedResources();

    for (const resource of resources) {
      for (const rule of resource.rules || []) {
        // Check if this role is in the rule
        const hasRole = rule.roles?.includes(roleName) ||
                        rule.derivedRoles?.includes(roleName);

        if (hasRole && rule.effect === 'EFFECT_ALLOW') {
          for (const action of rule.actions || []) {
            permissions.push(`${resource.kind}:${action}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error getting role permissions from Admin API:', error);
  }

  return [...new Set(permissions)].sort();
}

/**
 * Helper function to update role permissions in Cerbos via Admin API
 */
async function updateCerbosPermissions(roleName: string, permissions: string[]): Promise<void> {
  // Group permissions by resource
  const permissionsByResource = new Map<string, string[]>();

  for (const permission of permissions) {
    // Split only on first colon to preserve nested actions like "view:list", "view:details"
    const colonIndex = permission.indexOf(':');
    if (colonIndex === -1) continue; // Skip invalid permissions

    const resource = permission.substring(0, colonIndex);
    const action = permission.substring(colonIndex + 1);

    if (!permissionsByResource.has(resource)) {
      permissionsByResource.set(resource, []);
    }
    permissionsByResource.get(resource)!.push(action);
  }

  try {
    // Get all existing resources via Admin API
    const existingResources = await cerbosAdmin.listResources();
    const allResources = new Set<string>(existingResources.map(r => r.kind));

    // Also add resources from new permissions
    for (const resource of permissionsByResource.keys()) {
      allResources.add(resource);
    }

    // Update each resource policy
    for (const resource of allResources) {
      const actions = permissionsByResource.get(resource) || [];

      try {
        const policy = await cerbosAdmin.getResource(resource);

        if (policy) {
          // Remove existing rules for this role
          policy.resourcePolicy.rules = policy.resourcePolicy.rules.filter(
            (rule: PolicyRule) => !rule.roles?.includes(roleName)
          );

          // Add new rule if there are actions
          if (actions.length > 0) {
            policy.resourcePolicy.rules.push({
              actions,
              effect: 'EFFECT_ALLOW',
              roles: [roleName]
            });
          }

          // Update via Admin API
          await cerbosAdmin.putPolicy(policy);
          logger.info(`Updated policy for resource ${resource} via Admin API for role ${roleName}`);
        } else if (actions.length > 0) {
          // Create new resource policy
          const newPolicy = {
            apiVersion: 'api.cerbos.dev/v1',
            resourcePolicy: {
              version: 'default',
              resource,
              importDerivedRoles: ['common_roles'],
              rules: [{
                actions,
                effect: 'EFFECT_ALLOW' as const,
                roles: [roleName]
              }]
            }
          };
          await cerbosAdmin.putPolicy(newPolicy);
          logger.info(`Created policy for resource ${resource} via Admin API for role ${roleName}`);
        }
      } catch (error) {
        logger.error(`Error updating policy for resource ${resource}:`, error);
        // Continue with other resources even if one fails
      }
    }

    // Invalidate cache after write operations
    invalidateCache();
  } catch (error) {
    logger.error('Error updating Cerbos permissions via Admin API:', error);
    throw error;
  }
}

/**
 * GET /api/admin/unified-roles - Get all roles with unified view
 */
router.get('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:list',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Get roles from Cerbos
      const cerbosRoles = await getCerbosRoles();

      // Get role metadata and user counts from database
      const dbRoles = await (db as any)('roles')
        .select('name', 'description', 'color')
        .where('is_active', true);

      const userCounts = await (db as any)('user_roles')
        .select('role_id')
        .count('* as count')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .groupBy('role_id', 'roles.name')
        .select('roles.name');

      // Create user count map with explicit typing
      const countMap = new Map<string, number>(
        userCounts.map((r: any) => [r.name, parseInt(r.count)])
      );

      // Create metadata map with explicit typing
      interface RoleMetadata {
        description?: string;
        color?: string;
      }
      const metadataMap = new Map<string, RoleMetadata>(
        dbRoles.map((r: any) => [r.name, {
          description: r.description,
          color: r.color
        }])
      );

      // Build unified role list
      const unifiedRoles: UnifiedRole[] = [];

      for (const roleName of cerbosRoles) {
        const metadata = metadataMap.get(roleName);
        const permissions = await getRolePermissions(roleName);

        unifiedRoles.push({
          name: roleName,
          description: metadata?.description || `${roleName} role`,
          permissions,
          pages: [], // Page access is derived from permissions on frontend
          userCount: countMap.get(roleName) || 0,
          color: metadata?.color || '#6B7280',
          source: metadata ? 'both' : 'cerbos'
        });
      }

      // Add any database-only roles (shouldn't exist, but handle gracefully)
      for (const dbRole of dbRoles) {
        if (!cerbosRoles.has(dbRole.name)) {
          unifiedRoles.push({
            name: dbRole.name,
            description: dbRole.description || '',
            permissions: [],
            pages: [], // Page access is derived from permissions on frontend
            userCount: countMap.get(dbRole.name) || 0,
            color: dbRole.color || '#6B7280',
            source: 'database'
          });
        }
      }

      res.json({
        success: true,
        data: {
          roles: unifiedRoles.sort((a, b) => a.name.localeCompare(b.name))
        },
        message: 'Roles retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting unified roles:', error);
      res.status(500).json({
        error: 'Failed to retrieve roles',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/admin/unified-roles/available-permissions - Get all available permissions from Cerbos
 */
router.get('/available-permissions',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const allPermissions: string[] = [];
      const permissionsByResource: Record<string, string[]> = {};

      // Get all resource policies via Admin API (cached)
      const resources = await getCachedResources();

      for (const resource of resources) {
        const actionsSet = new Set<string>();

        // Extract all actions from resource rules
        for (const rule of resource.rules || []) {
          if (rule.actions) {
            rule.actions.forEach((action: string) => actionsSet.add(action));
          }
        }

        // Build resource:action permissions
        const resourcePermissions: string[] = [];
        for (const action of actionsSet) {
          const permission = `${resource.kind}:${action}`;
          allPermissions.push(permission);
          resourcePermissions.push(permission);
        }

        if (resourcePermissions.length > 0) {
          permissionsByResource[resource.kind] = resourcePermissions.sort();
        }
      }

      res.json({
        success: true,
        data: {
          permissions: [...new Set(allPermissions)].sort(),
          groupedByResource: permissionsByResource
        },
        message: 'Available permissions retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting available permissions:', error);
      res.status(500).json({
        error: 'Failed to retrieve available permissions',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/admin/unified-roles/:name - Get specific role details
 */
router.get('/:name',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'view:details',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name } = (req as any).params;

      // Get permissions from Cerbos
      const permissions = await getRolePermissions(name);

      // Get metadata from database
      const dbRole: any = await (db as any)('roles')
        .where({ name })
        .first();

      // Get user count
      const userCount: any = await (db as any)('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('roles.name', name)
        .count('* as count')
        .first();

      const role: UnifiedRole = {
        name,
        description: dbRole?.description || `${name} role`,
        permissions,
        pages: [], // Page access is derived from permissions on frontend
        userCount: parseInt(userCount?.count || '0'),
        color: dbRole?.color || '#6B7280',
        source: dbRole ? 'both' : 'cerbos'
      };

      res.json({
        success: true,
        data: { role },
        message: 'Role details retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting role details:', error);
      res.status(500).json({
        error: 'Failed to retrieve role details',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/admin/unified-roles - Create new role
 */
router.post('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'create',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { error, value } = createRoleSchema.validate((req as any).body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details[0].message
        });
        return;
      }

      const { name, description, permissions, pages, color } = value as RoleCreateData;

      // Check if role already exists in database
      const existingRole = await (db as any)('roles')
        .where({ name })
        .first();

      if (existingRole) {
        res.status(409).json({
          error: 'Role already exists',
          details: `Role '${name}' already exists in the system`
        });
        return;
      }

      // Update permissions in Cerbos
      if (permissions.length > 0) {
        await updateCerbosPermissions(name, permissions);
      }

      // Note: Page access is now derived from permissions on the frontend
      // No separate page access storage needed

      // Create role metadata in database
      const [newRole] = await (db as any)('roles')
        .insert({
          name,
          description: description || `${name} role`,
          color: color || '#6B7280',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      res.status(201).json({
        success: true,
        data: {
          role: {
            name: newRole.name,
            description: newRole.description,
            permissions,
            pages: pages || [],
            color: newRole.color,
            userCount: 0,
            source: 'both'
          }
        },
        message: 'Role created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating role:', error);
      res.status(500).json({
        error: 'Failed to create role',
        details: error.message
      });
    }
  }
);

/**
 * PUT /api/admin/unified-roles/:name - Update existing role
 */
router.put('/:name',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'update',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name } = (req as any).params;
      const { error, value } = updateRoleSchema.validate((req as any).body);

      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details[0].message
        });
        return;
      }

      const { description, permissions, pages, color } = value as RoleUpdateData;

      // Update permissions in Cerbos if provided
      if (permissions !== undefined) {
        await updateCerbosPermissions(name, permissions);
      }

      // Note: Page access is now derived from permissions on the frontend
      // No separate page access storage needed

      // Update or create metadata in database
      const existingRole = await (db as any)('roles')
        .where({ name })
        .first();

      if (existingRole) {
        // Update existing metadata
        await (db as any)('roles')
          .where({ name })
          .update({
            description: description !== undefined ? description : existingRole.description,
            color: color !== undefined ? color : existingRole.color,
            updated_at: new Date()
          });
      } else {
        // Create metadata for Cerbos-only role
        await (db as any)('roles')
          .insert({
            name,
            description: description || `${name} role`,
            color: color || '#6B7280',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });
      }

      // Get updated role details
      const updatedPermissions = permissions !== undefined
        ? permissions
        : await getRolePermissions(name);

      res.json({
        success: true,
        data: {
          role: {
            name,
            description: description || existingRole?.description || `${name} role`,
            permissions: updatedPermissions,
            pages: [], // Page access is derived from permissions on frontend
            color: color || existingRole?.color || '#6B7280',
            source: 'both'
          }
        },
        message: 'Role updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating role:', error);
      res.status(500).json({
        error: 'Failed to update role',
        details: error.message
      });
    }
  }
);

/**
 * DELETE /api/admin/unified-roles/:name - Delete role
 */
router.delete('/:name',
  authenticateToken,
  requireCerbosPermission({
    resource: 'role',
    action: 'delete',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name } = (req as any).params;
      const { force } = (req as any).query;

      // Check if users have this role
      const userCount = await (db as any)('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('roles.name', name)
        .count('* as count')
        .first();

      if (parseInt(userCount?.count || '0') > 0 && !force) {
        res.status(400).json({
          error: 'Cannot delete role',
          details: `Role '${name}' is assigned to ${userCount.count} users`,
          suggestion: 'Remove role from all users first, or use force=true'
        });
        return;
      }

      // Remove role from Cerbos (set empty permissions)
      await updateCerbosPermissions(name, []);

      // Delete from database
      await (db as any)('roles')
        .where({ name })
        .delete();

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting role:', error);
      res.status(500).json({
        error: 'Failed to delete role',
        details: error.message
      });
    }
  }
);

export default router;