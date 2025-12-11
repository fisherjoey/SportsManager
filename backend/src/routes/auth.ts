/**
 * @fileoverview Authentication routes for Clerk integration
 * @description Authentication endpoints for Clerk-based auth with user sync, organization management, and RBAC
 * NOTE: Login and registration are handled by Clerk. This file manages user sync, profile, and organization switching.
 */

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Knex } from 'knex';

// Types
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  ProfileResponse,
  RefreshPermissionsResponse,
  ApiResponse
} from '../types/api.types';
import { JWTPayload, AuthenticatedUser, AuthenticatedRequest } from '../types/auth.types';
import { UUID, Timestamp } from '../types';

// Services and Database
import db from '../config/database';

// Middleware imports
import { authenticateToken, authenticateClerkTokenOnly, getUserPermissions } from '../middleware/auth';
import { sanitizeAll } from '../middleware/sanitization';
import { asyncHandler, AuthenticationError, ValidationError } from '../middleware/errorHandling';
import { createAuditLog, AUDIT_EVENTS } from '../middleware/auditTrail';

const router = Router();

// REMOVED: POST /api/auth/login - Clerk handles authentication now

// REMOVED: POST /api/auth/register - Clerk handles registration now

/**
 * GET /api/auth/me
 * Get current user profile with comprehensive data including organizations
 */
const getProfile = async (
  req: AuthenticatedRequest,
  res: Response<ProfileResponse>
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !(req.user as any).id) {
      console.error('getProfile: No user in request', req.user);
      res.status(401).json({
        error: 'Not authenticated',
        user: {} as ProfileResponse['user']
      });
      return;
    }

    const user = await db('users')
      .select('*')
      .where('id', (req.user as any).id)
      .first();

    if (!user) {
      res.status(404).json({
        user: {} as ProfileResponse['user']
      });
      return;
    }

    // Get comprehensive user permissions
    let permissions: string[] = [];

    try {
      permissions = await getUserPermissions((user as any).id);
    } catch (error) {
      console.warn('Failed to get user permissions for profile:', (error as Error).message);
    }

    // Get current user roles
    let userRoles: string[] = [];
    try {
      const roleRecords = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', (user as any).id)
        .where('roles.is_active', true)
        .select('roles.name', 'roles.id');

      userRoles = roleRecords.map((r: any) => r.name);
    } catch (error) {
      console.warn('Failed to get user roles for profile:', (error as Error).message);
      userRoles = [];
    }

    // Get user's organizations
    let organizations: any[] = [];
    try {
      organizations = await db('user_organizations')
        .join('organizations', 'user_organizations.organization_id', 'organizations.id')
        .where('user_organizations.user_id', (user as any).id)
        .where('user_organizations.status', 'active')
        .select(
          'organizations.id',
          'organizations.name',
          'organizations.slug',
          'organizations.logo_url',
          'user_organizations.role as org_role',
          'user_organizations.is_primary'
        )
        .orderBy('user_organizations.is_primary', 'desc');
    } catch (error) {
      console.warn('Failed to get user organizations for profile:', (error as Error).message);
      organizations = [];
    }

    const userData: ProfileResponse['user'] = {
      id: (user as any).id,
      email: (user as any).email,
      roles: userRoles,
      permissions: permissions,
      organizations: organizations,
      name: user.name,
      phone: (user as any).phone,
      location: (user as any).location,
      postal_code: (user as any).postal_code,
      max_distance: (user as any).max_distance,
      is_available: (user as any).is_available,
      wage_per_game: (user as any).wage_per_game,
      referee_level_id: (user as any).referee_level_id,
      year_started_refereeing: (user as any).year_started_refereeing,
      games_refereed_season: (user as any).games_refereed_season,
      evaluation_score: (user as any).evaluation_score,
      notes: (user as any).notes,
      created_at: (user as any).created_at as Timestamp,
      updated_at: (user as any).updated_at as Timestamp
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({
      error: 'Internal server error',
      user: {} as ProfileResponse['user']
    });
  }
};

/**
 * POST /api/auth/refresh-permissions
 * Refresh user permissions cache
 */
const refreshPermissions = async (
  req: AuthenticatedRequest, 
  res: Response<RefreshPermissionsResponse>
): Promise<void> => {
  // Get fresh permissions from database (bypass cache)
  const permissions = await getUserPermissions((req.user as any).id, false);

  res.json({
    success: true,
    data: { permissions },
    message: 'Permissions refreshed successfully'
  });
};

