"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin, Users, Phone, Mail, Star, Calendar, AlertTriangle } from "lucide-react"
import { type GameChunk, type Referee, mockGames, mockAvailabilitySlots } from "@/lib/mock-data"

interface AssignChunkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chunk: GameChunk
  availableReferees: Referee[]
  onAssign: (chunkId: string, refereeId: string) => void
}

export function AssignChunkDialog({ open, onOpenChange, chunk, availableReferees, onAssign }: AssignChunkDialogProps) {
  const [selectedReferee, setSelectedReferee] = useState<string | null>(null)

  const chunkGames = mockGames.filter((g) => chunk.gameIds.includes(g.id))

  const isRefereeAvailable = (referee: Referee) => {
    // Check if referee has availability for this time slot
    const chunkDate = chunk.date
    const chunkStart = chunk.startTime
    const chunkEnd = chunk.endTime

    const availabilitySlots = mockAvailabilitySlots.filter((slot) => slot.refereeId === referee.id)

    return availabilitySlots.some((slot) => {
      if (slot.date === chunkDate) {
        return slot.startTime <= chunkStart && slot.endTime >= chunkEnd
      }

      if (slot.isRecurring && slot.recurringDays) {
        const chunkDayOfWeek = new Date(chunkDate).getDay()
        if (slot.recurringDays.includes(chunkDayOfWeek)) {
          const slotEndDate = slot.recurringEndDate ? new Date(slot.recurringEndDate) : new Date("2099-12-31")
          const chunkDateObj = new Date(chunkDate)
          const slotStartDate = new Date(slot.date)

          if (chunkDateObj >= slotStartDate && chunkDateObj <= slotEndDate) {
            return slot.startTime <= chunkStart && slot.endTime >= chunkEnd
          }
        }
      }

      return false
    })
  }

  const getRefereeConflicts = (referee: Referee) => {
    // Check for existing assignments that conflict with this chunk
    const conflicts = mockGames.filter(
      (game) =>
        game.assignedReferees.includes(referee.id) &&
        game.date === chunk.date &&
        ((game.time >= chunk.startTime && game.time < chunk.endTime) ||
          (game.endTime && game.endTime > chunk.startTime && game.endTime <= chunk.endTime)),
    )
    return conflicts
  }

  const handleAssign = () => {
    if (selectedReferee) {
      onAssign(chunk.id, selectedReferee)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Level 5":
        return "bg-purple-600"
      case "Level 4":
        return "bg-blue-600"
      case "Level 3":
        return "bg-green-600"
      case "Level 2":
        return "bg-yellow-600"
      case "Level 1":
        return "bg-gray-600"
      default:
        return "bg-gray-600"
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
                  {chunk.gameIds.length} game{chunk.gameIds.length !== 1 ? "s" : ""}
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
                  {chunk.requiredReferees} referee{chunk.requiredReferees !== 1 ? "s" : ""} required
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {chunkGames.map((game) => (
                  <div key={game.id} className="text-sm p-2 bg-gray-50 rounded">
                    <span className="font-medium">
                      {game.homeTeam} vs {game.awayTeam}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({game.time} - {game.endTime}, {game.division})
                    </span>
                  </div>
                ))}
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
                    selectedReferee === referee.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                  } ${!isAvailable || hasConflicts ? "opacity-60" : ""}`}
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
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{referee.name}</h4>
                            <Badge className={getLevelColor(referee.level)}>{referee.level}</Badge>
                            {referee.experience >= 5 && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <Star className="h-3 w-3 mr-1" />
                                Experienced
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
                              Preferred: {referee.preferredDivisions.join(", ")}
                            </span>
                            <span className="text-sm font-medium text-green-600">${referee.standardPayRate}/game</span>
                          </div>

                          {/* Availability Status */}
                          <div className="mt-2 flex items-center space-x-2">
                            {isAvailable ? (
                              <Badge className="bg-green-600">Available</Badge>
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
                              {conflicts.map((conflict) => (
                                <p key={conflict.id} className="text-red-700">
                                  • {conflict.homeTeam} vs {conflict.awayTeam} at {conflict.time}
                                </p>
                              ))}
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
