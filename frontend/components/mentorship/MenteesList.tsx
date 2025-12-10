'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Eye, 
  MessageSquare, 
  Calendar, 
  BookOpen, 
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { apiClient } from '@/lib/api'
import { Mentee, getMenteeProgress, getMenteeStatusColor, formatSessionDuration } from '@/types/mentorship'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

interface MenteesListProps {
  mentorId: string
  onSelectMentee?: (mentee: Mentee) => void
  onViewDetails?: (mentee: Mentee) => void
  onScheduleSession?: (mentee: Mentee) => void
  onAddNote?: (mentee: Mentee) => void
  className?: string
  showAddButton?: boolean
  title?: string
  description?: string
}

export function MenteesList({ 
  mentorId, 
  onSelectMentee,
  onViewDetails,
  onScheduleSession,
  onAddNote,
  className = '',
  showAddButton = true,
  title = 'My Mentees',
  description = 'Manage and track your assigned mentees'
}: MenteesListProps) {
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'completed'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | 'rookie' | 'junior' | 'developing' | 'advanced'>('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchMentees()
  }, [mentorId])

  const fetchMentees = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/mentors/${mentorId}/mentees`)
      
      if (response.data) {
        setMentees(response.data)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load mentees'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (mentee: Mentee) => {
    if (onViewDetails) {
      onViewDetails(mentee)
    }
  }

  const handleScheduleSession = (mentee: Mentee) => {
    if (onScheduleSession) {
      onScheduleSession(mentee)
    }
  }

  const handleAddNote = (mentee: Mentee) => {
    if (onAddNote) {
      onAddNote(mentee)
    }
  }

  const handleRowClick = (mentee: Mentee) => {
    if (onSelectMentee) {
      onSelectMentee(mentee)
    }
  }

  // Filter mentees based on search and filters
  const filteredMentees = mentees.filter(mentee => {
    const matchesSearch = !searchTerm || 
      `${mentee.first_name} ${mentee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentee.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const assignment = mentee.mentorship_assignments[0]
    const matchesStatus = statusFilter === 'all' || assignment?.status === statusFilter
    
    const level = mentee.mentee_profile?.current_level || 'rookie'
    const matchesLevel = levelFilter === 'all' || level === levelFilter

    return matchesSearch && matchesStatus && matchesLevel
  })

  // Define columns for the table
  const columns: ColumnDef<Mentee>[] = [
    {
      id: 'mentee',
      title: 'Mentee',
      filterType: 'search',
      accessor: (mentee) => (
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={mentee.profile_photo_url} />
            <AvatarFallback>
              {mentee.first_name?.[0]}{mentee.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{mentee.first_name} {mentee.last_name}</div>
            <div className="text-sm text-muted-foreground">{mentee.email}</div>
            {mentee.phone && (
              <div className="text-xs text-muted-foreground">{mentee.phone}</div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'level',
      title: 'Level',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Levels' },
        { value: 'rookie', label: 'Rookie' },
        { value: 'junior', label: 'Junior' },
        { value: 'developing', label: 'Developing' },
        { value: 'advanced', label: 'Advanced' }
      ],
      accessor: (mentee) => {
        const level = mentee.mentee_profile?.current_level || 'rookie'
        const levelColors = {
          rookie: 'bg-gray-100 text-gray-800',
          junior: 'bg-blue-100 text-blue-800',
          developing: 'bg-yellow-100 text-yellow-800',
          advanced: 'bg-green-100 text-green-800'
        }
        
        return (
          <Badge className={levelColors[level as keyof typeof levelColors]}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Badge>
        )
      }
    },
    {
      id: 'progress',
      title: 'Progress',
      filterType: 'none',
      accessor: (mentee) => {
        const progress = getMenteeProgress(mentee)
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progress.progress}%</span>
              <span className="text-xs text-muted-foreground">{progress.level}</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Next: {progress.nextMilestone}
            </div>
          </div>
        )
      }
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'completed', label: 'Completed' },
        { value: 'paused', label: 'Paused' }
      ],
      accessor: (mentee) => {
        const assignment = mentee.mentorship_assignments[0]
        const status = assignment?.status || 'active'
        const statusColor = getMenteeStatusColor(status)
        
        return (
          <div className="space-y-1">
            <Badge variant="outline" className={statusColor}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            {assignment?.start_date && (
              <div className="text-xs text-muted-foreground">
                Since {new Date(assignment.start_date).toLocaleDateString()}
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: 'activity',
      title: 'Recent Activity',
      filterType: 'none',
      accessor: (mentee) => {
        const stats = mentee.stats
        
        return (
          <div className="space-y-1">
            {stats?.last_session_date ? (
              <div className="text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Last session: {new Date(stats.last_session_date).toLocaleDateString()}</span>
                </div>
                {stats.next_session_date && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Next: {new Date(stats.next_session_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No sessions yet</div>
            )}
            
            {stats && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{stats.total_sessions || 0} sessions</span>
                <span>{stats.completed_goals || 0}/{stats.total_goals || 0} goals</span>
                {stats.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{stats.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: 'goals',
      title: 'Goals',
      filterType: 'none',
      accessor: (mentee) => {
        const goals = mentee.goals || []
        const activeGoals = goals.filter(g => g.status === 'in_progress' || g.status === 'not_started')
        const completedGoals = goals.filter(g => g.status === 'completed')
        const highPriorityGoals = activeGoals.filter(g => g.priority === 'high')
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {completedGoals.length}/{goals.length} completed
              </span>
            </div>
            {activeGoals.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {activeGoals.length} active
                {highPriorityGoals.length > 0 && (
                  <span className="text-red-600 ml-1">
                    ({highPriorityGoals.length} high priority)
                  </span>
                )}
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (mentee) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleViewDetails(mentee)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleScheduleSession(mentee)}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddNote(mentee)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <BookOpen className="mr-2 h-4 w-4" />
              View Games
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            {showAddButton && <Skeleton className="h-10 w-24" />}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {showAddButton && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Mentee
            </Button>
          )}
        </div>
        
        {/* Quick stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{mentees.length} total mentees</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            <span>
              {mentees.filter(m => m.mentorship_assignments.some(a => a.status === 'active')).length} active
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>
              {Math.round(
                mentees.reduce((acc, m) => acc + getMenteeProgress(m).progress, 0) / (mentees.length || 1)
              )}% avg progress
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FilterableTable
          columns={columns}
          data={filteredMentees}
          loading={loading}
          searchKey="mentee"
          enableViewToggle={true}
          enableCSV={true}
          csvFilename="mentees-export"
          emptyMessage="No mentees found matching your criteria."
          onRowClick={handleRowClick}
          mobileCardComponent={({ item: mentee }) => (
            <div className="p-4 border rounded-lg space-y-3">
              {/* Header */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={mentee.profile_photo_url} />
                  <AvatarFallback>
                    {mentee.first_name?.[0]}{mentee.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {mentee.first_name} {mentee.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {mentee.email}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getMenteeStatusColor(mentee.mentorship_assignments[0]?.status || 'active')}>
                    {mentee.mentorship_assignments[0]?.status || 'active'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(mentee)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleScheduleSession(mentee)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule Session
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddNote(mentee)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Add Note
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Development Progress</span>
                  <span className="font-medium">{getMenteeProgress(mentee).progress}%</span>
                </div>
                <Progress value={getMenteeProgress(mentee).progress} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Level: {getMenteeProgress(mentee).level} • Next: {getMenteeProgress(mentee).nextMilestone}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">{mentee.stats?.total_sessions || 0}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
                <div>
                  <div className="font-medium">
                    {mentee.stats?.completed_goals || 0}/{mentee.stats?.total_goals || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Goals</div>
                </div>
              </div>

              {/* Recent activity */}
              {mentee.stats?.last_session_date && (
                <div className="text-xs text-muted-foreground">
                  Last session: {new Date(mentee.stats.last_session_date).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        />
      </CardContent>
    </Card>
  )
}