'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, Clock, MapPin, Users, Brain, CheckCircle2, AlertTriangle, 
  Play, Sparkles, Upload, Download, Plus, Trash2 
} from 'lucide-react'

import { apiClient } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

interface Game {
  id: string
  date: string
  time: string
  endTime: string
  homeTeam: string
  awayTeam: string
  location: string
  division: string
  requiredReferees: number
  assignedReferees: string[]
  status: 'unassigned' | 'partial' | 'assigned'
  isSelected?: boolean
}

interface Referee {
  id: string
  name: string
  level: string
  experience: number
  location: string
  available: boolean
  email: string
  phone: string
  unavailableDates?: string[]
  maxGamesPerDay?: number
  preferredLocations?: string[]
}

interface AIAssignmentSuggestion {
  gameId: string
  refereeId: string
  refereeName: string
  confidence: number
  reasoning: string
  conflicts?: string[]
}

interface RefereeConflict {
  type: 'time_overlap' | 'unavailable' | 'max_games_exceeded' | 'location_preference'
  message: string
  severity: 'error' | 'warning'
}

interface GameChunk {
  id: string
  games: Game[]
  location: string
  date: string
  startTime: string
  endTime: string
  totalReferees: number
  suggestions?: AIAssignmentSuggestion[]
}

// Mock data - replace with API calls
const mockGames: Game[] = [
  {
    id: '1',
    date: '2024-01-15',
    time: '18:00',
    endTime: '19:30',
    homeTeam: 'Lakers',
    awayTeam: 'Warriors',
    location: 'Downtown Arena',
    division: 'Senior A',
    requiredReferees: 2,
    assignedReferees: [],
    status: 'unassigned'
  },
  {
    id: '2',
    date: '2024-01-15',
    time: '19:45',
    endTime: '21:15',
    homeTeam: 'Bulls',
    awayTeam: 'Celtics',
    location: 'Downtown Arena',
    division: 'Senior A',
    requiredReferees: 2,
    assignedReferees: [],
    status: 'unassigned'
  },
  {
    id: '3',
    date: '2024-01-16',
    time: '18:00',
    endTime: '19:30',
    homeTeam: 'Heat',
    awayTeam: 'Spurs',
    location: 'Westside Sports Center',
    division: 'Junior A',
    requiredReferees: 2,
    assignedReferees: [],
    status: 'unassigned'
  }
]

const mockReferees: Referee[] = [
  { 
    id: '1', 
    name: 'John Smith', 
    level: 'Senior', 
    experience: 8, 
    location: 'Downtown', 
    available: true, 
    email: 'john@email.com', 
    phone: '555-0101',
    maxGamesPerDay: 3,
    preferredLocations: ['Downtown Arena', 'Westside Sports Center']
  },
  { 
    id: '2', 
    name: 'Sarah Johnson', 
    level: 'Junior', 
    experience: 3, 
    location: 'Downtown', 
    available: true, 
    email: 'sarah@email.com', 
    phone: '555-0102',
    unavailableDates: ['2024-01-16'],
    maxGamesPerDay: 2,
    preferredLocations: ['Downtown Arena']
  },
  { 
    id: '3', 
    name: 'Mike Wilson', 
    level: 'Senior', 
    experience: 12, 
    location: 'Westside', 
    available: true, 
    email: 'mike@email.com', 
    phone: '555-0103',
    maxGamesPerDay: 4,
    preferredLocations: ['Westside Sports Center']
  },
  { 
    id: '4', 
    name: 'Lisa Brown', 
    level: 'Rookie', 
    experience: 1, 
    location: 'Westside', 
    available: false, 
    email: 'lisa@email.com', 
    phone: '555-0104',
    unavailableDates: ['2024-01-15', '2024-01-16'],
    maxGamesPerDay: 1
  }
]

