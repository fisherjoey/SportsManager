/**
 * @fileoverview RequireAllPermissions Component
 * 
 * A wrapper component that conditionally renders its children based on user having
 * ALL of the specified permissions. This component is useful for scenarios where
 * multiple permissions are required for accessing sensitive functionality.
 * 
 * @module components/auth/RequireAllPermissions
 */

'use client'

import React from 'react'
import { useAuth } from '@/components/auth-provider'

/**
 * Props for RequireAllPermissions component
 */
interface RequireAllPermissionsProps {
  /** Array of permission names to check (user needs ALL of these) */
  permissions: string[]
  /** Optional fallback content to show when permissions are missing */
  fallback?: React.ReactNode
  /** The content to render when all permissions are granted */
  children: React.ReactNode
}

/**
 * RequireAllPermissions Component
 * 
 * Conditionally renders children only if the user has ALL of the specified permissions.
 * This provides strict access control for sensitive operations that require multiple
 * permissions to be granted simultaneously.
 * 
 * @component
 * @param {RequireAllPermissionsProps} props - Component properties
 * @returns {JSX.Element | null} Children if all permissions granted, fallback or null if any missing
 * 
 * @example
 * ```tsx
 * // Show content only if user can both create and delete games
 * <RequireAllPermissions permissions={['games.create', 'games.delete']}>
 *   <AdvancedGameManagement />
 * </RequireAllPermissions>
 * 
 * // Financial operations requiring multiple permissions
 * <RequireAllPermissions 
 *   permissions={['finance.transactions.create', 'finance.accounts.manage', 'finance.audit.access']} 
 *   fallback={<div>You need full financial access to perform this operation.</div>}
 * >
 *   <FinancialTransactionEditor />
 * </RequireAllPermissions>
 * 
 * // System administration requiring multiple admin permissions
 * <RequireAllPermissions 
 *   permissions={['admin.system.configure', 'admin.users.manage', 'admin.security.manage']}
 * >
 *   <SystemAdministrationPanel />
 * </RequireAllPermissions>
 * ```
 */
export function RequireAllPermissions({ 
  permissions, 
  fallback = null, 
  children 
}: RequireAllPermissionsProps): JSX.Element | null {
  const { hasAllPermissions, isAuthenticated } = useAuth()

  // If user is not authenticated, don't show anything
  if (!isAuthenticated) {
    return null
  }

  // Check if user has all of the required permissions
  if (!hasAllPermissions(permissions)) {
    return fallback as JSX.Element || null
  }

  // User has all required permissions, render children
  return <>{children}</>
}

export default RequireAllPermissions