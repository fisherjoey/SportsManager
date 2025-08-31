'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, AlertCircle, Target, TrendingUp, Clock, CheckCircle, XCircle, UserPlus, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner, CardLoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { useAuth } from '@/components/auth-provider'

interface AssignorStats {
  unassignedGames: number
  partiallyAssignedGames: number
  fullyAssignedGames: number
  availableReferees: number
  totalReferees: number
  assignmentsToday: number
  assignmentsThisWeek: number
  pendingApprovals: number
}

interface RecentAssignment {
  id: string
  gameId: string
  refereeId: string
  refereeName: string
  gameName: string
  gameDate: string
  assignedAt: string
  status: 'pending' | 'accepted' | 'declined' | 'completed'
}

interface UpcomingGame {
  id: string
  homeTeam: any
  awayTeam: any
  date: string
  time: string
  location: any
  refsNeeded: number
  assignedCount: number
  status: 'unassigned' | 'partial' | 'assigned'
}

export function AssignorDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AssignorStats | null>(null)
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([])
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
      const unassigned = games.filter((g: any) => g.assignedCount === 0).length
      const partial = games.filter((g: any) => g.assignedCount > 0 && g.assignedCount < (g.refsNeeded || 2)).length
      const full = games.filter((g: any) => g.assignedCount >= (g.refsNeeded || 2)).length
      
      // Get upcoming games needing assignments
      const upcoming = games
        .filter((g: any) => {
          const gameDate = new Date(g.date)
          return gameDate >= todayStart && gameDate <= weekEnd && g.assignedCount < (g.refsNeeded || 2)
        })
        .slice(0, 5)
        .map((g: any) => ({
          id: g.id,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          date: g.date,
          time: g.time || '00:00',
          location: g.location,
          refsNeeded: g.refsNeeded || 2,
          assignedCount: g.assignedCount || 0,
          status: g.assignedCount === 0 ? 'unassigned' : 
                  g.assignedCount < (g.refsNeeded || 2) ? 'partial' : 'assigned'
        }))
      
      // Fetch referees
      const refereesResponse = await apiClient.getReferees()
      const referees = refereesResponse.data || []
      const availableRefs = referees.filter((r: any) => r.status === 'active').length
      
      // Calculate assignments count (mock data for now)
      const assignmentsToday = games.filter((g: any) => {
        const gameDate = new Date(g.date)
        return gameDate.toDateString() === todayStart.toDateString() && g.assignedCount > 0
      }).reduce((sum: number, g: any) => sum + g.assignedCount, 0)
      
      const assignmentsThisWeek = games.filter((g: any) => {
        const gameDate = new Date(g.date)
        return gameDate >= todayStart && gameDate <= weekEnd && g.assignedCount > 0
      }).reduce((sum: number, g: any) => sum + g.assignedCount, 0)
      
      // Mock recent assignments
      const mockRecentAssignments: RecentAssignment[] = games
        .filter((g: any) => g.assignedCount > 0)
        .slice(0, 5)
        .map((g: any) => ({
          id: `assignment-${g.id}`,
          gameId: g.id,
          refereeId: 'ref-1',
          refereeName: 'John Smith',
          gameName: formatGameMatchup(g.homeTeam, g.awayTeam),
          gameDate: g.date,
          assignedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'accepted' as const
        }))
      
      setStats({
        unassignedGames: unassigned,
        partiallyAssignedGames: partial,
        fullyAssignedGames: full,
        availableReferees: availableRefs,
        totalReferees: referees.length,
        assignmentsToday,
        assignmentsThisWeek,
        pendingApprovals: 0
      })
      
      setUpcomingGames(upcoming)
      setRecentAssignments(mockRecentAssignments)
      
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
      title: 'Unassigned Games',
      value: stats?.unassignedGames || 0,
      icon: AlertCircle,
      change: { value: -5, trend: 'positive' as const },
      color: 'destructive' as const
    },
    {
      title: 'Partial Assignments',
      value: stats?.partiallyAssignedGames || 0,
      icon: Clock,
      change: { value: 3, trend: 'neutral' as const },
      color: 'warning' as const
    },
    {
      title: 'Available Referees',
      value: `${stats?.availableReferees || 0}/${stats?.totalReferees || 0}`,
      icon: Users,
      color: 'success' as const
    },
    {
      title: 'This Week',
      value: stats?.assignmentsThisWeek || 0,
      icon: Target,
      change: { value: 12, trend: 'positive' as const }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name || 'Assignor'}!</h2>
        <p className="text-muted-foreground">
          You have {stats?.unassignedGames || 0} games requiring assignments and {stats?.pendingApprovals || 0} pending approvals.
        </p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => window.location.href = '/?view=assigning'}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Games
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/?view=ai-assignments'}>
            <Activity className="h-4 w-4 mr-2" />
            AI Assignments
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid items={statsItems} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Games Needing Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Games Needing Assignments</CardTitle>
            <CardDescription>Upcoming games requiring referee assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingGames.length === 0 ? (
              <EmptyState
                title="All games assigned"
                description="No upcoming games need assignments"
                icon={CheckCircle}
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={game.status === 'unassigned' ? 'destructive' : 'warning'}>
                        {game.assignedCount}/{game.refsNeeded} refs
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => window.location.href = `/?view=assigning&game=${game.id}`}>
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Latest referee assignments made</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAssignments.length === 0 ? (
              <EmptyState
                title="No recent assignments"
                description="Start assigning referees to games"
                icon={Users}
              />
            ) : (
              <div className="space-y-3">
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{assignment.refereeName}</p>
                      <p className="text-xs text-muted-foreground">{assignment.gameName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(assignment.gameDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        assignment.status === 'accepted' ? 'success' :
                        assignment.status === 'declined' ? 'destructive' :
                        assignment.status === 'completed' ? 'secondary' :
                        'default'
                      }
                    >
                      {assignment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Performance</CardTitle>
          <CardDescription>Key metrics for your assignment efficiency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-success">{stats?.fullyAssignedGames || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Fully Assigned</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-warning">{stats?.partiallyAssignedGames || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Partial</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-destructive">{stats?.unassignedGames || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Unassigned</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.assignmentsToday || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}