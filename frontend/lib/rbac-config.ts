/**
 * @fileoverview RBAC Configuration
 * 
 * Comprehensive role-based access control configuration that defines:
 * - Page access permissions
 * - API endpoint permissions
 * - Dashboard view permissions
 * - Role configurations with their allowed resources
 * 
 * @module lib/rbac-config
 */

import { PERMISSIONS } from './permissions'

/**
 * Page-to-Permission Mapping
 * Defines which permissions are required to access each page/route
 */
export const PAGE_PERMISSIONS: Record<string, string[]> = {
  // Public pages (no permissions required)
  '/login': [],
  '/': [], // Home page, but content is filtered based on role
  
  // Games Management
  '/games': [PERMISSIONS.GAMES.READ],
  'dashboard-view:games': [PERMISSIONS.GAMES.READ],
  
  // League & Tournament Management
  'dashboard-view:leagues': [PERMISSIONS.GAMES.CREATE, PERMISSIONS.GAMES.UPDATE],
  'dashboard-view:tournaments': [PERMISSIONS.GAMES.CREATE, PERMISSIONS.GAMES.UPDATE],
  
  // Assignment Management
  'dashboard-view:assigning': [PERMISSIONS.ASSIGNMENTS.READ],
  'dashboard-view:ai-assignments': [PERMISSIONS.ASSIGNMENTS.AUTO_ASSIGN],
  
  // Teams & Locations
  'dashboard-view:locations': [PERMISSIONS.GAMES.READ],
  
  // Referee Management
  'dashboard-view:referees': [PERMISSIONS.REFEREES.READ],
  
  // Calendar
  'dashboard-view:calendar': [PERMISSIONS.GAMES.READ],
  
  // Communications
  'dashboard-view:communications': [PERMISSIONS.COMMUNICATION.SEND],
  
  // Resources
  '/resources': [PERMISSIONS.CONTENT.READ],
  'dashboard-view:resources': [PERMISSIONS.CONTENT.READ],
  
  // Financial Management (when enabled)
  '/financial-dashboard': [PERMISSIONS.FINANCE.READ],
  'dashboard-view:financial-dashboard': [PERMISSIONS.FINANCE.READ],
  'dashboard-view:financial-receipts': [PERMISSIONS.FINANCE.CREATE],
  'dashboard-view:financial-budgets': [PERMISSIONS.FINANCE.MANAGE],
  'dashboard-view:financial-expenses': [PERMISSIONS.FINANCE.READ],
  'dashboard-view:financial-expense-create': [PERMISSIONS.FINANCE.CREATE],
  'dashboard-view:financial-expense-approvals': [PERMISSIONS.FINANCE.APPROVE],
  'dashboard-view:financial-reports': [PERMISSIONS.FINANCE.READ],
  
  // Organization Management
  'dashboard-view:organization-dashboard': [PERMISSIONS.SETTINGS.ORGANIZATION],
  'dashboard-view:organization-employees': [PERMISSIONS.USERS.READ],
  'dashboard-view:organization-assets': [PERMISSIONS.SETTINGS.ORGANIZATION],
  'dashboard-view:organization-documents': [PERMISSIONS.CONTENT.READ],
  'dashboard-view:organization-compliance': [PERMISSIONS.SETTINGS.ORGANIZATION],
  
  // Analytics
  'dashboard-view:analytics-dashboard': [PERMISSIONS.REPORTS.READ],
  
  // Administration
  '/admin-users': [PERMISSIONS.USERS.READ],
  'dashboard-view:admin-users': [PERMISSIONS.USERS.READ],
  '/admin-roles': [PERMISSIONS.ROLES.READ],
  'dashboard-view:admin-roles': [PERMISSIONS.ROLES.READ],
  '/admin-permissions': [PERMISSIONS.ROLES.READ],
  'dashboard-view:admin-permissions': [PERMISSIONS.ROLES.READ],
  '/admin-permission-config': [PERMISSIONS.ROLES.MANAGE],
  'dashboard-view:admin-permission-config': [PERMISSIONS.ROLES.MANAGE],
  '/admin-page-access': [PERMISSIONS.ROLES.MANAGE],
  'dashboard-view:admin-page-access': [PERMISSIONS.ROLES.MANAGE],
  '/admin-workflows': [PERMISSIONS.SETTINGS.UPDATE],
  'dashboard-view:admin-workflows': [PERMISSIONS.SETTINGS.UPDATE],
  '/admin-security': [PERMISSIONS.SETTINGS.UPDATE],
  'dashboard-view:admin-security': [PERMISSIONS.SETTINGS.UPDATE],
  '/admin-settings': [PERMISSIONS.SETTINGS.UPDATE],
  'dashboard-view:admin-settings': [PERMISSIONS.SETTINGS.UPDATE],
  
  // Account Management
  'dashboard-view:profile': [], // All authenticated users can access their profile
  'dashboard-view:organization-settings': [PERMISSIONS.SETTINGS.ORGANIZATION]
}

