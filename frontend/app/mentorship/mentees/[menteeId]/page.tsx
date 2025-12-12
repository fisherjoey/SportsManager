'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Target,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Trophy,
  BarChart3
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PageProps {
  params: { menteeId: string }
}

interface MenteeProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth?: string
  profilePhotoUrl?: string
  emergencyContact?: { name?: string; phone?: string }
  address?: { street?: string; city?: string; provinceState?: string; postalZipCode?: string }
  profile?: {
    currentLevel?: string
    developmentGoals: string[]
    strengths: string[]
    areasForImprovement: string[]
  }
  mentor?: {
    id: string
    firstName: string
    lastName: string
    email: string
    specialization?: string
  }
  stats: {
    totalGames: number
    completedGames: number
    upcomingGames: number
    mentorshipDays: number
  }
  createdAt: string
  updatedAt: string
}

interface Game {
  id: string
  gameDate: string
  homeTeam: string
  awayTeam: string
  location?: string
  position?: string
  status: 'pending' | 'accepted' | 'completed' | 'declined'
  wage?: number
  level?: string
}

interface Analytics {
  summary: {
    totalGames: number
    completedGames: number
    acceptanceRate: number
    completionRate: number
  }
  byLevel: Array<{ level: string; games: number; completed: number }>
  byMonth: Array<{ month: string; games: number; completed: number }>
  recentActivity: Array<{ date: string; action: string; details: string }>
}