/**
 * POST /api/auth/sync-user
 * Called after Clerk login to create or link local user record
 */
const syncUser = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const user = req.user as any;

    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Extract Clerk ID - could be in user.id, user.userId, or user.sub (from Clerk JWT)
    const clerkId = user.sub || user.userId || user.id;
    const email = user.email || user.email_addresses?.[0]?.email_address;
    const name = user.name || user.firstName || user.username;

    if (!clerkId || !email) {
      throw new AuthenticationError('Invalid user data from Clerk');
    }

    // Check if user exists by clerk_id
    let dbUser = await db('users').where('clerk_id', clerkId).first();

    // If user doesn't exist, create from Clerk data
    if (!dbUser) {
      console.log(`Creating new user for Clerk ID: ${clerkId}`);

      const trx = await db.transaction();

      try {
        // Create user record
        const userData: any = {
          clerk_id: clerkId,
          email: email,
          name: name || email.split('@')[0],
          // password_hash not needed for Clerk users
        };

        const [newUser] = await trx('users').insert(userData).returning('*');
        dbUser = newUser;

        // Assign default role (e.g., 'member' or 'referee')
        const defaultRole = await trx('roles')
          .where('code', 'member')
          .orWhere('name', 'Member')
          .first();

        if (defaultRole) {
          await trx('user_roles').insert({
            user_id: (dbUser as any).id,
            role_id: defaultRole.id
          });
        }

        // Add to default organization
        const defaultOrg = await trx('organizations')
          .where('slug', 'default')
          .first();

        if (defaultOrg) {
          await trx('user_organizations').insert({
            user_id: (dbUser as any).id,
            organization_id: defaultOrg.id,
            is_primary: true,
            role: 'member',
            status: 'active'
          });
        }

        // Create audit log
        await createAuditLog({
          event_type: AUDIT_EVENTS.AUTH_REGISTER,
          user_id: (dbUser as any).id,
          user_email: email,
          ip_address: req.headers['x-forwarded-for'] as string || req.ip,
          user_agent: req.headers['user-agent'],
          success: true,
          additional_data: { clerk_id: clerkId, source: 'clerk_sync' }
        });

        await trx.commit();
        console.log(`User created successfully: ${(dbUser as any).id}`);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    }

    // Fetch user's roles
    const roleRecords = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', (dbUser as any).id)
      .where('user_roles.is_active', true)
      .where('roles.is_active', true)
      .select('roles.name', 'roles.code', 'roles.id');

    const userRoles = roleRecords.map((r: any) => r.code || r.name);

    // Fetch user's organizations
    const organizations = await db('user_organizations')
      .join('organizations', 'user_organizations.organization_id', 'organizations.id')
      .where('user_organizations.user_id', (dbUser as any).id)
      .where('user_organizations.status', 'active')
      .select(
        'organizations.id',
        'organizations.name',
        'organizations.slug',
        'organizations.logo_url',
        'user_organizations.role as org_role',
        'user_organizations.is_primary'
      )
      .orderBy('user_organizations.is_primary', 'desc');

    // Get user permissions
    let permissions: string[] = [];
    try {
      permissions = await getUserPermissions((dbUser as any).id);
    } catch (error) {
      console.warn('Failed to get user permissions during sync:', (error as Error).message);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: (dbUser as any).id,
          clerk_id: (dbUser as any).clerk_id,
          email: (dbUser as any).email,
          name: (dbUser as any).name,
          roles: userRoles,
          permissions: permissions,
          organizations: organizations
        }
      }
    });
  } catch (error) {
    console.error('Error in syncUser:', error);
    throw error;
  }
};

/**
 * GET /api/auth/organizations
 * Get user's organizations for switcher
 */
const getOrganizations = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any[]>>
): Promise<void> => {
  try {
    const user = req.user as any;

    if (!user || !user.id) {
      throw new AuthenticationError('User not authenticated');
    }

    const organizations = await db('user_organizations')
      .join('organizations', 'user_organizations.organization_id', 'organizations.id')
      .where('user_organizations.user_id', user.id)
      .where('user_organizations.status', 'active')
      .select(
        'organizations.id',
        'organizations.name',
        'organizations.slug',
        'organizations.logo_url',
        'organizations.description',
        'user_organizations.role as org_role',
        'user_organizations.is_primary',
        'user_organizations.joined_at'
      )
      .orderBy('user_organizations.is_primary', 'desc');

    res.json({
      success: true,
      data: organizations
    });
  } catch (error) {
    console.error('Error in getOrganizations:', error);
    throw error;
  }
};

