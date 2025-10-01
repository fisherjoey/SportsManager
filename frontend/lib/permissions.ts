/**
 * @fileoverview Permissions Utility Library
 * 
 * This module provides centralized permission management utilities for the RBAC system.
 * It includes permission constants, utility functions, and type definitions for
 * working with user permissions throughout the application.
 * 
 * @module lib/permissions
 */

import type { Permission } from './api'

/**
 * Cerbos Resource Types
 *
 * Maps frontend permission categories to Cerbos resource types
 */
export const CERBOS_RESOURCES = {
  GAME: 'game',
  ASSIGNMENT: 'assignment',
  REFEREE: 'referee',
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  TEAM: 'team',
  LEAGUE: 'league',
  COMMUNICATION: 'communication',
  DOCUMENT: 'document',
  EXPENSE: 'expense',
  BUDGET: 'budget',
  ORGANIZATION: 'organization',
  REGION: 'region',
  POST: 'post',
  REFEREE_LEVEL: 'referee_level',
  CALENDAR: 'calendar',
  LOCATION: 'location'
} as const

/**
 * Cerbos Actions
 *
 * Available actions that can be performed on resources
 */
export const CERBOS_ACTIONS = {
  VIEW: 'view',
  VIEW_LIST: 'view:list',
  LIST: 'list',
  VIEW_DETAILS: 'view:details',
  VIEW_UNREAD_COUNT: 'view:unread_count',
  VIEW_PENDING_ACKNOWLEDGMENTS: 'view:pending_acknowledgments',
  CREATE: 'create',
  CREATE_VERSION: 'create:version',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN_REFEREE: 'assign_referee',
  UNASSIGN_REFEREE: 'unassign_referee',
  CHANGE_STATUS: 'change_status',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export',
  IMPORT: 'import',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',
  MANAGE_REGIONS: 'manage_regions',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  BULK_CREATE: 'bulk_create',
  GENERATE: 'generate',
  PUBLISH: 'publish',
  ARCHIVE: 'archive',
  ACKNOWLEDGE: 'acknowledge',
  DOWNLOAD: 'download',
  ADMIN_VIEW_RECIPIENTS: 'admin:view_recipients',
  ADMIN_VIEW_STATS: 'admin:view_stats',
  ADMIN_VIEW_ACKNOWLEDGMENTS: 'admin:view_acknowledgments',
  VIEW_GAMES_CALENDAR: 'view:games_calendar',
  ADMIN_CONFIGURE_SYNC: 'admin:configure_sync',
  ADMIN_VIEW_SYNC_STATUS: 'admin:view_sync_status',
  ADMIN_DISABLE_SYNC: 'admin:disable_sync',
  ADMIN_TRIGGER_SYNC: 'admin:trigger_sync',
  ADMIN_UPLOAD_CALENDAR: 'admin:upload_calendar'
} as const

/**
 * Cerbos Permission Builder
 *
 * Helper function to create resource-action permission strings for Cerbos
 */
export function buildCerbosPermission(resource: string, action: string): string {
  return `${resource}:${action}`
}

/**
 * Common Cerbos Permissions
 *
 * Pre-built permission strings for common resource-action combinations
 */
