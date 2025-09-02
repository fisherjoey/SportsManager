'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiClient } from '@/lib/api'
import { 
  Search,
  RefreshCw,
  FileText,
  Globe,
  Code,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Play,
  Settings,
  Eye,
  EyeOff,
  Clock,
  Zap,
  Database,
  FileCode,
  Layout,
  Activity
} from 'lucide-react'

interface UnconfiguredItem {
  id: number
  page_path?: string
  page_name?: string
  page_category?: string
  method?: string
  endpoint_path?: string
  function_name?: string
  module_path?: string
  category?: string
  suggested_permissions: string[]
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  auto_detected: boolean
  created_at: string
}

interface RegistryStats {
  pages: { total: number; unconfigured: number; auto_detected: number }
  endpoints: { total: number; unconfigured: number; auto_detected: number }
  functions: { total: number; unconfigured: number; auto_detected: number }
  lastScan: string | null
}

interface ScanHistory {
  id: number
  scan_started_at: string
  scan_completed_at: string | null
  duration_ms: number | null
  pages_found: number
  endpoints_found: number
  functions_found: number
  new_items_registered: number
  scan_type: 'automated' | 'manual' | 'startup'
  status: 'running' | 'completed' | 'failed'
  error_message?: string
}

const getRiskBadgeVariant = (risk: string) => {
  switch (risk) {
    case 'critical': return 'destructive'
    case 'high': return 'destructive'
    case 'medium': return 'secondary'
    case 'low': return 'outline'
    default: return 'outline'
  }
}

const getRiskIcon = (risk: string) => {
  switch (risk) {
    case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
    case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />
    case 'medium': return <Shield className="h-4 w-4 text-yellow-600" />
    case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />
    default: return <Shield className="h-4 w-4" />
  }
}