/**
 * POST /api/auth/switch-organization
 * Validate user can access organization and return org details
 */
const switchOrganization = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const user = req.user as any;
    const { organizationId } = req.body;

    if (!user || !user.id) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    // Validate user has access to this organization
    const userOrg = await db('user_organizations')
      .join('organizations', 'user_organizations.organization_id', 'organizations.id')
      .where('user_organizations.user_id', user.id)
      .where('user_organizations.organization_id', organizationId)
      .where('user_organizations.status', 'active')
      .select(
        'organizations.id',
        'organizations.name',
        'organizations.slug',
        'organizations.logo_url',
        'organizations.description',
        'organizations.settings',
        'user_organizations.role as org_role',
        'user_organizations.is_primary'
      )
      .first();

    if (!userOrg) {
      throw new ValidationError('You do not have access to this organization');
    }

    // Log the organization switch
    await createAuditLog({
      event_type: 'ORGANIZATION_SWITCH',
      user_id: user.id,
      user_email: user.email,
      ip_address: req.headers['x-forwarded-for'] as string || req.ip,
      user_agent: req.headers['user-agent'],
      success: true,
      additional_data: {
        organization_id: organizationId,
        organization_name: userOrg.name
      }
    });

    res.json({
      success: true,
      data: userOrg,
      message: `Switched to ${userOrg.name}`
    });
  } catch (error) {
    console.error('Error in switchOrganization:', error);
    throw error;
  }
};

// Route definitions with middleware and proper typing
// REMOVED: Login and register routes (Clerk handles these)

router.get('/me', 
  authenticateToken, 
  asyncHandler(getProfile)
);

router.post('/refresh-permissions',
  authenticateToken,
  asyncHandler(refreshPermissions)
);

router.post('/sync-user',
  authenticateClerkTokenOnly,
  asyncHandler(syncUser)
);

router.get('/organizations',
  authenticateToken,
  asyncHandler(getOrganizations)
);

router.post('/switch-organization',
  authenticateToken,
  sanitizeAll,
  asyncHandler(switchOrganization)
);

/**
 * POST /api/auth/check-page-access
 * Validate if user can access a specific page/route
 */