export const CERBOS_PERMISSIONS = {
  // Game permissions
  GAMES: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.VIEW_LIST),
    CREATE: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.CREATE),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.UPDATE),
    DELETE: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.DELETE),
    ASSIGN_REFEREE: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.ASSIGN_REFEREE),
    UNASSIGN_REFEREE: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.UNASSIGN_REFEREE)
  },

  // Assignment permissions
  ASSIGNMENTS: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.ASSIGNMENT, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.ASSIGNMENT, CERBOS_ACTIONS.VIEW_LIST),
    CREATE: buildCerbosPermission(CERBOS_RESOURCES.ASSIGNMENT, CERBOS_ACTIONS.CREATE),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.ASSIGNMENT, CERBOS_ACTIONS.UPDATE),
    DELETE: buildCerbosPermission(CERBOS_RESOURCES.ASSIGNMENT, CERBOS_ACTIONS.DELETE),
    APPROVE: buildCerbosPermission(CERBOS_RESOURCES.ASSIGNMENT, CERBOS_ACTIONS.APPROVE)
  },

  // Referee permissions
  REFEREES: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.REFEREE, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.REFEREE, CERBOS_ACTIONS.VIEW_LIST),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.REFEREE, CERBOS_ACTIONS.UPDATE),
    CREATE: buildCerbosPermission(CERBOS_RESOURCES.REFEREE, CERBOS_ACTIONS.CREATE)
  },

  // User permissions
  USERS: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.USER, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.USER, CERBOS_ACTIONS.VIEW_LIST),
    CREATE: buildCerbosPermission(CERBOS_RESOURCES.USER, CERBOS_ACTIONS.CREATE),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.USER, CERBOS_ACTIONS.UPDATE),
    DELETE: buildCerbosPermission(CERBOS_RESOURCES.USER, CERBOS_ACTIONS.DELETE),
    MANAGE_USERS: buildCerbosPermission(CERBOS_RESOURCES.USER, CERBOS_ACTIONS.MANAGE_USERS)
  },

  // Role permissions
  ROLES: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.ROLE, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.ROLE, CERBOS_ACTIONS.VIEW_LIST),
    MANAGE_ROLES: buildCerbosPermission(CERBOS_RESOURCES.ROLE, CERBOS_ACTIONS.MANAGE_ROLES)
  },

  // Financial permissions (using expense and budget resources)
  FINANCE: {
    VIEW_EXPENSES: buildCerbosPermission(CERBOS_RESOURCES.EXPENSE, CERBOS_ACTIONS.VIEW),
    CREATE_EXPENSES: buildCerbosPermission(CERBOS_RESOURCES.EXPENSE, CERBOS_ACTIONS.CREATE),
    VIEW_BUDGETS: buildCerbosPermission(CERBOS_RESOURCES.BUDGET, CERBOS_ACTIONS.VIEW),
    CREATE_BUDGETS: buildCerbosPermission(CERBOS_RESOURCES.BUDGET, CERBOS_ACTIONS.CREATE),
    APPROVE_EXPENSES: buildCerbosPermission(CERBOS_RESOURCES.EXPENSE, CERBOS_ACTIONS.APPROVE)
  },

  // Communication permissions
  COMMUNICATIONS: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.COMMUNICATION, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.COMMUNICATION, CERBOS_ACTIONS.VIEW_LIST),
    CREATE: buildCerbosPermission(CERBOS_RESOURCES.COMMUNICATION, CERBOS_ACTIONS.CREATE),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.COMMUNICATION, CERBOS_ACTIONS.UPDATE),
    DELETE: buildCerbosPermission(CERBOS_RESOURCES.COMMUNICATION, CERBOS_ACTIONS.DELETE)
  },

  // Team and League permissions
  TEAMS: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.TEAM, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.TEAM, CERBOS_ACTIONS.VIEW_LIST),
    CREATE: buildCerbosPermission(CERBOS_RESOURCES.TEAM, CERBOS_ACTIONS.CREATE),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.TEAM, CERBOS_ACTIONS.UPDATE),
    DELETE: buildCerbosPermission(CERBOS_RESOURCES.TEAM, CERBOS_ACTIONS.DELETE)
  },

  LEAGUES: {
    VIEW: buildCerbosPermission(CERBOS_RESOURCES.LEAGUE, CERBOS_ACTIONS.VIEW),
    VIEW_LIST: buildCerbosPermission(CERBOS_RESOURCES.LEAGUE, CERBOS_ACTIONS.VIEW_LIST),
    CREATE: buildCerbosPermission(CERBOS_RESOURCES.LEAGUE, CERBOS_ACTIONS.CREATE),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.LEAGUE, CERBOS_ACTIONS.UPDATE),
    DELETE: buildCerbosPermission(CERBOS_RESOURCES.LEAGUE, CERBOS_ACTIONS.DELETE)
  },

  // Calendar permissions
  CALENDAR: {
    VIEW_GAMES: buildCerbosPermission(CERBOS_RESOURCES.CALENDAR, CERBOS_ACTIONS.VIEW_GAMES_CALENDAR),
    ADMIN_CONFIGURE_SYNC: buildCerbosPermission(CERBOS_RESOURCES.CALENDAR, CERBOS_ACTIONS.ADMIN_CONFIGURE_SYNC),
    ADMIN_UPLOAD: buildCerbosPermission(CERBOS_RESOURCES.CALENDAR, CERBOS_ACTIONS.ADMIN_UPLOAD_CALENDAR)
  }
} as const

/**
 * Legacy Permission Mapping
 *
 * Maps old permission strings to new Cerbos resource:action format
 * This allows gradual migration and backward compatibility
 */
