import type { AuthenticatedUser } from '../types/auth.types';
import type {
  CerbosPrincipal,
  CerbosResource,
  ResourceType,
} from '../types/cerbos.types';

function normalizeCerbosRole(roleName: string): string {
  const normalized = roleName.toLowerCase().replace(/[\s_-]+/g, '');

  if (normalized === 'superadmin' || normalized === 'admin') {
    return 'admin';
  }
  if (normalized === 'assignor' || normalized === 'assignmentmanager') {
    return 'assignor';
  }
  if (normalized.includes('referee')) {
    return 'referee';
  }
  if (normalized === 'guest') {
    return 'guest';
  }

  return 'guest';
}

export function toPrincipal(
  user: AuthenticatedUser,
  organizationId: string,
  primaryRegionId?: string,
  regionIds: string[] = []
): CerbosPrincipal {
  let roles: string[] = [];

  if (user.roles && user.roles.length > 0) {
    roles = user.roles
      .map((r: any) => {
        if (typeof r === 'string') return r;
        if (r && r.name) return r.name;
        return null;
      })
      .filter(Boolean)
      .map((r: string) => normalizeCerbosRole(r));
  } else if (user.role) {
    roles = [normalizeCerbosRole(user.role)];
  }

  if (roles.length === 0) {
    roles = ['guest'];
  }

  roles = Array.from(new Set(roles));

  return {
    id: user.id,
    roles,
    attr: {
      organizationId,
      primaryRegionId,
      regionIds,
      permissions: user.permissions || [],
      email: user.email,
      isActive: user.is_active,
    },
  };
}

export function toResource(
  kind: ResourceType,
  data: Record<string, any>
): CerbosResource {
  const { id, organization_id, region_id, created_by, owner_id, ...rest } = data;

  const attr: Record<string, any> = {
    ...normalizeAttributes(rest),
  };

  if (organization_id) {
    attr.organizationId = organization_id;
  }

  if (region_id) {
    attr.regionId = region_id;
  }

  if (created_by) {
    attr.createdBy = created_by;
  }

  if (owner_id) {
    attr.ownerId = owner_id;
  }

  return {
    kind,
    id,
    attr,
  };
}

export function createGameResource(game: Record<string, any>): CerbosResource {
  return toResource('game', game);
}

export function createAssignmentResource(
  assignment: Record<string, any>
): CerbosResource {
  return toResource('assignment', assignment);
}

export function createRefereeResource(
  referee: Record<string, any>
): CerbosResource {
  return toResource('referee', referee);
}

function normalizeAttributes(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    const camelKey = snakeToCamel(key);
    normalized[camelKey] = value;
  }

  return normalized;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function createUserResource(user: Record<string, any>): CerbosResource {
  return toResource('user', user);
}

export function createOrganizationResource(
  organization: Record<string, any>
): CerbosResource {
  return toResource('organization', organization);
}

export function createRegionResource(
  region: Record<string, any>
): CerbosResource {
  return toResource('region', region);
}

export function createExpenseResource(
  expense: Record<string, any>
): CerbosResource {
  return toResource('expense', expense);
}

export function createBudgetResource(
  budget: Record<string, any>
): CerbosResource {
  return toResource('budget', budget);
}

export function createCommunicationResource(
  communication: Record<string, any>
): CerbosResource {
  return toResource('communication', communication);
}

export function createDocumentResource(
  document: Record<string, any>
): CerbosResource {
  return toResource('document', document);
}

export function createRoleResource(role: Record<string, any>): CerbosResource {
  return toResource('role', role);
}

export function createPermissionResource(
  permission: Record<string, any>
): CerbosResource {
  return toResource('permission', permission);
}