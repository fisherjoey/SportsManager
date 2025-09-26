'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  MapPin,
  Users,
  Building,
  Phone,
  Mail,
  DollarSign,
  ParkingMeterIcon as Parking,
  Eye
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { LocationWithDistance } from '@/components/ui/location-with-distance'
import { apiClient } from '@/lib/api'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'

// import { useNotifications } from "@/providers/notification-provider"
import { TeamDetailsDialog } from './team-details-dialog'
import { LocationDetailsDialog } from './location-details-dialog'
import { CreateTeamDialog } from './create-team-dialog'
import { CreateLocationDialog } from './create-location-dialog'

export function TeamsLocationsPage() {
  const [teams, setTeams] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
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

  // Fetch teams and locations from backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Starting to fetch data...')

        // Check if user is authenticated
        const token = localStorage.getItem('auth_token')
        if (!token) {
          console.warn('No authentication token found')
          setError('Please log in to view teams and locations')
          setLoading(false)
          return
        }

        // Fetch teams
        try {
          const teamsResponse = await apiClient.getTeams()
          setTeams(teamsResponse.data?.teams || [])
          console.log('Teams loaded:', teamsResponse.data?.teams?.length || 0)
        } catch (teamsError) {
          console.error('Failed to fetch teams:', teamsError)
          // Check if it's an authentication error
          if (teamsError.message && (teamsError.message.includes('401') || teamsError.message.includes('403') || teamsError.message.includes('Invalid or expired token'))) {
            setError('Your session has expired. Please log in again.')
            // Optional: Clear the invalid token
            localStorage.removeItem('auth_token')
            // Optional: Redirect to login page
            // window.location.href = '/login'
            return
          }
          throw teamsError
        }

        // Fetch locations
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
        console.log('Fetching locations from', `${API_BASE_URL}/locations`)

        const locationsResponse = await fetch(`${API_BASE_URL}/locations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('Locations response status:', locationsResponse.status)

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          console.log('Locations loaded successfully:', locationsData.length, 'locations')
          console.log('First few locations:', locationsData.slice(0, 3))
          setLocations(locationsData)
        } else {
          const errorText = await locationsResponse.text()
          console.error('Failed to fetch locations:', locationsResponse.status, locationsResponse.statusText, errorText)

          // Check if it's an authentication error
          if (locationsResponse.status === 401 || locationsResponse.status === 403) {
            setError('Your session has expired. Please log in again.')
            localStorage.removeItem('auth_token')
            // Optional: Redirect to login page
            // window.location.href = '/login'
            return
          }

          setError(`Failed to fetch locations: ${locationsResponse.statusText}`)
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)

        // Better error messaging
        if (err.message && err.message.includes('Failed to fetch')) {
          setError('Unable to connect to server. Please check if the server is running.')
        } else {
          setError(err.message || 'Failed to load data')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter teams
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = !searchTerm ||
      team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.organization?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDivision = divisionFilter === 'all' || team.division === divisionFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? true : false)
    
    return matchesSearch && matchesDivision && matchesStatus
  })

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    const matchesSearch = !searchTerm ||
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = locationFilter === 'all' || location.city === locationFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? location.is_active : !location.is_active)
    
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

  const handleCreateLocation = async (locationData: any) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(locationData)
      })

      if (response.ok) {
        const newLocation = await response.json()
        setLocations([...locations, newLocation])
        setIsCreateLocationOpen(false)
        // showToast("Location created successfully", "The new location has been added to the system.")
      } else {
        console.error('Failed to create location')
        // showToast("Error", "Failed to create location. Please try again.")
      }
    } catch (error) {
      console.error('Failed to create location:', error)
      // showToast("Error", "Failed to create location. Please try again.")
    }
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
      title: 'Total Teams',
      value: teams.length,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Active Teams',
      value: teams.length, // All teams from backend are considered active for now
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Organizations',
      value: new Set(teams.map((t) => t.organization).filter(Boolean)).size,
      icon: Building,
      color: 'text-purple-600'
    },
    {
      title: 'Total Games',
      value: teams.reduce((sum, t) => sum + (parseInt(t.game_count) || 0), 0),
      icon: MapPin,
      color: 'text-orange-600'
    }
  ]

  const locationStats = [
    {
      title: 'Total Venues',
      value: locations.length,
      icon: Building,
      color: 'text-blue-600'
    },
    {
      title: 'Active Venues',
      value: locations.filter((l) => l.is_active !== false).length,
      icon: Building,
      color: 'text-green-600'
    },
    {
      title: 'Total Capacity',
      value: locations.reduce((sum, l) => sum + (parseInt(l.capacity) || 0), 0).toLocaleString(),
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'With Pricing',
      value: locations.filter((l) => l.hourly_rate || l.game_rate).length,
      icon: DollarSign,
      color: 'text-orange-600'
    }
  ]

  // Column definitions for teams table - includes all database fields
  const teamColumns: ColumnDef<any>[] = [
    {
      id: 'team',
      title: 'Team',
      filterType: 'search',
      accessor: (team) => {
        const teamColors = team.colors || { primary: '#3b82f6', secondary: '#e2e8f0' }
        return (
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: teamColors.primary }} />
            <div>
              <p className="font-medium">{team.name}</p>
              <div className="flex items-center text-xs text-muted-foreground space-x-1">
                <span>{team.organization}</span>
                <span>→</span>
                <span>{team.division}</span>
                <span>→</span>
                <span>{team.age_group} {team.gender}</span>
                {team.level && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs px-1 py-0">{team.level}</Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }
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
        <Badge variant="secondary">{team.division || 'No division'}</Badge>
      )
    },
    {
      id: 'rank',
      title: 'Rank',
      filterType: 'search',
      accessor: (team) => (
        <span className="text-sm">{team.rank ? `#${team.rank}` : 'Unranked'}</span>
      )
    },
    {
      id: 'location',
      title: 'Location',
      filterType: 'search',
      accessor: (team) => (
        <div className="flex items-center text-sm">
          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
          <span>{team.location || 'No location set'}</span>
        </div>
      )
    },
    {
      id: 'contact_email',
      title: 'Contact Email',
      filterType: 'search',
      accessor: (team) => {
        if (!team.contact_email) {
          return <span className="text-sm text-muted-foreground">No email</span>
        }
        return (
          <a href={`mailto:${team.contact_email}`} className="text-sm text-blue-600 hover:underline">
            {team.contact_email}
          </a>
        )
      }
    },
    {
      id: 'contact_phone',
      title: 'Contact Phone',
      filterType: 'search',
      accessor: (team) => {
        if (!team.contact_phone) {
          return <span className="text-sm text-muted-foreground">No phone</span>
        }
        
        const formatPhoneNumber = (phone: string) => {
          const cleaned = phone.replace(/\D/g, '')
          if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
          }
          return phone
        }
        
        return (
          <div className="flex items-center text-sm">
            <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
            <a href={`tel:${team.contact_phone}`} className="text-blue-600 hover:underline">
              {formatPhoneNumber(team.contact_phone)}
            </a>
          </div>
        )
      }
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
          postalCode={location.postal_code}
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
        <div className="flex items-center text-sm">
          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
          <span>{location.capacity || 'Not specified'}</span>
          {location.parking_spaces && (
            <span className="text-muted-foreground ml-2">• {location.parking_spaces} parking</span>
          )}
        </div>
      )
    },
    {
      id: 'contact',
      title: 'Contact',
      filterType: 'search',
      accessor: (location) => {
        const formatPhoneNumber = (phone: string) => {
          if (!phone) return null
          const cleaned = phone.replace(/\D/g, '')
          if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
          }
          return phone
        }
        
        return (
          <div className="text-sm space-y-1">
            {location.contact_name && (
              <div className="font-medium">{location.contact_name}</div>
            )}
            {location.contact_phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <a href={`tel:${location.contact_phone}`} className="text-blue-600 hover:underline text-xs">
                  {formatPhoneNumber(location.contact_phone)}
                </a>
              </div>
            )}
            {location.contact_email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <a href={`mailto:${location.contact_email}`} className="text-blue-600 hover:underline text-xs">
                  {location.contact_email}
                </a>
              </div>
            )}
            {!location.contact_name && !location.contact_phone && !location.contact_email && (
              <span className="text-muted-foreground">No contact info</span>
            )}
          </div>
        )
      }
    },
    {
      id: 'facilities',
      title: 'Facilities',
      filterType: 'search',
      accessor: (location) => {
        const facilities = Array.isArray(location.facilities) ? location.facilities : 
          (location.facilities ? JSON.parse(location.facilities) : [])
        return (
          <div className="flex flex-wrap gap-1">
            {facilities?.slice(0, 2).map((facility, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {facility}
              </Badge>
            ))}
            {facilities?.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{facilities.length - 2} more
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      id: 'rate',
      title: 'Cost',
      filterType: 'search',
      accessor: (location) => {
        const hourlyRate = location.hourly_rate
        const gameRate = location.game_rate
        
        return (
          <div className="text-sm space-y-1">
            {hourlyRate && (
              <div className="flex items-center">
                <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                <span className="font-medium">${parseFloat(hourlyRate).toFixed(2)}</span>
                <span className="text-muted-foreground ml-1">/hr</span>
              </div>
            )}
            {gameRate && (
              <div className="flex items-center">
                <DollarSign className="h-3 w-3 mr-1 text-blue-600" />
                <span className="font-medium">${parseFloat(gameRate).toFixed(2)}</span>
                <span className="text-muted-foreground ml-1">/game</span>
              </div>
            )}
            {!hourlyRate && !gameRate && (
              <span className="text-muted-foreground">No cost set</span>
            )}
            {location.cost_notes && (
              <div className="text-xs text-muted-foreground italic">
                {location.cost_notes}
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
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      accessor: (location) => (
        <Badge variant={location.is_active ? 'default' : 'secondary'}>
          {location.is_active ? 'Active' : 'Inactive'}
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
  const TeamCard: React.FC<{ team: any }> = ({ team }) => {
    const teamColors = team.colors || { primary: '#3b82f6', secondary: '#e2e8f0' }
    
    const formatPhoneNumber = (phone: string) => {
      if (!phone) return null
      // Format phone number as (XXX) XXX-XXXX if 10 digits
      const cleaned = phone.replace(/\D/g, '')
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      }
      return phone
    }
    
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: teamColors.primary }} />
            <div>
              <p className="font-medium">{team.name}</p>
              {/* Team Hierarchy Breadcrumb */}
              <div className="flex items-center text-xs text-muted-foreground space-x-1 mt-1 flex-wrap">
                <span className="font-medium">{team.organization || 'Unknown Org'}</span>
                <span>→</span>
                <span>{team.division || 'No Division'}</span>
                <span>→</span>
                <span>{team.age_group || 'No Age'} {team.gender || 'No Gender'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="default">Active</Badge>
            {team.level && (
              <Badge variant="outline" className="text-xs">{team.level}</Badge>
            )}
          </div>
        </div>
        
        {/* Team Details */}
        <div className="space-y-2 text-sm">
          {team.season && (
            <div className="flex items-center gap-2">
              <Building className="h-3 w-3 text-muted-foreground" />
              <span>{team.season}</span>
              {team.rank && (
                <span className="text-muted-foreground">• Rank #{team.rank}</span>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span>{team.location || 'No location set'}</span>
          </div>
          
          {/* Contact Information */}
          {(team.contact_email || team.contact_phone) && (
            <div className="pt-1 border-t border-gray-100">
              <div className="text-xs font-medium text-muted-foreground mb-1">Contact</div>
              {team.contact_email && (
                <div className="flex items-center gap-1 text-xs">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <a href={`mailto:${team.contact_email}`} className="text-blue-600 hover:underline">
                    {team.contact_email}
                  </a>
                </div>
              )}
              {team.contact_phone && (
                <div className="flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <a href={`tel:${team.contact_phone}`} className="text-blue-600 hover:underline">
                    {formatPhoneNumber(team.contact_phone)}
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Game Count */}
          {team.game_count !== undefined && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{team.game_count} games scheduled</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTeam(team.id)}>
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </Card>
    )
  }

  const LocationCard: React.FC<{ location: any }> = ({ location }) => {
    const facilities = Array.isArray(location.facilities) ? location.facilities : 
      (location.facilities ? JSON.parse(location.facilities) : [])
    
    const formatPhoneNumber = (phone: string) => {
      if (!phone) return null
      // Format phone number as (XXX) XXX-XXXX if 10 digits
      const cleaned = phone.replace(/\D/g, '')
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      }
      return phone
    }
    
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium">{location.name}</p>
            <p className="text-sm text-muted-foreground">
              {location.city}, {location.province}
            </p>
          </div>
          <Badge variant={location.is_active ? 'default' : 'secondary'}>
            {location.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        
        {/* Location Cost Display */}
        {(location.hourly_rate || location.game_rate) && (
          <div className="mb-3 p-2 bg-gray-50 rounded-md">
            <div className="text-xs font-medium text-muted-foreground mb-1">Cost Information</div>
            <div className="flex flex-wrap gap-2 items-center">
              {location.hourly_rate && (
                <div className="flex items-center text-sm">
                  <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                  <span className="font-medium">${parseFloat(location.hourly_rate).toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs ml-1">/hour</span>
                </div>
              )}
              {location.game_rate && (
                <div className="flex items-center text-sm">
                  <DollarSign className="h-3 w-3 mr-1 text-blue-600" />
                  <span className="font-medium">${parseFloat(location.game_rate).toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs ml-1">/game</span>
                </div>
              )}
            </div>
            {location.cost_notes && (
              <div className="text-xs text-muted-foreground italic mt-1">
                {location.cost_notes}
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div>{location.address}</div>
              <div className="text-xs text-muted-foreground">
                {location.city}, {location.province} {location.postal_code}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{location.capacity || 0} capacity</span>
            {location.parking_spaces && (
              <span className="text-muted-foreground">• {location.parking_spaces} parking</span>
            )}
          </div>
          
          {/* Contact Information */}
          {(location.contact_name || location.contact_phone || location.contact_email) && (
            <div className="pt-1 border-t border-gray-100">
              <div className="text-xs font-medium text-muted-foreground mb-1">Contact</div>
              {location.contact_name && (
                <div className="text-xs">{location.contact_name}</div>
              )}
              {location.contact_phone && (
                <div className="flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <a href={`tel:${location.contact_phone}`} className="text-blue-600 hover:underline">
                    {formatPhoneNumber(location.contact_phone)}
                  </a>
                </div>
              )}
              {location.contact_email && (
                <div className="flex items-center gap-1 text-xs">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <a href={`mailto:${location.contact_email}`} className="text-blue-600 hover:underline">
                    {location.contact_email}
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Facilities */}
          {facilities && facilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {facilities.slice(0, 3).map((facility: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {facility}
                </Badge>
              ))}
              {facilities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{facilities.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(location.id)}>
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </Card>
    )
  }

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
        <TabsList className="inline-flex">
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
