'use client'

import { useAuth } from '@/components/auth-provider'
import { LoginForm } from '@/components/login-form'
import { UnifiedDashboard } from '@/components/unified-dashboard'

export default function Home() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  // All authenticated users get the unified dashboard
  // The dashboard will adapt based on their roles and permissions
  return (
    <div className="min-h-screen bg-background">
      <UnifiedDashboard />
    </div>
  )
}