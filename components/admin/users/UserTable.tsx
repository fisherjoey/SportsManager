"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreVertical, 
  Edit, 
  Eye, 
  Trash2, 
  Mail, 
  Shield, 
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Role {
  id: string
  name: string
  description?: string
}

interface User {
  id: string
  name: string
  email: string
  role: string  // Legacy role field
  legacy_role?: string  // Explicitly marked as legacy
  roles?: Role[]  // New RBAC roles
  is_available?: boolean  // Referee availability
  is_active?: boolean  // Might not exist, treat as active if undefined
  created_at: string
  updated_at?: string
}

interface UserTableProps {
  users: User[]
  onEdit: (user: User) => void
  onView: (user: User) => void
  onDelete: (userId: string) => void
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function UserTable({ 
  users, 
  onEdit, 
  onView, 
  onDelete,
  page = 1,
  totalPages = 1,
  onPageChange
}: UserTableProps) {
  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'super admin':
      case 'admin':
        return 'destructive'
      case 'assignor':
        return 'default'
      case 'referee':
        return 'secondary'
      case 'league manager':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'super admin':
      case 'admin':
        return <Shield className="h-3 w-3 mr-1" />
      case 'assignor':
        return <UserCheck className="h-3 w-3 mr-1" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getUserInitials = (user: User) => {
    if (user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email.slice(0, 2).toUpperCase()
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">No users found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or create a new user
        </p>
      </div>
    )
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/placeholder-user.jpg`} />
                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.name || 'No name'}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {user.roles && user.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map(role => (
                      <Badge key={role.id} variant={getRoleBadgeVariant(role.name)}>
                        <span className="flex items-center">
                          {getRoleIcon(role.name)}
                          {role.name}
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge variant={getRoleBadgeVariant(user.role || 'none')}>
                    <span className="flex items-center">
                      {getRoleIcon(user.role || '')}
                      {user.role || 'No Role'}
                    </span>
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.is_active !== false ? 'outline' : 'secondary'}>
                  {user.is_active !== false ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(user.created_at)}</TableCell>
              <TableCell>{formatDate(user.updated_at || '')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onView(user)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(user.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}