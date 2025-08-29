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
import { Loader2 } from 'lucide-react'

interface RoleEditorProps {
  role: {
    id: string
    name: string
    description: string
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
    is_active: true
  })
  const { toast } = useToast()

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        is_active: role.is_active
      })
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true
      })
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Role name is required',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const url = role 
        ? `/api/admin/roles/${role.id}`
        : '/api/admin/roles'
      
      const method = role ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save role')
      }

      toast({
        title: 'Success',
        description: `Role ${role ? 'updated' : 'created'} successfully`
      })
      
      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save role',
        variant: 'destructive'
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
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Content Manager"
                disabled={loading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this role..."
                disabled={loading}
                rows={3}
              />
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