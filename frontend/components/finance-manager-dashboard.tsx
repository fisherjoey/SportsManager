'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, Home, DollarSign } from 'lucide-react'
import { ShieldOff } from 'lucide-react'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { ProfileSettings } from '@/components/profile-settings'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { getPagePermissions, isViewAllowedForRole, getRoleConfig } from '@/lib/rbac-config'
import { useAuth } from '@/components/auth-provider'

export function FinanceManagerDashboard() {
  const { user } = useAuth()
  const { hasAnyPermission } = usePermissions()
  const [activeView, setActiveView] = useState('dashboard')

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
  const handleViewChange = (view: string) => {
    setActiveView(view)

    const url = new URL(window.location.href)
    url.searchParams.set('view', view)
    
    window.history.pushState(null, '', url.toString())
  }

  const getPageTitle = () => {
    switch (activeView) {
    case 'dashboard':
      return 'Dashboard'
    case 'financial-dashboard':
      return 'Financial Overview'
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
    case 'profile':
      return 'Profile'
    default:
      return 'Dashboard'
    }
  }

  // Check if user has permission to access the current view
  const checkViewPermission = (view: string): boolean => {
    // Finance Manager role-specific permissions
    if (user?.role === 'finance_manager') {
      const allowedViews = ['dashboard', 'financial-dashboard', 'financial-receipts', 'financial-budgets', 
        'financial-expenses', 'financial-expense-create', 'financial-expense-approvals', 
        'financial-reports', 'profile']
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
    case 'profile':
      return <ProfileSettings />
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="text-center space-y-4 max-w-md">
            <DollarSign className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold text-muted-foreground">Financial Module Coming Soon</h2>
            <p className="text-muted-foreground">
              The financial management features are scheduled for release next month.
            </p>
          </div>
        </div>
      )
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
              Finance Manager Dashboard
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