'use client'

import { useState } from 'react'
import { Clock, MapPin, Users, Phone, Mail, Star, Calendar, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { type Game } from '@/lib/types/games'
import { type Referee } from '@/lib/types/referees'
import { formatTeamName, formatGameMatchup } from '@/lib/team-utils'

interface GameChunk {
  id: string
  games: Game[]
  location: string
  date: string
  startTime: string
  endTime: string
  totalReferees: number
  assignedTo?: string
}

interface AssignChunkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chunk: GameChunk
  availableReferees: Referee[]
  existingGames?: Game[]  // Pass in actual games data
  onAssign: (chunk: GameChunk, refereeId: string) => void
}

export function AssignChunkDialog({ open, onOpenChange, chunk, availableReferees, existingGames = [], onAssign }: AssignChunkDialogProps) {
  const [selectedReferee, setSelectedReferee] = useState<string | null>(null)

  const isRefereeAvailable = (referee: Referee) => {
    // For now, just check the base availability flag
    // In a real app, this would check availability slots against the chunk time
    return referee.isAvailable
  }

  const getRefereeConflicts = (referee: Referee) => {
    // Check for existing assignments that conflict with this chunk
    const conflicts = existingGames.filter(
      (game) =>
        game.assignedReferees?.includes(referee.name) &&
        game.date === chunk.date &&
        ((game.time && game.time >= chunk.startTime && game.time < chunk.endTime) ||
          (game.startTime && game.startTime >= chunk.startTime && game.startTime < chunk.endTime))
    )
    return conflicts
  }

  const handleAssign = () => {
    if (selectedReferee) {
      onAssign(chunk, selectedReferee)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
    case 'Elite':
      return 'bg-purple-600'
    case 'Competitive':
      return 'bg-blue-600'
    case 'Recreational':
      return 'bg-emerald-600'
    default:
      return 'bg-gray-600'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Chunk to Referee</DialogTitle>
          <DialogDescription>Select a referee to assign this chunk of games</DialogDescription>
        </DialogHeader>

        {/* Chunk Details */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{chunk.location}</h3>
                <Badge variant="outline">
                  {chunk.games.length} game{chunk.games.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(chunk.date).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {chunk.startTime} - {chunk.endTime}
                </span>
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {chunk.totalReferees} referee{chunk.totalReferees !== 1 ? 's' : ''} required
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {chunk.games.map((game) => {
                  const homeTeamName = formatTeamName(game.homeTeam)
                  const awayTeamName = formatTeamName(game.awayTeam)

                  return (
                    <div key={game.id} className="text-sm p-2 bg-gray-50 rounded">
                      <span className="font-medium">
                        {homeTeamName} vs {awayTeamName}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        ({game.time || game.startTime} {game.endTime ? `- ${game.endTime}` : ''}, {game.division})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Referees */}
        <div className="space-y-4">
          <h3 className="font-semibold">Available Referees</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {availableReferees.map((referee) => {
              const isAvailable = isRefereeAvailable(referee)
              const conflicts = getRefereeConflicts(referee)
              const hasConflicts = conflicts.length > 0

              return (
                <Card
                  key={referee.id}
                  className={`cursor-pointer transition-colors ${
                    selectedReferee === referee.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  } ${!isAvailable || hasConflicts ? 'opacity-60' : ''}`}
                  onClick={() => {
                    if (isAvailable && !hasConflicts) {
                      setSelectedReferee(referee.id)
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {referee.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{referee.name}</h4>
                            <Badge className={getLevelColor(referee.level)}>{referee.level}</Badge>
                            {referee.certificationLevel && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <Star className="h-3 w-3 mr-1" />
                                {referee.certificationLevel}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {referee.email}
                            </span>
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {referee.phone}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {referee.location}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-sm text-muted-foreground">
                              Certifications: {referee.certifications.join(', ')}
                            </span>
                          </div>

                          {/* Availability Status */}
                          <div className="mt-2 flex items-center space-x-2">
                            {isAvailable ? (
                              <Badge variant="success">Available</Badge>
                            ) : (
                              <Badge variant="destructive">Not Available</Badge>
                            )}
                            {hasConflicts && (
                              <Badge variant="destructive" className="flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Conflict
                              </Badge>
                            )}
                          </div>

                          {/* Show conflicts if any */}
                          {hasConflicts && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                              <p className="text-red-800 font-medium">Scheduling Conflicts:</p>
                              {conflicts.map((conflict) => {
                                const conflictHomeTeam = formatTeamName(conflict.homeTeam)
                                const conflictAwayTeam = formatTeamName(conflict.awayTeam)

                                return (
                                  <p key={conflict.id} className="text-red-700">
                                    • {conflictHomeTeam} vs {conflictAwayTeam} at {conflict.time || conflict.startTime}
                                  </p>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {availableReferees.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No referees available for this time slot</p>
                <p className="text-sm text-muted-foreground">Consider splitting the chunk or adjusting the schedule</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedReferee}>
            Assign Chunk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}