/**
 * @fileoverview RequirePermission Component
 * 
 * A wrapper component that conditionally renders its children based on user permissions.
 * This component checks if the current user has a specific permission and only renders
 * the children if the permission is granted. If not, it renders a fallback or nothing.
 * 
 * @module components/auth/RequirePermission
 */

'use client'

import React from 'react'
import { useAuth } from '@/components/auth-provider'

/**
 * Props for RequirePermission component
 */
interface RequirePermissionProps {
  /** The permission name to check for */
  permission: string
  /** Optional fallback content to show when permission is denied */
  fallback?: React.ReactNode
  /** The content to render when permission is granted */
  children: React.ReactNode
}

/**
 * RequirePermission Component
 * 
 * Conditionally renders children based on user permissions from the RBAC system.
 * This component integrates with the AuthProvider's hasPermission method to
 * provide fine-grained access control at the component level.
 * 
 * @component
 * @param {RequirePermissionProps} props - Component properties
 * @returns {JSX.Element | null} Children if permission granted, fallback or null if denied
 * 
 * @example
 * ```tsx
 * // Show content only to users with 'games.create' permission
 * <RequirePermission permission="games.create">
 *   <CreateGameButton />
 * </RequirePermission>
 * 
 * // Show fallback message when permission denied
 * <RequirePermission 
 *   permission="admin.users.manage" 
 *   fallback={<div>Access denied. Contact your administrator.</div>}
 * >
 *   <UserManagementPanel />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({ 
  permission, 
  fallback = null, 
  children 
}: RequirePermissionProps): JSX.Element | null {
  const { hasPermission, isAuthenticated } = useAuth()

  // If user is not authenticated, don't show anything
  if (!isAuthenticated) {
    return null
  }

  // Check if user has the required permission
  if (!hasPermission(permission)) {
    return fallback as JSX.Element || null
  }

  // User has permission, render children
  return <>{children}</>
}

export default RequirePermission