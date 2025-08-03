'use client'

import { useAuth } from '@/components/auth-provider'
import { LoginForm } from '@/components/login-form'
import { AdminDashboard } from '@/components/admin-dashboard'
import { RefereeDashboard } from '@/components/referee-dashboard'

export default function Home() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-background">
      {user?.role === 'admin' ? <AdminDashboard /> : <RefereeDashboard />}
    </div>
  )
}
