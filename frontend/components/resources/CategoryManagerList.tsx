'use client'

import React, { useState, useEffect } from 'react'
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon, 
  Mail,
  Phone,
  Clock,
  Shield,
  Crown,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download
} from 'lucide-react'
import { format, addDays } from 'date-fns'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DataTable } from '@/components/data-table/DataTable'
import { cn } from '@/lib/utils'


interface CategoryManager {
  id: string
  name: string
  email: string
  phone?: string
  role: 'owner' | 'manager' | 'contributor'
  avatar?: string
  joinedAt: string
  lastActive: string
  expiresAt?: string
  status: 'active' | 'inactive' | 'pending'
  permissions: string[]
  invitedBy?: string
}

interface CategoryManagerListProps {
  categoryId: string
  categoryName: string
  className?: string
  canManageManagers?: boolean
}

const ROLE_PERMISSIONS = {
  owner: ['read', 'write', 'delete', 'manage_permissions', 'manage_managers', 'export'],
  manager: ['read', 'write', 'delete', 'manage_permissions', 'export'],
  contributor: ['read', 'write']
}

const ROLE_DESCRIPTIONS = {
  owner: 'Full control over the category including manager assignment',
  manager: 'Can manage resources and permissions but not other managers',
  contributor: 'Can view and add resources but cannot manage permissions'
}

