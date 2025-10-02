'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, Upload, Download, Plus, Trash2, Bot, History, Zap, TrendingUp, Star, CheckCircle, XCircle, Brain, Repeat, RotateCcw, GamepadIcon, ChevronDown, ChevronRight, Layers, CheckSquare, ExternalLink, Loader2 } from 'lucide-react'
import Papa from 'papaparse'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GroupedLocationView } from '@/components/ui/grouped-location-view'
import { ChunkConfirmationDialog } from '@/components/ui/chunk-confirmation-dialog'
import { cn } from '@/lib/utils'
import { mockGames, mockReferees, type Game, type Referee } from '@/lib/mock-data'
import { useToast } from '@/components/ui/use-toast'
import { AssignChunkDialog } from '@/components/assign-chunk-dialog'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { apiClient } from '@/lib/api'
import type { GameChunk as APIGameChunk, ChunkGame } from '@/lib/types/chunks'

interface ChunkWarning {
  type: 'mixed-location' | 'mixed-date' | 'mixed-both'
  locations: string[]
  dates: string[]
  gameCount: number
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

interface LocationGroup {
  location: string
  dates: DateGroup[]
  totalGames: number
  totalRefs: number
}

interface DateGroup {
  date: string
  games: Game[]
  totalRefs: number
}

export function GameAssignmentBoard() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [chunks, setChunks] = useState<GameChunk[]>([])
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<GameChunk | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [chunkWarning, setChunkWarning] = useState<ChunkWarning | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingChunkGames, setPendingChunkGames] = useState<Game[]>([])
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null)

  // Loading and error states
  const [isLoadingGames, setIsLoadingGames] = useState(false)
  const [gameError, setGameError] = useState<string | null>(null)
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)
  const [chunkError, setChunkError] = useState<string | null>(null)
  const [expandedChunkDates, setExpandedChunkDates] = useState<Set<string>>(new Set())

  // New state for AI and historic features
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [historicPatterns, setHistoricPatterns] = useState<HistoricPattern[]>([])
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showHistoricPanel, setShowHistoricPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'games' | 'chunks' | 'ai' | 'historic'>('games')

  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch games from backend
  const fetchGames = async () => {
    setIsLoadingGames(true)
    setGameError(null)
    try {
      apiClient.initializeToken()
      const response = await apiClient.getGames({ limit: 500 })

      if (response.data) {
        setGames(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching games:', error)
      setGameError(error.message || 'Failed to load games')
      toast({
        title: 'Error Loading Games',
        description: error.message || 'Failed to load games',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingGames(false)
    }
  }

  // Fetch chunks from backend
  const fetchChunks = async () => {
    setIsLoadingChunks(true)
    setChunkError(null)
    try {
      // Build params object, only including defined values
      const params: Record<string, string> = {}
      if (filterLocation && filterLocation !== 'all') {
        params.location = filterLocation
      }
      if (filterDate && filterDate !== 'all') {
        params.date = filterDate
      }

      const response = await apiClient.getChunks(Object.keys(params).length > 0 ? params : undefined)

      if (response.data) {
        // Convert API chunks to local format
        const convertedChunks: GameChunk[] = response.data.chunks.map((apiChunk: APIGameChunk) => ({
          id: apiChunk.id,
          games: [], // Will be populated when viewing details
          location: apiChunk.location,
          date: apiChunk.date,
          startTime: apiChunk.start_time,
          endTime: apiChunk.end_time,
          totalReferees: apiChunk.total_referees_needed,
          assignedTo: apiChunk.assigned_referee_name
        }))
        setChunks(convertedChunks)
      }
    } catch (error: any) {
      console.error('Error fetching chunks:', error)
      setChunkError(error.message || 'Failed to load chunks')
      toast({
        title: 'Error Loading Chunks',
        description: error.message || 'Failed to load chunks',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingChunks(false)
    }
  }

  // Load games on mount
  useEffect(() => {
    fetchGames()
  }, [])

  // Load chunks on mount and when filters change
  useEffect(() => {
    if (activeTab === 'chunks') {
      fetchChunks()
    }
  }, [activeTab, filterLocation, filterDate])

  const navigateToGame = (gameId: string) => {
    // Navigate to games tab with the specific game filtered
    const url = `/assignor-dashboard?view=games&gameId=${gameId}`
    router.push(url)
  }

  const toggleLocation = (location: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(location)) {
        newSet.delete(location)
      } else {
        newSet.add(location)
      }
      return newSet
    })
  }

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey)
      } else {
        newSet.add(dateKey)
      }
      return newSet
    })
  }

  const expandAll = () => {
    const allLocations = new Set(games.map(g => g.location))
    const allDates = new Set(games.map(g => `${g.location}-${g.date}`))
    setExpandedLocations(allLocations)
    setExpandedDates(allDates)
  }

  const collapseAll = () => {
    setExpandedLocations(new Set())
    setExpandedDates(new Set())
  }

  const selectAllInLocation = (location: string) => {
    const locationGames = filteredGames.filter(g => g.location === location)
    const locationGameIds = locationGames.map(g => g.id)

    // Check if all games in this location are already selected
    const allSelected = locationGameIds.every(id => selectedGames.includes(id))

    if (allSelected) {
      // Deselect all games in this location
      setSelectedGames(prev => prev.filter(id => !locationGameIds.includes(id)))
    } else {
      // Select all games in this location
      setSelectedGames(prev => {
        const newSet = new Set([...prev, ...locationGameIds])
        return Array.from(newSet)
      })
    }
  }

  const selectAllInDate = (location: string, date: string) => {
    const dateGames = filteredGames.filter(g => g.location === location && g.date === date)
    const dateGameIds = dateGames.map(g => g.id)

    // Check if all games on this date are already selected
    const allSelected = dateGameIds.every(id => selectedGames.includes(id))

    if (allSelected) {
      // Deselect all games on this date
      setSelectedGames(prev => prev.filter(id => !dateGameIds.includes(id)))
    } else {
      // Select all games on this date
      setSelectedGames(prev => {
        const newSet = new Set([...prev, ...dateGameIds])
        return Array.from(newSet)
      })
    }
  }

  const handleGameSelect = (gameId: string) => {
    setSelectedGames((prev) => 
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    )
  }

  const createChunk = () => {
    if (selectedGames.length === 0) return

    const selectedGameObjects = games.filter((game) => selectedGames.includes(game.id))

    // Check for mixed dates - this is NOT allowed
    const uniqueDates = Array.from(new Set(selectedGameObjects.map(g => g.date)))

    if (uniqueDates.length > 1) {
      toast({
        title: 'Invalid Selection',
        description: 'Games must be on the same date to be chunked together. You can only chunk games from the same day.',
        variant: 'destructive'
      })
      return
    }

    // Check for mixed locations - this is allowed with warning
    const uniqueLocations = Array.from(new Set(selectedGameObjects.map(g => g.location)))
    const hasMixedLocations = uniqueLocations.length > 1

    // If mixed locations, show confirmation dialog
    if (hasMixedLocations) {
      setChunkWarning({
        type: 'mixed-location',
        locations: uniqueLocations,
        dates: uniqueDates,
        gameCount: selectedGameObjects.length
      })
      setPendingChunkGames(selectedGameObjects)
      setConfirmDialogOpen(true)
      return
    }

    // No issues, create chunk directly
    performCreateChunk(selectedGameObjects)
  }

  const performCreateChunk = async (selectedGameObjects: Game[]) => {
    try {
      // Sort games by time
      const sortedGames = selectedGameObjects.sort((a, b) => {
        const timeA = a.time || a.startTime || ''
        const timeB = b.time || b.startTime || ''
        return timeA.localeCompare(timeB)
      })

      const firstGame = sortedGames[0]
      const uniqueLocations = Array.from(new Set(sortedGames.map(g => g.location)))

      const chunkLocation = uniqueLocations.length > 1
        ? `${uniqueLocations.length} Locations`
        : firstGame.location

      // Call backend API
      const response = await apiClient.createChunk({
        game_ids: sortedGames.map(g => g.id),
        name: `Chunk: ${chunkLocation} - ${firstGame.date}`,
        location: firstGame.location,
        date: firstGame.date,
        start_time: sortedGames[0].time || sortedGames[0].startTime || '',
        end_time: sortedGames[sortedGames.length - 1].endTime || sortedGames[sortedGames.length - 1].time || ''
      })

      if (response.data?.chunk) {
        // Add to local state
        const newChunk: GameChunk = {
          id: response.data.chunk.id,
          games: sortedGames,
          location: response.data.chunk.location,
          date: response.data.chunk.date,
          startTime: response.data.chunk.start_time,
          endTime: response.data.chunk.end_time,
          totalReferees: response.data.chunk.total_referees_needed
        }

        setChunks((prev) => [...prev, newChunk])
        setSelectedGames([])

        const locationDesc = uniqueLocations.length > 1
          ? `${uniqueLocations.length} locations`
          : firstGame.location

        toast({
          title: 'Chunk Created',
          description: `Created chunk with ${sortedGames.length} games${uniqueLocations.length > 1 ? ' across ' + locationDesc : ' at ' + locationDesc}`
        })
      }
    } catch (error: any) {
      console.error('Error creating chunk:', error)
      toast({
        title: 'Error Creating Chunk',
        description: error.message || 'Failed to create chunk',
        variant: 'destructive'
      })
    }
  }

  const handleConfirmChunk = () => {
    if (editingChunkId) {
      performUpdateChunk(pendingChunkGames)
    } else {
      performCreateChunk(pendingChunkGames)
    }
    setConfirmDialogOpen(false)
    setPendingChunkGames([])
    setChunkWarning(null)
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

  const deleteChunk = async (chunkId: string) => {
    try {
      await apiClient.deleteChunk(chunkId, false)
      setChunks((prev) => prev.filter((c) => c.id !== chunkId))
      toast({
        title: 'Chunk Deleted',
        description: 'The game chunk has been removed'
      })
    } catch (error: any) {
      console.error('Error deleting chunk:', error)
      toast({
        title: 'Error Deleting Chunk',
        description: error.message || 'Failed to delete chunk',
        variant: 'destructive'
      })
    }
  }

  const startEditingChunk = (chunkId: string) => {
    const chunk = chunks.find(c => c.id === chunkId)
    if (chunk) {
      setEditingChunkId(chunkId)
      setSelectedGames(chunk.games.map(g => g.id))
      setActiveTab('games')
      toast({
        title: 'Editing Chunk',
        description: 'Select or deselect games, then click "Update Chunk"'
      })
    }
  }

  const cancelEditChunk = () => {
    setEditingChunkId(null)
    setSelectedGames([])
  }

  const updateChunk = () => {
    if (!editingChunkId || selectedGames.length === 0) return

    const selectedGameObjects = games.filter((game) => selectedGames.includes(game.id))

    // Check for mixed dates - this is NOT allowed
    const uniqueDates = Array.from(new Set(selectedGameObjects.map(g => g.date)))

    if (uniqueDates.length > 1) {
      toast({
        title: 'Invalid Selection',
        description: 'Games must be on the same date to be chunked together. You can only chunk games from the same day.',
        variant: 'destructive'
      })
      return
    }

    // Check for mixed locations - this is allowed with warning
    const uniqueLocations = Array.from(new Set(selectedGameObjects.map(g => g.location)))
    const hasMixedLocations = uniqueLocations.length > 1

    // If mixed locations, show confirmation dialog
    if (hasMixedLocations) {
      setChunkWarning({
        type: 'mixed-location',
        locations: uniqueLocations,
        dates: uniqueDates,
        gameCount: selectedGameObjects.length
      })
      setPendingChunkGames(selectedGameObjects)
      setConfirmDialogOpen(true)
      return
    }

    // No issues, update chunk directly
    performUpdateChunk(selectedGameObjects)
  }

  const performUpdateChunk = async (selectedGameObjects: Game[]) => {
    if (!editingChunkId) return

    try {
      const sortedGames = selectedGameObjects.sort((a, b) => {
        const timeA = a.time || a.startTime || ''
        const timeB = b.time || b.startTime || ''
        return timeA.localeCompare(timeB)
      })

      const firstGame = sortedGames[0]
      const uniqueLocations = Array.from(new Set(sortedGames.map(g => g.location)))

      const chunkLocation = uniqueLocations.length > 1
        ? `${uniqueLocations.length} Locations`
        : firstGame.location

      // Get existing chunk to determine what games to add/remove
      const existingChunk = chunks.find(c => c.id === editingChunkId)
      if (!existingChunk) return

      const existingGameIds = existingChunk.games.map(g => g.id)
      const newGameIds = sortedGames.map(g => g.id)

      const add_game_ids = newGameIds.filter(id => !existingGameIds.includes(id))
      const remove_game_ids = existingGameIds.filter(id => !newGameIds.includes(id))

      // Call backend API
      const response = await apiClient.updateChunk(editingChunkId, {
        name: `Chunk: ${chunkLocation} - ${firstGame.date}`,
        add_game_ids: add_game_ids.length > 0 ? add_game_ids : undefined,
        remove_game_ids: remove_game_ids.length > 0 ? remove_game_ids : undefined
      })

      if (response.data?.chunk) {
        setChunks((prev) => prev.map((c) => {
          if (c.id === editingChunkId) {
            return {
              ...c,
              games: sortedGames,
              location: response.data.chunk.location,
              date: response.data.chunk.date,
              startTime: response.data.chunk.start_time,
              endTime: response.data.chunk.end_time,
              totalReferees: response.data.chunk.total_referees_needed
            }
          }
          return c
        }))

        setEditingChunkId(null)
        setSelectedGames([])

        toast({
          title: 'Chunk Updated',
          description: `Updated chunk with ${sortedGames.length} games`
        })
      }
    } catch (error: any) {
      console.error('Error updating chunk:', error)
      toast({
        title: 'Error Updating Chunk',
        description: error.message || 'Failed to update chunk',
        variant: 'destructive'
      })
    }
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

  // Group chunks by date
  const groupedChunks = (() => {
    const dateMap = new Map<string, GameChunk[]>()

    chunks.forEach(chunk => {
      if (!dateMap.has(chunk.date)) {
        dateMap.set(chunk.date, [])
      }
      dateMap.get(chunk.date)!.push(chunk)
    })

    return Array.from(dateMap.entries())
      .map(([date, chunks]) => ({
        date,
        chunks: chunks.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        totalGames: chunks.reduce((sum, c) => sum + (c.games?.length || 0), 0),
        totalRefs: chunks.reduce((sum, c) => sum + c.totalReferees, 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })()

  const toggleChunkDate = (date: string) => {
    setExpandedChunkDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  const expandAllChunkDates = () => {
    const allDates = new Set(chunks.map(c => c.date))
    setExpandedChunkDates(allDates)
  }

  const collapseAllChunkDates = () => {
    setExpandedChunkDates(new Set())
  }

  // Group games by location and date
  const groupedGames: LocationGroup[] = (() => {
    const locationMap = new Map<string, Map<string, Game[]>>()

    filteredGames.forEach(game => {
      if (!locationMap.has(game.location)) {
        locationMap.set(game.location, new Map())
      }
      const dateMap = locationMap.get(game.location)!
      if (!dateMap.has(game.date)) {
        dateMap.set(game.date, [])
      }
      dateMap.get(game.date)!.push(game)
    })

    return Array.from(locationMap.entries()).map(([location, dateMap]) => {
      const dates = Array.from(dateMap.entries()).map(([date, games]) => {
        // Sort games by time
        const sortedGames = games.sort((a, b) => {
          const timeA = a.time || a.startTime || ''
          const timeB = b.time || b.startTime || ''
          return timeA.localeCompare(timeB)
        })

        return {
          date,
          games: sortedGames,
          totalRefs: sortedGames.reduce((sum, g) => sum + g.refsNeeded, 0)
        }
      }).sort((a, b) => a.date.localeCompare(b.date))

      const totalGames = dates.reduce((sum, d) => sum + d.games.length, 0)
      const totalRefs = dates.reduce((sum, d) => sum + d.totalRefs, 0)

      return {
        location,
        dates,
        totalGames,
        totalRefs
      }
    }).sort((a, b) => a.location.localeCompare(b.location))
  })()

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
          {isLoadingGames ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Loading games...</h3>
                <p className="text-muted-foreground">Please wait while we fetch your games</p>
              </CardContent>
            </Card>
          ) : gameError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Games</h3>
                <p className="text-muted-foreground mb-4">{gameError}</p>
                <Button onClick={fetchGames}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {editingChunkId ? (
                <>
                  <Button onClick={updateChunk} disabled={selectedGames.length === 0}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Chunk ({selectedGames.length})
                  </Button>
                  <Button variant="outline" onClick={cancelEditChunk}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={createChunk} disabled={selectedGames.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Chunk ({selectedGames.length})
                  </Button>
                  <Button variant="outline" onClick={autoChunkByLocation}>
                    <Layers className="h-4 w-4 mr-2" />
                    Auto-Chunk by Location
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                <ChevronRight className="h-4 w-4 mr-1" />
                Collapse All
              </Button>
            </div>
          </div>

          {/* Grouped Games View */}
          <div className="space-y-4">
            {groupedGames.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No games found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
                </CardContent>
              </Card>
            ) : (
              groupedGames.map((locationGroup) => (
                <GroupedLocationView
                  key={locationGroup.location}
                  locationGroup={locationGroup}
                  isExpanded={expandedLocations.has(locationGroup.location)}
                  selectedGames={selectedGames}
                  expandedDates={expandedDates}
                  onToggleLocation={() => toggleLocation(locationGroup.location)}
                  onToggleDate={toggleDate}
                  onSelectAllInLocation={() => selectAllInLocation(locationGroup.location)}
                  onSelectAllInDate={selectAllInDate}
                  onGameSelect={handleGameSelect}
                />
              ))
            )}
          </div>
            </>
          )}
        </>
      )}

      {activeTab === 'chunks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Game Chunks</h2>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={expandAllChunkDates}>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAllChunkDates}>
                <ChevronRight className="h-4 w-4 mr-1" />
                Collapse All
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchChunks} disabled={isLoadingChunks}>
                <RotateCcw className={cn("h-4 w-4 mr-1", isLoadingChunks && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('games')}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Chunk
              </Button>
            </div>
          </div>

          {isLoadingChunks ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Loading chunks...</h3>
                <p className="text-muted-foreground">Please wait while we fetch your game chunks</p>
              </CardContent>
            </Card>
          ) : chunkError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Chunks</h3>
                <p className="text-muted-foreground mb-4">{chunkError}</p>
                <Button onClick={fetchChunks}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : chunks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No chunks created yet</h3>
                <p className="text-muted-foreground mb-4">
                  Select games from the Games tab and create chunks to group them together
                </p>
                <Button variant="outline" onClick={() => setActiveTab('games')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Go to Games
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedChunks.map((dateGroup) => {
                const isDateExpanded = expandedChunkDates.has(dateGroup.date)
                const isPastDate = new Date(dateGroup.date) < new Date(new Date().toDateString())

                return (
                  <Card key={dateGroup.date} className={cn("border-l-4", isPastDate ? "border-l-muted-foreground opacity-60" : "border-l-primary")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleChunkDate(dateGroup.date)}
                          className="flex items-center gap-3 flex-1 text-left hover:opacity-70 transition-opacity"
                        >
                          {isDateExpanded ? (
                            <ChevronDown className="h-5 w-5 text-primary" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-primary" />
                          )}
                          <Calendar className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {new Date(dateGroup.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                              {isPastDate && <Badge variant="outline" className="ml-2 text-xs">Past</Badge>}
                            </CardTitle>
                            <CardDescription>
                              {dateGroup.chunks.length} chunks • {dateGroup.totalRefs} referees needed
                            </CardDescription>
                          </div>
                        </button>
                      </div>
                    </CardHeader>

                    {isDateExpanded && (
                      <CardContent className="space-y-3 pt-0">
                        {dateGroup.chunks.map((chunk) => (
                          <Card key={chunk.id} className="bg-muted/30">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-base">{chunk.location}</CardTitle>
                                  <CardDescription>
                                    {chunk.startTime} - {chunk.endTime} • {chunk.totalReferees} referees needed
                                  </CardDescription>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {chunk.assignedTo ? (
                                    <Badge variant="default">Assigned to {chunk.assignedTo}</Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedChunk(chunk)
                                        setAssignDialogOpen(true)
                                      }}
                                    >
                                      Assign
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditingChunk(chunk.id)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteChunk(chunk.id)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2">
                                {chunk.games && chunk.games.length > 0 ? (
                                  chunk.games.map((game) => {
                                    const homeTeamName = formatTeamName(game.homeTeam)
                                    const awayTeamName = formatTeamName(game.awayTeam)

                                    return (
                                      <div key={game.id} className="flex items-center justify-between p-2 bg-card rounded group">
                                        <span className="text-sm text-foreground">
                                          {game.time || game.startTime} - {homeTeamName} vs {awayTeamName}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline">{game.refsNeeded} refs</Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => navigateToGame(game.id)}
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">No games in this chunk</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
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
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No AI suggestions available</h3>
                <p className="text-muted-foreground mb-4">
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
                  <Card key={suggestion.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center">
                            <Bot className="h-5 w-5 mr-2 text-primary" />
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
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectAISuggestion(suggestion)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {Math.round(suggestion.factors.proximity * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Proximity</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {Math.round(suggestion.factors.availability * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Availability</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {Math.round(suggestion.factors.experience * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Experience</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {Math.round(suggestion.factors.pastPerformance * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Past Performance</div>
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
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No historic patterns found</h3>
                <p className="text-muted-foreground mb-4">
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
                <Card key={pattern.id} className="border-l-4 border-l-green-500 dark:border-l-green-400">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />
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
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                        >
                          <Repeat className="h-4 w-4 mr-1" />
                          Apply Pattern
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
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

      {/* Chunk Confirmation Dialog */}
      <ChunkConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open)
          if (!open) {
            setPendingChunkGames([])
            setChunkWarning(null)
          }
        }}
        warning={chunkWarning}
        onConfirm={handleConfirmChunk}
      />

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