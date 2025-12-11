'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, AlertCircle, Plus, Home, Sparkles, TrendingUp, MapPin, DollarSign, Target, Trophy, Star, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { LoadingSpinner, CardLoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState, NoGamesEmptyState } from '@/components/ui/empty-state'
import { StatusBadge, LevelBadge, GameTypeBadge, AssignmentStatusBadge, CountBadge } from '@/components/ui/specialized-badges'
import { apiClient, type Assignment, type Referee } from '@/lib/api'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { AnnouncementBoard } from '@/components/announcement-board'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'

// Enhanced interfaces with proper typing
interface EnhancedGame {
  id: string
  homeTeam: string | {
    id?: string
    organization: string
    ageGroup: string
    gender: 'Boys' | 'Girls'
    rank: number
    name?: string
    league?: {
      id: string
      organization: string
      division: string
      season: string
    }
  }
  awayTeam: string | {
    id?: string
    organization: string
    ageGroup: string
    gender: 'Boys' | 'Girls'
    rank: number
    name?: string
    league?: {
      id: string
      organization: string
      division: string
      season: string
    }
  }
  date: string
  time?: string
  location: string | {
    name: string
    address?: string
    capacity?: number
    facilities?: string[]
  }
  level: 'Recreational' | 'Competitive' | 'Elite'
  gameType?: 'Community' | 'Club' | 'Tournament' | 'Private Tournament'
  division?: string
  payRate: number
  wageMultiplier?: number
  wageMultiplierReason?: string
  finalWage?: number
  refsNeeded?: number
  status: 'assigned' | 'unassigned' | 'up-for-grabs' | 'completed' | 'cancelled'
  assignments?: Assignment[]
  assignedCount: number
  createdAt: string
  updatedAt: string
}

interface RefereePerformanceMetrics {
  totalAssignments: number
  completedAssignments: number
  completionRate: number
  averageRating?: number
  availabilityStatus: 'available' | 'unavailable'
  upcomingGames: number
  recentAssignments: Assignment[]
  performanceTrends: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
  }
}

interface DashboardData {
  games: EnhancedGame[]
  referees: Referee[]
  refereePerformance?: RefereePerformanceMetrics
  currentUser?: any
}

// Helper functions for data processing
const getTeamName = (team: any) => {
  return formatTeamName(team)
}

const getTeamHierarchy = (team: any) => {
  if (typeof team === 'string') {
    return { display: team, organization: '', league: '', division: '', teamName: team }
  }
  
  const league = team?.league
  return {
    display: formatTeamName(team),
    organization: league?.organization || team?.organization || '',
    league: league ? `${league.organization} ${league.division}` : '',
    division: league?.division || team?.division || '',
    teamName: team?.name || formatTeamName(team),
    season: league?.season || ''
  }
}

const calculateWageDisplay = (payRate: number, multiplier = 1.0, reason?: string) => {
  const finalWage = payRate * multiplier
  const hasMultiplier = multiplier !== 1.0
  
  return {
    display: hasMultiplier ? `$${finalWage.toFixed(2)} (${multiplier}x)` : `$${finalWage.toFixed(2)}`,
    baseWage: payRate,
    multiplier,
    finalWage,
    reason: reason || (hasMultiplier ? `${multiplier}x multiplier applied` : ''),
    isMultiplied: hasMultiplier
  }
}

const getLocationDisplay = (location: string | { name: string; address?: string; capacity?: number; facilities?: string[] }) => {
  if (typeof location === 'string') {
    return { name: location, address: '', capacity: 0, facilities: [] }
  }
  
  return {
    name: location.name,
    address: location.address || '',
    capacity: location.capacity || 0,
    facilities: location.facilities || []
  }
}