export const LEGACY_PERMISSION_MAPPING: Record<string, string> = {
  // Games
  'games:read': CERBOS_PERMISSIONS.GAMES.VIEW_LIST,
  'games:create': CERBOS_PERMISSIONS.GAMES.CREATE,
  'games:update': CERBOS_PERMISSIONS.GAMES.UPDATE,
  'games:delete': CERBOS_PERMISSIONS.GAMES.DELETE,
  'games:publish': CERBOS_PERMISSIONS.GAMES.UPDATE, // Map to update for now

  // Assignments
  'assignments:read': CERBOS_PERMISSIONS.ASSIGNMENTS.VIEW_LIST,
  'assignments:create': CERBOS_PERMISSIONS.ASSIGNMENTS.CREATE,
  'assignments:update': CERBOS_PERMISSIONS.ASSIGNMENTS.UPDATE,
  'assignments:delete': CERBOS_PERMISSIONS.ASSIGNMENTS.DELETE,
  'assignments:approve': CERBOS_PERMISSIONS.ASSIGNMENTS.APPROVE,

  // Referees
  'referees:read': CERBOS_PERMISSIONS.REFEREES.VIEW_LIST,
  'referees:update': CERBOS_PERMISSIONS.REFEREES.UPDATE,
  'referees:manage': CERBOS_PERMISSIONS.REFEREES.UPDATE,
  'referees:evaluate': CERBOS_PERMISSIONS.REFEREES.UPDATE,

  // Users
  'users:read': CERBOS_PERMISSIONS.USERS.VIEW_LIST,
  'users:create': CERBOS_PERMISSIONS.USERS.CREATE,
  'users:update': CERBOS_PERMISSIONS.USERS.UPDATE,
  'users:delete': CERBOS_PERMISSIONS.USERS.DELETE,
  'users:impersonate': CERBOS_PERMISSIONS.USERS.MANAGE_USERS,

  // Roles
  'roles:read': CERBOS_PERMISSIONS.ROLES.VIEW_LIST,
  'roles:manage': CERBOS_PERMISSIONS.ROLES.MANAGE_ROLES,
  'roles:assign': CERBOS_PERMISSIONS.ROLES.MANAGE_ROLES,

  // Finance
  'finance:read': CERBOS_PERMISSIONS.FINANCE.VIEW_EXPENSES,
  'finance:create': CERBOS_PERMISSIONS.FINANCE.CREATE_EXPENSES,
  'finance:approve': CERBOS_PERMISSIONS.FINANCE.APPROVE_EXPENSES,
  'finance:manage': CERBOS_PERMISSIONS.FINANCE.VIEW_EXPENSES,

  // Communication
  'communication:send': CERBOS_PERMISSIONS.COMMUNICATIONS.CREATE,
  'communication:broadcast': CERBOS_PERMISSIONS.COMMUNICATIONS.CREATE,
  'communication:manage': CERBOS_PERMISSIONS.COMMUNICATIONS.UPDATE,

  // Content
  'content:read': CERBOS_PERMISSIONS.COMMUNICATIONS.VIEW_LIST,
  'content:create': CERBOS_PERMISSIONS.COMMUNICATIONS.CREATE,
  'content:update': CERBOS_PERMISSIONS.COMMUNICATIONS.UPDATE,
  'content:publish': CERBOS_PERMISSIONS.COMMUNICATIONS.UPDATE,
  'content:delete': CERBOS_PERMISSIONS.COMMUNICATIONS.DELETE,

  // Teams and Leagues
  'teams:read': CERBOS_PERMISSIONS.TEAMS.VIEW_LIST,
  'teams:create': CERBOS_PERMISSIONS.TEAMS.CREATE,
  'teams:update': CERBOS_PERMISSIONS.TEAMS.UPDATE,
  'teams:delete': CERBOS_PERMISSIONS.TEAMS.DELETE,

  'leagues:read': CERBOS_PERMISSIONS.LEAGUES.VIEW_LIST,
  'leagues:create': CERBOS_PERMISSIONS.LEAGUES.CREATE,
  'leagues:update': CERBOS_PERMISSIONS.LEAGUES.UPDATE,
  'leagues:delete': CERBOS_PERMISSIONS.LEAGUES.DELETE,

  // Mentorships (map to referee management)
  'mentorships:read': CERBOS_PERMISSIONS.REFEREES.VIEW_LIST,
  'mentorships:manage': CERBOS_PERMISSIONS.REFEREES.UPDATE
}

/**
 * Backward Compatibility - Legacy PERMISSIONS export
 *
 * This maintains the old PERMISSIONS structure for gradual migration
 * @deprecated Use CERBOS_PERMISSIONS instead
 */
