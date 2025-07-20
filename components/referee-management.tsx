"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Search, MapPin, Phone, Mail, Award, UserPlus } from "lucide-react"
import { mockReferees } from "@/lib/mock-data"
import { useApi } from "@/lib/api"

export function RefereeManagement() {
  const [referees] = useState(mockReferees)
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
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

  const filteredReferees = referees.filter((referee) => {
    const matchesSearch =
      referee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referee.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = levelFilter === "all" || referee.level === levelFilter
    const matchesLocation = locationFilter === "all" || referee.location === locationFilter
    return matchesSearch && matchesLevel && matchesLocation
  })

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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Referee Management</h2>
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
          <CardTitle>Referees</CardTitle>
          <CardDescription>Manage referee profiles and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search referees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Recreational">Recreational</SelectItem>
                <SelectItem value="Competitive">Competitive</SelectItem>
                <SelectItem value="Elite">Elite</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Downtown">Downtown</SelectItem>
                <SelectItem value="Westside">Westside</SelectItem>
                <SelectItem value="Northside">Northside</SelectItem>
                <SelectItem value="Eastside">Eastside</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Certifications</TableHead>
                  <TableHead>Max Distance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReferees.map((referee) => (
                  <TableRow key={referee.id}>
                    <TableCell className="font-medium">{referee.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {referee.email}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-3 w-3 mr-1" />
                          {referee.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{referee.level}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                        {referee.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {referee.certifications.map((cert, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{referee.maxDistance} miles</TableCell>
                    <TableCell>
                      <RefereeDetailsDialog referee={referee} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RefereeDetailsDialog({ referee }: { referee: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{referee.name}</DialogTitle>
          <DialogDescription>Referee profile and preferences</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Contact Information</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                {referee.email}
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                {referee.phone}
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                {referee.location}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Qualifications</h4>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Level: </span>
                <Badge variant="secondary">{referee.level}</Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Certifications: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {referee.certifications.map((cert: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Preferences</h4>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Preferred Positions: </span>
                {referee.preferredPositions.join(", ")}
              </div>
              <div>
                <span className="font-medium">Max Travel Distance: </span>
                {referee.maxDistance} miles
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
