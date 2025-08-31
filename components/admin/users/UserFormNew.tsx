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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Mail, User, Shield, Key, Check, X } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Role {
  id: string
  name: string
  description?: string
}

interface User {
  id?: string
  name: string
  email: string
  role?: string  // Legacy
  roles?: Role[]
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
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [rolesOpen, setRolesOpen] = useState(false)
  const [formData, setFormData] = useState<User>({
    name: '',
    email: '',
    is_active: true
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)
  const { toast } = useToast()

  // Fetch available roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await apiClient.getUserRoles()
        console.log('Roles response:', response)
        // The response structure is { success, data: { roles: [...] } }
        const roles = response?.data?.roles || response?.roles || []
        console.log('Extracted roles:', roles)
        setAvailableRoles(roles)
      } catch (error) {
        console.error('Failed to fetch roles:', error)
        // Try fallback to direct fetch
        try {
          const token = localStorage.getItem('auth_token')
          const fallbackResponse = await fetch('http://localhost:3001/api/users/roles', {
            headers: { Authorization: `Bearer ${token}` }
          })
          const data = await fallbackResponse.json()
          console.log('Fallback response:', data)
          if (data.data?.roles) {
            setAvailableRoles(data.data.roles)
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
        }
      }
    }
    fetchRoles()
  }, [])

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name || '',
        email: user.email,
        is_active: user.is_active !== false
      })
      // Set selected roles from user's current roles
      if (user.roles && user.roles.length > 0) {
        setSelectedRoles(user.roles.map(r => r.id))
      } else {
        setSelectedRoles([])
      }
      setPassword('')
      setConfirmPassword('')
      setSendWelcomeEmail(false)
    } else {
      setFormData({
        name: '',
        email: '',
        is_active: true
      })
      setSelectedRoles([])
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

    // Password match validation
    if (password && password !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return false
    }

    // Role validation
    if (selectedRoles.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one role',
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSaving(true)
    
    try {
      const payload: any = {
        ...formData,
        roles: selectedRoles,  // Send role IDs
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

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const getSelectedRoleNames = () => {
    return selectedRoles
      .map(id => availableRoles.find(r => r.id === id)?.name)
      .filter(Boolean)
      .join(', ')
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
              ? 'Update user information and roles' 
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
            <Label>
              <Shield className="inline h-3 w-3 mr-1" />
              Roles <span className="text-destructive">*</span>
            </Label>
            <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={rolesOpen}
                  className="w-full justify-between"
                >
                  {selectedRoles.length > 0 
                    ? getSelectedRoleNames()
                    : "Select roles..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search roles..." />
                  <CommandEmpty>No role found.</CommandEmpty>
                  <CommandGroup>
                    {availableRoles.map((role) => (
                      <CommandItem
                        key={role.id}
                        onSelect={() => toggleRole(role.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedRoles.includes(role.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{role.name}</div>
                          {role.description && (
                            <div className="text-sm text-muted-foreground">{role.description}</div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedRoles.map(roleId => {
                const role = availableRoles.find(r => r.id === roleId)
                if (!role) return null
                return (
                  <Badge key={roleId} variant="secondary">
                    {role.name}
                    <button
                      type="button"
                      onClick={() => toggleRole(roleId)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
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