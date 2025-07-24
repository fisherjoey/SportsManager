"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Upload, Download, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { mockGames, mockReferees, type Game, type Referee } from "@/lib/mock-data"
import { useToast } from "@/components/ui/use-toast"
import { AssignChunkDialog } from "@/components/assign-chunk-dialog"
import Papa from 'papaparse'

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

export function GameAssignmentBoard() {
  const [games, setGames] = useState<Game[]>(mockGames)
  const [chunks, setChunks] = useState<GameChunk[]>([])
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<GameChunk | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocation, setFilterLocation] = useState("all")
  const [filterDate, setFilterDate] = useState("all")
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleGameSelect = (gameId: string) => {
    setSelectedGames((prev) => 
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    )
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
      toast({
        title: "Invalid Selection",
        description: "Games must be at the same location and date to be chunked together",
        variant: "destructive",
      })
      return
    }

    // Sort games by time
    const sortedGames = selectedGameObjects.sort((a, b) => {
      const timeA = a.time || a.startTime || ""
      const timeB = b.time || b.startTime || ""
      return timeA.localeCompare(timeB)
    })

    const newChunk: GameChunk = {
      id: Date.now().toString(),
      games: sortedGames,
      location: firstGame.location,
      date: firstGame.date,
      startTime: sortedGames[0].time || sortedGames[0].startTime || "",
      endTime: sortedGames[sortedGames.length - 1].endTime || sortedGames[sortedGames.length - 1].time || "",
      totalReferees: sortedGames.reduce((sum, game) => sum + game.refsNeeded, 0),
    }

    setChunks((prev) => [...prev, newChunk])
    setSelectedGames([])
    toast({
      title: "Chunk Created",
      description: `Created chunk with ${sortedGames.length} games at ${firstGame.location}`,
    })
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
        const sortedGames = locationGames.sort((a, b) => {
          const timeA = a.time || a.startTime || ""
          const timeB = b.time || b.startTime || ""
          return timeA.localeCompare(timeB)
        })
        const firstGame = sortedGames[0]

        const chunk: GameChunk = {
          id: Date.now().toString() + Math.random(),
          games: sortedGames,
          location: firstGame.location,
          date: firstGame.date,
          startTime: sortedGames[0].time || sortedGames[0].startTime || "",
          endTime: sortedGames[sortedGames.length - 1].endTime || sortedGames[sortedGames.length - 1].time || "",
          totalReferees: sortedGames.reduce((sum, game) => sum + game.refsNeeded, 0),
        }

        newChunks.push(chunk)
      }
    })

    setChunks((prev) => [...prev, ...newChunks])
    toast({
      title: "Auto-Chunking Complete",
      description: `Created ${newChunks.length} chunks automatically`,
    })
  }

  const assignChunk = (chunk: GameChunk, refereeId: string) => {
    const referee = mockReferees.find((r) => r.id === refereeId)
    if (!referee) return

    setChunks((prev) => prev.map((c) => (c.id === chunk.id ? { ...c, assignedTo: referee.name } : c)))
    setAssignDialogOpen(false)
    setSelectedChunk(null)
    toast({
      title: "Chunk Assigned",
      description: `${referee.name} has been assigned to the chunk at ${chunk.location}`,
    })
  }

  const deleteChunk = (chunkId: string) => {
    setChunks((prev) => prev.filter((c) => c.id !== chunkId))
    toast({
      title: "Chunk Deleted",
      description: "The game chunk has been removed",
    })
  }

  // Export functionality
  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = games.map(game => ({
        'Game ID': game.id,
        'Date': game.date,
        'Time': game.time || game.startTime || '',
        'Home Team': typeof game.homeTeam === 'object' 
          ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
          : game.homeTeam,
        'Away Team': typeof game.awayTeam === 'object' 
          ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
          : game.awayTeam,
        'Location': game.location,
        'Division': game.division,
        'Level': game.level,
        'Pay Rate': game.payRate,
        'Status': game.status,
        'Refs Needed': game.refsNeeded,
        'Assigned Referees': game.assignedReferees?.join('; ') || '',
        'Notes': game.notes || ''
      }))

      // Convert to CSV
      const csv = Papa.unparse(exportData)
      
      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `game-assignments-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast({
        title: "Export Successful",
        description: `Exported ${games.length} games to CSV file`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data",
        variant: "destructive",
      })
    }
  }

  // Import functionality
  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const importedGames: Game[] = results.data
            .filter((row: any) => row['Game ID']) // Filter out empty rows
            .map((row: any, index: number) => ({
              id: row['Game ID'] || `imported-${Date.now()}-${index}`,
              date: row['Date'] || '',
              time: row['Time'] || '',
              startTime: row['Time'] || '',
              homeTeam: row['Home Team'] || '',
              awayTeam: row['Away Team'] || '',
              location: row['Location'] || '',
              division: row['Division'] || '',
              level: (row['Level'] as "Recreational" | "Competitive" | "Elite") || 'Recreational',
              payRate: row['Pay Rate'] || '50.00',
              status: (row['Status'] as "assigned" | "unassigned" | "up-for-grabs") || 'unassigned',
              refsNeeded: parseInt(row['Refs Needed']) || 1,
              assignedReferees: row['Assigned Referees'] ? row['Assigned Referees'].split('; ').filter(Boolean) : [],
              notes: row['Notes'] || '',
              season: 'Imported',
              wageMultiplier: '1.0',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }))

          // Update games state with imported data
          setGames(prev => {
            const existingIds = new Set(prev.map(g => g.id))
            const newGames = importedGames.filter(g => !existingIds.has(g.id))
            return [...prev, ...newGames]
          })

          toast({
            title: "Import Successful",
            description: `Imported ${importedGames.length} games from CSV file`,
          })
        } catch (error) {
          toast({
            title: "Import Failed",
            description: "There was an error processing the CSV file",
            variant: "destructive",
          })
        }
      },
      error: (error) => {
        toast({
          title: "Import Failed",
          description: `Error reading file: ${error.message}`,
          variant: "destructive",
        })
      }
    })

    // Reset file input
    event.target.value = ''
  }

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
    const matchesLocation = filterLocation === "all" || game.location === filterLocation
    const matchesDate = filterDate === "all" || game.date === filterDate

    return matchesSearch && matchesLocation && matchesDate
  })

  const locations = Array.from(new Set(games.map((game) => game.location)))
  const dates = Array.from(new Set(games.map((game) => game.date)))

  return (
    <div className="p-6 space-y-6">
      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Game Assignment Board</h1>
          <p className="text-gray-600">Manage game assignments and create referee chunks</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExport}>
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
                {new Date(date).toLocaleDateString()}
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
          {filteredGames.map((game) => {
            const homeTeamName = typeof game.homeTeam === 'object' 
              ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
              : game.homeTeam
            const awayTeamName = typeof game.awayTeam === 'object' 
              ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
              : game.awayTeam

            return (
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
                              : game.status === "up-for-grabs"
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
                            {homeTeamName} vs {awayTeamName}
                          </p>
                          <p className="text-sm text-gray-600">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(game.date).toLocaleDateString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {game.time || game.startTime} {game.endTime ? `- ${game.endTime}` : ''}
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
                            {game.refsNeeded} referees needed
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
                        {chunk.location} - {new Date(chunk.date).toLocaleDateString()}
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
                    {chunk.games.map((game) => {
                      const homeTeamName = typeof game.homeTeam === 'object' 
                        ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
                        : game.homeTeam
                      const awayTeamName = typeof game.awayTeam === 'object' 
                        ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
                        : game.awayTeam

                      return (
                        <div key={game.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">
                            {game.time || game.startTime} - {homeTeamName} vs {awayTeamName}
                          </span>
                          <Badge variant="outline">{game.refsNeeded} refs</Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      {selectedChunk && (
        <AssignChunkDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          chunk={selectedChunk}
          availableReferees={mockReferees.filter(r => r.isAvailable)}
          onAssign={assignChunk}
        />
      )}
    </div>
  )
}