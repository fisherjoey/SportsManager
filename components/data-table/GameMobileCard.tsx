"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Calendar, 
  MapPin, 
  Trophy, 
  DollarSign, 
  Users, 
  MoreVertical,
  Copy,
  Edit,
  Eye,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import { Game } from "./types"

interface GameMobileCardProps {
  game: Game
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onAssignReferee?: (game: Game) => void
}

export function GameMobileCard({ game, isSelected, onSelect, onAssignReferee }: GameMobileCardProps) {
  // Handle both data structures - new (homeTeam/awayTeam) and old (home_team_name/away_team_name)
  const homeTeamName = typeof game.homeTeam === 'object' 
    ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
    : game.homeTeam || (game as any).home_team_name
  
  const awayTeamName = typeof game.awayTeam === 'object'
    ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
    : game.awayTeam || (game as any).away_team_name

  const gameDate = game.date || (game as any).game_date
  const gameTime = game.startTime && game.endTime 
    ? `${game.startTime} - ${game.endTime}` 
    : game.time || (game as any).game_time
  const gameLocation = game.location
  const postalCode = game.postalCode || (game as any).postal_code
  
  const assignments = (game as any).assignments || ((game as any).assignedReferees?.map((name: string) => ({ referee_name: name, position_name: 'Referee' }))) || []
  const refsNeeded = game.refsNeeded || (game as any).refs_needed || 2
  const assignedCount = assignments.length

  // Determine status
  let displayStatus = game.status
  let statusVariant: "default" | "secondary" | "outline" | "destructive" = "secondary"
  let StatusIcon = Clock

  if (assignedCount >= refsNeeded) {
    displayStatus = "Full"
    statusVariant = "default"
    StatusIcon = CheckCircle
  } else if (assignedCount > 0) {
    displayStatus = `Partial (${assignedCount}/${refsNeeded})`
    statusVariant = "secondary"
    StatusIcon = UserCheck
  } else if (game.status === "up-for-grabs") {
    displayStatus = "Up for Grabs"
    statusVariant = "outline"
    StatusIcon = AlertCircle
  } else {
    displayStatus = "Unassigned"
    statusVariant = "destructive"
    StatusIcon = AlertCircle
  }

  const payRate = parseFloat(game.payRate || (game as any).pay_rate || "0")
  const multiplier = parseFloat(game.wageMultiplier || (game as any).wage_multiplier || "1")
  const finalAmount = payRate * multiplier

  const levelColors = {
    "Recreational": "bg-green-100 text-green-800 border-green-200",
    "Competitive": "bg-yellow-100 text-yellow-800 border-yellow-200", 
    "Elite": "bg-red-100 text-red-800 border-red-200",
  }

  const canAssign = assignments.length < refsNeeded

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with selection and game */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {onSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  className="mt-1"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg leading-tight">
                  {homeTeamName} <span className="text-muted-foreground">vs</span> {awayTeamName}
                </h3>
              </div>
            </div>
            
            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(game.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy game ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canAssign && (
                  <DropdownMenuItem onClick={() => onAssignReferee?.(game)}>
                    <Users className="mr-2 h-4 w-4" />
                    Assign Referee
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit game
                </DropdownMenuItem>
                {game.status !== "up-for-grabs" && (
                  <DropdownMenuItem>
                    Mark as up for grabs
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Date and time */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{new Date(gameDate).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>{gameTime}</span>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4" />
            <span className="truncate">{gameLocation}</span>
            {postalCode && (
              <>
                <span className="mx-2">•</span>
                <span>{postalCode}</span>
              </>
            )}
          </div>

          {/* Level and Pay */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <Badge 
                variant="outline" 
                className={levelColors[game.level as keyof typeof levelColors] || ""}
              >
                {game.level}
              </Badge>
            </div>
            
            <div className="flex items-center text-sm font-medium">
              <DollarSign className="mr-1 h-4 w-4 text-muted-foreground" />
              ${finalAmount.toFixed(2)}
              {multiplier !== 1 && (
                <span className="text-xs text-muted-foreground ml-1">
                  (${payRate} × {multiplier})
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center">
            <StatusIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <Badge variant={statusVariant}>
              {displayStatus}
            </Badge>
          </div>

          {/* Assigned Referees */}
          <div className="border-t pt-3">
            <div className="flex items-start space-x-2">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">Referees:</span>
                {assignments.length === 0 ? (
                  <span className="text-sm text-muted-foreground ml-1">None assigned</span>
                ) : (
                  <div className="mt-1 space-y-1">
                    {assignments.map((assignment: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{assignment.referee_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {assignment.position_name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}