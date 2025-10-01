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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Shield, AlertCircle, Info } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface CerbosRoleEditorProps {
  role: {
    id?: string
    name: string
    description?: string
    parentRoles?: string[]
    isDatabase?: boolean
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CerbosRoleEditor({ role, open, onClose, onSuccess }: CerbosRoleEditorProps) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'database' | 'cerbos'>('database')
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentRoles: [] as string[],
    color: '#6B7280',
    is_active: true
  })
  const [permissions, setPermissions] = useState<string[]>([])
  const [availablePermissions] = useState([
    // User management
    'user:view', 'user:view:list', 'user:view:details', 'user:create', 'user:update', 'user:delete',
    // Role management
    'role:view', 'role:view:list', 'role:view:details', 'role:create', 'role:update', 'role:delete',
    // Game management
    'game:view', 'game:view:list', 'game:view:details', 'game:create', 'game:update', 'game:delete',
    // Assignment management
    'assignment:view', 'assignment:view:list', 'assignment:view:details',
    'assignment:create', 'assignment:update', 'assignment:delete',
    // Referee management
    'referee:view', 'referee:view:list', 'referee:view:details',
    'referee:create', 'referee:update', 'referee:delete',
    // System management
    'system:admin', 'system:manage', 'system:view:logs', 'system:view:audit',
    // Cerbos policy management
    'cerbos_policy:view', 'cerbos_policy:create', 'cerbos_policy:update',
    'cerbos_policy:delete', 'cerbos_policy:manage'
  ])

  const { toast } = useToast()

  useEffect(() => {
    const fetchAvailableRoles = async () => {
      try {
        const response = await apiClient.getUserRoles()
        if (response?.data?.roles) {
          setAvailableRoles(response.data.roles.map(r => r.name))
        }
      } catch (error) {
        console.error('Failed to fetch available roles:', error)
      }
    }
    fetchAvailableRoles()
  }, [])

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        parentRoles: role.parentRoles || [],
        color: '#6B7280',
        is_active: true
      })
      setMode(role.isDatabase ? 'database' : 'cerbos')

      // Fetch permissions if editing a Cerbos role
      if (!role.isDatabase && role.name) {
        fetchRolePermissions(role.name)
      }
    } else {
      setFormData({
        name: '',
        description: '',
        parentRoles: [],
        color: '#6B7280',
        is_active: true
      })
      setPermissions([])
    }
  }, [role])

  const fetchRolePermissions = async (roleName: string) => {
    try {
      const response = await apiClient.getRolePermissionsFromCerbos(roleName)
      if (response?.data?.permissions) {
        setPermissions(response.data.permissions)
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error)
    }
  }

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

    setLoading(true)

    try {
      if (mode === 'database') {
        // Handle database role (just metadata)
        const response = role
          ? await apiClient.updateRole(role.id!, formData)
          : await apiClient.createRole(formData)

        if (!response.success) {
          throw new Error(response.error || 'Failed to save role')
        }

        toast({
          title: 'Success',
          description: `Database role "${formData.name}" has been ${role ? 'updated' : 'created'}. Note: This only creates a role label. To set permissions, use Cerbos mode.`,
          duration: 5000
        })
      } else {
        // Handle Cerbos policy role
        if (role && role.name !== formData.name) {
          // If renaming, we need to delete old and create new
          await apiClient.deleteCerbosRole(role.name)
        }

        // Create or update Cerbos role
        const cerbosRoleData = {
          name: formData.name,
          parentRoles: formData.parentRoles,
          condition: undefined // Could add condition support later
        }

        if (role && role.name === formData.name) {
          await apiClient.updateCerbosRole(role.name, cerbosRoleData)
        } else {
          await apiClient.createCerbosRole(cerbosRoleData)
        }

        // Update permissions if any were selected
        if (permissions.length > 0) {
          await apiClient.updateRolePermissionsInCerbos(formData.name, permissions)
        }

        toast({
          title: 'Success',
          description: `Cerbos policy role "${formData.name}" has been ${role ? 'updated' : 'created'} with ${permissions.length} permissions.`,
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

  const togglePermission = (permission: string) => {
    setPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{role ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {role ? 'Update the role configuration.' : 'Configure a new role with permissions.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Role Management Mode</AlertTitle>
              <AlertDescription>
                <strong>Database Mode:</strong> Creates role labels stored in the database (for user assignment).<br/>
                <strong>Cerbos Mode:</strong> Manages actual permission policies in Cerbos (defines what roles can do).
              </AlertDescription>
            </Alert>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'database' | 'cerbos')} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="database">Database Role</TabsTrigger>
              <TabsTrigger value="cerbos">Cerbos Policy</TabsTrigger>
            </TabsList>

            <TabsContent value="database" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="db-name">Role Name <span className="text-red-500">*</span></Label>
                <Input
                  id="db-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Content Manager"
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="db-description">Description</Label>
                <Textarea
                  id="db-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this role..."
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="db-color">Role Color</Label>
                <input
                  type="color"
                  id="db-color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 rounded border border-input bg-background cursor-pointer"
                  disabled={loading}
                />
              </div>

              <Alert className="border-orange-500 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Database roles are just labels</AlertTitle>
                <AlertDescription className="text-orange-700">
                  This creates a role in the database that can be assigned to users,
                  but it doesn't grant any permissions. To define what this role can do,
                  you need to create or update the corresponding Cerbos policy.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="cerbos" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="cerbos-name">Role Name <span className="text-red-500">*</span></Label>
                <Input
                  id="cerbos-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., admin, referee, assignor"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This should match a database role name for proper integration
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="parent-roles">Parent Roles</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !formData.parentRoles.includes(value)) {
                      setFormData({ ...formData, parentRoles: [...formData.parentRoles, value] })
                    }
                  }}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent roles (inherits permissions)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.filter(r => r !== formData.name).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.parentRoles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          parentRoles: formData.parentRoles.filter(r => r !== role)
                        })}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {availablePermissions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          disabled={loading}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {permissions.length} permissions
                </p>
              </div>

              <Alert className="border-green-500 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Cerbos Policy Configuration</AlertTitle>
                <AlertDescription className="text-green-700">
                  This will create or update the actual permission policy in Cerbos.
                  These permissions determine what actions users with this role can perform.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {role ? 'Update' : 'Create'} {mode === 'database' ? 'Database Role' : 'Cerbos Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}