export function CategoryManagerList({ categoryId, categoryName, className, canManageManagers = true }: CategoryManagerListProps) {
  const [managers, setManagers] = useState<CategoryManager[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])
  
  // Dialog states
  const [showAddManager, setShowAddManager] = useState(false)
  const [showEditManager, setShowEditManager] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentManager, setCurrentManager] = useState<CategoryManager | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    role: 'contributor' as CategoryManager['role'],
    expiresAt: undefined as Date | undefined,
    message: ''
  })

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadManagers = async () => {
      // Simulate API call
      setTimeout(() => {
        setManagers([
          {
            id: '1',
            name: 'John Smith',
            email: 'john@example.com',
            phone: '+1 (555) 123-4567',
            role: 'owner',
            avatar: '/avatars/john.jpg',
            joinedAt: '2024-01-15',
            lastActive: '2 hours ago',
            status: 'active',
            permissions: ROLE_PERMISSIONS.owner,
            invitedBy: 'System'
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            phone: '+1 (555) 234-5678',
            role: 'manager',
            avatar: '/avatars/sarah.jpg',
            joinedAt: '2024-02-20',
            lastActive: '1 day ago',
            expiresAt: '2024-12-31',
            status: 'active',
            permissions: ROLE_PERMISSIONS.manager,
            invitedBy: 'John Smith'
          },
          {
            id: '3',
            name: 'Mike Wilson',
            email: 'mike@example.com',
            role: 'contributor',
            joinedAt: '2024-03-10',
            lastActive: '3 days ago',
            status: 'active',
            permissions: ROLE_PERMISSIONS.contributor,
            invitedBy: 'Sarah Johnson'
          },
          {
            id: '4',
            name: 'Lisa Davis',
            email: 'lisa@example.com',
            role: 'manager',
            joinedAt: '2024-08-01',
            lastActive: 'Never',
            status: 'pending',
            permissions: ROLE_PERMISSIONS.manager,
            invitedBy: 'John Smith'
          },
          {
            id: '5',
            name: 'Tom Brown',
            email: 'tom@example.com',
            role: 'contributor',
            joinedAt: '2024-07-15',
            lastActive: '2 weeks ago',
            expiresAt: '2024-09-15',
            status: 'inactive',
            permissions: ROLE_PERMISSIONS.contributor,
            invitedBy: 'Sarah Johnson'
          }
        ])
        setIsLoading(false)
      }, 1000)
    }

    loadManagers()
  }, [categoryId])

  const filteredManagers = managers.filter(manager => {
    const matchesSearch = manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         manager.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || manager.role === roleFilter
    const matchesStatus = statusFilter === 'all' || manager.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleIcon = (role: string) => {
    switch (role) {
    case 'owner':
      return <Crown className="h-4 w-4 text-yellow-600" />
    case 'manager':
      return <Shield className="h-4 w-4 text-blue-600" />
    case 'contributor':
      return <User className="h-4 w-4 text-green-600" />
    default:
      return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
    case 'owner':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'manager':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'contributor':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'inactive':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'pending':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    default:
      return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'inactive':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const handleAddManager = async () => {
    // Simulate API call
    const newManager: CategoryManager = {
      id: Date.now().toString(),
      name: 'New Manager',
      email: formData.email,
      role: formData.role,
      joinedAt: new Date().toISOString().split('T')[0],
      lastActive: 'Never',
      expiresAt: formData.expiresAt?.toISOString().split('T')[0],
      status: 'pending',
      permissions: ROLE_PERMISSIONS[formData.role],
      invitedBy: 'Current User'
    }
    
    setManagers(prev => [...prev, newManager])
    setShowAddManager(false)
    setFormData({ email: '', role: 'contributor', expiresAt: undefined, message: '' })
  }

  const handleEditManager = async () => {
    if (!currentManager) return
    
    // Simulate API call
    setManagers(prev => prev.map(manager => 
      manager.id === currentManager.id 
        ? { 
          ...manager, 
          role: formData.role,
          expiresAt: formData.expiresAt?.toISOString().split('T')[0],
          permissions: ROLE_PERMISSIONS[formData.role]
        }
        : manager
    ))
    
    setShowEditManager(false)
    setCurrentManager(null)
  }

  const handleDeleteManager = async () => {
    if (!currentManager) return
    
    // Simulate API call
    setManagers(prev => prev.filter(manager => manager.id !== currentManager.id))
    setShowDeleteConfirm(false)
    setCurrentManager(null)
  }

  const handleBulkDelete = async () => {
    // Simulate API call
    setManagers(prev => prev.filter(manager => !selectedManagers.includes(manager.id)))
    setSelectedManagers([])
  }

  const openEditDialog = (manager: CategoryManager) => {
    setCurrentManager(manager)
    setFormData({
      email: manager.email,
      role: manager.role,
      expiresAt: manager.expiresAt ? new Date(manager.expiresAt) : undefined,
      message: ''
    })
    setShowEditManager(true)
  }

  const openDeleteDialog = (manager: CategoryManager) => {
    setCurrentManager(manager)
    setShowDeleteConfirm(true)
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Category Managers</h2>
          <p className="text-muted-foreground">
            Manage who has access to {categoryName} resources
          </p>
        </div>
        {canManageManagers && (
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
            {selectedManagers.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedManagers.length})
              </Button>
            )}
            <Dialog open={showAddManager} onOpenChange={setShowAddManager}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Manager
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Category Manager</DialogTitle>
                  <DialogDescription>
                    Invite someone to help manage {categoryName} resources
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value: CategoryManager['role']) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contributor">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="font-medium">Contributor</div>
                              <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.contributor}</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium">Manager</div>
                              <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.manager}</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Expiration Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expiresAt ? format(formData.expiresAt, 'PPP') : 'No expiration'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.expiresAt}
                          onSelect={(date) => setFormData(prev => ({ ...prev, expiresAt: date }))}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddManager(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddManager} disabled={!formData.email}>
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search managers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Managers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Managers ({filteredManagers.length})</span>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredManagers.map((manager) => (
              <div key={manager.id} className="flex items-center space-x-4 rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  {canManageManagers && manager.role !== 'owner' && (
                    <Checkbox
                      checked={selectedManagers.includes(manager.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedManagers(prev => [...prev, manager.id])
                        } else {
                          setSelectedManagers(prev => prev.filter(id => id !== manager.id))
                        }
                      }}
                    />
                  )}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={manager.avatar} />
                    <AvatarFallback>{manager.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium">{manager.name}</h3>
                    <Badge variant="secondary" className={cn('text-xs', getRoleColor(manager.role))}>
                      <span className="mr-1">{getRoleIcon(manager.role)}</span>
                      {manager.role}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', getStatusColor(manager.status))}>
                      <span className="mr-1">{getStatusIcon(manager.status)}</span>
                      {manager.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center">
                      <Mail className="mr-1 h-3 w-3" />
                      {manager.email}
                    </div>
                    {manager.phone && (
                      <div className="flex items-center">
                        <Phone className="mr-1 h-3 w-3" />
                        {manager.phone}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      Last active: {manager.lastActive}
                    </div>
                    {manager.expiresAt && (
                      <div className="flex items-center">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        Expires: {format(new Date(manager.expiresAt), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>Permissions:</span>
                    {manager.permissions.map((permission, index) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {canManageManagers && manager.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(manager)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => openDeleteDialog(manager)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            {filteredManagers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No managers found matching your search criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Manager Dialog */}
      <Dialog open={showEditManager} onOpenChange={setShowEditManager}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Manager</DialogTitle>
            <DialogDescription>
              Update {currentManager?.name}'s role and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value: CategoryManager['role']) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributor">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium">Contributor</div>
                        <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.contributor}</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Manager</div>
                        <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.manager}</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiresAt ? format(formData.expiresAt, 'PPP') : 'No expiration'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiresAt}
                    onSelect={(date) => setFormData(prev => ({ ...prev, expiresAt: date }))}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditManager(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditManager}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Manager Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {currentManager?.name}'s access to {categoryName}? 
              This action cannot be undone and they will lose all permissions immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteManager} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CategoryManagerList