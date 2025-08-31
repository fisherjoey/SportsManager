'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Search, Loader2, Users, UserPlus, UserMinus, Mail } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role?: string
  hasRole?: boolean
}

interface UserRoleManagerProps {
  role: {
    id: string
    name: string
    description?: string
  }
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserRoleManager({ role, open, onClose, onSuccess }: UserRoleManagerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [currentRoleUsers, setCurrentRoleUsers] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    if (open && role) {
      fetchUsersAndRoleMembers()
    }
  }, [open, role])

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

  const fetchUsersAndRoleMembers = async () => {
    setLoading(true)
    try {
      // Fetch all users
      const usersResponse = await apiClient.getUsers()
      const allUsers = usersResponse.data?.users || []

      // Fetch users with this role
      const roleUsersResponse = await apiClient.getRoleUsers(role.id)
      const roleUsers = roleUsersResponse.data?.users || []
      
      // Create a set of user IDs that have this role
      const roleUserIds = new Set(roleUsers.map((u: any) => u.id))
      
      // Mark users that already have this role
      const usersWithRoleInfo = allUsers.map((user: any) => ({
        ...user,
        hasRole: roleUserIds.has(user.id)
      }))
      
      setUsers(usersWithRoleInfo)
      setCurrentRoleUsers(roleUserIds)
      setSelectedUsers(new Set(roleUserIds))
      
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      // Deselect all
      setSelectedUsers(new Set())
    } else {
      // Select all filtered users
      const allUserIds = new Set(filteredUsers.map(u => u.id))
      setSelectedUsers(allUserIds)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // Determine which users to add and remove
      const usersToAdd: string[] = []
      const usersToRemove: string[] = []
      
      // Find users to add (selected but not currently in role)
      selectedUsers.forEach(userId => {
        if (!currentRoleUsers.has(userId)) {
          usersToAdd.push(userId)
        }
      })
      
      // Find users to remove (currently in role but not selected)
      currentRoleUsers.forEach(userId => {
        if (!selectedUsers.has(userId)) {
          usersToRemove.push(userId)
        }
      })
      
      // Execute changes
      const promises = []
      
      if (usersToAdd.length > 0) {
        // Add users to role
        for (const userId of usersToAdd) {
          promises.push(apiClient.addRolesToUser(userId, [role.id]))
        }
      }
      
      if (usersToRemove.length > 0) {
        // Remove users from role
        for (const userId of usersToRemove) {
          promises.push(apiClient.removeRolesFromUser(userId, [role.id]))
        }
      }
      
      if (promises.length > 0) {
        await Promise.all(promises)
        
        toast({
          title: 'Success',
          description: `Updated users for role ${role.name}`,
        })
        
        onSuccess()
      } else {
        toast({
          title: 'No Changes',
          description: 'No changes were made to user assignments',
        })
      }
      
    } catch (error) {
      console.error('Error updating user roles:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user roles',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    // Check if there are any differences between current and selected
    if (selectedUsers.size !== currentRoleUsers.size) return true
    
    for (const userId of selectedUsers) {
      if (!currentRoleUsers.has(userId)) return true
    }
    
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Users for {role.name}
          </DialogTitle>
          <DialogDescription>
            Add or remove users from this role. Users with this role will inherit all associated permissions.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Search and Actions Bar */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              {/* Selection Summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                </span>
                {hasChanges() && (
                  <Badge variant="outline" className="text-xs">
                    Unsaved changes
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Users List */}
            <ScrollArea className="h-[400px] border rounded-md">
              <div className="p-4 space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </p>
                ) : (
                  filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                        selectedUsers.has(user.id)
                          ? 'bg-accent border-accent-foreground/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{user.name}</span>
                          {currentRoleUsers.has(user.id) && (
                            <Badge variant="secondary" className="text-xs">
                              Current member
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        {user.role && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Legacy role: {user.role}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        {selectedUsers.has(user.id) && !currentRoleUsers.has(user.id) && (
                          <Badge variant="default" className="text-xs">
                            <UserPlus className="h-3 w-3 mr-1" />
                            To add
                          </Badge>
                        )}
                        {!selectedUsers.has(user.id) && currentRoleUsers.has(user.id) && (
                          <Badge variant="destructive" className="text-xs">
                            <UserMinus className="h-3 w-3 mr-1" />
                            To remove
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {hasChanges() && (
                <span>
                  {Array.from(selectedUsers).filter(id => !currentRoleUsers.has(id)).length} to add,{' '}
                  {Array.from(currentRoleUsers).filter(id => !selectedUsers.has(id)).length} to remove
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || saving || !hasChanges()}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}