'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Calendar, Clock, MapPin, Users, Edit, Trash2, Eye, Download, Upload, FileUp, X, CheckSquare, Square } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, InputWithIcon } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { CERBOS_PERMISSIONS } from '@/lib/permissions'
import { MenteeSelector } from '@/components/MenteeSelector'
import { MenteeGamesView } from '@/components/MenteeGamesView'
import CalendarUpload from '@/components/calendar-upload'
import { getAssignmentStatus, getRefCountDisplay } from '@/lib/utils/assignment-status'
import { ActionMenu, type Action } from '@/components/ui/action-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface GamesManagementPageProps {
  initialDateFilter?: string
}

type QuickFilter = 'all' | 'today' | 'thisWeek' | 'unassigned'

// Mobile Game Card Component
interface GameCardProps {
  game: Game
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

function GameCard({ game, onEdit, onDelete, onView, selectionMode, selected, onToggleSelect }: GameCardProps) {
  const homeTeamName = typeof game.homeTeam === 'object'
    ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
    : game.homeTeam
  const awayTeamName = typeof game.awayTeam === 'object'
    ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
    : game.awayTeam

  const assignedCount = game.assignedReferees?.length || game.assignments?.length || 0
  const requiredCount = game.refsNeeded || 0
  const statusInfo = getAssignmentStatus(assignedCount, requiredCount)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { variant: 'success' as const, dot: true, dotColor: 'success' as const, pulse: false }
      case 'assigned':
        return { variant: 'info' as const, dot: true, dotColor: 'default' as const, pulse: false }
      case 'unassigned':
        return { variant: 'warning' as const, dot: true, dotColor: 'warning' as const, pulse: true }
      case 'cancelled':
        return { variant: 'destructive' as const, dot: false, dotColor: 'destructive' as const, pulse: false }
      case 'up-for-grabs':
        return { variant: 'warning' as const, dot: true, dotColor: 'warning' as const, pulse: true }
      default:
        return { variant: 'secondary' as const, dot: false, dotColor: 'default' as const, pulse: false }
    }
  }

  const statusConfig = getStatusConfig(game.status)

  return (
    <Card
      variant="interactive"
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        selected && 'ring-2 ring-primary shadow-md'
      )}
    >
      {selectionMode && (
        <div className="absolute top-4 left-4 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select game ${game.id}`}
          />
        </div>
      )}
      <CardContent className={cn('p-4', selectionMode && 'pl-12')}>
        <div className="space-y-3">
          {/* Teams and Status */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight">
                {homeTeamName} vs {awayTeamName}
              </h3>
              <Badge
                variant={statusConfig.variant}
                dot={statusConfig.dot}
                dotColor={statusConfig.dotColor}
                pulse={statusConfig.pulse}
                size="sm"
                className="shrink-0"
              >
                {game.status === 'up-for-grabs' ? 'Up for Grabs' :
                  game.status.charAt(0).toUpperCase() + game.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{game.division}</p>
          </div>

          {/* Date, Time, Location */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{new Date(game.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{game.time || game.startTime}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="line-clamp-1">{game.location}</span>
          </div>

          {/* Level and Referees */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Badge variant={game.level === 'Elite' ? 'default' : 'secondary'} size="sm">
              {game.level}
            </Badge>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {getRefCountDisplay(assignedCount, requiredCount)}
              </span>
              <Badge variant={statusInfo.variant} size="sm">
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          {!selectionMode && (
            <div className="flex gap-2 pt-2">
              {onView && (
                <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
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
  // Bulk selection state
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false)
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set())
  // Quick filter state
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const { hasPermission, hasAnyPermission } = usePermissions()

  // Check if user has mentorship permissions (now mapped to referee management)
  const isMentor = hasAnyPermission([CERBOS_PERMISSIONS.REFEREES.VIEW_LIST, CERBOS_PERMISSIONS.REFEREES.UPDATE])

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

  // Helper functions for bulk selection
  const toggleBulkSelection = () => {
    setBulkSelectionMode(!bulkSelectionMode)
    if (bulkSelectionMode) {
      setSelectedGameIds(new Set())
    }
  }

  const toggleGameSelection = (gameId: string) => {
    const newSelection = new Set(selectedGameIds)
    if (newSelection.has(gameId)) {
      newSelection.delete(gameId)
    } else {
      newSelection.add(gameId)
    }
    setSelectedGameIds(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedGameIds.size === filteredGames.length) {
      setSelectedGameIds(new Set())
    } else {
      setSelectedGameIds(new Set(filteredGames.map(g => g.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedGameIds.size === 0) return

    try {
      const promises = Array.from(selectedGameIds).map(id => apiClient.deleteGame(id))
      await Promise.all(promises)

      setGames(games.filter(g => !selectedGameIds.has(g.id)))
      setSelectedGameIds(new Set())
      setBulkSelectionMode(false)

      toast({
        title: 'Games deleted',
        description: `Successfully deleted ${selectedGameIds.size} game(s).`
      })
    } catch (error) {
      console.error('Failed to delete games:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete some games. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Helper function to get date range for quick filters
  const getQuickFilterDate = (filter: QuickFilter): { start?: Date; end?: Date } | null => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    switch (filter) {
      case 'today':
        return { start: now, end: new Date(now.getTime() + 24 * 60 * 60 * 1000) }
      case 'thisWeek': {
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return { start: now, end: weekEnd }
      }
      default:
        return null
    }
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
    const matchesLevel = selectedLevel === 'all' || game.level === selectedLevel
    const matchesStatus = selectedStatus === 'all' || game.status === selectedStatus
    const matchesDate = selectedDate === 'all' || game.date === selectedDate

    // Quick filter logic
    let matchesQuickFilter = true
    if (quickFilter !== 'all') {
      if (quickFilter === 'unassigned') {
        matchesQuickFilter = game.status === 'unassigned'
      } else {
        const dateRange = getQuickFilterDate(quickFilter)
        if (dateRange) {
          const gameDate = new Date(game.date)
          matchesQuickFilter = gameDate >= dateRange.start! && gameDate < dateRange.end!
        }
      }
    }

    return matchesSearch && matchesLevel && matchesStatus && matchesDate && matchesQuickFilter
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
      color: 'text-emerald-600'
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
    // Conditionally add selection column when in bulk mode
    ...(bulkSelectionMode ? [{
      id: 'select',
      title: (
        <Checkbox
          checked={selectedGameIds.size === filteredGames.length && filteredGames.length > 0}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all games"
        />
      ),
      filterType: 'none' as const,
      accessor: (game: Game) => (
        <Checkbox
          checked={selectedGameIds.has(game.id)}
          onCheckedChange={() => toggleGameSelection(game.id)}
          aria-label={`Select game ${game.id}`}
        />
      )
    }] : []),
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
      id: 'referees_status',
      title: 'Referees',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All' },
        { value: 'unassigned', label: 'Unassigned' },
        { value: 'partial', label: 'Partial' },
        { value: 'assigned', label: 'Fully Assigned' }
      ],
      accessor: (game) => {
        const assignedCount = game.assignedReferees?.length || game.assignments?.length || 0
        const requiredCount = game.refsNeeded || 0
        const statusInfo = getAssignmentStatus(assignedCount, requiredCount)

        return (
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {getRefCountDisplay(assignedCount, requiredCount)}
            </div>
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
          </div>
        )
      }
    },
    {
      id: 'status',
      title: 'Game Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Status' },
        { value: 'unassigned', label: 'Unassigned' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'up-for-grabs', label: 'Up for Grabs' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      accessor: (game) => {
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'completed':
              return { variant: 'success' as const, dot: true, dotColor: 'success' as const, pulse: false }
            case 'assigned':
              return { variant: 'info' as const, dot: true, dotColor: 'default' as const, pulse: false }
            case 'unassigned':
              return { variant: 'warning' as const, dot: true, dotColor: 'warning' as const, pulse: true }
            case 'cancelled':
              return { variant: 'destructive' as const, dot: false, dotColor: 'destructive' as const, pulse: false }
            case 'up-for-grabs':
              return { variant: 'warning' as const, dot: true, dotColor: 'warning' as const, pulse: true }
            default:
              return { variant: 'secondary' as const, dot: false, dotColor: 'default' as const, pulse: false }
          }
        }

        const config = getStatusConfig(game.status)
        return (
          <Badge
            variant={config.variant}
            dot={config.dot}
            dotColor={config.dotColor}
            pulse={config.pulse}
            className="animate-in fade-in duration-200"
          >
            {game.status === 'up-for-grabs' ? 'Up for Grabs' :
              game.status.charAt(0).toUpperCase() + game.status.slice(1)}
          </Badge>
        )
      }
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (game) => {
        const actions: Action[] = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => {
              // TODO: Implement view game details
              toast({
                title: 'View Game',
                description: 'Game details view coming soon'
              })
            }
          },
          {
            label: 'Edit Game',
            icon: Edit,
            onClick: () => {
              // TODO: Implement edit game
              toast({
                title: 'Edit Game',
                description: 'Game editing coming soon'
              })
            }
          }
        ]

        // Only add delete action if user has permission
        if (hasPermission(CERBOS_PERMISSIONS.GAMES.DELETE)) {
          actions.push({
            label: 'Delete Game',
            icon: Trash2,
            onClick: () => openDeleteDialog(game),
            variant: 'destructive',
            separator: true
          })
        }

        return <ActionMenu actions={actions} triggerLabel="Game actions" />
      }
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={Calendar}
        title={selectedMenteeId ? `${selectedMenteeName}'s Games` : 'Game Management'}
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>
                {selectedMenteeId ? 'Mentorship Controls' : 'Game Directory'}
              </CardTitle>
              <CardDescription>
                {selectedMenteeId
                  ? 'Select a different mentee or switch back to all games view'
                  : 'Search and filter games across all divisions and levels'
                }
              </CardDescription>
            </div>
            {!selectedMenteeId && (
              <div className="flex items-center gap-2">
                <Button
                  variant={bulkSelectionMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleBulkSelection}
                >
                  {bulkSelectionMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  <span className="ml-2">{bulkSelectionMode ? 'Exit Bulk Mode' : 'Bulk Select'}</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Filter Chips */}
          {!selectedMenteeId && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={quickFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickFilter('all')}
                  className={cn(
                    'transition-all duration-200',
                    quickFilter === 'all' && 'shadow-md'
                  )}
                >
                  All Games
                </Button>
                <Button
                  variant={quickFilter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickFilter('today')}
                  className={cn(
                    'transition-all duration-200',
                    quickFilter === 'today' && 'shadow-md'
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Today
                </Button>
                <Button
                  variant={quickFilter === 'thisWeek' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickFilter('thisWeek')}
                  className={cn(
                    'transition-all duration-200',
                    quickFilter === 'thisWeek' && 'shadow-md'
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  This Week
                </Button>
                <Button
                  variant={quickFilter === 'unassigned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickFilter('unassigned')}
                  className={cn(
                    'transition-all duration-200',
                    quickFilter === 'unassigned' && 'shadow-md'
                  )}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Unassigned
                </Button>
                {quickFilter !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuickFilter('all')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Bulk Action Bar */}
          {bulkSelectionMode && selectedGameIds.size > 0 && (
            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-sm">
                    {selectedGameIds.size} selected
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedGameIds.size === filteredGames.length ? 'All games selected' : `${filteredGames.length - selectedGameIds.size} remaining`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedGameIds.size === filteredGames.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {hasPermission(CERBOS_PERMISSIONS.GAMES.DELETE) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                </div>
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
                <>
                  {/* Desktop Table View - hidden on mobile */}
                  <div className="hidden md:block">
                    <FilterableTable
                      data={filteredGames}
                      columns={columns}
                      emptyMessage="No games found matching your criteria."
                      enableViewToggle={true}
                      enableCSV={true}
                      csvFilename="games-export.csv"
                      mobileCardType="game"
                      maxVisibleColumns="auto"
                      columnWidthEstimate={180}
                      customOptionsContent={
                        isMentor && (
                          <div className="px-2 py-1.5">
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Mentorship View
                            </label>
                            <MenteeSelector
                              selectedMenteeId={selectedMenteeId}
                              onMenteeChange={handleMenteeChange}
                              placeholder="Select a mentee..."
                            />
                          </div>
                        )
                      }
                    />
                  </div>

                  {/* Mobile Card View - shown only on mobile */}
                  <div className="md:hidden space-y-4">
                    {filteredGames.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No games found matching your criteria.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        {filteredGames.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            selectionMode={bulkSelectionMode}
                            selected={selectedGameIds.has(game.id)}
                            onToggleSelect={() => toggleGameSelection(game.id)}
                            onView={() => {
                              toast({
                                title: 'View Game',
                                description: 'Game details view coming soon'
                              })
                            }}
                            onEdit={() => {
                              toast({
                                title: 'Edit Game',
                                description: 'Game editing coming soon'
                              })
                            }}
                            onDelete={hasPermission(CERBOS_PERMISSIONS.GAMES.DELETE) ? () => openDeleteDialog(game) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
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
                description: `Successfully imported ${result.imported} games`
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