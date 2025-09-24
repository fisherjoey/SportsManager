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
 * System Permission Constants
 * 
 * Centralized definition of all system permissions organized by category.
 * These constants should match the permissions defined in the backend seed data.
 */
export const PERMISSIONS = {
  // Games permissions
  GAMES: {
    READ: 'games:read',
    CREATE: 'games:create', 
    UPDATE: 'games:update',
    DELETE: 'games:delete',
    PUBLISH: 'games:publish'
  },

  // Assignments permissions
  ASSIGNMENTS: {
    READ: 'assignments:read',
    CREATE: 'assignments:create',
    UPDATE: 'assignments:update', 
    DELETE: 'assignments:delete',
    APPROVE: 'assignments:approve',
    AUTO_ASSIGN: 'assignments:auto_assign'
  },

  // Referees permissions
  REFEREES: {
    READ: 'referees:read',
    UPDATE: 'referees:update',
    MANAGE: 'referees:manage',
    EVALUATE: 'referees:evaluate'
  },

  // Reports permissions
  REPORTS: {
    READ: 'reports:read',
    CREATE: 'reports:create',
    EXPORT: 'reports:export', 
    FINANCIAL: 'reports:financial'
  },

  // Settings permissions
  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update',
    ORGANIZATION: 'settings:organization'
  },

  // Roles permissions
  ROLES: {
    READ: 'roles:read',
    MANAGE: 'roles:manage',
    ASSIGN: 'roles:assign'
  },

  // Users permissions
  USERS: {
    READ: 'users:read',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    IMPERSONATE: 'users:impersonate'
  },

  // Financial permissions
  FINANCE: {
    READ: 'finance:read',
    CREATE: 'finance:create',
    APPROVE: 'finance:approve',
    MANAGE: 'finance:manage'
  },

  // Communication permissions
  COMMUNICATION: {
    SEND: 'communication:send',
    BROADCAST: 'communication:broadcast',
    MANAGE: 'communication:manage'
  },

  // Content permissions
  CONTENT: {
    READ: 'content:read',
    CREATE: 'content:create',
    UPDATE: 'content:update',
    PUBLISH: 'content:publish',
    DELETE: 'content:delete'
  }
} as const

/**
 * Permission Categories
 * 
 * List of all permission categories for organizing and filtering permissions
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
 * Type for permission category names
 */
export type PermissionCategory = typeof PERMISSION_CATEGORIES[number]

/**
 * Type for permission names (flattened from PERMISSIONS object)
 */
export type PermissionName = 
  | typeof PERMISSIONS.GAMES[keyof typeof PERMISSIONS.GAMES]
  | typeof PERMISSIONS.ASSIGNMENTS[keyof typeof PERMISSIONS.ASSIGNMENTS]
  | typeof PERMISSIONS.REFEREES[keyof typeof PERMISSIONS.REFEREES]
  | typeof PERMISSIONS.REPORTS[keyof typeof PERMISSIONS.REPORTS]
  | typeof PERMISSIONS.SETTINGS[keyof typeof PERMISSIONS.SETTINGS]
  | typeof PERMISSIONS.ROLES[keyof typeof PERMISSIONS.ROLES]
  | typeof PERMISSIONS.USERS[keyof typeof PERMISSIONS.USERS]
  | typeof PERMISSIONS.FINANCE[keyof typeof PERMISSIONS.FINANCE]
  | typeof PERMISSIONS.COMMUNICATION[keyof typeof PERMISSIONS.COMMUNICATION]
  | typeof PERMISSIONS.CONTENT[keyof typeof PERMISSIONS.CONTENT]

/**
 * Utility Functions for Permission Management
 */
export class PermissionUtils {
  /**
   * Get all permission names as a flat array
   * @returns Array of all permission names
   */
  static getAllPermissionNames(): PermissionName[] {
    const allPermissions: PermissionName[] = []
    
    Object.values(PERMISSIONS).forEach(category => {
      Object.values(category).forEach(permission => {
        allPermissions.push(permission as PermissionName)
      })
    })
    
    return allPermissions
  }

  /**
   * Get permission names for a specific category
   * @param category The category to get permissions for
   * @returns Array of permission names in the category
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
   * Check if a permission belongs to a specific category
   * @param permission The permission name to check
   * @param category The category to check against
   * @returns True if the permission belongs to the category
   */
  static isPermissionInCategory(permission: string, category: PermissionCategory): boolean {
    return permission.startsWith(`${category}:`)
  }

  /**
   * Extract category name from a permission string
   * @param permission The permission name
   * @returns The category name or null if invalid format
   */
  static getCategoryFromPermission(permission: string): PermissionCategory | null {
    const parts = permission.split(':')
    if (parts.length < 2) return null
    
    const category = parts[0] as PermissionCategory
    return PERMISSION_CATEGORIES.includes(category) ? category : null
  }

  /**
   * Group permissions by category
   * @param permissions Array of permissions to group
   * @returns Object with permissions grouped by category
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
   * Check if an array of permissions includes specific permission names
   * @param userPermissions User's permission objects
   * @param requiredPermissions Permission names to check for
   * @returns True if user has all required permissions
   */
  static hasPermissions(userPermissions: Permission[], requiredPermissions: string[]): boolean {
    const userPermissionNames = userPermissions
      .filter(p => p.active)
      .map(p => p.name)
    
    return requiredPermissions.every(required => 
      userPermissionNames.includes(required)
    )
  }

  /**
   * Check if an array of permissions includes any of the specified permission names
   * @param userPermissions User's permission objects
   * @param requiredPermissions Permission names to check for
   * @returns True if user has at least one of the required permissions
   */
  static hasAnyPermissions(userPermissions: Permission[], requiredPermissions: string[]): boolean {
    const userPermissionNames = userPermissions
      .filter(p => p.active)
      .map(p => p.name)
    
    return requiredPermissions.some(required => 
      userPermissionNames.includes(required)
    )
  }

  /**
   * Get human-readable description for a permission category
   * @param category The permission category
   * @returns Human-readable description
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
   * Get human-readable description for a permission action
   * @param permission The full permission name (e.g., 'games:create')
   * @returns Human-readable action description
   */
  static getActionDescription(permission: string): string {
    const parts = permission.split(':')
    if (parts.length < 2) return permission
    
    const action = parts[1]
    const actionDescriptions: Record<string, string> = {
      read: 'View',
      create: 'Create',
      update: 'Edit',
      delete: 'Delete',
      manage: 'Manage',
      approve: 'Approve',
      publish: 'Publish',
      export: 'Export',
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
   * Format a permission name into a human-readable string
   * @param permission The permission name to format
   * @returns Human-readable permission description
   */
  static formatPermissionName(permission: string): string {
    const category = this.getCategoryFromPermission(permission)
    const action = this.getActionDescription(permission)
    
    if (!category) return permission
    
    const categoryDesc = this.getCategoryDescription(category)
    return `${action} ${categoryDesc}`
  }
}

export default PermissionUtils