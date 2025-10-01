/**
 * Admin Cerbos Policy Management Routes
 *
 * Provides comprehensive Cerbos policy management functionality for administrators:
 * - CRUD operations for roles in Cerbos
 * - Direct interaction with Cerbos Admin API
 * - Common roles policy management
 */

import express, { Response, NextFunction } from 'express';
import * as Joi from 'joi';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../../types/auth.types';
import logger from '../../utils/logger';

// Initialize router
const router = express.Router();

// Type definitions for Cerbos policy management
interface CerbosRole {
  name: string;
  parentRoles?: string[];
  condition?: string;
}

interface CerbosRoleCreateData {
  name: string;
  parentRoles?: string[];
  condition?: string;
}

interface CerbosRoleUpdateData {
  name?: string;
  parentRoles?: string[];
  condition?: string;
}

interface CerbosPolicyResponse {
  policies: CerbosPolicy[];
}

interface CerbosPolicy {
  apiVersion: string;
  derivedRoles?: {
    name: string;
    definitions: CerbosRole[];
  };
}

interface CerbosErrorResponse {
  code: number;
  message: string;
  details?: any[];
}

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  parentRoles: Joi.array().items(Joi.string()).optional(),
  condition: Joi.string().optional()
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  parentRoles: Joi.array().items(Joi.string()).optional(),
  condition: Joi.string().optional()
}).min(1);

// Cerbos Admin API configuration
const CERBOS_ADMIN_URL = process.env.CERBOS_ADMIN_URL || 'http://localhost:3592';
const CERBOS_ADMIN_USER = process.env.CERBOS_ADMIN_USER || 'cerbos';
const CERBOS_ADMIN_PASSWORD = process.env.CERBOS_ADMIN_PASSWORD || 'cerbosAdmin';

/**
 * Helper function to make authenticated requests to Cerbos Admin API
 */
async function callCerbosAdminAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${CERBOS_ADMIN_URL}${endpoint}`;
  const authHeader = 'Basic ' + Buffer.from(`${CERBOS_ADMIN_USER}:${CERBOS_ADMIN_PASSWORD}`).toString('base64');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    let errorDetails;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = { message: response.statusText };
    }
    throw new Error(`Cerbos API error (${response.status}): ${errorDetails.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Helper function to get the current common_roles policy
 */
async function getCommonRolesPolicy(): Promise<CerbosPolicy | null> {
  try {
    const response = await callCerbosAdminAPI('/admin/policy/common_roles');
    return response.policies?.[0] || null;
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null; // Policy doesn't exist yet
    }
    throw error;
  }
}

/**
 * Helper function to update the common_roles policy
 */
async function updateCommonRolesPolicy(roles: CerbosRole[]): Promise<void> {
  const policy: CerbosPolicy = {
    apiVersion: 'api.cerbos.dev/v1',
    derivedRoles: {
      name: 'common_roles',
      definitions: roles
    }
  };

  await callCerbosAdminAPI('/admin/policy', {
    method: 'POST',
    body: JSON.stringify({
      policies: [policy]
    })
  });
}

/**
 * GET /api/admin/cerbos-policies/roles - List all roles from Cerbos
 * Requires: cerbos_policy:view permission
 */
