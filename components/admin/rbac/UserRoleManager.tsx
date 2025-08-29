'use client'

import { useState, useEffect } from 'react'
import { Search, Users, Plus, Minus, UserX, Mail, Calendar, Shield } from 'lucide-react'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'
import type { Role, User, UsersWithRoleResponse } from '@/lib/types'

interface UserRoleManagerProps {
  role: Role | null
  isOpen: boolean
  onClose: () => void
}

interface UserWithRoles extends User {
  user_roles?: Array<{
    id: string
    assigned_at: string
    assigned_by: string
    active: boolean
  }>
}

export function UserRoleManager({ role, isOpen, onClose }: UserRoleManagerProps) {
  const [usersWithRole, setUsersWithRole] = useState<UserWithRoles[]>([])
  const [allUsers, setAllUsers] = useState<UserWithRoles[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showAssignUsers, setShowAssignUsers] = useState(false)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  const fetchUsersWithRole = async () => {
    if (!role) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/roles/${role.id}/users`, {
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data: UsersWithRoleResponse = await response.json()
      setUsersWithRole(data.data.users as UserWithRoles[])
    } catch (error) {
      console.error('Error fetching users with role:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users with this role.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setAllUsers(data.data?.users || data.users || [])
    } catch (error) {
      console.error('Error fetching all users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users for assignment.',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    if (isOpen && role) {
      fetchUsersWithRole()
      if (showAssignUsers) {
        fetchAllUsers()
      }
    }
  }, [role, isOpen, showAssignUsers])

  const handleRemoveRole = async (userId: string) => {
    if (!role || !confirm('Are you sure you want to remove this role from the user?')) {
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role_ids: [role.id] }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove role')
      }

      toast({
        title: 'Success',
        description: 'Role removed from user successfully'
      })
      
      fetchUsersWithRole()
    } catch (error) {
      console.error('Error removing role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove role',
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleAssignRoles = async () => {
    if (!role || selectedUsers.size === 0) return

    setUpdating(true)
    try {
      const userIds = Array.from(selectedUsers)
      
      // Assign role to selected users
      const promises = userIds.map(userId =>
        fetch(`/api/admin/users/${userId}/roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role_ids: [role.id] }),
          credentials: 'include'
        })
      )

      const responses = await Promise.all(promises)
      const failed = responses.filter(r => !r.ok)
      
      if (failed.length > 0) {
        throw new Error(`Failed to assign role to ${failed.length} user${failed.length !== 1 ? 's' : ''}`)
      }

      toast({
        title: 'Success',
        description: `Role assigned to ${userIds.length} user${userIds.length !== 1 ? 's' : ''} successfully`
      })
      
      setSelectedUsers(new Set())
      setShowAssignUsers(false)
      fetchUsersWithRole()
    } catch (error) {
      console.error('Error assigning roles:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign roles',
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers)
    if (checked) {
      newSelection.add(userId)
    } else {
      newSelection.delete(userId)
    }
    setSelectedUsers(newSelection)
  }

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const filteredUsersWithRole = usersWithRole.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableUsers = allUsers.filter(user => {
    const hasRole = usersWithRole.some(u => u.id === user.id)
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    return !hasRole && matchesSearch
  })

  if (!role) return null

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Manage Users for Role: {role.name}
        </DialogTitle>
        <DialogDescription>
          Assign or remove users from this role. Changes take effect immediately.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{usersWithRole.length}</div>
                  <div className="text-xs text-muted-foreground">Users with Role</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{role.permissions?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Permissions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Badge variant={role.active ? 'default' : 'secondary'} className="text-xs">
                  {role.active ? 'Active' : 'Inactive'}
                </Badge>
                {role.system_role && (
                  <Badge variant="outline" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <Button
            onClick={() => {
              setShowAssignUsers(!showAssignUsers)
              if (!showAssignUsers) {
                fetchAllUsers()
              }
              setSearchTerm('')
              setSelectedUsers(new Set())
            }}
            className="gap-2"
          >
            {showAssignUsers ? (
              <>
                <Minus className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Assign Users
              </>
            )}
          </Button>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {showAssignUsers ? 'Assign Users to Role' : 'Users with Role'}
              </span>
              {showAssignUsers && selectedUsers.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedUsers.size} selected
                  </Badge>
                  <Button
                    size="sm"
                    onClick={handleAssignRoles}
                    disabled={updating}
                    className="gap-1"
                  >
                    {updating ? (
                      <LoadingSpinner className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Assign Role
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : showAssignUsers ? (
              /* Assign Users View */
              availableUsers.length === 0 ? (
                <EmptyState
                  title="No users available"
                  description="All users already have this role or no users match your search."
                />
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {availableUsers.map(user => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedUsers.has(user.id)
                            ? 'bg-accent border-accent-foreground/20'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={(checked) => 
                            handleUserSelection(user.id, checked === true)
                          }
                        />
                        
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name || '', user.email)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {user.name || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )
            ) : (
              /* Users with Role View */
              filteredUsersWithRole.length === 0 ? (
                <EmptyState
                  title="No users found"
                  description={searchTerm ? "No users match your search criteria." : "No users have been assigned this role yet."}
                  action={
                    <Button onClick={() => setShowAssignUsers(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Assign Users
                    </Button>
                  }
                />
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Primary Role</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsersWithRole.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {getInitials(user.name || '', user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {user.name || 'Unnamed User'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm">
                              {user.user_roles?.[0]?.assigned_at && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(user.user_roles[0].assigned_at), { 
                                    addSuffix: true 
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRole(user.id)}
                              disabled={updating || role.system_role}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  )
}