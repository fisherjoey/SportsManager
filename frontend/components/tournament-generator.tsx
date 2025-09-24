'use client'

import React, { useState, useEffect } from 'react'
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Settings,
  Play,
  Target,
  Zap,
  Crown,
  CheckCircle2,
  Info,
  AlertTriangle,
  Eye,
  Plus,
  Sparkles,
  TrendingUp,
  BarChart3
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useApi, League, Team, Tournament, TournamentFormat } from '@/lib/api'

interface TournamentForm {
  name: string
  league_id: string
  tournament_type: 'round_robin' | 'single_elimination' | 'swiss_system' | 'group_stage_playoffs'
  team_ids: string[]
  start_date: string
  venue: string
  time_slots: string[]
  days_of_week: number[]
  games_per_day: number
  rounds?: number
  group_size?: number
  advance_per_group?: number
  seeding_method: 'random' | 'ranked' | 'custom'
}

const daysOfWeekOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

const defaultTimeSlots = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00']

export function TournamentGenerator() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [tournamentFormats, setTournamentFormats] = useState<TournamentFormat[]>([])
  const [generatedTournament, setGeneratedTournament] = useState<Tournament | null>(null)
  const [estimate, setEstimate] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Dialog states
  const [showTournamentDialog, setShowTournamentDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showCreateGamesDialog, setShowCreateGamesDialog] = useState(false)
  
  // Form state
  const [tournamentForm, setTournamentForm] = useState<TournamentForm>({
    name: '',
    league_id: '',
    tournament_type: 'round_robin',
    team_ids: [],
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
    venue: 'Sports Complex',
    time_slots: ['10:00', '12:00', '14:00', '16:00'],
    days_of_week: [6, 0], // Weekend
    games_per_day: 4,
    rounds: 5,
    group_size: 4,
    advance_per_group: 2,
    seeding_method: 'ranked'
  })

  const api = useApi()
  const { toast } = useToast()

  useEffect(() => {
    fetchLeagues()
    fetchTournamentFormats()
  }, [])

  useEffect(() => {
    if (tournamentForm.league_id) {
      fetchTeamsForLeague(tournamentForm.league_id)
      updateEstimate()
    }
  }, [tournamentForm.league_id, tournamentForm.tournament_type, tournamentForm.team_ids.length, tournamentForm.rounds, tournamentForm.group_size, tournamentForm.advance_per_group])

  const fetchLeagues = async () => {
    try {
      setLoading(true)
      const response = await api.getLeagues({ limit: 100 })
      setLeagues(response.data.leagues)
    } catch (error) {
      console.error('Error fetching leagues:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch leagues',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTournamentFormats = async () => {
    try {
      const response = await api.getTournamentFormats()
      setTournamentFormats(response.data.formats)
    } catch (error) {
      console.error('Error fetching tournament formats:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tournament formats. Some features may not work properly.'
      })
    }
  }

  const fetchTeamsForLeague = async (leagueId: string) => {
    try {
      const response = await api.getTeamsForLeague(leagueId)
      setAvailableTeams(response.data.teams)
      setSelectedLeague(response.data.league)
      
      // Auto-select all teams
      setTournamentForm(prev => ({
        ...prev,
        team_ids: response.data.teams.map(t => t.id)
      }))
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch teams for league',
        variant: 'destructive'
      })
    }
  }

  const updateEstimate = async () => {
    if (!tournamentForm.tournament_type || tournamentForm.team_ids.length < 2) {
      setEstimate(null)
      return
    }

    try {
      const response = await api.estimateTournament({
        tournament_type: tournamentForm.tournament_type,
        team_count: tournamentForm.team_ids.length,
        rounds: tournamentForm.rounds,
        group_size: tournamentForm.group_size,
        advance_per_group: tournamentForm.advance_per_group,
        games_per_day: tournamentForm.games_per_day
      })
      setEstimate(response.data.estimate)
    } catch (error) {
      console.error('Error estimating tournament:', error)
      toast({
        variant: 'destructive',
        title: 'Estimation Error',
        description: 'Failed to estimate tournament details. Please check your settings.'
      })
    }
  }

  const generateTournament = async () => {
    try {
      if (!tournamentForm.name || !tournamentForm.league_id || tournamentForm.team_ids.length < 2) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields and select at least 2 teams',
          variant: 'destructive'
        })
        return
      }

      setLoading(true)
      const response = await api.generateTournament(tournamentForm)
      setGeneratedTournament(response.data.tournament)
      setShowPreviewDialog(true)
      
      toast({
        title: 'Success',
        description: response.message
      })
    } catch (error) {
      console.error('Error generating tournament:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate tournament',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createTournamentGames = async () => {
    if (!generatedTournament) return

    try {
      setLoading(true)
      const response = await api.createTournamentGames({
        games: generatedTournament.games,
        tournament_name: generatedTournament.name
      })
      
      toast({
        title: 'Success',
        description: `${response.message} - ${response.data.created.length} games created`
      })
      
      setShowCreateGamesDialog(false)
      setShowPreviewDialog(false)
      setGeneratedTournament(null)
      
      // Reset form
      setTournamentForm(prev => ({
        ...prev,
        name: '',
        team_ids: []
      }))
    } catch (error) {
      console.error('Error creating tournament games:', error)
      toast({
        title: 'Error',
        description: 'Failed to create tournament games',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getFormatIcon = (formatId: string) => {
    switch (formatId) {
    case 'round_robin': return <Target className="h-5 w-5" />
    case 'single_elimination': return <Zap className="h-5 w-5" />
    case 'swiss_system': return <Settings className="h-5 w-5" />
    case 'group_stage_playoffs': return <Crown className="h-5 w-5" />
    default: return <Trophy className="h-5 w-5" />
    }
  }

  const selectedFormat = tournamentFormats.find(f => f.id === tournamentForm.tournament_type)

  // Stats for tournament overview
  const stats = [
    {
      title: 'Available Leagues',
      value: leagues.length,
      icon: Trophy,
      color: 'text-blue-600',
      description: 'Leagues ready for tournaments'
    },
    {
      title: 'Tournament Formats',
      value: tournamentFormats.length,
      icon: Settings,
      color: 'text-green-600',
      description: 'Format options available'
    },
    {
      title: 'Total Teams',
      value: availableTeams.length,
      icon: Users,
      color: 'text-purple-600',
      description: 'Teams in selected league'
    },
    {
      title: 'Estimated Games',
      value: estimate ? estimate.total_games : 'TBD',
      icon: BarChart3,
      color: 'text-orange-600',
      description: 'Games in current setup'
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={Zap}
        title="Tournament Generator"
        description="Create competitive tournaments with automated scheduling and multiple formats"
      >
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Sparkles className="h-3 w-3 mr-1" />
          Smart Scheduling
        </Badge>
        <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => setShowTournamentDialog(true)}>
          <Trophy className="h-5 w-5 mr-2" />
          Create Tournament
        </Button>
      </PageHeader>

      <Dialog open={showTournamentDialog} onOpenChange={setShowTournamentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tournament</DialogTitle>
            <DialogDescription>
                Set up your tournament with teams, format, and schedule
            </DialogDescription>
          </DialogHeader>
            
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="format">Format</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>
              
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tournament-name">Tournament Name *</Label>
                  <Input
                    id="tournament-name"
                    placeholder="e.g., Winter Championship 2025"
                    value={tournamentForm.name}
                    onChange={(e) => setTournamentForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                  
                <div className="space-y-2">
                  <Label htmlFor="league-select">League *</Label>
                  <Select 
                    value={tournamentForm.league_id} 
                    onValueChange={(value) => setTournamentForm(prev => ({ ...prev, league_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a league" />
                    </SelectTrigger>
                    <SelectContent>
                      {leagues.map(league => (
                        <SelectItem key={league.id} value={league.id}>
                          {league.organization} {league.age_group} {league.gender} {league.division} - {league.season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={tournamentForm.start_date}
                    onChange={(e) => setTournamentForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                  
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    placeholder="e.g., Downtown Sports Complex"
                    value={tournamentForm.venue}
                    onChange={(e) => setTournamentForm(prev => ({ ...prev, venue: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
              
            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-4">
              {availableTeams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No teams available</h3>
                  <p className="text-muted-foreground">
                      Please select a league first to see available teams
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Select Teams ({tournamentForm.team_ids.length} selected)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTournamentForm(prev => ({ ...prev, team_ids: [] }))}
                      >
                          Clear All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTournamentForm(prev => ({ 
                          ...prev, 
                          team_ids: availableTeams.map(t => t.id) 
                        }))}
                      >
                          Select All
                      </Button>
                    </div>
                  </div>
                    
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {availableTeams.map(team => (
                      <div key={team.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`team-${team.id}`}
                          checked={tournamentForm.team_ids.includes(team.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTournamentForm(prev => ({ 
                                ...prev, 
                                team_ids: [...prev.team_ids, team.id] 
                              }))
                            } else {
                              setTournamentForm(prev => ({ 
                                ...prev, 
                                team_ids: prev.team_ids.filter(id => id !== team.id) 
                              }))
                            }
                          }}
                        />
                        <Label htmlFor={`team-${team.id}`} className="text-sm flex items-center gap-2">
                          <Badge variant="secondary" className="w-6 h-5 text-xs justify-center">
                            {team.rank}
                          </Badge>
                          {team.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
              
            {/* Format Tab */}
            <TabsContent value="format" className="space-y-4">
              <div className="space-y-4">
                <Label>Tournament Format</Label>
                <div className="grid grid-cols-1 gap-3">
                  {tournamentFormats.map(format => (
                    <Card 
                      key={format.id}
                      className={`cursor-pointer transition-colors ${
                        tournamentForm.tournament_type === format.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setTournamentForm(prev => ({ 
                        ...prev, 
                        tournament_type: format.id as any 
                      }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getFormatIcon(format.id)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">{format.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{format.min_teams}-{format.max_teams} teams</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{format.description}</p>
                            <div className="flex items-center gap-4 text-xs">
                              <Badge variant="outline" className="text-green-700 bg-green-50">
                                {format.pros[0]}
                              </Badge>
                              <span className="text-muted-foreground">{format.suitable_for}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                  
                {/* Format-specific options */}
                {tournamentForm.tournament_type === 'swiss_system' && (
                  <div className="space-y-2">
                    <Label htmlFor="rounds">Number of Rounds</Label>
                    <Input
                      id="rounds"
                      type="number"
                      min="3"
                      max="15"
                      value={tournamentForm.rounds}
                      onChange={(e) => setTournamentForm(prev => ({ 
                        ...prev, 
                        rounds: parseInt(e.target.value) || 5 
                      }))}
                    />
                  </div>
                )}
                  
                {tournamentForm.tournament_type === 'group_stage_playoffs' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-size">Teams per Group</Label>
                      <Input
                        id="group-size"
                        type="number"
                        min="3"
                        max="8"
                        value={tournamentForm.group_size}
                        onChange={(e) => setTournamentForm(prev => ({ 
                          ...prev, 
                          group_size: parseInt(e.target.value) || 4 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advance-per-group">Teams Advancing per Group</Label>
                      <Input
                        id="advance-per-group"
                        type="number"
                        min="1"
                        max="4"
                        value={tournamentForm.advance_per_group}
                        onChange={(e) => setTournamentForm(prev => ({ 
                          ...prev, 
                          advance_per_group: parseInt(e.target.value) || 2 
                        }))}
                      />
                    </div>
                  </div>
                )}
                  
                <div className="space-y-2">
                  <Label>Seeding Method</Label>
                  <Select 
                    value={tournamentForm.seeding_method} 
                    onValueChange={(value: any) => setTournamentForm(prev => ({ 
                      ...prev, 
                      seeding_method: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ranked">By Team Ranking</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="custom">Custom (manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
              
            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="games-per-day">Games per Day</Label>
                  <Input
                    id="games-per-day"
                    type="number"
                    min="1"
                    max="20"
                    value={tournamentForm.games_per_day}
                    onChange={(e) => setTournamentForm(prev => ({ 
                      ...prev, 
                      games_per_day: parseInt(e.target.value) || 4 
                    }))}
                  />
                </div>
              </div>
                
              <div className="space-y-3">
                <Label>Game Days</Label>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeekOptions.map(day => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={tournamentForm.days_of_week.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTournamentForm(prev => ({ 
                              ...prev, 
                              days_of_week: [...prev.days_of_week, day.value].sort() 
                            }))
                          } else {
                            setTournamentForm(prev => ({ 
                              ...prev, 
                              days_of_week: prev.days_of_week.filter(d => d !== day.value) 
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
                
              <div className="space-y-3">
                <Label>Time Slots</Label>
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {defaultTimeSlots.map(time => (
                      <div key={time} className="flex items-center space-x-1">
                        <Checkbox
                          id={`time-${time}`}
                          checked={tournamentForm.time_slots.includes(time)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTournamentForm(prev => ({ 
                                ...prev, 
                                time_slots: [...prev.time_slots, time].sort() 
                              }))
                            } else {
                              setTournamentForm(prev => ({ 
                                ...prev, 
                                time_slots: prev.time_slots.filter(t => t !== time) 
                              }))
                            }
                          }}
                        />
                        <Label htmlFor={`time-${time}`} className="text-sm">{time}</Label>
                      </div>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Custom time slots (e.g., 08:00, 10:30, 13:15)"
                    value={tournamentForm.time_slots.join(', ')}
                    onChange={(e) => {
                      const slots = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      setTournamentForm(prev => ({ ...prev, time_slots: slots }))
                    }}
                    rows={2}
                  />
                </div>
              </div>
                
              {/* Estimate */}
              {estimate && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-blue-900">Tournament Estimate</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-blue-700">TOTAL GAMES</Label>
                        <div className="font-medium text-blue-900">{estimate.total_games}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-blue-700">ESTIMATED DAYS</Label>
                        <div className="font-medium text-blue-900">{estimate.estimated_days}</div>
                      </div>
                      {estimate.games_per_team && (
                        <div>
                          <Label className="text-xs text-blue-700">GAMES PER TEAM</Label>
                          <div className="font-medium text-blue-900">{estimate.games_per_team}</div>
                        </div>
                      )}
                      {estimate.rounds && (
                        <div>
                          <Label className="text-xs text-blue-700">ROUNDS</Label>
                          <div className="font-medium text-blue-900">{estimate.rounds}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
            
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTournamentDialog(false)}>
                Cancel
            </Button>
            <Button onClick={generateTournament} disabled={loading || tournamentForm.team_ids.length < 2}>
              {loading ? 'Generating...' : 'Generate Tournament'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tournament Formats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2 text-yellow-600" />
            Tournament Format Library
          </CardTitle>
          <CardDescription>
            Professional tournament formats with automated scheduling and bracket generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {tournamentFormats.map(format => (
              <Card key={format.id} className="h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getFormatIcon(format.id)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{format.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{format.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary">{format.min_teams}-{format.max_teams} teams</Badge>
                          <Badge variant="outline">{format.games_formula}</Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs text-green-700">
                            ✓ {format.pros.slice(0, 2).join(', ')}
                          </div>
                          <div className="text-xs text-red-700">
                            ✗ {format.cons.slice(0, 1).join(', ')}
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Best for:</span> {format.suitable_for}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tournament Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tournament Preview</DialogTitle>
            <DialogDescription>
              Review your tournament before creating the games
            </DialogDescription>
          </DialogHeader>
          
          {generatedTournament && (
            <div className="space-y-6">
              {/* Tournament Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{generatedTournament.total_games}</div>
                      <div className="text-xs text-muted-foreground">Total Games</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{generatedTournament.teams.length}</div>
                      <div className="text-xs text-muted-foreground">Teams</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{generatedTournament.total_rounds}</div>
                      <div className="text-xs text-muted-foreground">Rounds</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {generatedTournament.summary.estimated_duration_days}
                      </div>
                      <div className="text-xs text-muted-foreground">Est. Days</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Games Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Games Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {generatedTournament.rounds.map(round => (
                      <div key={round.round}>
                        <h3 className="font-medium mb-2 sticky top-0 bg-background">
                          {round.round_name || `Round ${round.round}`}
                          {round.stage && ` (${round.stage.replace('_', ' ').toUpperCase()})`}
                        </h3>
                        <div className="space-y-1 pl-4">
                          {round.games.map((game, idx) => (
                            <div key={idx} className="text-sm p-2 border rounded">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{game.home_team_name}</span>
                                  <span className="mx-2">vs</span>
                                  <span className="font-medium">{game.away_team_name}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  {game.game_date} at {game.game_time}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Back to Edit
            </Button>
            <Button 
              onClick={() => setShowCreateGamesDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Create Games
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Create Games Dialog */}
      <Dialog open={showCreateGamesDialog} onOpenChange={setShowCreateGamesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tournament Games?</DialogTitle>
            <DialogDescription>
              This will create actual games in your system that can be assigned to referees.
            </DialogDescription>
          </DialogHeader>
          
          {generatedTournament && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <h3 className="font-medium text-yellow-900">Important</h3>
                </div>
                <p className="text-sm text-yellow-800">
                  This action will create {generatedTournament.total_games} games in your system. 
                  Games can be modified later but the tournament structure will be set.
                </p>
              </div>
              
              <div className="text-sm">
                <div><strong>Tournament:</strong> {generatedTournament.name}</div>
                <div><strong>Format:</strong> {generatedTournament.type.replace('_', ' ').toUpperCase()}</div>
                <div><strong>Games:</strong> {generatedTournament.total_games}</div>
                <div><strong>Teams:</strong> {generatedTournament.teams.length}</div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGamesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTournamentGames} disabled={loading}>
              {loading ? 'Creating...' : 'Yes, Create Games'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}