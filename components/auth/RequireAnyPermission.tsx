/**
 * @fileoverview RequireAnyPermission Component
 * 
 * A wrapper component that conditionally renders its children based on user having
 * ANY of the specified permissions. This component is useful for scenarios where
 * multiple different permissions could grant access to the same functionality.
 * 
 * @module components/auth/RequireAnyPermission
 */

'use client'

import React from 'react'
import { useAuth } from '@/components/auth-provider'

/**
 * Props for RequireAnyPermission component
 */
interface RequireAnyPermissionProps {
  /** Array of permission names to check (user needs ANY one of these) */
  permissions: string[]
  /** Optional fallback content to show when no permissions are granted */
  fallback?: React.ReactNode
  /** The content to render when at least one permission is granted */
  children: React.ReactNode
}

/**
 * RequireAnyPermission Component
 * 
 * Conditionally renders children if the user has ANY of the specified permissions.
 * This is useful for flexible access control where multiple different permissions
 * could grant access to the same feature.
 * 
 * @component
 * @param {RequireAnyPermissionProps} props - Component properties
 * @returns {JSX.Element | null} Children if any permission granted, fallback or null if none granted
 * 
 * @example
 * ```tsx
 * // Show content if user has any game management permission
 * <RequireAnyPermission permissions={['games.create', 'games.update', 'games.view']}>
 *   <GameManagementToolbar />
 * </RequireAnyPermission>
 * 
 * // Show content if user can manage either users or roles
 * <RequireAnyPermission 
 *   permissions={['admin.users.manage', 'admin.roles.manage']} 
 *   fallback={<div>You need administrative permissions to access this feature.</div>}
 * >
 *   <AdminPanel />
 * </RequireAnyPermission>
 * 
 * // Financial access - various levels of financial permissions
 * <RequireAnyPermission permissions={['finance.view', 'finance.manager', 'finance.admin']}>
 *   <FinancialDashboard />
 * </RequireAnyPermission>
 * ```
 */
export function RequireAnyPermission({ 
  permissions, 
  fallback = null, 
  children 
}: RequireAnyPermissionProps): JSX.Element | null {
  const { hasAnyPermission, isAuthenticated } = useAuth()

  // If user is not authenticated, don't show anything
  if (!isAuthenticated) {
    return null
  }

  // Check if user has any of the required permissions
  if (!hasAnyPermission(permissions)) {
    return fallback as JSX.Element || null
  }

  // User has at least one required permission, render children
  return <>{children}</>
}

export default RequireAnyPermission