'use client'

import { MoreVertical, Edit, Trash, Shield, Users, Power, Lock, UserPlus, Crown } from 'lucide-react'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface RoleCardProps {
  role: {
    id: string
    name: string
    description: string
    is_active: boolean
    user_count: number
    permission_count: number
    created_at: string
    updated_at: string
  }
  onEdit: (role: any) => void
  onDelete: (roleId: string) => void
  onToggleStatus: (role: any) => void
  onManagePermissions: (role: any) => void
  onManageUsers?: (role: any) => void
}

export function RoleCard({ role, onEdit, onDelete, onToggleStatus, onManagePermissions, onManageUsers }: RoleCardProps) {
  const isSystemRole = ['Super Admin', 'Admin', 'Referee'].includes(role.name)
  const isSuperAdmin = role.name === 'Super Admin'

  return (
    <Card className={`relative ${!role.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {role.name}
              {isSuperAdmin && (
                <Crown className="h-4 w-4 text-yellow-500" title="Super Admin - Protected Role" />
              )}
              {!isSuperAdmin && isSystemRole && (
                <Lock className="h-3 w-3 text-muted-foreground" title="System Role" />
              )}
            </CardTitle>
            <Badge variant={role.is_active ? 'default' : 'secondary'} className="text-xs">
              {role.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Role actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => !isSuperAdmin && onEdit(role)}
                disabled={isSuperAdmin}
                className={isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Edit className="h-4 w-4 mr-2" />
                <span>Edit Role</span>
                {isSuperAdmin && <span className="ml-auto text-xs text-muted-foreground">Protected</span>}
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => !isSuperAdmin && onManagePermissions(role)}
                disabled={isSuperAdmin}
                className={isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Shield className="h-4 w-4 mr-2" />
                <span>Manage Permissions</span>
                {isSuperAdmin && <span className="ml-auto text-xs text-muted-foreground">All</span>}
              </DropdownMenuItem>
              
              {onManageUsers && (
                <DropdownMenuItem onClick={() => onManageUsers(role)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Users
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => !isSuperAdmin && onToggleStatus(role)}
                disabled={isSuperAdmin}
                className={isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Power className="h-4 w-4 mr-2" />
                <span>{role.is_active ? 'Deactivate' : 'Activate'}</span>
                {isSuperAdmin && <span className="ml-auto text-xs text-muted-foreground">Protected</span>}
              </DropdownMenuItem>
              {!isSystemRole && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(role.id)}
                    className="text-destructive"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Role
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {isSuperAdmin 
            ? 'Protected system role with unrestricted access to all features and permissions.' 
            : (role.description || 'No description provided')}
        </p>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <div className="flex justify-between w-full text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{role.user_count || 0} users</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {isSuperAdmin ? 'All permissions' : `${role.permission_count || 0} permissions`}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}