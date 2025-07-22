"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { UserPlus, Calendar, Clock } from "lucide-react"
import { mockReferees } from "@/lib/mock-data"
import { useApi } from "@/lib/api"
import { DataTable } from "@/components/data-table/DataTable"
import { createRefereeColumns } from "@/components/data-table/columns/referee-columns"
import { AvailabilityCalendar } from "@/components/availability-calendar"
import { Referee } from "@/components/data-table/types"

export function RefereeManagement() {
  const [referees] = useState<Referee[]>(mockReferees)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null)
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false)
  const [availabilityRefereeId, setAvailabilityRefereeId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "referee"
  })
  const api = useApi()
  const { toast } = useToast()

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
      
      // For testing purposes, show the invitation link
      console.log('Invitation link:', response.data.invitation_link)
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
    // TODO: Open edit dialog
    toast({
      title: "Edit Referee",
      description: `Opening edit form for ${referee.name}`,
    })
  }

  const handleViewProfile = (referee: Referee) => {
    setSelectedReferee(referee)
    // TODO: Open profile view
    toast({
      title: "View Profile",
      description: `Opening profile for ${referee.name}`,
    })
  }

  const handleManageAvailability = (referee: Referee) => {
    setAvailabilityRefereeId(referee.id)
    setShowAvailabilityCalendar(true)
  }

  const stats = [
    {
      title: "Total Referees",
      value: referees.length,
      color: "text-blue-600",
    },
    {
      title: "Active This Week",
      value: Math.floor(referees.length * 0.7),
      color: "text-green-600",
    },
    {
      title: "Available Now",
      value: Math.floor(referees.length * 0.4),
      color: "text-orange-600",
    },
    {
      title: "Elite Level",
      value: referees.filter((r) => r.level === "Elite").length,
      color: "text-purple-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Referees</CardTitle>
              <CardDescription>Manage referee profiles and availability</CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Referee
                </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={createRefereeColumns({
              onEditReferee: handleEditReferee,
              onViewProfile: handleViewProfile,
              onManageAvailability: handleManageAvailability
            })} 
            data={referees} 
            loading={loading}
            mobileCardType="referee"
            onEditReferee={handleEditReferee}
            onViewProfile={handleViewProfile}
            searchKey="name"
          />
        </CardContent>
      </Card>

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
    </div>
  )
}
