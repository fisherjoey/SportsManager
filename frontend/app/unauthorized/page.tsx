/**
 * @fileoverview Unauthorized Access Page
 *
 * Page displayed when a user attempts to access a resource they don't have permission for.
 * Provides clear messaging and navigation options.
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Home, ArrowLeft, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    // If user is not authenticated, redirect to login instead
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleGoBack = () => {
    // Try to go back in history
    if (window.history.length > 1) {
      router.back()
    } else {
      // If no history, go to home
      router.push('/')
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleContactSupport = () => {
    // You can customize this to your support email or contact page
    window.location.href = 'mailto:support@sportsmanager.com?subject=Access Request'
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-3xl font-bold">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-muted bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What happened?</strong>
              <br />
              The page you're trying to access requires specific permissions that your account doesn't currently have.
            </p>
          </div>

          {user && (
            <div className="rounded-lg border border-muted bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Logged in as:</strong>
                <br />
                {user.name} ({user.email})
              </p>
            </div>
          )}

          <div className="rounded-lg border border-muted bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What can you do?</strong>
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Go back to the previous page</li>
              <li>Return to the home page</li>
              <li>Contact support if you believe this is an error</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>

          <Button
            onClick={handleGoHome}
            variant="default"
            className="w-full sm:flex-1"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Home
          </Button>

          <Button
            onClick={handleContactSupport}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