export function RBACRegistryDashboard() {
  const { toast } = useToast()
  
  // State
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const [stats, setStats] = useState<RegistryStats | null>(null)
  const [unconfigured, setUnconfigured] = useState<{
    pages: UnconfiguredItem[]
    endpoints: UnconfiguredItem[]
    functions: UnconfiguredItem[]
  }>({ pages: [], endpoints: [], functions: [] })
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([])
  const [selectedItems, setSelectedItems] = useState<{
    pages: Set<number>
    endpoints: Set<number>
    functions: Set<number>
  }>({ pages: new Set(), endpoints: new Set(), functions: new Set() })
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsRes, unconfiguredRes, historyRes] = await Promise.all([
        apiClient.get('/api/admin/rbac-registry/stats'),
        apiClient.get('/api/admin/rbac-registry/unconfigured'),
        apiClient.get('/api/admin/rbac-registry/scan-history?limit=5')
      ])

      if (statsRes.success) setStats(statsRes.data)
      if (unconfiguredRes.success) setUnconfigured(unconfiguredRes.data)
      if (historyRes.success) setScanHistory(historyRes.data.history)
    } catch (error) {
      console.error('Failed to load registry data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load registry data'
      })
    } finally {
      setLoading(false)
    }
  }

  const performScan = async () => {
    try {
      setScanning(true)
      toast({
        title: 'Scanning started',
        description: 'Scanning codebase for new resources...'
      })

      const response = await apiClient.get('/api/admin/rbac-registry/scan')
      
      if (response.success) {
        toast({
          title: 'Scan completed',
          description: `Found ${response.data.newItems} new items requiring configuration`
        })
        await loadData() // Reload data
      } else {
        throw new Error(response.message || 'Scan failed')
      }
    } catch (error) {
      console.error('Scan failed:', error)
      toast({
        variant: 'destructive',
        title: 'Scan failed',
        description: error instanceof Error ? error.message : 'Failed to perform scan'
      })
    } finally {
      setScanning(false)
    }
  }

  const configureSelected = async (type: 'pages' | 'endpoints' | 'functions') => {
    const selected = selectedItems[type]
    if (selected.size === 0) return

    try {
      setConfiguring(true)
      const items = unconfigured[type].filter(item => selected.has(item.id))
      
      const response = await apiClient.post('/api/admin/rbac-registry/configure', {
        type: type.slice(0, -1), // Remove 's' to match backend expectation
        items
      })

      if (response.success) {
        toast({
          title: 'Configuration saved',
          description: `Configured ${items.length} ${type}`
        })
        
        // Clear selections and reload
        setSelectedItems(prev => ({ ...prev, [type]: new Set() }))
        await loadData()
      } else {
        throw new Error(response.message || 'Configuration failed')
      }
    } catch (error) {
      console.error('Configuration failed:', error)
      toast({
        variant: 'destructive',
        title: 'Configuration failed',
        description: error instanceof Error ? error.message : 'Failed to configure items'
      })
    } finally {
      setConfiguring(false)
    }
  }

  const autoConfigureAll = async (type: 'pages' | 'endpoints' | 'functions') => {
    try {
      setConfiguring(true)
      
      const response = await apiClient.post('/api/admin/rbac-registry/auto-configure', {
        type: type.slice(0, -1), // Remove 's'
        applyAll: true
      })

      if (response.success) {
        toast({
          title: 'Auto-configuration completed',
          description: response.message
        })
        await loadData()
      } else {
        throw new Error(response.message || 'Auto-configuration failed')
      }
    } catch (error) {
      console.error('Auto-configuration failed:', error)
      toast({
        variant: 'destructive',
        title: 'Auto-configuration failed',
        description: error instanceof Error ? error.message : 'Failed to auto-configure'
      })
    } finally {
      setConfiguring(false)
    }
  }

  const exportConfiguration = async () => {
    try {
      const response = await apiClient.post('/api/admin/rbac-registry/export-config')
      
      if (response.success) {
        // Download configuration as file
        const blob = new Blob([response.data.configContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rbac-config-update-${Date.now()}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: 'Configuration exported',
          description: 'Configuration file downloaded successfully'
        })
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Failed to export configuration'
      })
    }
  }

  const toggleSelection = (type: 'pages' | 'endpoints' | 'functions', id: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev[type])
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return { ...prev, [type]: newSet }
    })
  }

  const selectAll = (type: 'pages' | 'endpoints' | 'functions') => {
    const allIds = new Set(unconfigured[type].map(item => item.id))
    setSelectedItems(prev => ({ ...prev, [type]: allIds }))
  }

  const clearSelection = (type: 'pages' | 'endpoints' | 'functions') => {
    setSelectedItems(prev => ({ ...prev, [type]: new Set() }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const totalUnconfigured = (stats?.pages.unconfigured || 0) + 
                           (stats?.endpoints.unconfigured || 0) + 
                           (stats?.functions.unconfigured || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            RBAC Registry Dashboard
          </CardTitle>
          <CardDescription>
            Automated discovery and configuration of RBAC resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={performScan}
                disabled={scanning}
                className="gap-2"
              >
                {scanning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {scanning ? 'Scanning...' : 'Scan Codebase'}
              </Button>
              
              <Button
                variant="outline"
                onClick={exportConfiguration}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Config
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {stats?.lastScan && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last scan: {new Date(stats.lastScan).toLocaleDateString()}
                </div>
              )}
              {totalUnconfigured > 0 && (
                <Badge variant="secondary">
                  {totalUnconfigured} items need configuration
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <Layout className="h-4 w-4" />
            Pages ({unconfigured.pages.length})
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="gap-2">
            <Globe className="h-4 w-4" />
            Endpoints ({unconfigured.endpoints.length})
          </TabsTrigger>
          <TabsTrigger value="functions" className="gap-2">
            <Code className="h-4 w-4" />
            Functions ({unconfigured.functions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pages</CardTitle>
                  <Layout className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pages.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pages.unconfigured} need configuration
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Endpoints</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.endpoints.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.endpoints.unconfigured} need configuration
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Functions</CardTitle>
                  <Code className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.functions.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.functions.unconfigured} need configuration
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {totalUnconfigured > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have {totalUnconfigured} unconfigured items that need attention. 
                These resources were auto-discovered but haven't been assigned permissions yet.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Unconfigured Pages ({unconfigured.pages.length})
                  </CardTitle>
                  <CardDescription>
                    Pages discovered in the app directory that need permission configuration
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedItems.pages.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearSelection('pages')}
                      >
                        Clear ({selectedItems.pages.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => configureSelected('pages')}
                        disabled={configuring}
                      >
                        {configuring ? 'Configuring...' : 'Configure Selected'}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll('pages')}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => autoConfigureAll('pages')}
                    disabled={configuring}
                    className="gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Auto-Configure All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {unconfigured.pages.map(page => (
                    <div key={page.id} className="flex items-center space-x-2 p-3 border rounded">
                      <Checkbox
                        checked={selectedItems.pages.has(page.id)}
                        onCheckedChange={() => toggleSelection('pages', page.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">
                            {page.page_path}
                          </code>
                          <Badge variant="outline">{page.page_category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {page.page_name}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {page.suggested_permissions.map(perm => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(page.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {unconfigured.pages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>All pages are configured!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Unconfigured Endpoints ({unconfigured.endpoints.length})
                  </CardTitle>
                  <CardDescription>
                    API endpoints discovered in route files that need permission configuration
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedItems.endpoints.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearSelection('endpoints')}
                      >
                        Clear ({selectedItems.endpoints.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => configureSelected('endpoints')}
                        disabled={configuring}
                      >
                        {configuring ? 'Configuring...' : 'Configure Selected'}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll('endpoints')}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => autoConfigureAll('endpoints')}
                    disabled={configuring}
                    className="gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Auto-Configure All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {unconfigured.endpoints.map(endpoint => (
                    <div key={endpoint.id} className="flex items-center space-x-2 p-3 border rounded">
                      <Checkbox
                        checked={selectedItems.endpoints.has(endpoint.id)}
                        onCheckedChange={() => toggleSelection('endpoints', endpoint.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{endpoint.method}</Badge>
                          <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">
                            {endpoint.endpoint_path}
                          </code>
                          <Badge variant={getRiskBadgeVariant(endpoint.risk_level || 'medium')}>
                            {getRiskIcon(endpoint.risk_level || 'medium')}
                            {endpoint.risk_level}
                          </Badge>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {endpoint.suggested_permissions.map(perm => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(endpoint.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {unconfigured.endpoints.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>All endpoints are configured!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Functions Tab */}
        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Unconfigured Functions ({unconfigured.functions.length})
                  </CardTitle>
                  <CardDescription>
                    Functions that may require permission checks
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedItems.functions.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearSelection('functions')}
                      >
                        Clear ({selectedItems.functions.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => configureSelected('functions')}
                        disabled={configuring}
                      >
                        {configuring ? 'Configuring...' : 'Configure Selected'}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll('functions')}
                  >
                    Select All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {unconfigured.functions.map(func => (
                    <div key={func.id} className="flex items-center space-x-2 p-3 border rounded">
                      <Checkbox
                        checked={selectedItems.functions.has(func.id)}
                        onCheckedChange={() => toggleSelection('functions', func.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">
                            {func.function_name}
                          </code>
                          <Badge variant="outline">{func.category}</Badge>
                          <Badge variant={getRiskBadgeVariant(func.risk_level || 'medium')}>
                            {getRiskIcon(func.risk_level || 'medium')}
                            {func.risk_level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {func.module_path}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {func.suggested_permissions.map(perm => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(func.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {unconfigured.functions.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>All functions are reviewed!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Scan History
              </CardTitle>
              <CardDescription>
                Recent automated scans and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scanHistory.map(scan => (
                  <div key={scan.id} className="border rounded p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={scan.status === 'completed' ? 'default' : 
                                      scan.status === 'failed' ? 'destructive' : 'secondary'}>
                          {scan.status}
                        </Badge>
                        <Badge variant="outline">{scan.scan_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(scan.scan_started_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {scan.duration_ms && `${scan.duration_ms}ms`}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                      <div>
                        <span className="font-medium">Pages:</span> {scan.pages_found}
                      </div>
                      <div>
                        <span className="font-medium">Endpoints:</span> {scan.endpoints_found}
                      </div>
                      <div>
                        <span className="font-medium">Functions:</span> {scan.functions_found}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">New items registered:</span> {scan.new_items_registered}
                    </div>
                    {scan.error_message && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{scan.error_message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
                {scanHistory.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No scan history available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}