'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { ShieldOff } from 'lucide-react'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { ContentManagerDashboardOverview } from '@/components/content-manager-dashboard-overview'
import { ResourceCentreNew } from '@/components/resource-centre-new'
import { CommunicationsManagement } from '@/components/communications-management'
import { DocumentRepository } from '@/components/document-repository'
import { ProfileSettings } from '@/components/profile-settings'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { getPagePermissions, isViewAllowedForRole, getRoleConfig } from '@/lib/rbac-config'
import { useAuth } from '@/components/auth-provider'

export function ContentManagerDashboard() {
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
    case 'resources':
      return 'Resource Centre'
    case 'communications':
      return 'Communications'
    case 'organization-documents':
      return 'Document Repository'
    case 'profile':
      return 'Profile'
    default:
      if (activeView.startsWith('resources/')) {
        return 'Resource'
      }
      return 'Dashboard'
    }
  }

  // Check if user has permission to access the current view
  const checkViewPermission = (view: string): boolean => {
    // Content Manager role-specific permissions
    if (user?.role === 'content_manager') {
      const allowedViews = ['dashboard', 'resources', 'communications', 'organization-documents', 'profile']
      return allowedViews.includes(view) || view.startsWith('resources/')
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
      return <ContentManagerDashboardOverview />
    case 'resources':
      return <ResourceCentreNew />
    case 'communications':
      return <CommunicationsManagement />
    case 'organization-documents':
      return <DocumentRepository />
    case 'profile':
      return <ProfileSettings />
    default:
      // Handle resources/[slug] pattern
      if (activeView.startsWith('resources/')) {
        // For now, redirect to main resources page
        return <ResourceCentreNew />
      }
      return <ContentManagerDashboardOverview />
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
              Content Manager Dashboard
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