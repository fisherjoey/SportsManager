"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Shield, Users, AlertCircle } from 'lucide-react'
import { UnifiedRoleEditor } from './UnifiedRoleEditor'
import { RoleCard } from './RoleCard'
import { PermissionMatrix } from './PermissionMatrix'
import { UserRoleManager } from './UserRoleManager'
import { apiClient } from '@/lib/api'

interface Role {
  id: string
  name: string
  description: string
  color?: string
  is_active: boolean
  user_count: number
  permission_count: number
  pages?: string[]
  created_at: string
  updated_at: string
}

export function RoleManagementDashboard() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [showUsers, setShowUsers] = useState(false)
  const [showInactive, setShowInactive] = useState(true)
  const { toast } = useToast()

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles from /api/admin/unified-roles');
      console.log('Token:', localStorage.getItem('auth_token')?.substring(0, 20) + '...');

      // Fetch all unified roles (includes permissions from Cerbos)
      const data = await apiClient.getUnifiedRoles()
      console.log('Unified roles data:', data);

      // Transform unified roles to match existing role structure
      const rolesArray = data.data?.roles || data.roles || [];
      console.log('Roles array to transform:', rolesArray);

      const transformedRoles = rolesArray.map(role => ({
        ...role,
        id: role.id || role.name, // Use actual ID if available, otherwise use name
        is_active: role.is_active !== undefined ? role.is_active : true, // Keep existing is_active if present
        user_count: role.user_count || role.userCount || 0,
        permission_count: role.permission_count || role.permissionCount || 0 // Add permission_count field
      }))

      console.log('Transformed roles:', transformedRoles);
      setRoles(transformedRoles)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load roles'
      toast({
        title: '❌ Failed to Load Roles',
        description: (
          <div className="mt-2">
            <div className="text-sm">{errorMessage}</div>
            {errorMessage.includes('401') && (
              <div className="text-xs mt-2">Your session may have expired. Please log in again.</div>
            )}
            {errorMessage.includes('403') && (
              <div className="text-xs mt-2">You don't have permission to view roles.</div>
            )}
          </div>
        ) as any,
        variant: 'destructive',
        duration: 6000
      })
    } finally {
      setLoading(false)
    }
  }

  // In unified system, all roles are considered active
  const activeRoles = roles
  const inactiveRoles: any[] = [] // No inactive roles in unified system

  useEffect(() => {
    fetchRoles()
  }, [])

  const handleCreateRole = () => {
    setSelectedRole(null)
    setShowEditor(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setShowEditor(true)
  }

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role)
    setShowPermissions(true)
  }

  const handleManageUsers = (role: Role) => {
    setSelectedRole(role)
    setShowUsers(true)
  }

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId)
    if (!roleToDelete) return

    if (!confirm(`Are you sure you want to delete the "${roleToDelete.name}" role?\n\nThis action cannot be undone.`)) return

    try {
      const response = await apiClient.deleteUnifiedRole(roleToDelete.name)

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to delete role')
      }

      toast({
        title: '✅ Role Deleted',
        description: `"${roleToDelete.name}" has been permanently deleted`,
        duration: 3000
      })
      
      fetchRoles()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete role'
      toast({
        title: '❌ Deletion Failed',
        description: (
          <div className="mt-2">
            <div className="font-semibold">Unable to delete "{roleToDelete.name}"</div>
            <div className="text-sm mt-1">{errorMessage}</div>
            {errorMessage.includes('assigned to') && (
              <div className="text-xs mt-2">Remove all users from this role before deleting</div>
            )}
          </div>
        ) as any,
        variant: 'destructive',
        duration: 6000
      })
    }
  }

  const handleToggleStatus = async (role: Role) => {
    // Status toggling is not applicable in unified role system
    // Roles either exist with permissions or they don't
    toast({
      title: 'ℹ️ Information',
      description: 'Role status is managed through permissions. Edit the role to modify its permissions.',
      duration: 4000
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Manage user roles and their permissions
              </CardDescription>
            </div>
            <Button onClick={handleCreateRole}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No roles found</p>
              <Button onClick={handleCreateRole} className="mt-4">
                Create Your First Role
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Roles Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  Active Roles
                  <Badge variant="default">{activeRoles.length}</Badge>
                </h3>
                {activeRoles.length === 0 ? (
                  <p className="text-muted-foreground">No active roles</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeRoles.map(role => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        onEdit={handleEditRole}
                        onDelete={handleDeleteRole}
                        onToggleStatus={handleToggleStatus}
                        onManagePermissions={handleManagePermissions}
                        onManageUsers={handleManageUsers}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive Roles Section */}
              {inactiveRoles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Inactive Roles
                      <Badge variant="secondary">{inactiveRoles.length}</Badge>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInactive(!showInactive)}
                    >
                      {showInactive ? 'Hide' : 'Show'} Inactive
                    </Button>
                  </div>
                  {showInactive && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
                      {inactiveRoles.map(role => (
                        <RoleCard
                          key={role.id}
                          role={role}
                          onEdit={handleEditRole}
                          onDelete={handleDeleteRole}
                          onToggleStatus={handleToggleStatus}
                          onManagePermissions={handleManagePermissions}
                          onManageUsers={handleManageUsers}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showEditor && (
        <UnifiedRoleEditor
          role={selectedRole}
          open={showEditor}
          onClose={() => setShowEditor(false)}
          onSuccess={() => {
            setShowEditor(false)
            fetchRoles()
          }}
        />
      )}

      {showPermissions && selectedRole && (
        <PermissionMatrix
          role={selectedRole}
          open={showPermissions}
          onClose={() => setShowPermissions(false)}
          onSuccess={() => {
            setShowPermissions(false)
            fetchRoles()
          }}
        />
      )}

      {showUsers && selectedRole && (
        <UserRoleManager
          role={selectedRole}
          open={showUsers}
          onClose={() => {
            setShowUsers(false)
            setSelectedRole(null) // Clear selected role when closing
          }}
          onSuccess={() => {
            setShowUsers(false)
            setSelectedRole(null) // Clear selected role after success
            fetchRoles()
          }}
        />
      )}
    </div>
  )
}