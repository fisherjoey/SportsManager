'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { Plus, Users, MapPin, Calendar, Clock, Eye, Edit, Trash2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { mockGames, mockReferees, type Game, type Referee } from '@/lib/mock-data'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { GameFilters, applyGameFilters, type ActiveFilters } from '@/components/ui/game-filters'

export function GameManagement() {
  const [games, setGames] = useState<Game[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [gameToAssign, setGameToAssign] = useState<Game | null>(null)
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    ageGroups: [],
    genders: [],
    divisions: [],
    zones: [],
    levels: [],
    statuses: []
  })
  const { toast } = useToast()

  // Load mock games data (temporarily using mock data instead of API)
  useEffect(() => {
    const loadGames = async () => {
      try {
        // Using mock data temporarily
        setGames(mockGames)
      } catch (error) {
        console.error('Error loading games:', error)
        toast({
          title: 'Error',
          description: 'Failed to load games.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
    loadGames()
  }, [])

  // Remove old filtering logic - DataTable will handle this

  const handleCreateGame = (gameData: any) => {
    const newGame = {
      id: (games.length + 1).toString(),
      ...gameData,
      status: 'unassigned' as const,
      assignedReferees: []
    }
    setGames([...games, newGame])
    setIsCreateDialogOpen(false)
    toast({
      title: 'Game created',
      description: 'New game has been added successfully.'
    })
  }

  const handleAssignReferee = async (gameId: string, refereeId: string) => {
    console.log('Assigning referee:', refereeId, 'to game:', gameId)
    
    // Find the game and check referee limits
    const targetGame = games.find(g => g.id === gameId)
    if (!targetGame) {
      toast({
        title: 'Error',
        description: 'Game not found.',
        variant: 'destructive'
      })
      return
    }

    const currentReferees = targetGame.assignedReferees || []
    const refsNeeded = targetGame.refsNeeded || targetGame.refs_needed || 2
    
    // Check if game is already full
    if (currentReferees.length >= refsNeeded) {
      toast({
        title: 'Error',
        description: `Game already has the maximum number of referees (${refsNeeded}).`,
        variant: 'destructive'
      })
      return
    }
    
    // Use only fallback logic (API endpoints not available yet)
    const referee = mockReferees.find((r) => r.id === refereeId)
    if (!referee) {
      toast({
        title: 'Error',
        description: 'Referee not found.',
        variant: 'destructive'
      })
      return
    }

    setGames(
      games.map((game) => {
        if (game.id === gameId) {
          // Check if referee is already assigned to avoid duplicates
          if (currentReferees.includes(referee.name)) {
            return game // Return unchanged if already assigned
          }
          const updatedReferees = [...currentReferees, referee.name]
          const newRefsNeeded = game.refsNeeded || game.refs_needed || 2
          return {
            ...game,
            assignedReferees: updatedReferees,
            status: updatedReferees.length >= newRefsNeeded ? 'assigned' : 'partial' as const
          }
        }
        return game
      }),
    )

    toast({
      title: 'Referee assigned',
      description: `${referee.name} has been assigned to the game.`
    })
    
    // Close the assign dialog
    setGameToAssign(null)
  }

  const handleMarkUpForGrabs = (gameId: string) => {
    setGames(games.map((game) => (game.id === gameId ? { ...game, status: 'up-for-grabs' as const } : game)))
    toast({
      title: 'Game marked as available',
      description: 'Game is now available for referees to pick up.'
    })
  }

  const handleEditGame = (gameId: string, field: string, value: any) => {
    setGames(games.map((game) => {
      if (game.id === gameId) {
        return { ...game, [field]: value }
      }
      return game
    }))
    
    toast({
      title: 'Game updated',
      description: `${field} has been updated successfully.`
    })
  }

  const handleImportGames = (importedGames: Game[]) => {
    try {
      // Get existing game IDs to prevent duplicates
      const existingIds = new Set(games.map(g => g.id))
      
      // Filter out games that already exist
      const newGames = importedGames.filter(g => !existingIds.has(g.id))
      
      // Add new games to the existing games
      setGames(prevGames => [...prevGames, ...newGames])
      
      toast({
        title: 'Games imported successfully',
        description: `Imported ${newGames.length} new games from CSV file.`
      })
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: 'Import failed',
        description: 'There was an error importing the games.',
        variant: 'destructive'
      })
    }
  }

  // Apply filters to games
  const filteredGames = applyGameFilters(games, activeFilters)

  // Stats for the games overview (based on filtered games)
  const stats = [
    {
      title: 'Total Games',
      value: filteredGames.length,
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
      title: 'This Week',
      value: filteredGames.filter((g) => {
        const gameDate = new Date(g.date)
        const now = new Date()
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return gameDate >= now && gameDate <= weekFromNow
      }).length,
      icon: Calendar,
      color: 'text-purple-600'
    }
  ]

  // Column definitions for the games table - simplified layout as requested
  const columns: ColumnDef<Game>[] = [
    {
      id: 'id',
      title: 'Game ID',
      filterType: 'search',
      accessor: (game) => (
        <span className="font-mono text-sm font-medium">{game.id}</span>
      )
    },
    {
      id: 'homeTeam',
      title: 'Home Team',
      filterType: 'search',
      accessor: (game) => {
        return <span className="text-sm font-medium">{formatTeamName(game.homeTeam)}</span>
      }
    },
    {
      id: 'awayTeam',
      title: 'Away Team',
      filterType: 'search',
      accessor: (game) => {
        return <span className="text-sm font-medium">{formatTeamName(game.awayTeam)}</span>
      }
    },
    {
      id: 'datetime',
      title: 'Date & Time',
      filterType: 'date',
      accessor: (game) => {
        const gameDate = new Date(game.date)
        const startTime = game.startTime || game.time
        const endTime = game.endTime
        
        // Format date as "Jan 14" 
        const dateStr = gameDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
        
        // Format time range as "10:00-11:30"
        const timeStr = startTime && endTime 
          ? `${startTime}-${endTime}`
          : startTime || 'TBD'
        
        return (
          <div>
            <p className="text-sm font-medium">{dateStr}, {timeStr}</p>
          </div>
        )
      }
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
      id: 'postalCode',
      title: 'Postal Code',
      filterType: 'search',
      accessor: (game) => (
        <span className="text-sm font-mono">{game.postalCode || 'N/A'}</span>
      )
    },
    {
      id: 'level',
      title: 'Level',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Levels' },
        { value: 'U13 Division 1', label: 'U13 Division 1' },
        { value: 'U15 Division 1', label: 'U15 Division 1' },
        { value: 'U18 Division 1', label: 'U18 Division 1' },
        { value: 'Recreational', label: 'Recreational' },
        { value: 'Competitive', label: 'Competitive' },
        { value: 'Elite', label: 'Elite' }
      ],
      accessor: (game) => (
        <Badge variant={game.level?.includes('Division') ? 'default' : 'secondary'}>
          {game.level || game.division}
        </Badge>
      )
    },
    {
      id: 'gameType',
      title: 'Game Type',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Types' },
        { value: 'Competitive', label: 'Competitive' },
        { value: 'Community', label: 'Community' },
        { value: 'Club', label: 'Club' },
        { value: 'Tournament', label: 'Tournament' },
        { value: 'Private Tournament', label: 'Private Tournament' }
      ],
      accessor: (game) => (
        <Badge variant="outline">{(game as any).gameType || 'Competitive'}</Badge>
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
          <Button variant="ghost" size="sm" onClick={() => setGameToEdit(game)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setGameToAssign(game)}>
            <Users className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={Calendar}
        title="Game Management"
        description="Manage all games and assignments"
      >
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Game
        </Button>
      </PageHeader>

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Games Directory</CardTitle>
              <CardDescription>Search and manage games across all divisions</CardDescription>
            </div>
            <GameFilters 
              games={games}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
          <FilterableTable 
            data={filteredGames} 
            columns={columns} 
            loading={loading}
            emptyMessage="No games found. Try adjusting your filters."
            enableViewToggle={true}
            enableCSV={true}
            mobileCardType="game"
            searchKey="homeTeam"
          />
        </CardContent>
      </Card>

      {/* Create Game Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <div></div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Game</DialogTitle>
            <DialogDescription>Add a new game to the system.</DialogDescription>
          </DialogHeader>
          <GameForm onSubmit={handleCreateGame} />
        </DialogContent>
      </Dialog>

      {/* Assign Referee Dialog */}
      {gameToAssign && (
        <AssignRefereeDialog 
          game={gameToAssign}
          onAssign={handleAssignReferee}
          allGames={games}
          onClose={() => setGameToAssign(null)}
        />
      )}

      {/* Edit Game Dialog */}
      {gameToEdit && (
        <EditGameDialog 
          game={gameToEdit}
          onSave={(updatedGame) => {
            setGames(games.map((game) => game.id === updatedGame.id ? updatedGame : game))
            setGameToEdit(null)
            toast({
              title: 'Game updated',
              description: 'Game details have been updated successfully.'
            })
          }}
          onClose={() => setGameToEdit(null)}
        />
      )}
    </PageLayout>
  )
}

function GameForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    homeTeam: '',
    awayTeam: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    postalCode: '',
    level: '',
    gameType: 'Competitive',
    payRate: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that end time is after start time
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      toast({
        title: 'Invalid Time Range',
        description: 'End time must be after start time.',
        variant: 'destructive'
      })
      return
    }
    
    onSubmit({
      ...formData,
      time: formData.startTime, // Map startTime to time for compatibility
      payRate: Number.parseFloat(formData.payRate)
    })
    setFormData({
      homeTeam: '',
      awayTeam: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      postalCode: '',
      level: '',
      gameType: 'Competitive',
      payRate: ''
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="homeTeam">Home Team</Label>
          <Input
            id="homeTeam"
            value={formData.homeTeam}
            onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
            placeholder="e.g., Okotoks U13B"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awayTeam">Away Team</Label>
          <Input
            id="awayTeam"
            value={formData.awayTeam}
            onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
            placeholder="e.g., Calgary U13B"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Central Park Field 1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            placeholder="e.g., T1S 1A1"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="U13 Division 1">U13 Division 1</SelectItem>
              <SelectItem value="U15 Division 1">U15 Division 1</SelectItem>
              <SelectItem value="U18 Division 1">U18 Division 1</SelectItem>
              <SelectItem value="Recreational">Recreational</SelectItem>
              <SelectItem value="Competitive">Competitive</SelectItem>
              <SelectItem value="Elite">Elite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gameType">Game Type</Label>
          <Select value={formData.gameType} onValueChange={(value) => setFormData({ ...formData, gameType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select game type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Competitive">Competitive</SelectItem>
              <SelectItem value="Community">Community</SelectItem>
              <SelectItem value="Club">Club</SelectItem>
              <SelectItem value="Tournament">Tournament</SelectItem>
              <SelectItem value="Private Tournament">Private Tournament</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="payRate">Pay Rate ($)</Label>
        <Input
          id="payRate"
          type="number"
          step="0.01"
          value={formData.payRate}
          onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
          placeholder="e.g., 75.00"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Create Game
      </Button>
    </form>
  )
}

function AssignRefereeDialog({ game, onAssign, allGames, onClose }: { 
  game: any; 
  onAssign: (gameId: string, refereeId: string) => void; 
  allGames: any[];
  onClose?: () => void;
}) {
  const [selectedReferee, setSelectedReferee] = useState('')
  const [availableReferees, setAvailableReferees] = useState<Referee[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (game.id) {
      fetchAvailableReferees()
    }
  }, [game.id])

  const fetchAvailableReferees = async () => {
    setLoading(true)
    
    // Use only client-side filtering (API endpoints not available yet)
    const filteredReferees = mockReferees.filter(referee => {
      // Only show available referees
      if (!referee.isAvailable) return false
      
      // Check if referee is already assigned to this specific game
      const currentAssignments = game.assignedReferees || []
      if (currentAssignments.includes(referee.name)) return false
      
      // Check if referee is already assigned to a game at the same time
      const gameDate = game.date || game.game_date
      const gameTime = game.time || game.game_time
      
      const conflictingGame = allGames.find(g => {
        const gDate = g.date || g.game_date
        const gTime = g.time || g.game_time
        
        return g.id !== game.id && 
               gDate === gameDate && 
               gTime === gameTime &&
               (g.assignedReferees?.includes(referee.name) || 
                g.assignments?.some(a => a.referee_name === referee.name))
      })
      
      return !conflictingGame
    }) as Referee[]
    
    console.log('Filtered referees:', filteredReferees)
    setAvailableReferees(filteredReferees)
    
    if (filteredReferees.length === 0) {
      toast({
        title: 'No Available Referees',
        description: 'No referees are available for this time slot.',
        variant: 'destructive'
      })
    }
    
    setLoading(false)
  }

  const handleAssign = () => {
    if (selectedReferee) {
      const currentReferees = game.assignedReferees || []
      const refsNeeded = game.refsNeeded || game.refs_needed || 2
      
      // Double-check referee limits
      if (currentReferees.length >= refsNeeded) {
        toast({
          title: 'Game Full',
          description: `This game already has the maximum number of referees (${refsNeeded}).`,
          variant: 'destructive'
        })
        onClose?.()
        return
      }
      
      onAssign(game.id, selectedReferee)
      setSelectedReferee('')
      onClose?.()
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Referee</DialogTitle>
          <DialogDescription>
            Select an available referee for {formatGameMatchup(game.homeTeam, game.awayTeam)} on {new Date(game.date || game.game_date).toLocaleDateString()} at {game.time || game.game_time}
            <br />
            <span className="text-sm font-medium">
              Current referees: {(game.assignedReferees || []).length} / {game.refsNeeded || game.refs_needed || 2}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedReferee} onValueChange={setSelectedReferee} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? 'Loading referees...' : 'Select a referee'} />
            </SelectTrigger>
            <SelectContent>
              {availableReferees.length > 0 ? (
                availableReferees.map((referee) => (
                  <SelectItem key={referee.id} value={referee.id}>
                    {referee.name} - {referee.certificationLevel} ({referee.location || 'No location'})
                  </SelectItem>
                ))
              ) : (
                !loading && (
                  <SelectItem value="all" disabled>
                    No available referees for this time slot
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleAssign} disabled={!selectedReferee || loading} className="w-full">
            {loading ? 'Loading...' : 'Assign Referee'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditGameDialog({ game, onSave, onClose }: { 
  game: Game; 
  onSave: (updatedGame: Game) => void; 
  onClose?: () => void;
}) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    homeTeam: formatTeamName(game.homeTeam),
    awayTeam: formatTeamName(game.awayTeam),
    date: game.date ? new Date(game.date).toISOString().split('T')[0] : '',
    startTime: game.startTime || game.time || '',
    endTime: game.endTime || '',
    location: game.location || '',
    postalCode: game.postalCode || '',
    level: game.level || '',
    gameType: game.gameType || 'Competitive',
    division: game.division || '',
    season: game.season || '',
    wageMultiplier: game.wageMultiplier || '1.0',
    wageMultiplierReason: game.wageMultiplierReason || '',
    refsNeeded: (game.refsNeeded || game.refs_needed || 2).toString()
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that end time is after start time
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      toast({
        title: 'Invalid Time Range',
        description: 'End time must be after start time.',
        variant: 'destructive'
      })
      return
    }
    
    const updatedGame: Game = {
      ...game,
      homeTeam: formData.homeTeam,
      awayTeam: formData.awayTeam,
      date: formData.date,
      time: formData.startTime, // Map startTime to time for compatibility
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location,
      postalCode: formData.postalCode,
      level: formData.level,
      gameType: formData.gameType,
      division: formData.division,
      season: formData.season,
      wageMultiplier: formData.wageMultiplier,
      wageMultiplierReason: formData.wageMultiplierReason,
      refsNeeded: parseInt(formData.refsNeeded),
      refs_needed: parseInt(formData.refsNeeded) // Keep both for compatibility
    }
    
    onSave(updatedGame)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Game</DialogTitle>
          <DialogDescription>
            Update game details for #{game.id.slice(-8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeTeam">Home Team</Label>
              <Input
                id="homeTeam"
                value={formData.homeTeam}
                onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeam">Away Team</Label>
              <Input
                id="awayTeam"
                value={formData.awayTeam}
                onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
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
            <div className="space-y-2">
              <Label htmlFor="gameType">Game Type</Label>
              <Select value={formData.gameType} onValueChange={(value) => setFormData({ ...formData, gameType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Community">Community</SelectItem>
                  <SelectItem value="Club">Club</SelectItem>
                  <SelectItem value="Tournament">Tournament</SelectItem>
                  <SelectItem value="Private Tournament">Private Tournament</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="division">Division</Label>
              <Input
                id="division"
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                placeholder="e.g., U15 Division 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season">Season</Label>
              <Input
                id="season"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder="e.g., 2024 Fall"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wageMultiplier">Pay Modifier</Label>
              <Select 
                value={formData.wageMultiplier} 
                onValueChange={(value) => setFormData({ ...formData, wageMultiplier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.8">Reduced (0.8x)</SelectItem>
                  <SelectItem value="1.0">Standard (1.0x)</SelectItem>
                  <SelectItem value="1.5">Time and Half (1.5x)</SelectItem>
                  <SelectItem value="2.0">Double Time (2.0x)</SelectItem>
                  <SelectItem value="2.5">Holiday Rate (2.5x)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wageMultiplierReason">Reason</Label>
              <Input
                id="wageMultiplierReason"
                value={formData.wageMultiplierReason}
                onChange={(e) => setFormData({ ...formData, wageMultiplierReason: e.target.value })}
                placeholder="e.g., Holiday, Overtime"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refsNeeded">Referees Needed</Label>
              <Select 
                value={formData.refsNeeded} 
                onValueChange={(value) => setFormData({ ...formData, refsNeeded: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Referee</SelectItem>
                  <SelectItem value="2">2 Referees</SelectItem>
                  <SelectItem value="3">3 Referees</SelectItem>
                  <SelectItem value="4">4 Referees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
