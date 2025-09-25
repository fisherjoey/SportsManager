'use client'

import { useState, useEffect } from 'react'
import { Calendar, Trophy, Book, Clock, MapPin, Users, Eye } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner, CardLoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { useAuth } from '@/components/auth-provider'

interface ViewerStats {
  totalGames: number
  upcomingGames: number
  completedGames: number
  totalTeams: number
  availableResources: number
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

interface TeamStanding {
  id: string
  name: string
  wins: number
  losses: number
  draws: number
  points: number
  position: number
}

export function ViewerDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ViewerStats | null>(null)
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([])
  const [standings, setStandings] = useState<TeamStanding[]>([])

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
      
      // Calculate stats
      const upcomingGamesCount = games.filter((g: any) => new Date(g.date) >= todayStart).length
      const completedGamesCount = games.filter((g: any) => new Date(g.date) < todayStart).length
      
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
      
      // Mock standings data
      const mockStandings: TeamStanding[] = [
        { id: '1', name: 'Thunder FC', wins: 12, losses: 3, draws: 2, points: 38, position: 1 },
        { id: '2', name: 'Lightning United', wins: 11, losses: 4, draws: 2, points: 35, position: 2 },
        { id: '3', name: 'Storm City', wins: 10, losses: 5, draws: 2, points: 32, position: 3 },
        { id: '4', name: 'Rapids SC', wins: 9, losses: 6, draws: 2, points: 29, position: 4 },
        { id: '5', name: 'Phoenix Rising', wins: 8, losses: 7, draws: 2, points: 26, position: 5 }
      ]
      
      // Calculate unique teams
      const uniqueTeams = new Set<string>()
      games.forEach((g: any) => {
        if (g.homeTeam?.id) uniqueTeams.add(g.homeTeam.id)
        if (g.awayTeam?.id) uniqueTeams.add(g.awayTeam.id)
      })
      
      setStats({
        totalGames: games.length,
        upcomingGames: upcomingGamesCount,
        completedGames: completedGamesCount,
        totalTeams: uniqueTeams.size || 24,
        availableResources: 15
      })
      
      setUpcomingGames(upcoming)
      setStandings(mockStandings)
      
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
      title: 'Total Games',
      value: stats?.totalGames || 0,
      icon: Calendar,
      subtitle: 'This season'
    },
    {
      title: 'Upcoming',
      value: stats?.upcomingGames || 0,
      icon: Clock,
      color: 'primary' as const
    },
    {
      title: 'Teams',
      value: stats?.totalTeams || 0,
      icon: Users
    },
    {
      title: 'Resources',
      value: stats?.availableResources || 0,
      icon: Book,
      subtitle: 'Available to view'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name || 'Viewer'}!</h2>
        <p className="text-muted-foreground">
          Stay updated with the latest games, standings, and resources.
        </p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => window.location.href = '/?view=games'}>
            <Eye className="h-4 w-4 mr-2" />
            View Games
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/?view=resources'}>
            <Book className="h-4 w-4 mr-2" />
            Browse Resources
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid items={statsItems} />

      <div className="grid gap-6 md:grid-cols-2">
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
                description="Check back later for new games"
                icon={Calendar}
              />
            ) : (
              <div className="space-y-3">
                {upcomingGames.map((game) => (
                  <div key={game.id} className="p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {formatGameMatchup(game.homeTeam, game.awayTeam)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(game.date).toLocaleDateString()}
                        <Clock className="h-3 w-3 ml-2" />
                        {game.time}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {typeof game.location === 'string' ? game.location : game.location?.name}
                      </div>
                    </div>
                    <Badge variant="outline" className="mt-2">{game.division}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* League Standings */}
        <Card>
          <CardHeader>
            <CardTitle>League Standings</CardTitle>
            <CardDescription>Current team rankings</CardDescription>
          </CardHeader>
          <CardContent>
            {standings.length === 0 ? (
              <EmptyState
                title="No standings available"
                description="Standings will appear once games begin"
                icon={Trophy}
              />
            ) : (
              <div className="space-y-2">
                {standings.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center font-bold text-sm">
                        {team.position}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          W: {team.wins} L: {team.losses} D: {team.draws}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{team.points}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Information</CardTitle>
          <CardDescription>Important details and resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Season Schedule</h4>
              <p className="text-sm text-muted-foreground">
                View the complete season schedule in the games section
              </p>
              <Button variant="link" className="px-0 mt-2" onClick={() => window.location.href = '/?view=games'}>
                View Schedule →
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Calendar View</h4>
              <p className="text-sm text-muted-foreground">
                See all games in a monthly calendar format
              </p>
              <Button variant="link" className="px-0 mt-2" onClick={() => window.location.href = '/?view=calendar'}>
                Open Calendar →
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Resources</h4>
              <p className="text-sm text-muted-foreground">
                Access rules, guides, and other documents
              </p>
              <Button variant="link" className="px-0 mt-2" onClick={() => window.location.href = '/?view=resources'}>
                Browse Resources →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}