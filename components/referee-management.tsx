'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Calendar, Clock, Users } from 'lucide-react'

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

export function RefereeManagement() {
  const [referees, setReferees] = useState<Referee[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
    level: '',
    location: '',
    notes: '',
    maxDistance: 50,
    isAvailable: true,
    postal_code: '',
    isWhiteWhistle: false
  })
  const api = useApi()
  const { toast } = useToast()

  // Fetch referees from API
  useEffect(() => {
    const fetchReferees = async () => {
      try {
        setIsLoading(true)
        const response = await api.getReferees({ limit: 100 }) // Get all referees
        setReferees(response.data.referees)
      } catch (error) {
        console.error('Failed to fetch referees:', error)
        toast({
          title: 'Error',
          description: 'Failed to load referees. Please try again.',
          variant: 'destructive'
        })
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
      level: referee.level || referee.level_name || '',
      location: referee.location,
      notes: referee.notes || '',
      maxDistance: referee.maxDistance,
      isAvailable: referee.isAvailable,
      postal_code: referee.postal_code || '',
      isWhiteWhistle: referee.isWhiteWhistle || false
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
        level: editForm.level,
        location: editForm.location,
        notes: editForm.notes,
        max_distance: editForm.maxDistance,
        is_available: editForm.isAvailable,
        postal_code: editForm.postal_code,
        is_white_whistle: editForm.isWhiteWhistle
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
      value: Array.isArray(referees) ? referees.filter((r) => (r.level || r.level_name) === 'Senior').length : 0,
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
          <div className="font-medium text-sm truncate">{referee.name}</div>
          {(referee.should_display_white_whistle || referee.isWhiteWhistle) && (
            <div className="flex items-center text-xs text-muted-foreground truncate mt-1">
              <span className="inline-block w-2 h-2 bg-white border border-gray-400 rounded-full mr-1"></span>
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
        { value: 'Rookie', label: 'Rookie' },
        { value: 'Junior', label: 'Junior' },
        { value: 'Senior', label: 'Senior' }
      ],
      accessor: (referee) => {
        const level = referee.level || referee.level_name
        const levelColors = {
          'Rookie': 'bg-green-100 text-green-800 border-green-200',
          'Junior': 'bg-blue-100 text-blue-800 border-blue-200',
          'Senior': 'bg-purple-100 text-purple-800 border-purple-200'
        }
        
        return (
          <div className="space-y-1">
            <Badge 
              variant="outline" 
              className={`text-xs ${levelColors[level as keyof typeof levelColors] || ''}`}
            >
              {level}
            </Badge>
            {(referee.should_display_white_whistle || referee.isWhiteWhistle) && (
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 bg-white border border-gray-400 rounded-full mr-1"></span>
                White Whistle
              </div>
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
        { value: 'Trainer', label: 'Trainer' },
        { value: 'Referee Coach', label: 'Referee Coach' }
      ],
      accessor: (referee) => {
        const roles = referee.roles || ['Referee']
        
        return (
          <div className="space-y-1">
            {roles.slice(0, 2).map((role, index) => (
              <div key={index} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md truncate">
                {role}
              </div>
            ))}
            {roles.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{roles.length - 2} more
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
        const isAvailable = referee.isAvailable
        
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
      >
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Referee
        </Button>
      </PageHeader>

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Referees</CardTitle>
          <CardDescription>Manage referee profiles and availability</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="level">Referee Level</Label>
              <Select value={editForm.level} onValueChange={(value) => setEditForm(prev => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rookie">Rookie ($25/game)</SelectItem>
                  <SelectItem value="Junior">Junior ($35/game)</SelectItem>
                  <SelectItem value="Senior">Senior ($45/game)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={editForm.postal_code}
                onChange={(e) => setEditForm(prev => ({ ...prev, postal_code: e.target.value }))}
                placeholder="e.g. T2N 1N4"
              />
            </div>
            
            {editForm.level === 'Junior' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isWhiteWhistle"
                  checked={editForm.isWhiteWhistle}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isWhiteWhistle: checked as boolean }))}
                />
                <Label htmlFor="isWhiteWhistle">Display white whistle (Junior level only)</Label>
              </div>
            )}
            
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
                <Label className="font-semibold">Referee Level</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{selectedReferee.level || selectedReferee.level_name}</Badge>
                  {(selectedReferee.should_display_white_whistle || selectedReferee.isWhiteWhistle) && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className="inline-block w-2 h-2 bg-white border border-gray-400 rounded-full mr-1"></span>
                      White Whistle
                    </div>
                  )}
                </div>
              </div>
              
              {selectedReferee.postal_code && (
                <div>
                  <Label className="font-semibold">Postal Code</Label>
                  <p className="text-sm text-muted-foreground">{selectedReferee.postal_code}</p>
                </div>
              )}
              
              {selectedReferee.roles && selectedReferee.roles.length > 0 && (
                <div>
                  <Label className="font-semibold">Roles</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedReferee.roles.map((role, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <Label className="font-semibold">Location</Label>
                <p className="text-sm text-muted-foreground">{selectedReferee.location}</p>
              </div>
              
              <div>
                <Label className="font-semibold">Max Distance</Label>
                <p className="text-sm text-muted-foreground">{selectedReferee.maxDistance} miles</p>
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
              View and manage availability windows for {referees.find(r => r.id === availabilityRefereeId)?.name}
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
