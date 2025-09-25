'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, DollarSign, Home, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'

import { SyncedSportHeader } from '@/components/cloudflare-header'
import { SyncedSportSidebar } from '@/components/cloudflare-sidebar-new'
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

// Import organization components
import { OrganizationDashboard } from '@/components/organization-dashboard'
import { OrganizationEmployees } from '@/components/organization-employees'
import { OrganizationAssets } from '@/components/organization-assets'
import { OrganizationDocuments } from '@/components/organization-documents'
import { OrganizationCompliance } from '@/components/organization-compliance'

// Import analytics components
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

// Import admin components
import { AdminWorkflows } from '@/components/admin-workflows'
import { AdminSecurity } from '@/components/admin-security'
import { AdminSettings } from '@/components/admin-settings'

export function SyncedSportUnifiedDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { hasPageAccess, loading: pageAccessLoading } = usePageAccess()
  const { hasAnyPermission } = usePermissions()

  // Initialize activeView from URL on first render
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const viewFromUrl = urlParams.get('view') || 'dashboard'
      console.log('[SyncedSportUnifiedDashboard] Initial view from URL:', viewFromUrl)
      return viewFromUrl
    }
    return 'dashboard'
  }

  const [activeView, setActiveView] = useState(getInitialView)
  const [gameManagementDateFilter, setGameManagementDateFilter] = useState<string>()

  // Debug logging
  useEffect(() => {
    console.log('[SyncedSportUnifiedDashboard] Component mounted with activeView:', activeView)
    console.log('[SyncedSportUnifiedDashboard] User roles:', user?.roles)
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
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('view', activeView)
    window.history.pushState({}, '', url.toString())
  }, [activeView])

  // Show loading state while checking permissions
  if (pageAccessLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#d1d5db]">Loading...</div>
      </div>
    )
  }

  // Check if user has access to the current view
  if (!hasPageAccess(activeView)) {
    console.log('[SyncedSportUnifiedDashboard] Access denied to view:', activeView)
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
        <SyncedSportHeader />
        <div className="flex flex-1">
          <SyncedSportSidebar activeView={activeView} setActiveView={setActiveView} />
          <main className="flex-1 ml-14 mt-14 p-8 bg-[#0f0f0f]">
            <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg p-8 text-center">
              <ShieldOff className="h-12 w-12 text-[#ef4444] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
              <p className="text-[#9ca3af] mb-6">
                You don't have permission to access this page.
              </p>
              <button
                onClick={() => setActiveView('dashboard')}
                className="px-4 py-2 bg-[#0051c3] text-white rounded-md hover:bg-[#0040a0] transition-colors duration-150"
              >
                Return to Dashboard
              </button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Render content based on activeView
  const renderContent = () => {
    switch (activeView) {
      // Core Dashboard Views
      case 'dashboard':
        if (user?.roles?.includes('referee')) {
          return <RefereeDashboardOverview />
        }
        return <DashboardOverview />

      // Sports Management
      case 'games':
        return <GamesManagementPage selectedDate={gameManagementDateFilter} />
      case 'calendar':
        return <CalendarView onDateSelect={(date) => {
          setGameManagementDateFilter(date)
          setActiveView('games')
        }} />
      case 'leagues':
        return <LeagueCreation />
      case 'tournaments':
        return <TournamentGenerator />
      case 'locations':
        return <TeamsLocationsPage />
      case 'communications':
        return <CommunicationsManagement />
      case 'resources':
        if (user?.roles?.includes('referee')) {
          return <ResourceCentreNew />
        }
        return <ResourceCentre />

      // Assignor Management
      case 'assigning':
        return <GameAssignmentBoard />
      case 'ai-assignments':
        return <AIAssignmentsEnterprise />
      case 'referees':
        return <RefereeManagement />

      // Referee Views
      case 'assignments':
        return <MyAssignments />
      case 'available':
        return <AvailableGames />
      case 'availability':
        return <AvailabilityCalendar />
      case 'expenses':
        return user?.roles?.includes('referee') ?
          <ExpenseFormIntegrated /> :
          <ExpenseListEnhanced />

      // Organization Management
      case 'organization-dashboard':
        return <OrganizationDashboard />
      case 'organization-employees':
        return <OrganizationEmployees />
      case 'organization-assets':
        return <OrganizationAssets />
      case 'organization-documents':
        return <OrganizationDocuments />
      case 'organization-compliance':
        return <OrganizationCompliance />

      // Analytics
      case 'analytics-dashboard':
        return <AnalyticsDashboard />

      // Administration
      case 'admin-access-control':
        return <UnifiedAccessControlDashboard />
      case 'admin-workflows':
        return <AdminWorkflows />
      case 'admin-security':
        return <AdminSecurity />
      case 'admin-settings':
        return <AdminSettings />

      // Account
      case 'profile':
        return <ProfileSettings />
      case 'organization-settings':
        return <OrganizationSettings />

      default:
        return (
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg p-8">
            <h2 className="text-xl font-semibold text-white mb-4">Page Not Found</h2>
            <p className="text-[#9ca3af]">
              The page "{activeView}" is not available or is under development.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <SyncedSportHeader />

      {/* Main layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <SyncedSportSidebar activeView={activeView} setActiveView={setActiveView} />

        {/* Main content */}
        <main
          className={cn(
            "flex-1 mt-14 transition-all duration-200",
            "ml-14", // Default collapsed width
            "data-[sidebar-expanded=true]:ml-60" // Expanded width
          )}
        >
          <div className="w-full">
            {/* Page content */}
            <div className="animate-in fade-in duration-200">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}