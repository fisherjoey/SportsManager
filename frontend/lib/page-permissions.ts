/**
 * @fileoverview Page Permission Mapping
 *
 * This module defines the mapping between pages and the permissions required to access them.
 * Page access is derived from existing resource permissions - no separate "page access" concept needed.
 *
 * How it works:
 * - Each page maps to one or more permissions (resource:action format)
 * - A user can access a page if they have ANY of the required permissions
 * - Super Admin and Admin roles bypass all checks (handled in auth-provider)
 */

/**
 * Mapping of page IDs to the permissions that grant access to that page.
 * If a user has ANY of the listed permissions, they can access the page.
 */
export const PAGE_TO_PERMISSIONS: Record<string, string[]> = {
  // Admin Pages
  'admin_audit_logs': ['system:view:audit', 'system:view:logs', 'system:admin'],
  'admin_permissions': ['role:manage', 'cerbos_policy:manage', 'system:admin'],
  'admin_page_access': ['role:manage', 'system:admin'],
  'admin_notifications_broadcast': ['system:admin', 'organization:manage'],
  'admin_users': ['user:view', 'user:view:list', 'user:manage', 'system:admin'],
  'admin_roles': ['role:view', 'role:view:list', 'role:manage', 'system:admin'],
  'admin_settings': ['system:manage', 'system:admin'],
  'admin-access-control': ['role:view', 'role:manage', 'system:admin'],
  'admin-workflows': ['system:manage', 'system:admin'],
  'admin-security': ['system:view:audit', 'system:view:logs', 'system:admin'],
  'admin-settings': ['system:manage', 'system:admin'],

  // Financial Pages
  'financial_dashboard': ['finance:view', 'finance:manage', 'system:admin'],
  'financial_budgets': ['finance:view', 'finance:manage', 'system:admin'],
  'budget': ['finance:view', 'finance:manage', 'system:admin'],
  'financial-dashboard': ['finance:view', 'finance:manage', 'system:admin'],
  'financial-receipts': ['finance:view', 'finance:manage', 'system:admin'],
  'financial-budgets': ['finance:view', 'finance:manage', 'system:admin'],
  'financial-expenses': ['finance:view', 'finance:manage', 'system:admin'],
  'financial-expense-create': ['finance:create', 'finance:manage', 'system:admin'],
  'financial-expense-approvals': ['finance:approve', 'finance:manage', 'system:admin'],
  'financial-reports': ['finance:view', 'finance:manage', 'system:admin'],

  // Core Sports Management Pages
  'games': ['game:view', 'game:view:list', 'game:manage', 'system:admin'],
  'resources': ['resource:view', 'system:admin'],
  'notifications': ['notification:view', 'system:admin'],
  'dashboard': ['dashboard:view', 'system:admin'],
  'leagues': ['league:view', 'league:manage', 'system:admin'],
  'tournaments': ['tournament:view', 'tournament:manage', 'system:admin'],
  'assigning': ['assignment:view', 'assignment:create', 'assignment:manage', 'system:admin'],
  'ai-assignments': ['assignment:create', 'assignment:manage', 'system:admin'],
  'locations': ['location:view', 'location:manage', 'team:view', 'team:manage', 'system:admin'],
  'referees': ['referee:view', 'referee:view:list', 'referee:manage', 'system:admin'],
  'calendar': ['game:view', 'calendar:view', 'system:admin'],
  'communications': ['communication:view', 'communication:send', 'system:admin'],

  // Organization Pages
  'organization-dashboard': ['organization:view', 'organization:manage', 'system:admin'],
  'organization-employees': ['employee:view', 'employee:manage', 'system:admin'],
  'organization-assets': ['asset:view', 'asset:manage', 'system:admin'],
  'organization-documents': ['document:view', 'document:manage', 'system:admin'],
  'organization-compliance': ['compliance:view', 'compliance:manage', 'system:admin'],

  // Analytics Pages
  'analytics-dashboard': ['analytics:view', 'system:admin'],

  // Settings Pages
  'settings_notifications': ['notification:manage', 'system:admin'],
  'profile': [], // Everyone with an account can access their profile
  'organization-settings': ['organization:manage', 'system:admin'],
}

/**
 * Check if a user can access a page based on their permissions.
 *
 * @param pageId - The page ID to check access for
 * @param userPermissions - Array of permission strings the user has
 * @returns true if the user has any of the required permissions
 */
export function canAccessPage(pageId: string, userPermissions: string[]): boolean {
  const requiredPerms = PAGE_TO_PERMISSIONS[pageId]

  // If page not in mapping, deny access by default (unless we want to allow by default)
  if (!requiredPerms) {
    // Check for partial matches (e.g., 'admin/users' should match 'admin_users')
    const normalizedPageId = pageId.replace(/[/-]/g, '_').toLowerCase()
    const requiredPermsNormalized = PAGE_TO_PERMISSIONS[normalizedPageId]
    if (requiredPermsNormalized) {
      return requiredPermsNormalized.length === 0 ||
        requiredPermsNormalized.some(perm => userPermissions.includes(perm))
    }
    return false
  }

  // Empty array means everyone can access
  if (requiredPerms.length === 0) {
    return true
  }

  // Check if user has ANY of the required permissions
  return requiredPerms.some(perm => userPermissions.includes(perm))
}

/**
 * Get all pages a user can access based on their permissions.
 *
 * @param userPermissions - Array of permission strings the user has
 * @returns Array of page IDs the user can access
 */
export function getAccessiblePages(userPermissions: string[]): string[] {
  return Object.entries(PAGE_TO_PERMISSIONS)
    .filter(([_, perms]) =>
      perms.length === 0 || perms.some(p => userPermissions.includes(p))
    )
    .map(([pageId]) => pageId)
}

/**
 * Get which pages a role would have access to based on its permissions.
 * Used in the role editor to show derived page access (read-only).
 *
 * @param rolePermissions - Array of permission strings the role has
 * @returns Array of page IDs the role would grant access to
 */
export function derivePageAccessFromPermissions(rolePermissions: string[]): string[] {
  return getAccessiblePages(rolePermissions)
}

/**
 * Get the permission groups that correspond to page groups.
 * This can be used in the role editor to help users understand
 * which permissions grant access to which pages.
 */
export const PAGE_GROUPS_WITH_PERMISSIONS = {
  'Admin Pages': {
    pages: ['admin_audit_logs', 'admin_permissions', 'admin_page_access', 'admin_notifications_broadcast', 'admin_users', 'admin_roles', 'admin_settings'],
    relatedPermissions: ['system:admin', 'system:manage', 'role:view', 'role:manage', 'user:view', 'user:manage', 'cerbos_policy:view', 'cerbos_policy:manage']
  },
  'Financial Pages': {
    pages: ['financial_dashboard', 'financial_budgets', 'budget'],
    relatedPermissions: ['finance:view', 'finance:manage', 'finance:create', 'finance:approve']
  },
  'Core Pages': {
    pages: ['games', 'resources', 'notifications', 'dashboard', 'assigning', 'referees', 'calendar'],
    relatedPermissions: ['game:view', 'game:manage', 'assignment:view', 'assignment:create', 'referee:view', 'referee:manage']
  },
  'Settings Pages': {
    pages: ['settings_notifications', 'profile', 'organization-settings'],
    relatedPermissions: ['notification:manage', 'organization:manage']
  }
}
