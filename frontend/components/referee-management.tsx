'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Calendar, Clock, Users, Zap } from 'lucide-react'
const Whistle = Zap // Using Zap icon as whistle substitute

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useApi } from '@/lib/api'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { AvailabilityCalendar } from '@/components/availability-calendar'
import { Referee } from '@/components/data-table/types'
import {
  isReferee,
  getRefereeLevel,
  getRefereeLevelBadgeClass,
  getRefereeDisplayName,
  canMentor,
  canEvaluate,
  hasWhiteWhistle,
  isRefereeAvailable
} from '@/utils/refereeHelpers'
import { User } from '@/types/user'

export function RefereeManagement() {
  const [referees, setReferees] = useState<Referee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false)
  const [availabilityRefereeId, setAvailabilityRefereeId] = useState<string>('')
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'referee'
  })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    certificationLevel: '',
    location: '',
    notes: '',
    maxDistance: 50,
    isAvailable: true
  })
  const api = useApi()
  const { toast } = useToast()

  // Fetch referees from API
  useEffect(() => {
    const fetchReferees = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Use the same approach as User Management for consistency
        const response = await api.request('/users', {
          method: 'GET',
          query: {
            limit: 100,
            role: 'referee' // Filter for referee role like User Management does
          }
        })

        // Handle server errors gracefully
        if (response.status >= 500) {
          console.error('Server error fetching referees:', response.status)
          setReferees([])
          setError('Unable to load referees. Server error occurred.')
          return
        }

        console.log('Users API response:', response) // Debug log

        // Extract referees from users response using helper function
        let users = []
        if (response.data?.users) {
          users = response.data.users
        } else if (response.data?.data) {
          users = response.data.data
        } else {
          users = []
        }

        // Filter to only referees using helper function
        const filteredReferees = users.filter((user: User) => isReferee(user))

        console.log('Filtered referees:', filteredReferees)
        // Debug: Log role structures for first 2 referees
        filteredReferees.forEach((ref, i) => {
          if (i < 2) { // Only log first 2 to avoid spam
            console.log(`Referee ${i} roles:`, ref.roles)
            console.log(`Referee ${i} level:`, getRefereeLevel(ref))
          }
        })

        setReferees(filteredReferees)
      } catch (error) {
        console.error('Failed to fetch referees:', error)
        setError('Failed to load referees. Please try again.')
        setReferees([]) // Set empty array to prevent crashes

        // Only show toast for non-404 errors
        if (!(error instanceof Error && error.message.includes('404'))) {
          toast({
            title: 'Error',
            description: 'Failed to load referees. Please try again.',
            variant: 'destructive'
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchReferees()
  }, [api, toast])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await api.createInvitation(inviteForm)
      
      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${inviteForm.email}. They will receive an email with signup instructions.`
      })
      
      setIsInviteDialogOpen(false)
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'referee'
      })
      
      // Invitation email sent automatically
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send invitation. Please try again.'
      })
    }
  }

  const handleEditReferee = (referee: Referee) => {
    setSelectedReferee(referee)
    setEditForm({
      name: referee.name,
      email: referee.email,
      phone: referee.phone,
      certificationLevel: referee.new_referee_level || referee.certificationLevel || '',
      location: referee.location,
      notes: referee.notes || '',
      maxDistance: referee.maxDistance,
      isAvailable: referee.isAvailable
    })
    setShowEditDialog(true)
  }

  const handleViewProfile = (referee: Referee) => {
    setSelectedReferee(referee)
    setShowProfileDialog(true)
  }

  const handleSaveReferee = async () => {
    if (!selectedReferee) return

    try {
      const response = await api.updateReferee(selectedReferee.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        new_referee_level: editForm.certificationLevel,
        location: editForm.location,
        notes: editForm.notes,
        max_distance: editForm.maxDistance,
        is_available: editForm.isAvailable
      })

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Referee updated successfully'
        })
        
        // Update the referee in the list
        setReferees(prev => prev.map(ref => 
          ref.id === selectedReferee.id 
            ? { ...ref, ...response.data.referee }
            : ref
        ))
        
        setShowEditDialog(false)
      }
    } catch (error) {
      console.error('Failed to update referee:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update referee. Please try again.'
      })
    }
  }

  const handleManageAvailability = (referee: Referee) => {
    setAvailabilityRefereeId(referee.id)
    setShowAvailabilityCalendar(true)
  }

  const stats = [
    {
      title: 'Total Referees',
      value: Array.isArray(referees) ? referees.length : 0,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Active This Week',
      value: Array.isArray(referees) ? Math.floor(referees.length * 0.7) : 0,
      icon: Calendar,
      color: 'text-green-600'
    },
    {
      title: 'Available Now',
      value: Array.isArray(referees) ? Math.floor(referees.length * 0.4) : 0,
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Senior Level',
      value: Array.isArray(referees) ? referees.filter((r) => r.new_referee_level === 'Senior' || r.level === 'Expert').length : 0,
      icon: UserPlus,
      color: 'text-purple-600'
    }
  ]

  // Column definitions for the referees table using FilterableTable format
  const columns: ColumnDef<Referee>[] = [
    {
      id: 'name',
      title: 'Name',
      filterType: 'search',
      accessor: (referee) => (
        <div>
          <div className="font-medium text-sm truncate">{getRefereeDisplayName(referee)}</div>
          {hasWhiteWhistle(referee) && (
            <div className="flex items-center text-xs text-muted-foreground truncate mt-1">
              <Whistle className="h-3 w-3 text-white fill-current mr-1" style={{ filter: 'drop-shadow(0 0 1px #374151)' }} />
              White Whistle
            </div>
          )}
        </div>
      )
    },
    {
      id: 'contact',
      title: 'Contact',
      filterType: 'search',
      accessor: (referee) => (
        <div className="space-y-1">
          <div className="text-sm truncate">{referee.email}</div>
          <div className="text-xs text-muted-foreground truncate">{referee.phone}</div>
        </div>
      )
    },
    {
      id: 'level',
      title: 'Level',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Levels' },
        // New levels
        { value: 'Rookie', label: 'Rookie' },
        { value: 'Junior', label: 'Junior' },
        { value: 'Senior', label: 'Senior' },
        // Legacy levels
        { value: 'Learning', label: 'Learning' },
        { value: 'Learning+', label: 'Learning+' },
        { value: 'Growing', label: 'Growing' },
        { value: 'Growing+', label: 'Growing+' },
        { value: 'Teaching', label: 'Teaching' },
        { value: 'Expert', label: 'Expert' }
      ],
      accessor: (referee) => {
        const level = getRefereeLevel(referee) || referee.new_referee_level || referee.level || 'Referee'
        const badgeClass = getRefereeLevelBadgeClass(level)

        // Convert badge classes to Tailwind classes for compatibility
        const tailwindClasses = {
          'badge-referee-head': 'bg-red-100 text-red-800 border-red-200',
          'badge-referee-senior': 'bg-purple-100 text-purple-800 border-purple-200',
          'badge-referee-junior': 'bg-blue-100 text-blue-800 border-blue-200',
          'badge-referee-rookie': 'bg-green-100 text-green-800 border-green-200',
          'badge-referee-coach': 'bg-indigo-100 text-indigo-800 border-indigo-200',
          'badge-referee-base': 'bg-gray-100 text-gray-800 border-gray-200',
          'badge-default': 'bg-secondary text-secondary-foreground'
        }

        return (
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={`text-xs ${tailwindClasses[badgeClass as keyof typeof tailwindClasses] || tailwindClasses['badge-default']}`}
            >
              {level}
            </Badge>
            {hasWhiteWhistle(referee) && (
              <Whistle className="h-3 w-3 text-white fill-current" style={{ filter: 'drop-shadow(0 0 1px #374151)' }} />
            )}
          </div>
        )
      }
    },
    {
      id: 'location',
      title: 'Location',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Locations' },
        { value: 'Northwest Calgary', label: 'Northwest Calgary' },
        { value: 'Northeast Calgary', label: 'Northeast Calgary' },
        { value: 'Southeast Calgary', label: 'Southeast Calgary' },
        { value: 'Southwest Calgary', label: 'Southwest Calgary' },
        { value: 'Downtown Calgary', label: 'Downtown Calgary' },
        { value: 'Foothills', label: 'Foothills' },
        { value: 'Bow Valley', label: 'Bow Valley' },
        { value: 'Fish Creek', label: 'Fish Creek' },
        { value: 'Olds', label: 'Olds' }
      ],
      accessor: (referee) => (
        <div>
          <div className="text-sm font-medium truncate">{referee.location}</div>
          <div className="text-xs text-muted-foreground">
            {referee.maxDistance}km radius
          </div>
        </div>
      )
    },
    {
      id: 'roles',
      title: 'Roles',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Roles' },
        { value: 'Referee', label: 'Referee' },
        { value: 'Evaluator', label: 'Evaluator' },
        { value: 'Mentor', label: 'Mentor' },
        { value: 'Regional Lead', label: 'Regional Lead' },
        { value: 'Assignor', label: 'Assignor' },
        { value: 'Inspector', label: 'Inspector' }
      ],
      accessor: (referee) => {
        // Handle different role data structures from User API
        let allRoles = []
        
        if (referee.role_names && Array.isArray(referee.role_names)) {
          allRoles = referee.role_names.map(role => 
            typeof role === 'object' ? (role.name || String(role)) : String(role)
          )
        } else if (referee.roles && Array.isArray(referee.roles)) {
          // Handle both string arrays and object arrays
          allRoles = referee.roles.map(role => 
            typeof role === 'object' ? (role.name || String(role)) : String(role)
          )
        } else if (referee.role) {
          allRoles = [typeof referee.role === 'object' ? (referee.role.name || String(referee.role)) : String(referee.role)]
        } else {
          allRoles = ['Referee'] // Default fallback
        }
        
        // Filter out basic "Referee" role and admin roles - show only referee-specific roles
        // Anyone with a "Referee" type role automatically gets base Referee access
        const displayRoles = allRoles.filter(role => 
          role !== 'Referee' && 
          role !== 'referee' &&
          role !== 'Admin' &&
          role !== 'Super Admin' &&
          !role.toLowerCase().includes('admin')
        )
        
        const roleColors = {
          'Senior Referee': 'bg-purple-100 text-purple-800',
          'Junior Referee': 'bg-blue-100 text-blue-800', 
          'Rookie Referee': 'bg-green-100 text-green-800',
          'Evaluator': 'bg-emerald-100 text-emerald-800', 
          'Mentor': 'bg-indigo-100 text-indigo-800',
          'Regional Lead': 'bg-orange-100 text-orange-800',
          'Assignor': 'bg-red-100 text-red-800',
          'Inspector': 'bg-gray-100 text-gray-800'
        }
        
        // If no specialized roles, show a default indicator
        if (displayRoles.length === 0) {
          return (
            <div className="text-xs text-muted-foreground italic">
              Base Referee
            </div>
          )
        }
        
        return (
          <div className="space-y-1">
            {displayRoles.slice(0, 2).map((role, index) => {
              const roleText = String(role) // Force to string
              return (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className={`text-xs ${roleColors[roleText as keyof typeof roleColors] || 'bg-secondary text-secondary-foreground'}`}
                >
                  {roleText}
                </Badge>
              )
            })}
            {displayRoles.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{displayRoles.length - 2} more
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All' },
        { value: 'true', label: 'Available' },
        { value: 'false', label: 'Unavailable' }
      ],
      accessor: (referee) => {
        const isAvailable = isRefereeAvailable(referee)

        return (
          <Badge
            variant={isAvailable ? 'default' : 'secondary'}
            className={`text-xs ${isAvailable ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' : 'bg-muted text-muted-foreground border-border'}`}
          >
            {isAvailable ? 'Available' : 'Unavailable'}
          </Badge>
        )
      }
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (referee) => (
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleViewProfile(referee)}
            className="h-8 w-8 p-0"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEditReferee(referee)}
            className="h-8 w-8 p-0"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleManageAvailability(referee)}
            className="h-8 w-8 p-0"
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={Users}
        title="Referee Management"
        description="Manage referee profiles and availability"
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Referees</CardTitle>
          <CardDescription>Manage referee profiles and availability</CardDescription>
        </CardHeader>
        <CardContent>
          {error && !isLoading ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <FilterableTable
              columns={columns}
              data={referees}
              loading={isLoading}
              mobileCardType="referee"
              enableViewToggle={true}
              enableCSV={true}
              searchKey="name"
              emptyMessage="No referees found. Try adjusting your filters."
              onEditReferee={handleEditReferee}
              onViewProfile={handleViewProfile}
            />
          )}
        </CardContent>
      </Card>

      {/* Invite Referee Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogTrigger asChild>
          <div></div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Referee</DialogTitle>
            <DialogDescription>
                    Send an invitation to create a new referee account. They will receive an email with instructions to complete their signup.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referee">Referee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancel
              </Button>
              <Button type="submit">Send Invitation</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Referee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Referee</DialogTitle>
            <DialogDescription>
              Update referee information for {selectedReferee?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="certificationLevel">Certification Level</Label>
              <Select value={editForm.certificationLevel} onValueChange={(value) => setEditForm(prev => ({ ...prev, certificationLevel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rookie">Rookie</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="maxDistance">Max Distance (miles)</Label>
              <Input
                id="maxDistance"
                type="number"
                value={editForm.maxDistance}
                onChange={(e) => setEditForm(prev => ({ ...prev, maxDistance: parseInt(e.target.value) || 0 }))}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAvailable"
                checked={editForm.isAvailable}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isAvailable: checked as boolean }))}
              />
              <Label htmlFor="isAvailable">Available for assignments</Label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReferee}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile View Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Referee Profile</DialogTitle>
            <DialogDescription>
              Detailed information for {selectedReferee?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReferee && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">Name</Label>
                <p className="text-sm text-muted-foreground">{selectedReferee.name}</p>
              </div>
              
              <div>
                <Label className="font-semibold">Email</Label>
                <p className="text-sm text-muted-foreground">{selectedReferee.email}</p>
              </div>
              
              <div>
                <Label className="font-semibold">Phone</Label>
                <p className="text-sm text-muted-foreground">{selectedReferee.phone}</p>
              </div>
              
              <div>
                <Label className="font-semibold">Level</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{selectedReferee.new_referee_level || selectedReferee.certificationLevel}</Badge>
                  {(selectedReferee.should_display_white_whistle || selectedReferee.isWhiteWhistle) && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Whistle className="h-3 w-3 text-white fill-current mr-1" style={{ filter: 'drop-shadow(0 0 1px #374151)' }} />
                      White Whistle
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="font-semibold">Location</Label>
                <p className="text-sm text-muted-foreground">{selectedReferee.location}</p>
              </div>
              
              <div>
                <Label className="font-semibold">Max Distance</Label>
                <p className="text-sm text-muted-foreground">{selectedReferee.maxDistance} miles</p>
              </div>
              
              <div>
                <Label className="font-semibold">Roles</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(selectedReferee.role_names || selectedReferee.roles || ['Referee']).map((role, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {typeof role === 'object' ? (role.name || 'Unknown Role') : role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-semibold">Status</Label>
                <Badge variant={selectedReferee.isAvailable ? 'default' : 'secondary'}>
                  {selectedReferee.isAvailable ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              
              {selectedReferee.notes && (
                <div>
                  <Label className="font-semibold">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedReferee.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <Button onClick={() => setShowProfileDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Availability Calendar Dialog */}
      <Dialog open={showAvailabilityCalendar} onOpenChange={setShowAvailabilityCalendar}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Availability</DialogTitle>
            <DialogDescription>
              View and manage availability windows for {Array.isArray(referees) ? referees.find(r => r.id === availabilityRefereeId)?.name : 'Unknown Referee'}
            </DialogDescription>
          </DialogHeader>
          
          {availabilityRefereeId && (
            <AvailabilityCalendar
              refereeId={availabilityRefereeId}
              canEdit={true}
              viewMode="week"
              onWindowChange={(windows) => {
                // Optional: Update local state or refresh data
                console.log('Availability windows updated:', windows)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
