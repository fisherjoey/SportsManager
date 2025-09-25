"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Users, Shield, AlertCircle, Search, Filter, Download, MoreVertical, Edit, Eye, Trash2, DollarSign, UserCog } from 'lucide-react'
import { UserForm } from './UserFormNew'
import { UserDetailsModal } from './UserDetailsModal'
import { apiClient } from '@/lib/api'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { User, Role, getUserDisplayName, getYearsOfExperience, getExperienceLevel, getUserFullAddress } from '@/types/user'

export function UserManagementDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all'
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingWage, setEditingWage] = useState<{ userId: string; wage: number } | null>(null)
  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params: any = {
        page,
        limit: 20
      }
      
      // Handle referee filters - include all referee types or specific ones
      if (filters.role === 'referee' || filters.role.endsWith('_referee')) {
        // Use the enhanced referees API for referee data
        if (filters.role === 'senior_referee') {
          params.referee_type = 'Senior Referee'
        } else if (filters.role === 'junior_referee') {
          params.referee_type = 'Junior Referee'
        } else if (filters.role === 'rookie_referee') {
          params.referee_type = 'Rookie Referee'
        }
        // For 'referee', we don't add any filter to get all types
        
        const response = await apiClient.get('/referees', { params })
        
        if (response.data?.data && response.data?.pagination) {
          setUsers(response.data.data)
          setTotalPages(response.data.pagination.totalPages || 1)
        }
      } else {
        // Use regular users API for non-referee filters
        if (filters.role !== 'all') {
          params.role = filters.role
        }
        
        const response = await apiClient.getUsers(params)
        
        if (response.data?.users) {
          setUsers(response.data.users)
        } else if (response.data?.data && response.data?.pagination) {
          // Handle paginated response
          setUsers(response.data.data)
          setTotalPages(response.data.pagination.totalPages || 1)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, filters.role])

  const handleCreateUser = () => {
    setSelectedUser(null)
    setShowUserForm(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowUserForm(true)
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId)
    if (!userToDelete) return

    if (!confirm(`Are you sure you want to delete ${userToDelete.name || userToDelete.email}?\\n\\nThis action cannot be undone.`)) return

    try {
      await apiClient.deleteUser(userId)
      
      toast({
        title: 'User Deleted',
        description: `${userToDelete.name || userToDelete.email} has been deleted`,
      })
      
      fetchUsers()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleFormSuccess = () => {
    setShowUserForm(false)
    fetchUsers()
  }

  const handleWageUpdate = async (userId: string, newWage: number) => {
    try {
      await apiClient.put(`/referees/${userId}/wage`, {
        wage_amount: newWage
      })
      
      toast({
        title: 'Wage Updated',
        description: `Referee wage updated to $${newWage.toFixed(2)} per game`,
      })
      
      fetchUsers() // Refresh the data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update wage'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleTypeChange = async (userId: string, newType: string) => {
    try {
      await apiClient.put(`/referees/${userId}/type`, {
        referee_type: newType,
        update_wage_to_default: false
      })
      
      toast({
        title: 'Referee Type Updated',
        description: `Referee type changed to ${newType}`,
      })
      
      fetchUsers() // Refresh the data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change referee type'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  // Filter users based on search (now handled by DataTable)
  const filteredUsers = users.filter(user => {
    // If is_active is undefined, treat user as active
    const isActive = user.is_active !== false
    const matchesStatus = filters.status === 'all' ||
      (filters.status === 'active' && isActive) ||
      (filters.status === 'inactive' && !isActive)
    
    return matchesStatus
  })

  // Get user statistics based on new roles
  const stats = {
    total: users.length,
    admins: users.filter(u => 
      u.roles?.some(r => r.name === 'Super Admin' || r.name === 'Admin') || 
      u.role === 'admin'
    ).length,
    assignors: users.filter(u => 
      u.roles?.some(r => r.name === 'Assignor') || 
      u.role === 'assignor'
    ).length,
    referees: users.filter(u => 
      u.roles?.some(r => r.name === 'Referee') || 
      u.role === 'referee'
    ).length,
    active: users.filter(u => u.is_active !== false).length
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle inline wage editing
  const handleWageEdit = (userId: string, currentWage: number) => {
    setEditingWage({ userId, wage: currentWage })
  }

  const handleWageSave = async () => {
    if (!editingWage) return
    await handleWageUpdate(editingWage.userId, editingWage.wage)
    setEditingWage(null)
  }

  const handleWageCancel = () => {
    setEditingWage(null)
  }

  // Column definitions for FilterableTable
  const getUserColumns = (showRefereeColumns: boolean): ColumnDef<User>[] => {
    const baseColumns: ColumnDef<User>[] = [
      {
        id: 'name',
        title: 'Name',
        filterType: 'search',
        accessor: (user) => {
          return (
            <div>
              <div className="font-medium">{getUserDisplayName(user)}</div>
              {user.date_of_birth && (
                <div className="text-xs text-muted-foreground">
                  Born: {new Date(user.date_of_birth).toLocaleDateString()}
                </div>
              )}
              {user.communication_preferences?.preferred_language && user.communication_preferences.preferred_language !== 'en' && (
                <div className="text-xs text-blue-600">
                  Language: {user.communication_preferences.preferred_language.toUpperCase()}
                </div>
              )}
            </div>
          )
        }
      },
      {
        id: 'email',
        title: 'Email',
        filterType: 'search',
        accessor: (user) => (
          <div className="text-sm">{user.email}</div>
        )
      },
      {
        id: 'contact',
        title: 'Contact Info',
        filterType: 'search',
        accessor: (user) => {
          const fullAddress = getUserFullAddress(user)
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">{user.phone || '-'}</div>
              {fullAddress && (
                <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={fullAddress}>
                  {fullAddress}
                </div>
              )}
              {user.emergency_contact_name && (
                <div className="text-xs text-blue-600">
                  Emergency: {user.emergency_contact_name}
                </div>
              )}
            </div>
          )
        }
      },
      {
        id: 'professional',
        title: 'Professional Info',
        filterType: 'select',
        filterOptions: [
          { value: 'all', label: 'All Experience' },
          { value: 'new', label: 'New (0-1 years)' },
          { value: 'junior', label: 'Junior (2-5 years)' },
          { value: 'senior', label: 'Senior (6+ years)' }
        ],
        accessor: (user) => {
          const years = getYearsOfExperience(user)
          const startYear = user.year_started_refereeing
          
          return (
            <div className="text-sm space-y-1">
              <div className="font-medium">
                {years > 0 ? `${years} ${years === 1 ? 'year' : 'years'}` : 'New'}
              </div>
              {startYear && (
                <div className="text-xs text-muted-foreground">
                  Since {startYear}
                </div>
              )}
              {user.certifications && user.certifications.length > 0 && (
                <div className="text-xs text-green-600">
                  {user.certifications.slice(0, 2).join(', ')}
                  {user.certifications.length > 2 && ` +${user.certifications.length - 2}`}
                </div>
              )}
              {user.specializations && user.specializations.length > 0 && (
                <div className="text-xs text-purple-600">
                  {user.specializations.slice(0, 1).join(', ')}
                  {user.specializations.length > 1 && ` +${user.specializations.length - 1}`}
                </div>
              )}
            </div>
          )
        }
      },
      {
        id: 'roles',
        title: 'Roles',
        filterType: 'select',
        filterOptions: [
          { value: 'all', label: 'All Roles' },
          { value: 'Super Admin', label: 'Super Admin' },
          { value: 'Admin', label: 'Admin' },
          { value: 'Assignor', label: 'Assignor' },
          { value: 'Referee', label: 'Referee' }
        ],
        accessor: (user) => {
          const roles = user.roles?.map(r => r.name) || [user.role] || ['User']
          
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          )
        }
      },
      {
        id: 'status',
        title: 'Status',
        filterType: 'select',
        filterOptions: [
          { value: 'all', label: 'All Status' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'on_break', label: 'On Break' }
        ],
        accessor: (user) => {
          const availabilityStatus = user.availability_status || 'active'
          const accountStatus = user.is_active !== false ? 'active' : 'inactive'
          const statusColors = {
            'active': 'bg-green-100 text-green-800 border-green-200',
            'inactive': 'bg-red-100 text-red-800 border-red-200',
            'on_break': 'bg-yellow-100 text-yellow-800 border-yellow-200'
          }
          
          return (
            <div className="space-y-1">
              <div className="flex gap-1">
                <Badge variant="outline" className={`text-xs ${statusColors[availabilityStatus as keyof typeof statusColors] || ''}`}>
                  {availabilityStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                {accountStatus === 'inactive' && (
                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 border-gray-200">
                    Disabled
                  </Badge>
                )}
              </div>
              {user.last_login && (
                <div className="text-xs text-muted-foreground">
                  Last login: {new Date(user.last_login).toLocaleDateString()}
                </div>
              )}
              {user.profile_completion_percentage !== undefined && user.profile_completion_percentage < 100 && (
                <div className="text-xs text-orange-600">
                  Profile {user.profile_completion_percentage}% complete
                </div>
              )}
            </div>
          )
        }
      },
    ]

    if (showRefereeColumns) {
      baseColumns.push(
        {
          id: 'refereeType',
          title: 'Type',
          filterType: 'select',
          filterOptions: [
            { value: 'all', label: 'All Types' },
            { value: 'Rookie Referee', label: 'Rookie' },
            { value: 'Junior Referee', label: 'Junior' },
            { value: 'Senior Referee', label: 'Senior' }
          ],
          accessor: (user) => {
            const refereeType = user.referee_profile?.referee_type?.name || 'N/A'
            
            return (
              <Select
                value={refereeType}
                onValueChange={(value) => handleTypeChange(user.id, value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rookie Referee">Rookie</SelectItem>
                  <SelectItem value="Junior Referee">Junior</SelectItem>
                  <SelectItem value="Senior Referee">Senior</SelectItem>
                </SelectContent>
              </Select>
            )
          }
        },
        {
          id: 'wage',
          title: 'Wage',
          filterType: 'none',
          accessor: (user) => {
            const currentWage = user.referee_profile?.wage_amount || 0
            const isEditing = editingWage?.userId === user.id
            
            return (
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Input
                      type="number"
                      value={editingWage.wage}
                      onChange={(e) => setEditingWage({ ...editingWage, wage: parseFloat(e.target.value) || 0 })}
                      className="w-20"
                      step="0.01"
                    />
                    <Button size="sm" onClick={handleWageSave}>Save</Button>
                    <Button size="sm" variant="outline" onClick={handleWageCancel}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">${currentWage.toFixed(2)}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleWageEdit(user.id, currentWage)}
                    >
                      <DollarSign className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )
          }
        },
        {
          id: 'availability',
          title: 'Available',
          filterType: 'select',
          filterOptions: [
            { value: 'all', label: 'All' },
            { value: 'available', label: 'Available' },
            { value: 'unavailable', label: 'Unavailable' }
          ],
          accessor: (user) => {
            const isAvailable = user.is_available !== false
            return (
              <Badge variant={isAvailable ? 'default' : 'secondary'}>
                {isAvailable ? 'Yes' : 'No'}
              </Badge>
            )
          }
        }
      )
    }

    // Add actions column
    baseColumns.push({
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleViewUser(user)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditUser(user)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteUser(user.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    })

    return baseColumns
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage system users, roles, and permissions
          </p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Quick Stats in Header */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {stats.total} total users
        </span>
        <span>•</span>
        <span>{stats.active} active</span>
        <span>•</span>
        <span>{stats.admins} admins</span>
        <span>•</span>
        <span>{stats.referees} referees</span>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search and manage all system users with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent>
          <FilterableTable
            columns={getUserColumns(filters.role === 'referee' || filters.role.endsWith('_referee'))}
            data={filteredUsers}
            loading={loading}
            mobileCardType="user"
            enableViewToggle={true}
            enableCSV={true}
            csvFilename="users-export"
            searchKey="name"
            onEditReferee={handleEditUser}
            onViewProfile={handleViewUser}
            emptyMessage="No users found matching your criteria."
          />
        </CardContent>
      </Card>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          open={showUserForm}
          onClose={() => setShowUserForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          open={showUserDetails}
          onClose={() => setShowUserDetails(false)}
          onEdit={() => {
            setShowUserDetails(false)
            handleEditUser(selectedUser)
          }}
        />
      )}
    </div>
  )
}