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
  EyeOff
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
import { apiClient } from '@/lib/api'

interface PageAccess {
  path: string
  name: string
  category: string
  icon: any
  description: string
  requiredPermissions: string[]
}

interface RolePageAccess {
  roleId: string
  roleName: string
  allowedPages: string[]
  deniedPages: string[]
}

const PAGE_CATEGORIES = {
  'Sports Management': {
    icon: Layout,
    pages: [
      { path: 'dashboard', name: 'Dashboard', description: 'Main dashboard overview' },
      { path: 'leagues', name: 'League Management', description: 'Create and manage leagues' },
      { path: 'tournaments', name: 'Tournament Generator', description: 'Generate tournament brackets' },
      { path: 'games', name: 'Games', description: 'View and manage games' },
      { path: 'assigning', name: 'Game Assignment', description: 'Assign referees to games' },
      { path: 'ai-assignments', name: 'AI Assignments', description: 'Automated referee assignments' },
      { path: 'locations', name: 'Teams & Locations', description: 'Manage teams and venues' },
      { path: 'referees', name: 'Referees', description: 'Manage referee profiles' },
      { path: 'calendar', name: 'Calendar', description: 'View game calendar' },
      { path: 'communications', name: 'Communications', description: 'Send messages and notifications' },
      { path: 'resources', name: 'Resource Centre', description: 'Educational resources and documents' }
    ]
  },
  'Financial': {
    icon: DollarSign,
    pages: [
      { path: 'financial-dashboard', name: 'Financial Dashboard', description: 'Financial overview' },
      { path: 'financial-receipts', name: 'Receipt Processing', description: 'Process expense receipts' },
      { path: 'financial-budgets', name: 'Budget Management', description: 'Manage budgets' },
      { path: 'financial-expenses', name: 'Expense Management', description: 'Track expenses' },
      { path: 'financial-expense-create', name: 'Create Expense', description: 'Submit new expenses' },
      { path: 'financial-expense-approvals', name: 'Expense Approvals', description: 'Approve pending expenses' },
      { path: 'financial-reports', name: 'Financial Reports', description: 'Generate financial reports' }
    ]
  },
  'Organization': {
    icon: Building2,
    pages: [
      { path: 'organization-dashboard', name: 'Organizational Dashboard', description: 'Organization overview' },
      { path: 'organization-employees', name: 'Employee Management', description: 'Manage employees' },
      { path: 'organization-assets', name: 'Asset Tracking', description: 'Track organizational assets' },
      { path: 'organization-documents', name: 'Document Repository', description: 'Manage documents' },
      { path: 'organization-compliance', name: 'Compliance Tracking', description: 'Track compliance requirements' }
    ]
  },
  'Analytics': {
    icon: BarChart3,
    pages: [
      { path: 'analytics-dashboard', name: 'Analytics Dashboard', description: 'View analytics and insights' }
    ]
  },
  'Administration': {
    icon: Shield,
    pages: [
      { path: 'admin-users', name: 'User Management', description: 'Manage system users' },
      { path: 'admin-roles', name: 'Role Management', description: 'Configure roles' },
      { path: 'admin-permissions', name: 'Permission Management', description: 'Manage permissions' },
      { path: 'admin-permission-config', name: 'Permission Configuration', description: 'Configure permission settings' },
      { path: 'admin-workflows', name: 'Workflow Management', description: 'Configure workflows' },
      { path: 'admin-security', name: 'Security & Audit', description: 'Security settings and audit logs' },
      { path: 'admin-settings', name: 'System Settings', description: 'System configuration' }
    ]
  },
  'Account': {
    icon: User,
    pages: [
      { path: 'profile', name: 'Profile', description: 'User profile settings' },
      { path: 'organization-settings', name: 'Organization Settings', description: 'Organization configuration' }
    ]
  }
}

