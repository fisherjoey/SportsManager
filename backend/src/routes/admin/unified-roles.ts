/**
 * Unified Role Management Routes
 *
 * Manages roles with Cerbos as the source of truth for role definitions and permissions,
 * while the database stores user-role assignments and optional metadata.
 */

import express, { Response, NextFunction } from 'express';
import * as Joi from 'joi';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../../types/auth.types';
import db from '../../config/database';
import logger from '../../utils/logger';

const router = express.Router();

// Cerbos policies directory configuration
const CERBOS_POLICIES_DIR = process.env.CERBOS_POLICIES_DIR || path.join(__dirname, '../../../../cerbos/policies');

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
 * Helper function to fetch roles from Cerbos policy files
 */
async function getCerbosRoles(): Promise<Set<string>> {
  const roles = new Set<string>();

  try {
    // Read all .yaml files from the policies directory
    const files = await fs.readdir(CERBOS_POLICIES_DIR);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of yamlFiles) {
      try {
        const filePath = path.join(CERBOS_POLICIES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const policy = yaml.load(content) as any;

        // Extract roles from resource policies
        if (policy?.resourcePolicy?.rules) {
          for (const rule of policy.resourcePolicy.rules) {
            if (rule.roles) {
              rule.roles.forEach((role: string) => roles.add(role));
            }
          }
        }

        // Extract roles from derived roles definitions
        if (policy?.derivedRoles?.definitions) {
          for (const def of policy.derivedRoles.definitions) {
            if (def.name) {
              roles.add(def.name);
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to read policy file ${file}:`, err);
      }
    }
  } catch (error) {
    logger.error('Error reading Cerbos policies directory:', error);
  }

  // Always include some default roles
  roles.add('super_admin');
  roles.add('admin');
  roles.add('referee');
  roles.add('assignor');

  return roles;
}

/**
 * Helper function to get role permissions from Cerbos policy files
 */
async function getRolePermissions(roleName: string): Promise<string[]> {
  const permissions: string[] = [];

  try {
    // Read all .yaml files from the policies directory
    const files = await fs.readdir(CERBOS_POLICIES_DIR);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of yamlFiles) {
      try {
        const filePath = path.join(CERBOS_POLICIES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const policy = yaml.load(content) as any;

        // Check resource policies for this role
        if (policy?.resourcePolicy) {
          const resource = policy.resourcePolicy.resource;
          const rules = policy.resourcePolicy.rules || [];

          for (const rule of rules) {
            if (rule.roles?.includes(roleName) && rule.effect === 'EFFECT_ALLOW') {
              for (const action of rule.actions || []) {
                permissions.push(`${resource}:${action}`);
              }
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to read policy file ${file}:`, err);
      }
    }
  } catch (error) {
    logger.error('Error reading Cerbos policies:', error);
  }

  return [...new Set(permissions)].sort();
}

/**
 * Helper function to update role permissions in Cerbos by modifying policy files
 */
async function updateCerbosPermissions(roleName: string, permissions: string[]): Promise<void> {
  // Group permissions by resource
  const permissionsByResource = new Map<string, string[]>();

  for (const permission of permissions) {
    const [resource, action] = permission.split(':');
    if (!permissionsByResource.has(resource)) {
      permissionsByResource.set(resource, []);
    }
    permissionsByResource.get(resource)!.push(action);
  }

  // Get all resources we need to update
  const resourcesToUpdate = new Set<string>(permissionsByResource.keys());

  // Also check existing policies to remove this role from resources not in the new permissions
  try {
    const files = await fs.readdir(CERBOS_POLICIES_DIR);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of yamlFiles) {
      try {
        const filePath = path.join(CERBOS_POLICIES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const policy = yaml.load(content) as any;

        if (policy?.resourcePolicy?.resource) {
          resourcesToUpdate.add(policy.resourcePolicy.resource);
        }
      } catch (err) {
        logger.warn(`Failed to read policy file ${file}:`, err);
      }
    }
  } catch (error) {
    logger.warn('Failed to read existing policies:', error);
  }

  // Update each resource policy
  for (const resource of resourcesToUpdate) {
    const policyFile = `${resource}.yaml`;
    const policyPath = path.join(CERBOS_POLICIES_DIR, policyFile);
    const actions = permissionsByResource.get(resource) || [];

    try {
      let policy: any;

      // Try to read existing policy
      try {
        const existingContent = await fs.readFile(policyPath, 'utf-8');
        policy = yaml.load(existingContent) as any;

        // Remove existing rules for this role
        if (policy?.resourcePolicy?.rules) {
          policy.resourcePolicy.rules = policy.resourcePolicy.rules.filter(
            (rule: any) => !rule.roles?.includes(roleName)
          );
        }
      } catch (err) {
        // File doesn't exist, create new policy
        policy = {
          apiVersion: 'api.cerbos.dev/v1',
          resourcePolicy: {
            version: 'default',
            resource: resource,
            rules: []
          }
        };
      }

      // Ensure structure exists
      if (!policy.apiVersion) {
        policy.apiVersion = 'api.cerbos.dev/v1';
      }
      if (!policy.resourcePolicy) {
        policy.resourcePolicy = {
          version: 'default',
          resource: resource,
          rules: []
        };
      }
      if (!policy.resourcePolicy.rules) {
        policy.resourcePolicy.rules = [];
      }

      // Add new rule for this role if there are actions
      if (actions.length > 0) {
        policy.resourcePolicy.rules.push({
          actions: actions,
          effect: 'EFFECT_ALLOW',
          roles: [roleName]
        });
      }

      // Only write if there are rules or if updating an existing policy
      if (policy.resourcePolicy.rules.length > 0) {
        // Write the updated policy as YAML
        const yamlContent = yaml.dump(policy, {
          styles: {
            '!!null': 'canonical'
          },
          sortKeys: false
        });

        // Add YAML document separator at the beginning
        const finalContent = '---\n' + yamlContent;

        await fs.writeFile(policyPath, finalContent, 'utf-8');
        logger.info(`Updated policy file ${policyFile} for role ${roleName}`);
      } else {
        // If no rules left and file exists, you might want to delete it
        // For now, we'll keep empty policy files
        logger.info(`No permissions for resource ${resource}, keeping empty policy`);
      }

    } catch (error) {
      logger.error(`Error updating policy for resource ${resource}:`, error);
      // Continue with other resources even if one fails
    }
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
          pages: [], // TODO: Fetch from role_pages table when implemented
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
            pages: [], // TODO: Fetch from role_pages table when implemented
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

      // Read all policy files to extract all possible permissions
      const files = await fs.readdir(CERBOS_POLICIES_DIR);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      for (const file of yamlFiles) {
        try {
          const filePath = path.join(CERBOS_POLICIES_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const policy = yaml.load(content) as any;

          // Extract all actions from resource policies
          if (policy?.resourcePolicy) {
            const resource = policy.resourcePolicy.resource;
            const rules = policy.resourcePolicy.rules || [];
            const actionsSet = new Set<string>();

            for (const rule of rules) {
              if (rule.actions) {
                rule.actions.forEach((action: string) => actionsSet.add(action));
              }
            }

            // Build resource:action permissions
            const resourcePermissions: string[] = [];
            for (const action of actionsSet) {
              const permission = `${resource}:${action}`;
              allPermissions.push(permission);
              resourcePermissions.push(permission);
            }

            if (resourcePermissions.length > 0) {
              permissionsByResource[resource] = resourcePermissions.sort();
            }
          }
        } catch (err) {
          logger.warn(`Failed to read policy file ${file}:`, err);
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
        pages: [], // TODO: Fetch from role_pages table when implemented
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

      // TODO: Save pages to role_pages junction table
      // See: docs/ROLE_PAGES_BACKEND_INTEGRATION.md
      if (pages && pages.length > 0) {
        logger.info(`Role '${name}' has ${pages.length} page assignments (not yet saved to DB)`);
        // Future implementation:
        // const pageRecords = pages.map(pageId => ({ role_name: name, page_id: pageId }));
        // await db('role_pages').insert(pageRecords);
      }

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
            pages: pages || [], // TODO: Fetch from role_pages table when implemented
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

      // TODO: Update pages in role_pages junction table
      // See: docs/ROLE_PAGES_BACKEND_INTEGRATION.md
      if (pages !== undefined) {
        logger.info(`Role '${name}' pages being updated to ${pages.length} pages (not yet saved to DB)`);
        // Future implementation:
        // await db('role_pages').where({ role_name: name }).delete();
        // if (pages.length > 0) {
        //   const pageRecords = pages.map(pageId => ({ role_name: name, page_id: pageId }));
        //   await db('role_pages').insert(pageRecords);
        // }
      }

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
            pages: pages || [], // TODO: Fetch from role_pages table when implemented
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