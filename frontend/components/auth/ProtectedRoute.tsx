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
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (authLoading) return

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Check page access via backend API
    const checkAccess = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-page-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ page: pathname })
        })

        if (!response.ok) {
          setIsAuthorized(false)
          if (onAccessDenied) onAccessDenied()
          return
        }

        const data = await response.json()
        const hasAccess = data.data?.hasAccess || false

        setIsAuthorized(hasAccess)

        if (!hasAccess && onAccessDenied) {
          onAccessDenied()
        }
      } catch (error) {
        console.error('Failed to check page access:', error)
        setIsAuthorized(false)
        if (onAccessDenied) onAccessDenied()
      }
    }

    checkAccess()
  }, [
    authLoading,
    isAuthenticated,
    pathname,
    router,
    onAccessDenied
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
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Insufficient Access</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Your account does not have access to this page. Please contact an administrator if you believe this is an error.</p>
                </div>
              </AlertDescription>
            </Alert>

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