export const PERMISSIONS = {
  // Games permissions
  GAMES: {
    READ: CERBOS_PERMISSIONS.GAMES.VIEW_LIST,
    CREATE: CERBOS_PERMISSIONS.GAMES.CREATE,
    UPDATE: CERBOS_PERMISSIONS.GAMES.UPDATE,
    DELETE: CERBOS_PERMISSIONS.GAMES.DELETE,
    PUBLISH: CERBOS_PERMISSIONS.GAMES.UPDATE
  },

  // Assignments permissions
  ASSIGNMENTS: {
    READ: CERBOS_PERMISSIONS.ASSIGNMENTS.VIEW_LIST,
    CREATE: CERBOS_PERMISSIONS.ASSIGNMENTS.CREATE,
    UPDATE: CERBOS_PERMISSIONS.ASSIGNMENTS.UPDATE,
    DELETE: CERBOS_PERMISSIONS.ASSIGNMENTS.DELETE,
    APPROVE: CERBOS_PERMISSIONS.ASSIGNMENTS.APPROVE,
    AUTO_ASSIGN: CERBOS_PERMISSIONS.ASSIGNMENTS.UPDATE
  },

  // Referees permissions
  REFEREES: {
    READ: CERBOS_PERMISSIONS.REFEREES.VIEW_LIST,
    UPDATE: CERBOS_PERMISSIONS.REFEREES.UPDATE,
    MANAGE: CERBOS_PERMISSIONS.REFEREES.UPDATE,
    EVALUATE: CERBOS_PERMISSIONS.REFEREES.UPDATE
  },

  // Reports permissions (map to appropriate resources)
  REPORTS: {
    READ: CERBOS_PERMISSIONS.GAMES.VIEW_LIST,
    CREATE: CERBOS_PERMISSIONS.GAMES.CREATE,
    EXPORT: buildCerbosPermission(CERBOS_RESOURCES.GAME, CERBOS_ACTIONS.EXPORT),
    FINANCIAL: CERBOS_PERMISSIONS.FINANCE.VIEW_EXPENSES
  },

  // Settings permissions (map to organization)
  SETTINGS: {
    READ: buildCerbosPermission(CERBOS_RESOURCES.ORGANIZATION, CERBOS_ACTIONS.VIEW),
    UPDATE: buildCerbosPermission(CERBOS_RESOURCES.ORGANIZATION, CERBOS_ACTIONS.UPDATE),
    ORGANIZATION: buildCerbosPermission(CERBOS_RESOURCES.ORGANIZATION, CERBOS_ACTIONS.UPDATE)
  },

  // Roles permissions
  ROLES: {
    READ: CERBOS_PERMISSIONS.ROLES.VIEW_LIST,
    MANAGE: CERBOS_PERMISSIONS.ROLES.MANAGE_ROLES,
    ASSIGN: CERBOS_PERMISSIONS.ROLES.MANAGE_ROLES
  },

  // Users permissions
  USERS: {
    READ: CERBOS_PERMISSIONS.USERS.VIEW_LIST,
    CREATE: CERBOS_PERMISSIONS.USERS.CREATE,
    UPDATE: CERBOS_PERMISSIONS.USERS.UPDATE,
    DELETE: CERBOS_PERMISSIONS.USERS.DELETE,
    IMPERSONATE: CERBOS_PERMISSIONS.USERS.MANAGE_USERS
  },

  // Financial permissions
  FINANCE: {
    READ: CERBOS_PERMISSIONS.FINANCE.VIEW_EXPENSES,
    CREATE: CERBOS_PERMISSIONS.FINANCE.CREATE_EXPENSES,
    APPROVE: CERBOS_PERMISSIONS.FINANCE.APPROVE_EXPENSES,
    MANAGE: CERBOS_PERMISSIONS.FINANCE.VIEW_EXPENSES
  },

  // Communication permissions
  COMMUNICATION: {
    SEND: CERBOS_PERMISSIONS.COMMUNICATIONS.CREATE,
    BROADCAST: CERBOS_PERMISSIONS.COMMUNICATIONS.CREATE,
    MANAGE: CERBOS_PERMISSIONS.COMMUNICATIONS.UPDATE
  },

  // Content permissions
  CONTENT: {
    READ: CERBOS_PERMISSIONS.COMMUNICATIONS.VIEW_LIST,
    CREATE: CERBOS_PERMISSIONS.COMMUNICATIONS.CREATE,
    UPDATE: CERBOS_PERMISSIONS.COMMUNICATIONS.UPDATE,
    PUBLISH: CERBOS_PERMISSIONS.COMMUNICATIONS.UPDATE,
    DELETE: CERBOS_PERMISSIONS.COMMUNICATIONS.DELETE
  }
} as const

/**
 * Cerbos Resource Categories
 *
 * List of all Cerbos resource types for organizing and filtering permissions
 */