router.get('/roles', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'view'
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.info('Admin cerbos-policies/roles GET endpoint hit', {
      user: req.user?.email,
      role: req.user?.role
    });

    const policy = await getCommonRolesPolicy();

    if (!policy || !policy.derivedRoles) {
      res.json({
        success: true,
        data: { roles: [] },
        message: 'No roles found in Cerbos'
      });
      return;
    }

    const roles = policy.derivedRoles.definitions || [];

    res.json({
      success: true,
      data: { roles },
      message: 'Roles retrieved successfully from Cerbos'
    });
  } catch (error: any) {
    logger.error('Error getting roles from Cerbos:', error);
    res.status(500).json({
      error: 'Failed to retrieve roles from Cerbos',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/cerbos-policies/roles - Create a new role in Cerbos
 * Requires: cerbos_policy:create permission
 */
router.post('/roles', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'create'
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = createRoleSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const newRole = value as CerbosRoleCreateData;

    logger.info('Creating new role in Cerbos', {
      roleName: newRole.name,
      user: req.user?.email
    });

    // Get current policy
    const currentPolicy = await getCommonRolesPolicy();
    const currentRoles = currentPolicy?.derivedRoles?.definitions || [];

    // Check if role already exists
    const existingRole = currentRoles.find(role => role.name === newRole.name);
    if (existingRole) {
      res.status(409).json({
        error: 'Role already exists',
        details: `Role '${newRole.name}' already exists in Cerbos`
      });
      return;
    }

    // Add new role
    const updatedRoles = [...currentRoles, newRole];

    // Update policy
    await updateCommonRolesPolicy(updatedRoles);

    res.status(201).json({
      success: true,
      data: { role: newRole },
      message: 'Role created successfully in Cerbos'
    });
  } catch (error: any) {
    logger.error('Error creating role in Cerbos:', error);
    res.status(500).json({
      error: 'Failed to create role in Cerbos',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/cerbos-policies/roles/:roleName - Update a role in Cerbos
 * Requires: cerbos_policy:update permission
 */
router.put('/roles/:roleName', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'update',
  getResourceId: (req: any) => req.params.roleName
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleName } = (req as any).params;
    const { error, value } = updateRoleSchema.validate((req as any).body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
      return;
    }

    const updates = value as CerbosRoleUpdateData;

    logger.info('Updating role in Cerbos', {
      roleName,
      updates,
      user: req.user?.email
    });

    // Get current policy
    const currentPolicy = await getCommonRolesPolicy();
    const currentRoles = currentPolicy?.derivedRoles?.definitions || [];

    // Find the role to update
    const roleIndex = currentRoles.findIndex(role => role.name === roleName);
    if (roleIndex === -1) {
      res.status(404).json({
        error: 'Role not found',
        details: `Role '${roleName}' not found in Cerbos`
      });
      return;
    }

    // Check if we're renaming and the new name already exists
    if (updates.name && updates.name !== roleName) {
      const existingRole = currentRoles.find(role => role.name === updates.name);
      if (existingRole) {
        res.status(409).json({
          error: 'Role name already exists',
          details: `Role '${updates.name}' already exists in Cerbos`
        });
        return;
      }
    }

    // Update the role
    const updatedRole = {
      ...currentRoles[roleIndex],
      ...updates
    };
    currentRoles[roleIndex] = updatedRole;

    // Update policy
    await updateCommonRolesPolicy(currentRoles);

    res.json({
      success: true,
      data: { role: updatedRole },
      message: 'Role updated successfully in Cerbos'
    });
  } catch (error: any) {
    logger.error('Error updating role in Cerbos:', error);
    res.status(500).json({
      error: 'Failed to update role in Cerbos',
      details: error.message
    });
  }
});

/**
 * DELETE /api/admin/cerbos-policies/roles/:roleName - Remove a role from Cerbos
 * Requires: cerbos_policy:delete permission
 */
router.delete('/roles/:roleName', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'delete',
  getResourceId: (req: any) => req.params.roleName
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roleName } = (req as any).params;
    const { force } = (req as any).query as { force?: string };

    logger.info('Deleting role from Cerbos', {
      roleName,
      force: force === 'true',
      user: req.user?.email
    });

    // Get current policy
    const currentPolicy = await getCommonRolesPolicy();
    const currentRoles = currentPolicy?.derivedRoles?.definitions || [];

    // Find the role to delete
    const roleIndex = currentRoles.findIndex(role => role.name === roleName);
    if (roleIndex === -1) {
      res.status(404).json({
        error: 'Role not found',
        details: `Role '${roleName}' not found in Cerbos`
      });
      return;
    }

    // Check if role is being used by other roles as a parent (unless force=true)
    if (force !== 'true') {
      const dependentRoles = currentRoles.filter(role =>
        role.parentRoles && role.parentRoles.includes(roleName)
      );

      if (dependentRoles.length > 0) {
        res.status(400).json({
          error: 'Cannot delete role',
          details: `Role '${roleName}' is used as parent by: ${dependentRoles.map(r => r.name).join(', ')}`,
          suggestion: 'Use force=true query parameter to force deletion',
          dependentRoles: dependentRoles.map(r => r.name)
        });
        return;
      }
    }

    // Remove the role
    const updatedRoles = currentRoles.filter(role => role.name !== roleName);

    // If force=true, also remove this role from any parent role lists
    if (force === 'true') {
      updatedRoles.forEach(role => {
        if (role.parentRoles) {
          role.parentRoles = role.parentRoles.filter(parentRole => parentRole !== roleName);
        }
      });
    }

    // Update policy
    await updateCommonRolesPolicy(updatedRoles);

    res.json({
      success: true,
      message: 'Role deleted successfully from Cerbos'
    });
  } catch (error: any) {
    logger.error('Error deleting role from Cerbos:', error);
    res.status(500).json({
      error: 'Failed to delete role from Cerbos',
      details: error.message
    });
  }
});

export default router;