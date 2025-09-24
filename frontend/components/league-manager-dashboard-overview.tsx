'use client'

import { useState, useEffect } from 'react'
import { Trophy, Calendar, Users, TrendingUp, Target, Clock, Activity, MapPin, Plus, BarChart3 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner, CardLoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { useAuth } from '@/components/auth-provider'
import { Progress } from '@/components/ui/progress'

interface LeagueStats {
  activeLeagues: number
  activeTournaments: number
  totalGames: number
  upcomingGames: number
  totalTeams: number
  gamesThisWeek: number
  gamesCompleted: number
  completionRate: number
}

interface League {
  id: string
  name: string
  division: string
  season: string
  teamCount: number
  gameCount: number
  status: 'active' | 'upcoming' | 'completed'
  startDate: string
  endDate: string
  progress: number
}

interface UpcomingGame {
  id: string
  homeTeam: any
  awayTeam: any
  date: string
  time: string
  location: any
  division: string
  status: string
}

export function LeagueManagerDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch games
      const gamesResponse = await apiClient.getGames({
        limit: 100,
        status: 'published'
      })
      
      const games = gamesResponse.data || []
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekEnd = new Date(todayStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      // Calculate stats
      const upcomingGamesCount = games.filter((g: any) => new Date(g.date) >= todayStart).length
      const completedGamesCount = games.filter((g: any) => new Date(g.date) < todayStart).length
      const gamesThisWeek = games.filter((g: any) => {
        const gameDate = new Date(g.date)
        return gameDate >= todayStart && gameDate <= weekEnd
      }).length
      
      // Get upcoming games
      const upcoming = games
        .filter((g: any) => new Date(g.date) >= todayStart)
        .slice(0, 5)
        .map((g: any) => ({
          id: g.id,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          date: g.date,
          time: g.time || '00:00',
          location: g.location,
          division: g.division || 'General',
          status: g.status
        }))
      
      // Mock league data
      const mockLeagues: League[] = [
        {
          id: '1',
          name: 'Spring League 2024',
          division: 'U12',
          season: 'Spring 2024',
          teamCount: 12,
          gameCount: 48,
          status: 'active',
          startDate: '2024-03-01',
          endDate: '2024-05-31',
          progress: 65
        },
        {
          id: '2',
          name: 'Summer Tournament',
          division: 'U14',
          season: 'Summer 2024',
          teamCount: 8,
          gameCount: 28,
          status: 'upcoming',
          startDate: '2024-06-01',
          endDate: '2024-07-15',
          progress: 0
        },
        {
          id: '3',
          name: 'Fall Championship',
          division: 'U16',
          season: 'Fall 2024',
          teamCount: 16,
          gameCount: 64,
          status: 'active',
          startDate: '2024-09-01',
          endDate: '2024-11-30',
          progress: 45
        }
      ]
      
      // Calculate unique teams (mock)
      const uniqueTeams = new Set<string>()
      games.forEach((g: any) => {
        if (g.homeTeam?.id) uniqueTeams.add(g.homeTeam.id)
        if (g.awayTeam?.id) uniqueTeams.add(g.awayTeam.id)
      })
      
      setStats({
        activeLeagues: mockLeagues.filter(l => l.status === 'active').length,
        activeTournaments: 2,
        totalGames: games.length,
        upcomingGames: upcomingGamesCount,
        totalTeams: uniqueTeams.size || 24,
        gamesThisWeek,
        gamesCompleted: completedGamesCount,
        completionRate: games.length > 0 ? Math.round((completedGamesCount / games.length) * 100) : 0
      })
      
      setLeagues(mockLeagues)
      setUpcomingGames(upcoming)
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <CardLoadingSpinner count={4} />
      </div>
    )
  }

  const statsItems = [
    {
      title: 'Active Leagues',
      value: stats?.activeLeagues || 0,
      icon: Trophy,
      change: { value: 2, trend: 'positive' as const },
      color: 'primary' as const
    },
    {
      title: 'Total Games',
      value: stats?.totalGames || 0,
      icon: Calendar,
      subtitle: `${stats?.gamesCompleted || 0} completed`
    },
    {
      title: 'Teams',
      value: stats?.totalTeams || 0,
      icon: Users,
      change: { value: 4, trend: 'positive' as const }
    },
    {
      title: 'This Week',
      value: stats?.gamesThisWeek || 0,
      icon: Activity,
      subtitle: 'games scheduled'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name || 'League Manager'}!</h2>
        <p className="text-muted-foreground">
          You have {stats?.activeLeagues || 0} active leagues and {stats?.upcomingGames || 0} upcoming games to manage.
        </p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => window.location.href = '/?view=leagues'}>
            <Plus className="h-4 w-4 mr-2" />
            Create League
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/?view=tournaments'}>
            <Trophy className="h-4 w-4 mr-2" />
            Generate Tournament
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid items={statsItems} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Leagues */}
        <Card>
          <CardHeader>
            <CardTitle>Active Leagues & Tournaments</CardTitle>
            <CardDescription>Currently running competitions</CardDescription>
          </CardHeader>
          <CardContent>
            {leagues.length === 0 ? (
              <EmptyState
                title="No active leagues"
                description="Create a new league to get started"
                icon={Trophy}
              />
            ) : (
              <div className="space-y-4">
                {leagues.map((league) => (
                  <div key={league.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{league.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{league.division}</Badge>
                          <span>{league.teamCount} teams</span>
                          <span>{league.gameCount} games</span>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          league.status === 'active' ? 'success' :
                          league.status === 'upcoming' ? 'default' :
                          'secondary'
                        }
                      >
                        {league.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{league.progress}%</span>
                      </div>
                      <Progress value={league.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Games */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Games</CardTitle>
            <CardDescription>Next scheduled matches</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingGames.length === 0 ? (
              <EmptyState
                title="No upcoming games"
                description="Schedule new games for your leagues"
                icon={Calendar}
              />
            ) : (
              <div className="space-y-3">
                {upcomingGames.map((game) => (
                  <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {formatGameMatchup(game.homeTeam, game.awayTeam)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(game.date).toLocaleDateString()}
                        <Clock className="h-3 w-3 ml-2" />
                        {game.time}
                        <MapPin className="h-3 w-3 ml-2" />
                        {typeof game.location === 'string' ? game.location : game.location?.name}
                      </div>
                    </div>
                    <Badge variant="outline">{game.division}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* League Performance */}
      <Card>
        <CardHeader>
          <CardTitle>League Performance Metrics</CardTitle>
          <CardDescription>Overview of your league management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-success">{stats?.completionRate || 0}%</div>
              <p className="text-sm text-muted-foreground mt-1">Completion Rate</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.gamesCompleted || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Games Completed</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-info">{stats?.upcomingGames || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Upcoming</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.totalTeams || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Active Teams</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => window.location.href = '/?view=analytics-dashboard'}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Detailed Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}