export const CERBOS_RESOURCE_CATEGORIES = [
  'game',
  'assignment',
  'referee',
  'user',
  'role',
  'permission',
  'team',
  'league',
  'communication',
  'document',
  'expense',
  'budget',
  'organization',
  'region',
  'post',
  'referee_level',
  'calendar',
  'location'
] as const

/**
 * Legacy Permission Categories (for backward compatibility)
 * @deprecated Use CERBOS_RESOURCE_CATEGORIES instead
 */
export const PERMISSION_CATEGORIES = [
  'games',
  'assignments',
  'referees',
  'reports',
  'settings',
  'roles',
  'users',
  'finance',
  'communication',
  'content'
] as const

/**
 * Type for Cerbos resource names
 */
export type CerbosResourceType = typeof CERBOS_RESOURCES[keyof typeof CERBOS_RESOURCES]

/**
 * Type for Cerbos action names
 */
export type CerbosActionType = typeof CERBOS_ACTIONS[keyof typeof CERBOS_ACTIONS]

/**
 * Type for Cerbos resource categories
 */
export type CerbosResourceCategory = typeof CERBOS_RESOURCE_CATEGORIES[number]

/**
 * Type for permission category names (legacy)
 * @deprecated Use CerbosResourceCategory instead
 */
export type PermissionCategory = typeof PERMISSION_CATEGORIES[number]

/**
 * Type for permission names (flattened from CERBOS_PERMISSIONS object)
 */
export type CerbosPermissionName =
  | typeof CERBOS_PERMISSIONS.GAMES[keyof typeof CERBOS_PERMISSIONS.GAMES]
  | typeof CERBOS_PERMISSIONS.ASSIGNMENTS[keyof typeof CERBOS_PERMISSIONS.ASSIGNMENTS]
  | typeof CERBOS_PERMISSIONS.REFEREES[keyof typeof CERBOS_PERMISSIONS.REFEREES]
  | typeof CERBOS_PERMISSIONS.USERS[keyof typeof CERBOS_PERMISSIONS.USERS]
  | typeof CERBOS_PERMISSIONS.ROLES[keyof typeof CERBOS_PERMISSIONS.ROLES]
  | typeof CERBOS_PERMISSIONS.FINANCE[keyof typeof CERBOS_PERMISSIONS.FINANCE]
  | typeof CERBOS_PERMISSIONS.COMMUNICATIONS[keyof typeof CERBOS_PERMISSIONS.COMMUNICATIONS]
  | typeof CERBOS_PERMISSIONS.TEAMS[keyof typeof CERBOS_PERMISSIONS.TEAMS]
  | typeof CERBOS_PERMISSIONS.LEAGUES[keyof typeof CERBOS_PERMISSIONS.LEAGUES]
  | typeof CERBOS_PERMISSIONS.CALENDAR[keyof typeof CERBOS_PERMISSIONS.CALENDAR]

/**
 * Legacy type for permission names
 * @deprecated Use CerbosPermissionName instead
 */
export type PermissionName = CerbosPermissionName

/**
 * Utility Functions for Permission Management
 */
export class PermissionUtils {
  /**
   * Get all Cerbos permission names as a flat array
   * @returns Array of all Cerbos permission names
   */
  static getAllCerbosPermissionNames(): CerbosPermissionName[] {
    const allPermissions: CerbosPermissionName[] = []

    Object.values(CERBOS_PERMISSIONS).forEach(category => {
      Object.values(category).forEach(permission => {
        allPermissions.push(permission as CerbosPermissionName)
      })
    })

    return allPermissions
  }

  /**
   * Get all permission names as a flat array (backward compatibility)
   * @returns Array of all permission names
   * @deprecated Use getAllCerbosPermissionNames instead
   */
  static getAllPermissionNames(): PermissionName[] {
    return this.getAllCerbosPermissionNames()
  }

  /**
   * Get permission names for a specific Cerbos resource type
   * @param resource The resource type to get permissions for
   * @returns Array of permission names for the resource
   */
  static getPermissionsByResource(resource: CerbosResourceType): CerbosPermissionName[] {
    const permissions: CerbosPermissionName[] = []

    // Find all permissions that start with the resource type
    Object.values(CERBOS_PERMISSIONS).forEach(category => {
      Object.values(category).forEach(permission => {
        if (permission.startsWith(`${resource}:`)) {
          permissions.push(permission as CerbosPermissionName)
        }
      })
    })

    return permissions
  }

