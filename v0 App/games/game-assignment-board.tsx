"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, Clock, MapPin, Users, Upload, Download, Plus, Trash2, Zap, Brain, Sparkles, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { AIAssignmentAlgorithm, type RefereeProfile, type GameAssignment, type AssignmentSuggestion, type ChunkSuggestion } from "@/lib/ai-assignment-algorithm"

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
  status: "unassigned" | "partial" | "assigned"
  isSelected?: boolean
}

interface GameChunk {
  id: string
  games: Game[]
  location: string
  date: string
  startTime: string
  endTime: string
  totalReferees: number
  assignedTo?: string
}

const mockGames: Game[] = [
  {
    id: "1",
    date: "2024-01-15",
    time: "18:00",
    endTime: "19:30",
    homeTeam: "Lakers",
    awayTeam: "Warriors",
    location: "Downtown Arena",
    division: "Senior A",
    requiredReferees: 2,
    assignedReferees: [],
    status: "unassigned",
  },
  {
    id: "2",
    date: "2024-01-15",
    time: "19:45",
    endTime: "21:15",
    homeTeam: "Bulls",
    awayTeam: "Celtics",
    location: "Downtown Arena",
    division: "Senior A",
    requiredReferees: 2,
    assignedReferees: [],
    status: "unassigned",
  },
  {
    id: "3",
    date: "2024-01-15",
    time: "21:30",
    endTime: "23:00",
    homeTeam: "Heat",
    awayTeam: "Spurs",
    location: "Downtown Arena",
    division: "Senior A",
    requiredReferees: 2,
    assignedReferees: [],
    status: "unassigned",
  },
]

const mockReferees: RefereeProfile[] = [
  { 
    id: "1", 
    name: "John Smith", 
    level: "Senior", 
    available: true,
    postalCode: "M5V 3A8",
    maxDistance: 30,
    isAvailable: true,
    wagePerGame: 75,
    roles: ["referee"],
    availabilityStrategy: "WHITELIST",
    pastGames: []
  },
  { 
    id: "2", 
    name: "Sarah Johnson", 
    level: "Junior", 
    available: true,
    postalCode: "M2N 6K1",
    maxDistance: 25,
    isAvailable: true,
    wagePerGame: 60,
    roles: ["referee", "evaluator"],
    availabilityStrategy: "WHITELIST",
    pastGames: []
  },
  { 
    id: "3", 
    name: "Mike Wilson", 
    level: "Senior", 
    available: false,
    postalCode: "M9W 1P6",
    maxDistance: 40,
    isAvailable: false,
    wagePerGame: 80,
    roles: ["referee", "mentor"],
    availabilityStrategy: "BLACKLIST",
    pastGames: []
  },
  { 
    id: "4", 
    name: "Lisa Brown", 
    level: "Rookie", 
    available: true,
    postalCode: "M4E 3M5",
    maxDistance: 20,
    isAvailable: true,
    wagePerGame: 45,
    roles: ["referee"],
    availabilityStrategy: "WHITELIST",
    pastGames: [],
    isWhiteWhistle: true
  },
]

