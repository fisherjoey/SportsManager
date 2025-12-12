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
import { useToast } from '@/components/ui/use-toast'
import { Users, Calendar, TrendingUp, Clock, AlertCircle, CheckCircle, Eye } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface MenteeData {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePhotoUrl?: string
  currentLevel?: string
  assignmentStatus: string
  startDate: string
  endDate?: string
  stats: {
    totalGames: number
    completedGames: number
    upcomingGames: number
  }
}

interface MenteeProfileData {
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

export default function MentorshipPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [mentees, setMentees] = useState<MenteeData[]>([])
  const [menteeProfile, setMenteeProfile] = useState<MenteeProfileData | null>(null)
  const [isMentor, setIsMentor] = useState(false)

  useEffect(() => {
    // Wait for auth to initialize - don't redirect while loading
    // The auth provider sets isAuthenticated=false initially while checking cookies
    // We need to wait until we know for sure the user is not authenticated
    if (user === null && !isAuthenticated) {
      // If we have no user and not authenticated, wait a moment for auth to initialize
      // The middleware already handles redirecting unauthenticated users to login
      // So if we reach this page, we should be authenticated
      const timer = setTimeout(() => {
        // After waiting, if still not authenticated, redirect
        if (!isAuthenticated) {
          router.push('/login')
        }
      }, 500)
      return () => clearTimeout(timer)
    }

    if (user) {
      // Check if user is a mentor or mentee
      const roles = user.roles || []
      const mentorRole = roles.some(role =>
        typeof role === 'string'
          ? role.toLowerCase().includes('mentor')
          : false
      )

      setIsMentor(mentorRole)
      fetchData(mentorRole)
    }
  }, [user, isAuthenticated, router])

