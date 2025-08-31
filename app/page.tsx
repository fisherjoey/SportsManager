'use client'

import { useAuth } from '@/components/auth-provider'
import { LoginForm } from '@/components/login-form'
import { AdminDashboard } from '@/components/admin-dashboard'
import { RefereeDashboard } from '@/components/referee-dashboard'
import { AssignorDashboard } from '@/components/assignor-dashboard'
import { LeagueManagerDashboard } from '@/components/league-manager-dashboard'
import { FinanceManagerDashboard } from '@/components/finance-manager-dashboard'
import { ContentManagerDashboard } from '@/components/content-manager-dashboard'
import { ViewerDashboard } from '@/components/viewer-dashboard'

export default function Home() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  // Route to appropriate dashboard based on user role
  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />
      case 'assignor':
        return <AssignorDashboard />
      case 'referee':
        return <RefereeDashboard />
      case 'league_manager':
        return <LeagueManagerDashboard />
      case 'finance_manager':
        return <FinanceManagerDashboard />
      case 'content_manager':
        return <ContentManagerDashboard />
      case 'viewer':
        return <ViewerDashboard />
      default:
        // Default to viewer dashboard for unknown roles
        return <ViewerDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {renderDashboard()}
    </div>
  )
}
