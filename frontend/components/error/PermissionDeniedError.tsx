/**
 * @fileoverview Permission Denied Error Component
 *
 * A reusable component to display user-friendly error messages when Cerbos
 * returns 403 Forbidden responses. Provides clear guidance to users about
 * why they cannot access certain features.
 *
 * @module components/error/PermissionDeniedError
 */

'use client'

import React from 'react'
import { AlertTriangle, Shield, Contact } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Props for PermissionDeniedError component
 */
interface PermissionDeniedErrorProps {
  /** Optional title override */
  title?: string
  /** Optional description override */
  description?: string
  /** Resource that was being accessed */
  resource?: string
  /** Action that was attempted */
  action?: string
  /** Whether to show contact admin option */
  showContactAdmin?: boolean
  /** Callback when user clicks contact admin */
  onContactAdmin?: () => void
  /** Callback when user clicks retry */
  onRetry?: () => void
  /** Whether to show as a card or inline alert */
  variant?: 'card' | 'alert'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * PermissionDeniedError Component
 *
 * Displays a user-friendly error message when access is denied by Cerbos.
 * Provides contextual information about why access was denied and options
 * for users to get help.
 *
 * @component
 * @param {PermissionDeniedErrorProps} props - Component properties
 * @returns {JSX.Element} Permission denied error display
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PermissionDeniedError />
 *
 * // With resource context
 * <PermissionDeniedError
 *   resource="games"
 *   action="create"
 *   showContactAdmin={true}
 *   onContactAdmin={() => openSupportModal()}
 * />
 *
 * // As an alert
 * <PermissionDeniedError
 *   variant="alert"
 *   title="Cannot edit game"
 *   description="You need assignment permissions to modify this game."
 * />
 * ```
 */
export function PermissionDeniedError({
  title,
  description,
  resource,
  action,
  showContactAdmin = true,
  onContactAdmin,
  onRetry,
  variant = 'card',
  size = 'md'
}: PermissionDeniedErrorProps): JSX.Element {
  // Generate default title and description based on resource/action
  const defaultTitle = title || 'Access Denied'

  const generateDescription = (): string => {
    if (description) return description

    if (resource && action) {
      const actionText = action === 'view' ? 'view' :
                        action === 'create' ? 'create' :
                        action === 'update' ? 'edit' :
                        action === 'delete' ? 'delete' : action

      const resourceText = resource === 'game' ? 'games' :
                          resource === 'referee' ? 'referees' :
                          resource === 'user' ? 'users' :
                          resource === 'expense' ? 'financial data' : resource

      return `You don't have permission to ${actionText} ${resourceText}. Please contact your administrator if you believe this is an error.`
    }

    return 'You don't have permission to access this feature. Please contact your administrator if you need access.'
  }

  const defaultDescription = generateDescription()

  const handleContactAdmin = () => {
    if (onContactAdmin) {
      onContactAdmin()
    } else {
      // Default behavior - could open a modal, redirect to help, etc.
      console.log('Contact admin requested for permission issue')
    }
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
  const cardPadding = size === 'sm' ? 'p-4' : size === 'lg' ? 'p-8' : 'p-6'

  if (variant === 'alert') {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <Shield className={`${iconSize} text-orange-600`} />
        <AlertTitle className="text-orange-800">{defaultTitle}</AlertTitle>
        <AlertDescription className="text-orange-700">
          {defaultDescription}
          {showContactAdmin && (
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  Try Again
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleContactAdmin}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                <Contact className="h-3 w-3 mr-1" />
                Contact Admin
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={`border-orange-200 bg-orange-50 ${cardPadding}`}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <div className="rounded-full bg-orange-100 p-3 w-fit">
            <AlertTriangle className={`${iconSize} text-orange-600`} />
          </div>
        </div>
        <CardTitle className="text-orange-800">{defaultTitle}</CardTitle>
        <CardDescription className="text-orange-700">
          {defaultDescription}
        </CardDescription>
      </CardHeader>

      {showContactAdmin && (
        <CardContent className="pt-0">
          <div className="flex justify-center gap-3">
            {onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleContactAdmin}
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <Contact className="h-4 w-4 mr-2" />
              Contact Administrator
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Hook to handle API errors and convert them to permission denied displays
 */
export function usePermissionError() {
  const handleApiError = (error: any): { isPermissionError: boolean; errorComponent?: JSX.Element } => {
    if (error?.status === 403 || error?.type === 'PERMISSION_DENIED') {
      return {
        isPermissionError: true,
        errorComponent: (
          <PermissionDeniedError
            title="Access Denied"
            description={error.message || error.originalError}
          />
        )
      }
    }

    if (error?.status === 401 || error?.type === 'AUTHENTICATION_REQUIRED') {
      return {
        isPermissionError: true,
        errorComponent: (
          <PermissionDeniedError
            title="Authentication Required"
            description="Please log in to access this feature."
            showContactAdmin={false}
          />
        )
      }
    }

    return { isPermissionError: false }
  }

  return { handleApiError }
}

export default PermissionDeniedError