const checkPageAccess = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<{ hasAccess: boolean; reason?: string }>>
): Promise<void> => {
  const { page } = (req as any).body;

  if (!page || typeof page !== 'string') {
    throw new ValidationError('Page path is required');
  }

  const user = req.user as AuthenticatedUser;

  // Get user roles
  let userRoles: string[] = [];
  try {
    const roleRecords = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .where('roles.is_active', true)
      .select('roles.name');

    userRoles = roleRecords.map((r: any) => r.name);
  } catch (error) {
    console.warn('Failed to get user roles for page access check:', (error as Error).message);
  }

  // Define comprehensive page access rules (maps page paths to required roles)
  const pageAccessRules: Record<string, string[]> = {
    // Public/General pages (all authenticated users)
    '/dashboard': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee', 'junior_referee', 'senior_referee', 'head_referee', 'rookie_referee', 'referee_coach', 'referee_coordinator', 'mentor', 'mentorship_coordinator', 'coach'],
    '/profile': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee', 'junior_referee', 'senior_referee', 'head_referee', 'rookie_referee', 'referee_coach', 'referee_coordinator', 'mentor', 'mentorship_coordinator', 'coach', 'guest'],
    '/me': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee', 'junior_referee', 'senior_referee', 'head_referee', 'rookie_referee', 'referee_coach', 'referee_coordinator', 'mentor', 'mentorship_coordinator', 'coach', 'guest'],
    '/calendar': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee', 'junior_referee', 'senior_referee', 'head_referee', 'rookie_referee', 'referee_coach', 'referee_coordinator', 'mentor', 'mentorship_coordinator', 'coach'],

    // Admin pages (admin and super_admin only)
    '/admin': ['admin', 'super_admin'],
    '/admin/users': ['admin', 'super_admin'],
    '/admin/roles': ['admin', 'super_admin'],
    '/admin/maintenance': ['admin', 'super_admin'],
    '/admin/cerbos-policies': ['admin', 'super_admin'],
    '/admin/access': ['admin', 'super_admin'],
    '/admin/rbac-registry': ['admin', 'super_admin'],
    '/admin/test-roles': ['admin', 'super_admin'],

    // Assignment management pages
    '/assignments': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator'],
    '/assignments/ai-suggestions': ['admin', 'super_admin', 'assignor', 'assignment_manager'],
    '/assignments/patterns': ['admin', 'super_admin', 'assignor', 'assignment_manager'],
    '/ai-assignment-rules': ['admin', 'super_admin', 'assignor', 'assignment_manager'],
    '/self-assignment': ['referee', 'junior_referee', 'senior_referee', 'head_referee', 'rookie_referee'],

    // Games and scheduling
    '/games': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee', 'senior_referee', 'head_referee', 'junior_referee', 'rookie_referee', 'referee_coordinator', 'coach'],
    '/availability': ['referee', 'junior_referee', 'senior_referee', 'head_referee', 'rookie_referee'],
    '/game-fees': ['admin', 'super_admin', 'assignor', 'assignment_manager'],

    // Referee management
    '/referees': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator', 'referee_coach'],
    '/referee-roles': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator'],

    // Sports organization management
    '/leagues': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'coach'],
    '/teams': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'coach'],
    '/tournaments': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'coach'],
    '/locations': ['admin', 'super_admin', 'assignor', 'assignment_manager'],
    '/organization': ['admin', 'super_admin'],

    // Communication and content
    '/posts': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator', 'mentor', 'mentorship_coordinator', 'referee_coach'],
    '/content': ['admin', 'super_admin'],
    '/communications': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator'],
    '/resources': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator', 'mentor', 'mentorship_coordinator', 'referee_coach'],

    // Financial management pages
    '/financial': ['admin', 'super_admin'],
    '/financial/dashboard': ['admin', 'super_admin'],
    '/financial/transactions': ['admin', 'super_admin'],
    '/financial/reports': ['admin', 'super_admin'],
    '/expenses': ['admin', 'super_admin'],
    '/budgets': ['admin', 'super_admin'],
    '/budget-tracker': ['admin', 'super_admin'],
    '/payment-methods': ['admin', 'super_admin'],
    '/purchase-orders': ['admin', 'super_admin'],
    '/company-credit-cards': ['admin', 'super_admin'],
    '/approvals': ['admin', 'super_admin'],
    '/accounting': ['admin', 'super_admin'],
    '/receipts': ['admin', 'super_admin'],

    // Organizational management
    '/employees': ['admin', 'super_admin'],
    '/assets': ['admin', 'super_admin'],
    '/documents': ['admin', 'super_admin'],
    '/compliance': ['admin', 'super_admin'],
    '/workflows': ['admin', 'super_admin'],

    // Analytics and reporting
    '/analytics': ['admin', 'super_admin'],
    '/analytics/organizational': ['admin', 'super_admin'],
    '/reports': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator'],
    '/performance': ['admin', 'super_admin'],

    // Mentorship program
    '/mentorships': ['admin', 'super_admin', 'mentor', 'mentorship_coordinator', 'referee_coach', 'senior_referee', 'head_referee'],
    '/mentees': ['mentor', 'mentorship_coordinator', 'referee_coach', 'senior_referee', 'head_referee'],

    // User management
    '/users': ['admin', 'super_admin', 'assignor', 'assignment_manager', 'referee_coordinator'],
    '/roles': ['admin', 'super_admin'],
    '/invitations': ['admin', 'super_admin', 'assignor', 'assignment_manager'],

    // Read-only access for guests
    '/games/view': ['guest'],
    '/calendar/view': ['guest'],

    // Cerbos policy management
    '/cerbos': ['admin', 'super_admin'],
  };

  // Normalize page path (remove query params, trailing slashes)
  const normalizedPage = page.split('?')[0].replace(/\/$/, '');

  // Check if page has access rules defined
  const requiredRoles = pageAccessRules[normalizedPage];

  if (!requiredRoles) {
    // No specific rules - allow access (or deny by default, depending on your security policy)
    res.json({
      success: true,
      data: {
        hasAccess: true,
        reason: 'No access restrictions defined for this page'
      }
    });
    return;
  }

  // Check if user has any of the required roles
  const hasAccess = requiredRoles.some(role =>
    userRoles.map(r => r.toLowerCase().replace(/[\s-]+/g, '_')).includes(role)
  );

  res.json({
    success: true,
    data: {
      hasAccess,
      reason: hasAccess
        ? `User has required role(s): ${requiredRoles.join(', ')}`
        : `User lacks required role(s): ${requiredRoles.join(', ')}`
    }
  });
};

router.post('/check-page-access',
  authenticateToken,
  asyncHandler(checkPageAccess)
);

export default router;