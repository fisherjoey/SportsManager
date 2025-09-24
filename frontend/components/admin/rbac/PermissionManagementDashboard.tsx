"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, 
  Search, 
  Grid3X3, 
  Settings, 
  Users, 
  FileText,
  Database,
  Lock,
  Unlock,
  AlertCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface Permission {
  id: string
  name: string
  category: string
  description: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  user_count: number
}

interface PermissionCategory {
  name: string
  permissions: Permission[]
  icon: React.ReactNode
}

export function PermissionManagementDashboard() {
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [categories, setCategories] = useState<PermissionCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { toast } = useToast()

  const categoryIcons: { [key: string]: React.ReactNode } = {
    'users': <Users className="h-4 w-4" />,
    'games': <Grid3X3 className="h-4 w-4" />,
    'referees': <Shield className="h-4 w-4" />,
    'teams': <Users className="h-4 w-4" />,
    'leagues': <Database className="h-4 w-4" />,
    'tournaments': <Grid3X3 className="h-4 w-4" />,
    'reports': <FileText className="h-4 w-4" />,
    'settings': <Settings className="h-4 w-4" />,
    'system': <Lock className="h-4 w-4" />,
    'default': <Shield className="h-4 w-4" />
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch permissions
      const permData = await apiClient.getPermissions()
      const permissionsObj = permData.data?.permissions || {}
      
      // Convert to flat array and create categories
      const permissionsList: Permission[] = []
      const categoriesList: PermissionCategory[] = []
      
      Object.keys(permissionsObj).forEach(category => {
        const categoryPermissions = permissionsObj[category]
        categoryPermissions.forEach((perm: Permission) => {
          permissionsList.push(perm)
        })
        
        categoriesList.push({
          name: category,
          permissions: categoryPermissions,
          icon: categoryIcons[category] || categoryIcons['default']
        })
      })
      
      setPermissions(permissionsList)
      setCategories(categoriesList.sort((a, b) => a.name.localeCompare(b.name)))
      
      // Fetch roles with permissions
      const rolesData = await apiClient.getRoles({ include_inactive: false })
      const rolesWithDetails = await Promise.all(
        (rolesData.data?.roles || []).map(async (role: any) => {
          const roleDetail = await apiClient.getRole(role.id)
          return {
            ...role,
            permissions: roleDetail.data?.role?.permissions || []
          }
        })
      )
      setRoles(rolesWithDetails)
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load permissions data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredPermissions = permissions.filter(perm => {
    const matchesSearch = searchTerm === '' || 
      perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || perm.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const getPermissionUsage = (permissionId: string) => {
    return roles.filter(role => 
      role.permissions.some(p => p.id === permissionId)
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permission Matrix</h1>
          <p className="text-muted-foreground">Loading permissions and roles...</p>
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permission Matrix</h1>
          <p className="text-muted-foreground">
            Manage system permissions and view role assignments
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {categories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              With assigned permissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Permissions/Role</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.length > 0 
                ? Math.round(roles.reduce((sum, role) => sum + role.permissions.length, 0) / roles.length)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per active role
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Details</CardTitle>
          <CardDescription>
            Browse and search all system permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.icon}
                  <span className="ml-2 capitalize">{category.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredPermissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No permissions found matching your criteria</p>
                </div>
              ) : (
                filteredPermissions.map(permission => {
                  const usageRoles = getPermissionUsage(permission.id)
                  return (
                    <Card key={permission.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {categoryIcons[permission.category] || categoryIcons['default']}
                            <h4 className="font-medium">{permission.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {permission.category}
                            </Badge>
                          </div>
                          {permission.description && (
                            <p className="text-sm text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">ID: {permission.id}</span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-muted-foreground">
                              Used by {usageRoles.length} role{usageRoles.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {usageRoles.map(role => (
                            <Badge key={role.id} variant="secondary" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Role-Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Role-Permission Matrix</CardTitle>
          <CardDescription>
            Overview of which roles have which permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {roles.map(role => (
                <Card key={role.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <h4 className="font-medium">{role.name}</h4>
                        <Badge variant="outline">
                          {role.permissions.length} permissions
                        </Badge>
                        {role.user_count > 0 && (
                          <Badge variant="secondary">
                            {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {categories.map(category => {
                        const categoryPerms = role.permissions.filter(p => p.category === category.name)
                        if (categoryPerms.length === 0) return null
                        return (
                          <div key={category.name} className="flex items-center gap-1">
                            {category.icon}
                            <Badge variant="secondary" className="text-xs">
                              {category.name}: {categoryPerms.length}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}