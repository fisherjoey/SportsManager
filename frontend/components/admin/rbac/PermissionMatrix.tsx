'use client'

import { useState, useEffect } from 'react'
import { Loader2, Shield, CheckSquare, Square } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface Permission {
  id: string
  name: string
  category: string
  description: string
}

interface PermissionMatrixProps {
  role: {
    id: string
    name: string
  }
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PermissionMatrix({ role, open, onClose, onSuccess }: PermissionMatrixProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (open && role) {
      fetchPermissionsAndRole()
    }
  }, [open, role])

  const fetchPermissionsAndRole = async () => {
    setLoading(true)
    try {
      // Fetch all permissions
      console.log('Fetching permissions...')
      const permData = await apiClient.getPermissions()
      console.log('Permissions response:', permData)
      
      const permissionsObj = permData.data?.permissions || {}
      console.log('Permissions object:', permissionsObj)
      
      // Convert object of categories to flat array of permissions
      const permissionsList: Permission[] = []
      const categoryList: string[] = []
      
      Object.keys(permissionsObj).forEach(category => {
        categoryList.push(category)
        permissionsObj[category].forEach((perm: Permission) => {
          permissionsList.push(perm)
        })
      })
      
      console.log('Processed permissions list:', permissionsList)
      console.log('Categories:', categoryList)
      
      setPermissions(permissionsList)
      setCategories(categoryList.sort())
      
      // Fetch role with current permissions
      console.log('Fetching role:', role.id)
      const roleData = await apiClient.getRole(role.id)
      console.log('Role data:', roleData)
      
      const rolePermissions = new Set(roleData.data?.role?.permissions?.map((p: Permission) => p.id) || [])
      console.log('Role permissions:', rolePermissions)
      setSelectedPermissions(rolePermissions)
      
    } catch (error) {
      console.error('Error in fetchPermissionsAndRole:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load permissions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
  }

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = permissions.filter(p => p.category === category)
    const allSelected = categoryPermissions.every(p => selectedPermissions.has(p.id))
    
    const newSelected = new Set(selectedPermissions)
    categoryPermissions.forEach(p => {
      if (allSelected) {
        newSelected.delete(p.id)
      } else {
        newSelected.add(p.id)
      }
    })
    setSelectedPermissions(newSelected)
  }

  const handleSave = async () => {
    // Validate that at least one permission is selected
    if (selectedPermissions.size === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one permission for this role',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    
    try {
      const response = await apiClient.assignPermissionsToRole(role.id, Array.from(selectedPermissions))

      if (!response.success) throw new Error('Failed to update permissions')

      toast({
        title: 'Success',
        description: 'Permissions updated successfully'
      })
      
      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update permissions',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions for {role.name}
          </DialogTitle>
          <DialogDescription>
            Select which permissions this role should have access to.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {categories.map(category => {
                const categoryPermissions = permissions.filter(p => p.category === category)
                const selectedCount = categoryPermissions.filter(p => selectedPermissions.has(p.id)).length
                const allSelected = selectedCount === categoryPermissions.length
                const someSelected = selectedCount > 0 && selectedCount < categoryPermissions.length
                
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => handleCategoryToggle(category)}
                        >
                          {allSelected ? (
                            <CheckSquare className="h-4 w-4 mr-2" />
                          ) : someSelected ? (
                            <Square className="h-4 w-4 mr-2 opacity-50" />
                          ) : (
                            <Square className="h-4 w-4 mr-2" />
                          )}
                        </Button>
                        <h3 className="font-medium capitalize">{category}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {selectedCount}/{categoryPermissions.length}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                      {categoryPermissions.map(permission => (
                        <div key={permission.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.has(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          <div className="space-y-1">
                            <label
                              htmlFor={permission.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {permission.name}
                            </label>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selectedPermissions.size === 0 && (
                <span className="text-destructive">
                  Select at least one permission
                </span>
              )}
              {selectedPermissions.size > 0 && (
                <span>
                  {selectedPermissions.size} permission{selectedPermissions.size !== 1 ? 's' : ''} selected
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
                disabled={loading || saving || selectedPermissions.size === 0}
                title={selectedPermissions.size === 0 ? 'Please select at least one permission' : ''}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}