/**
 * API Endpoint-to-Permission Mapping
 * Maps HTTP methods and endpoints to required permissions
 */
export const API_PERMISSIONS: Record<string, string[]> = {
  // Games API
  'GET /api/games': [PERMISSIONS.GAMES.READ],
  'POST /api/games': [PERMISSIONS.GAMES.CREATE],
  'PUT /api/games/:id': [PERMISSIONS.GAMES.UPDATE],
  'DELETE /api/games/:id': [PERMISSIONS.GAMES.DELETE],
  'POST /api/games/:id/publish': [PERMISSIONS.GAMES.PUBLISH],
  
  // Assignments API
  'GET /api/assignments': [PERMISSIONS.ASSIGNMENTS.READ],
  'POST /api/assignments': [PERMISSIONS.ASSIGNMENTS.CREATE],
  'PUT /api/assignments/:id': [PERMISSIONS.ASSIGNMENTS.UPDATE],
  'DELETE /api/assignments/:id': [PERMISSIONS.ASSIGNMENTS.DELETE],
  'POST /api/assignments/:id/approve': [PERMISSIONS.ASSIGNMENTS.APPROVE],
  'POST /api/assignments/auto-assign': [PERMISSIONS.ASSIGNMENTS.AUTO_ASSIGN],
  
  // Referees API
  'GET /api/referees': [PERMISSIONS.REFEREES.READ],
  'PUT /api/referees/:id': [PERMISSIONS.REFEREES.UPDATE],
  'POST /api/referees/:id/evaluate': [PERMISSIONS.REFEREES.EVALUATE],
  'DELETE /api/referees/:id': [PERMISSIONS.REFEREES.MANAGE],
  
  // Users API
  'GET /api/users': [PERMISSIONS.USERS.READ],
  'POST /api/users': [PERMISSIONS.USERS.CREATE],
  'PUT /api/users/:id': [PERMISSIONS.USERS.UPDATE],
  'DELETE /api/users/:id': [PERMISSIONS.USERS.DELETE],
  'POST /api/users/:id/impersonate': [PERMISSIONS.USERS.IMPERSONATE],
  
  // Roles API
  'GET /api/admin/roles': [PERMISSIONS.ROLES.READ],
  'POST /api/admin/roles': [PERMISSIONS.ROLES.MANAGE],
  'PUT /api/admin/roles/:id': [PERMISSIONS.ROLES.MANAGE],
  'DELETE /api/admin/roles/:id': [PERMISSIONS.ROLES.MANAGE],
  'POST /api/admin/roles/:id/permissions': [PERMISSIONS.ROLES.MANAGE],
  'POST /api/admin/roles/:id/users': [PERMISSIONS.ROLES.ASSIGN],
  
  // Permissions API
  'GET /api/admin/permissions': [PERMISSIONS.ROLES.READ],
  
  // Reports API
  'GET /api/reports': [PERMISSIONS.REPORTS.READ],
  'POST /api/reports': [PERMISSIONS.REPORTS.CREATE],
  'POST /api/reports/export': [PERMISSIONS.REPORTS.EXPORT],
  'GET /api/reports/financial': [PERMISSIONS.REPORTS.FINANCIAL],
  
  // Settings API
  'GET /api/settings': [PERMISSIONS.SETTINGS.READ],
  'PUT /api/settings': [PERMISSIONS.SETTINGS.UPDATE],
  'PUT /api/settings/organization': [PERMISSIONS.SETTINGS.ORGANIZATION],
  
  // Communications API
  'POST /api/communications/send': [PERMISSIONS.COMMUNICATION.SEND],
  'POST /api/communications/broadcast': [PERMISSIONS.COMMUNICATION.BROADCAST],
  'GET /api/communications': [PERMISSIONS.COMMUNICATION.MANAGE],
  'DELETE /api/communications/:id': [PERMISSIONS.COMMUNICATION.MANAGE],
  
  // Content/Resources API
  'GET /api/resources': [PERMISSIONS.CONTENT.READ],
  'POST /api/resources': [PERMISSIONS.CONTENT.CREATE],
  'PUT /api/resources/:id': [PERMISSIONS.CONTENT.UPDATE],
  'DELETE /api/resources/:id': [PERMISSIONS.CONTENT.DELETE],
  'POST /api/resources/:id/publish': [PERMISSIONS.CONTENT.PUBLISH],
  
  // Finance API (when enabled)
  'GET /api/finance/transactions': [PERMISSIONS.FINANCE.READ],
  'POST /api/finance/transactions': [PERMISSIONS.FINANCE.CREATE],
  'PUT /api/finance/transactions/:id/approve': [PERMISSIONS.FINANCE.APPROVE],
  'GET /api/finance/budgets': [PERMISSIONS.FINANCE.READ],
  'PUT /api/finance/budgets': [PERMISSIONS.FINANCE.MANAGE]
}

