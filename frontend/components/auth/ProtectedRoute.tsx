/**
 * @fileoverview ProtectedRoute Component
 * 
 * A wrapper component that protects routes and pages based on user permissions.
 * It checks if the user has the required permissions to access a route and
 * handles unauthorized access appropriately.
 * 
 * @module components/auth/ProtectedRoute
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { usePermissions } from '@/hooks/usePermissions'
import { getPagePermissions, getRoleConfig, isViewAllowedForRole } from '@/lib/rbac-config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, ShieldOff, Home, LogIn, AlertCircle } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Custom permissions required (overrides automatic detection) */
  requiredPermissions?: string[]
  /** Whether to require all permissions (AND) or any permission (OR) */
  requireAll?: boolean
  /** Custom message to show when access is denied */
  deniedMessage?: string
  /** Whether to show a loading state while checking permissions */
  showLoading?: boolean
  /** Callback when access is denied */
  onAccessDenied?: () => void
  /** Whether this is a dashboard view (uses view-based permissions) */
  isDashboardView?: boolean
  /** The view name for dashboard views */
  viewName?: string
}

export function ProtectedRoute({
  children,
  requiredPermissions,
  requireAll = false,
  deniedMessage,
  showLoading = true,
  onAccessDenied,
  isDashboardView = false,
  viewName
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions } = usePermissions()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [requiredPerms, setRequiredPerms] = useState<string[]>([])

  useEffect(() => {
    if (authLoading) return

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Determine required permissions
    let permsToCheck: string[] = []
    
    if (requiredPermissions) {
      // Use explicitly provided permissions
      permsToCheck = requiredPermissions
    } else if (isDashboardView && viewName) {
      // Check dashboard view permissions
      const viewKey = `dashboard-view:${viewName}`
      permsToCheck = getPagePermissions(viewKey)
      
      // Also check if the view is allowed for the user's role
      if (user?.role) {
        const roleConfig = getRoleConfig(user.role)
        if (roleConfig && !isViewAllowedForRole(user.role, viewName)) {
          setIsAuthorized(false)
          setRequiredPerms(permsToCheck)
          if (onAccessDenied) onAccessDenied()
          return
        }
      }
    } else {
      // Auto-detect permissions based on pathname
      permsToCheck = getPagePermissions(pathname)
    }

    setRequiredPerms(permsToCheck)

    // If no permissions required, allow access
    if (permsToCheck.length === 0) {
      setIsAuthorized(true)
      return
    }

    // Admin always has access
    if (user?.role === 'admin') {
      setIsAuthorized(true)
      return
    }

    // Check permissions
    let hasAccess = false
    if (requireAll) {
      hasAccess = hasAllPermissions(permsToCheck)
    } else {
      hasAccess = hasAnyPermission(permsToCheck)
    }

    setIsAuthorized(hasAccess)
    
    if (!hasAccess && onAccessDenied) {
      onAccessDenied()
    }
  }, [
    authLoading,
    isAuthenticated,
    pathname,
    requiredPermissions,
    requireAll,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    user,
    router,
    onAccessDenied,
    isDashboardView,
    viewName
  ])

  // Show loading state
  if (authLoading || isAuthorized === null) {
    if (!showLoading) return null
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <LogIn className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access denied
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <ShieldOff className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              {deniedMessage || 'You do not have permission to access this page'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requiredPerms.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Required Permissions</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">This page requires {requireAll ? 'all' : 'one'} of the following permissions:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {requiredPerms.map(perm => (
                        <li key={perm}>{perm}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.back()}
              >
                Go Back
              </Button>
            </div>

            {user?.role && (
              <p className="text-xs text-center text-muted-foreground">
                Your current role: <span className="font-medium">{user.role}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authorized - render children
  return <>{children}</>
}

/**
 * Higher-order component to wrap a component with route protection
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

export default ProtectedRoute