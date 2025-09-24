'use client'

import { useState, useRef } from 'react'
import { Calendar, Clock, MapPin, Users, Upload, Download, Plus, Trash2, Bot, History, Zap, TrendingUp, Star, CheckCircle, XCircle, Brain, Repeat, RotateCcw, GamepadIcon } from 'lucide-react'
import Papa from 'papaparse'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { mockGames, mockReferees, type Game, type Referee } from '@/lib/mock-data'
import { useToast } from '@/components/ui/use-toast'
import { AssignChunkDialog } from '@/components/assign-chunk-dialog'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'

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

interface AISuggestion {
  id: string
  gameId: string
  refereeId: string
  confidence: number
  reasoning: string
  factors: {
    proximity: number
    availability: number
    experience: number
    pastPerformance: number
  }
}

interface HistoricPattern {
  id: string
  refereeId: string
  refereeName: string
  pattern: {
    dayOfWeek: string
    location: string
    timeSlot: string
    level: string
  }
  frequency: number
  lastAssigned: string
}

export function GameAssignmentBoard() {
  const [games, setGames] = useState<Game[]>(mockGames)
  const [chunks, setChunks] = useState<GameChunk[]>([])
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<GameChunk | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  
  // New state for AI and historic features
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [historicPatterns, setHistoricPatterns] = useState<HistoricPattern[]>([])
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showHistoricPanel, setShowHistoricPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'games' | 'chunks' | 'ai' | 'historic'>('games')
  
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
        title: 'Invalid Selection',
        description: 'Games must be at the same location and date to be chunked together',
        variant: 'destructive'
      })
      return
    }

    // Sort games by time
    const sortedGames = selectedGameObjects.sort((a, b) => {
      const timeA = a.time || a.startTime || ''
      const timeB = b.time || b.startTime || ''
      return timeA.localeCompare(timeB)
    })

    const newChunk: GameChunk = {
      id: Date.now().toString(),
      games: sortedGames,
      location: firstGame.location,
      date: firstGame.date,
      startTime: sortedGames[0].time || sortedGames[0].startTime || '',
      endTime: sortedGames[sortedGames.length - 1].endTime || sortedGames[sortedGames.length - 1].time || '',
      totalReferees: sortedGames.reduce((sum, game) => sum + game.refsNeeded, 0)
    }

    setChunks((prev) => [...prev, newChunk])
    setSelectedGames([])
    toast({
      title: 'Chunk Created',
      description: `Created chunk with ${sortedGames.length} games at ${firstGame.location}`
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
          const timeA = a.time || a.startTime || ''
          const timeB = b.time || b.startTime || ''
          return timeA.localeCompare(timeB)
        })
        const firstGame = sortedGames[0]

        const chunk: GameChunk = {
          id: Date.now().toString() + Math.random(),
          games: sortedGames,
          location: firstGame.location,
          date: firstGame.date,
          startTime: sortedGames[0].time || sortedGames[0].startTime || '',
          endTime: sortedGames[sortedGames.length - 1].endTime || sortedGames[sortedGames.length - 1].time || '',
          totalReferees: sortedGames.reduce((sum, game) => sum + game.refsNeeded, 0)
        }

        newChunks.push(chunk)
      }
    })

    setChunks((prev) => [...prev, ...newChunks])
    toast({
      title: 'Auto-Chunking Complete',
      description: `Created ${newChunks.length} chunks automatically`
    })
  }

  const assignChunk = (chunk: GameChunk, refereeId: string) => {
    const referee = mockReferees.find((r) => r.id === refereeId)
    if (!referee) return

    setChunks((prev) => prev.map((c) => (c.id === chunk.id ? { ...c, assignedTo: referee.name } : c)))
    setAssignDialogOpen(false)
    setSelectedChunk(null)
    toast({
      title: 'Chunk Assigned',
      description: `${referee.name} has been assigned to the chunk at ${chunk.location}`
    })
  }

  const deleteChunk = (chunkId: string) => {
    setChunks((prev) => prev.filter((c) => c.id !== chunkId))
    toast({
      title: 'Chunk Deleted',
      description: 'The game chunk has been removed'
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
        'Home Team': formatTeamName(game.homeTeam),
        'Away Team': formatTeamName(game.awayTeam),
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
        title: 'Export Successful',
        description: `Exported ${games.length} games to CSV file`
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the data',
        variant: 'destructive'
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
              level: (row['Level'] as 'Recreational' | 'Competitive' | 'Elite') || 'Recreational',
              payRate: row['Pay Rate'] || '50.00',
              status: (row['Status'] as 'assigned' | 'unassigned' | 'up-for-grabs') || 'unassigned',
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
            title: 'Import Successful',
            description: `Imported ${importedGames.length} games from CSV file`
          })
        } catch (error) {
          toast({
            title: 'Import Failed',
            description: 'There was an error processing the CSV file',
            variant: 'destructive'
          })
        }
      },
      error: (error) => {
        toast({
          title: 'Import Failed',
          description: `Error reading file: ${error.message}`,
          variant: 'destructive'
        })
      }
    })

    // Reset file input
    event.target.value = ''
  }

  // Mock AI Functions (to be replaced with real API calls)
  const generateAISuggestions = async () => {
    setIsGeneratingSuggestions(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock AI suggestions
    const mockSuggestions: AISuggestion[] = [
      {
        id: '1',
        gameId: games[0]?.id || '1',
        refereeId: mockReferees[0]?.id || '1',
        confidence: 0.92,
        reasoning: 'High experience level, lives close to venue, historically good performance at this location',
        factors: {
          proximity: 0.9,
          availability: 1.0,
          experience: 0.95,
          pastPerformance: 0.88
        }
      },
      {
        id: '2',
        gameId: games[1]?.id || '2',
        refereeId: mockReferees[1]?.id || '2',
        confidence: 0.87,
        reasoning: 'Available during time slot, good level match, previous assignments at similar venues',
        factors: {
          proximity: 0.75,
          availability: 1.0,
          experience: 0.9,
          pastPerformance: 0.83
        }
      }
    ]
    
    setAISuggestions(mockSuggestions)
    setIsGeneratingSuggestions(false)
    setShowAIPanel(true)
    
    toast({
      title: 'AI Suggestions Generated',
      description: `Generated ${mockSuggestions.length} assignment suggestions`
    })
  }

  const loadHistoricPatterns = async () => {
    // Mock historic patterns
    const mockPatterns: HistoricPattern[] = [
      {
        id: '1',
        refereeId: mockReferees[0]?.id || '1',
        refereeName: mockReferees[0]?.name || 'John Smith',
        pattern: {
          dayOfWeek: 'Saturday',
          location: 'Riverside Sports Complex',
          timeSlot: '10:00 AM',
          level: 'Competitive'
        },
        frequency: 8,
        lastAssigned: '2024-07-19'
      },
      {
        id: '2',
        refereeId: mockReferees[1]?.id || '2',
        refereeName: mockReferees[1]?.name || 'Sarah Johnson',
        pattern: {
          dayOfWeek: 'Sunday',
          location: 'Central Park Fields',
          timeSlot: '2:00 PM',
          level: 'Recreational'
        },
        frequency: 6,
        lastAssigned: '2024-07-20'
      }
    ]
    
    setHistoricPatterns(mockPatterns)
    setShowHistoricPanel(true)
  }

  const acceptAISuggestion = (suggestion: AISuggestion) => {
    // TODO: Implement actual assignment logic
    toast({
      title: 'Suggestion Accepted',
      description: `AI suggestion accepted with ${Math.round(suggestion.confidence * 100)}% confidence`
    })
    
    // Remove from suggestions
    setAISuggestions(prev => prev.filter(s => s.id !== suggestion.id))
  }

  const rejectAISuggestion = (suggestion: AISuggestion) => {
    setAISuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    toast({
      title: 'Suggestion Rejected',
      description: 'AI suggestion has been dismissed'
    })
  }

  const repeatHistoricPattern = (pattern: HistoricPattern) => {
    // TODO: Implement pattern repetition logic
    toast({
      title: 'Pattern Applied',
      description: `Applied historic pattern for ${pattern.refereeName}`
    })
  }

  const filteredGames = games.filter((game) => {
    const homeTeamName = formatTeamName(game.homeTeam)
    const awayTeamName = formatTeamName(game.awayTeam)

    const matchesSearch =
      homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      awayTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = filterLocation === 'all' || game.location === filterLocation
    const matchesDate = filterDate === 'all' || game.date === filterDate

    return matchesSearch && matchesLocation && matchesDate
  })

  const locations = Array.from(new Set(games.map((game) => game.location)))
  const dates = Array.from(new Set(games.map((game) => game.date)))

  return (
    <PageLayout>
      <PageHeader
        icon={GamepadIcon}
        title="Game Assignment Board"
        description="Manage game assignments and create referee chunks with intelligent scheduling"
      >
        <Button 
          variant="outline" 
          onClick={generateAISuggestions}
          disabled={isGeneratingSuggestions}
        >
          {isGeneratingSuggestions ? (
            <>
              <Brain className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4 mr-2" />
              AI Suggestions
            </>
          )}
        </Button>
        <Button variant="outline" onClick={loadHistoricPatterns}>
          <History className="h-4 w-4 mr-2" />
          Historic Patterns
        </Button>
      </PageHeader>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('games')}
            className={cn(
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'games'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Games
          </button>
          <button
            onClick={() => setActiveTab('chunks')}
            className={cn(
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'chunks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Chunks ({chunks.length})
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={cn(
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'ai'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Bot className="h-4 w-4 inline mr-2" />
            AI Suggestions ({aiSuggestions.length})
          </button>
          <button
            onClick={() => setActiveTab('historic')}
            className={cn(
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'historic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <History className="h-4 w-4 inline mr-2" />
            Historic Patterns ({historicPatterns.length})
          </button>
        </nav>
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

      {/* Controls - Show only for games and chunks tabs */}
      {(activeTab === 'games' || activeTab === 'chunks') && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Search games..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
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
      )}

      {/* Tab Content */}
      {activeTab === 'games' && (
        <>
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
                const homeTeamName = formatTeamName(game.homeTeam)
                const awayTeamName = formatTeamName(game.awayTeam)

                return (
                  <Card
                    key={game.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedGames.includes(game.id) && 'ring-2 ring-blue-500 bg-blue-50',
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
                                game.status === 'assigned'
                                  ? 'default'
                                  : game.status === 'up-for-grabs'
                                    ? 'secondary'
                                    : 'destructive'
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
        </>
      )}

      {activeTab === 'chunks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Game Chunks</h2>
            <div className="flex items-center space-x-2">
              <Button onClick={createChunk} disabled={selectedGames.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Create Chunk ({selectedGames.length})
              </Button>
              <Button variant="outline" onClick={autoChunkByLocation}>
                Auto-Chunk by Location
              </Button>
            </div>
          </div>
          
          {chunks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No chunks created yet</h3>
                <p className="text-gray-500 mb-4">
                  Select games from the Games tab and create chunks to group them together
                </p>
                <Button variant="outline" onClick={() => setActiveTab('games')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Go to Games
                </Button>
              </CardContent>
            </Card>
          ) : (
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
                          {chunk.startTime} - {chunk.endTime} • {chunk.games.length} games • {chunk.totalReferees}{' '}
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
                        const homeTeamName = formatTeamName(game.homeTeam)
                        const awayTeamName = formatTeamName(game.awayTeam)

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
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI Assignment Suggestions</h2>
            <Button 
              onClick={generateAISuggestions}
              disabled={isGeneratingSuggestions}
            >
              {isGeneratingSuggestions ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate New Suggestions
                </>
              )}
            </Button>
          </div>

          {aiSuggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bot className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No AI suggestions available</h3>
                <p className="text-gray-500 mb-4">
                  Click "Generate New Suggestions" to get AI-powered assignment recommendations
                </p>
                <Button onClick={generateAISuggestions} disabled={isGeneratingSuggestions}>
                  <Bot className="h-4 w-4 mr-2" />
                  Generate AI Suggestions
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {aiSuggestions.map((suggestion) => {
                const game = games.find(g => g.id === suggestion.gameId)
                const referee = mockReferees.find(r => r.id === suggestion.refereeId)
                
                if (!game || !referee) return null

                const homeTeamName = formatTeamName(game.homeTeam)
                const awayTeamName = formatTeamName(game.awayTeam)

                return (
                  <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center">
                            <Bot className="h-5 w-5 mr-2 text-blue-500" />
                            {referee.name} → {homeTeamName} vs {awayTeamName}
                            <Badge variant="secondary" className="ml-2">
                              <Star className="h-3 w-3 mr-1" />
                              {Math.round(suggestion.confidence * 100)}% confidence
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {new Date(game.date).toLocaleDateString()} at {game.time || game.startTime} • {game.location}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => acceptAISuggestion(suggestion)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => rejectAISuggestion(suggestion)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {Math.round(suggestion.factors.proximity * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">Proximity</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round(suggestion.factors.availability * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">Availability</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {Math.round(suggestion.factors.experience * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">Experience</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {Math.round(suggestion.factors.pastPerformance * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">Past Performance</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'historic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Historic Assignment Patterns</h2>
            <Button onClick={loadHistoricPatterns}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh Patterns
            </Button>
          </div>

          {historicPatterns.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No historic patterns found</h3>
                <p className="text-gray-500 mb-4">
                  Load historic assignment data to see recurring patterns and repeat successful assignments
                </p>
                <Button onClick={loadHistoricPatterns}>
                  <History className="h-4 w-4 mr-2" />
                  Load Historic Patterns
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {historicPatterns.map((pattern) => (
                <Card key={pattern.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                          {pattern.refereeName}
                          <Badge variant="outline" className="ml-2">
                            {pattern.frequency} times
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Pattern: {pattern.pattern.dayOfWeek}s at {pattern.pattern.location} • {pattern.pattern.timeSlot} • {pattern.pattern.level} level
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => repeatHistoricPattern(pattern)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Repeat className="h-4 w-4 mr-1" />
                          Apply Pattern
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Last assigned: {new Date(pattern.lastAssigned).toLocaleDateString()}</span>
                      <span>Success rate: {Math.round((pattern.frequency / 10) * 100)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
      
      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </PageLayout>
  )
}