'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * LoginForm - Redirects to Clerk sign-in
 *
 * This component is kept for backward compatibility.
 * It immediately redirects to Clerk's sign-in page at /login.
 */
export function LoginForm() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Clerk sign-in page
    router.push('/login')
  }, [router])

  // Show a loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-5">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 relative animate-in zoom-in-50 duration-500">
              <Image
                src="/sportsync-icon.svg"
                alt="SyncedSport Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">SyncedSport</CardTitle>
          <CardDescription>Redirecting to sign in...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  )
}