const calculateRefereePerformance = (assignments: Assignment[]): RefereePerformanceMetrics => {
  const completed = assignments.filter(a => a.status === 'completed')
  const upcoming = assignments.filter(a => {
    const gameDate = new Date(a.game?.date || '')
    return gameDate > new Date() && a.status === 'accepted'
  })
  
  const thisWeek = assignments.filter(a => {
    const assignmentDate = new Date(a.assignedAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return assignmentDate >= weekAgo
  }).length
  
  const lastWeek = assignments.filter(a => {
    const assignmentDate = new Date(a.assignedAt)
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return assignmentDate >= twoWeeksAgo && assignmentDate < weekAgo
  }).length
  
  return {
    totalAssignments: assignments.length,
    completedAssignments: completed.length,
    completionRate: assignments.length > 0 ? (completed.length / assignments.length) * 100 : 0,
    availabilityStatus: 'available', // This would come from API
    upcomingGames: upcoming.length,
    recentAssignments: assignments.slice(0, 5),
    performanceTrends: {
      thisWeek,
      lastWeek,
      thisMonth: assignments.filter(a => {
        const assignmentDate = new Date(a.assignedAt)
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return assignmentDate >= monthAgo
      }).length,
      lastMonth: 0 // Would need more complex calculation
    }
  }
}

export function DashboardOverview() {
  const { isAuthenticated } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    games: [],
    referees: [],
    refereePerformance: undefined,
    currentUser: undefined
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }
      
      // Ensure apiClient has the current token
      apiClient.initializeToken()
      
      try {
        setLoading(true)
        setError(null)
        
        // Fetch games, referees, and user profile in parallel
        const [gamesResponse, refereesResponse, profileResponse] = await Promise.all([
          apiClient.getGames().catch(err => {
            console.error('Games API error:', err)
            return { data: [] }
          }),
          apiClient.getReferees().catch(err => {
            console.error('Referees API error:', err)
            return { success: true, data: { referees: [] } }
          }),
          apiClient.getProfile().catch(err => {
            console.error('Profile API error:', err)
            return { user: null }
          })
        ])
        
        console.log('Dashboard API responses:', { gamesResponse, refereesResponse, profileResponse })
        
        // Transform games data to enhanced format
        const enhancedGames: EnhancedGame[] = (gamesResponse.data || []).map((game: any) => ({
          ...game,
          payRate: typeof game.payRate === 'string' ? parseFloat(game.payRate) : (game.payRate || 0),
          wageMultiplier: game.wageMultiplier || 1.0,
          finalWage: (typeof game.payRate === 'string' ? parseFloat(game.payRate) : (game.payRate || 0)) * (game.wageMultiplier || 1.0),
          refsNeeded: game.refsNeeded || 2,
          assignedCount: game.assignments?.length || 0,
          gameType: game.gameType || 'Community'
        }))
        
        const referees = refereesResponse.data?.referees || []
        const currentUser = profileResponse.user
        
        // Calculate referee performance if user is a referee
        let refereePerformance: RefereePerformanceMetrics | undefined
        if (currentUser?.referee_id) {
          try {
            const assignmentsResponse = await apiClient.getRefereeAssignments(currentUser.referee_id)
            if (assignmentsResponse.success) {
              refereePerformance = calculateRefereePerformance(assignmentsResponse.data.assignments)
            }
          } catch (err) {
            console.error('Failed to fetch referee performance:', err)
          }
        }
        
        setDashboardData({
          games: enhancedGames,
          referees,
          refereePerformance,
          currentUser
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          icon={Home}
          title="SyncedSport Dashboard"
          description="Overview of games, assignments, and referee activity"
        >
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <Sparkles className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </PageHeader>
        <LoadingSpinner size="lg" text="Loading dashboard data..." centered />
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <PageHeader
          icon={Home}
          title="SyncedSport Dashboard"
          description="Overview of games, assignments, and referee activity"
        />
        <EmptyState
          icon={AlertCircle}
          title="Failed to Load Dashboard"
          description={error}
          action={{
            label: 'Try Again',
            onClick: () => window.location.reload()
          }}
        />
      </PageLayout>
    )
  }

  const { games, referees, refereePerformance, currentUser } = dashboardData

  // Calculate stats
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const upcomingGames = games
    .filter((game) => new Date(game.date) > now && game.status === 'assigned')
    .slice(0, 5)

  const unassignedGames = games.filter((game) => game.status === 'unassigned')
  const upForGrabsGames = games.filter((game) => game.status === 'up-for-grabs')
  const thisWeekGames = games.filter((game) => {
    const gameDate = new Date(game.date)
    return gameDate >= now && gameDate <= weekFromNow
  })

  const stats = [
    {
      title: 'Total Games This Week',
      value: thisWeekGames.length,
      icon: Calendar,
      color: getStatusColorClass('info', 'text'),
      description: 'Games scheduled this week'
    },
    {
      title: 'Unassigned Games',
      value: unassignedGames.length,
      icon: AlertCircle,
      color: getStatusColorClass('error', 'text'),
      description: 'Games needing referees'
    },
    {
      title: 'Up for Grabs',
      value: upForGrabsGames.length,
      icon: Clock,
      color: getStatusColorClass('warning', 'text'),
      description: 'Available for pickup'
    },
    {
      title: 'Active Referees',
      value: referees.filter(r => r.isAvailable).length,
      icon: Users,
      color: getStatusColorClass('success', 'text'),
      description: 'Available for assignment'
    }
  ]

  // Render referee performance card if user is a referee
  const renderRefereePerformanceCard = () => {
    if (!refereePerformance) return null
    
    const trends = refereePerformance.performanceTrends
    const trendChange = trends.thisWeek - trends.lastWeek
    const isPositiveTrend = trendChange >= 0
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className={cn("h-5 w-5 mr-2", getStatusColorClass('info', 'text'))} />
            Your Performance
          </CardTitle>
          <CardDescription>Your assignment history and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Performance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={cn("text-2xl font-bold", getStatusColorClass('info', 'text'))}>{refereePerformance.totalAssignments}</div>
                <div className="text-xs text-muted-foreground">Total Assignments</div>
              </div>
              <div className="text-center">
                <div className={cn("text-2xl font-bold", getStatusColorClass('success', 'text'))}>{refereePerformance.completionRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className={cn("text-2xl font-bold", getStatusColorClass('warning', 'text'))}>{refereePerformance.upcomingGames}</div>
                <div className="text-xs text-muted-foreground">Upcoming Games</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <StatusBadge 
                    status={refereePerformance.availabilityStatus === 'available' ? 'available' : 'unavailable'} 
                    showIcon 
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">Availability</div>
              </div>
            </div>
            
            {/* Performance Trend */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className={cn("h-4 w-4 mr-2", isPositiveTrend ? getStatusColorClass('success', 'text') : getStatusColorClass('error', 'text'))} />
                <span className="text-sm font-medium">Weekly Trend</span>
              </div>
              <div className="text-right">
                <span className={cn("text-sm font-medium", isPositiveTrend ? getStatusColorClass('success', 'text') : getStatusColorClass('error', 'text'))}>
                  {isPositiveTrend ? '+' : ''}{trendChange} assignments
                </span>
                <div className="text-xs text-muted-foreground">vs last week</div>
              </div>
            </div>
            
            {/* Recent Assignments */}
            {refereePerformance.recentAssignments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Assignments</h4>
                <div className="space-y-2">
                  {refereePerformance.recentAssignments.slice(0, 3).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between text-sm p-2 border rounded">
                      <span>{assignment.game ? formatGameMatchup(assignment.game.homeTeam, assignment.game.awayTeam) : 'Game Details N/A'}</span>
                      <StatusBadge status={assignment.status as any} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        icon={Home}
        title="SyncedSport Dashboard"
        description="Overview of games, assignments, and referee activity"
      >
        <Badge variant="outline" className={cn(getStatusColorClass('info', 'text'), getStatusColorClass('info', 'border'))}>
          <Sparkles className="h-3 w-3 mr-1" />
          Live Data
        </Badge>
        <Button size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Game
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Referee Performance Card (if applicable) */}
        {refereePerformance && (
          <div className="lg:col-span-1">
            {renderRefereePerformanceCard()}
          </div>
        )}
        
        {/* Upcoming Games Card */}
        <Card className={refereePerformance ? 'lg:col-span-1' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className={cn("h-5 w-5 mr-2", getStatusColorClass('success', 'text'))} />
              Upcoming Games
            </CardTitle>
            <CardDescription>Next {upcomingGames.length} scheduled games with assigned referees</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingGames.length === 0 ? (
              <NoGamesEmptyState />
            ) : (
              <div className="space-y-4">
                {upcomingGames.map((game) => {
                  const homeTeam = getTeamHierarchy(game.homeTeam)
                  const awayTeam = getTeamHierarchy(game.awayTeam)
                  const location = getLocationDisplay(game.location)
                  const wage = calculateWageDisplay(game.payRate, game.wageMultiplier, game.wageMultiplierReason)
                  
                  return (
                    <div key={game.id} className="p-4 border rounded-lg space-y-3">
                      {/* Game Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-lg">
                            {homeTeam.display} vs {awayTeam.display}
                          </p>
                          {homeTeam.organization && (
                            <div className="text-sm text-muted-foreground">
                              <span>{homeTeam.organization}</span>
                              {homeTeam.division && <span> • {homeTeam.division}</span>}
                              {homeTeam.season && <span> • {homeTeam.season}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <LevelBadge level={game.level} />
                          {game.gameType && <GameTypeBadge type={game.gameType} />}
                        </div>
                      </div>
                      
                      {/* Game Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{new Date(game.date).toLocaleDateString()} at {game.time}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{location.name}</span>
                          {location.capacity > 0 && (
                            <CountBadge count={location.capacity} label="capacity" className="ml-2" />
                          )}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{wage.display}</span>
                          {wage.isMultiplied && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {wage.reason}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Assignment Status */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <AssignmentStatusBadge 
                          assignedCount={game.assignedCount} 
                          requiredCount={game.refsNeeded || 2} 
                        />
                        {location.facilities && location.facilities.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Facilities: {location.facilities.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention Card */}
        <Card className={refereePerformance ? 'lg:col-span-1' : 'lg:col-span-1'}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className={cn("h-5 w-5 mr-2", getStatusColorClass('error', 'text'))} />
              Needs Attention
            </CardTitle>
            <CardDescription>Games requiring immediate referee assignment</CardDescription>
          </CardHeader>
          <CardContent>
            {unassignedGames.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="All Games Assigned"
                description="Great job! All games have referees assigned."
                size="sm"
              />
            ) : (
              <div className="space-y-4">
                {unassignedGames.slice(0, 5).map((game) => {
                  const homeTeam = getTeamHierarchy(game.homeTeam)
                  const awayTeam = getTeamHierarchy(game.awayTeam)
                  const wage = calculateWageDisplay(game.payRate, game.wageMultiplier)
                  
                  return (
                    <div key={game.id} className="p-3 border rounded-lg border-red-200 bg-red-50/50 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {homeTeam.display} vs {awayTeam.display}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(game.date).toLocaleDateString()} at {game.time}
                          </p>
                          <p className="text-sm text-muted-foreground">{typeof game.location === 'string' ? game.location : game.location.name}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <StatusBadge status="unassigned" showIcon />
                          <div className="text-sm font-medium">{wage.display}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <CountBadge 
                          count={0} 
                          total={game.refsNeeded || 2} 
                          label="refs" 
                          variant="destructive" 
                        />
                        <Button size="sm" className={cn(getStatusColorClass('success', 'bg'), getStatusColorClass('success', 'hover'))}>
                          <Plus className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {unassignedGames.length > 5 && (
                  <div className="text-center">
                    <Button variant="outline" size="sm">
                      View All {unassignedGames.length} Unassigned Games
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements Section */}
      <div className="mt-8">
        <AnnouncementBoard />
      </div>
    </PageLayout>
  )
}
