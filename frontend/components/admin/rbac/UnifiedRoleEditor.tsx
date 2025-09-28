"use client"

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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Shield, Users, Settings } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

interface UnifiedRoleEditorProps {
  role: {
    id?: string
    name: string
    description?: string
    permissions?: string[]
    userCount?: number
    color?: string
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// Available permissions grouped by resource
const PERMISSION_GROUPS = {
  'User Management': [
    { id: 'user:view', label: 'View users' },
    { id: 'user:view:list', label: 'View user list' },
    { id: 'user:view:details', label: 'View user details' },
    { id: 'user:create', label: 'Create users' },
    { id: 'user:update', label: 'Update users' },
    { id: 'user:delete', label: 'Delete users' },
    { id: 'user:view:roles', label: 'View user roles' },
    { id: 'user:manage', label: 'Manage all user operations' },
  ],
  'Role Management': [
    { id: 'role:view', label: 'View roles' },
    { id: 'role:view:list', label: 'View role list' },
    { id: 'role:view:details', label: 'View role details' },
    { id: 'role:create', label: 'Create roles' },
    { id: 'role:update', label: 'Update roles' },
    { id: 'role:delete', label: 'Delete roles' },
    { id: 'role:manage', label: 'Manage all role operations' },
  ],
  'Game Management': [
    { id: 'game:view', label: 'View games' },
    { id: 'game:view:list', label: 'View game list' },
    { id: 'game:view:details', label: 'View game details' },
    { id: 'game:create', label: 'Create games' },
    { id: 'game:update', label: 'Update games' },
    { id: 'game:delete', label: 'Delete games' },
    { id: 'game:manage', label: 'Manage all game operations' },
  ],
  'Assignment Management': [
    { id: 'assignment:view', label: 'View assignments' },
    { id: 'assignment:view:list', label: 'View assignment list' },
    { id: 'assignment:view:details', label: 'View assignment details' },
    { id: 'assignment:create', label: 'Create assignments' },
    { id: 'assignment:update', label: 'Update assignments' },
    { id: 'assignment:delete', label: 'Delete assignments' },
    { id: 'assignment:self', label: 'Self-assign to games' },
  ],
  'Referee Management': [
    { id: 'referee:view', label: 'View referees' },
    { id: 'referee:view:list', label: 'View referee list' },
    { id: 'referee:view:details', label: 'View referee details' },
    { id: 'referee:create', label: 'Create referee profiles' },
    { id: 'referee:update', label: 'Update referee profiles' },
    { id: 'referee:delete', label: 'Delete referee profiles' },
    { id: 'referee:evaluate', label: 'Evaluate referees' },
  ],
  'System Administration': [
    { id: 'system:admin', label: 'Full system administration' },
    { id: 'system:manage', label: 'Manage system settings' },
    { id: 'system:view:logs', label: 'View system logs' },
    { id: 'system:view:audit', label: 'View audit logs' },
    { id: 'cerbos_policy:view', label: 'View Cerbos policies' },
    { id: 'cerbos_policy:manage', label: 'Manage Cerbos policies' },
    { id: 'organization:manage', label: 'Manage organization settings' },
  ],
}

export function UnifiedRoleEditor({ role, open, onClose, onSuccess }: UnifiedRoleEditorProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
  })
  const [permissions, setPermissions] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        color: role.color || '#6B7280',
      })
      setPermissions(role.permissions || [])
      // Expand groups that have selected permissions
      const groupsToExpand = new Set<string>()
      for (const [group, perms] of Object.entries(PERMISSION_GROUPS)) {
        if (perms.some(p => role.permissions?.includes(p.id))) {
          groupsToExpand.add(group)
        }
      }
      setExpandedGroups(groupsToExpand)
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#6B7280',
      })
      setPermissions([])
      setExpandedGroups(new Set())
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role name is required',
        variant: 'destructive'
      })
      return
    }

    // Validate role name format only for new roles
    if (!role && !/^[a-z_]+$/.test(formData.name)) {
      toast({
        title: 'Invalid Role Name',
        description: 'Role name must be lowercase with underscores only (e.g., super_admin)',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      if (role) {
        // Update existing role - don't send name field since it shouldn't change
        const payload = {
          description: formData.description || `${formData.name} role`,
          permissions,
          color: formData.color
        }

        // Use ID if available, otherwise use name
        await apiClient.updateUnifiedRole(role.id || role.name, payload)
        toast({
          title: 'Role Updated',
          description: `Successfully updated role "${formData.name}" with ${permissions.length} permissions`,
          duration: 3000
        })
      } else {
        // Create new role - include name field and validate format
        const payload = {
          name: formData.name,
          description: formData.description || `${formData.name} role`,
          permissions,
          color: formData.color
        }

        await apiClient.createUnifiedRole(payload)
        toast({
          title: 'Role Created',
          description: `Successfully created role "${formData.name}" with ${permissions.length} permissions`,
          duration: 3000
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save role'
      toast({
        title: 'Operation Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 6000
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    )
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(group)) {
        newSet.delete(group)
      } else {
        newSet.add(group)
      }
      return newSet
    })
  }

  const selectAllInGroup = (group: string) => {
    const groupPermissions = PERMISSION_GROUPS[group as keyof typeof PERMISSION_GROUPS]
    const allGroupPermIds = groupPermissions.map(p => p.id)
    const hasAll = allGroupPermIds.every(id => permissions.includes(id))

    if (hasAll) {
      // Deselect all in group
      setPermissions(prev => prev.filter(p => !allGroupPermIds.includes(p)))
    } else {
      // Select all in group
      setPermissions(prev => [...new Set([...prev, ...allGroupPermIds])])
    }
  }

  const getGroupSelectionState = (group: string) => {
    const groupPermissions = PERMISSION_GROUPS[group as keyof typeof PERMISSION_GROUPS]
    const selectedCount = groupPermissions.filter(p => permissions.includes(p.id)).length

    if (selectedCount === 0) return 'none'
    if (selectedCount === groupPermissions.length) return 'all'
    return 'some'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {role ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              Define the role and its permissions. These settings control what users with this role can do.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">
                <Settings className="h-4 w-4 mr-2" />
                Role Details
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <Shield className="h-4 w-4 mr-2" />
                Permissions ({permissions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Role Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    // Only sanitize for new roles
                    if (!role) {
                      setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z_]/g, '_') })
                    } else {
                      setFormData({ ...formData, name: e.target.value })
                    }
                  }}
                  placeholder={role ? "" : "e.g., super_admin, referee_coordinator"}
                  disabled={loading || !!role}
                  required
                />
                {!role && (
                  <p className="text-xs text-muted-foreground">
                    Use lowercase with underscores. This cannot be changed later.
                  </p>
                )}
                {role && (
                  <p className="text-xs text-muted-foreground">
                    Role name cannot be changed after creation.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this role is for and who should have it..."
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Display Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 rounded border border-input bg-background cursor-pointer"
                    disabled={loading}
                  />
                  <Badge style={{ backgroundColor: formData.color }}>
                    Preview
                  </Badge>
                </div>
              </div>

              {role && role.userCount !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Currently assigned to <strong>{role.userCount}</strong> user{role.userCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="permissions" className="mt-4">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-4">
                  {Object.entries(PERMISSION_GROUPS).map(([group, groupPermissions]) => {
                    const isExpanded = expandedGroups.has(group)
                    const selectionState = getGroupSelectionState(group)

                    return (
                      <div key={group} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group)}
                            className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                          >
                            <span className="text-sm">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            {group}
                            <Badge variant="outline" className="ml-1">
                              {groupPermissions.filter(p => permissions.includes(p.id)).length}/{groupPermissions.length}
                            </Badge>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => selectAllInGroup(group)}
                            className="text-xs"
                          >
                            {selectionState === 'all' ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="ml-6 space-y-2">
                            {groupPermissions.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded-md transition-colors"
                              >
                                <Checkbox
                                  checked={permissions.includes(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                  disabled={loading}
                                />
                                <div className="flex-1">
                                  <span className="text-sm">{permission.label}</span>
                                  <code className="ml-2 text-xs text-muted-foreground">
                                    {permission.id}
                                  </code>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{permissions.length}</strong> permission{permissions.length !== 1 ? 's' : ''} selected.
                  These permissions define what users with this role can do in the system.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (!role && !formData.name)}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {role ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}