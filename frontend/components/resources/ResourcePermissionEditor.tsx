'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Save, 
  Shield, 
  Users, 
  AlertTriangle, 
  RefreshCw,
  Info,
  Lock,
  Unlock
} from 'lucide-react'
import { PermissionMatrix } from './PermissionMatrix'
import { ResourceAccessDetails } from './ResourceAccessIndicator'
import { 
  Resource, 
  ResourcePermission, 
  CategoryPermission, 
  PermissionMatrix as PermissionMatrixType, 
  PermissionType,
  AccessLevel,
  PermissionSummary,
  Role
} from '@/lib/types'

interface ResourcePermissionEditorProps {
  resource: Resource
  roles: Role[]
  onSave: (permissions: ResourcePermissionForm) => Promise<void>
  onRefresh?: () => Promise<void>
  className?: string
}

interface ResourcePermissionForm {
  resource_id: string | number
  role_permissions: {
    role_id: string
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_manage: boolean
  }[]
}

interface PermissionData {
  resource_permissions: ResourcePermission[]
  category_permissions: CategoryPermission[]
  inherited_permissions: PermissionMatrixType[]
  summary: PermissionSummary
}

const resourcePermissionTypes: PermissionType[] = ['view', 'edit', 'delete', 'manage']

export function ResourcePermissionEditor({
  resource,
  roles,
  onSave,
  onRefresh,
  className = ''
}: ResourcePermissionEditorProps) {
  const [permissionData, setPermissionData] = useState<PermissionData | null>(null)
  const [currentPermissions, setCurrentPermissions] = useState<PermissionMatrixType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('direct')

  // Initialize permissions matrix from current data
  useEffect(() => {
    if (permissionData) {
      // Create matrix from direct permissions
      const matrix: PermissionMatrixType[] = roles.map(role => {
        const directPerm = permissionData.resource_permissions.find(p => p.role_id === role.id)
        const inheritedPerm = permissionData.inherited_permissions.find(p => p.roleId === role.id)
        
        return {
          roleId: role.id,
          roleName: role.name,
          permissions: {
            view: directPerm?.can_view || false,
            create: false, // Not applicable for resources
            edit: directPerm?.can_edit || false,
            delete: directPerm?.can_delete || false,
            manage: directPerm?.can_manage || false
          },
          inherited: !!inheritedPerm,
          source: directPerm ? 'direct' : (inheritedPerm ? inheritedPerm.source : 'none')
        }
      })
      
      setCurrentPermissions(matrix)
    }
  }, [permissionData, roles])

  // Load permission data
  useEffect(() => {
    loadPermissions()
  }, [resource.id])

  const loadPermissions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real app, this would be an API call
      // For now, we'll simulate the data structure
      const mockData: PermissionData = {
        resource_permissions: resource.permissions || [],
        category_permissions: resource.category?.permissions || [],
        inherited_permissions: [],
        summary: {
          total_roles: roles.length,
          roles_with_access: 0,
          access_level: 'role-based' as AccessLevel,
          is_public: false,
          restricted_roles: []
        }
      }

      setPermissionData(mockData)
    } catch (err) {
      setError('Failed to load resource permissions')
      console.error('Error loading permissions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePermissionChange = (roleId: string, permission: PermissionType, granted: boolean) => {
    if (permission === 'create') return // Not applicable for resources

    setCurrentPermissions(prev => 
      prev.map(perm => 
        perm.roleId === roleId
          ? {
              ...perm,
              permissions: {
                ...perm.permissions,
                [permission]: granted
              },
              source: 'direct'
            }
          : perm
      )
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!hasChanges) return

    setSaving(true)
    setError(null)

    try {
      const formData: ResourcePermissionForm = {
        resource_id: resource.id,
        role_permissions: currentPermissions.map(perm => ({
          role_id: perm.roleId,
          can_view: perm.permissions.view,
          can_edit: perm.permissions.edit,
          can_delete: perm.permissions.delete,
          can_manage: perm.permissions.manage
        }))
      }

      await onSave(formData)
      setHasChanges(false)
      
      // Refresh data
      await loadPermissions()
    } catch (err) {
      setError('Failed to save permissions')
      console.error('Error saving permissions:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    await loadPermissions()
    if (onRefresh) {
      await onRefresh()
    }
  }

  const getInheritedPermissions = (): PermissionMatrixType[] => {
    if (!permissionData) return []
    
    return roles.map(role => {
      const categoryPerm = permissionData.category_permissions.find(p => p.role_id === role.id)
      
      return {
        roleId: role.id,
        roleName: role.name,
        permissions: {
          view: categoryPerm?.can_view || false,
          create: categoryPerm?.can_create || false,
          edit: categoryPerm?.can_edit || false,
          delete: categoryPerm?.can_delete || false,
          manage: categoryPerm?.can_manage || false
        },
        inherited: true,
        source: 'category'
      }
    })
  }

  const getCombinedPermissions = (): PermissionMatrixType[] => {
    const inherited = getInheritedPermissions()
    
    return roles.map(role => {
      const direct = currentPermissions.find(p => p.roleId === role.id)
      const inheritedPerm = inherited.find(p => p.roleId === role.id)
      
      return {
        roleId: role.id,
        roleName: role.name,
        permissions: {
          view: direct?.permissions.view || inheritedPerm?.permissions.view || false,
          create: false, // Not applicable for resources
          edit: direct?.permissions.edit || inheritedPerm?.permissions.edit || false,
          delete: direct?.permissions.delete || inheritedPerm?.permissions.delete || false,
          manage: direct?.permissions.manage || inheritedPerm?.permissions.manage || false
        },
        inherited: !direct?.permissions.view && !direct?.permissions.edit && !direct?.permissions.delete && !direct?.permissions.manage,
        source: direct?.permissions.view || direct?.permissions.edit || direct?.permissions.delete || direct?.permissions.manage 
          ? 'direct' 
          : (inheritedPerm?.permissions.view || inheritedPerm?.permissions.edit || inheritedPerm?.permissions.delete || inheritedPerm?.permissions.manage ? 'category' : 'none')
      }
    })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error && !permissionData) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={loadPermissions}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Resource Permissions
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Unsaved Changes
              </Badge>
            )}
            
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={isSaving}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Configure who can access "{resource.title}"
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Access Level */}
        <div>
          <h3 className="text-sm font-medium mb-3">Current Access Level</h3>
          <ResourceAccessDetails
            accessLevel={permissionData?.summary.access_level || 'role-based'}
            permissionSummary={permissionData?.summary}
          />
        </div>

        <Separator />

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Permission Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Direct Permissions
            </TabsTrigger>
            <TabsTrigger value="inherited" className="flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              Inherited
            </TabsTrigger>
            <TabsTrigger value="combined" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Effective
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="mt-6">
            <PermissionMatrix
              roles={roles}
              permissions={currentPermissions}
              permissionTypes={resourcePermissionTypes}
              onPermissionChange={handlePermissionChange}
              title="Direct Permissions"
              description="Permissions specifically assigned to this resource"
              showInherited={false}
            />
          </TabsContent>

          <TabsContent value="inherited" className="mt-6">
            <PermissionMatrix
              roles={roles}
              permissions={getInheritedPermissions()}
              permissionTypes={resourcePermissionTypes}
              onPermissionChange={() => {}} // Read-only
              readOnly
              title="Inherited Permissions"
              description="Permissions inherited from category settings"
              showInherited={false}
            />
            
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                These permissions are inherited from the "{resource.category?.name}" category. 
                Changes to category permissions will affect all resources in that category.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="combined" className="mt-6">
            <PermissionMatrix
              roles={roles}
              permissions={getCombinedPermissions()}
              permissionTypes={resourcePermissionTypes}
              onPermissionChange={() => {}} // Read-only
              readOnly
              title="Effective Permissions"
              description="Final permissions combining direct and inherited permissions"
              showInherited={true}
            />
            
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                This shows the final permissions that will be applied. Direct permissions override inherited ones.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {roles.length} roles configured
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}