export default function MenteeDetailPage({ params }: PageProps) {
  const { menteeId } = params
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [profile, setProfile] = useState<MenteeProfile | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Games pagination and filters
  const [gamesPage, setGamesPage] = useState(1)
  const [gamesTotal, setGamesTotal] = useState(0)
  const [gamesLimit] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    // Wait for auth to initialize - don't redirect while loading
    // The middleware already handles redirecting unauthenticated users to login
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          router.push('/login')
        }
      }, 500)
      return () => clearTimeout(timer)
    }
    fetchData()
  }, [menteeId, isAuthenticated])

  useEffect(() => {
    if (activeTab === 'games') {
      fetchGames()
    } else if (activeTab === 'analytics' && !analytics) {
      fetchAnalytics()
    }
  }, [activeTab, gamesPage, statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getMenteeProfile(menteeId)

      if (response.data) {
        setProfile(response.data)
      } else if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching mentee profile:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchGames = async () => {
    try {
      setGamesLoading(true)
      const params: any = {
        page: gamesPage,
        limit: gamesLimit
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter as 'pending' | 'accepted' | 'completed' | 'declined'
      }

      const response = await apiClient.getMenteeGames(menteeId, params)

      if (response.data) {
        setGames(response.data)
        // Assuming the API returns total count in metadata
        if ((response as any).total !== undefined) {
          setGamesTotal((response as any).total)
        }
      } else if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching games:', error)
      toast({
        title: 'Error',
        description: 'Failed to load games',
        variant: 'destructive'
      })
    } finally {
      setGamesLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.getMenteeAnalytics(menteeId)

      if (response.data) {
        setAnalytics(response.data)
      } else if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'accepted':
        return <Clock className="h-4 w-4" />
      case 'declined':
        return <XCircle className="h-4 w-4" />
      case 'pending':
        return <AlertCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      accepted: 'secondary',
      declined: 'destructive',
      pending: 'outline'
    }

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Mentee not found</p>
            <Button onClick={() => router.push('/mentorship')} className="mt-4">
              Back to Mentorship
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/mentorship')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mentee Profile</h1>
          <p className="text-muted-foreground">View and manage mentee details</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.profilePhotoUrl} alt={`${profile.firstName} ${profile.lastName}`} />
                <AvatarFallback className="text-2xl">
                  {profile.firstName[0]}{profile.lastName[0]}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1 flex-1">
                <h2 className="text-2xl font-bold">
                  {profile.firstName} {profile.lastName}
                </h2>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </div>

                  {profile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {profile.phone}
                    </div>
                  )}

                  {profile.address?.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.address.city}, {profile.address.provinceState}
                    </div>
                  )}
                </div>

                {profile.profile?.currentLevel && (
                  <Badge variant="secondary" className="mt-2">
                    Level: {profile.profile.currentLevel}
                  </Badge>
                )}
              </div>
            </div>

            {/* Mentor Info */}
            {profile.mentor && (
              <Card className="md:w-80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned Mentor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {profile.mentor.firstName} {profile.mentor.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{profile.mentor.email}</p>
                    {profile.mentor.specialization && (
                      <Badge variant="outline" className="mt-2">
                        {profile.mentor.specialization}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{profile.stats.totalGames}</div>
                  <p className="text-xs text-muted-foreground">Total Games</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                  <div className="text-2xl font-bold">{profile.stats.completedGames}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{profile.stats.upcomingGames}</div>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{profile.stats.mentorshipDays}</div>
                  <p className="text-xs text-muted-foreground">Mentorship Days</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Profile, Games, Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Games
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p>{formatDate(profile.dateOfBirth)}</p>
                  </div>
                )}

                {profile.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>
                      {profile.address.street && `${profile.address.street}, `}
                      {profile.address.city}, {profile.address.provinceState} {profile.address.postalZipCode}
                    </p>
                  </div>
                )}

                {profile.emergencyContact?.name && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                    <p>{profile.emergencyContact.name}</p>
                    {profile.emergencyContact.phone && (
                      <p className="text-sm text-muted-foreground">{profile.emergencyContact.phone}</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                  <p>{formatDate(profile.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Development Goals */}
            {profile.profile?.developmentGoals && profile.profile.developmentGoals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Development Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {profile.profile.developmentGoals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <span className="text-sm">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Strengths */}
            {profile.profile?.strengths && profile.profile.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.profile.strengths.map((strength, index) => (
                      <Badge key={index} variant="secondary">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Areas for Improvement */}
            {profile.profile?.areasForImprovement && profile.profile.areasForImprovement.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.profile.areasForImprovement.map((area, index) => (
                      <Badge key={index} variant="outline">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Game Assignments</CardTitle>
                  <CardDescription>View all game assignments for this mentee</CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {gamesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : games.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No games found</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Match</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Wage</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {games.map((game) => (
                          <TableRow key={game.id}>
                            <TableCell className="font-medium">
                              {formatDate(game.gameDate)}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {game.homeTeam} vs {game.awayTeam}
                              </div>
                            </TableCell>
                            <TableCell>{game.location || '-'}</TableCell>
                            <TableCell>{game.position || '-'}</TableCell>
                            <TableCell>
                              {game.level && <Badge variant="outline">{game.level}</Badge>}
                            </TableCell>
                            <TableCell>{formatCurrency(game.wage)}</TableCell>
                            <TableCell>{getStatusBadge(game.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {games.map((game) => (
                      <Card key={game.id}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">
                                {game.homeTeam} vs {game.awayTeam}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(game.gameDate)}
                              </p>
                            </div>
                            {getStatusBadge(game.status)}
                          </div>

                          {game.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {game.location}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-sm">
                            {game.position && (
                              <Badge variant="outline">{game.position}</Badge>
                            )}
                            {game.level && (
                              <Badge variant="outline">{game.level}</Badge>
                            )}
                            {game.wage && (
                              <Badge variant="secondary">{formatCurrency(game.wage)}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {gamesTotal > gamesLimit && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGamesPage(p => Math.max(1, p - 1))}
                        disabled={gamesPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {gamesPage} of {Math.ceil(gamesTotal / gamesLimit)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGamesPage(p => p + 1)}
                        disabled={gamesPage >= Math.ceil(gamesTotal / gamesLimit)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {!analytics ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading analytics...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.summary.totalGames}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Completed Games</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.summary.completedGames}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.summary.acceptanceRate}%</div>
                    <Progress value={analytics.summary.acceptanceRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.summary.completionRate}%</div>
                    <Progress value={analytics.summary.completionRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Games by Level */}
                <Card>
                  <CardHeader>
                    <CardTitle>Games by Level</CardTitle>
                    <CardDescription>Breakdown of games by difficulty level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.byLevel.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No data available</p>
                    ) : (
                      <div className="space-y-4">
                        {analytics.byLevel.map((level, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{level.level}</span>
                              <span className="text-muted-foreground">
                                {level.completed}/{level.games} games
                              </span>
                            </div>
                            <Progress
                              value={level.games > 0 ? (level.completed / level.games) * 100 : 0}
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Games by Month */}
                <Card>
                  <CardHeader>
                    <CardTitle>Games by Month</CardTitle>
                    <CardDescription>Last 6 months of activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.byMonth.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No data available</p>
                    ) : (
                      <div className="space-y-4">
                        {analytics.byMonth.map((month, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{month.month}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">
                                {month.games} total
                              </span>
                              <Badge variant="secondary">
                                {month.completed} completed
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest actions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.recentActivity.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.recentActivity.map((activity, index) => (
                        <div key={index} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                          <div className="flex-shrink-0">
                            <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{activity.action}</p>
                            <p className="text-sm text-muted-foreground">{activity.details}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
