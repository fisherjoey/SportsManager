/**
 * @fileoverview Page Access Hook
 *
 * Hook for checking page access permissions with automatic redirects
 * Integrates with AuthProvider for centralized permission management
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'

interface UsePageAccessOptions {
  redirectToLogin?: boolean
  redirectToUnauthorized?: boolean
}

interface UsePageAccessReturn {
  isChecking: boolean
  hasAccess: boolean
}

/**
 * Hook for checking page access permissions
 *
 * @param pageId - The page ID or path to check access for
 * @param options - Configuration options for redirects
 * @returns Object with isChecking and hasAccess status
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { isChecking, hasAccess } = usePageAccess('admin/users')
 *
 *   if (isChecking) return <LoadingSpinner />
 *   if (!hasAccess) return null // Will redirect automatically
 *
 *   return <div>Page content</div>
 * }
 * ```
 */
export function usePageAccess(
  pageId: string,
  options: UsePageAccessOptions = {}
): UsePageAccessReturn {
  const {
    redirectToLogin = true,
    redirectToUnauthorized = true
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, canAccessPage, pagePermissions } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // Wait for client-side rendering and auth to be initialized
    const checkAccess = () => {
      // If not authenticated and should redirect to login
      if (!isAuthenticated && redirectToLogin) {
        // Store the current path to redirect back after login
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirect_after_login', pathname || '/')
        }
        router.push('/login')
        setIsChecking(false)
        setHasAccess(false)
        return
      }

      // If authenticated, check page access
      if (isAuthenticated && user) {
        const allowed = canAccessPage(pageId)
        setHasAccess(allowed)

        // If no access and should redirect to unauthorized page
        if (!allowed && redirectToUnauthorized) {
          router.push('/unauthorized')
        }

        setIsChecking(false)
      } else if (!isAuthenticated) {
        // Not authenticated and shouldn't redirect to login
        setHasAccess(false)
        setIsChecking(false)
      }
    }

    // Add a small delay to allow page permissions to load
    // This prevents flashing during initial page load
    const timer = setTimeout(checkAccess, 100)

    return () => clearTimeout(timer)
  }, [
    pageId,
    isAuthenticated,
    user,
    canAccessPage,
    redirectToLogin,
    redirectToUnauthorized,
    router,
    pathname,
    pagePermissions // Re-check when permissions change
  ])

  return {
    isChecking,
    hasAccess
  }
}

/**
 * Simplified hook for checking page access without redirects
 * Useful when you want to conditionally render content
 *
 * @param pageId - The page ID or path to check access for
 * @returns Boolean indicating if user has access
 *
 * @example
 * ```tsx
 * function ConditionalContent() {
 *   const canViewAdmin = usePageAccessCheck('admin/dashboard')
 *
 *   return (
 *     <div>
 *       {canViewAdmin && <AdminPanel />}
 *       <RegularContent />
 *     </div>
 *   )
 * }
 * ```
 */
export function usePageAccessCheck(pageId: string): boolean {
  const { canAccessPage } = useAuth()
  return canAccessPage(pageId)
}
