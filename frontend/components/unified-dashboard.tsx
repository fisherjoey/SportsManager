'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, DollarSign, Home, ShieldOff } from 'lucide-react'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { usePageAccess } from '@/hooks/usePageAccess'
import { usePermissions } from '@/hooks/usePermissions'

// Import all possible dashboard components
import { DashboardOverview } from '@/components/dashboard-overview'
import { RefereeDashboardOverview } from '@/components/referee-dashboard-overview'
import { LeagueCreation } from '@/components/league-creation'
import { TournamentGenerator } from '@/components/tournament-generator'
import { GamesManagementPage } from '@/components/games-management-page'
import { GameAssignmentBoard } from '@/components/game-assignment-board'
import { TeamsLocationsPage } from '@/components/teams-locations/teams-locations-page'
import { RefereeManagement } from '@/components/referee-management'
import { CalendarView } from '@/components/calendar-view'
import { ProfileSettings } from '@/components/profile-settings'
import OrganizationSettings from '@/components/organization-settings'
import { CommunicationsManagement } from '@/components/communications-management'
import { AIAssignmentsEnterprise } from '@/components/ai-assignments-enterprise'
import { ResourceCentreNew } from '@/components/resource-centre-new'
import { ResourceCentre } from '@/components/resource-centre'
import { MyAssignments } from '@/components/my-assignments'
import { AvailableGames } from '@/components/available-games'
import { AvailabilityCalendar } from '@/components/availability-calendar'
import { ExpenseFormIntegrated } from '@/components/expense-form-integrated'
import { ExpenseListEnhanced } from '@/components/expense-list-enhanced'
import { UnifiedAccessControlDashboard } from '@/components/admin/access-control/UnifiedAccessControlDashboard'

export function UnifiedDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { hasPageAccess, loading: pageAccessLoading } = usePageAccess()
  const { hasAnyPermission } = usePermissions()
  
  // Initialize activeView from URL on first render
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const viewFromUrl = urlParams.get('view') || 'dashboard'
      console.log('[UnifiedDashboard] Initial view from URL:', viewFromUrl)
      return viewFromUrl
    }
    return 'dashboard'
  }
  
  const [activeView, setActiveView] = useState(getInitialView)
  const [gameManagementDateFilter, setGameManagementDateFilter] = useState<string>()

  // Debug logging
  useEffect(() => {
    console.log('[UnifiedDashboard] Component mounted with activeView:', activeView)
    console.log('[UnifiedDashboard] User roles:', user?.roles)
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const viewFromUrl = urlParams.get('view') || 'dashboard'
      setActiveView(viewFromUrl)
    }

    // Listen for navigation events
    const handleRouteChange = () => {
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const viewFromUrl = urlParams.get('view') || 'dashboard'
        if (viewFromUrl !== activeView) {
          setActiveView(viewFromUrl)
        }
      }, 10)
    }

    // Listen to click events on links
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
    
    // Handle special cases like date filters
    if (options?.dateFilter) {
      setGameManagementDateFilter(options.dateFilter)
    }

    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set('view', view)
    
    // Add additional parameters if needed
    if (options?.dateFilter) {
      url.searchParams.set('dateFilter', options.dateFilter)
    }
    
    window.history.pushState(null, '', url.toString())
  }

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard'
      case 'leagues': return 'League Management'
      case 'tournaments': return 'Tournament Generator'
      case 'games': return 'Games'
      case 'assigning': return 'Game Assignment'
      case 'ai-assignments': return 'AI Assignments'
      case 'locations': return 'Teams & Locations'
      case 'referees': return 'Referees'
      case 'calendar': return 'Calendar'
      case 'communications': return 'Communications'
      case 'resources': return 'Resource Centre'
      case 'assignments': return 'My Assignments'
      case 'available': return 'Available Games'
      case 'availability': return 'My Availability'
      case 'expenses': return 'My Expenses'
      case 'expense-create': return 'Submit Expense'
      case 'profile': return 'Profile Settings'
      case 'organization-settings': return 'Organization Settings'
      case 'admin-access-control': return 'Access Control'
      default: return 'Dashboard'
    }
  }

  // Check if user has permission to access the current view
  const checkViewPermission = (view: string): boolean => {
    // During loading, return true to prevent flashing
    if (pageAccessLoading) return true
    
    // Use database-driven access check
    return hasPageAccess(view)
  }

  // Determine which dashboard overview to show based on user's roles
  const getDashboardComponent = () => {
    const userRoles = user?.roles || []
    
    // Check for specific dashboard permissions or roles
    if (userRoles.some(role => 
      ['Super Admin', 'Admin', 'admin'].includes(typeof role === 'string' ? role : role.name)
    )) {
      return <DashboardOverview />
    }
    
    // Check if user has referee-specific roles
    if (userRoles.some(role => 
      ['Referee', 'referee', 'Senior Referee'].includes(typeof role === 'string' ? role : role.name)
    )) {
      return <RefereeDashboardOverview />
    }
    
    // Default to general dashboard
    return <DashboardOverview />
  }

  const renderContent = () => {
    console.log('[UnifiedDashboard] Rendering content for activeView:', activeView)
    
    // Check permissions for current view
    if (!checkViewPermission(activeView)) {
      console.log('[UnifiedDashboard] No permission for view:', activeView)
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
      // Core pages
      case 'dashboard':
        return getDashboardComponent()
      
      // Sports Management
      case 'leagues':
        return <LeagueCreation />
      case 'tournaments':
        return <TournamentGenerator />
      case 'games':
        return <GamesManagementPage initialDateFilter={gameManagementDateFilter} />
      case 'assigning':
        return <GameAssignmentBoard />
      case 'ai-assignments':
        return <AIAssignmentsEnterprise />
      case 'locations':
        return <TeamsLocationsPage />
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
      case 'resources':
        // Check if user prefers new or old resource centre
        return <ResourceCentreNew />
      
      // Referee-specific pages
      case 'assignments':
        return <MyAssignments />
      case 'available':
        return <AvailableGames />
      case 'availability':
        if (user?.referee_id) {
          return <AvailabilityCalendar refereeId={user.referee_id} canEdit={true} />
        }
        return <div className="p-4 text-center text-muted-foreground">
          Please complete your referee profile to manage availability.
        </div>
      
      // Expense Management
      case 'expenses':
        return <ExpenseListEnhanced onCreateExpense={() => handleViewChange('expense-create')} />
      case 'expense-create':
        return <ExpenseFormIntegrated onExpenseCreated={() => handleViewChange('expenses')} />
      
      // Settings & Admin
      case 'profile':
        return <ProfileSettings />
      case 'organization-settings':
        return <OrganizationSettings />
      case 'admin-access-control':
        return <UnifiedAccessControlDashboard />
      
      // Financial Management - Coming Soon
      case 'financial-dashboard':
      case 'financial-receipts':
      case 'financial-budgets':
      case 'financial-expenses':
      case 'financial-expense-create':
      case 'financial-expense-approvals':
      case 'financial-reports':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center space-y-4 max-w-md">
              <DollarSign className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-bold text-muted-foreground">Financial Module Coming Soon</h2>
              <p className="text-muted-foreground">
                The financial management features are scheduled for release next month. 
                Check back soon for budget tracking, expense management, and financial reporting.
              </p>
              <div className="pt-4">
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
          </div>
        )
      
      // Default fallback
      default:
        return getDashboardComponent()
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} setActiveView={handleViewChange} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}