'use client'

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoIcon, Users, Shield, Eye, Edit, Trash, Settings } from 'lucide-react'
import { PermissionMatrix as PermissionMatrixType, PermissionType, Role } from '@/lib/types'

interface PermissionMatrixProps {
  roles: Role[]
  permissions: PermissionMatrixType[]
  permissionTypes: PermissionType[]
  permissionLabels?: Record<PermissionType, string>
  permissionIcons?: Record<PermissionType, React.ReactNode>
  onPermissionChange: (roleId: string, permission: PermissionType, granted: boolean) => void
  readOnly?: boolean
  showInherited?: boolean
  title?: string
  description?: string
  className?: string
}

const defaultPermissionLabels: Record<PermissionType, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  manage: 'Manage'
}

const defaultPermissionIcons: Record<PermissionType, React.ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  create: <Users className="w-4 h-4" />,
  edit: <Edit className="w-4 h-4" />,
  delete: <Trash className="w-4 h-4" />,
  manage: <Settings className="w-4 h-4" />
}

const getPermissionTooltip = (permission: PermissionType): string => {
  switch (permission) {
    case 'view':
      return 'Can view and read the resource'
    case 'create':
      return 'Can create new resources in this category'
    case 'edit':
      return 'Can modify existing resources'
    case 'delete':
      return 'Can delete resources'
    case 'manage':
      return 'Can manage permissions and grant access to others'
    default:
      return ''
  }
}

const getSourceBadgeColor = (source?: string) => {
  switch (source) {
    case 'direct':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'category':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'system':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

export function PermissionMatrix({
  roles,
  permissions,
  permissionTypes,
  permissionLabels = defaultPermissionLabels,
  permissionIcons = defaultPermissionIcons,
  onPermissionChange,
  readOnly = false,
  showInherited = true,
  title = 'Permission Matrix',
  description,
  className = ''
}: PermissionMatrixProps) {
  // Create a map for quick permission lookups
  const permissionMap = new Map<string, PermissionMatrixType>()
  permissions.forEach(perm => {
    permissionMap.set(perm.roleId, perm)
  })

  const handlePermissionToggle = (roleId: string, permission: PermissionType, currentValue: boolean) => {
    if (readOnly) return
    onPermissionChange(roleId, permission, !currentValue)
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          
          {showInherited && (
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className={getSourceBadgeColor('direct')}>
                Direct
              </Badge>
              <Badge variant="outline" className={getSourceBadgeColor('category')}>
                Category
              </Badge>
              <Badge variant="outline" className={getSourceBadgeColor('system')}>
                System
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header row with permission types */}
            <div className="grid grid-cols-[200px_repeat(var(--cols),120px)] gap-2 pb-4 border-b border-border">
              <div className="flex items-center text-sm font-medium text-muted-foreground">
                <Users className="w-4 h-4 mr-2" />
                Role
              </div>
              
              {permissionTypes.map(permission => (
                <TooltipProvider key={permission}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center text-xs font-medium text-muted-foreground cursor-help">
                        {permissionIcons[permission]}
                        <span className="mt-1">{permissionLabels[permission]}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getPermissionTooltip(permission)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Permission matrix rows */}
            <div className="space-y-2 pt-4" style={{ '--cols': permissionTypes.length } as React.CSSProperties}>
              {roles.map(role => {
                const rolePermissions = permissionMap.get(role.id)
                
                return (
                  <div 
                    key={role.id}
                    className="grid grid-cols-[200px_repeat(var(--cols),120px)] gap-2 items-center py-2 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    {/* Role name */}
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{role.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{role.code}</p>
                      </div>
                      
                      {showInherited && rolePermissions?.source && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getSourceBadgeColor(rolePermissions.source)}`}
                              >
                                {rolePermissions.source}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {rolePermissions.source === 'direct' && 'Direct permission assignment'}
                                {rolePermissions.source === 'category' && 'Inherited from category permissions'}
                                {rolePermissions.source === 'system' && 'System-level role permissions'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Permission checkboxes */}
                    {permissionTypes.map(permission => {
                      const hasPermission = rolePermissions?.permissions[permission] || false
                      const isInherited = rolePermissions?.inherited || false
                      const isDisabled = readOnly || (isInherited && showInherited)

                      return (
                        <div key={permission} className="flex justify-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative">
                                  <Checkbox
                                    checked={hasPermission}
                                    onCheckedChange={() => handlePermissionToggle(role.id, permission, hasPermission)}
                                    disabled={isDisabled}
                                    className={`h-5 w-5 ${
                                      isInherited && hasPermission
                                        ? 'bg-muted border-muted-foreground opacity-60'
                                        : ''
                                    }`}
                                  />
                                  
                                  {isInherited && hasPermission && (
                                    <div className="absolute -top-1 -right-1">
                                      <InfoIcon className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {getPermissionTooltip(permission)}
                                  {isInherited && hasPermission && (
                                    <span className="block text-xs text-muted-foreground mt-1">
                                      Inherited from {rolePermissions?.source}
                                    </span>
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Empty state */}
            {roles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No roles available</p>
                <p className="text-xs mt-1">Create roles to manage permissions</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        {showInherited && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <InfoIcon className="w-4 h-4" />
              Permission Sources
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getSourceBadgeColor('direct')}>Direct</Badge>
                <span>Explicitly assigned to this resource</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getSourceBadgeColor('category')}>Category</Badge>
                <span>Inherited from category settings</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getSourceBadgeColor('system')}>System</Badge>
                <span>System-wide role permissions</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}