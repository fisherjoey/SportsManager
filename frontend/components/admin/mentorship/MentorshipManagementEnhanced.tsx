'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Calendar,
  AlertCircle,
  Check,
  X,
  Pause,
  Play,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit
} from 'lucide-react'
import { format } from 'date-fns'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { FilterableTable, type ColumnDef } from '@/components/ui/filterable-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'


interface User {
  id: string
  name: string
  email: string
  roles?: Array<{ name: string }>
}

interface MentorshipData {
  id: string
  mentor_id: string
  mentee_id: string
  mentor_name?: string
  mentor_email?: string
  mentee_name?: string
  mentee_email?: string
  start_date: string
  end_date?: string
  status: 'active' | 'paused' | 'completed' | 'terminated'
  notes?: string
  created_at: string
  updated_at?: string
}

export function MentorshipManagementEnhanced() {
  const [mentorships, setMentorships] = useState<MentorshipData[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [mentors, setMentors] = useState<User[]>([])
  const [mentees, setMentees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  // Form state for new mentorship
  const [newMentorship, setNewMentorship] = useState({
    mentor_id: '',
    mentee_id: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load existing mentorships
      const mentorshipsResponse = await apiClient.get('/mentorships')
      console.log('Mentorships API Response:', mentorshipsResponse.data)

      // API returns data nested under data.data
      const mentorshipsList = mentorshipsResponse.data?.data?.data ||
                              mentorshipsResponse.data?.data ||
                              mentorshipsResponse.data?.mentorships ||
                              []
      console.log('Extracted mentorships:', mentorshipsList)

      // Load users to get names
      const usersResponse = await apiClient.get('/users')
      const users = usersResponse.data?.users || []
      setAllUsers(users)

      // Create a user lookup map
      const userMap = new Map(users.map((u: User) => [u.id, u]))

      // Enhance mentorship data with user names
      const enhancedMentorships = mentorshipsList.map((m: any) => {
        const mentor = userMap.get(m.mentor_id) || m.mentor
        const mentee = userMap.get(m.mentee_id) || m.mentee

        return {
          ...m,
          mentor_name: mentor?.name || 'Unknown',
          mentor_email: mentor?.email || '',
          mentee_name: mentee?.name || 'Unknown',
          mentee_email: mentee?.email || ''
        }
      })

      setMentorships(enhancedMentorships)

      // Filter users who can be mentors (have mentor role or permissions)
      const potentialMentors = users.filter((user: User) =>
        user.roles?.some(role =>
          ['Mentor', 'Senior Referee', 'Head Referee', 'Referee Coach', 'Super Admin', 'Admin'].includes(role.name)
        )
      )
      setMentors(potentialMentors)

      // Filter users who can be mentees (typically junior/rookie referees)
      const potentialMentees = users.filter((user: User) =>
        user.roles?.some(role =>
          ['Referee', 'Junior Referee', 'Rookie Referee'].includes(role.name)
        )
      )
      setMentees(potentialMentees)

    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load mentorship data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createMentorship = async () => {
    try {
      if (!newMentorship.mentor_id || !newMentorship.mentee_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select both a mentor and mentee',
          variant: 'destructive'
        })
        return
      }

      const response = await apiClient.post('/mentorships', newMentorship)

      if (response.data?.success || response.data?.data) {
        toast({
          title: 'Success',
          description: 'Mentorship created successfully'
        })
        setIsCreateDialogOpen(false)
        setNewMentorship({
          mentor_id: '',
          mentee_id: '',
          start_date: new Date().toISOString().split('T')[0],
          notes: ''
        })
        loadData()
      }
    } catch (error) {
      console.error('Failed to create mentorship:', error)
      toast({
        title: 'Error',
        description: 'Failed to create mentorship',
        variant: 'destructive'
      })
    }
  }

  const updateMentorshipStatus = async (mentorshipId: string, newStatus: string) => {
    try {
      const response = await apiClient.put(`/mentorships/${mentorshipId}`, {
        status: newStatus
      })

      if (response.data?.success || response.data?.mentorship) {
        toast({
          title: 'Status Updated',
          description: `Mentorship status changed to ${newStatus}`
        })
        loadData()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update mentorship status',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      paused: 'secondary',
      completed: 'outline',
      terminated: 'destructive'
    }

    const icons: Record<string, JSX.Element> = {
      active: <Check className="h-3 w-3 mr-1" />,
      paused: <Pause className="h-3 w-3 mr-1" />,
      completed: <Check className="h-3 w-3 mr-1" />,
      terminated: <X className="h-3 w-3 mr-1" />
    }

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center">
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  // Define columns for the FilterableTable
  const columns: ColumnDef<MentorshipData>[] = [
    {
      id: 'mentor',
      title: 'Mentor',
      filterType: 'search' as const,
      accessor: (mentorship: MentorshipData) => (
        <div>
          <div className="font-medium">{mentorship.mentor_name}</div>
          <div className="text-xs text-muted-foreground">{mentorship.mentor_email}</div>
        </div>
      )
    },
    {
      id: 'mentee',
      title: 'Mentee',
      filterType: 'search',
      accessor: (mentorship) => (
        <div>
          <div className="font-medium">{mentorship.mentee_name}</div>
          <div className="text-xs text-muted-foreground">{mentorship.mentee_email}</div>
        </div>
      )
    },
    {
      id: 'start_date',
      title: 'Start Date',
      filterType: 'none',
      accessor: (mentorship) => format(new Date(mentorship.start_date), 'MMM dd, yyyy')
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'paused', label: 'Paused' },
        { value: 'completed', label: 'Completed' },
        { value: 'terminated', label: 'Terminated' }
      ],
      accessor: (mentorship) => getStatusBadge(mentorship.status)
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none' as const,
      accessor: (mentorship: MentorshipData) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mentorship.status === 'active' && (
              <DropdownMenuItem onClick={() => updateMentorshipStatus(mentorship.id, 'paused')}>
                <Pause className="h-4 w-4 mr-2" />
                Pause Mentorship
              </DropdownMenuItem>
            )}
            {mentorship.status === 'paused' && (
              <DropdownMenuItem onClick={() => updateMentorshipStatus(mentorship.id, 'active')}>
                <Play className="h-4 w-4 mr-2" />
                Resume Mentorship
              </DropdownMenuItem>
            )}
            {(mentorship.status === 'active' || mentorship.status === 'paused') && (
              <>
                <DropdownMenuItem onClick={() => updateMentorshipStatus(mentorship.id, 'completed')}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateMentorshipStatus(mentorship.id, 'terminated')}
                  className="text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Terminate
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit Notes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]

  // Statistics
  const stats = {
    total: mentorships.length,
    active: mentorships.filter(m => m.status === 'active').length,
    paused: mentorships.filter(m => m.status === 'paused').length,
    completed: mentorships.filter(m => m.status === 'completed').length,
    terminated: mentorships.filter(m => m.status === 'terminated').length
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mentorship Management
              </CardTitle>
              <CardDescription>
                Manage mentor-mentee relationships and track mentorship progress
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Mentorship
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Mentorship</DialogTitle>
                  <DialogDescription>
                    Assign a mentee to a mentor to begin a mentorship relationship
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mentor">Select Mentor</Label>
                    <Select
                      value={newMentorship.mentor_id}
                      onValueChange={(value) => setNewMentorship({ ...newMentorship, mentor_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a mentor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mentors.map(mentor => (
                          <SelectItem key={mentor.id} value={mentor.id}>
                            <div className="flex items-center gap-2">
                              <span>{mentor.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {mentor.roles?.[0]?.name || 'Mentor'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mentee">Select Mentee</Label>
                    <Select
                      value={newMentorship.mentee_id}
                      onValueChange={(value) => setNewMentorship({ ...newMentorship, mentee_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a mentee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const availableMentees = mentees.filter(mentee => {
                            // Filter out mentees who already have an active mentorship with the selected mentor
                            if (!newMentorship.mentor_id) return true
                            const hasExistingMentorship = mentorships.some(m =>
                              m.mentor_id === newMentorship.mentor_id &&
                              m.mentee_id === mentee.id &&
                              m.status === 'active'
                            )
                            return !hasExistingMentorship
                          })

                          if (availableMentees.length === 0) {
                            return (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                {!newMentorship.mentor_id
                                  ? 'Please select a mentor first'
                                  : 'All mentees are already assigned to this mentor'}
                              </div>
                            )
                          }

                          return availableMentees.map(mentee => (
                            <SelectItem key={mentee.id} value={mentee.id}>
                              <div className="flex items-center gap-2">
                                <span>{mentee.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {mentee.roles?.[0]?.name || 'Referee'}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      type="date"
                      value={newMentorship.start_date}
                      onChange={(e) => setNewMentorship({ ...newMentorship, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      placeholder="Add any initial notes..."
                      value={newMentorship.notes}
                      onChange={(e) => setNewMentorship({ ...newMentorship, notes: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createMentorship}>
                    Create Mentorship
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
                <p className="text-xs text-muted-foreground">Paused</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.terminated}</div>
                <p className="text-xs text-muted-foreground">Terminated</p>
              </CardContent>
            </Card>
          </div>

          {/* Table with Filtering */}
          <FilterableTable
            columns={columns}
            data={mentorships}
            searchKey="mentor_name"
            emptyMessage="No mentorships created yet. Click 'Create Mentorship' to get started."
          />
        </CardContent>
      </Card>
    </div>
  )
}