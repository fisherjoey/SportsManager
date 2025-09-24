/**
 * @fileoverview usePermissions Hook
 * 
 * Custom React hook that provides access to user permissions and permission checking
 * utilities. This hook extracts permission-related functionality from the AuthProvider
 * and provides memoized permission checks for optimal performance.
 * 
 * @module hooks/usePermissions
 */

'use client'

import { useMemo } from 'react'
import { useAuth } from '@/components/auth-provider'
import type { Permission } from '@/lib/api'

/**
 * Return type for usePermissions hook
 */
interface UsePermissionsReturn {
  /** Array of user's permissions */
  permissions: Permission[]
  /** Function to check if user has a specific permission */
  hasPermission: (permission: string) => boolean
  /** Function to check if user has any of the specified permissions */
  hasAnyPermission: (permissions: string[]) => boolean
  /** Function to check if user has all of the specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean
  /** Function to refresh user permissions from server */
  refreshPermissions: () => Promise<void>
  /** Boolean indicating if user is authenticated */
  isAuthenticated: boolean
  /** Helper function to get permissions by category */
  getPermissionsByCategory: (category: string) => Permission[]
  /** Helper function to check if user has any permissions in a category */
  hasPermissionsInCategory: (category: string) => boolean
}

/**
 * usePermissions Hook
 * 
 * Provides access to user permissions and permission checking utilities.
 * This hook extracts permission-related functionality from the AuthProvider
 * and adds additional utility functions for working with permissions.
 * 
 * @returns {UsePermissionsReturn} Object containing permissions and utility functions
 * 
 * @example
 * ```tsx
 * function GameManagement() {
 *   const { 
 *     hasPermission, 
 *     hasAnyPermission, 
 *     getPermissionsByCategory,
 *     refreshPermissions 
 *   } = usePermissions()
 * 
 *   const canCreateGames = hasPermission('games.create')
 *   const canManageGames = hasAnyPermission(['games.create', 'games.update', 'games.delete'])
 *   const gamePermissions = getPermissionsByCategory('games')
 * 
 *   const handleRefreshPermissions = async () => {
 *     await refreshPermissions()
 *     console.log('Permissions refreshed!')
 *   }
 * 
 *   return (
 *     <div>
 *       {canCreateGames && <CreateGameButton />}
 *       {canManageGames && <GameManagementPanel />}
 *       <button onClick={handleRefreshPermissions}>
 *         Refresh Permissions
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
    isAuthenticated
  } = useAuth()

  // Memoized utility function to get permissions by category
  const getPermissionsByCategory = useMemo(() => {
    return (category: string): Permission[] => {
      return permissions.filter(permission => 
        permission.category.toLowerCase() === category.toLowerCase()
      )
    }
  }, [permissions])

  // Memoized function to check if user has any permissions in a category
  const hasPermissionsInCategory = useMemo(() => {
    return (category: string): boolean => {
      return permissions.some(permission => 
        permission.category.toLowerCase() === category.toLowerCase() && 
        permission.active
      )
    }
  }, [permissions])

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
    isAuthenticated,
    getPermissionsByCategory,
    hasPermissionsInCategory
  }
}

export default usePermissions