/**
 * Role Configuration Interface
 */
export interface RoleConfig {
  id: string
  name: string
  description: string
  permissions: string[]
  allowedViews: string[]
  restrictions?: {
    maxUsers?: number
    dataScopes?: string[]
    cannotDelete?: boolean
    cannotModify?: boolean
  }
}

/**
 * Predefined Role Configurations
 * These define the standard roles and their permissions
 */
export const ROLE_CONFIGS: RoleConfig[] = [
  {
    id: 'Super Admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: Object.values(PERMISSIONS).flatMap(category => Object.values(category)),
    allowedViews: ['*'], // All views
    restrictions: {
      cannotDelete: true,
      cannotModify: true
    }
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: Object.values(PERMISSIONS).flatMap(category => Object.values(category)),
    allowedViews: ['*'], // All views
    restrictions: {
      cannotDelete: true,
      cannotModify: true
    }
  },
  {
    id: 'assignor',
    name: 'Assignor',
    description: 'Manages game assignments and referee scheduling',
    permissions: [
      PERMISSIONS.GAMES.READ,
      PERMISSIONS.GAMES.UPDATE,
      PERMISSIONS.ASSIGNMENTS.READ,
      PERMISSIONS.ASSIGNMENTS.CREATE,
      PERMISSIONS.ASSIGNMENTS.UPDATE,
      PERMISSIONS.ASSIGNMENTS.DELETE,
      PERMISSIONS.ASSIGNMENTS.APPROVE,
      PERMISSIONS.ASSIGNMENTS.AUTO_ASSIGN,
      PERMISSIONS.REFEREES.READ,
      PERMISSIONS.REFEREES.UPDATE,
      PERMISSIONS.COMMUNICATION.SEND,
      PERMISSIONS.REPORTS.READ,
      PERMISSIONS.REPORTS.CREATE
    ],
    allowedViews: [
      'dashboard',
      'games',
      'assigning',
      'ai-assignments',
      'referees',
      'calendar',
      'communications',
      'profile'
    ]
  },
  {
    id: 'referee',
    name: 'Referee',
    description: 'Views assignments and updates availability',
    permissions: [
      PERMISSIONS.GAMES.READ,
      PERMISSIONS.ASSIGNMENTS.READ,
      PERMISSIONS.CONTENT.READ
    ],
    allowedViews: [
      'dashboard',
      'games',
      'calendar',
      'resources',
      'profile'
    ]
  },
  {
    id: 'league_manager',
    name: 'League Manager',
    description: 'Manages leagues, tournaments, and games',
    permissions: [
      PERMISSIONS.GAMES.READ,
      PERMISSIONS.GAMES.CREATE,
      PERMISSIONS.GAMES.UPDATE,
      PERMISSIONS.GAMES.DELETE,
      PERMISSIONS.GAMES.PUBLISH,
      PERMISSIONS.ASSIGNMENTS.READ,
      PERMISSIONS.REFEREES.READ,
      PERMISSIONS.REPORTS.READ,
      PERMISSIONS.REPORTS.CREATE,
      PERMISSIONS.REPORTS.EXPORT
    ],
    allowedViews: [
      'dashboard',
      'leagues',
      'tournaments',
      'games',
      'locations',
      'calendar',
      'analytics-dashboard',
      'profile'
    ]
  },
  {
    id: 'finance_manager',
    name: 'Finance Manager',
    description: 'Manages financial operations and approvals',
    permissions: [
      PERMISSIONS.FINANCE.READ,
      PERMISSIONS.FINANCE.CREATE,
      PERMISSIONS.FINANCE.APPROVE,
      PERMISSIONS.FINANCE.MANAGE,
      PERMISSIONS.REPORTS.READ,
      PERMISSIONS.REPORTS.FINANCIAL,
      PERMISSIONS.REPORTS.EXPORT
    ],
    allowedViews: [
      'dashboard',
      'financial-dashboard',
      'financial-receipts',
      'financial-budgets',
      'financial-expenses',
      'financial-expense-create',
      'financial-expense-approvals',
      'financial-reports',
      'profile'
    ]
  },
  {
    id: 'content_manager',
    name: 'Content Manager',
    description: 'Manages resources and content',
    permissions: [
      PERMISSIONS.CONTENT.READ,
      PERMISSIONS.CONTENT.CREATE,
      PERMISSIONS.CONTENT.UPDATE,
      PERMISSIONS.CONTENT.PUBLISH,
      PERMISSIONS.CONTENT.DELETE,
      PERMISSIONS.COMMUNICATION.SEND,
      PERMISSIONS.COMMUNICATION.MANAGE
    ],
    allowedViews: [
      'dashboard',
      'resources',
      'communications',
      'organization-documents',
      'profile'
    ]
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to selected areas',
    permissions: [
      PERMISSIONS.GAMES.READ,
      PERMISSIONS.ASSIGNMENTS.READ,
      PERMISSIONS.REFEREES.READ,
      PERMISSIONS.REPORTS.READ,
      PERMISSIONS.CONTENT.READ
    ],
    allowedViews: [
      'dashboard',
      'games',
      'calendar',
      'resources',
      'profile'
    ]
  }
]

