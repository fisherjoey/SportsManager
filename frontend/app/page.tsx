'use client'

import { useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { UnifiedDashboard } from '@/components/unified-dashboard'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to Clerk sign-in if not authenticated
  if (!isSignedIn) {
    redirect('/login')
  }

  // All authenticated users get the unified dashboard
  // The dashboard will adapt based on their roles and permissions
  return (
    <div className="min-h-screen bg-background">
      <UnifiedDashboard />
    </div>
  )
}