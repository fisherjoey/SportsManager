import express, { Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { AuthenticatedRequest } from '../types/auth.types';
import CerbosPolicyService from '../services/CerbosPolicyService';
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();
const policyService = new CerbosPolicyService();

const createResourceSchema = Joi.object({
  kind: Joi.string().min(2).max(50).pattern(/^[a-z][a-z0-9_]*$/).required(),
  version: Joi.string().default('default'),
  importDerivedRoles: Joi.array().items(Joi.string()).default([]),
});

const addActionSchema = Joi.object({
  action: Joi.string().min(2).max(50).pattern(/^[a-z][a-z0-9_]*$/).required(),
  roles: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      effect: Joi.string().valid('EFFECT_ALLOW', 'EFFECT_DENY').required(),
      condition: Joi.string().allow('', null),
    })
  ).allow(null),
});

const setRoleRulesSchema = Joi.object().pattern(
  Joi.string(),
  Joi.object({
    effect: Joi.string().valid('EFFECT_ALLOW', 'EFFECT_DENY').required(),
    condition: Joi.string().allow('', null),
  })
);

router.get('/resources', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'view:resources',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resources = await policyService.listResources();

    res.json({
      success: true,
      data: { resources },
      message: 'Resources retrieved successfully',
    });
  } catch (error: any) {
    logger.error('Failed to list resources', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to retrieve resources',
      details: error.message,
    });
  }
});

router.get('/resources/:kind', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'view:resource_details',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind } = req.params;
    const policy = await policyService.getResource(kind);

    if (!policy) {
      res.status(404).json({
        error: 'Resource not found',
        details: `Resource ${kind} does not exist`,
      });
      return;
    }

    res.json({
      success: true,
      data: { policy },
      message: 'Resource retrieved successfully',
    });
  } catch (error: any) {
    logger.error('Failed to get resource', { kind: req.params.kind, error: error.message, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to retrieve resource',
      details: error.message,
    });
  }
});

router.post('/resources', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'create:resource',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = createResourceSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message,
      });
      return;
    }

    const { kind, version, importDerivedRoles } = value;
    const policy = await policyService.createResource(kind, version, importDerivedRoles);

    logger.info('Resource created', { kind, userId: req.user?.id });

    res.status(201).json({
      success: true,
      data: { policy },
      message: 'Resource created successfully',
    });
  } catch (error: any) {
    logger.error('Failed to create resource', { error: error.message, userId: req.user?.id });

    if (error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Resource already exists',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to create resource',
        details: error.message,
      });
    }
  }
});

router.put('/resources/:kind', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'update:resource',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind } = req.params;
    const policy = req.body;

    const validation = await policyService.validatePolicy(policy);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Policy validation failed',
        details: validation.errors?.join(', '),
      });
      return;
    }

    const updatedPolicy = await policyService.updateResource(kind, policy);

    logger.info('Resource updated', { kind, userId: req.user?.id });

    res.json({
      success: true,
      data: { policy: updatedPolicy },
      message: 'Resource updated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to update resource', { kind: req.params.kind, error: error.message, userId: req.user?.id });

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Resource not found',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to update resource',
        details: error.message,
      });
    }
  }
});

router.delete('/resources/:kind', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'delete:resource',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind } = req.params;
    const deleted = await policyService.deleteResource(kind);

    if (!deleted) {
      res.status(404).json({
        error: 'Resource not found',
        details: `Resource ${kind} does not exist`,
      });
      return;
    }

    logger.info('Resource deleted', { kind, userId: req.user?.id });

    res.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete resource', { kind: req.params.kind, error: error.message, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to delete resource',
      details: error.message,
    });
  }
});

router.get('/resources/:kind/actions', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'view:actions',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind } = req.params;
    const policy = await policyService.getResource(kind);

    if (!policy) {
      res.status(404).json({
        error: 'Resource not found',
        details: `Resource ${kind} does not exist`,
      });
      return;
    }

    const actions = new Set<string>();
    policy.resourcePolicy.rules.forEach(rule => {
      rule.actions.forEach(action => actions.add(action));
    });

    res.json({
      success: true,
      data: { actions: Array.from(actions) },
      message: 'Actions retrieved successfully',
    });
  } catch (error: any) {
    logger.error('Failed to get actions', { kind: req.params.kind, error: error.message, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to retrieve actions',
      details: error.message,
    });
  }
});

