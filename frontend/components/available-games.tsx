'use client'

import { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Clock, CheckCircle, AlertCircle, Trophy } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { useApi, type Game } from '@/lib/api'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { GameFilters, applyGameFilters, type ActiveFilters } from '@/components/ui/game-filters'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

export function AvailableGames() {
  const { user } = useAuth()
  const { toast } = useToast()
  const api = useApi()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [distanceFilter, setDistanceFilter] = useState('all')
  const [refereeLevel, setRefereeLevel] = useState<string>('')
  const [allowedDivisions, setAllowedDivisions] = useState<string[]>([])
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    ageGroups: [],
    genders: [],
    divisions: [],
    zones: [],
    levels: [],
    statuses: []
  })

  useEffect(() => {
    if (user?.role === 'referee') {
      fetchAvailableGames()
    }
  }, [user])

  const fetchAvailableGames = async () => {
    try {
      setLoading(true)
      const response = await api.getAvailableGamesForSelfAssignment()
      
      if (response.success) {
        setGames(response.data.games || [])
        setRefereeLevel(response.data.referee_level || '')
        setAllowedDivisions(response.data.allowed_divisions || [])
      } else if (response.message) {
        toast({
          variant: 'destructive',
          title: 'No level assigned',
          description: response.message
        })
      }
    } catch (error) {
      console.error('Failed to fetch available games:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load available games.'
      })
    } finally {
      setLoading(false)
    }
  }

  // First apply GameFilters, then apply the existing search/level/distance filters
  const gameFilteredGames = applyGameFilters(games, activeFilters)
  
  const filteredGames = gameFilteredGames.filter((game) => {
    const matchesSearch =
      game.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = levelFilter === 'all' || game.level === levelFilter
    // In a real app, you'd calculate actual distance based on user location
    const matchesDistance = distanceFilter === 'all' || true
    return matchesSearch && matchesLevel && matchesDistance
  })

  const handleAcceptGame = async (gameId: string) => {
    try {
      const response = await api.selfAssignToGame({
        game_id: gameId,
        position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b' // Default referee position
      })

      if (response.success) {
        toast({
          title: 'Game accepted!',
          description: `${response.message} Final wage: $${response.data.wageBreakdown.finalWage}`
        })
        
        // Refresh available games
        await fetchAvailableGames()
      }
    } catch (error: any) {
      console.error('Failed to accept game:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to accept game.'
      })
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          icon={Trophy}
          title="Available Games"
          description="Games available for self-assignment"
        />
        <div className="text-center py-8">
          <p>Loading available games...</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        icon={Trophy}
        title="Available Games"
        description={refereeLevel ? `Your level: ${refereeLevel} - Qualified for: ${allowedDivisions.join(', ')}` : 'Games available for self-assignment'}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
            <Clock className={cn('h-4 w-4', getStatusColorClass('warning', 'text'))} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Earnings</CardTitle>
            <DollarSign className={cn('h-4 w-4', getStatusColorClass('success', 'text'))} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${games.reduce((total, game) => total + (game.finalWage || game.payRate || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Within Range</CardTitle>
            <MapPin className={cn('h-4 w-4', getStatusColorClass('info', 'text'))} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                games.filter(
                  (game) =>
                    // Mock distance calculation - in real app would use actual coordinates
                    Math.random() > 0.3,
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Games</CardTitle>
              <CardDescription>Games you can pick up on a first-come, first-served basis</CardDescription>
            </div>
            <GameFilters 
              games={games}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
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
            <Select value={levelFilter} onValueChange={setLevelFilter}>
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
            <Select value={distanceFilter} onValueChange={setDistanceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Distance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Distance</SelectItem>
                <SelectItem value="10">Within 10 miles</SelectItem>
                <SelectItem value="25">Within 25 miles</SelectItem>
                <SelectItem value="50">Within 50 miles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-medium">
                      {formatGameMatchup(game.homeTeam, game.awayTeam)}
                    </TableCell>
                    <TableCell>
                      {new Date(game.date).toLocaleDateString()}
                      <br />
                      <span className="text-sm text-muted-foreground">{game.time}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                        {game.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{game.level}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <DollarSign className={cn('h-4 w-4 mr-1', getStatusColorClass('success', 'text'))} />
                          {game.finalWage || game.payRate}
                        </div>
                        {game.wageMultiplier && game.wageMultiplier !== 1.0 && (
                          <div className="text-xs text-muted-foreground">
                            {game.wageMultiplier}x multiplier
                            {game.wageMultiplierReason && (
                              <span> - {game.wageMultiplierReason}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{Math.floor(Math.random() * 30 + 5)} miles</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptGame(game.id)}
                        className={cn(getStatusColorClass('success', 'bg'), 'hover:opacity-90')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredGames.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No available games match your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
