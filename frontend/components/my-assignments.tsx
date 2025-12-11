'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, MapPin, DollarSign, User } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { useApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { getStatusColorClass } from '@/lib/theme-colors'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'
import { GameFilters, applyGameFilters, type ActiveFilters } from '@/components/ui/game-filters'

export function MyAssignments() {
  const { user } = useAuth()
  const { toast } = useToast()
  const api = useApi()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    ageGroups: [],
    genders: [],
    divisions: [],
    zones: [],
    levels: [],
    statuses: []
  })

  useEffect(() => {
    if (user?.id) {
      fetchAssignments()
    }
  }, [user?.id])

  const fetchAssignments = async () => {
    try {
      const response = await api.getAssignments({ refereeId: user?.id })
      setAssignments(response.data.assignments || [])
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load assignments.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptDecline = async (assignmentId: string, action: 'accept' | 'decline') => {
    try {
      const status = action === 'accept' ? 'accepted' : 'declined'
      await api.updateAssignmentStatus(assignmentId, status)
      
      toast({
        title: action === 'accept' ? 'Assignment accepted' : 'Assignment declined',
        description: `You have ${action}ed the game assignment.`
      })
      
      // Refresh assignments
      fetchAssignments()
    } catch (error) {
      console.error('Failed to update assignment:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update assignment.'
      })
    }
  }

  if (loading) {
    return <div>Loading assignments...</div>
  }

  // Apply filters to the games within assignments
  const filteredAssignments = assignments.filter((assignment) => {
    if (!assignment.game) return false
    const games = [assignment.game]
    const filteredGames = applyGameFilters(games, activeFilters)
    return filteredGames.length > 0
  })

  const upcomingAssignments = filteredAssignments.filter((assignment) => 
    assignment.game && new Date(assignment.game.date) > new Date()
  )
  const pastAssignments = filteredAssignments.filter((assignment) => 
    assignment.game && new Date(assignment.game.date) <= new Date()
  )

  return (
    <PageLayout>
      <PageHeader
        icon={User}
        title="My Assignments"
        description="View and manage your assigned games"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Games</CardTitle>
            <Clock className={cn('h-4 w-4', getStatusColorClass('info', 'text'))} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAssignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Earnings</CardTitle>
            <DollarSign className={cn('h-4 w-4', getStatusColorClass('success', 'text'))} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {assignments
                .filter((assignment) => {
                  if (!assignment.game) return false
                  const gameDate = new Date(assignment.game.date)
                  const now = new Date()
                  return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear()
                })
                .reduce((total, assignment) => {
                  const wage = assignment.calculatedWage || assignment.game?.finalWage || assignment.game?.payRate || 0
                  return total + wage
                }, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Completed</CardTitle>
            <CheckCircle className={cn('h-4 w-4', getStatusColorClass('info', 'text'))} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastAssignments.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Assignments</CardTitle>
              <CardDescription>Your scheduled games</CardDescription>
            </div>
            <GameFilters 
              games={assignments.map(a => a.game).filter(Boolean)}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {upcomingAssignments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No upcoming assignments
              </div>
            ) : (
              upcomingAssignments.map((assignment) => (
                <Card key={assignment.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Game Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base leading-tight">
                            {assignment.game ? formatGameMatchup(assignment.game.homeTeam, assignment.game.awayTeam) : 'Unknown Game'}
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {assignment.game?.location}
                          </div>
                        </div>
                        <Badge
                          variant={assignment.status === 'accepted' ? 'default' : assignment.status === 'pending' ? 'outline' : 'destructive'}
                          className={cn(
                            assignment.status === 'accepted' ? cn(getStatusColorClass('success', 'text'), getStatusColorClass('success', 'border')) :
                              assignment.status === 'pending' ? cn(getStatusColorClass('info', 'text'), getStatusColorClass('info', 'border')) :
                                cn(getStatusColorClass('error', 'text'), getStatusColorClass('error', 'border'))
                          )}
                        >
                          {assignment.status === 'pending' ? 'Pending' : 
                            assignment.status === 'accepted' ? 'Accepted' : 
                              assignment.status === 'declined' ? 'Declined' : assignment.status}
                        </Badge>
                      </div>

                      {/* Date, Time, Level */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-medium text-foreground">
                            {assignment.game?.date ? new Date(assignment.game.date).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-muted-foreground">{assignment.game?.time}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">{assignment.game?.level}</Badge>
                          <div className="flex items-center justify-end">
                            <DollarSign className={cn('h-4 w-4 mr-1', getStatusColorClass('success', 'text'))} />
                            <span className="font-medium">
                              {assignment.calculatedWage || assignment.game?.finalWage || assignment.game?.payRate}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Wage Multiplier Info */}
                      {assignment.game?.wageMultiplier && assignment.game?.wageMultiplier !== 1.0 && (
                        <div className={cn('text-xs text-muted-foreground p-2 rounded', getStatusColorClass('warning', 'bg'))}>
                          {assignment.game.wageMultiplier}x multiplier
                          {assignment.game.wageMultiplierReason && (
                            <span> - {assignment.game.wageMultiplierReason}</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {assignment.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="mobile"
                            variant="outline"
                            onClick={() => handleAcceptDecline(assignment.id, 'accept')}
                            className={cn('flex-1', getStatusColorClass('success', 'text'), getStatusColorClass('success', 'border'), 'hover:opacity-80')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept Assignment
                          </Button>
                          <Button
                            size="mobile"
                            variant="outline"
                            onClick={() => handleAcceptDecline(assignment.id, 'decline')}
                            className={cn('flex-1', getStatusColorClass('error', 'text'), getStatusColorClass('error', 'border'), 'hover:opacity-80')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      )}
                      {assignment.status === 'accepted' && (
                        <div className={cn('text-center font-medium pt-2', getStatusColorClass('success', 'text'))}>
                          ✓ Assignment Confirmed
                        </div>
                      )}
                      {assignment.status === 'declined' && (
                        <div className={cn('text-center font-medium pt-2', getStatusColorClass('error', 'text'))}>
                          ✗ Assignment Declined
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No upcoming assignments
                    </TableCell>
                  </TableRow>
                ) : (
                  upcomingAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.game ? formatGameMatchup(assignment.game.homeTeam, assignment.game.awayTeam) : 'Unknown Game'}
                      </TableCell>
                      <TableCell>
                        {assignment.game?.date ? new Date(assignment.game.date).toLocaleDateString() : 'N/A'}
                        <br />
                        <span className="text-sm text-muted-foreground">{assignment.game?.time}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                          {assignment.game?.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{assignment.game?.level}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <DollarSign className={cn('h-4 w-4 mr-1', getStatusColorClass('success', 'text'))} />
                            {assignment.calculatedWage || assignment.game?.finalWage || assignment.game?.payRate}
                          </div>
                          {assignment.game?.wageMultiplier && assignment.game?.wageMultiplier !== 1.0 && (
                            <div className="text-xs text-muted-foreground">
                              {assignment.game.wageMultiplier}x multiplier
                              {assignment.game.wageMultiplierReason && (
                                <span> - {assignment.game.wageMultiplierReason}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={assignment.status === 'accepted' ? 'default' : assignment.status === 'pending' ? 'outline' : 'destructive'}
                          className={cn(
                            assignment.status === 'accepted' ? cn(getStatusColorClass('success', 'text'), getStatusColorClass('success', 'border')) :
                              assignment.status === 'pending' ? cn(getStatusColorClass('info', 'text'), getStatusColorClass('info', 'border')) :
                                cn(getStatusColorClass('error', 'text'), getStatusColorClass('error', 'border'))
                          )}
                        >
                          {assignment.status === 'pending' ? 'Pending' : 
                            assignment.status === 'accepted' ? 'Accepted' : 
                              assignment.status === 'declined' ? 'Declined' : assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.status === 'pending' && (
                          <div className="flex items-center space-x-1 md:space-x-2">
                            <Button
                              size="mobileSm"
                              variant="outline"
                              onClick={() => handleAcceptDecline(assignment.id, 'accept')}
                              className={cn(getStatusColorClass('success', 'text'), getStatusColorClass('success', 'border'), 'hover:opacity-80 min-w-[44px] touch-manipulation')}
                            >
                              <CheckCircle className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">Accept</span>
                            </Button>
                            <Button
                              size="mobileSm"
                              variant="outline"
                              onClick={() => handleAcceptDecline(assignment.id, 'decline')}
                              className={cn(getStatusColorClass('error', 'text'), getStatusColorClass('error', 'border'), 'hover:opacity-80 min-w-[44px] touch-manipulation')}
                            >
                              <XCircle className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">Decline</span>
                            </Button>
                          </div>
                        )}
                        {assignment.status === 'accepted' && (
                          <span className={cn('text-sm', getStatusColorClass('success', 'text'))}>Confirmed</span>
                        )}
                        {assignment.status === 'declined' && (
                          <span className={cn('text-sm', getStatusColorClass('error', 'text'))}>Declined</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past Assignments</CardTitle>
          <CardDescription>Your completed games</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pastAssignments.length === 0 ? (
              <p className="text-center text-muted-foreground">No past assignments</p>
            ) : (
              pastAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {assignment.game?.homeTeam} vs {assignment.game?.awayTeam}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.game?.date ? new Date(assignment.game.date).toLocaleDateString() : 'N/A'} at {assignment.game?.time}
                    </p>
                    <p className="text-sm text-muted-foreground">{assignment.game?.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{assignment.game?.level}</Badge>
                    <div className="mt-1">
                      <p className="text-sm font-medium">
                        ${assignment.calculatedWage || assignment.game?.finalWage || assignment.game?.payRate}
                      </p>
                      {assignment.game?.wageMultiplier && assignment.game?.wageMultiplier !== 1.0 && (
                        <p className="text-xs text-muted-foreground">
                          {assignment.game.wageMultiplier}x multiplier
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={cn(getStatusColorClass('success', 'text'), getStatusColorClass('success', 'border'), 'mt-1')}>
                      Completed
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