export default function AIAssignmentsSimple() {
  const [games, setGames] = useState<Game[]>([])
  const [referees, setReferees] = useState<Referee[]>([])
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [chunks, setChunks] = useState<GameChunk[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<GameChunk | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterDate, setFilterDate] = useState('all')

  // Load data from backend
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setDataLoading(true)
      
      // Ensure apiClient has the current token
      apiClient.initializeToken()
      
      // Load games and referees in parallel
      const [gamesResponse, referees] = await Promise.all([
        apiClient.getGames(),
        apiClient.getReferees()
      ])

      if (gamesResponse.success) {
        // Transform API games to our interface
        const transformedGames: Game[] = gamesResponse.data.map((game: any) => ({
          id: game.id.toString(),
          date: game.game_date,
          time: game.game_time,
          endTime: game.end_time || addHoursToTime(game.game_time, 1.5), // Default 1.5 hour games
          homeTeam: game.home_team_name || `Team ${game.home_team_id}`,
          awayTeam: game.away_team_name || `Team ${game.away_team_id}`,
          location: game.location || 'TBD',
          division: game.level || 'Open',
          requiredReferees: game.refs_needed || 2,
          assignedReferees: [],
          status: 'unassigned' as const
        }))
        setGames(transformedGames)
      } else {
        // Fall back to mock data if API fails
        setGames(mockGames)
      }

      if (referees && Array.isArray(referees)) {
        // Transform API referees to our interface
        const transformedReferees: Referee[] = referees.map((ref: any) => ({
          id: ref.id.toString(),
          name: ref.name,
          level: ref.level || 'Junior',
          experience: ref.experience || 1,
          location: ref.location || 'Unknown',
          available: ref.is_active !== false,
          email: ref.email,
          phone: ref.phone || '',
          maxGamesPerDay: ref.max_games_per_day || 3,
          preferredLocations: ref.preferred_locations || []
        }))
        setReferees(transformedReferees)
      } else {
        // Fall back to mock data if API fails
        setReferees(mockReferees)
      }

    } catch (error) {
      console.error('Error loading data:', error)
      // Fall back to mock data on error
      setGames(mockGames)
      setReferees(mockReferees)
    } finally {
      setDataLoading(false)
    }
  }

  // Helper function to add hours to time string
  const addHoursToTime = (timeStr: string, hours: number): string => {
    const [hoursNum, minutes] = timeStr.split(':').map(Number)
    const totalMinutes = hoursNum * 60 + minutes + (hours * 60)
    const newHours = Math.floor(totalMinutes / 60) % 24
    const newMinutes = totalMinutes % 60
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
  }

  // Conflict detection functions
  const checkRefereeConflicts = (referee: Referee, game: Game, existingAssignments: Game[]): RefereeConflict[] => {
    const conflicts: RefereeConflict[] = []

    // Check if referee is generally available
    if (!referee.available) {
      conflicts.push({
        type: 'unavailable',
        message: 'Referee is marked as unavailable',
        severity: 'error'
      })
    }

    // Check date availability
    if (referee.unavailableDates?.includes(game.date)) {
      conflicts.push({
        type: 'unavailable',
        message: `Referee is unavailable on ${new Date(game.date).toLocaleDateString()}`,
        severity: 'error'
      })
    }

    // Check location preferences
    if (referee.preferredLocations && !referee.preferredLocations.includes(game.location)) {
      conflicts.push({
        type: 'location_preference',
        message: `${game.location} is not a preferred location`,
        severity: 'warning'
      })
    }

    // Check daily game limit
    const sameNameGames = existingAssignments.filter(g => 
      g.date === game.date && g.assignedReferees.includes(referee.id)
    )
    if (referee.maxGamesPerDay && sameNameGames.length >= referee.maxGamesPerDay) {
      conflicts.push({
        type: 'max_games_exceeded',
        message: `Would exceed daily limit of ${referee.maxGamesPerDay} games`,
        severity: 'error'
      })
    }

    // Check time overlaps
    const timeOverlaps = existingAssignments.filter(g => 
      g.date === game.date && 
      g.assignedReferees.includes(referee.id) &&
      g.id !== game.id &&
      ((g.time >= game.time && g.time < game.endTime) ||
       (g.endTime > game.time && g.endTime <= game.endTime) ||
       (g.time <= game.time && g.endTime >= game.endTime))
    )
    
    if (timeOverlaps.length > 0) {
      conflicts.push({
        type: 'time_overlap',
        message: `Time conflict with ${timeOverlaps[0].homeTeam} vs ${timeOverlaps[0].awayTeam}`,
        severity: 'error'
      })
    }

    return conflicts
  }

  const isRefereeAvailable = (referee: Referee, game: Game, existingAssignments: Game[]): boolean => {
    const conflicts = checkRefereeConflicts(referee, game, existingAssignments)
    return !conflicts.some(c => c.severity === 'error')
  }

  const handleGameSelect = (gameId: string) => {
    setSelectedGames(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  const createChunk = () => {
    if (selectedGames.length === 0) return

    const selectedGameObjects = games.filter(game => selectedGames.includes(game.id))
    
    // Validate chunking
    const firstGame = selectedGameObjects[0]
    const canChunk = selectedGameObjects.every(game => 
      game.location === firstGame.location && game.date === firstGame.date
    )

    if (!canChunk) {
      alert('Games must be at the same location and date to be chunked together')
      return
    }

    const sortedGames = selectedGameObjects.sort((a, b) => a.time.localeCompare(b.time))

    const newChunk: GameChunk = {
      id: Date.now().toString(),
      games: sortedGames,
      location: firstGame.location,
      date: firstGame.date,
      startTime: sortedGames[0].time,
      endTime: sortedGames[sortedGames.length - 1].endTime,
      totalReferees: sortedGames.reduce((sum, game) => sum + game.requiredReferees, 0)
    }

    setChunks(prev => [...prev, newChunk])
    setSelectedGames([])
  }

  const autoChunkGames = () => {
    const gamesByLocationAndDate = games.reduce((acc, game) => {
      const key = `${game.location}-${game.date}`
      if (!acc[key]) acc[key] = []
      acc[key].push(game)
      return acc
    }, {} as Record<string, Game[]>)

    const newChunks: GameChunk[] = []

    Object.values(gamesByLocationAndDate).forEach(locationGames => {
      if (locationGames.length > 1) {
        const sortedGames = locationGames.sort((a, b) => a.time.localeCompare(b.time))
        const firstGame = sortedGames[0]

        const chunk: GameChunk = {
          id: Date.now().toString() + Math.random(),
          games: sortedGames,
          location: firstGame.location,
          date: firstGame.date,
          startTime: sortedGames[0].time,
          endTime: sortedGames[sortedGames.length - 1].endTime,
          totalReferees: sortedGames.reduce((sum, game) => sum + game.requiredReferees, 0)
        }

        newChunks.push(chunk)
      }
    })

    setChunks(prev => [...prev, ...newChunks])
  }

  const generateAISuggestions = async (chunk: GameChunk) => {
    setLoading(true)
    
    try {
      // Use the new AI suggestions API
      const gameIds = chunk.games.map(g => g.id)
      const factors = {
        proximity_weight: 0.3,
        availability_weight: 0.4,
        experience_weight: 0.2,
        performance_weight: 0.1
      }

      const response = await apiClient.generateAISuggestions(gameIds, factors)
      
      if (response.success && response.data.suggestions) {
        // Transform backend results to our suggestions format
        const suggestions: AIAssignmentSuggestion[] = response.data.suggestions.map(suggestion => ({
          gameId: suggestion.game_id,
          refereeId: suggestion.referee_id,
          refereeName: referees.find(r => r.id === suggestion.referee_id)?.name || 'Unknown Referee',
          confidence: suggestion.confidence_score,
          reasoning: suggestion.reasoning,
          conflicts: suggestion.conflict_warnings || undefined
        }))

        const updatedChunk = { ...chunk, suggestions }
        setChunks(prev => prev.map(c => c.id === chunk.id ? updatedChunk : c))
        setSelectedChunk(updatedChunk)
        setShowSuggestions(true)
        setLoading(false)
        return
      } else {
        throw new Error('AI suggestions API returned unsuccessful response')
      }
    } catch (error) {
      console.error('Backend AI suggestions failed, falling back to local logic:', error)
    }

    // Fallback to local AI logic if backend fails
    const suggestions: AIAssignmentSuggestion[] = []
    
    chunk.games.forEach(game => {
      const scoredReferees = referees
        .map(ref => {
          const conflicts = checkRefereeConflicts(ref, game, games)
          const isAvailable = !conflicts.some(c => c.severity === 'error')
          
          let score = 0.5
          if (isAvailable) score += 0.3
          if (ref.level === 'Senior') score += 0.2
          if (ref.level === 'Junior') score += 0.1
          if (ref.preferredLocations?.includes(game.location)) score += 0.15
          if (ref.location === chunk.location) score += 0.1
          if (ref.experience >= 5) score += 0.1
          
          const warningConflicts = conflicts.filter(c => c.severity === 'warning')
          score -= warningConflicts.length * 0.05
          
          return {
            referee: ref,
            score: Math.min(1, Math.max(0, score)),
            conflicts: conflicts,
            isAvailable
          }
        })
        .filter(r => r.isAvailable)
        .sort((a, b) => b.score - a.score)
        .slice(0, game.requiredReferees)
      
      scoredReferees.forEach((scoredRef) => {
        const conflictMessages = scoredRef.conflicts
          .filter(c => c.severity === 'warning')
          .map(c => c.message)
        
        let reasoning = `${scoredRef.referee.level} level, ${scoredRef.referee.experience} years experience`
        if (scoredRef.referee.preferredLocations?.includes(game.location)) {
          reasoning += `, prefers ${game.location}`
        }
        if (scoredRef.referee.location === chunk.location) {
          reasoning += ', local to area'
        }
        
        suggestions.push({
          gameId: game.id,
          refereeId: scoredRef.referee.id,
          refereeName: scoredRef.referee.name,
          confidence: scoredRef.score,
          reasoning: reasoning,
          conflicts: conflictMessages.length > 0 ? conflictMessages : undefined
        })
      })
    })

    const updatedChunk = { ...chunk, suggestions }
    setChunks(prev => prev.map(c => c.id === chunk.id ? updatedChunk : c))
    setSelectedChunk(updatedChunk)
    setShowSuggestions(true)
    setLoading(false)
  }

  const applyAISuggestions = (chunk: GameChunk) => {
    if (!chunk.suggestions) return
    
    // Apply suggestions to games
    const updatedGames = games.map(game => {
      const gameSuggestions = chunk.suggestions?.filter(s => s.gameId === game.id) || []
      if (gameSuggestions.length > 0) {
        return {
          ...game,
          assignedReferees: gameSuggestions.map(s => s.refereeId),
          status: gameSuggestions.length >= game.requiredReferees ? 'assigned' as const : 'partial' as const
        }
      }
      return game
    })
    
    setGames(updatedGames)
    setShowSuggestions(false)
    setSelectedChunk(null)
  }

  const deleteChunk = (chunkId: string) => {
    setChunks(prev => prev.filter(c => c.id !== chunkId))
  }

  const filteredGames = games.filter(game => {
    const matchesSearch = 
      game.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = filterLocation === 'all' || game.location === filterLocation
    const matchesDate = filterDate === 'all' || game.date === filterDate

    return matchesSearch && matchesLocation && matchesDate
  })

  const locations = Array.from(new Set(games.map(game => game.location)))
  const dates = Array.from(new Set(games.map(game => game.date)))

  // Calculate conflict statistics
  const getConflictStats = () => {
    let totalConflicts = 0
    let availableRefereesCount = 0

    referees.forEach(referee => {
      if (referee.available) {
        availableRefereesCount++
        games.forEach(game => {
          const conflicts = checkRefereeConflicts(referee, game, games)
          if (conflicts.some(c => c.severity === 'error')) totalConflicts++
        })
      }
    })

    return { totalConflicts, availableRefereesCount }
  }

  const conflictStats = getConflictStats()

  if (dataLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className={cn('animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4', getStatusColorClass('info', 'border'))}></div>
            <p className="text-muted-foreground">Loading games and referees...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI-Powered Assignments</h1>
          <p className="text-muted-foreground">Smart referee assignments with game chunking and AI suggestions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Games
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.length}</div>
            <p className="text-xs text-muted-foreground">
              {games.filter(g => g.status === 'unassigned').length} unassigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Game Chunks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chunks.length}</div>
            <p className="text-xs text-muted-foreground">
              {chunks.filter(c => c.suggestions).length} with AI suggestions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Referees</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conflictStats.availableRefereesCount}</div>
            <p className="text-xs text-muted-foreground">
              of {referees.length} total referees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedGames.length}</div>
            <p className="text-xs text-muted-foreground">
              games selected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input 
            placeholder="Search games..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(location => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDate} onValueChange={setFilterDate}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            {dates.map(date => (
              <SelectItem key={date} value={date}>{new Date(date).toLocaleDateString()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <Button onClick={createChunk} disabled={selectedGames.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Create Chunk ({selectedGames.length})
        </Button>
        <Button variant="outline" onClick={autoChunkGames}>
          <Sparkles className="h-4 w-4 mr-2" />
          Auto-Chunk by Location
        </Button>
      </div>

      {/* Referee Availability Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referee Availability</CardTitle>
          <CardDescription>Current referee status and constraints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {referees.map(referee => {
              const errorConflicts = games.reduce((count, game) => {
                const conflicts = checkRefereeConflicts(referee, game, games)
                return count + (conflicts.some(c => c.severity === 'error') ? 1 : 0)
              }, 0)
              
              return (
                <div key={referee.id} className={cn(
                  'p-3 border rounded-lg',
                  referee.available
                    ? cn(getStatusColorClass('success', 'border'), getStatusColorClass('success', 'bg'))
                    : cn(getStatusColorClass('error', 'border'), getStatusColorClass('error', 'bg'))
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{referee.name}</h4>
                    <Badge variant={referee.available ? 'default' : 'destructive'} className="text-xs">
                      {referee.level}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>📍 {referee.location}</p>
                    <p>🎯 Max {referee.maxGamesPerDay || 'unlimited'} games/day</p>
                    {referee.preferredLocations && (
                      <p>❤️ Prefers: {referee.preferredLocations.join(', ')}</p>
                    )}
                    {referee.unavailableDates && referee.unavailableDates.length > 0 && (
                      <p className={getStatusColorClass('error', 'text')}>❌ Unavailable: {referee.unavailableDates.length} dates</p>
                    )}
                    {errorConflicts > 0 && (
                      <p className={getStatusColorClass('error', 'text')}>⚠️ {errorConflicts} conflicts</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Games Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Games</h2>
        <div className="grid gap-3">
          {filteredGames.map(game => (
            <Card
              key={game.id}
              className={cn(
                'cursor-pointer transition-colors',
                selectedGames.includes(game.id) && cn('ring-2 ring-primary', getStatusColorClass('info', 'bg'))
              )}
              onClick={() => handleGameSelect(game.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline">{game.division}</Badge>
                      <Badge variant={
                        game.status === 'assigned' ? 'default' :
                          game.status === 'partial' ? 'secondary' : 'destructive'
                      }>
                        {game.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="font-medium">{game.homeTeam} vs {game.awayTeam}</p>
                        <p className="text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(game.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {game.time} - {game.endTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {game.location}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Users className="h-3 w-3 inline mr-1" />
                          {game.requiredReferees} referees needed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Game Chunks */}
      {chunks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Game Chunks</h2>
          <div className="grid gap-4">
            {chunks.map(chunk => (
              <Card key={chunk.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{chunk.location} - {new Date(chunk.date).toLocaleDateString()}</CardTitle>
                      <CardDescription>
                        {chunk.startTime} - {chunk.endTime} • {chunk.games.length} games • {chunk.totalReferees} referees needed
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {chunk.suggestions ? (
                        <Badge className={getStatusColorClass('success', 'bg')}>
                          <Brain className="h-3 w-3 mr-1" />
                          AI Suggestions Ready
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => generateAISuggestions(chunk)}
                          disabled={loading}
                          className={cn(getStatusColorClass('info', 'bg'), 'hover:opacity-90')}
                        >
                          <Brain className="h-4 w-4 mr-2" />
                          Generate AI Suggestions
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteChunk(chunk.id)}
                        className={cn(getStatusColorClass('error', 'text'), 'hover:opacity-80')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {chunk.games.map(game => (
                      <div key={game.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">
                          {game.time} - {game.homeTeam} vs {game.awayTeam}
                        </span>
                        <Badge variant="outline">{game.requiredReferees} refs</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className={cn('h-5 w-5 mr-2', getStatusColorClass('info', 'text'))} />
              AI Assignment Suggestions
            </DialogTitle>
            <DialogDescription>
              Review and apply these intelligent referee assignments
            </DialogDescription>
          </DialogHeader>

          {selectedChunk && selectedChunk.suggestions && (
            <div className="space-y-4">
              {selectedChunk.games.map(game => {
                const gameSuggestions = selectedChunk.suggestions?.filter(s => s.gameId === game.id) || []
                return (
                  <Card key={game.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {game.homeTeam} vs {game.awayTeam}
                      </CardTitle>
                      <CardDescription>
                        {game.time} - {game.endTime} • {game.division}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {gameSuggestions.map((suggestion, index) => (
                          <div key={index} className={cn(
                            'p-3 border rounded',
                            suggestion.conflicts && suggestion.conflicts.length > 0
                              ? cn(getStatusColorClass('warning', 'bg'), getStatusColorClass('warning', 'border'))
                              : cn(getStatusColorClass('success', 'bg'), getStatusColorClass('success', 'border'))
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{suggestion.refereeName}</p>
                                <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                                {suggestion.conflicts && suggestion.conflicts.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {suggestion.conflicts.map((conflict, cIndex) => (
                                      <div key={cIndex} className={cn('flex items-center text-sm', getStatusColorClass('warning', 'text'))}>
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {conflict}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="ml-3 text-right">
                                <Badge className={
                                  suggestion.conflicts && suggestion.conflicts.length > 0
                                    ? getStatusColorClass('warning', 'bg')
                                    : getStatusColorClass('success', 'bg')
                                }>
                                  {Math.round(suggestion.confidence * 100)}% confidence
                                </Badge>
                                {suggestion.conflicts && suggestion.conflicts.length > 0 && (
                                  <p className={cn('text-xs mt-1', getStatusColorClass('warning', 'text'))}>Has warnings</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {gameSuggestions.length < game.requiredReferees && (
                          <div className={cn('p-3 border rounded', getStatusColorClass('error', 'bg'), getStatusColorClass('error', 'border'))}>
                            <div className="flex items-center">
                              <AlertTriangle className={cn('h-4 w-4 mr-2', getStatusColorClass('error', 'text'))} />
                              <p className={cn('text-sm', getStatusColorClass('error', 'text'))}>
                                <strong>Insufficient referees:</strong> Need {game.requiredReferees - gameSuggestions.length} more referee(s) for this game
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowSuggestions(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => applyAISuggestions(selectedChunk)}
                  className={cn(getStatusColorClass('success', 'bg'), 'hover:opacity-90')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Apply All Suggestions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}