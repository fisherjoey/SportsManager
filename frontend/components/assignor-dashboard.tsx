'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AssignorDashboardOverview } from '@/components/assignor-dashboard-overview'
import { GamesManagementPage } from '@/components/games-management-page'
import { GameAssignmentBoard } from '@/components/game-assignment-board'
import { RefereeManagement } from '@/components/referee-management'
import { CalendarView } from '@/components/calendar-view'
import { CommunicationsManagement } from '@/components/communications-management'
import { AIAssignmentsEnterprise } from '@/components/ai-assignments-enterprise'
import { ProfileSettings } from '@/components/profile-settings'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { getPagePermissions, isViewAllowedForRole, getRoleConfig } from '@/lib/rbac-config'
import { useAuth } from '@/components/auth-provider'
import { ShieldOff } from 'lucide-react'

export function AssignorDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { hasAnyPermission } = usePermissions()
  const [activeView, setActiveView] = useState('dashboard')
  const [gameManagementDateFilter, setGameManagementDateFilter] = useState<string>()

  // Initialize from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view') || 'dashboard'
    if (viewFromUrl !== activeView) {
      setActiveView(viewFromUrl)
    }
  }, [])

  // Handle browser back/forward navigation AND URL changes
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const viewFromUrl = urlParams.get('view') || 'dashboard'
      setActiveView(viewFromUrl)
    }

    const handleRouteChange = () => {
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const viewFromUrl = urlParams.get('view') || 'dashboard'
        if (viewFromUrl !== activeView) {
          setActiveView(viewFromUrl)
        }
      }, 10)
    }

    const handleLinkClick = (event: Event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')
      if (link && link.href.includes('view=')) {
        handleRouteChange()
      }
    }

    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleLinkClick)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleLinkClick)
    }
  }, [activeView])

  // Update URL when activeView changes
  const handleViewChange = (view: string, options?: { dateFilter?: string }) => {
    setActiveView(view)
    
    if (options?.dateFilter) {
      setGameManagementDateFilter(options.dateFilter)
    }

    const url = new URL(window.location.href)
    url.searchParams.set('view', view)
    
    if (options?.dateFilter) {
      url.searchParams.set('dateFilter', options.dateFilter)
    }
    
    window.history.pushState(null, '', url.toString())
  }

  const getPageTitle = () => {
    switch (activeView) {
    case 'dashboard':
      return 'Dashboard'
    case 'games':
      return 'Games'
    case 'assigning':
      return 'Game Assignment'
    case 'ai-assignments':
      return 'AI Assignments'
    case 'referees':
      return 'Referees'
    case 'calendar':
      return 'Calendar'
    case 'communications':
      return 'Communications'
    case 'profile':
      return 'Profile'
    default:
      return 'Dashboard'
    }
  }

  // Check if user has permission to access the current view
  const checkViewPermission = (view: string): boolean => {
    // Assignor role-specific permissions
    if (user?.role === 'assignor') {
      const allowedViews = ['dashboard', 'games', 'assigning', 'ai-assignments', 'referees', 'calendar', 'communications', 'profile']
      return allowedViews.includes(view)
    }
    
    const viewKey = `dashboard-view:${view}`
    const requiredPermissions = getPagePermissions(viewKey)
    
    if (requiredPermissions.length === 0) return true
    
    return hasAnyPermission(requiredPermissions)
  }

  const isViewAllowed = (view: string): boolean => {
    if (!user?.role) return false
    
    const roleConfig = getRoleConfig(user.role)
    if (!roleConfig) return false
    
    if (roleConfig.allowedViews.includes('*')) return true
    return roleConfig.allowedViews.includes(view)
  }

  const renderContent = () => {
    // Check permissions for current view
    if (!checkViewPermission(activeView) || !isViewAllowed(activeView)) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center space-y-4 max-w-md">
            <ShieldOff className="h-16 w-16 mx-auto text-destructive opacity-75" />
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this section.
            </p>
            <Button 
              variant="outline" 
              onClick={() => handleViewChange('dashboard')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>
        </div>
      )
    }

    switch (activeView) {
    case 'dashboard':
      return <AssignorDashboardOverview />
    case 'games':
      return <GamesManagementPage initialDateFilter={gameManagementDateFilter} />
    case 'assigning':
      return <GameAssignmentBoard />
    case 'ai-assignments':
      return <AIAssignmentsEnterprise />
    case 'referees':
      return <RefereeManagement />
    case 'calendar':
      return <CalendarView 
        onDateClick={(date: string) => {
          setGameManagementDateFilter(date)
          handleViewChange('games')
        }} 
      />
    case 'communications':
      return <CommunicationsManagement />
    case 'profile':
      return <ProfileSettings />
    default:
      return <AssignorDashboardOverview />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} setActiveView={handleViewChange} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              Assignor Dashboard
              {activeView !== 'dashboard' && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span>{getPageTitle()}</span>
                </>
              )}
            </h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">{renderContent()}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}