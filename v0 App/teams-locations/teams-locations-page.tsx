"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Plus,
  MapPin,
  Users,
  Building,
  Phone,
  DollarSign,
  ParkingMeterIcon as Parking,
  Eye,
} from "lucide-react"
import { mockTeams, mockLocations } from "@/lib/mock-data"
import { useNotifications } from "@/providers/notification-provider"
import { TeamDetailsDialog } from "./team-details-dialog"
import { LocationDetailsDialog } from "./location-details-dialog"
import { CreateTeamDialog } from "./create-team-dialog"
import { CreateLocationDialog } from "./create-location-dialog"

export function TeamsLocationsPage() {
  const [teams, setTeams] = useState(mockTeams)
  const [locations, setLocations] = useState(mockLocations)
  const [searchTerm, setSearchTerm] = useState("")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [isCreateLocationOpen, setIsCreateLocationOpen] = useState(false)
  const { showToast } = useNotifications()

  // Filter teams
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDivision = divisionFilter === "all" || team.division === divisionFilter
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? team.isActive : !team.isActive)
    return matchesSearch && matchesDivision && matchesStatus
  })

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = locationFilter === "all" || location.city === locationFilter
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? location.isActive : !location.isActive)
    return matchesSearch && matchesLocation && matchesStatus
  })

  const handleCreateTeam = (teamData: any) => {
    const newTeam = {
      id: (teams.length + 1).toString(),
      ...teamData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTeams([...teams, newTeam])
    setIsCreateTeamOpen(false)
    showToast("Team created successfully", "The new team has been added to the system.")
  }

  const handleCreateLocation = (locationData: any) => {
    const newLocation = {
      id: (locations.length + 1).toString(),
      ...locationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setLocations([...locations, newLocation])
    setIsCreateLocationOpen(false)
    showToast("Location created successfully", "The new location has been added to the system.")
  }

  const teamStats = [
    {
      title: "Total Teams",
      value: teams.length,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Active Teams",
      value: teams.filter((t) => t.isActive).length,
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Divisions",
      value: new Set(teams.map((t) => t.division)).size,
      icon: Building,
      color: "text-purple-600",
    },
    {
      title: "Cities",
      value: new Set(teams.map((t) => t.location)).size,
      icon: MapPin,
      color: "text-orange-600",
    },
  ]

  const locationStats = [
    {
      title: "Total Venues",
      value: locations.length,
      icon: Building,
      color: "text-blue-600",
    },
    {
      title: "Active Venues",
      value: locations.filter((l) => l.isActive).length,
      icon: Building,
      color: "text-green-600",
    },
    {
      title: "Total Capacity",
      value: locations.reduce((sum, l) => sum + l.capacity, 0).toLocaleString(),
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Parking Spaces",
      value: locations.reduce((sum, l) => sum + (l.parkingSpaces || 0), 0).toLocaleString(),
      icon: Parking,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teams & Locations</h2>
          <p className="text-muted-foreground">Manage teams, venues, and facility information</p>
        </div>
      </div>

      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-6">
          {/* Team Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {teamStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Teams Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teams Directory</CardTitle>
                  <CardDescription>Manage team information and contacts</CardDescription>
                </div>
                <Button onClick={() => setIsCreateTeamOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="U10">U10</SelectItem>
                    <SelectItem value="U12">U12</SelectItem>
                    <SelectItem value="U14">U14</SelectItem>
                    <SelectItem value="U16">U16</SelectItem>
                    <SelectItem value="U18">U18</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Teams Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Home Venue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: team.colors?.primary || "#gray" }}
                            />
                            <div>
                              <p className="font-medium">{team.name}</p>
                              {team.foundedYear && (
                                <p className="text-sm text-muted-foreground">Est. {team.foundedYear}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{team.division}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                            {team.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{team.contactName}</p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 mr-1" />
                              {team.contactPhone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{team.homeVenue}</TableCell>
                        <TableCell>
                          <Badge variant={team.isActive ? "default" : "secondary"}>
                            {team.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTeam(team.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          {/* Location Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {locationStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Locations Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Venues Directory</CardTitle>
                  <CardDescription>Manage facility information and availability</CardDescription>
                </div>
                <Button onClick={() => setIsCreateLocationOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    <SelectItem value="Calgary">Calgary</SelectItem>
                    <SelectItem value="Edmonton">Edmonton</SelectItem>
                    <SelectItem value="Red Deer">Red Deer</SelectItem>
                    <SelectItem value="Lethbridge">Lethbridge</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Locations Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venue</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Facilities</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {location.city}, {location.province}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                            <div>
                              <p className="text-sm">{location.address}</p>
                              <p className="text-xs text-muted-foreground">{location.postalCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                            {location.capacity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {location.facilities.slice(0, 2).map((facility, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {facility}
                              </Badge>
                            ))}
                            {location.facilities.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{location.facilities.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {location.rentalRate && (
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-green-600" />${location.rentalRate}/hr
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={location.isActive ? "default" : "secondary"}>
                            {location.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(location.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTeamDialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen} onCreateTeam={handleCreateTeam} />

      <CreateLocationDialog
        open={isCreateLocationOpen}
        onOpenChange={setIsCreateLocationOpen}
        onCreateLocation={handleCreateLocation}
      />

      {selectedTeam && (
        <TeamDetailsDialog
          open={!!selectedTeam}
          onOpenChange={() => setSelectedTeam(null)}
          team={teams.find((t) => t.id === selectedTeam)}
        />
      )}

      {selectedLocation && (
        <LocationDetailsDialog
          open={!!selectedLocation}
          onOpenChange={() => setSelectedLocation(null)}
          location={locations.find((l) => l.id === selectedLocation)}
        />
      )}
    </div>
  )
}
