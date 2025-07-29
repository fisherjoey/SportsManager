"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { UserPlus, Calendar, Clock, Users } from "lucide-react"
import { useApi } from "@/lib/api"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"
import { DataTable } from "@/components/data-table/DataTable"
import { createRefereeColumns } from "@/components/data-table/columns/referee-columns"
import { AvailabilityCalendar } from "@/components/availability-calendar"
import { Referee } from "@/components/data-table/types"

export function RefereeManagement() {
  const [referees, setReferees] = useState<Referee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false)
  const [availabilityRefereeId, setAvailabilityRefereeId] = useState<string>("")
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "referee"
  })
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    certificationLevel: "",
    location: "",
    notes: "",
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
        const response = await api.getReferees({ limit: 100 }) // Get all referees
        setReferees(response.data.referees)
      } catch (error) {
        console.error('Failed to fetch referees:', error)
        toast({
          title: "Error",
          description: "Failed to load referees. Please try again.",
          variant: "destructive"
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
        title: "Invitation sent",
        description: `Invitation sent to ${inviteForm.email}. They will receive an email with signup instructions.`,
      })
      
      setIsInviteDialogOpen(false)
      setInviteForm({
        email: "",
        firstName: "",
        lastName: "",
        role: "referee"
      })
      
      // Invitation email sent automatically
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send invitation. Please try again.",
      })
    }
  }

  const handleEditReferee = (referee: Referee) => {
    setSelectedReferee(referee)
    setEditForm({
      name: referee.name,
      email: referee.email,
      phone: referee.phone,
      certificationLevel: referee.certificationLevel || "",
      location: referee.location,
      notes: referee.notes || "",
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
        level: editForm.certificationLevel,
        location: editForm.location,
        notes: editForm.notes,
        max_distance: editForm.maxDistance,
        is_available: editForm.isAvailable
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Referee updated successfully",
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
        variant: "destructive",
        title: "Error",
        description: "Failed to update referee. Please try again.",
      })
    }
  }

  const handleManageAvailability = (referee: Referee) => {
    setAvailabilityRefereeId(referee.id)
    setShowAvailabilityCalendar(true)
  }

  const stats = [
    {
      title: "Total Referees",
      value: Array.isArray(referees) ? referees.length : 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Active This Week",
      value: Array.isArray(referees) ? Math.floor(referees.length * 0.7) : 0,
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "Available Now",
      value: Array.isArray(referees) ? Math.floor(referees.length * 0.4) : 0,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      title: "Elite Level",
      value: Array.isArray(referees) ? referees.filter((r) => r.certificationLevel === "Elite").length : 0,
      icon: UserPlus,
      color: "text-purple-600",
    },
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
          <DataTable 
            columns={createRefereeColumns({
              onEditReferee: handleEditReferee,
              onViewProfile: handleViewProfile,
              onManageAvailability: handleManageAvailability
            })} 
            data={referees} 
            loading={isLoading}
            mobileCardType="referee"
            enableViewToggle={true}
            onEditReferee={handleEditReferee}
            onViewProfile={handleViewProfile}
            searchKey="name"
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
              <Label htmlFor="certificationLevel">Certification Level</Label>
              <Select value={editForm.certificationLevel} onValueChange={(value) => setEditForm(prev => ({ ...prev, certificationLevel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recreational">Recreational</SelectItem>
                  <SelectItem value="Competitive">Competitive</SelectItem>
                  <SelectItem value="Elite">Elite</SelectItem>
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
                <Label className="font-semibold">Certification Level</Label>
                <Badge variant="secondary">{selectedReferee.certificationLevel}</Badge>
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
                <Label className="font-semibold">Status</Label>
                <Badge variant={selectedReferee.isAvailable ? "default" : "secondary"}>
                  {selectedReferee.isAvailable ? "Available" : "Unavailable"}
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
