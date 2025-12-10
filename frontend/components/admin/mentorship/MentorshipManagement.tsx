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
  Filter
} from 'lucide-react'

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
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

interface User {
  id: string
  name: string
  email: string
  roles?: Array<{ name: string }>
}

interface Mentorship {
  id: string
  mentor_id: string
  mentee_id: string
  mentor?: User
  mentee?: User
  start_date: string
  end_date?: string
  status: 'active' | 'paused' | 'completed' | 'terminated'
  notes?: string
  created_at: string
}

export function MentorshipManagement() {
  const [mentorships, setMentorships] = useState<Mentorship[]>([])
  const [mentors, setMentors] = useState<User[]>([])
  const [mentees, setMentees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingMentorships, setUpdatingMentorships] = useState<Set<string>>(new Set())
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
      console.log('Mentorships API Response:', mentorshipsResponse)

      // The backend returns data nested under data.data.data based on the debug info
      const mentorshipsList = mentorshipsResponse.data?.data?.data ||
                              mentorshipsResponse.data?.data ||
                              mentorshipsResponse.mentorships ||
                              []
      console.log('Extracted mentorships:', mentorshipsList)
      setMentorships(mentorshipsList)

      // Load users to select from
      const usersResponse = await apiClient.get('/users')
      const allUsers = usersResponse.data?.users || []

      // Filter users who can be mentors (have mentor role or permissions)
      const potentialMentors = allUsers.filter((user: User) =>
        user.roles?.some(role =>
          ['Mentor', 'Senior Referee', 'Head Referee', 'Referee Coach', 'Super Admin'].includes(role.name)
        )
      )
      setMentors(potentialMentors)

      // Filter users who can be mentees (typically junior/rookie referees)
      const potentialMentees = allUsers.filter((user: User) =>
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

      toast({
        title: 'Success',
        description: 'Mentorship created successfully'
      })

      // Reload data
      await loadData()

      // Close dialog and reset form
      setIsCreateDialogOpen(false)
      setNewMentorship({
        mentor_id: '',
        mentee_id: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: ''
      })

    } catch (error: any) {
      console.error('Failed to create mentorship:', error)

      // Check for specific error types
      let errorMessage = 'Failed to create mentorship'
      let errorTitle = 'Error'

      if (error.response?.status === 409 || error.response?.data?.error?.includes('already exists')) {
        errorTitle = 'Mentorship Already Exists'
        errorMessage = 'This mentorship relationship already exists. Each mentor-mentee pair can only have one active mentorship.'
      } else if (error.response?.status === 400) {
        errorTitle = 'Validation Error'
        errorMessage = error.response?.data?.error || 'Please check your input and try again'
      } else if (error.response?.status === 404) {
        errorTitle = 'User Not Found'
        errorMessage = 'One or more selected users could not be found'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const updateMentorshipStatus = async (mentorshipId: string, status: string) => {
    try {
      // Add mentorship to updating set for loading state
      setUpdatingMentorships(prev => new Set(prev).add(mentorshipId))

      const response = await apiClient.put(`/mentorships/${mentorshipId}`, { status })
      console.log('Update mentorship response:', response)

      toast({
        title: 'Success',
        description: `Mentorship status updated to ${status}`
      })

      // Reload data to reflect changes
      await loadData()
    } catch (error: any) {
      console.error('Failed to update mentorship:', error)

      // Provide more specific error messages
      let errorMessage = 'Failed to update mentorship status'
      let errorTitle = 'Error'

      if (error.response?.status === 404) {
        errorTitle = 'Mentorship Not Found'
        errorMessage = 'The mentorship could not be found. It may have been deleted.'
      } else if (error.response?.status === 400) {
        errorTitle = 'Invalid Status'
        errorMessage = error.response?.data?.error || 'The provided status is not valid'
      } else if (error.response?.status === 403) {
        errorTitle = 'Permission Denied'
        errorMessage = 'You do not have permission to update this mentorship'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      // Remove mentorship from updating set
      setUpdatingMentorships(prev => {
        const newSet = new Set(prev)
        newSet.delete(mentorshipId)
        return newSet
      })
    }
  }

  // Filter mentorships based on search and status
  const filteredMentorships = mentorships.filter(m => {
    const matchesSearch = searchQuery === '' ||
      m.mentor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mentee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mentor?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mentee?.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      paused: 'secondary',
      completed: 'outline',
      terminated: 'destructive'
    }

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{mentorships.length}</div>
                <p className="text-xs text-muted-foreground">Total Mentorships</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {mentorships.filter(m => m.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {mentorships.filter(m => m.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{mentors.length}</div>
                <p className="text-xs text-muted-foreground">Available Mentors</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mentorships Table */}
          {filteredMentorships.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {searchQuery || statusFilter !== 'all'
                  ? 'No mentorships found matching your filters'
                  : 'No mentorships created yet. Click "Create Mentorship" to get started.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Mentee</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMentorships.map((mentorship) => (
                  <TableRow key={mentorship.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mentorship.mentor?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{mentorship.mentor?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mentorship.mentee?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{mentorship.mentee?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(mentorship.start_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(mentorship.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {mentorship.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMentorshipStatus(mentorship.id, 'paused')}
                            disabled={updatingMentorships.has(mentorship.id)}
                          >
                            {updatingMentorships.has(mentorship.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {mentorship.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMentorshipStatus(mentorship.id, 'active')}
                            disabled={updatingMentorships.has(mentorship.id)}
                          >
                            {updatingMentorships.has(mentorship.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {(mentorship.status === 'active' || mentorship.status === 'paused') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMentorshipStatus(mentorship.id, 'completed')}
                            disabled={updatingMentorships.has(mentorship.id)}
                          >
                            {updatingMentorships.has(mentorship.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}