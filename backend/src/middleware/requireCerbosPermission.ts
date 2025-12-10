import { Request, Response, NextFunction } from 'express';
import { CerbosAuthService } from '../services/CerbosAuthService';
import { toPrincipal, toResource } from '../utils/cerbos-helpers';
import type { ResourceType, ResourceAction } from '../types/cerbos.types';
import type { AuthenticatedUser } from '../types/auth.types';
import logger from '../utils/logger';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export interface RequireCerbosPermissionOptions {
  resource: ResourceType;
  action?: ResourceAction;
  actions?: ResourceAction[];
  getResourceId?: (req: Request) => string;
  getResourceAttributes?: (req: Request) => Promise<Record<string, any>>;
  forbiddenMessage?: string;
}

export function requireCerbosPermission(
  options: RequireCerbosPermissionOptions
) {
  const {
    resource: resourceType,
    action: singleAction,
    actions: multipleActions,
    getResourceId,
    getResourceAttributes,
    forbiddenMessage,
  } = options;

  const actions = multipleActions || (singleAction ? [singleAction] : []);

  if (actions.length === 0) {
    throw new Error('At least one action must be specified');
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const user = req.user as AuthenticatedUser;
      console.log('[CERBOS DEBUG] User roles:', user.roles, 'Checking permission for:', resourceType, actions);

      // Super admin bypass - they have all permissions
      // Check if user has super admin role by checking string value, name, or code properties
      const isSuperAdmin = user.roles?.some(role => {
        // Handle string roles
        if (typeof role === 'string') {
          const normalized = role.toLowerCase().replace(/[\s-]+/g, '_');
          return normalized === 'super_admin' || normalized === 'admin';
        }
        // Handle object roles
        return role.name === 'Super Admin' || role.name === 'Admin' ||
               role.code === 'super_admin' || role.code === 'admin';
      });

      if (isSuperAdmin) {
        console.log('[CERBOS DEBUG] Super admin bypass activated for user:', user.email);
        return next();
      }

      const cerbosService = CerbosAuthService.getInstance();

      const organizationId = (user as any).organizationId || DEFAULT_ORG_ID;
      const primaryRegionId = (user as any).primaryRegionId;
      const regionIds = (user as any).regionIds || [];

      const principal = toPrincipal(
        user,
        organizationId,
        primaryRegionId,
        regionIds
      );

      const resourceId = getResourceId
        ? getResourceId(req)
        : req.params.id || `${resourceType}-${Date.now()}`;

      let resourceAttributes: Record<string, any> = {
        organizationId,
      };

      if (getResourceAttributes) {
        try {
          const customAttributes = await getResourceAttributes(req);
          resourceAttributes = {
            ...resourceAttributes,
            ...customAttributes,
          };
        } catch (error) {
          logger.error('Failed to get resource attributes', { error });
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check permissions',
          });
        }
      }

      const resource = toResource(resourceType, {
        id: resourceId,
        ...resourceAttributes,
      });

      for (const action of actions) {
        const result = await cerbosService.checkPermission({
          principal,
          resource,
          action,
        });

        if (!result.allowed) {
          return res.status(403).json({
            error: 'Forbidden',
            message:
              forbiddenMessage ||
              'You do not have permission to perform this action',
            ...(result.validationErrors &&
              result.validationErrors.length > 0 && {
                validationErrors: result.validationErrors,
              }),
          });
        }

        res.locals.cerbosResult = result;
      }

      next();
    } catch (error) {
      logger.error('Permission check failed', { error });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    }
  };
}