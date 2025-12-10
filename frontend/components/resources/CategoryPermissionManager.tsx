'use client'

import React, { useState, useEffect } from 'react'
import { 
  Save, 
  Folder, 
  Users, 
  AlertTriangle, 
  RefreshCw,
  Info,
  Settings,
  FileText,
  ArrowRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Switch } from '@/components/ui/switch'
import { 
  ResourceCategory,
  CategoryPermission, 
  PermissionMatrix as PermissionMatrixType, 
  PermissionType,
  Role,
  CategoryPermissionForm
} from '@/lib/types'

import { PermissionMatrix } from './PermissionMatrix'


interface CategoryPermissionManagerProps {
  category: ResourceCategory
  roles: Role[]
  onSave: (permissions: CategoryPermissionForm) => Promise<void>
  onRefresh?: () => Promise<void>
  className?: string
}

interface CategoryPermissionData {
  category_permissions: CategoryPermission[]
  affected_resources_count: number
}

const categoryPermissionTypes: PermissionType[] = ['view', 'create', 'edit', 'delete', 'manage']

export function CategoryPermissionManager({
  category,
  roles,
  onSave,
  onRefresh,
  className = ''
}: CategoryPermissionManagerProps) {
  const [permissionData, setPermissionData] = useState<CategoryPermissionData | null>(null)
  const [currentPermissions, setCurrentPermissions] = useState<PermissionMatrixType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [applyToExisting, setApplyToExisting] = useState(false)

  // Initialize permissions matrix from current data
  useEffect(() => {
    if (permissionData) {
      const matrix: PermissionMatrixType[] = roles.map(role => {
        const permission = permissionData.category_permissions.find(p => p.role_id === role.id)
        
        return {
          roleId: role.id,
          roleName: role.name,
          permissions: {
            view: permission?.can_view || false,
            create: permission?.can_create || false,
            edit: permission?.can_edit || false,
            delete: permission?.can_delete || false,
            manage: permission?.can_manage || false
          },
          inherited: false,
          source: 'direct'
        }
      })
      
      setCurrentPermissions(matrix)
    }
  }, [permissionData, roles])

  // Load permission data
  useEffect(() => {
    loadPermissions()
  }, [category.id])

  const loadPermissions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real app, this would be an API call
      // For now, we'll simulate the data structure
      const mockData: CategoryPermissionData = {
        category_permissions: category.permissions || [],
        affected_resources_count: category.resources_count || 0
      }

      setPermissionData(mockData)
    } catch (err) {
      setError('Failed to load category permissions')
      console.error('Error loading permissions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePermissionChange = (roleId: string, permission: PermissionType, granted: boolean) => {
    setCurrentPermissions(prev => 
      prev.map(perm => 
        perm.roleId === roleId
          ? {
            ...perm,
            permissions: {
              ...perm.permissions,
              [permission]: granted
            }
          }
          : perm
      )
    )
    setHasChanges(true)
  }

  const handleBulkPermissionChange = (permission: PermissionType, granted: boolean) => {
    setCurrentPermissions(prev => 
      prev.map(perm => ({
        ...perm,
        permissions: {
          ...perm.permissions,
          [permission]: granted
        }
      }))
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!hasChanges) return

    setSaving(true)
    setError(null)

    try {
      const formData: CategoryPermissionForm = {
        category_id: category.id,
        role_permissions: currentPermissions.map(perm => ({
          role_id: perm.roleId,
          can_view: perm.permissions.view,
          can_create: perm.permissions.create,
          can_edit: perm.permissions.edit,
          can_delete: perm.permissions.delete,
          can_manage: perm.permissions.manage
        })),
        apply_to_existing: applyToExisting
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

  const getPermissionStats = (permission: PermissionType) => {
    const granted = currentPermissions.filter(p => p.permissions[permission]).length
    return { granted, total: roles.length }
  }

  const hasAnyPermissions = () => {
    return currentPermissions.some(perm => 
      Object.values(perm.permissions).some(p => p)
    )
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
            <Folder className="h-5 w-5" />
            Category Permissions
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
        
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Configure default permissions for "{category.name}"
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {permissionData?.affected_resources_count || 0} resources
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {roles.length} roles
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {categoryPermissionTypes.map(permission => {
              const stats = getPermissionStats(permission)
              const allGranted = stats.granted === stats.total
              const someGranted = stats.granted > 0 && stats.granted < stats.total
              
              return (
                <div key={permission} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium capitalize truncate">
                      {permission}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.granted}/{stats.total}
                    </div>
                  </div>
                  <Checkbox
                    checked={allGranted}
                    ref={(el) => {
                      if (el) el.indeterminate = someGranted
                    }}
                    onCheckedChange={(checked) => 
                      handleBulkPermissionChange(permission, !!checked)
                    }
                    className="ml-2"
                  />
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Permission Matrix */}
        <PermissionMatrix
          roles={roles}
          permissions={currentPermissions}
          permissionTypes={categoryPermissionTypes}
          onPermissionChange={handlePermissionChange}
          title="Role Permissions"
          description="Set permissions for each role in this category"
          showInherited={false}
        />

        {/* Apply to Existing Resources */}
        {hasAnyPermissions() && permissionData && permissionData.affected_resources_count > 0 && (
          <div className="space-y-3">
            <Separator />
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">Apply to Existing Resources</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Apply these permissions to all {permissionData.affected_resources_count} existing resources in this category
                </p>
              </div>
              
              <Switch
                checked={applyToExisting}
                onCheckedChange={setApplyToExisting}
              />
            </div>
            
            {applyToExisting && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This will override existing resource-specific permissions 
                  for all resources in this category. Resources with custom permissions will lose their individual settings.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Category permissions serve as defaults for new resources. 
            Individual resources can override these settings with their own permissions.
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span>Category Permissions</span>
              <ArrowRight className="h-3 w-3" />
              <span>Resource Permissions</span>
              <ArrowRight className="h-3 w-3" />
              <span>Final Access</span>
            </div>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {hasAnyPermissions() 
              ? `${currentPermissions.filter(p => Object.values(p.permissions).some(v => v)).length} roles with permissions`
              : 'No permissions configured'
            }
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Category Permissions'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}