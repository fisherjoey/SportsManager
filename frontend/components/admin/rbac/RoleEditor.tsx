'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface RoleEditorProps {
  role: {
    id: string
    name: string
    description: string
    color?: string
    is_active: boolean
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RoleEditor({ role, open, onClose, onSuccess }: RoleEditorProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
    is_active: true
  })
  const { toast } = useToast()

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        color: role.color || '#6B7280',
        is_active: role.is_active
      })
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#6B7280',
        is_active: true
      })
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const errors: string[] = []
    
    if (!formData.name.trim()) {
      errors.push('Role name is required')
    }
    
    if (formData.name.trim().length < 2) {
      errors.push('Role name must be at least 2 characters')
    }
    
    if (!formData.description.trim()) {
      errors.push('Role description is recommended for clarity')
    }
    
    if (errors.length > 0) {
      toast({
        title: '⚠️ Validation Issues',
        description: (
          <div className="mt-2 space-y-1">
            {errors.map((error, i) => (
              <div key={i} className="text-sm">• {error}</div>
            ))}
          </div>
        ) as any,
        variant: errors.some(e => !e.includes('recommended')) ? 'destructive' : 'default',
        duration: 5000
      })
      
      // Only return if there are actual errors (not just recommendations)
      if (errors.some(e => !e.includes('recommended'))) {
        return
      }
    }

    setLoading(true)

    try {
      const response = role 
        ? await apiClient.updateRole(role.id, formData)
        : await apiClient.createRole(formData)

      if (!response.success) {
        throw new Error(response.error || 'Failed to save role')
      }

      toast({
        title: '✅ Success',
        description: `Role "${formData.name}" has been ${role ? 'updated' : 'created'} successfully`,
        duration: 3000
      })
      
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save role'
      toast({
        title: '❌ Operation Failed',
        description: (
          <div className="mt-2">
            <div className="font-semibold">Unable to {role ? 'update' : 'create'} role</div>
            <div className="text-sm mt-1">{errorMessage}</div>
          </div>
        ) as any,
        variant: 'destructive',
        duration: 6000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{role ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {role ? 'Update the role details below.' : 'Enter the details for the new role.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Role Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Content Manager"
                disabled={loading}
                required
                className={!formData.name.trim() && formData.name !== '' ? 'border-red-500' : ''}
              />
              {formData.name !== '' && !formData.name.trim() && (
                <p className="text-xs text-red-500">Role name cannot be empty</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="flex items-center gap-1">
                Description
                <span className="text-muted-foreground text-xs ml-1">(Recommended)</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this role..."
                disabled={loading}
                rows={3}
              />
              {!formData.description.trim() && (
                <p className="text-xs text-muted-foreground">
                  Adding a description helps other administrators understand this role's purpose
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Role Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 rounded border border-input bg-background cursor-pointer disabled:cursor-not-allowed"
                  disabled={loading}
                />
                <div className="flex items-center gap-2">
                  <div 
                    className="h-6 w-6 rounded-full border border-border" 
                    style={{ backgroundColor: formData.color }}
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6B7280"
                    className="w-24 font-mono text-sm"
                    disabled={loading}
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This color will be used for role badges in user lists
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active Status</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {role ? 'Update' : 'Create'} Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}