/**
 * Helper function to get role configuration by ID
 */
export function getRoleConfig(roleId: string): RoleConfig | undefined {
  return ROLE_CONFIGS.find(role => role.id === roleId)
}

/**
 * Helper function to check if a view is allowed for a role
 */
export function isViewAllowedForRole(roleId: string, view: string): boolean {
  const roleConfig = getRoleConfig(roleId)
  if (!roleConfig) return false
  
  // Admin has access to all views
  if (roleConfig.allowedViews.includes('*')) return true
  
  return roleConfig.allowedViews.includes(view)
}

/**
 * Helper function to check if a page requires specific permissions
 */
export function getPagePermissions(page: string): string[] {
  return PAGE_PERMISSIONS[page] || []
}

/**
 * Helper function to check if an API endpoint requires specific permissions
 */
export function getApiPermissions(method: string, endpoint: string): string[] {
  const key = `${method} ${endpoint}`
  
  // Check exact match first
  if (API_PERMISSIONS[key]) {
    return API_PERMISSIONS[key]
  }
  
  // Check for pattern match (e.g., /api/games/:id)
  for (const [pattern, permissions] of Object.entries(API_PERMISSIONS)) {
    const regex = pattern.replace(/:[\w]+/g, '[^/]+')
    if (new RegExp(`^${regex}$`).test(key)) {
      return permissions
    }
  }
  
  return []
}

/**
 * Helper function to filter navigation items based on permissions
 */
export function filterNavigationByPermissions(
  navigation: any[],
  userPermissions: string[]
): any[] {
  return navigation.filter(item => {
    // Check if the item has a required permission
    const viewKey = `dashboard-view:${item.url || item.href || ''}`
    const requiredPermissions = PAGE_PERMISSIONS[viewKey] || []
    
    // If no permissions required, show the item
    if (requiredPermissions.length === 0) return true
    
    // Check if user has at least one required permission
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    )
  })
}

export default {
  PAGE_PERMISSIONS,
  API_PERMISSIONS,
  ROLE_CONFIGS,
  getRoleConfig,
  isViewAllowedForRole,
  getPagePermissions,
  getApiPermissions,
  filterNavigationByPermissions
}