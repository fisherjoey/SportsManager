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
  ChevronRight,
  DollarSign,
  Whistle,
  Star,
  Award
} from 'lucide-react'
import { getYearsOfExperience } from '@/types/user'
import { EditableWage } from '@/components/admin/referees/EditableWage'
import { RefereeTypeManager } from '@/components/admin/referees/RefereeTypeManager'
import { ScrollableRoleTabs } from '@/components/ui/scrollable-role-tabs'

interface Role {
  id: string
  name: string
  description?: string
  category?: string
  color?: string
  referee_config?: any
}

interface RefereeProfile {
  id: string
  wage_amount: number
  evaluation_score?: number
  is_white_whistle: boolean
  show_white_whistle: boolean
  referee_type: Role | null
  capabilities: Role[]
  computed_fields: {
    type_config: any
    capability_count: number
    is_senior: boolean
    is_junior: boolean
    is_rookie: boolean
  }
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
  is_referee?: boolean  // Enhanced field
  referee_profile?: RefereeProfile | null  // Enhanced field
  year_started_refereeing?: number
  created_at: string
  updated_at?: string
}

interface UserTableProps {
  users: User[]
  onEdit: (user: User) => void
  onView: (user: User) => void
  onDelete: (userId: string) => void
  onWageUpdate?: (userId: string, newWage: number) => void
  onTypeChange?: (userId: string, newType: string) => void
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  showRefereeColumns?: boolean
}

export function UserTable({ 
  users, 
  onEdit, 
  onView, 
  onDelete,
  onWageUpdate,
  onTypeChange,
  page = 1,
  totalPages = 1,
  onPageChange,
  showRefereeColumns = false
}: UserTableProps) {
  const getRoleBadgeVariant = (role: Role) => {
    // Handle referee type roles with special styling
    if (role.category === 'referee_type') {
      switch (role.name) {
        case 'Senior Referee':
          return 'default'
        case 'Junior Referee':
          return 'secondary'  
        case 'Rookie Referee':
          return 'outline'
        default:
          return 'outline'
      }
    }

    // Handle referee capability roles
    if (role.category === 'referee_capability') {
      return 'outline'
    }

    // Handle legacy roles
    switch (role.name.toLowerCase()) {
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

  const getRoleIcon = (role: Role) => {
    // Handle referee type roles
    if (role.category === 'referee_type') {
      switch (role.name) {
        case 'Senior Referee':
          return <Star className="h-3 w-3 mr-1" />
        case 'Junior Referee':
          return <UserCheck className="h-3 w-3 mr-1" />
        case 'Rookie Referee':
          return <Shield className="h-3 w-3 mr-1" />
        default:
          return <UserCheck className="h-3 w-3 mr-1" />
      }
    }

    // Handle referee capability roles  
    if (role.category === 'referee_capability') {
      return <Award className="h-3 w-3 mr-1" />
    }

    // Handle legacy roles
    switch (role.name.toLowerCase()) {
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
            {showRefereeColumns && <TableHead>Wage</TableHead>}
            {showRefereeColumns && <TableHead>Experience</TableHead>}
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
                  <ScrollableRoleTabs 
                    roles={user.roles} 
                    className="max-w-xs"
                  />
                ) : (
                  <Badge variant="secondary">
                    <span className="flex items-center">
                      No Roles
                    </span>
                  </Badge>
                )}
              </TableCell>
              
              {/* Referee-specific columns */}
              {showRefereeColumns && (
                <TableCell>
                  {user.is_referee && user.referee_profile ? (
                    <EditableWage
                      userId={user.id}
                      currentWage={user.referee_profile.wage_amount}
                      onWageUpdate={onWageUpdate || (() => {})}
                      disabled={!onWageUpdate}
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
              )}

              {showRefereeColumns && (
                <TableCell>
                  {user.is_referee ? (
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <div className="font-medium">
                          {getYearsOfExperience(user)} {getYearsOfExperience(user) === 1 ? 'year' : 'years'}
                        </div>
                        {user.year_started_refereeing && (
                          <div className="text-xs text-muted-foreground">
                            Since {user.year_started_refereeing}
                          </div>
                        )}
                      </div>
                      {user.referee_profile?.evaluation_score && (
                        <Badge variant="outline" className="text-xs">
                          {user.referee_profile.evaluation_score}%
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
              )}
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