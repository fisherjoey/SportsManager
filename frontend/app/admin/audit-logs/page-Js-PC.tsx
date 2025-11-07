'use client'

import React, { useState, useEffect } from 'react'
import { PageAccessGuard } from '@/components/page-access-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { AuditLogViewer } from '@/components/resources/AuditLogViewer'
import { AuditLogStatsComponent } from '@/components/resources/AuditLogStats'
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogStats,
  AuditLogPreset,
  ExportOptions
} from '@/lib/types/audit'
import {
  Shield,
  Activity,
  Download,
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  Settings
} from 'lucide-react'

interface AuditLogsPageState {
  entries: AuditLogEntry[]
  stats: AuditLogStats | null
  totalEntries: number
  currentPage: number
  pageSize: number
  filters: AuditLogFilters
  availableUsers: Array<{ id: string; name: string; email: string }>
  availableResourceTypes: string[]
  availableCategories: string[]
  savedPresets: AuditLogPreset[]
  isLoading: boolean
  error: string | null
  isAdmin: boolean
}

function AuditLogsPageContent() {
  const [state, setState] = useState<AuditLogsPageState>({
    entries: [],
    stats: null,
    totalEntries: 0,
    currentPage: 1,
    pageSize: 50,
    filters: {},
    availableUsers: [],
    availableResourceTypes: [],
    availableCategories: [],
    savedPresets: [],
    isLoading: true,
    error: null,
    isAdmin: false
  })

  const { toast } = useToast()

  // Check admin permissions
  useEffect(() => {
    checkAdminPermissions()
  }, [])

  // Load initial data
  useEffect(() => {
    if (state.isAdmin) {
      loadAuditLogs()
      loadMetadata()
    }
  }, [state.isAdmin, state.currentPage, state.pageSize, state.filters])

  const checkAdminPermissions = async () => {
    try {
      // In a real app, this would check user permissions
      // For now, we'll simulate admin check
      const response = await fetch('/api/auth/check-admin', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.status === 403) {
        setState(prev => ({ 
          ...prev, 
          error: 'Access denied. Admin permissions required.',
          isLoading: false 
        }))
        return
      }

      if (response.ok) {
        const { isAdmin } = await response.json()
        setState(prev => ({ ...prev, isAdmin, isLoading: !isAdmin ? false : prev.isLoading }))
      } else {
        throw new Error('Failed to check permissions')
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to verify admin permissions. Please try again.',
        isLoading: false 
      }))
    }
  }

  const loadAuditLogs = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const params = new URLSearchParams({
        page: state.currentPage.toString(),
        limit: state.pageSize.toString()
      })

      // Add filters to query params
      if (state.filters.search) params.append('search', state.filters.search)
      if (state.filters.success !== undefined) params.append('success', state.filters.success.toString())
      if (state.filters.dateRange?.from) params.append('date_from', state.filters.dateRange.from.toISOString())
      if (state.filters.dateRange?.to) params.append('date_to', state.filters.dateRange.to.toISOString())
      if (state.filters.users) state.filters.users.forEach(user => params.append('users', user))
      if (state.filters.actions) state.filters.actions.forEach(action => params.append('actions', action))
      if (state.filters.resourceTypes) state.filters.resourceTypes.forEach(type => params.append('resource_types', type))
      if (state.filters.categories) state.filters.categories.forEach(category => params.append('categories', category))
      if (state.filters.ipAddress) params.append('ip_address', state.filters.ipAddress)

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        entries: data.data?.entries || [],
        totalEntries: data.data?.total || 0,
        stats: data.data?.stats || null,
        isLoading: false
      }))
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load audit logs',
        isLoading: false
      }))
      
      // For demo purposes, load mock data
      loadMockData()
    }
  }

  const loadMetadata = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs/metadata', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          availableUsers: data.users || [],
          availableResourceTypes: data.resource_types || [],
          availableCategories: data.categories || [],
          savedPresets: data.presets || []
        }))
      }
    } catch (error) {
      console.warn('Failed to load metadata:', error)
      // Load mock metadata for demo
      setState(prev => ({
        ...prev,
        availableUsers: [
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
          { id: '3', name: 'Admin User', email: 'admin@example.com' }
        ],
        availableResourceTypes: ['document', 'link', 'video', 'user', 'role', 'category'],
        availableCategories: ['System', 'Security', 'Content', 'User Management']
      }))
    }
  }

  const loadMockData = () => {
    // Generate mock audit log data for demo
    const mockEntries: AuditLogEntry[] = [
      {
        id: '1',
        user_id: '1',
        user: { id: '1', name: 'John Doe', email: 'john@example.com' },
        action: 'create',
        resource_type: 'document',
        resource_id: '123',
        resource_name: 'Safety Guidelines',
        category: 'Content',
        description: 'Created new safety guidelines document',
        ip_address: '192.168.1.100',
        success: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: '2',
        user_id: '2',
        user: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        action: 'permission_grant',
        resource_type: 'category',
        resource_id: '456',
        resource_name: 'HR Policies',
        category: 'Security',
        description: 'Granted access to HR Policies category',
        ip_address: '192.168.1.101',
        success: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      },
      {
        id: '3',
        user_id: '3',
        user: { id: '3', name: 'Admin User', email: 'admin@example.com' },
        action: 'login',
        resource_type: 'system',
        resource_id: 'auth',
        description: 'Admin user logged in',
        ip_address: '192.168.1.102',
        success: false,
        error_message: 'Invalid credentials',
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString()
      }
    ]

    const mockStats: AuditLogStats = {
      total_entries: 156,
      success_rate: 0.94,
      error_rate: 0.06,
      actions_by_type: {
        create: 45,
        read: 32,
        update: 28,
        delete: 12,
        login: 25,
        logout: 14,
        permission_grant: 8,
        permission_revoke: 3,
        role_assign: 5,
        role_remove: 2,
        password_change: 4,
        password_reset: 2,
        export: 7,
        import: 3,
        backup: 2,
        restore: 1,
        configuration_change: 6,
        system_event: 12
      },
      top_users: [
        { user_id: '1', user_name: 'John Doe', user_email: 'john@example.com', count: 45 },
        { user_id: '2', user_name: 'Jane Smith', user_email: 'jane@example.com', count: 32 },
        { user_id: '3', user_name: 'Admin User', user_email: 'admin@example.com', count: 28 }
      ],
      recent_activity: [
        { hour: '14:00', count: 12 },
        { hour: '15:00', count: 18 },
        { hour: '16:00', count: 8 },
        { hour: '17:00', count: 15 }
      ],
      resource_types: {
        document: 67,
        link: 23,
        video: 12,
        user: 34,
        role: 8,
        category: 12
      },
      categories: {
        'Content': 45,
        'Security': 23,
        'System': 67,
        'User Management': 21
      }
    }

    setState(prev => ({
      ...prev,
      entries: mockEntries,
      totalEntries: mockEntries.length,
      stats: mockStats,
      isLoading: false,
      error: null
    }))
  }

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }

  const handlePageSizeChange = (size: number) => {
    setState(prev => ({ ...prev, pageSize: size, currentPage: 1 }))
  }

  const handleFiltersChange = (filters: AuditLogFilters) => {
    setState(prev => ({ ...prev, filters, currentPage: 1 }))
  }

  const handleRefresh = () => {
    loadAuditLogs()
  }

  const handleExport = async (options: ExportOptions): Promise<void> => {
    try {
      const response = await fetch('/api/admin/audit-logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(options)
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${options.format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    }
  }

  const handleUserClick = (userId: string) => {
    // In a real app, this would navigate to user profile
    console.log('Navigate to user:', userId)
    toast({
      title: 'User Profile',
      description: `Would navigate to user profile: ${userId}`
    })
  }

  const handleResourceClick = (resourceType: string, resourceId: string) => {
    // In a real app, this would navigate to the resource
    console.log('Navigate to resource:', resourceType, resourceId)
    toast({
      title: 'Resource',
      description: `Would navigate to ${resourceType}: ${resourceId}`
    })
  }

  const handleSavePreset = async (preset: Omit<AuditLogPreset, 'id'>) => {
    try {
      const response = await fetch('/api/admin/audit-logs/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(preset)
      })

      if (!response.ok) {
        throw new Error('Failed to save preset')
      }

      const newPreset = await response.json()
      setState(prev => ({
        ...prev,
        savedPresets: [...prev.savedPresets, newPreset]
      }))

      toast({
        title: 'Preset saved',
        description: `Filter preset "${preset.name}" has been saved.`
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save filter preset. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Loading state
  if (state.isLoading && !state.isAdmin) {
    return (
      <div className="container max-w-7xl mx-auto py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Checking permissions...
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Access denied
  if (state.error && !state.isAdmin) {
    return (
      <div className="container max-w-7xl mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to view audit logs
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {state.error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Monitor and review system activity and security events
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Admin Only
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <AuditLogViewer
        entries={state.entries}
        stats={state.stats}
        totalEntries={state.totalEntries}
        currentPage={state.currentPage}
        pageSize={state.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        filters={state.filters}
        onFiltersChange={handleFiltersChange}
        availableUsers={state.availableUsers}
        availableResourceTypes={state.availableResourceTypes}
        availableCategories={state.availableCategories}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onUserClick={handleUserClick}
        onResourceClick={handleResourceClick}
        onSavePreset={handleSavePreset}
        savedPresets={state.savedPresets}
        isLoading={state.isLoading}
        error={state.error}
        realTimeUpdates={true}
        showStats={true}
      />

      {/* Additional Stats Panel */}
      {state.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detailed Analytics
            </CardTitle>
            <CardDescription>
              Comprehensive audit log statistics and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogStatsComponent
              stats={state.stats}
              isLoading={state.isLoading}
              showDetailed={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function AuditLogsPage() {
  return (
    <PageAccessGuard pageId="admin_audit_logs">
      <AuditLogsPageContent />
    </PageAccessGuard>
  )
}