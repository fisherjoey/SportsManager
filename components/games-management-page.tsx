'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Clock, MapPin, Users, Edit, Trash2, Eye, Download, Upload, Calendar, LayoutGrid, Table } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  fullWidth?: boolean  // Add prop to control full width mode
}

export function GamesManagementPage({ initialDateFilter, fullWidth = false }: GamesManagementPageProps = {}) {
  const [games, setGames] = useState<Game[]>([])
  const [totalGames, setTotalGames] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(initialDateFilter || 'all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards') // Default to cards view
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
  useEffect(() => {
    const fetchGames = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        // Initialize token before making API calls
        apiClient.initializeToken()
        const response = await apiClient.getGames({ limit: 100 })
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

    fetchGames()
  }, [isAuthenticated, toast])

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

  // For full width mode, don't use PageLayout wrapper at all
  const content = (
    <>
      <div className={fullWidth ? "px-4 py-4" : "px-6 pt-6"}>
        <PageHeader
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
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Game
        </Button>
      </PageHeader>
      </div>

      {/* Only show regular stats grid when not viewing mentee games */}
      {!selectedMenteeId && (
        <div className={fullWidth ? "px-4" : "px-6"}>
          <StatsGrid stats={stats} />
        </div>
      )}

      {/* Filters */}
      <div className={fullWidth ? "px-4 pb-4" : "px-6"}>
        <Card className="mb-6">
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
        </CardContent>
      </Card>

      </div>

      {/* Regular Games Table - only show when not viewing mentee games */}
      {!selectedMenteeId && (
        loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading games...</p>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <FilterableTable data={filteredGames} columns={columns} emptyMessage="No games found matching your criteria." />
          </div>
        )
      )}

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
    </>
  )

  // For fullWidth mode, return without PageLayout wrapper
  if (fullWidth) {
    return content
  }

  // Otherwise use PageLayout
  return (
    <PageLayout variant="default" padding="medium">
      {content}
    </PageLayout>
  )
}