  /**
   * Get permission names for a specific category (backward compatibility)
   * @param category The category to get permissions for
   * @returns Array of permission names in the category
   * @deprecated Use getPermissionsByResource instead
   */
  static getPermissionsByCategory(category: PermissionCategory): PermissionName[] {
    const categoryKey = category.toUpperCase() as keyof typeof PERMISSIONS
    const categoryPermissions = PERMISSIONS[categoryKey]

    if (!categoryPermissions) {
      return []
    }

    return Object.values(categoryPermissions) as PermissionName[]
  }

  /**
   * Check if a permission belongs to a specific Cerbos resource type
   * @param permission The permission name to check (resource:action format)
   * @param resource The Cerbos resource type to check against
   * @returns True if the permission belongs to the resource type
   */
  static isPermissionForResource(permission: string, resource: CerbosResourceType): boolean {
    return permission.startsWith(`${resource}:`)
  }

  /**
   * Extract resource type from a Cerbos permission string
   * @param permission The permission name (resource:action format)
   * @returns The resource type or null if invalid format
   */
  static getResourceFromPermission(permission: string): CerbosResourceType | null {
    const parts = permission.split(':')
    if (parts.length < 2) return null

    const resource = parts[0] as CerbosResourceType
    return Object.values(CERBOS_RESOURCES).includes(resource) ? resource : null
  }

  /**
   * Extract action from a Cerbos permission string
   * @param permission The permission name (resource:action format)
   * @returns The action or null if invalid format
   */
  static getActionFromPermission(permission: string): CerbosActionType | null {
    const parts = permission.split(':')
    if (parts.length < 2) return null

    const action = parts.slice(1).join(':') as CerbosActionType // Handle actions like 'admin:view_stats'
    return Object.values(CERBOS_ACTIONS).includes(action) ? action : null
  }

  /**
   * Convert legacy permission to Cerbos format
   * @param legacyPermission Old permission string (e.g., 'games:read')
   * @returns Cerbos permission string or original if no mapping found
   */
  static convertLegacyPermission(legacyPermission: string): string {
    return LEGACY_PERMISSION_MAPPING[legacyPermission] || legacyPermission
  }

  /**
   * Check if a permission belongs to a specific category (backward compatibility)
   * @param permission The permission name to check
   * @param category The category to check against
   * @returns True if the permission belongs to the category
   * @deprecated Use isPermissionForResource instead
   */
  static isPermissionInCategory(permission: string, category: PermissionCategory): boolean {
    // Convert legacy category to resource if possible
    const categoryToResourceMap: Record<string, string> = {
      'games': 'game',
      'assignments': 'assignment',
      'referees': 'referee',
      'users': 'user',
      'roles': 'role',
      'finance': 'expense', // Default to expense for finance
      'communication': 'communication',
      'content': 'communication' // Map content to communication
    }

    const resource = categoryToResourceMap[category]
    if (resource) {
      return this.isPermissionForResource(permission, resource as CerbosResourceType)
    }

    return permission.startsWith(`${category}:`)
  }

  /**
   * Extract category name from a permission string (backward compatibility)
   * @param permission The permission name
   * @returns The category name or null if invalid format
   * @deprecated Use getResourceFromPermission instead
   */
  static getCategoryFromPermission(permission: string): PermissionCategory | null {
    const parts = permission.split(':')
    if (parts.length < 2) return null

    const category = parts[0] as PermissionCategory
    return PERMISSION_CATEGORIES.includes(category) ? category : null
  }

  /**
   * Group permissions by Cerbos resource type
   * @param permissions Array of permissions to group
   * @returns Object with permissions grouped by resource type
   */
  static groupPermissionsByResource(permissions: Permission[]): Record<CerbosResourceType, Permission[]> {
    const grouped = {} as Record<CerbosResourceType, Permission[]>

    // Initialize all resource types with empty arrays
    Object.values(CERBOS_RESOURCES).forEach(resource => {
      grouped[resource] = []
    })

    // Group permissions
    permissions.forEach(permission => {
      const resource = this.getResourceFromPermission(permission.name)
      if (resource && grouped[resource]) {
        grouped[resource].push(permission)
      }
    })

    return grouped
  }

  /**
   * Group permissions by category (backward compatibility)
   * @param permissions Array of permissions to group
   * @returns Object with permissions grouped by category
   * @deprecated Use groupPermissionsByResource instead
   */
  static groupPermissionsByCategory(permissions: Permission[]): Record<PermissionCategory, Permission[]> {
    const grouped = {} as Record<PermissionCategory, Permission[]>

    // Initialize all categories with empty arrays
    PERMISSION_CATEGORIES.forEach(category => {
      grouped[category] = []
    })

    // Group permissions
    permissions.forEach(permission => {
      const category = this.getCategoryFromPermission(permission.name)
      if (category && grouped[category]) {
        grouped[category].push(permission)
      }
    })

    return grouped
  }

