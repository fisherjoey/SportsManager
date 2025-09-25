'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, AlertCircle, Target, TrendingUp, Clock, CheckCircle, XCircle, UserPlus, Activity, Zap, Award, MapPin } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner, CardLoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { useAuth } from '@/components/auth-provider'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface RefereeAvailability {
  id: string
  name: string
  isAvailable: boolean
  nextAvailable?: string
  gamesThisWeek: number
  preferredLocations?: string[]
}

export function AssignorDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AssignorStats | null>(null)
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([])
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([])
  const [refereeAvailability, setRefereeAvailability] = useState<RefereeAvailability[]>([])

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
      const referees = refereesResponse.data?.referees || refereesResponse || []
      console.log('Referees in assignor dashboard:', referees)
      const availableRefs = referees.filter((r: any) => r.isAvailable).length

      // Mock referee availability data
      const mockAvailability: RefereeAvailability[] = referees.slice(0, 5).map((r: any) => ({
        id: r.id,
        name: r.name,
        isAvailable: r.isAvailable,
        nextAvailable: r.isAvailable ? undefined : new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        gamesThisWeek: Math.floor(Math.random() * 5),
        preferredLocations: ['Field A', 'Field B']
      }))
      
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
      setRefereeAvailability(mockAvailability)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          title="Assignor Dashboard"
          description="Manage game assignments and referee availability"
        />
        <LoadingSpinner size="lg" text="Loading dashboard data..." centered />
      </PageLayout>
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
    <PageLayout>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Assignor'}`}
        description={`You have ${stats?.unassignedGames || 0} games requiring assignments and ${stats?.pendingApprovals || 0} pending approvals`}
      >
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/?view=assigning'}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Games
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/?view=ai-assignments'}>
            <Zap className="h-4 w-4 mr-2" />
            AI Assignments
          </Button>
        </div>
      </PageHeader>

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

      {/* Referee Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Referee Availability
          </CardTitle>
          <CardDescription>Current referee status and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {refereeAvailability.map((referee) => (
              <div key={referee.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${referee.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="font-medium">{referee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {referee.gamesThisWeek} games this week
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!referee.isAvailable && referee.nextAvailable && (
                    <Badge variant="outline">
                      Available {new Date(referee.nextAvailable).toLocaleDateString()}
                    </Badge>
                  )}
                  {referee.isAvailable && (
                    <Badge variant="success">Available</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Performance Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Analytics</CardTitle>
          <CardDescription>Detailed assignment metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="coverage">Coverage</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.fullyAssignedGames || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Fully Assigned</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats?.partiallyAssignedGames || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Partial</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats?.unassignedGames || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Unassigned</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{stats?.assignmentsToday || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Today</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="coverage" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Game Coverage Rate</span>
                    <span className="text-sm font-bold">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Referee Utilization</span>
                    <span className="text-sm font-bold">72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Assignment Acceptance Rate</span>
                    <span className="text-sm font-bold">91%</span>
                  </div>
                  <Progress value={91} className="h-2" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="efficiency" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Award className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <div className="text-2xl font-bold">24 hrs</div>
                  <p className="text-sm text-muted-foreground">Avg Assignment Time</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold">+15%</div>
                  <p className="text-sm text-muted-foreground">Efficiency Improvement</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageLayout>
  )
}