export function GameAssignmentBoard() {
  const [games, setGames] = useState<Game[]>(mockGames)
  const [chunks, setChunks] = useState<GameChunk[]>([])
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<GameChunk | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocation, setFilterLocation] = useState("all")
  const [filterDate, setFilterDate] = useState("all")
  const [aiSuggestions, setAiSuggestions] = useState<AssignmentSuggestion[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false)
  const [aiChunkSuggestions, setAiChunkSuggestions] = useState<ChunkSuggestion[]>([])
  
  const aiAlgorithm = new AIAssignmentAlgorithm()

  const handleGameSelect = (gameId: string) => {
    setSelectedGames((prev) => (prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]))
  }

  const convertGameToAssignment = (game: Game): GameAssignment => ({
    gameId: game.id,
    date: game.date,
    time: game.time,
    endTime: game.endTime,
    location: game.location,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    division: game.division,
    gameType: 'Community',
    requiredReferees: game.requiredReferees,
    requiredLevel: 'Junior'
  })

  const generateAISuggestions = (game: Game) => {
    const gameAssignment = convertGameToAssignment(game)
    const suggestions = aiAlgorithm.generateAssignmentSuggestions(gameAssignment, mockReferees)
    setAiSuggestions(suggestions)
    setSelectedGame(game)
    setAiSuggestionsOpen(true)
  }

  const generateAIChunks = () => {
    const gameAssignments = games.map(convertGameToAssignment)
    const chunkSuggestions = aiAlgorithm.generateOptimizedChunks(gameAssignments, mockReferees)
    setAiChunkSuggestions(chunkSuggestions)
    
    // Auto-create the most efficient chunks
    const newChunks: GameChunk[] = chunkSuggestions.slice(0, 3).map((suggestion, index) => ({
      id: `ai-chunk-${Date.now()}-${index}`,
      games: suggestion.games.map(ga => games.find(g => g.id === ga.gameId)!),
      location: suggestion.location,
      date: suggestion.date,
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      totalReferees: suggestion.games.reduce((sum, game) => sum + game.requiredReferees, 0),
      assignedTo: suggestion.suggestedReferees[0]?.referee.name
    }))
    
    setChunks(prev => [...prev, ...newChunks])
  }

  const createChunk = () => {
    if (selectedGames.length === 0) return

    const selectedGameObjects = games.filter((game) => selectedGames.includes(game.id))

    // Validate that games can be chunked (same location and date)
    const firstGame = selectedGameObjects[0]
    const canChunk = selectedGameObjects.every(
      (game) => game.location === firstGame.location && game.date === firstGame.date,
    )

    if (!canChunk) {
      alert("Games must be at the same location and date to be chunked together")
      return
    }

    // Sort games by time
    const sortedGames = selectedGameObjects.sort((a, b) => a.time.localeCompare(b.time))

    const newChunk: GameChunk = {
      id: Date.now().toString(),
      games: sortedGames,
      location: firstGame.location,
      date: firstGame.date,
      startTime: sortedGames[0].time,
      endTime: sortedGames[sortedGames.length - 1].endTime,
      totalReferees: sortedGames.reduce((sum, game) => sum + game.requiredReferees, 0),
    }

    setChunks((prev) => [...prev, newChunk])
    setSelectedGames([])
  }

  const autoChunkByLocation = () => {
    const gamesByLocationAndDate = games.reduce(
      (acc, game) => {
        const key = `${game.location}-${game.date}`
        if (!acc[key]) acc[key] = []
        acc[key].push(game)
        return acc
      },
      {} as Record<string, Game[]>,
    )

    const newChunks: GameChunk[] = []

    Object.values(gamesByLocationAndDate).forEach((locationGames) => {
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
          totalReferees: sortedGames.reduce((sum, game) => sum + game.requiredReferees, 0),
        }

        newChunks.push(chunk)
      }
    })

    setChunks((prev) => [...prev, ...newChunks])
  }

  const assignChunk = (chunk: GameChunk, refereeId: string) => {
    const referee = mockReferees.find((r) => r.id === refereeId)
    if (!referee) return

    setChunks((prev) => prev.map((c) => (c.id === chunk.id ? { ...c, assignedTo: referee.name } : c)))

    setAssignDialogOpen(false)
    setSelectedChunk(null)
  }

  const assignRefereeToGame = (gameId: string, refereeId: string) => {
    const referee = mockReferees.find(r => r.id === refereeId)
    if (!referee) return

    setGames(prev => prev.map(game => {
      if (game.id === gameId) {
        const newAssignedReferees = [...game.assignedReferees, referee.name]
        const newStatus = newAssignedReferees.length >= game.requiredReferees ? "assigned" : "partial"
        return {
          ...game,
          assignedReferees: newAssignedReferees,
          status: newStatus as "unassigned" | "partial" | "assigned"
        }
      }
      return game
    }))

    setAiSuggestionsOpen(false)
    setSelectedGame(null)
  }

  const deleteChunk = (chunkId: string) => {
    setChunks((prev) => prev.filter((c) => c.id !== chunkId))
  }

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = filterLocation === "all" || game.location === filterLocation
    const matchesDate = filterDate === "all" || game.date === filterDate

    return matchesSearch && matchesLocation && matchesDate
  })

  const locations = Array.from(new Set(games.map((game) => game.location)))
  const dates = Array.from(new Set(games.map((game) => game.date)))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Target className="h-8 w-8 mr-3 text-blue-600" />
            Game Assignment Board
          </h2>
          <p className="text-muted-foreground">Intelligent game assignment system with AI-powered optimization and chunk management</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Enhanced
          </Badge>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.length}</div>
            <p className="text-xs text-muted-foreground">Games available for assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chunks Created</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chunks.length}</div>
            <p className="text-xs text-muted-foreground">Optimized game groupings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Chunks</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chunks.filter((c) => c.assignedTo).length}</div>
            <p className="text-xs text-muted-foreground">Chunks with referees assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Games</CardTitle>
            <Plus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedGames.length}</div>
            <p className="text-xs text-muted-foreground">Games ready for chunking</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Search games..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {dates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assignment Actions</CardTitle>
          <CardDescription>Create chunks and optimize assignments with AI assistance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <Button onClick={createChunk} disabled={selectedGames.length === 0} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Chunk ({selectedGames.length})
            </Button>
            <Button variant="outline" onClick={autoChunkByLocation}>
              Auto-Chunk by Location
            </Button>
            <Button variant="outline" onClick={generateAIChunks} className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <Brain className="h-4 w-4 mr-2" />
              AI Optimize Chunks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Available Games
          </CardTitle>
          <CardDescription>Select games to create optimized assignment chunks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {filteredGames.map((game) => (
              <Card
                key={game.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedGames.includes(game.id) && "ring-2 ring-blue-500 bg-blue-50",
                )}
                onClick={() => handleGameSelect(game.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">{game.division}</Badge>
                        <Badge
                          variant={
                            game.status === "assigned"
                              ? "default"
                              : game.status === "partial"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {game.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="font-medium">
                            {game.homeTeam} vs {game.awayTeam}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {game.date}
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

                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            generateAISuggestions(game)
                          }}
                          className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          AI Suggest
                        </Button>
                        {game.assignedReferees.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {game.assignedReferees.map((ref, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {ref}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Chunks */}
      {chunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Game Chunks
            </CardTitle>
            <CardDescription>Optimized game groupings for efficient referee assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {chunks.map((chunk) => (
                <Card key={chunk.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {chunk.location} - {chunk.date}
                        </CardTitle>
                        <CardDescription>
                          {chunk.startTime} - {chunk.endTime} • {chunk.games.length} games • {chunk.totalReferees}{" "}
                          referees needed
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {chunk.assignedTo ? (
                          <Badge variant="default">Assigned to {chunk.assignedTo}</Badge>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedChunk(chunk)
                              setAssignDialogOpen(true)
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Assign
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteChunk(chunk.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {chunk.games.map((game) => (
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
          </CardContent>
        </Card>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Chunk</DialogTitle>
            <DialogDescription>Select a referee to assign this game chunk to</DialogDescription>
          </DialogHeader>

          {selectedChunk && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <h4 className="font-medium">
                  {selectedChunk.location} - {selectedChunk.date}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedChunk.startTime} - {selectedChunk.endTime} • {selectedChunk.games.length} games
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Available Referees</h4>
                {mockReferees
                  .filter((ref) => ref.available)
                  .map((referee) => (
                    <Button
                      key={referee.id}
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={() => assignChunk(selectedChunk, referee.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{referee.name}</span>
                        <Badge variant="secondary">{referee.level}</Badge>
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={aiSuggestionsOpen} onOpenChange={setAiSuggestionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-blue-600" />
              AI Assignment Suggestions
            </DialogTitle>
            <DialogDescription>
              AI-powered referee recommendations based on proximity, level, availability, and historic patterns
            </DialogDescription>
          </DialogHeader>

          {selectedGame && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900">
                  {selectedGame.homeTeam} vs {selectedGame.awayTeam}
                </h4>
                <p className="text-sm text-blue-700">
                  {selectedGame.date} at {selectedGame.time} • {selectedGame.location} • {selectedGame.requiredReferees} referees needed
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                <h4 className="font-medium">Recommended Referees</h4>
                {aiSuggestions.length > 0 ? (
                  aiSuggestions.map((suggestion, index) => (
                    <div key={suggestion.referee.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{suggestion.referee.name}</span>
                          <Badge variant="outline">{suggestion.referee.level}</Badge>
                          {suggestion.referee.isWhiteWhistle && (
                            <Badge variant="secondary" className="bg-white text-gray-600 border-gray-300">
                              White Whistle
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">
                              {Math.round(suggestion.confidence * 100)}% match
                            </div>
                            <div className="text-xs text-gray-500">
                              ${suggestion.referee.wagePerGame}/game
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => assignRefereeToGame(selectedGame.id, suggestion.referee.id)}
                          >
                            Assign
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {suggestion.reasons.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-700 mb-1">Advantages:</p>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.reasons.map((reason, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {suggestion.warnings && suggestion.warnings.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-amber-700 mb-1">Considerations:</p>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.warnings.map((warning, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                  {warning}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No suitable referees found for this game</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiSuggestionsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
