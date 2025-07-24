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
import { Calendar, Clock, MapPin, Users, Upload, Download, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

const mockReferees = [
  { id: "1", name: "John Smith", level: "Level 3", available: true },
  { id: "2", name: "Sarah Johnson", level: "Level 2", available: true },
  { id: "3", name: "Mike Wilson", level: "Level 3", available: false },
  { id: "4", name: "Lisa Brown", level: "Level 1", available: true },
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

  const handleGameSelect = (gameId: string) => {
    setSelectedGames((prev) => (prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]))
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Game Assignment Board</h1>
          <p className="text-gray-600">Manage game assignments and create referee chunks</p>
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chunks Created</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chunks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chunks.filter((c) => c.assignedTo).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedGames.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
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

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <Button onClick={createChunk} disabled={selectedGames.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Create Chunk ({selectedGames.length})
        </Button>
        <Button variant="outline" onClick={autoChunkByLocation}>
          Auto-Chunk by Location
        </Button>
      </div>

      {/* Games Grid */}
      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Available Games</h2>
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
                        <p className="text-sm text-gray-600">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {game.date}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {game.time} - {game.endTime}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {game.location}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">
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

      {/* Chunks */}
      {chunks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Game Chunks</h2>
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
                      <div key={game.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
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
    </div>
  )
}
