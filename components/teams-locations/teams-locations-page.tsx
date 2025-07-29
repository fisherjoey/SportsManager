"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterableTable, type ColumnDef } from "@/components/ui/filterable-table"
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
import { LocationWithDistance } from "@/components/ui/location-with-distance"
import { mockLocations } from "@/lib/mock-data"
import { apiClient } from "@/lib/api"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"
// import { useNotifications } from "@/providers/notification-provider"
import { TeamDetailsDialog } from "./team-details-dialog"
import { LocationDetailsDialog } from "./location-details-dialog"
import { CreateTeamDialog } from "./create-team-dialog"
import { CreateLocationDialog } from "./create-location-dialog"

export function TeamsLocationsPage() {
  const [teams, setTeams] = useState([])
  const [locations, setLocations] = useState(mockLocations)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [isCreateLocationOpen, setIsCreateLocationOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  // const { showToast } = useNotifications()

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch teams from backend API
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.getTeams()
        setTeams(response.data?.teams || [])
      } catch (err) {
        console.error('Failed to fetch teams:', err)
        setError(err.message || 'Failed to load teams')
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  // Filter teams
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = !searchTerm ||
      team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.organization?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDivision = divisionFilter === "all" || team.division === divisionFilter
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? true : false)
    
    return matchesSearch && matchesDivision && matchesStatus
  })

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    const matchesSearch = !searchTerm ||
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = locationFilter === "all" || location.city === locationFilter
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? location.isActive : !location.isActive)
    
    return matchesSearch && matchesLocation && matchesStatus
  })

  const handleCreateTeam = async (teamData: any) => {
    try {
      const response = await apiClient.createTeam(teamData)
      // Refresh the teams list
      const teamsResponse = await apiClient.getTeams()
      setTeams(teamsResponse.data?.teams || [])
      setIsCreateTeamOpen(false)
      // showToast("Team created successfully", "The new team has been added to the system.")
    } catch (error) {
      console.error('Failed to create team:', error)
      // showToast("Error", "Failed to create team. Please try again.")
    }
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
    // showToast("Location created successfully", "The new location has been added to the system.")
  }

  const handleImportTeams = (importedTeams: any[]) => {
    try {
      // Get existing team IDs to prevent duplicates
      const existingIds = new Set(teams.map(t => t.id))
      
      // Filter out teams that already exist
      const newTeams = importedTeams.filter(t => !existingIds.has(t.id))
      
      // Add new teams to the existing teams
      setTeams(prevTeams => [...prevTeams, ...newTeams])
      
      // showToast("Teams imported successfully", `Imported ${newTeams.length} new teams from CSV file.`)
    } catch (error) {
      console.error('Import error:', error)
      // showToast("Import failed", "There was an error importing the teams.")
    }
  }

  const handleImportLocations = (importedLocations: any[]) => {
    try {
      // Get existing location IDs to prevent duplicates
      const existingIds = new Set(locations.map(l => l.id))
      
      // Filter out locations that already exist
      const newLocations = importedLocations.filter(l => !existingIds.has(l.id))
      
      // Add new locations to the existing locations
      setLocations(prevLocations => [...prevLocations, ...newLocations])
      
      // showToast("Locations imported successfully", `Imported ${newLocations.length} new locations from CSV file.`)
    } catch (error) {
      console.error('Import error:', error)
      // showToast("Import failed", "There was an error importing the locations.")
    }
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
      value: teams.length, // All teams from backend are considered active for now
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Divisions",
      value: new Set(teams.map((t) => t.division).filter(Boolean)).size,
      icon: Building,
      color: "text-purple-600",
    },
    {
      title: "Cities",
      value: new Set(teams.map((t) => t.location).filter(Boolean)).size,
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

  // Column definitions for teams table - includes all database fields
  const teamColumns: ColumnDef<any>[] = [
    {
      id: 'team',
      title: 'Team',
      filterType: 'search',
      accessor: (team) => (
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <div>
            <p className="font-medium">{team.name}</p>
            <p className="text-sm text-muted-foreground">
              {team.organization} {team.age_group} {team.gender}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'name',
      title: 'Name',
      filterType: 'search',
      accessor: 'name'
    },
    {
      id: 'organization',
      title: 'Organization',
      filterType: 'search',
      accessor: 'organization'
    },
    {
      id: 'age_group',
      title: 'Age Group',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Ages' },
        { value: 'U8', label: 'U8' },
        { value: 'U10', label: 'U10' },
        { value: 'U12', label: 'U12' },
        { value: 'U14', label: 'U14' },
        { value: 'U16', label: 'U16' },
        { value: 'U18', label: 'U18' },
        { value: 'Senior', label: 'Senior' }
      ],
      accessor: 'age_group'
    },
    {
      id: 'gender',
      title: 'Gender',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All' },
        { value: 'Boys', label: 'Boys' },
        { value: 'Girls', label: 'Girls' },
        { value: 'Mixed', label: 'Mixed' }
      ],
      accessor: 'gender'
    },
    {
      id: 'division',
      title: 'Division',
      filterType: 'search',
      accessor: (team) => (
        <Badge variant="secondary">{team.division}</Badge>
      )
    },
    {
      id: 'rank',
      title: 'Rank',
      filterType: 'search',
      accessor: 'rank'
    },
    {
      id: 'location',
      title: 'Location',
      filterType: 'search',
      accessor: (team) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
          {team.location || 'No location'}
        </div>
      )
    },
    {
      id: 'contact_email',
      title: 'Contact Email',
      filterType: 'search',
      accessor: (team) => (
        <span className="text-sm">{team.contact_email || 'No email'}</span>
      )
    },
    {
      id: 'contact_phone',
      title: 'Contact Phone',
      filterType: 'search',
      accessor: (team) => (
        <div className="flex items-center text-sm">
          <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
          {team.contact_phone || 'No phone'}
        </div>
      )
    },
    {
      id: 'game_count',
      title: 'Games',
      filterType: 'search',
      accessor: (team) => (
        <span className="text-sm">{team.game_count || 0}</span>
      )
    },
    {
      id: 'level',
      title: 'Level',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Levels' },
        { value: 'Recreational', label: 'Recreational' },
        { value: 'Competitive', label: 'Competitive' },
        { value: 'Elite', label: 'Elite' }
      ],
      accessor: 'level'
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      accessor: () => (
        <Badge variant="default">Active</Badge>
      )
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (team) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedTeam(team.id)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      )
    }
  ]

  // Column definitions for locations table
  const locationColumns: ColumnDef<any>[] = [
    {
      id: 'venue',
      title: 'Venue',
      filterType: 'search',
      accessor: (location) => (
        <div>
          <p className="font-medium">{location.name}</p>
          <p className="text-sm text-muted-foreground">
            {location.city}, {location.province}
          </p>
        </div>
      )
    },
    {
      id: 'address',
      title: 'Address',
      filterType: 'search',
      accessor: (location) => (
        <LocationWithDistance
          location={location.name}
          address={location.address}
          city={location.city}
          province={location.province}
          postalCode={location.postalCode}
          showDistance={true}
          showMapLink={true}
          compact={true}
        />
      )
    },
    {
      id: 'capacity',
      title: 'Capacity',
      filterType: 'search',
      accessor: (location) => (
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
          {location.capacity}
        </div>
      )
    },
    {
      id: 'facilities',
      title: 'Facilities',
      filterType: 'search',
      accessor: (location) => (
        <div className="flex flex-wrap gap-1">
          {location.facilities?.slice(0, 2).map((facility, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {facility}
            </Badge>
          ))}
          {location.facilities?.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{location.facilities.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    {
      id: 'rate',
      title: 'Rate',
      filterType: 'search',
      accessor: (location) => (
        location.hourlyRate ? (
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1 text-green-600" />${location.hourlyRate}/hr
          </div>
        ) : null
      )
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      accessor: (location) => (
        <Badge variant={location.isActive ? "default" : "secondary"}>
          {location.isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (location) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(location.id)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      )
    }
  ]

  // Mobile card components
  const TeamCard: React.FC<{ team: any }> = ({ team }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <div>
            <p className="font-medium">{team.name}</p>
            <p className="text-sm text-muted-foreground">
              {team.organization} {team.age_group} {team.gender}
            </p>
          </div>
        </div>
        <Badge variant="default">Active</Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Building className="h-3 w-3 text-muted-foreground" />
          <span>{team.division}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{team.location || 'No location'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span>{team.contact_email || 'No contact'}</span>
        </div>
      </div>
      
      <div className="flex justify-end mt-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTeam(team.id)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>
    </Card>
  );

  const LocationCard: React.FC<{ location: any }> = ({ location }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium">{location.name}</p>
          <p className="text-sm text-muted-foreground">
            {location.city}, {location.province}
          </p>
        </div>
        <Badge variant={location.isActive ? "default" : "secondary"}>
          {location.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{location.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span>{location.capacity} capacity</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {location.facilities?.slice(0, 3).map((facility: string, idx: number) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {facility}
            </Badge>
          ))}
          {location.facilities?.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{location.facilities.length - 3}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex justify-end mt-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(location.id)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>
    </Card>
  );

  return (
    <PageLayout>
      <PageHeader
        icon={Users}
        title="Teams & Locations"
        description="Manage teams, venues, and facility information"
      />

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading teams...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading teams: {error}</p>
        </div>
      )}

      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-6">
          <StatsGrid stats={teamStats} />

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

              {/* Teams Table/Cards */}
              {isMobile ? (
                <div className="space-y-4">
                  {filteredTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                  {filteredTeams.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No teams found matching your criteria.
                    </div>
                  )}
                </div>
              ) : (
                <FilterableTable 
                  data={filteredTeams} 
                  columns={teamColumns} 
                  emptyMessage="No teams found matching your criteria."
                  loading={loading}
                  mobileCardType="team"
                  enableViewToggle={true}
                  enableCSV={true}
                  onDataImport={handleImportTeams}
                  csvFilename="teams-export"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <StatsGrid stats={locationStats} />

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

              {/* Locations Table/Cards */}
              {isMobile ? (
                <div className="space-y-4">
                  {filteredLocations.map((location) => (
                    <LocationCard key={location.id} location={location} />
                  ))}
                  {filteredLocations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No locations found matching your criteria.
                    </div>
                  )}
                </div>
              ) : (
                <FilterableTable 
                  data={filteredLocations} 
                  columns={locationColumns} 
                  emptyMessage="No locations found matching your criteria."
                  loading={loading}
                  mobileCardType="location"
                  enableViewToggle={true}
                  enableCSV={true}
                  onDataImport={handleImportLocations}
                  csvFilename="locations-export"
                />
              )}
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
    </PageLayout>
  )
}
