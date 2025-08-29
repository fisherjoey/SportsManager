"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash, Shield, Users, Power, Lock } from 'lucide-react'

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
}

export function RoleCard({ role, onEdit, onDelete, onToggleStatus, onManagePermissions }: RoleCardProps) {
  const isSystemRole = ['Super Admin', 'Admin', 'Referee'].includes(role.name)

  return (
    <Card className={`relative ${!role.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {role.name}
              {isSystemRole && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </CardTitle>
            <Badge variant={role.is_active ? 'default' : 'secondary'} className="text-xs">
              {role.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(role)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Role
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManagePermissions(role)}>
                <Shield className="h-4 w-4 mr-2" />
                Manage Permissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(role)}>
                <Power className="h-4 w-4 mr-2" />
                {role.is_active ? 'Deactivate' : 'Activate'}
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
          {role.description || 'No description provided'}
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
            <span className="text-muted-foreground">{role.permission_count || 0} permissions</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}