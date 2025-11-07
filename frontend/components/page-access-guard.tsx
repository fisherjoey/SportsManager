/**
 * @fileoverview Page Access Guard Component
 *
 * Component wrapper that protects pages based on user permissions
 * Handles loading states and automatic redirects for unauthorized access
 */

'use client'

import type React from 'react'
import { usePageAccess } from '@/hooks/usePageAccess'
import { Loader2 } from 'lucide-react'

interface PageAccessGuardProps {
  /**
   * The page ID or path to check access for
   */
  pageId: string

  /**
   * Children to render if user has access
   */
  children: React.ReactNode

  /**
   * Optional custom loading component
   */
  fallback?: React.ReactNode

  /**
   * Whether to redirect to login if not authenticated (default: true)
   */
  redirectToLogin?: boolean

  /**
   * Whether to redirect to unauthorized page if no access (default: true)
   */
  redirectToUnauthorized?: boolean
}

/**
 * Default loading spinner component
 */
function DefaultLoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking access permissions...</p>
      </div>
    </div>
  )
}

/**
 * Page Access Guard Component
 *
 * Wraps page content and only renders children if user has appropriate access.
 * Automatically handles loading states and redirects for unauthorized access.
 *
 * @component
 * @param {PageAccessGuardProps} props - Component properties
 * @returns {JSX.Element | null} Protected content or loading/null
 *
 * @example
 * ```tsx
 * // Protect an entire page
 * export default function AdminUsersPage() {
 *   return (
 *     <PageAccessGuard pageId="admin/users">
 *       <div>
 *         <h1>User Management</h1>
 *         <UserTable />
 *       </div>
 *     </PageAccessGuard>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom loading fallback
 * <PageAccessGuard
 *   pageId="admin/settings"
 *   fallback={<CustomLoader />}
 * >
 *   <SettingsPanel />
 * </PageAccessGuard>
 * ```
 *
 * @example
 * ```tsx
 * // Without automatic redirects
 * <PageAccessGuard
 *   pageId="restricted-content"
 *   redirectToLogin={false}
 *   redirectToUnauthorized={false}
 * >
 *   <SensitiveContent />
 * </PageAccessGuard>
 * ```
 */
export function PageAccessGuard({
  pageId,
  children,
  fallback,
  redirectToLogin = true,
  redirectToUnauthorized = true
}: PageAccessGuardProps): JSX.Element | null {
  const { isChecking, hasAccess } = usePageAccess(pageId, {
    redirectToLogin,
    redirectToUnauthorized
  })

  // Show loading state while checking permissions
  if (isChecking) {
    return <>{fallback || <DefaultLoadingFallback />}</>
  }

  // If no access and redirects are disabled, render nothing
  if (!hasAccess) {
    return null
  }

  // User has access, render children
  return <>{children}</>
}

/**
 * Inline Page Section Guard
 *
 * Lighter version for protecting sections within a page
 * Shows nothing while checking or if no access (no redirects)
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   return (
 *     <div>
 *       <h1>Dashboard</h1>
 *       <PageSectionGuard pageId="admin/analytics">
 *         <AnalyticsPanel />
 *       </PageSectionGuard>
 *       <RegularContent />
 *     </div>
 *   )
 * }
 * ```
 */
export function PageSectionGuard({
  pageId,
  children,
  fallback
}: Omit<PageAccessGuardProps, 'redirectToLogin' | 'redirectToUnauthorized'>): JSX.Element | null {
  const { isChecking, hasAccess } = usePageAccess(pageId, {
    redirectToLogin: false,
    redirectToUnauthorized: false
  })

  if (isChecking) {
    return fallback ? <>{fallback}</> : null
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}
