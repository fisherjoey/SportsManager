"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Users, Shield, AlertCircle, Search, Filter, Download, MoreVertical } from 'lucide-react'
import { UserTable } from './UserTable'
import { UserForm } from './UserFormNew'
import { UserDetailsModal } from './UserDetailsModal'
import { UserFilters } from './UserFilters'
import { apiClient } from '@/lib/api'

interface Role {
  id: string
  name: string
  description?: string
}

interface RefereeProfile {
  id: string
  wage_amount: number
  years_experience: number
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
  roles?: Role[]  // RBAC roles
  is_available?: boolean  // Referee availability
  is_active?: boolean  // Might not exist, treat as active if undefined
  is_referee?: boolean  // Enhanced field
  referee_profile?: RefereeProfile | null  // Enhanced field
  created_at: string
  updated_at?: string
}

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

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const matchesSearch = filters.search === '' || 
      user.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase())
    
    // If is_active is undefined, treat user as active
    const isActive = user.is_active !== false
    const matchesStatus = filters.status === 'all' ||
      (filters.status === 'active' && isActive) ||
      (filters.status === 'inactive' && !isActive)
    
    return matchesSearch && matchesStatus
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">
              Full system access
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignors}</div>
            <p className="text-xs text-muted-foreground">
              Manage assignments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.referees}</div>
            <p className="text-xs text-muted-foreground">
              Game officials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <UserFilters 
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <UserTable
            users={filteredUsers}
            onEdit={handleEditUser}
            onView={handleViewUser}
            onDelete={handleDeleteUser}
            onWageUpdate={handleWageUpdate}
            onTypeChange={handleTypeChange}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            showRefereeColumns={filters.role === 'referee' || filters.role.endsWith('_referee')}
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