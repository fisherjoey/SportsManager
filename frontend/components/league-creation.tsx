'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Copy, 
  Trash2, 
  Users, 
  Trophy,
  Calendar,
  MapPin,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Shield,
  Sparkles,
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
import { useApi, League, Team } from '@/lib/api'

interface BulkLeagueForm {
  organization: string
  age_groups: string[]
  genders: string[]
  divisions: string[]
  season: string
  level: string
}

interface BulkTeamForm {
  league_id: string
  teams: Array<{
    name: string
    rank: number
    location: string
    contact_email: string
    contact_phone: string
  }>
}

interface GenerateTeamsForm {
  league_id: string
  count: number
  name_pattern: string
  location_base: string
  auto_rank: boolean
}

export function LeagueCreation() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [filterOptions, setFilterOptions] = useState<any>({})
  
  // Dialog states
  const [showBulkLeagueDialog, setShowBulkLeagueDialog] = useState(false)
  const [showBulkTeamDialog, setShowBulkTeamDialog] = useState(false)
  const [showGenerateTeamsDialog, setShowGenerateTeamsDialog] = useState(false)
  const [showLeagueDetailsDialog, setShowLeagueDetailsDialog] = useState(false)
  
  // Form states
  const [bulkLeagueForm, setBulkLeagueForm] = useState<BulkLeagueForm>({
    organization: '',
    age_groups: [],
    genders: [],
    divisions: [],
    season: '',
    level: 'Recreational'
  })
  
  const [bulkTeamForm, setBulkTeamForm] = useState<BulkTeamForm>({
    league_id: '',
    teams: []
  })
  
  const [generateTeamsForm, setGenerateTeamsForm] = useState<GenerateTeamsForm>({
    league_id: '',
    count: 8,
    name_pattern: 'Team {number}',
    location_base: '',
    auto_rank: true
  })

  const api = useApi()
  const { toast } = useToast()

  // Predefined options
  const ageGroups = ['U8', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21', 'Senior']
  const genders = ['Boys', 'Girls', 'Mixed']
  const levels = ['Recreational', 'Competitive', 'Elite']

  useEffect(() => {
    fetchLeagues()
    fetchFilterOptions()
  }, [])

  const fetchLeagues = async () => {
    try {
      setLoading(true)
      const response = await api.getLeagues({ limit: 50 })
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

  const fetchFilterOptions = async () => {
    try {
      const response = await api.getLeagueFilterOptions()
      setFilterOptions(response.data)
    } catch (error) {
      console.error('Error fetching filter options:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load filter options. Some features may not work properly.'
      })
    }
  }

  const fetchTeamsForLeague = async (leagueId: string) => {
    try {
      const response = await api.getTeamsForLeague(leagueId)
      setTeams(response.data.teams)
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch teams for league',
        variant: 'destructive'
      })
    }
  }

  // Generate division numbers based on input
  const generateDivisions = (count: number): string[] => {
    const divisions = []
    for (let i = 1; i <= count; i++) {
      divisions.push(`Division ${i}`)
    }
    return divisions
  }

  // Handle bulk league creation
  const handleBulkLeagueSubmit = async () => {
    try {
      if (!bulkLeagueForm.organization || !bulkLeagueForm.season) {
        toast({
          title: 'Error',
          description: 'Organization and season are required',
          variant: 'destructive'
        })
        return
      }

      if (bulkLeagueForm.age_groups.length === 0 || bulkLeagueForm.genders.length === 0 || bulkLeagueForm.divisions.length === 0) {
        toast({
          title: 'Error', 
          description: 'Please select at least one option for age groups, genders, and divisions',
          variant: 'destructive'
        })
        return
      }

      setLoading(true)
      const response = await api.createBulkLeagues(bulkLeagueForm)
      
      toast({
        title: 'Success',
        description: response.message
      })
      
      setShowBulkLeagueDialog(false)
      setBulkLeagueForm({
        organization: '',
        age_groups: [],
        genders: [],
        divisions: [],
        season: '',
        level: 'Recreational'
      })
      
      await fetchLeagues()
    } catch (error) {
      console.error('Error creating bulk leagues:', error)
      toast({
        title: 'Error',
        description: 'Failed to create leagues',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle bulk team creation
  const handleBulkTeamSubmit = async () => {
    try {
      if (!bulkTeamForm.league_id || bulkTeamForm.teams.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select a league and add at least one team',
          variant: 'destructive'
        })
        return
      }

      setLoading(true)
      const response = await api.createBulkTeams(bulkTeamForm)
      
      toast({
        title: 'Success',
        description: response.message
      })
      
      setShowBulkTeamDialog(false)
      setBulkTeamForm({
        league_id: '',
        teams: []
      })
      
      if (selectedLeague && selectedLeague.id === bulkTeamForm.league_id) {
        await fetchTeamsForLeague(selectedLeague.id)
      }
    } catch (error) {
      console.error('Error creating bulk teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to create teams',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle team generation
  const handleGenerateTeamsSubmit = async () => {
    try {
      if (!generateTeamsForm.league_id || generateTeamsForm.count < 1) {
        toast({
          title: 'Error',
          description: 'Please select a league and specify team count',
          variant: 'destructive'
        })
        return
      }

      setLoading(true)
      const response = await api.generateTeams(generateTeamsForm)
      
      toast({
        title: 'Success',
        description: response.message
      })
      
      setShowGenerateTeamsDialog(false)
      setGenerateTeamsForm({
        league_id: '',
        count: 8,
        name_pattern: 'Team {number}',
        location_base: '',
        auto_rank: true
      })
      
      if (selectedLeague && selectedLeague.id === generateTeamsForm.league_id) {
        await fetchTeamsForLeague(selectedLeague.id)
      }
    } catch (error) {
      console.error('Error generating teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate teams',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Add team to bulk form
  const addTeamToBulkForm = () => {
    setBulkTeamForm(prev => ({
      ...prev,
      teams: [
        ...prev.teams,
        {
          name: '',
          rank: prev.teams.length + 1,
          location: '',
          contact_email: '',
          contact_phone: ''
        }
      ]
    }))
  }

  // Remove team from bulk form
  const removeTeamFromBulkForm = (index: number) => {
    setBulkTeamForm(prev => ({
      ...prev,
      teams: prev.teams.filter((_, i) => i !== index)
    }))
  }

  // Stats for leagues overview
  const stats = [
    {
      title: 'Active Leagues',
      value: leagues.length,
      icon: Shield,
      color: 'text-blue-600',
      description: 'Currently active leagues'
    },
    {
      title: 'Total Teams',
      value: leagues.reduce((sum, league) => sum + (league.team_count || 0), 0),
      icon: Users,
      color: 'text-emerald-600', 
      description: 'Teams across all leagues'
    },
    {
      title: 'Total Games',
      value: leagues.reduce((sum, league) => sum + (league.game_count || 0), 0),
      icon: Calendar,
      color: 'text-purple-600',
      description: 'Games scheduled or played'
    },
    {
      title: 'Organizations',
      value: new Set(leagues.map(l => l.organization)).size,
      icon: BarChart3,
      color: 'text-orange-600',
      description: 'Different organizations'
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={Shield}
        title="League Management"
        description="Create leagues, organize teams, and manage competitive structures"
      >
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Sparkles className="h-3 w-3 mr-1" />
          Bulk Operations
        </Badge>
        <Button size="lg" className="" onClick={() => setShowBulkLeagueDialog(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Create Leagues
        </Button>
      </PageHeader>

      <Dialog open={showBulkLeagueDialog} onOpenChange={setShowBulkLeagueDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Create Leagues</DialogTitle>
            <DialogDescription>
                  Create multiple leagues at once by selecting combinations of age groups, genders, and divisions
            </DialogDescription>
          </DialogHeader>
              
          <div className="space-y-6">
            {/* Organization and Season */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <Input
                  id="organization"
                  placeholder="e.g., Calgary, Okotoks, Airdrie"
                  value={bulkLeagueForm.organization}
                  onChange={(e) => setBulkLeagueForm(prev => ({ ...prev, organization: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="season">Season *</Label>
                <Input
                  id="season"
                  placeholder="e.g., Winter 2025, Spring 2025"
                  value={bulkLeagueForm.season}
                  onChange={(e) => setBulkLeagueForm(prev => ({ ...prev, season: e.target.value }))}
                />
              </div>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label>Competition Level *</Label>
              <Select 
                value={bulkLeagueForm.level} 
                onValueChange={(value) => setBulkLeagueForm(prev => ({ ...prev, level: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Age Groups */}
            <div className="space-y-3">
              <Label>Age Groups * (Select multiple)</Label>
              <div className="grid grid-cols-4 gap-2">
                {ageGroups.map(age => (
                  <div key={age} className="flex items-center space-x-2">
                    <Checkbox
                      id={`age-${age}`}
                      checked={bulkLeagueForm.age_groups.includes(age)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBulkLeagueForm(prev => ({ 
                            ...prev, 
                            age_groups: [...prev.age_groups, age] 
                          }))
                        } else {
                          setBulkLeagueForm(prev => ({ 
                            ...prev, 
                            age_groups: prev.age_groups.filter(g => g !== age) 
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`age-${age}`} className="text-sm">{age}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Genders */}
            <div className="space-y-3">
              <Label>Genders * (Select multiple)</Label>
              <div className="grid grid-cols-3 gap-2">
                {genders.map(gender => (
                  <div key={gender} className="flex items-center space-x-2">
                    <Checkbox
                      id={`gender-${gender}`}
                      checked={bulkLeagueForm.genders.includes(gender)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBulkLeagueForm(prev => ({ 
                            ...prev, 
                            genders: [...prev.genders, gender] 
                          }))
                        } else {
                          setBulkLeagueForm(prev => ({ 
                            ...prev, 
                            genders: prev.genders.filter(g => g !== gender) 
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`gender-${gender}`} className="text-sm">{gender}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Divisions */}
            <div className="space-y-3">
              <Label>Divisions *</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkLeagueForm(prev => ({ ...prev, divisions: generateDivisions(5) }))}
                  >
                        Divisions 1-5
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkLeagueForm(prev => ({ ...prev, divisions: generateDivisions(10) }))}
                  >
                        Divisions 1-10
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkLeagueForm(prev => ({ ...prev, divisions: generateDivisions(15) }))}
                  >
                        Divisions 1-15
                  </Button>
                </div>
                <Textarea
                  placeholder="Enter divisions, one per line (e.g., Division 1, Premier, Elite)"
                  value={bulkLeagueForm.divisions.join('\n')}
                  onChange={(e) => setBulkLeagueForm(prev => ({ 
                    ...prev, 
                    divisions: e.target.value.split('\n').filter(d => d.trim()) 
                  }))}
                  rows={4}
                />
              </div>
            </div>

            {/* Preview */}
            {bulkLeagueForm.age_groups.length > 0 && bulkLeagueForm.genders.length > 0 && bulkLeagueForm.divisions.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                      Preview ({bulkLeagueForm.age_groups.length * bulkLeagueForm.genders.length * bulkLeagueForm.divisions.length} leagues will be created)
                </Label>
                <div className="max-h-32 overflow-y-auto bg-muted p-3 rounded-md text-sm">
                  {bulkLeagueForm.age_groups.slice(0, 3).map(age =>
                    bulkLeagueForm.genders.slice(0, 2).map(gender =>
                      bulkLeagueForm.divisions.slice(0, 2).map(division => (
                        <div key={`${age}-${gender}-${division}`}>
                          {bulkLeagueForm.organization} {age} {gender} {division} - {bulkLeagueForm.season}
                        </div>
                      ))
                    )
                  )}
                  {(bulkLeagueForm.age_groups.length * bulkLeagueForm.genders.length * bulkLeagueForm.divisions.length) > 12 && (
                    <div className="text-muted-foreground">... and {(bulkLeagueForm.age_groups.length * bulkLeagueForm.genders.length * bulkLeagueForm.divisions.length) - 12} more</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkLeagueDialog(false)}>
                  Cancel
            </Button>
            <Button onClick={handleBulkLeagueSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Leagues'}
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

      {/* Leagues List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Active Leagues
              </CardTitle>
              <CardDescription>
                Manage existing leagues and their teams across all organizations
              </CardDescription>
            </div>
            <Badge variant="secondary">{leagues.length} leagues</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">Loading leagues...</div>
            </div>
          ) : leagues.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No leagues created yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first league
              </p>
              <Button onClick={() => setShowBulkLeagueDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First League
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {leagues.map(league => (
                <Card key={league.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-medium">
                            {league.organization} {league.age_group} {league.gender} {league.division}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Badge variant="outline">{league.level}</Badge>
                            <span>•</span>
                            <span>{league.season}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {league.team_count || 0} teams
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {league.game_count || 0} games
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setGenerateTeamsForm(prev => ({ ...prev, league_id: league.id }))
                                setShowGenerateTeamsDialog(true)
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Generate Teams
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBulkTeamForm(prev => ({ ...prev, league_id: league.id }))
                                setShowBulkTeamDialog(true)
                              }}
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Add Teams
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLeague(league)
                            fetchTeamsForLeague(league.id)
                            setShowLeagueDetailsDialog(true)
                          }}
                        >
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Teams Dialog */}
      <Dialog open={showGenerateTeamsDialog} onOpenChange={setShowGenerateTeamsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Generate Teams
            </DialogTitle>
            <DialogDescription>
              Quickly create multiple teams with smart naming patterns and automatic organization
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Quick Setup Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Quick Setup</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => setGenerateTeamsForm(prev => ({ 
                    ...prev, 
                    count: 8, 
                    name_pattern: 'Team {number}',
                    auto_rank: true 
                  }))}
                >
                  <div className="font-medium">Small League</div>
                  <div className="text-xs text-muted-foreground">8 teams, numbered</div>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => setGenerateTeamsForm(prev => ({ 
                    ...prev, 
                    count: 12, 
                    name_pattern: 'Team {number}',
                    auto_rank: true 
                  }))}
                >
                  <div className="font-medium">Medium League</div>
                  <div className="text-xs text-muted-foreground">12 teams, numbered</div>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => setGenerateTeamsForm(prev => ({ 
                    ...prev, 
                    count: 16, 
                    name_pattern: 'Team {number}',
                    auto_rank: true 
                  }))}
                >
                  <div className="font-medium">Large League</div>
                  <div className="text-xs text-muted-foreground">16 teams, numbered</div>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => setGenerateTeamsForm(prev => ({ 
                    ...prev, 
                    count: 6, 
                    name_pattern: 'Division {number}',
                    auto_rank: true 
                  }))}
                >
                  <div className="font-medium">Tournament</div>
                  <div className="text-xs text-muted-foreground">6 divisions</div>
                </Button>
              </div>
            </div>

            {/* Custom Configuration */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">Custom Configuration</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team-count" className="flex items-center gap-2">
                    <span>Number of Teams</span>
                    <Badge variant="secondary" className="text-xs">{generateTeamsForm.count}</Badge>
                  </Label>
                  <Input
                    id="team-count"
                    type="range"
                    min="2"
                    max="32"
                    value={generateTeamsForm.count}
                    onChange={(e) => setGenerateTeamsForm(prev => ({ 
                      ...prev, 
                      count: parseInt(e.target.value) || 2 
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>2</span>
                    <span>32</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team-count-input">Exact Count</Label>
                  <Input
                    id="team-count-input"
                    type="number"
                    min="2"
                    max="32"
                    value={generateTeamsForm.count}
                    onChange={(e) => setGenerateTeamsForm(prev => ({ 
                      ...prev, 
                      count: parseInt(e.target.value) || 2 
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Naming Patterns */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Team Naming</Label>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Choose a pattern or create your own:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Team {number}',
                    'Squad {number}', 
                    'Division {number}',
                    'Group {number}',
                    'Lions {number}',
                    'Eagles {number}'
                  ].map(pattern => (
                    <Button
                      key={pattern}
                      type="button"
                      variant={generateTeamsForm.name_pattern === pattern ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGenerateTeamsForm(prev => ({ ...prev, name_pattern: pattern }))}
                      className="text-xs justify-start"
                    >
                      {pattern}
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder="Custom pattern: e.g., Wildcats {number}, Blue {number}"
                  value={generateTeamsForm.name_pattern}
                  onChange={(e) => setGenerateTeamsForm(prev => ({ 
                    ...prev, 
                    name_pattern: e.target.value 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{'{number}'}</code> where you want the team number to appear
                </p>
              </div>
            </div>
            
            {/* Additional Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Additional Options</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="location-base" className="text-sm">Base Location</Label>
                  <Input
                    id="location-base"
                    placeholder="e.g., Sports Complex, Downtown Arena"
                    value={generateTeamsForm.location_base}
                    onChange={(e) => setGenerateTeamsForm(prev => ({ 
                      ...prev, 
                      location_base: e.target.value 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Each team will get: "{generateTeamsForm.location_base} - Field {'{number}'}"
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-rank"
                    checked={generateTeamsForm.auto_rank}
                    onCheckedChange={(checked) => setGenerateTeamsForm(prev => ({ 
                      ...prev, 
                      auto_rank: !!checked 
                    }))}
                  />
                  <Label htmlFor="auto-rank" className="text-sm">
                    Auto-assign team rankings (1st, 2nd, 3rd...)
                  </Label>
                </div>
              </div>
            </div>
            
            {/* Enhanced Preview */}
            {generateTeamsForm.count > 0 && generateTeamsForm.name_pattern && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Preview</Label>
                  <Badge variant="outline" className="text-xs">
                    {generateTeamsForm.count} teams will be created
                  </Badge>
                </div>
                <div className="bg-muted p-4 rounded-lg max-h-32 overflow-y-auto">
                  <div className="space-y-2 text-sm">
                    {Array.from({ length: Math.min(5, generateTeamsForm.count) }, (_, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          {generateTeamsForm.auto_rank && (
                            <Badge variant="secondary" className="w-6 h-5 text-xs justify-center">
                              {i + 1}
                            </Badge>
                          )}
                          <span className="font-medium">
                            {generateTeamsForm.name_pattern.replace('{number}', (i + 1).toString())}
                          </span>
                        </div>
                        {generateTeamsForm.location_base && (
                          <span className="text-muted-foreground text-xs">
                            {generateTeamsForm.location_base} - Field {i + 1}
                          </span>
                        )}
                      </div>
                    ))}
                    {generateTeamsForm.count > 5 && (
                      <div className="text-muted-foreground text-xs pt-2 border-t">
                        ... and {generateTeamsForm.count - 5} more teams
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateTeamsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateTeamsSubmit} 
              disabled={loading || generateTeamsForm.count < 2 || !generateTeamsForm.name_pattern}
            >
              {loading ? 'Generating...' : `Generate ${generateTeamsForm.count} Teams`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Teams Dialog */}
      <Dialog open={showBulkTeamDialog} onOpenChange={setShowBulkTeamDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Teams</DialogTitle>
            <DialogDescription>
              Add multiple teams with custom details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Teams ({bulkTeamForm.teams.length})</Label>
              <Button variant="outline" size="sm" onClick={addTeamToBulkForm}>
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bulkTeamForm.teams.map((team, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-6 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Team Name *</Label>
                      <Input
                        placeholder="Team name"
                        value={team.name}
                        onChange={(e) => {
                          const newTeams = [...bulkTeamForm.teams]
                          newTeams[index].name = e.target.value
                          setBulkTeamForm(prev => ({ ...prev, teams: newTeams }))
                        }}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Rank</Label>
                      <Input
                        type="number"
                        min="1"
                        value={team.rank}
                        onChange={(e) => {
                          const newTeams = [...bulkTeamForm.teams]
                          newTeams[index].rank = parseInt(e.target.value) || 1
                          setBulkTeamForm(prev => ({ ...prev, teams: newTeams }))
                        }}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Input
                        placeholder="Home venue"
                        value={team.location}
                        onChange={(e) => {
                          const newTeams = [...bulkTeamForm.teams]
                          newTeams[index].location = e.target.value
                          setBulkTeamForm(prev => ({ ...prev, teams: newTeams }))
                        }}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Contact Email</Label>
                      <Input
                        type="email"
                        placeholder="contact@team.com"
                        value={team.contact_email}
                        onChange={(e) => {
                          const newTeams = [...bulkTeamForm.teams]
                          newTeams[index].contact_email = e.target.value
                          setBulkTeamForm(prev => ({ ...prev, teams: newTeams }))
                        }}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        placeholder="555-0123"
                        value={team.contact_phone}
                        onChange={(e) => {
                          const newTeams = [...bulkTeamForm.teams]
                          newTeams[index].contact_phone = e.target.value
                          setBulkTeamForm(prev => ({ ...prev, teams: newTeams }))
                        }}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTeamFromBulkForm(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {bulkTeamForm.teams.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No teams added yet. Click "Add Team" to get started.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkTeamDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkTeamSubmit} 
              disabled={loading || bulkTeamForm.teams.length === 0}
            >
              {loading ? 'Creating...' : `Create ${bulkTeamForm.teams.length} Teams`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* League Details Dialog */}
      <Dialog open={showLeagueDetailsDialog} onOpenChange={setShowLeagueDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedLeague && `${selectedLeague.organization} ${selectedLeague.age_group} ${selectedLeague.gender} ${selectedLeague.division}`}
            </DialogTitle>
            <DialogDescription>
              League details and team management
            </DialogDescription>
          </DialogHeader>
          
          {selectedLeague && (
            <div className="space-y-6">
              {/* League Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">League Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">ORGANIZATION</Label>
                      <div>{selectedLeague.organization}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">SEASON</Label>
                      <div>{selectedLeague.season}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">AGE GROUP</Label>
                      <div>{selectedLeague.age_group}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">LEVEL</Label>
                      <div>
                        <Badge variant="outline">{selectedLeague.level}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">GENDER</Label>
                      <div>{selectedLeague.gender}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">DIVISION</Label>
                      <div>{selectedLeague.division}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Teams */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Teams ({teams.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGenerateTeamsForm(prev => ({ ...prev, league_id: selectedLeague.id }))
                          setShowGenerateTeamsDialog(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBulkTeamForm(prev => ({ ...prev, league_id: selectedLeague.id }))
                          setShowBulkTeamDialog(true)
                        }}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Add Teams
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {teams.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No teams yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Add teams to get started with this league
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teams.map(team => (
                        <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="w-8 h-6 justify-center">
                              {team.rank}
                            </Badge>
                            <div>
                              <div className="font-medium">{team.name}</div>
                              {team.location && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {team.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {team.game_count || 0} games
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}