  /**
   * Check if an array of permissions includes specific permission names (with legacy support)
   * @param userPermissions User's permission objects
   * @param requiredPermissions Permission names to check for (supports both legacy and Cerbos formats)
   * @returns True if user has all required permissions
   */
  static hasPermissions(userPermissions: Permission[], requiredPermissions: string[]): boolean {
    const userPermissionNames = userPermissions
      .filter(p => p.active)
      .map(p => p.name)

    return requiredPermissions.every(required => {
      // Check direct match first
      if (userPermissionNames.includes(required)) {
        return true
      }

      // Check if this is a legacy permission that needs conversion
      const cerbosPermission = this.convertLegacyPermission(required)
      if (cerbosPermission !== required && userPermissionNames.includes(cerbosPermission)) {
        return true
      }

      return false
    })
  }

  /**
   * Check if an array of permissions includes any of the specified permission names (with legacy support)
   * @param userPermissions User's permission objects
   * @param requiredPermissions Permission names to check for (supports both legacy and Cerbos formats)
   * @returns True if user has at least one of the required permissions
   */
  static hasAnyPermissions(userPermissions: Permission[], requiredPermissions: string[]): boolean {
    const userPermissionNames = userPermissions
      .filter(p => p.active)
      .map(p => p.name)

    return requiredPermissions.some(required => {
      // Check direct match first
      if (userPermissionNames.includes(required)) {
        return true
      }

      // Check if this is a legacy permission that needs conversion
      const cerbosPermission = this.convertLegacyPermission(required)
      if (cerbosPermission !== required && userPermissionNames.includes(cerbosPermission)) {
        return true
      }

      return false
    })
  }

  /**
   * Get human-readable description for a Cerbos resource type
   * @param resource The Cerbos resource type
   * @returns Human-readable description
   */
  static getResourceDescription(resource: CerbosResourceType): string {
    const descriptions: Record<CerbosResourceType, string> = {
      game: 'Game Management',
      assignment: 'Assignment Management',
      referee: 'Referee Management',
      user: 'User Management',
      role: 'Role & Permission Management',
      permission: 'Permission Management',
      team: 'Team Management',
      league: 'League Management',
      communication: 'Communication & Messaging',
      document: 'Document Management',
      expense: 'Expense Management',
      budget: 'Budget Management',
      organization: 'Organization Settings',
      region: 'Region Management',
      post: 'Content Management',
      referee_level: 'Referee Level Management',
      calendar: 'Calendar Management',
      location: 'Location Management'
    }

    return descriptions[resource] || resource
  }

  /**
   * Get human-readable description for a permission category (backward compatibility)
   * @param category The permission category
   * @returns Human-readable description
   * @deprecated Use getResourceDescription instead
   */
  static getCategoryDescription(category: PermissionCategory): string {
    const descriptions: Record<PermissionCategory, string> = {
      games: 'Game Management',
      assignments: 'Assignment Management',
      referees: 'Referee Management',
      reports: 'Reports & Analytics',
      settings: 'System Settings',
      roles: 'Role & Permission Management',
      users: 'User Management',
      finance: 'Financial Management',
      communication: 'Communication & Messaging',
      content: 'Content Management'
    }

    return descriptions[category] || category
  }

  /**
   * Get human-readable description for a Cerbos action
   * @param permission The full permission name (e.g., 'game:view:list')
   * @returns Human-readable action description
   */
  static getActionDescription(permission: string): string {
    const parts = permission.split(':')
    if (parts.length < 2) return permission

    const action = parts.slice(1).join(':') // Handle complex actions like 'view:list'
    const actionDescriptions: Record<string, string> = {
      view: 'View',
      'view:list': 'View List',
      list: 'List',
      'view:details': 'View Details',
      'view:unread_count': 'View Unread Count',
      'view:pending_acknowledgments': 'View Pending Acknowledgments',
      create: 'Create',
      'create:version': 'Create Version',
      update: 'Edit',
      delete: 'Delete',
      assign_referee: 'Assign Referee',
      unassign_referee: 'Unassign Referee',
      change_status: 'Change Status',
      approve: 'Approve',
      reject: 'Reject',
      export: 'Export',
      import: 'Import',
      manage_users: 'Manage Users',
      manage_roles: 'Manage Roles',
      manage_permissions: 'Manage Permissions',
      manage_regions: 'Manage Regions',
      view_audit_logs: 'View Audit Logs',
      bulk_create: 'Bulk Create',
      generate: 'Generate',
      publish: 'Publish',
      archive: 'Archive',
      acknowledge: 'Acknowledge',
      download: 'Download',
      'admin:view_recipients': 'Admin: View Recipients',
      'admin:view_stats': 'Admin: View Statistics',
      'admin:view_acknowledgments': 'Admin: View Acknowledgments',
      'view:games_calendar': 'View Games Calendar',
      'admin:configure_sync': 'Admin: Configure Sync',
      'admin:view_sync_status': 'Admin: View Sync Status',
      'admin:disable_sync': 'Admin: Disable Sync',
      'admin:trigger_sync': 'Admin: Trigger Sync',
      'admin:upload_calendar': 'Admin: Upload Calendar',

      // Legacy actions for backward compatibility
      read: 'View',
      manage: 'Manage',
      send: 'Send',
      broadcast: 'Broadcast',
      impersonate: 'Impersonate',
      evaluate: 'Evaluate',
      assign: 'Assign',
      auto_assign: 'Auto-assign'
    }

    return actionDescriptions[action] || action
  }

