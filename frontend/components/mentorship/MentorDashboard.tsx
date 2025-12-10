'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  BookOpen,
  MessageSquare,
  Star,
  Award,
  Plus,
  Eye
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { Mentor, Mentee, getMenteeProgress, getMenteeStatusColor } from '@/types/mentorship'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

interface MentorDashboardProps {
  mentorId: string
  onSelectMentee?: (mentee: Mentee) => void
  onViewMenteeDetails?: (mentee: Mentee) => void
}

export function MentorDashboard({ mentorId, onSelectMentee, onViewMenteeDetails }: MentorDashboardProps) {
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchMentorData()
  }, [mentorId])

  const fetchMentorData = async () => {
    try {
      setLoading(true)
      
      // Fetch mentor profile and assigned mentees
      const [mentorResponse, menteesResponse] = await Promise.all([
        apiClient.get(`/mentors/${mentorId}`),
        apiClient.get(`/mentors/${mentorId}/mentees`)
      ])
      
      if (mentorResponse.data) {
        setMentor(mentorResponse.data)
      }
      
      if (menteesResponse.data) {
        setMentees(menteesResponse.data)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load mentor data'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
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
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const stats = mentor?.stats || {
    total_mentees: mentees.length,
    active_mentees: mentees.filter(m => 
      m.mentorship_assignments.some(a => a.status === 'active')
    ).length,
    completed_mentorships: mentor?.mentorship_assignments?.filter(a => a.status === 'completed').length || 0,
    total_sessions: 0,
    average_mentee_rating: 0,
    success_rate: 0
  }

  // Calculate upcoming sessions and recent activity
  const upcomingSessions = mentees
    .flatMap(m => m.sessions || [])
    .filter(s => s.status === 'scheduled' && new Date(s.session_date) > new Date())
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
    .slice(0, 5)

  const pendingGoals = mentees
    .flatMap(m => m.goals || [])
    .filter(g => g.status === 'in_progress' || g.status === 'not_started')
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return new Date(a.target_date || '9999-12-31').getTime() - new Date(b.target_date || '9999-12-31').getTime()
    })
    .slice(0, 5)

  const handleMenteeClick = (mentee: Mentee) => {
    if (onSelectMentee) {
      onSelectMentee(mentee)
    }
  }

  const handleViewDetails = (mentee: Mentee) => {
    if (onViewMenteeDetails) {
      onViewMenteeDetails(mentee)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mentor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your mentees and track their development progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Session
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mentees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_mentees}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.total_mentees} total assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSessions.length}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingSessions.length > 0 
                ? `Next: ${new Date(upcomingSessions[0].session_date).toLocaleDateString()}`
                : 'None scheduled'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Goals</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingGoals.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingGoals.filter(g => g.priority === 'high').length} high priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.success_rate)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.average_mentee_rating > 0 ? `${stats.average_mentee_rating.toFixed(1)} avg rating` : 'No ratings yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Mentees */}
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
          <CardContent className="space-y-4">
            {mentees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>No mentees assigned yet</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Request Mentee Assignment
                </Button>
              </div>
            ) : (
              mentees.map((mentee) => {
                const progress = getMenteeProgress(mentee)
                const assignment = mentee.mentorship_assignments[0]
                const statusColor = getMenteeStatusColor(assignment.status)
                
                return (
                  <div 
                    key={mentee.id} 
                    className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleMenteeClick(mentee)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={mentee.profile_photo_url} />
                      <AvatarFallback>
                        {mentee.first_name?.[0]}{mentee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {mentee.first_name} {mentee.last_name}
                        </p>
                        <Badge variant="outline" className={`text-xs ${statusColor}`}>
                          {assignment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{progress.level}</span>
                        <Progress value={progress.progress} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground">{progress.progress}%</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          Next: {progress.nextMilestone}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetails(mentee)
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Upcoming Sessions & Goals */}
        <div className="space-y-6">
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription>
                Scheduled mentorship sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="mx-auto h-8 w-8 opacity-50 mb-2" />
                  <p className="text-sm">No upcoming sessions</p>
                </div>
              ) : (
                upcomingSessions.map((session) => {
                  const mentee = mentees.find(m => m.id === session.mentee_id)
                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {mentee ? `${mentee.first_name} ${mentee.last_name}` : 'Unknown Mentee'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.session_date).toLocaleDateString()} at{' '}
                            {new Date(session.session_date).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {session.session_type}
                      </Badge>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Priority Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Priority Goals
              </CardTitle>
              <CardDescription>
                High-priority mentee goals requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingGoals.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="mx-auto h-8 w-8 opacity-50 mb-2" />
                  <p className="text-sm">No pending goals</p>
                </div>
              ) : (
                pendingGoals.map((goal) => {
                  const mentee = mentees.find(m => m.id === goal.mentee_id)
                  const priorityColors = {
                    high: 'text-red-600 bg-red-50',
                    medium: 'text-yellow-600 bg-yellow-50',
                    low: 'text-green-600 bg-green-50'
                  }
                  
                  return (
                    <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full ${
                          goal.status === 'not_started' ? 'bg-gray-400' : 'bg-blue-500'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {mentee ? `${mentee.first_name} ${mentee.last_name}` : 'Unknown Mentee'}
                            {goal.target_date && ` • Due ${new Date(goal.target_date).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${priorityColors[goal.priority]}`}>
                          {goal.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {goal.progress_percentage}%
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest mentorship activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* This would be populated with recent activity data */}
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No recent activity</p>
              <p className="text-sm">Activity will appear here as you interact with mentees</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}