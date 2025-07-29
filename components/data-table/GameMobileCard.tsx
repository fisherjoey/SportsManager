"use client"

import { 
  BaseEntityCard,
  InfoRow,
  BadgeRow,
  CollapsibleSection
} from "@/components/ui/base-entity-card"
import { 
  AssignmentStatusBadge,
  LevelBadge
} from "@/components/ui/specialized-badges"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  MapPin, 
  Trophy, 
  DollarSign, 
  Users,
  Edit,
  Eye,
  UserCheck
} from "lucide-react"
import { Game } from "./types"
import { LocationWithDistance } from "@/components/ui/location-with-distance"
import { formatTeamName } from "@/lib/team-utils"

interface GameMobileCardProps {
  game: Game
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onAssignReferee?: (game: Game) => void
}

export function GameMobileCard({ game, isSelected, onSelect, onAssignReferee }: GameMobileCardProps) {
  // Handle both data structures - new (homeTeam/awayTeam) and old (home_team_name/away_team_name)
  const homeTeamName = formatTeamName(game.homeTeam) || (game as any).home_team_name
  const awayTeamName = formatTeamName(game.awayTeam) || (game as any).away_team_name

  const gameDate = game.date || (game as any).game_date
  const gameTime = game.startTime && game.endTime 
    ? `${game.startTime} - ${game.endTime}` 
    : game.time || (game as any).game_time
  const gameLocation = game.location
  const postalCode = game.postalCode || (game as any).postal_code
  
  const assignments = (game as any).assignments || ((game as any).assignedReferees?.map((name: string) => ({ referee_name: name, position_name: 'Referee' }))) || []
  const refsNeeded = game.refsNeeded || (game as any).refs_needed || 2
  const assignedCount = assignments.length

  // Determine game status for actions
  const isUpForGrabs = game.status === "up-for-grabs"

  const payRate = parseFloat(game.payRate || (game as any).pay_rate || "0")
  const multiplier = parseFloat(game.wageMultiplier || (game as any).wage_multiplier || "1")
  const finalAmount = payRate * multiplier


  const canAssign = assignments.length < refsNeeded

  const actions = [
    ...(canAssign ? [{
      label: "Assign Referee",
      icon: Users,
      onClick: () => onAssignReferee?.(game)
    }] : []),
    {
      label: "View details",
      icon: Eye,
      onClick: () => console.log('View details')
    },
    {
      label: "Edit game",
      icon: Edit,
      onClick: () => console.log('Edit game')
    },
    ...(!isUpForGrabs ? [{
      label: "Mark as up for grabs",
      icon: UserCheck,
      onClick: () => console.log('Mark as up for grabs')
    }] : [])
  ]

  const title = (
    <div>
      {homeTeamName} <span className="text-muted-foreground">vs</span> {awayTeamName}
    </div>
  )

  return (
    <BaseEntityCard
      id={game.id}
      title={title}
      isSelected={isSelected}
      onSelect={onSelect}
      actions={actions}
      copyIdLabel="Copy game ID"
    >

      {/* Date and time */}
      <InfoRow icon={Calendar}>
        <span>{new Date(gameDate).toLocaleDateString()}</span>
        <span className="mx-2">•</span>
        <span>{gameTime}</span>
      </InfoRow>

      {/* Location */}
      <LocationWithDistance
        location={gameLocation}
        postalCode={postalCode}
        showDistance={true}
        showMapLink={true}
        compact={true}
      />

      {/* Level and Pay */}
      <BadgeRow icon={Trophy}>
        <div className="flex items-center space-x-2">
          <LevelBadge level={game.level} />
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
      </BadgeRow>

      {/* Assignment Status */}
      <InfoRow icon={UserCheck}>
        <AssignmentStatusBadge
          assignedCount={assignedCount}
          requiredCount={refsNeeded}
        />
      </InfoRow>

      {/* Assigned Referees */}
      <CollapsibleSection
        icon={Users}
        label="Referees"
        isEmpty={assignments.length === 0}
        emptyText="None assigned"
      >
        <div className="space-y-1">
          {assignments.map((assignment: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm">{assignment.referee_name}</span>
              <Badge variant="outline" className="text-xs">
                {assignment.position_name}
              </Badge>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </BaseEntityCard>
  )
}