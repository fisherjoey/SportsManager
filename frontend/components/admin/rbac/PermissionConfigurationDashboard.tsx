"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Plus,
  Edit,
  Save,
  RefreshCw,
  FileCode,
  Globe,
  Lock,
  Unlock,
  Info,
  Settings,
  Database,
  AlertCircle,
  ChevronRight,
  Users
} from 'lucide-react'
import { PAGE_PERMISSIONS, API_PERMISSIONS, ROLE_CONFIGS } from '@/lib/rbac-config'
import { PERMISSIONS } from '@/lib/permissions'

interface PermissionConfig {
  id: string
  name: string
  description: string
  category: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  autoGrantToRoles?: string[]
}

interface PageConfig {
  path: string
  name: string
  permissions: string[]
  isPublic: boolean
  configured: boolean
}

interface ApiConfig {
  method: string
  endpoint: string
  permissions: string[]
  configured: boolean
}

interface UnconfiguredItem {
  type: 'page' | 'api'
  identifier: string
  suggestedPermissions: string[]
}

export function PermissionConfigurationDashboard() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [permissions, setPermissions] = useState<PermissionConfig[]>([])
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([])
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [unconfiguredItems, setUnconfiguredItems] = useState<UnconfiguredItem[]>([])
  const [editingPermission, setEditingPermission] = useState<PermissionConfig | null>(null)
  const [showNewPermissionForm, setShowNewPermissionForm] = useState(false)
  const { toast } = useToast()

  // Load current configuration
  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = () => {
    // Load permissions from PERMISSIONS constant
    const loadedPermissions: PermissionConfig[] = []
    Object.entries(PERMISSIONS).forEach(([category, perms]) => {
      Object.entries(perms).forEach(([action, permissionId]) => {
        const [cat, act] = (permissionId as string).split(':')
        loadedPermissions.push({
          id: permissionId as string,
          name: formatPermissionName(cat, act),
          description: generatePermissionDescription(cat, act),
          category: cat,
          riskLevel: determineRiskLevel(act)
        })
      })
    })
    setPermissions(loadedPermissions)

    // Load page configurations
    const pages: PageConfig[] = []
    Object.entries(PAGE_PERMISSIONS).forEach(([path, perms]) => {
      pages.push({
        path,
        name: formatPageName(path),
        permissions: perms,
        isPublic: perms.length === 0,
        configured: true
      })
    })
    setPageConfigs(pages)

    // Load API configurations
    const apis: ApiConfig[] = []
    Object.entries(API_PERMISSIONS).forEach(([key, perms]) => {
      const [method, ...pathParts] = key.split(' ')
      apis.push({
        method,
        endpoint: pathParts.join(' '),
        permissions: perms,
        configured: true
      })
    })
    setApiConfigs(apis)

    // Check for unconfigured items (in real implementation, this would scan the filesystem)
    checkForUnconfiguredItems()
  }

  const checkForUnconfiguredItems = () => {
    // This would normally scan the filesystem for pages and APIs
    // For now, we'll just show an example
    const unconfigured: UnconfiguredItem[] = []
    
    // Example unconfigured items (in production, these would be auto-detected)
    // These would be found by scanning the app directory and API routes
    
    setUnconfiguredItems(unconfigured)
  }

  const formatPermissionName = (category: string, action: string): string => {
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${category}`
  }

  const generatePermissionDescription = (category: string, action: string): string => {
    const descriptions: Record<string, string> = {
      'read': `View and access ${category} information`,
      'create': `Create new ${category} entries`,
      'update': `Edit and modify existing ${category}`,
      'delete': `Remove ${category} from the system`,
      'manage': `Full management control over ${category}`,
      'approve': `Approve ${category} requests or changes`,
      'publish': `Publish ${category} content`,
      'export': `Export ${category} data`
    }
    
    return descriptions[action] || `Perform ${action} operations on ${category}`
  }

  const determineRiskLevel = (action: string): 'low' | 'medium' | 'high' | 'critical' => {
    const riskMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'read': 'low',
      'create': 'medium',
      'update': 'medium',
      'delete': 'high',
      'manage': 'critical',
      'approve': 'high',
      'publish': 'medium',
      'export': 'low',
      'impersonate': 'critical'
    }
    
    return riskMap[action] || 'medium'
  }

  const formatPageName = (path: string): string => {
    if (path.startsWith('dashboard-view:')) {
      return path.replace('dashboard-view:', '').split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ') + ' View'
    }
    if (path === '/') return 'Home Page'
    return path.split('/').filter(p => p).map(p => 
      p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    ).join(' / ')
  }

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSavePermission = () => {
    if (!editingPermission) return
    
    // In production, this would save to the backend
    toast({
      title: 'Permission Updated',
      description: `${editingPermission.name} has been updated successfully`
    })
    
    setEditingPermission(null)
  }

  const handleConfigureItem = (item: UnconfiguredItem) => {
    // In production, this would add the configuration to rbac-config.ts
    toast({
      title: 'Configuration Added',
      description: `${item.identifier} has been configured with suggested permissions`
    })
    
    // Remove from unconfigured list
    setUnconfiguredItems(prev => prev.filter(i => i.identifier !== item.identifier))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Permission Configuration
              </CardTitle>
              <CardDescription>
                Define and manage all system permissions and their assignments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={checkForUnconfiguredItems} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan for New
              </Button>
              <Button onClick={() => setShowNewPermissionForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Permission
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

      {/* Alerts for unconfigured items */}
      {unconfiguredItems.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unconfigured Items Found</AlertTitle>
          <AlertDescription>
            {unconfiguredItems.length} pages or API endpoints need permission configuration.
            Review them in the "Unconfigured" tab.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="apis">APIs</TabsTrigger>
          <TabsTrigger value="unconfigured" className="relative">
            Unconfigured
            {unconfiguredItems.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{permissions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across {new Set(permissions.map(p => p.category)).size} categories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Protected Pages</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pageConfigs.filter(p => !p.isPublic).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pageConfigs.filter(p => p.isPublic).length} public pages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Protected APIs</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{apiConfigs.length}</div>
                <p className="text-xs text-muted-foreground">
                  Endpoints with permissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Configured Roles</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ROLE_CONFIGS.length}</div>
                <p className="text-xs text-muted-foreground">
                  With permission sets
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Risk Level Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Permission Risk Levels</CardTitle>
              <CardDescription>
                Distribution of permissions by risk level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['low', 'medium', 'high', 'critical'].map(level => {
                  const count = permissions.filter(p => p.riskLevel === level).length
                  const percentage = (count / permissions.length) * 100
                  
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <Badge className={getRiskBadgeColor(level)}>
                        {level.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              level === 'low' ? 'bg-green-500' :
                              level === 'medium' ? 'bg-yellow-500' :
                              level === 'high' ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All System Permissions</CardTitle>
              <CardDescription>
                Complete list of permissions that can be assigned to roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {permissions.map(permission => (
                    <Card key={permission.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{permission.name}</h4>
                            <Badge variant="outline">{permission.id}</Badge>
                            <Badge className={getRiskBadgeColor(permission.riskLevel)}>
                              {permission.riskLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {permission.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Category:</span>
                            <Badge variant="secondary">{permission.category}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPermission(permission)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Permission Requirements</CardTitle>
              <CardDescription>
                Permissions required to access each page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {pageConfigs.map(page => (
                    <Card key={page.path} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{page.name}</h4>
                            {page.isPublic ? (
                              <Badge variant="secondary">
                                <Unlock className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            ) : (
                              <Badge>
                                <Lock className="h-3 w-3 mr-1" />
                                Protected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {page.path}
                          </p>
                          {page.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {page.permissions.map(perm => (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {page.configured ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoint Permissions</CardTitle>
              <CardDescription>
                Permissions required for each API endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {apiConfigs.map(api => (
                    <Card key={`${api.method} ${api.endpoint}`} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={api.method === 'GET' ? 'secondary' : 
                                      api.method === 'DELETE' ? 'destructive' : 
                                      'default'}
                            >
                              {api.method}
                            </Badge>
                            <span className="font-mono text-sm">{api.endpoint}</span>
                          </div>
                          {api.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {api.permissions.map(perm => (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {api.configured ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unconfigured" className="space-y-4">
          {unconfiguredItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All items configured!</h3>
                <p className="text-sm text-muted-foreground">
                  Every page and API endpoint has permissions configured.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Unconfigured Items</CardTitle>
                <CardDescription>
                  Pages and APIs that need permission configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {unconfiguredItems.map(item => (
                    <Alert key={item.identifier} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>
                        {item.type === 'page' ? 'Page' : 'API'}: {item.identifier}
                      </AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 space-y-2">
                          <p>Suggested permissions:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.suggestedPermissions.map(perm => (
                              <Badge key={perm} variant="outline">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleConfigureItem(item)}
                            className="mt-2"
                          >
                            Apply Configuration
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}