  const fetchData = async (isMentorRole: boolean) => {
    try {
      setLoading(true)

      if (isMentorRole) {
        // Fetch mentor's mentees using the /me endpoint (looks up mentor by user_id)
        const response = await apiClient.getMyMentees()

        if (response.mentees) {
          setMentees(response.mentees)
        } else if (response.data?.mentees) {
          setMentees(response.data.mentees)
        }
      } else {
        // Fetch mentee's own profile using the /me endpoint (looks up mentee by user_id)
        const response = await apiClient.getMyMenteeProfile()

        if (response.data) {
          setMenteeProfile(response.data)
        }
      }
    } catch (error) {
      console.error('Error fetching mentorship data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load mentorship data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewMenteeDetails = (menteeId: string) => {
    router.push(`/mentorship/mentees/${menteeId}`)
  }

  const calculateProgress = (stats: MenteeData['stats']) => {
    const total = stats.totalGames
    const completed = stats.completedGames
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const getLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'rookie':
        return 'bg-gray-100 text-gray-800'
      case 'junior':
        return 'bg-blue-100 text-blue-800'
      case 'developing':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mentor View
  if (isMentor) {
    const activeMentees = mentees.filter(m => m.assignmentStatus === 'active').length
    const totalGames = mentees.reduce((sum, m) => sum + m.stats.totalGames, 0)
    const completedGames = mentees.reduce((sum, m) => sum + m.stats.completedGames, 0)
    const upcomingGames = mentees.reduce((sum, m) => sum + m.stats.upcomingGames, 0)
    const avgProgress = mentees.length > 0
      ? Math.round(mentees.reduce((sum, m) => sum + calculateProgress(m.stats), 0) / mentees.length)
      : 0

    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mentorship Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your mentees and track their development progress
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mentees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mentees.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeMentees} active assignments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGames}</div>
              <p className="text-xs text-muted-foreground">
                {completedGames} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Games</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingGames}</div>
              <p className="text-xs text-muted-foreground">
                Across all mentees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProgress}%</div>
              <p className="text-xs text-muted-foreground">
                Development progress
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mentees List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Mentees
            </CardTitle>
            <CardDescription>
              Current mentees and their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mentees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No mentees assigned</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any mentees assigned to you yet.
                </p>
                <Button variant="outline">
                  Request Mentee Assignment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {mentees.map((mentee) => {
                  const progress = calculateProgress(mentee.stats)
                  const initials = `${mentee.firstName[0]}${mentee.lastName[0]}`

                  return (
                    <div
                      key={mentee.id}
                      className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={mentee.profilePhotoUrl} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {mentee.firstName} {mentee.lastName}
                            </p>
                            <Badge variant="outline" className={getLevelColor(mentee.currentLevel)}>
                              {mentee.currentLevel || 'Rookie'}
                            </Badge>
                          </div>
                          <Badge variant="outline" className={getStatusColor(mentee.assignmentStatus)}>
                            {mentee.assignmentStatus}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">{mentee.email}</p>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>{mentee.stats.completedGames}/{mentee.stats.totalGames} games</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{mentee.stats.upcomingGames} upcoming</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Started {new Date(mentee.startDate).toLocaleDateString()}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewMenteeDetails(mentee.id)}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mentee View
  if (menteeProfile) {
    const progress = calculateProgress(menteeProfile.stats)
    const initials = `${menteeProfile.firstName[0]}${menteeProfile.lastName[0]}`
    const mentorshipDuration = menteeProfile.stats.mentorshipDays

    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Mentorship Profile</h1>
          <p className="text-muted-foreground">
            Track your development progress and goals
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{menteeProfile.stats.totalGames}</div>
              <p className="text-xs text-muted-foreground">
                {menteeProfile.stats.completedGames} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Games</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{menteeProfile.stats.upcomingGames}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled games
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress}%</div>
              <p className="text-xs text-muted-foreground">
                Development progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mentorship</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mentorshipDuration}</div>
              <p className="text-xs text-muted-foreground">
                Days in program
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profile and Mentor Info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Profile */}
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Your current development information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={menteeProfile.profilePhotoUrl} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {menteeProfile.firstName} {menteeProfile.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{menteeProfile.email}</p>
                  {menteeProfile.phone && (
                    <p className="text-sm text-muted-foreground">{menteeProfile.phone}</p>
                  )}
                </div>
              </div>

              {menteeProfile.profile && (
                <>
                  <div>
                    <label className="text-sm font-medium">Current Level</label>
                    <div className="mt-1">
                      <Badge className={getLevelColor(menteeProfile.profile.currentLevel)}>
                        {menteeProfile.profile.currentLevel || 'Rookie'}
                      </Badge>
                    </div>
                  </div>

                  {menteeProfile.profile.developmentGoals.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Development Goals</label>
                      <ul className="mt-2 space-y-1">
                        {menteeProfile.profile.developmentGoals.map((goal, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {menteeProfile.profile.strengths.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Strengths</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {menteeProfile.profile.strengths.map((strength, index) => (
                          <Badge key={index} variant="outline" className="bg-emerald-50 text-emerald-700">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {menteeProfile.profile.areasForImprovement.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Areas for Improvement</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {menteeProfile.profile.areasForImprovement.map((area, index) => (
                          <Badge key={index} variant="outline" className="bg-yellow-50 text-yellow-700">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Mentor Info */}
          <Card>
            <CardHeader>
              <CardTitle>My Mentor</CardTitle>
              <CardDescription>Your assigned mentor information</CardDescription>
            </CardHeader>
            <CardContent>
              {menteeProfile.mentor ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback>
                        {menteeProfile.mentor.firstName[0]}{menteeProfile.mentor.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {menteeProfile.mentor.firstName} {menteeProfile.mentor.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{menteeProfile.mentor.email}</p>
                      {menteeProfile.mentor.specialization && (
                        <Badge variant="outline" className="mt-1">
                          {menteeProfile.mentor.specialization}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <Button className="w-full" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Session
                      </Button>
                      <Button className="w-full" variant="outline">
                        Send Message
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No mentor assigned yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Development Progress</CardTitle>
            <CardDescription>Your progress through the mentorship program</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="grid gap-4 md:grid-cols-3 pt-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{menteeProfile.stats.completedGames}</div>
                <div className="text-xs text-muted-foreground">Games Completed</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{menteeProfile.stats.upcomingGames}</div>
                <div className="text-xs text-muted-foreground">Upcoming Games</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{menteeProfile.stats.totalGames}</div>
                <div className="text-xs text-muted-foreground">Total Games</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No data state
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No mentorship data available</h3>
            <p className="text-muted-foreground">
              You are not currently enrolled in the mentorship program.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
