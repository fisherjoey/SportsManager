'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, DollarSign, MapPin, CheckCircle, CalendarClock, Trophy, TrendingUp, Award, Star, Target, AlertCircle, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'

interface RefereeStats {
  upcomingGames: number
  completedGames: number
  totalEarnings: number
  thisWeekEarnings: number
  thisMonthEarnings: number
  acceptanceRate: number
  availableGames: number
  performanceRating: number
}

interface Assignment {
  id: string
  gameId: string
  game: {
    id: string
    homeTeam: any
    awayTeam: any
    date: string
    time: string
    location: any
    payRate: number
    level: string
  }
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  assignedAt: string
}

interface PerformanceMetrics {
  gamesThisWeek: number
  gamesThisMonth: number
  averageRating: number
  onTimePercentage: number
  completionRate: number
}

export function RefereeDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RefereeStats | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [availableGames, setAvailableGames] = useState<any[]>([])
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch games and assignments
      const [gamesResponse] = await Promise.all([
        apiClient.getGames({ limit: 100 }).catch(() => ({ data: [] }))
      ])

      const games = gamesResponse.data || []
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Mock assignments for the current referee
      const mockAssignments: Assignment[] = games
        .filter((g: any) => new Date(g.date) > now)
        .slice(0, 5)
        .map((g: any) => ({
          id: `assignment-${g.id}`,
          gameId: g.id,
          game: {
            id: g.id,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            date: g.date,
            time: g.time || '00:00',
            location: g.location,
            payRate: typeof g.payRate === 'string' ? parseFloat(g.payRate) : (g.payRate || 45),
            level: g.level || 'Recreational'
          },
          status: Math.random() > 0.3 ? 'accepted' : 'pending' as const,
          assignedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        }))

      // Calculate available games
      const available = games.filter((g: any) =>
        g.status === 'up-for-grabs' || g.assignedCount < (g.refsNeeded || 2)
      ).slice(0, 5)

      // Calculate earnings
      const acceptedAssignments = mockAssignments.filter(a => a.status === 'accepted')
      const thisWeekGames = acceptedAssignments.filter(a => {
        const gameDate = new Date(a.game.date)
        return gameDate >= now && gameDate <= weekFromNow
      })
      const thisMonthGames = acceptedAssignments.filter(a => {
        const gameDate = new Date(a.game.date)
        return gameDate >= now && gameDate <= monthFromNow
      })

      const thisWeekEarnings = thisWeekGames.reduce((sum, a) => sum + a.game.payRate, 0)
      const thisMonthEarnings = thisMonthGames.reduce((sum, a) => sum + a.game.payRate, 0)

      // Mock performance metrics
      const mockPerformance: PerformanceMetrics = {
        gamesThisWeek: thisWeekGames.length,
        gamesThisMonth: thisMonthGames.length,
        averageRating: 4.7,
        onTimePercentage: 98,
        completionRate: 95
      }

      // Set stats
      setStats({
        upcomingGames: acceptedAssignments.length,
        completedGames: Math.floor(Math.random() * 50) + 20,
        totalEarnings: Math.floor(Math.random() * 5000) + 2000,
        thisWeekEarnings,
        thisMonthEarnings,
        acceptanceRate: 85,
        availableGames: available.length,
        performanceRating: 4.7
      })

      setAssignments(mockAssignments)
      setAvailableGames(available)
      setPerformance(mockPerformance)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptGame = (gameId: string) => {
    console.log('Accepting game:', gameId)
    // Would trigger API call to accept the game
  }

  const handleDeclineAssignment = (assignmentId: string) => {
    console.log('Declining assignment:', assignmentId)
    // Would trigger API call to decline the assignment
  }

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          title="Referee Dashboard"
          description="Your assignments and performance overview"
        />
        <LoadingSpinner size="lg" text="Loading dashboard data..." centered />
      </PageLayout>
    )
  }

  const statsItems = [
    {
      title: 'Upcoming Games',
      value: stats?.upcomingGames || 0,
      icon: Calendar,
      description: 'Assigned to you',
      color: 'primary' as const
    },
    {
      title: 'This Week',
      value: `$${stats?.thisWeekEarnings || 0}`,
      icon: DollarSign,
      description: `${performance?.gamesThisWeek || 0} games`,
      color: 'success' as const
    },
    {
      title: 'Available Games',
      value: stats?.availableGames || 0,
      icon: Clock,
      description: 'Ready to accept',
      color: 'warning' as const
    },
    {
      title: 'Performance',
      value: `${stats?.performanceRating || 0}★`,
      icon: Star,
      description: `${stats?.acceptanceRate || 0}% acceptance`,
      color: 'info' as const
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Referee'}`}
        description="Manage your assignments and track your performance"
      >
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/?view=available'}>
            <Trophy className="h-4 w-4 mr-2" />
            Find Games
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/?view=availability'}>
            <CalendarClock className="h-4 w-4 mr-2" />
            My Availability
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <StatsGrid items={statsItems} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>My Upcoming Assignments</CardTitle>
            <CardDescription>Your next scheduled games</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.filter(a => a.status === 'accepted').length === 0 ? (
              <EmptyState
                title="No upcoming assignments"
                description="Accept available games to build your schedule"
                icon={Calendar}
              />
            ) : (
              <div className="space-y-3">
                {assignments
                  .filter(a => a.status === 'accepted')
                  .slice(0, 5)
                  .map((assignment) => (
                    <div key={assignment.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {formatGameMatchup(assignment.game.homeTeam, assignment.game.awayTeam)}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(assignment.game.date).toLocaleDateString()}
                            <Clock className="h-3 w-3 ml-1" />
                            {assignment.game.time}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {typeof assignment.game.location === 'string'
                              ? assignment.game.location
                              : assignment.game.location.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{assignment.game.level}</Badge>
                          <p className="text-sm font-bold mt-1">${assignment.game.payRate}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Games */}
        <Card>
          <CardHeader>
            <CardTitle>Available Games</CardTitle>
            <CardDescription>Games you can accept</CardDescription>
          </CardHeader>
          <CardContent>
            {availableGames.length === 0 ? (
              <EmptyState
                title="No available games"
                description="Check back later for new opportunities"
                icon={Clock}
              />
            ) : (
              <div className="space-y-3">
                {availableGames.slice(0, 4).map((game) => (
                  <div key={game.id} className="p-3 border rounded-lg border-green-200 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {formatGameMatchup(game.homeTeam, game.awayTeam)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(game.date).toLocaleDateString()}
                          <Clock className="h-3 w-3 ml-1" />
                          {game.time || '00:00'}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          ${game.payRate || 45}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAcceptGame(game.id)}
                    >
                      Accept Game
                    </Button>
                  </div>
                ))}
                {availableGames.length > 4 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = '/?view=available'}
                  >
                    View All Available Games
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Assignments */}
      {assignments.filter(a => a.status === 'pending').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
              Pending Assignments
            </CardTitle>
            <CardDescription>Assignments awaiting your response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments
                .filter(a => a.status === 'pending')
                .map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg border-orange-200">
                    <div>
                      <p className="font-medium">
                        {formatGameMatchup(assignment.game.homeTeam, assignment.game.awayTeam)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(assignment.game.date).toLocaleDateString()} at {assignment.game.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">${assignment.game.payRate}</Badge>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptGame(assignment.gameId)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineAssignment(assignment.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Your refereeing statistics and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="earnings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>
            <TabsContent value="earnings" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold">${stats?.thisWeekEarnings || 0}</div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">${stats?.thisMonthEarnings || 0}</div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">${stats?.totalEarnings || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">$45</div>
                  <p className="text-sm text-muted-foreground">Avg Rate</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="performance" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm font-bold">{performance?.completionRate || 0}%</span>
                  </div>
                  <Progress value={performance?.completionRate || 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">On-Time Arrival</span>
                    <span className="text-sm font-bold">{performance?.onTimePercentage || 0}%</span>
                  </div>
                  <Progress value={performance?.onTimePercentage || 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Acceptance Rate</span>
                    <span className="text-sm font-bold">{stats?.acceptanceRate || 0}%</span>
                  </div>
                  <Progress value={stats?.acceptanceRate || 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Rating</span>
                    <span className="text-sm font-bold">{performance?.averageRating || 0} ★</span>
                  </div>
                  <Progress value={(performance?.averageRating || 0) * 20} className="h-2" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="achievements" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Trophy className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <div className="text-lg font-bold">100+ Games</div>
                  <p className="text-sm text-muted-foreground">Veteran Referee</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Award className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-lg font-bold">Top Rated</div>
                  <p className="text-sm text-muted-foreground">4.5+ Stars</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="text-lg font-bold">Reliable</div>
                  <p className="text-sm text-muted-foreground">95% Completion</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <div className="text-lg font-bold">Rising Star</div>
                  <p className="text-sm text-muted-foreground">Improving Metrics</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageLayout>
  )
}