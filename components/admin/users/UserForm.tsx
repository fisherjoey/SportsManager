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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Mail, User, Shield, Key } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface User {
  id?: string
  name: string
  email: string
  role: string
  is_active?: boolean
}

interface UserFormProps {
  user: User | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserForm({ user, open, onClose, onSuccess }: UserFormProps) {
  const [loading, setSaving] = useState(false)
  const [formData, setFormData] = useState<User>({
    name: '',
    email: '',
    role: 'referee',
    is_active: true
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        is_active: user.is_active !== false
      })
      setPassword('')
      setConfirmPassword('')
      setSendWelcomeEmail(false)
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'referee',
        is_active: true
      })
      setPassword('')
      setConfirmPassword('')
      setSendWelcomeEmail(true)
    }
  }, [user])

  const validateForm = () => {
    if (!formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive'
      })
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      })
      return false
    }

    // Password validation for new users
    if (!user && !password) {
      toast({
        title: 'Validation Error',
        description: 'Password is required for new users',
        variant: 'destructive'
      })
      return false
    }

    if (password && password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      })
      return false
    }

    if (password && password !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setSaving(true)
    try {
      const payload: any = {
        ...formData,
        send_welcome_email: sendWelcomeEmail
      }

      if (password) {
        payload.password = password
      }

      if (user) {
        // Update existing user
        await apiClient.updateUser(user.id!, payload)
        toast({
          title: 'User Updated',
          description: `${formData.name || formData.email} has been updated successfully`
        })
      } else {
        // Create new user
        await apiClient.createUser(payload)
        toast({
          title: 'User Created',
          description: `${formData.name || formData.email} has been created successfully`
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save user'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? 'Update user information and permissions' 
              : 'Add a new user to the system'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              <User className="inline h-3 w-3 mr-1" />
              Full Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="inline h-3 w-3 mr-1" />
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              <Shield className="inline h-3 w-3 mr-1" />
              Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="assignor">Assignor</SelectItem>
                <SelectItem value="referee">Referee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(!user || password) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Key className="inline h-3 w-3 mr-1" />
                  Password {!user && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={user ? "Leave blank to keep current" : "Enter password"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  <Key className="inline h-3 w-3 mr-1" />
                  Confirm Password {!user && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="active" className="flex items-center">
              Account Active
            </Label>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {!user && (
            <div className="flex items-center justify-between">
              <Label htmlFor="welcome" className="flex items-center">
                Send Welcome Email
              </Label>
              <Switch
                id="welcome"
                checked={sendWelcomeEmail}
                onCheckedChange={setSendWelcomeEmail}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}