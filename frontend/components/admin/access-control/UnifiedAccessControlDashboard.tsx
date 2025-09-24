"use client"

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Shield, 
  Lock, 
  Layout, 
  Globe,
  Settings,
  Info,
  ChevronRight,
  ShieldCheck,
  UserCog,
  Key
} from 'lucide-react'

// Import existing components
import { UserManagementDashboard } from '../users/UserManagementDashboard'
import { RoleManagementDashboard } from '../rbac/RoleManagementDashboard'
import { PermissionManagementDashboard } from '../rbac/PermissionManagementDashboard'
import { RolePageAccessManager } from '../rbac/RolePageAccessManager'
import { PermissionConfigurationDashboard } from '../rbac/PermissionConfigurationDashboard'

interface TabInfo {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  badge?: string
}

export function UnifiedAccessControlDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  const [stats, setStats] = useState({
    userCount: 0,
    roleCount: 0,
    permissionCount: 0,
    activeSessionCount: 0
  })

  useEffect(() => {
    // Load stats when component mounts
    loadStats()
  }, [])

  const loadStats = async () => {
    // This would fetch actual stats from the backend
    // For now, using placeholder values
    setStats({
      userCount: 42,
      roleCount: 8,
      permissionCount: 156,
      activeSessionCount: 12
    })
  }

  const tabs: TabInfo[] = [
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="h-4 w-4" />,
      description: 'Manage user accounts and their role assignments'
    },
    {
      id: 'roles',
      label: 'Roles',
      icon: <Shield className="h-4 w-4" />,
      description: 'Create and manage roles with specific permissions'
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: <Key className="h-4 w-4" />,
      description: 'View and manage system permissions'
    },
    {
      id: 'page-access',
      label: 'Page Access',
      icon: <Layout className="h-4 w-4" />,
      description: 'Configure page-level access for different roles'
    },
    {
      id: 'api-access',
      label: 'API Access',
      icon: <Globe className="h-4 w-4" />,
      description: 'Manage API endpoint permissions and rate limits'
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: <Settings className="h-4 w-4" />,
      description: 'Advanced permission configuration and settings'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Access Control Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Centralized management for users, roles, permissions, and access control
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeSessionCount} active now
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.roleCount}</div>
              <p className="text-xs text-muted-foreground">
                Active roles
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permissions</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.permissionCount}</div>
              <p className="text-xs text-muted-foreground">
                System permissions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">
                Good standing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This unified dashboard provides complete control over your application's access management.
            Navigate between tabs to manage different aspects of security and permissions.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          {tabs.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Descriptions */}
        <Card className="border-muted">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              {tabs.find(t => t.id === activeTab)?.icon}
              <span className="font-medium">{tabs.find(t => t.id === activeTab)?.label}:</span>
              <span className="text-muted-foreground">
                {tabs.find(t => t.id === activeTab)?.description}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <TabsContent value="users" className="space-y-4">
          <UserManagementDashboard />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RoleManagementDashboard />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionManagementDashboard />
        </TabsContent>

        <TabsContent value="page-access" className="space-y-4">
          <RolePageAccessManager />
        </TabsContent>

        <TabsContent value="api-access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API Access Control
              </CardTitle>
              <CardDescription>
                Configure API endpoint permissions, rate limits, and access policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">API Access Management</h3>
                <p className="text-muted-foreground max-w-md">
                  This feature will allow you to configure fine-grained permissions for API endpoints,
                  set rate limits per role, and manage API keys.
                </p>
                <Badge variant="secondary" className="mt-4">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <PermissionConfigurationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}