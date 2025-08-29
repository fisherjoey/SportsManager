"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Shield, Users, AlertCircle } from 'lucide-react'
import { RoleEditor } from './RoleEditor'
import { RoleCard } from './RoleCard'
import { PermissionMatrix } from './PermissionMatrix'

interface Role {
  id: string
  name: string
  description: string
  is_active: boolean
  user_count: number
  permission_count: number
  created_at: string
  updated_at: string
}

export function RoleManagementDashboard() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const { toast } = useToast()

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch roles')
      
      const data = await response.json()
      setRoles(data.roles || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

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

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete role')

      toast({
        title: 'Success',
        description: 'Role deleted successfully'
      })
      
      fetchRoles()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive'
      })
    }
  }

  const handleToggleStatus = async (role: Role) => {
    try {
      const response = await fetch(`/api/admin/roles/${role.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !role.is_active })
      })

      if (!response.ok) throw new Error('Failed to update role status')

      toast({
        title: 'Success',
        description: `Role ${role.is_active ? 'deactivated' : 'activated'} successfully`
      })
      
      fetchRoles()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update role status',
        variant: 'destructive'
      })
    }
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={handleEditRole}
                  onDelete={handleDeleteRole}
                  onToggleStatus={handleToggleStatus}
                  onManagePermissions={handleManagePermissions}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showEditor && (
        <RoleEditor
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
    </div>
  )
}