export function RolePageAccessManager() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [pageAccess, setPageAccess] = useState<Record<string, boolean>>({})
  const [originalPageAccess, setOriginalPageAccess] = useState<Record<string, boolean>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchRoles()
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

  const fetchRoles = async () => {
    try {
      const response = await apiClient.getRoles()
      if (response.success && response.data) {
        setRoles(response.data.roles)
        if (response.data.roles.length > 0 && !selectedRole) {
          setSelectedRole(response.data.roles[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load roles'
      })
    } finally {
      setLoading(false)
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
        Object.values(PAGE_CATEGORIES).forEach(category => {
          category.pages.forEach(page => {
            access[page.path] = false
          })
        })
        
        // Set access based on database records
        dbPageAccess.forEach(item => {
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
      
      Object.entries(PAGE_CATEGORIES).forEach(([categoryKey, category]) => {
        category.pages.forEach(page => {
          pageAccessData.push({
            page_path: page.path,
            page_name: page.name,
            page_category: categoryKey, // Use the category key as the category name
            page_description: page.description || '',
            can_access: pageAccess[page.path] || false,
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
    const categoryPages = PAGE_CATEGORIES[category as keyof typeof PAGE_CATEGORIES].pages
    const updates: Record<string, boolean> = {}
    
    categoryPages.forEach(page => {
      updates[page.path] = allowed
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
    const categoryPages = PAGE_CATEGORIES[category as keyof typeof PAGE_CATEGORIES].pages
    const accessStates = categoryPages.map(page => pageAccess[page.path])
    
    if (accessStates.every(state => state === true)) return 'all'
    if (accessStates.every(state => state === false)) return 'none'
    return 'partial'
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Role Page Access Management
          </CardTitle>
          <CardDescription>
            Configure which pages and sections each role can access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Selector */}
          <div className="flex items-center gap-4">
            <Label htmlFor="role-select" className="min-w-fit">Select Role:</Label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                  {role.is_system && ' (System)'}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Button>
            </div>
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

              {/* Page Access Configuration */}
              <Tabs defaultValue="Sports Management" className="w-full">
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto">
                  {Object.entries(PAGE_CATEGORIES).map(([category, config]) => {
                    const Icon = config.icon
                    const status = getCategoryAccessStatus(category)
                    return (
                      <TabsTrigger 
                        key={category} 
                        value={category}
                        className="flex flex-col gap-1 py-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs">{category.split(' ')[0]}</span>
                        {status === 'all' && <Badge variant="default" className="h-1 w-1 p-0 rounded-full" />}
                        {status === 'partial' && <Badge variant="secondary" className="h-1 w-1 p-0 rounded-full" />}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {Object.entries(PAGE_CATEGORIES).map(([category, config]) => {
                  const Icon = config.icon
                  const categoryStatus = getCategoryAccessStatus(category)
                  
                  return (
                    <TabsContent key={category} value={category} className="space-y-4">
                      {/* Category Header */}
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold">{category}</h3>
                            <p className="text-sm text-muted-foreground">
                              {config.pages.filter(p => pageAccess[p.path]).length} of {config.pages.length} pages accessible
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAll(category, true)}
                            disabled={categoryStatus === 'all'}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Allow All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAll(category, false)}
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
                        {config.pages.map(page => (
                          <div 
                            key={page.path}
                            className={`rounded-lg border p-4 ${
                              pageAccess[page.path] ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`${category}-${page.path}`}
                                    checked={pageAccess[page.path] || false}
                                    onCheckedChange={(checked) => 
                                      handlePageAccessChange(page.path, checked as boolean)
                                    }
                                    disabled={role.is_system && (role.name === 'Super Administrator' || role.name === 'Administrator')}
                                  />
                                  <Label 
                                    htmlFor={`${category}-${page.path}`}
                                    className="font-medium cursor-pointer"
                                  >
                                    {page.name}
                                  </Label>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 ml-6">
                                  {page.description}
                                </p>
                              </div>
                              <div className="ml-2">
                                {pageAccess[page.path] ? (
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

              {/* Info Alert */}
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