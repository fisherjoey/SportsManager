"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Clock, MapPin, DollarSign, User } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { useApi } from "@/lib/api"
import { formatTeamName, formatGameMatchup } from "@/lib/team-utils"
import { GameFilters, applyGameFilters, type ActiveFilters } from "@/components/ui/game-filters"

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
        variant: "destructive",
        title: "Error",
        description: "Failed to load assignments.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptDecline = async (assignmentId: string, action: "accept" | "decline") => {
    try {
      const status = action === "accept" ? "accepted" : "declined"
      await api.updateAssignmentStatus(assignmentId, status)
      
      toast({
        title: action === "accept" ? "Assignment accepted" : "Assignment declined",
        description: `You have ${action}ed the game assignment.`,
      })
      
      // Refresh assignments
      fetchAssignments()
    } catch (error) {
      console.error('Failed to update assignment:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update assignment.",
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
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAssignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
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
                  const wage = assignment.calculatedWage || assignment.game?.finalWage || assignment.game?.payRate || 0;
                  return total + wage;
                }, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
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
          <div className="rounded-md border">
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
                            <DollarSign className="h-4 w-4 mr-1 text-green-600" />
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
                          className={
                            assignment.status === 'accepted' ? 'text-green-600 border-green-600' :
                            assignment.status === 'pending' ? 'text-blue-600 border-blue-600' :
                            'text-red-600 border-red-600'
                          }
                        >
                          {assignment.status === 'pending' ? 'Pending' : 
                           assignment.status === 'accepted' ? 'Accepted' : 
                           assignment.status === 'declined' ? 'Declined' : assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.status === 'pending' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcceptDecline(assignment.id, "accept")}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcceptDecline(assignment.id, "decline")}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                        {assignment.status === 'accepted' && (
                          <span className="text-sm text-green-600">Confirmed</span>
                        )}
                        {assignment.status === 'declined' && (
                          <span className="text-sm text-red-600">Declined</span>
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
                    <Badge variant="outline" className="text-green-600 border-green-600 mt-1">
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
