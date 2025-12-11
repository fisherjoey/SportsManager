'use client'

import {
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Mail,
  Shield,
  UserCheck,
  Star,
  Award
} from 'lucide-react'

import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getYearsOfExperience } from '@/types/user'
import { EditableWage } from '@/components/admin/referees/EditableWage'
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
  // Helper functions
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

  // Define columns
  const columns: ColumnDef<User>[] = [
    {
      id: 'user',
      title: 'User',
      accessor: (user) => (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={'/placeholder-user.jpg'} />
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name || 'No name'}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      ),
      filterType: 'search'
    },
    {
      id: 'roles',
      title: 'Roles',
      accessor: (user) => (
        user.roles && user.roles.length > 0 ? (
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
        )
      ),
      filterType: 'multiselect',
      enableDynamicFilter: true,
      getFilterValue: (user) => user.roles?.map(r => r.name) || ['No Roles']
    },
    ...(showRefereeColumns ? [
      {
        id: 'wage',
        title: 'Wage',
        accessor: (user: User) => (
          user.is_referee && user.referee_profile ? (
            <EditableWage
              userId={user.id}
              currentWage={user.referee_profile.wage_amount}
              onWageUpdate={onWageUpdate || (() => {})}
              disabled={!onWageUpdate}
            />
          ) : (
            <span className="text-muted-foreground text-sm">N/A</span>
          )
        ),
        filterType: 'none' as const
      },
      {
        id: 'experience',
        title: 'Experience',
        accessor: (user: User) => (
          user.is_referee ? (
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
          )
        ),
        filterType: 'none' as const
      }
    ] : []),
    {
      id: 'status',
      title: 'Status',
      accessor: (user) => (
        <Badge variant={user.is_active !== false ? 'outline' : 'secondary'}>
          {user.is_active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
      filterType: 'multiselect',
      filterOptions: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
      ],
      getFilterValue: (user) => user.is_active !== false ? 'Active' : 'Inactive'
    },
    {
      id: 'created_at',
      title: 'Created',
      accessor: (user) => formatDate(user.created_at),
      filterType: 'none'
    },
    {
      id: 'updated_at',
      title: 'Last Updated',
      accessor: (user) => formatDate(user.updated_at || ''),
      filterType: 'none'
    },
    {
      id: 'actions',
      title: 'Actions',
      accessor: (user) => (
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
      ),
      filterType: 'none'
    }
  ]

  return (
    <FilterableTable
      data={users}
      columns={columns}
      emptyMessage="No users found."
      mobileCardType="user"
      enableViewToggle={true}
      enableCSV={true}
      maxVisibleColumns="auto"
      onEditReferee={onEdit}
      onViewProfile={onView}
    />
  )
}