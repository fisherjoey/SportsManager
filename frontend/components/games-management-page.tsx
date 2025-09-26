'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Calendar, Clock, MapPin, Users, Edit, Trash2, Eye, Download, Upload, FileUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { type Game } from '@/lib/types/games'
import { useToast } from '@/components/ui/use-toast'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { usePermissions } from '@/hooks/usePermissions'
import { MenteeSelector } from '@/components/MenteeSelector'
import { MenteeGamesView } from '@/components/MenteeGamesView'
import CalendarUpload from '@/components/calendar-upload'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface GamesManagementPageProps {
  initialDateFilter?: string
}

// Create Game Dialog Component
interface CreateGameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGameCreated: (game: Game) => void
}

function CreateGameDialog({ open, onOpenChange, onGameCreated }: CreateGameDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    homeTeam: {
      organization: '',
      ageGroup: '',
      gender: 'Boys' as 'Boys' | 'Girls',
      rank: 1
    },
    awayTeam: {
      organization: '',
      ageGroup: '',
      gender: 'Boys' as 'Boys' | 'Girls',
      rank: 1
    },
    date: '',
    time: '',
    location: '',
    postalCode: '',
    level: 'Recreational',
    gameType: 'Community' as 'Community' | 'Club' | 'Tournament' | 'Private Tournament',
    division: '',
    season: '',
    payRate: 0,
    refsNeeded: 2,
    wageMultiplier: 1.0,
    wageMultiplierReason: ''
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      apiClient.initializeToken()
      const response = await apiClient.createGame(formData)

      // Transform response to match frontend Game type
      const newGame: Game = {
        id: response.data.id,
        homeTeam: response.data.homeTeam,
        awayTeam: response.data.awayTeam,
        date: response.data.date,
        time: response.data.time,
        startTime: response.data.startTime,
        location: response.data.location,
        level: response.data.level,
        gameType: response.data.gameType,
        division: response.data.division,
        season: response.data.season,
        status: response.data.status || 'unassigned',
        refsNeeded: response.data.refsNeeded,
        assignedReferees: response.data.assignedReferees || [],
        payRate: response.data.payRate,
        wageMultiplier: response.data.wageMultiplier,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt
      }

      onGameCreated(newGame)
    } catch (error: any) {
      console.error('Failed to create game:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create game. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.')
      const newData = { ...prev }
      let current: any = newData

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }

      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Game</DialogTitle>
          <DialogDescription>
            Add a new game to the system with team details and scheduling information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Information */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Home Team */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Home Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="home-organization">Organization</Label>
                  <Input
                    id="home-organization"
                    value={formData.homeTeam.organization}
                    onChange={(e) => updateFormData('homeTeam.organization', e.target.value)}
                    placeholder="e.g., Toronto FC"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="home-age-group">Age Group</Label>
                  <Input
                    id="home-age-group"
                    value={formData.homeTeam.ageGroup}
                    onChange={(e) => updateFormData('homeTeam.ageGroup', e.target.value)}
                    placeholder="e.g., U14"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="home-gender">Gender</Label>
                  <Select value={formData.homeTeam.gender} onValueChange={(value) => updateFormData('homeTeam.gender', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boys">Boys</SelectItem>
                      <SelectItem value="Girls">Girls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="home-rank">Rank/Number</Label>
                  <Input
                    id="home-rank"
                    type="number"
                    min="1"
                    value={formData.homeTeam.rank}
                    onChange={(e) => updateFormData('homeTeam.rank', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Away Team */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Away Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="away-organization">Organization</Label>
                  <Input
                    id="away-organization"
                    value={formData.awayTeam.organization}
                    onChange={(e) => updateFormData('awayTeam.organization', e.target.value)}
                    placeholder="e.g., Vancouver Whitecaps"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="away-age-group">Age Group</Label>
                  <Input
                    id="away-age-group"
                    value={formData.awayTeam.ageGroup}
                    onChange={(e) => updateFormData('awayTeam.ageGroup', e.target.value)}
                    placeholder="e.g., U14"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="away-gender">Gender</Label>
                  <Select value={formData.awayTeam.gender} onValueChange={(value) => updateFormData('awayTeam.gender', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boys">Boys</SelectItem>
                      <SelectItem value="Girls">Girls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="away-rank">Rank/Number</Label>
                  <Input
                    id="away-rank"
                    type="number"
                    min="1"
                    value={formData.awayTeam.rank}
                    onChange={(e) => updateFormData('awayTeam.rank', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Game Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateFormData('date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => updateFormData('time', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateFormData('location', e.target.value)}
                    placeholder="e.g., BMO Field"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postal-code">Postal Code</Label>
                  <Input
                    id="postal-code"
                    value={formData.postalCode}
                    onChange={(e) => updateFormData('postalCode', e.target.value)}
                    placeholder="e.g., M6K 3C3"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="level">Level</Label>
                  <Select value={formData.level} onValueChange={(value) => updateFormData('level', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recreational">Recreational</SelectItem>
                      <SelectItem value="Competitive">Competitive</SelectItem>
                      <SelectItem value="Elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="game-type">Game Type</Label>
                  <Select value={formData.gameType} onValueChange={(value) => updateFormData('gameType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Community">Community</SelectItem>
                      <SelectItem value="Club">Club</SelectItem>
                      <SelectItem value="Tournament">Tournament</SelectItem>
                      <SelectItem value="Private Tournament">Private Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="refs-needed">Refs Needed</Label>
                  <Input
                    id="refs-needed"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.refsNeeded}
                    onChange={(e) => updateFormData('refsNeeded', parseInt(e.target.value) || 2)}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="division">Division</Label>
                  <Input
                    id="division"
                    value={formData.division}
                    onChange={(e) => updateFormData('division', e.target.value)}
                    placeholder="e.g., Premier"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="season">Season</Label>
                  <Input
                    id="season"
                    value={formData.season}
                    onChange={(e) => updateFormData('season', e.target.value)}
                    placeholder="e.g., Fall 2024"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pay-rate">Pay Rate ($)</Label>
                  <Input
                    id="pay-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.payRate}
                    onChange={(e) => updateFormData('payRate', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="wage-multiplier">Wage Multiplier</Label>
                  <Input
                    id="wage-multiplier"
                    type="number"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={formData.wageMultiplier}
                    onChange={(e) => updateFormData('wageMultiplier', parseFloat(e.target.value) || 1.0)}
                  />
                </div>
                <div>
                  <Label htmlFor="wage-multiplier-reason">Multiplier Reason</Label>
                  <Input
                    id="wage-multiplier-reason"
                    value={formData.wageMultiplierReason}
                    onChange={(e) => updateFormData('wageMultiplierReason', e.target.value)}
                    placeholder="Optional reason"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Game'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GamesManagementPage({ initialDateFilter }: GamesManagementPageProps = {}) {
  const [games, setGames] = useState<Game[]>([])
  const [totalGames, setTotalGames] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(initialDateFilter || 'all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)
  const [calendarUploadOpen, setCalendarUploadOpen] = useState(false)
  const [createGameOpen, setCreateGameOpen] = useState(false)
  // Mentorship-related state
  const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null)
  const [selectedMenteeName, setSelectedMenteeName] = useState<string>('')
  const [mentees, setMentees] = useState<any[]>([])
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const { hasPermission, hasAnyPermission } = usePermissions()

  // Check if user has mentorship permissions
  const isMentor = hasAnyPermission(['mentorships:read', 'mentorships:manage'])

  // Fetch mentees for mentor dropdown
  useEffect(() => {
    const fetchMentees = async () => {
      if (!isAuthenticated || !isMentor) return

      try {
        apiClient.initializeToken()
        const response = await apiClient.getMenteesByMentor(undefined, {
          status: 'active',
          includeDetails: true
        })
        
        if (response.data) {
          setMentees(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch mentees:', error)
        // Don't show toast error for mentees as it's optional functionality
      }
    }

    fetchMentees()
  }, [isAuthenticated, isMentor])

  // Handle mentee selection
  const handleMenteeChange = (menteeId: string | null) => {
    setSelectedMenteeId(menteeId)
    if (menteeId) {
      const mentee = mentees.find(m => m.id === menteeId)
      setSelectedMenteeName(mentee?.name || '')
    } else {
      setSelectedMenteeName('')
    }
  }

  // Fetch games from API
  const fetchGames = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Initialize token before making API calls
      apiClient.initializeToken()
      const response = await apiClient.getGames({ limit: 500 })
      setGames(response.data || [])
      // Set total count from pagination if available
      if (response.pagination?.total) {
        setTotalGames(response.pagination.total)
      } else {
        setTotalGames(response.data?.length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch games:', error)
      toast({
        title: 'Error',
        description: 'Failed to load games. Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch games on mount and when authentication changes
  useEffect(() => {
    fetchGames()
  }, [isAuthenticated])

  // Update date filter when initialDateFilter prop changes
  useEffect(() => {
    if (initialDateFilter) {
      setSelectedDate(initialDateFilter)
    }
  }, [initialDateFilter])

  const filteredGames = games.filter((game) => {
    const homeTeamName = typeof game.homeTeam === 'object' 
      ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
      : game.homeTeam
    const awayTeamName = typeof game.awayTeam === 'object' 
      ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
      : game.awayTeam

    const matchesSearch =
      homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      awayTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = selectedLevel === 'all' || game.level === selectedLevel
    const matchesStatus = selectedStatus === 'all' || game.status === selectedStatus
    const matchesDate = selectedDate === 'all' || game.date === selectedDate

    return matchesSearch && matchesLevel && matchesStatus && matchesDate
  })

  const handleDeleteGame = async () => {
    if (!gameToDelete) return
    
    try {
      await apiClient.deleteGame(gameToDelete.id)
      setGames(games.filter((g) => g.id !== gameToDelete.id))
      toast({
        title: 'Game deleted',
        description: 'The game has been removed from the system.'
      })
      setDeleteDialogOpen(false)
      setGameToDelete(null)
    } catch (error) {
      console.error('Failed to delete game:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete game. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const openDeleteDialog = (game: Game) => {
    setGameToDelete(game)
    setDeleteDialogOpen(true)
  }

  const stats = [
    {
      title: selectedDate !== 'all' ? 'Games This Day' : 'Total Games',
      value: selectedDate !== 'all' ? filteredGames.length : totalGames,
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      title: 'Unassigned',
      value: filteredGames.filter((g) => g.status === 'unassigned').length,
      icon: Clock,
      color: 'text-red-600'
    },
    {
      title: 'Assigned',
      value: filteredGames.filter((g) => g.status === 'assigned').length,
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: selectedDate !== 'all' ? 'Up for Grabs' : 'This Week',
      value: selectedDate !== 'all' 
        ? filteredGames.filter((g) => g.status === 'up-for-grabs').length
        : games.filter((g) => {
          const gameDate = new Date(g.date)
          const now = new Date()
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          return gameDate >= now && gameDate <= weekFromNow
        }).length,
      icon: Calendar,
      color: selectedDate !== 'all' ? 'text-orange-600' : 'text-purple-600'
    }
  ]

  // Column definitions for the games table
  const columns: ColumnDef<Game>[] = [
    {
      id: 'game',
      title: 'Game',
      filterType: 'search',
      accessor: (game) => {
        const homeTeamName = typeof game.homeTeam === 'object' 
          ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
          : game.homeTeam
        const awayTeamName = typeof game.awayTeam === 'object' 
          ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
          : game.awayTeam
        
        return (
          <div>
            <p className="font-medium">
              {homeTeamName} vs {awayTeamName}
            </p>
            <p className="text-sm text-muted-foreground">{game.division}</p>
          </div>
        )
      }
    },
    {
      id: 'datetime',
      title: 'Date & Time',
      filterType: 'search',
      accessor: (game) => (
        <div>
          <p className="text-sm">{new Date(game.date).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground">
            {game.time || game.startTime} {game.endTime ? `- ${game.endTime}` : ''}
          </p>
        </div>
      )
    },
    {
      id: 'location',
      title: 'Location',
      filterType: 'search',
      accessor: (game) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
          <span className="text-sm">{game.location}</span>
        </div>
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
      accessor: (game) => (
        <Badge variant={game.level === 'Elite' ? 'default' : 'secondary'}>
          {game.level}
        </Badge>
      )
    },
    {
      id: 'division',
      title: 'Division',
      filterType: 'search',
      accessor: 'division'
    },
    {
      id: 'referees',
      title: 'Referees',
      filterType: 'search',
      accessor: (game) => (
        <div>
          <p className="text-sm font-medium">
            {game.assignedReferees?.length || 0}/{game.refsNeeded}
          </p>
          <p className="text-xs text-muted-foreground">
            {game.assignedReferees?.join(', ') || 'None assigned'}
          </p>
        </div>
      )
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Status' },
        { value: 'unassigned', label: 'Unassigned' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'up-for-grabs', label: 'Up for Grabs' }
      ],
      accessor: (game) => (
        <Badge
          variant={
            game.status === 'assigned' ? 'default' :
              game.status === 'unassigned' ? 'destructive' :
                'secondary'
          }
        >
          {game.status === 'up-for-grabs' ? 'Up for Grabs' : 
            game.status.charAt(0).toUpperCase() + game.status.slice(1)}
        </Badge>
      )
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (game) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          {hasPermission('games:delete') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => openDeleteDialog(game)}
              className="hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={Calendar}
        title={selectedMenteeId ? `${selectedMenteeName}'s Games` : "Game Management"}
        description={
          selectedMenteeId 
            ? `Viewing game assignments and performance for ${selectedMenteeName}`
            : selectedDate !== 'all' 
              ? `Games for ${new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}`
              : 'Manage all games across divisions and levels'
        }
      >
        {selectedDate !== 'all' && (
          <>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              <Calendar className="h-3 w-3 mr-1" />
              Filtered by Date
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDate('all')}
              className="text-gray-600"
            >
              Clear Date Filter
            </Button>
          </>
        )}
        <Button
          variant="outline"
          onClick={() => setCalendarUploadOpen(true)}
        >
          <FileUp className="h-4 w-4 mr-2" />
          Import Calendar
        </Button>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button onClick={() => setCreateGameOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Game
        </Button>
      </PageHeader>

      {/* Only show regular stats grid when not viewing mentee games */}
      {!selectedMenteeId && <StatsGrid stats={stats} />}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedMenteeId ? 'Mentorship Controls' : 'Game Directory'}
          </CardTitle>
          <CardDescription>
            {selectedMenteeId 
              ? 'Select a different mentee or switch back to all games view'
              : 'Search and filter games across all divisions and levels'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mentorship Selector - only show for mentors */}
          {isMentor && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Mentorship View</h4>
                  <p className="text-xs text-muted-foreground">
                    View games for your mentees or switch to all games view
                  </p>
                </div>
                <MenteeSelector
                  selectedMenteeId={selectedMenteeId}
                  onMenteeChange={handleMenteeChange}
                  placeholder="Select a mentee..."
                />
              </div>
            </div>
          )}

          {/* Regular filters - only show when not viewing mentee games */}
          {!selectedMenteeId && (
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="up-for-grabs">Up for Grabs</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                type="date"
                placeholder="Filter by date"
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'all')}
                className={`w-[150px] ${
                  selectedDate !== 'all' ? 'ring-2 ring-blue-500 border-blue-500' : ''
                }`}
              />
              {selectedDate !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 bg-blue-100 text-blue-700 text-xs px-1 py-0"
                >
                  Active
                </Badge>
              )}
            </div>
            </div>
          )}

          {/* Regular Games Table - only show when not viewing mentee games */}
          {!selectedMenteeId && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading games...</p>
                  </div>
                </div>
              ) : (
                <FilterableTable data={filteredGames} columns={columns} emptyMessage="No games found matching your criteria." />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Mentee Games View - only show when mentee is selected */}
      {selectedMenteeId && selectedMenteeName && (
        <MenteeGamesView 
          menteeId={selectedMenteeId}
          menteeName={selectedMenteeName}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Game</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this game?
              {gameToDelete && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="font-medium">
                    {typeof gameToDelete.homeTeam === 'object' 
                      ? `${gameToDelete.homeTeam.organization} ${gameToDelete.homeTeam.ageGroup} ${gameToDelete.homeTeam.gender}`
                      : gameToDelete.homeTeam}
                    {' vs '}
                    {typeof gameToDelete.awayTeam === 'object' 
                      ? `${gameToDelete.awayTeam.organization} ${gameToDelete.awayTeam.ageGroup} ${gameToDelete.awayTeam.gender}`
                      : gameToDelete.awayTeam}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(gameToDelete.date).toLocaleDateString()} at {gameToDelete.time || gameToDelete.startTime}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Location: {gameToDelete.location}
                  </p>
                </div>
              )}
              <p className="mt-3 text-sm font-medium text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGame}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Calendar Upload Dialog */}
      <Dialog open={calendarUploadOpen} onOpenChange={setCalendarUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Games from Calendar</DialogTitle>
            <DialogDescription>
              Upload an ICS calendar file to import games into the system
            </DialogDescription>
          </DialogHeader>
          <CalendarUpload
            onUploadComplete={(result) => {
              toast({
                title: 'Import Complete',
                description: `Successfully imported ${result.imported} games`,
              })
              setCalendarUploadOpen(false)
              // Refresh games list
              fetchGames()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Create Game Dialog */}
      <CreateGameDialog
        open={createGameOpen}
        onOpenChange={setCreateGameOpen}
        onGameCreated={(newGame) => {
          // Add the new game to the list
          setGames(prevGames => [newGame, ...prevGames])
          setTotalGames(prev => prev + 1)
          toast({
            title: 'Game created',
            description: 'New game has been added to the system.'
          })
          setCreateGameOpen(false)
        }}
      />
    </PageLayout>
  )
}