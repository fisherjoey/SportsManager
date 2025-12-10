'use client'

import { useState, useEffect } from 'react'
import { 
  Layout, 
  Shield, 
  FileText, 
  Users, 
  Calendar,
  DollarSign,
  Building2,
  BarChart3,
  Settings,
  User,
  Save,
  RefreshCw,
  Info,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Search,
  Plus,
  Scan,
  Database
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api'

interface PageInfo {
  id?: number
  page_path: string
  page_name: string
  page_category: string
  page_description?: string
  suggested_permissions?: string[]
  is_protected?: boolean
  auto_detected?: boolean
  needs_configuration?: boolean
}

interface DynamicPageCategory {
  name: string
  icon: React.ComponentType<any>
  pages: PageInfo[]
}

interface RolePageAccess {
  roleId: string
  roleName: string
  allowedPages: string[]
  deniedPages: string[]
}

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'Sports Management': Layout,
    'Administration': Shield,
    'Financial': DollarSign,
    'Organization': Building2,
    'Analytics': BarChart3,
    'Account': User,
    'General': FileText
  }
  
  return iconMap[category] || FileText
}

export function DynamicRolePageAccessManager() {
  const { toast } = useToast()
  
  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [pageCategories, setPageCategories] = useState<Record<string, DynamicPageCategory>>({})
  const [pageAccess, setPageAccess] = useState<Record<string, boolean>>({})
  const [originalPageAccess, setOriginalPageAccess] = useState<Record<string, boolean>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [registryStats, setRegistryStats] = useState<any>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      fetchRolePageAccess(selectedRole)
    }
  }, [selectedRole])

  useEffect(() => {
    // Check if there are changes
    const changed = JSON.stringify(pageAccess) !== JSON.stringify(originalPageAccess)
    setHasChanges(changed)
  }, [pageAccess, originalPageAccess])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [rolesRes, pagesRes, statsRes] = await Promise.all([
        apiClient.getRoles(),
        loadDynamicPages(),
        loadRegistryStats()
      ])

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data.roles)
        if (rolesRes.data.roles.length > 0 && !selectedRole) {
          setSelectedRole(rolesRes.data.roles[0].id)
        }
      }

      if (pagesRes) {
        setPageCategories(pagesRes)
      }

      if (statsRes) {
        setRegistryStats(statsRes)
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load page data'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDynamicPages = async (): Promise<Record<string, DynamicPageCategory>> => {
    try {
      // First try to load from the registry
      const registryResponse = await apiClient.get('/api/admin/rbac-registry/pages')
      
      if (registryResponse.success && registryResponse.data) {
        // Group pages by category
        const categories: Record<string, DynamicPageCategory> = {}
        
        registryResponse.data.forEach((page: PageInfo) => {
          const category = page.page_category || 'General'
          
          if (!categories[category]) {
            categories[category] = {
              name: category,
              icon: getCategoryIcon(category),
              pages: []
            }
          }
          
          categories[category].pages.push(page)
        })
        
        return categories
      }
    } catch (error) {
      console.warn('Registry not available, falling back to static pages:', error)
    }

    // Fallback to static configuration
    return await loadStaticPages()
  }

  const loadStaticPages = async (): Promise<Record<string, DynamicPageCategory>> => {
    // Static fallback based on existing PAGE_CATEGORIES
    return {
      'Sports Management': {
        name: 'Sports Management',
        icon: Layout,
        pages: [
          { page_path: 'dashboard', page_name: 'Dashboard', page_category: 'Sports Management', page_description: 'Main dashboard overview' },
          { page_path: 'leagues', page_name: 'League Management', page_category: 'Sports Management', page_description: 'Create and manage leagues' },
          { page_path: 'tournaments', page_name: 'Tournament Generator', page_category: 'Sports Management', page_description: 'Generate tournament brackets' },
          { page_path: 'games', page_name: 'Games', page_category: 'Sports Management', page_description: 'View and manage games' },
          { page_path: 'assigning', page_name: 'Game Assignment', page_category: 'Sports Management', page_description: 'Assign referees to games' },
          { page_path: 'ai-assignments', page_name: 'AI Assignments', page_category: 'Sports Management', page_description: 'Automated referee assignments' },
          { page_path: 'locations', page_name: 'Teams & Locations', page_category: 'Sports Management', page_description: 'Manage teams and venues' },
          { page_path: 'referees', page_name: 'Referees', page_category: 'Sports Management', page_description: 'Manage referee profiles' },
          { page_path: 'calendar', page_name: 'Calendar', page_category: 'Sports Management', page_description: 'View game calendar' },
          { page_path: 'communications', page_name: 'Communications', page_category: 'Sports Management', page_description: 'Send messages and notifications' },
          { page_path: 'resources', page_name: 'Resource Centre', page_category: 'Sports Management', page_description: 'Educational resources and documents' }
        ]
      },
      'Administration': {
        name: 'Administration',
        icon: Shield,
        pages: [
          { page_path: 'admin-users', page_name: 'User Management', page_category: 'Administration', page_description: 'Manage system users' },
          { page_path: 'admin-roles', page_name: 'Role Management', page_category: 'Administration', page_description: 'Configure roles' },
          { page_path: 'admin-permissions', page_name: 'Permission Management', page_category: 'Administration', page_description: 'Manage permissions' },
          { page_path: 'admin-permission-config', page_name: 'Permission Configuration', page_category: 'Administration', page_description: 'Configure permission settings' },
          { page_path: 'admin-page-access', page_name: 'Page Access Control', page_category: 'Administration', page_description: 'Configure page access permissions' },
          { page_path: 'admin-workflows', page_name: 'Workflow Management', page_category: 'Administration', page_description: 'Configure workflows' },
          { page_path: 'admin-security', page_name: 'Security & Audit', page_category: 'Administration', page_description: 'Security settings and audit logs' },
          { page_path: 'admin-settings', page_name: 'System Settings', page_category: 'Administration', page_description: 'System configuration' }
        ]
      }
      // Other static categories would go here...
    }
  }

  const loadRegistryStats = async () => {
    try {
      const response = await apiClient.get('/api/admin/rbac-registry/stats')
      return response.success ? response.data : null
    } catch (error) {
      console.warn('Registry stats not available:', error)
      return null
    }
  }

  const performRegistryScan = async () => {
    try {
      setScanning(true)
      toast({
        title: 'Scanning started',
        description: 'Scanning codebase for new pages...'
      })

      const response = await apiClient.get('/api/admin/rbac-registry/scan')
      
      if (response.success) {
        toast({
          title: 'Scan completed',
          description: `Found ${response.data.newItems} new items`
        })
        
        // Reload pages after scan
        const newCategories = await loadDynamicPages()
        setPageCategories(newCategories)
        
        // Reload registry stats
        const newStats = await loadRegistryStats()
        setRegistryStats(newStats)
      }
    } catch (error) {
      console.error('Scan failed:', error)
      toast({
        variant: 'destructive',
        title: 'Scan failed',
        description: 'Failed to scan for new pages'
      })
    } finally {
      setScanning(false)
    }
  }

  const fetchRolePageAccess = async (roleId: string) => {
    try {
      setLoading(true)
      
      // Get role page access from the database
      const response = await apiClient.getRolePageAccess(roleId)
      if (response.success && response.data) {
        const { pageAccess: dbPageAccess } = response.data
        
        // Convert database format to component format
        const access: Record<string, boolean> = {}
        
        // Initialize all pages to false
        Object.values(pageCategories).forEach(category => {
          category.pages.forEach(page => {
            access[page.page_path] = false
          })
        })
        
        // Set access based on database records
        dbPageAccess.forEach((item: any) => {
          access[item.page_path] = item.can_access
        })
        
        setPageAccess(access)
        setOriginalPageAccess(access)
      }
    } catch (error) {
      console.error('Failed to fetch role page access:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load page access settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageAccessChange = (page: string, allowed: boolean) => {
    setPageAccess(prev => ({
      ...prev,
      [page]: allowed
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Prepare the page access data in the format the API expects
      const pageAccessData: any[] = []
      
      Object.entries(pageCategories).forEach(([categoryKey, category]) => {
        category.pages.forEach(page => {
          pageAccessData.push({
            page_path: page.page_path,
            page_name: page.page_name,
            page_category: categoryKey,
            page_description: page.page_description || '',
            can_access: pageAccess[page.page_path] || false,
            conditions: null
          })
        })
      })
      
      // Save to database
      const response = await apiClient.updateRolePageAccess(selectedRole, pageAccessData)
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Page access settings saved successfully'
        })
        
        setOriginalPageAccess(pageAccess)
        setHasChanges(false)
        
        // Clear cache to ensure changes take effect immediately
        await apiClient.clearAccessCache()
      } else {
        throw new Error(response.message || 'Failed to save page access')
      }
    } catch (error) {
      console.error('Failed to save page access:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save page access settings'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPageAccess(originalPageAccess)
    setHasChanges(false)
  }

  const handleToggleAll = (category: string, allowed: boolean) => {
    const categoryPages = pageCategories[category]?.pages || []
    const updates: Record<string, boolean> = {}
    
    categoryPages.forEach(page => {
      updates[page.page_path] = allowed
    })
    
    setPageAccess(prev => ({
      ...prev,
      ...updates
    }))
  }

  const getSelectedRole = () => {
    return roles.find(r => r.id === selectedRole)
  }

  const getCategoryAccessStatus = (category: string) => {
    const categoryPages = pageCategories[category]?.pages || []
    const accessStates = categoryPages.map(page => pageAccess[page.page_path])
    
    if (accessStates.every(state => state === true)) return 'all'
    if (accessStates.every(state => state === false)) return 'none'
    return 'partial'
  }

  const getFilteredPages = (pages: PageInfo[]) => {
    if (!searchTerm) return pages
    
    return pages.filter(page =>
      page.page_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.page_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (page.page_description && page.page_description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  if (loading && roles.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const role = getSelectedRole()
  const totalPages = Object.values(pageCategories).reduce((sum, cat) => sum + cat.pages.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dynamic Role Page Access Management
          </CardTitle>
          <CardDescription>
            Configure page access with automatically discovered pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label htmlFor="role-select" className="min-w-fit">Select Role:</Label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                    {role.is_system && ' (System)'}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              {registryStats && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {totalPages} pages
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={performRegistryScan}
                disabled={scanning}
                className="gap-2"
              >
                {scanning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
                {scanning ? 'Scanning...' : 'Scan for New Pages'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {role && (
            <>
              {/* Role Info */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{role.name}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {role.is_system && (
                      <Badge variant="secondary">System Role</Badge>
                    )}
                    <Badge variant="outline">
                      {role.user_count || 0} Users
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Registry Info */}
              {registryStats && registryStats.pages?.unconfigured > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    There are {registryStats.pages.unconfigured} unconfigured pages that may need attention.
                    Use the RBAC Registry Dashboard to configure them.
                  </AlertDescription>
                </Alert>
              )}

              {/* Page Access Configuration */}
              <Tabs defaultValue={Object.keys(pageCategories)[0]} className="w-full">
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 h-auto">
                  {Object.entries(pageCategories).map(([categoryKey, category]) => {
                    const Icon = category.icon
                    const status = getCategoryAccessStatus(categoryKey)
                    const filteredPages = getFilteredPages(category.pages)
                    
                    if (searchTerm && filteredPages.length === 0) return null
                    
                    return (
                      <TabsTrigger 
                        key={categoryKey} 
                        value={categoryKey}
                        className="flex flex-col gap-1 py-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs">{category.name.split(' ')[0]}</span>
                        {status === 'all' && <Badge variant="default" className="h-1 w-1 p-0 rounded-full" />}
                        {status === 'partial' && <Badge variant="secondary" className="h-1 w-1 p-0 rounded-full" />}
                        {filteredPages.length !== category.pages.length && (
                          <Badge variant="outline" className="text-xs px-1">
                            {filteredPages.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {Object.entries(pageCategories).map(([categoryKey, category]) => {
                  const Icon = category.icon
                  const categoryStatus = getCategoryAccessStatus(categoryKey)
                  const filteredPages = getFilteredPages(category.pages)
                  
                  if (searchTerm && filteredPages.length === 0) return null
                  
                  return (
                    <TabsContent key={categoryKey} value={categoryKey} className="space-y-4">
                      {/* Category Header */}
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold">{category.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {filteredPages.filter(p => pageAccess[p.page_path]).length} of {filteredPages.length} pages accessible
                              {searchTerm && filteredPages.length !== category.pages.length && (
                                <span className="ml-1">(filtered from {category.pages.length})</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAll(categoryKey, true)}
                            disabled={categoryStatus === 'all'}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Allow All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAll(categoryKey, false)}
                            disabled={categoryStatus === 'none'}
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Deny All
                          </Button>
                        </div>
                      </div>

                      {/* Pages Grid/List */}
                      <div className={viewMode === 'grid' ? 
                        'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 
                        'space-y-2'
                      }>
                        {filteredPages.map(page => (
                          <div 
                            key={page.page_path}
                            className={`rounded-lg border p-4 ${
                              pageAccess[page.page_path] ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`${categoryKey}-${page.page_path}`}
                                    checked={pageAccess[page.page_path] || false}
                                    onCheckedChange={(checked) => 
                                      handlePageAccessChange(page.page_path, checked as boolean)
                                    }
                                    disabled={role.is_system && (role.name === 'Super Administrator' || role.name === 'Administrator')}
                                  />
                                  <Label 
                                    htmlFor={`${categoryKey}-${page.page_path}`}
                                    className="font-medium cursor-pointer"
                                  >
                                    {page.page_name}
                                  </Label>
                                  {page.auto_detected && (
                                    <Badge variant="secondary" className="text-xs">Auto</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 ml-6">
                                  {page.page_description}
                                </p>
                                {page.suggested_permissions && page.suggested_permissions.length > 0 && (
                                  <div className="flex gap-1 mt-2 ml-6">
                                    {page.suggested_permissions.map(perm => (
                                      <Badge key={perm} variant="outline" className="text-xs">
                                        {perm}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="ml-2">
                                {pageAccess[page.page_path] ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>

              {/* System Role Warning */}
              {role.is_system && (role.name === 'Super Administrator' || role.name === 'Administrator') && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    System administrator roles have full access to all pages and cannot be restricted.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              {hasChanges && (
                <div className="flex items-center justify-between p-4 rounded-lg border border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <p className="text-sm font-medium">You have unsaved changes</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={saving}
                    >
                      Reset Changes
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}