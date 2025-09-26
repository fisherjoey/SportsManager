import { Request } from 'express';
import type { AuthenticatedUser } from '../types/auth.types';
import type { CerbosPrincipal, CerbosResource, ResourceType } from '../types/cerbos.types';
import { toPrincipal, toResource } from './cerbos-helpers';

export interface AuthContext {
  user: AuthenticatedUser;
  organizationId: string | null;
  primaryRegionId: string | null;
  regionIds: string[];
}

export function getAuthContext(req: Request): AuthContext {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const user = req.user as AuthenticatedUser;
  const userWithContext = user as any;

  return {
    user,
    organizationId: userWithContext.organizationId || null,
    primaryRegionId: userWithContext.primaryRegionId || null,
    regionIds: userWithContext.regionIds || [],
  };
}

export function getOrganizationId(req: Request): string | null {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const user = req.user as any;
  return user.organizationId || null;
}

export function getPrimaryRegionId(req: Request): string | null {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const user = req.user as any;
  return user.primaryRegionId || null;
}

export function getRegionIds(req: Request): string[] {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const user = req.user as any;
  return user.regionIds || [];
}

export function createPrincipalFromRequest(req: Request): CerbosPrincipal {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const user = req.user as AuthenticatedUser;
  const context = getAuthContext(req);

  return toPrincipal(
    user,
    context.organizationId,
    context.primaryRegionId,
    context.regionIds
  );
}

export function createResourceFromRequest(
  req: Request,
  resourceType: ResourceType,
  attributes: Record<string, any> = {}
): CerbosResource {
  const resourceId =
    attributes.id ||
    req.params?.id ||
    `${resourceType}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return toResource(resourceType, {
    id: resourceId,
    ...attributes,
  });
}

export function hasOrganizationAccess(
  req: Request,
  organizationId: string | null
): boolean {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  if (!organizationId) {
    return false;
  }

  const userOrgId = getOrganizationId(req);
  return userOrgId === organizationId;
}