  /**
   * Format a Cerbos permission name into a human-readable string
   * @param permission The permission name to format (resource:action format)
   * @returns Human-readable permission description
   */
  static formatCerbosPermissionName(permission: string): string {
    const resource = this.getResourceFromPermission(permission)
    const action = this.getActionDescription(permission)

    if (!resource) return permission

    const resourceDesc = this.getResourceDescription(resource)
    return `${action} ${resourceDesc}`
  }

  /**
   * Format a permission name into a human-readable string (backward compatibility)
   * @param permission The permission name to format
   * @returns Human-readable permission description
   * @deprecated Use formatCerbosPermissionName instead
   */
  static formatPermissionName(permission: string): string {
    // Try Cerbos format first
    const resource = this.getResourceFromPermission(permission)
    if (resource) {
      return this.formatCerbosPermissionName(permission)
    }

    // Fall back to legacy format
    const category = this.getCategoryFromPermission(permission)
    const action = this.getActionDescription(permission)

    if (!category) return permission

    const categoryDesc = this.getCategoryDescription(category)
    return `${action} ${categoryDesc}`
  }
}

/**
 * Helper Functions for Common Permission Checks
 */
export const CerbosPermissionHelpers = {
  /**
   * Check if user can view games
   */
  canViewGames: (userPermissions: Permission[]) =>
    PermissionUtils.hasAnyPermissions(userPermissions, [CERBOS_PERMISSIONS.GAMES.VIEW, CERBOS_PERMISSIONS.GAMES.VIEW_LIST]),

  /**
   * Check if user can manage games
   */
  canManageGames: (userPermissions: Permission[]) =>
    PermissionUtils.hasAnyPermissions(userPermissions, [CERBOS_PERMISSIONS.GAMES.CREATE, CERBOS_PERMISSIONS.GAMES.UPDATE, CERBOS_PERMISSIONS.GAMES.DELETE]),

  /**
   * Check if user can view referees
   */
  canViewReferees: (userPermissions: Permission[]) =>
    PermissionUtils.hasAnyPermissions(userPermissions, [CERBOS_PERMISSIONS.REFEREES.VIEW, CERBOS_PERMISSIONS.REFEREES.VIEW_LIST]),

  /**
   * Check if user can manage referees
   */
  canManageReferees: (userPermissions: Permission[]) =>
    PermissionUtils.hasAnyPermissions(userPermissions, [CERBOS_PERMISSIONS.REFEREES.CREATE, CERBOS_PERMISSIONS.REFEREES.UPDATE]),

  /**
   * Check if user can view financial data
   */
  canViewFinancials: (userPermissions: Permission[]) =>
    PermissionUtils.hasAnyPermissions(userPermissions, [CERBOS_PERMISSIONS.FINANCE.VIEW_EXPENSES, CERBOS_PERMISSIONS.FINANCE.VIEW_BUDGETS]),

  /**
   * Check if user can manage financial data
   */
  canManageFinancials: (userPermissions: Permission[]) =>
    PermissionUtils.hasAnyPermissions(userPermissions, [CERBOS_PERMISSIONS.FINANCE.CREATE_EXPENSES, CERBOS_PERMISSIONS.FINANCE.CREATE_BUDGETS, CERBOS_PERMISSIONS.FINANCE.APPROVE_EXPENSES]),

  /**
   * Check if user has administrative permissions
   */
  isAdmin: (userPermissions: Permission[]) =>
    PermissionUtils.hasAnyPermissions(userPermissions, [CERBOS_PERMISSIONS.USERS.MANAGE_USERS, CERBOS_PERMISSIONS.ROLES.MANAGE_ROLES])
}

export default PermissionUtils