router.post('/resources/:kind/actions', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'create:action',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind } = req.params;
    const { error, value } = addActionSchema.validate(req.body);

    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message,
      });
      return;
    }

    const { action, roles } = value;
    const policy = await policyService.addAction(kind, action, roles);

    logger.info('Action added to resource', { kind, action, userId: req.user?.id });

    res.status(201).json({
      success: true,
      data: { policy },
      message: 'Action added successfully',
    });
  } catch (error: any) {
    logger.error('Failed to add action', { kind: req.params.kind, error: error.message, userId: req.user?.id });

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Resource not found',
        details: error.message,
      });
    } else if (error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Action already exists',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to add action',
        details: error.message,
      });
    }
  }
});

router.delete('/resources/:kind/actions/:action', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'delete:action',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind, action } = req.params;
    const policy = await policyService.removeAction(kind, action);

    logger.info('Action removed from resource', { kind, action, userId: req.user?.id });

    res.json({
      success: true,
      data: { policy },
      message: 'Action removed successfully',
    });
  } catch (error: any) {
    logger.error('Failed to remove action', { kind: req.params.kind, action: req.params.action, error: error.message, userId: req.user?.id });

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Resource not found',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to remove action',
        details: error.message,
      });
    }
  }
});

router.get('/resources/:kind/roles/:role', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'view:roles',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind, role } = req.params;
    const rules = await policyService.getRoleRules(kind, role);

    res.json({
      success: true,
      data: { rules },
      message: 'Role rules retrieved successfully',
    });
  } catch (error: any) {
    logger.error('Failed to get role rules', { kind: req.params.kind, role: req.params.role, error: error.message, userId: req.user?.id });

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Resource not found',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to retrieve role rules',
        details: error.message,
      });
    }
  }
});

router.put('/resources/:kind/roles/:role', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'update:roles',
  getResourceId: (req) => req.params.kind,
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { kind, role } = req.params;
    const { error, value } = setRoleRulesSchema.validate(req.body);

    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message,
      });
      return;
    }

    const policy = await policyService.setRoleRules(kind, role, value);

    logger.info('Role rules updated', { kind, role, userId: req.user?.id });

    res.json({
      success: true,
      data: { policy },
      message: 'Role rules updated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to set role rules', { kind: req.params.kind, role: req.params.role, error: error.message, userId: req.user?.id });

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Resource not found',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to set role rules',
        details: error.message,
      });
    }
  }
});

router.post('/reload', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'reload',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cerbosHealth = await fetch('http://localhost:3592/_cerbos/health');
    if (!cerbosHealth.ok) {
      res.status(503).json({
        error: 'Cerbos service unavailable',
        details: 'Cannot reload policies - Cerbos is not running',
      });
      return;
    }

    logger.info('Cerbos policies reloaded', { userId: req.user?.id });

    res.json({
      success: true,
      message: 'Policies reloaded successfully (Cerbos auto-reloads on file changes)',
      note: 'Policy changes take effect within 1-2 seconds',
    });
  } catch (error: any) {
    logger.error('Failed to reload policies', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to reload policies',
      details: error.message,
    });
  }
});

router.get('/derived-roles', authenticateToken, requireCerbosPermission({
  resource: 'cerbos_policy',
  action: 'view:derived_roles',
}), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const derivedRoles = await policyService.getDerivedRoles();

    if (!derivedRoles) {
      res.status(404).json({
        error: 'Derived roles not found',
        details: 'No derived roles policy file exists',
      });
      return;
    }

    res.json({
      success: true,
      data: { derivedRoles },
      message: 'Derived roles retrieved successfully',
    });
  } catch (error: any) {
    logger.error('Failed to get derived roles', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to retrieve derived roles',
      details: error.message,
    });
  }
});

export default router;