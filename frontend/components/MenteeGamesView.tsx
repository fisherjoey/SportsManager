'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, Clock, MapPin, TrendingUp, Award, DollarSign, Eye, BarChart3 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { StatsGrid } from '@/components/ui/stats-grid'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface MenteeGame {
  id: string;
  game_id: string;
  user_id: string;
  position_id?: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  assigned_at: string;
  accepted_at?: string;
  completed_at?: string;
  calculated_wage?: number;
  notes?: string;
  // Game details
  game_date: string;
  game_time: string;
  location: string;
  field?: string;
  level: string;
  game_type: string;
  division: string;
  season: string;
  pay_rate?: number;
  wage_multiplier?: number;
  home_team_name: string;
  home_team_display?: string;
  away_team_name: string;
  away_team_display?: string;
  position_name?: string;
  position_description?: string;
  assigned_by_name?: string;
}

interface MenteeGamesViewProps {
  menteeId: string;
  menteeName: string;
  className?: string;
}

export function MenteeGamesView({ 
  menteeId, 
  menteeName, 
  className = '' 
}: MenteeGamesViewProps) {
  const [games, setGames] = useState<MenteeGame[]>([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const { toast } = useToast()

  // Fetch mentee games and analytics
  useEffect(() => {
    const fetchMenteeData = async () => {
      if (!menteeId) return

      try {
        setLoading(true)
        apiClient.initializeToken()
        
        // Fetch games and analytics in parallel
        const [gamesResponse, analyticsResponse] = await Promise.all([
          apiClient.getMenteeGames(menteeId, {
            limit: 100,
            sort_by: 'game_date',
            sort_order: 'desc'
          }),
          apiClient.getMenteeGameAnalytics(menteeId)
        ])
        
        if (gamesResponse.data) {
          setGames(gamesResponse.data)
        }

        if (analyticsResponse.data?.analytics) {
          setAnalytics(analyticsResponse.data.analytics)
        }
      } catch (error) {
        console.error('Failed to fetch mentee data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load mentee game data. Please try again.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMenteeData()
  }, [menteeId, toast])

  // Calculate stats from games data
  const stats = useMemo(() => {
    const totalGames = games.length
    const completedGames = games.filter(g => g.status === 'completed')
    const upcomingGames = games.filter(g => {
      const gameDate = new Date(g.game_date)
      return gameDate > new Date() && (g.status === 'accepted' || g.status === 'pending')
    })
    const totalEarnings = completedGames.reduce((sum, game) => 
      sum + (parseFloat(game.calculated_wage?.toString() || '0') || 0), 0
    )
    
    return [
      {
        title: 'Total Games',
        value: totalGames,
        icon: Calendar,
        color: 'text-blue-600'
      },
      {
        title: 'Completed',
        value: completedGames.length,
        icon: Award,
        color: 'text-green-600'
      },
      {
        title: 'Upcoming',
        value: upcomingGames.length,
        icon: Clock,
        color: 'text-orange-600'
      },
      {
        title: 'Total Earnings',
        value: `$${totalEarnings.toFixed(2)}`,
        icon: DollarSign,
        color: 'text-purple-600'
      }
    ]
  }, [games])

  // Column definitions for the mentee games table
  const columns: ColumnDef<MenteeGame>[] = [
    {
      id: 'game',
      title: 'Game Details',
      filterType: 'search',
      accessor: (game) => {
        const homeTeam = game.home_team_display || game.home_team_name
        const awayTeam = game.away_team_display || game.away_team_name
        
        return (
          <div>
            <p className="font-medium">
              {homeTeam} vs {awayTeam}
            </p>
            <p className="text-sm text-muted-foreground">{game.division}</p>
            <p className="text-xs text-muted-foreground">{game.season}</p>
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
          <p className="text-sm font-medium">{new Date(game.game_date).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground">{game.game_time}</p>
          {game.field && (
            <p className="text-xs text-muted-foreground">Field: {game.field}</p>
          )}
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
      id: 'position',
      title: 'Position & Level',
      filterType: 'search',
      accessor: (game) => (
        <div>
          <Badge variant={game.level === 'Elite' ? 'default' : 'secondary'}>
            {game.level}
          </Badge>
          {game.position_name && (
            <p className="text-sm text-muted-foreground mt-1">
              {game.position_name}
            </p>
          )}
        </div>
      )
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'completed', label: 'Completed' },
        { value: 'declined', label: 'Declined' }
      ],
      accessor: (game) => (
        <Badge
          variant={
            game.status === 'completed' ? 'default' :
              game.status === 'accepted' ? 'secondary' :
                game.status === 'pending' ? 'outline' : 
                  'destructive'
          }
        >
          {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
        </Badge>
      )
    },
    {
      id: 'wage',
      title: 'Earnings',
      filterType: 'none',
      accessor: (game) => (
        <div>
          {game.calculated_wage ? (
            <p className="font-medium text-green-600">
              ${parseFloat(game.calculated_wage.toString()).toFixed(2)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {game.status === 'completed' ? 'Not calculated' : 'Pending'}
            </p>
          )}
          {game.wage_multiplier && game.wage_multiplier !== 1 && (
            <p className="text-xs text-blue-600">
              {game.wage_multiplier}x multiplier
            </p>
          )}
        </div>
      )
    },
    {
      id: 'assigned_by',
      title: 'Assigned By',
      filterType: 'search',
      accessor: (game) => (
        <div>
          <p className="text-sm">{game.assigned_by_name || 'System'}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(game.assigned_at).toLocaleDateString()}
          </p>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading {menteeName}'s games...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with mentee info and analytics toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{menteeName}'s Games</h3>
          <p className="text-sm text-muted-foreground">
            Track game assignments and performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={showAnalytics ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Analytics Section */}
      {showAnalytics && analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Analytics
            </CardTitle>
            <CardDescription>
              Detailed performance metrics for {menteeName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Summary Stats */}
              <div className="space-y-2">
                <h4 className="font-medium">Summary</h4>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total Games:</span> {analytics.summary.total_games}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total Earnings:</span> ${analytics.summary.total_earnings.toFixed(2)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Average per Game:</span> ${analytics.summary.average_wage.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Level Breakdown */}
              <div className="space-y-2">
                <h4 className="font-medium">By Level</h4>
                <div className="space-y-1">
                  {Object.entries(analytics.level_performance || {}).map(([level, data]: [string, any]) => (
                    <p key={level} className="text-sm">
                      <span className="text-muted-foreground">{level}:</span> {data.games} games
                    </p>
                  ))}
                </div>
              </div>

              {/* Acceptance Rate */}
              <div className="space-y-2">
                <h4 className="font-medium">Assignment Stats</h4>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Acceptance Rate:</span> {analytics.acceptance_rate.rate}%
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Accepted:</span> {analytics.acceptance_rate.accepted}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Declined:</span> {analytics.acceptance_rate.declined}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Games Table */}
      <Card>
        <CardHeader>
          <CardTitle>Game Assignments</CardTitle>
          <CardDescription>
            All game assignments for {menteeName} with detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FilterableTable 
            data={games} 
            columns={columns} 
            emptyMessage={`No game assignments found for ${menteeName}.`}
          />
        </CardContent>
      </Card>
    </div>
  )
}