'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, DollarSign, Home } from 'lucide-react'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { DashboardOverview } from '@/components/dashboard-overview'
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
import { FinancialDashboard } from '@/components/financial-dashboard'
import { ReceiptUpload } from '@/components/receipt-upload'
import { BudgetTracker } from '@/components/budget-tracker'
import { ExpenseListEnhanced } from '@/components/expense-list-enhanced'
import { ExpenseApprovalDashboard } from '@/components/expense-approval-dashboard'
import { ExpenseFormIntegrated } from '@/components/expense-form-integrated'
import { OrganizationalDashboard } from '@/components/organizational-dashboard'
import { EmployeeManagement } from '@/components/employee-management'
import { AssetTracking } from '@/components/asset-tracking'
import { DocumentRepository } from '@/components/document-repository'
import { ComplianceTracking } from '@/components/compliance-tracking'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { WorkflowManagement } from '@/components/workflow-management'
import { SecurityAudit } from '@/components/security-audit'
import { SystemSettings } from '@/components/system-settings'
import { ResourceCentreNew } from '@/components/resource-centre-new'
import { RoleManagementDashboard } from '@/components/admin/rbac/RoleManagementDashboard'
import { PermissionManagementDashboard } from '@/components/admin/rbac/PermissionManagementDashboard'
import { PermissionConfigurationDashboard } from '@/components/admin/rbac/PermissionConfigurationDashboard'
import { UserManagementDashboard } from '@/components/admin/users/UserManagementDashboard'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissions } from '@/hooks/usePermissions'
import { getPagePermissions, isViewAllowedForRole, getRoleConfig } from '@/lib/rbac-config'
import { useAuth } from '@/components/auth-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldOff } from 'lucide-react'


export function AdminDashboard() {
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
  }, []) // Remove activeView dependency to prevent infinite loop

  // Handle browser back/forward navigation AND URL changes
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const viewFromUrl = urlParams.get('view') || 'dashboard'
      setActiveView(viewFromUrl)
    }

    // Listen for navigation events (Next.js Link clicks)
    const handleRouteChange = () => {
      // Small delay to let the URL update first
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
    // Sports Management
    case 'dashboard':
      return 'Dashboard'
    case 'leagues':
      return 'League Management'
    case 'tournaments':
      return 'Tournament Generator'
    case 'games':
      return 'Games'
    case 'assigning':
      return 'Game Assignment'
    case 'ai-assignments':
      return 'AI Assignments'
    case 'locations':
      return 'Teams & Locations'
    case 'referees':
      return 'Referees'
    case 'calendar':
      return 'Calendar'
    case 'communications':
      return 'Communications'
    case 'resources':
      return 'Resource Centre'
      
      // Financial Management
    case 'financial-dashboard':
      return 'Financial Dashboard'
    case 'financial-receipts':
      return 'Receipt Processing'
    case 'financial-budgets':
      return 'Budget Management'
    case 'financial-expenses':
      return 'Expense Management'
    case 'financial-expense-create':
      return 'Create Expense'
    case 'financial-expense-approvals':
      return 'Expense Approvals'
    case 'financial-reports':
      return 'Financial Reports'
      
      // Organization Management
    case 'organization-dashboard':
      return 'Organizational Dashboard'
    case 'organization-employees':
      return 'Employee Management'
    case 'organization-assets':
      return 'Asset Tracking'
    case 'organization-documents':
      return 'Document Repository'
    case 'organization-compliance':
      return 'Compliance Tracking'
      
      // Analytics
    case 'analytics-dashboard':
      return 'Analytics Dashboard'
      
      // Administration
    case 'admin-users':
      return 'User Management'
    case 'admin-workflows':
      return 'Workflow Management'
    case 'admin-security':
      return 'Security & Audit'
    case 'admin-settings':
      return 'System Settings'
    case 'admin-roles':
      return 'Role Management'
    case 'admin-permissions':
      return 'Permission Matrix'
    case 'admin-permission-config':
      return 'Permission Configuration'
      
      // Account
    case 'profile':
      return 'Profile'
    case 'organization-settings':
      return 'Organization Settings'
      
    default:
      // Handle resources/[slug] pattern
      if (activeView.startsWith('resources/')) {
        return 'Resource'
      }
      return 'Dashboard'
    }
  }

  // Check if user has permission to access the current view
  const checkViewPermission = (view: string): boolean => {
    // Admin always has access
    if (user?.role === 'admin') return true
    
    // Check view-specific permissions
    const viewKey = `dashboard-view:${view}`
    const requiredPermissions = getPagePermissions(viewKey)
    
    // If no permissions required, allow access
    if (requiredPermissions.length === 0) return true
    
    // Check if user has any of the required permissions
    return hasAnyPermission(requiredPermissions)
  }

  // Check if view is allowed for user's role
  const isViewAllowed = (view: string): boolean => {
    if (!user?.role) return false
    
    // Admin always has access
    if (user.role === 'admin') return true
    
    // Check role configuration
    const roleConfig = getRoleConfig(user.role)
    if (!roleConfig) return false
    
    // Check if view is in allowed views
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
    // Sports Management
    case 'dashboard':
      return <DashboardOverview />
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
      return <ResourceCentreNew />
      
      // Financial Management - COMING SOON (Next Month)
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
      
      // Organization Management
    case 'organization-dashboard':
      return <OrganizationalDashboard />
    case 'organization-employees':
      return <EmployeeManagement />
    case 'organization-assets':
      return <AssetTracking />
    case 'organization-documents':
      return <DocumentRepository />
    case 'organization-compliance':
      return <ComplianceTracking />
      
      // Analytics
    case 'analytics-dashboard':
      return <AnalyticsDashboard />
      
      // Administration
    case 'admin-users':
      return <UserManagementDashboard />
    case 'admin-workflows':
      return <WorkflowManagement />
    case 'admin-security':
      return <SecurityAudit />
    case 'admin-settings':
      return <SystemSettings />
    case 'admin-roles':
      return <RoleManagementDashboard />
    case 'admin-permissions':
      return <PermissionManagementDashboard />
    case 'admin-permission-config':
      return <PermissionConfigurationDashboard />
      
      // Account
    case 'profile':
      return <ProfileSettings />
    case 'organization-settings':
      return <OrganizationSettings />
      
    default:
      // Handle resources/[slug] pattern
      if (activeView.startsWith('resources/')) {
        const slug = activeView.replace('resources/', '')
        return <ResourceRenderer slug={slug} onNavigate={handleViewChange} />
      }
      return <DashboardOverview />
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
              SyncedSport Dashboard
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
