'use client'

import { 
  Calendar, 
  MapPin, 
  Trophy, 
  DollarSign, 
  Users,
  Edit,
  Eye,
  UserCheck,
  Clock
} from 'lucide-react'

import { 
  BaseEntityCard,
  InfoRow,
  BadgeRow,
  CollapsibleSection
} from '@/components/ui/base-entity-card'
import { 
  AssignmentStatusBadge,
  LevelBadge
} from '@/components/ui/specialized-badges'
import { Badge } from '@/components/ui/badge'
import { LocationWithDistance } from '@/components/ui/location-with-distance'
import { formatTeamName } from '@/lib/team-utils'

import { Game } from './types'

// Enhanced error handling functions (mirrored from game-management.tsx)
const displayTeamName = (team: any) => {
  if (!team) return 'TBD Team'
  return formatTeamName(team) || `${team.organization || 'Unknown'} Team`
}

const displayGameType = (gameType: string | undefined) => {
  return gameType || 'Standard Game'
}

const displayWageInfo = (payRate: number, multiplier: number = 1.0) => {
  const calculatedWage = payRate * multiplier
  return `$${calculatedWage.toFixed(2)}${multiplier !== 1.0 ? ` (${multiplier}x)` : ''}`
}

// GameTypeBadge component for mobile card
function GameTypeBadge({ gameType }: { gameType: string }) {
  const getGameTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
    case 'tournament':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'private tournament':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    case 'club':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'community':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  return (
    <Badge className={getGameTypeColor(gameType)} variant="outline">
      {displayGameType(gameType)}
    </Badge>
  )
}

interface GameMobileCardProps {
  game: Game
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onAssignReferee?: (game: Game) => void
}

export function GameMobileCard({ game, isSelected, onSelect, onAssignReferee }: GameMobileCardProps) {
  // Enhanced data handling with proper error handling functions
  const homeTeamName = displayTeamName(game.homeTeam) || (game as any).home_team_name
  const awayTeamName = displayTeamName(game.awayTeam) || (game as any).away_team_name

  const gameDate = game.date || (game as any).game_date
  const gameTime = game.startTime && game.endTime 
    ? `${game.startTime} - ${game.endTime}` 
    : game.time || (game as any).game_time
  const gameLocation = game.location || 'TBD Location'
  const postalCode = game.postalCode || (game as any).postal_code
  const gameType = game.gameType || (game as any).game_type
  
  const assignments = (game as any).assignments || ((game as any).assignedReferees?.map((name: string) => ({ referee_name: name, position_name: 'Referee' }))) || []
  const refsNeeded = game.refsNeeded || (game as any).refs_needed || 2
  const assignedCount = assignments.length

  // Determine game status for actions
  const isUpForGrabs = game.status === 'up-for-grabs'

  const payRate = parseFloat(game.payRate || (game as any).pay_rate || '0')
  const multiplier = parseFloat(game.wageMultiplier || (game as any).wage_multiplier || '1')
  const multiplierReason = game.wageMultiplierReason || (game as any).wage_multiplier_reason
  const finalAmount = payRate * multiplier

  // Location capacity information
  const locationData = game.locationData || (game as any).location_data || {}
  const capacity = locationData.capacity || 0

  const canAssign = assignments.length < refsNeeded

  const actions = [
    ...(canAssign ? [{
      label: 'Assign Referee',
      icon: Users,
      onClick: () => onAssignReferee?.(game)
    }] : []),
    {
      label: 'View details',
      icon: Eye,
      onClick: () => console.log('View details')
    },
    {
      label: 'Edit game',
      icon: Edit,
      onClick: () => console.log('Edit game')
    },
    ...(!isUpForGrabs ? [{
      label: 'Mark as up for grabs',
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
        <span>{gameTime || 'TBD'}</span>
      </InfoRow>

      {/* Game Type */}
      {gameType && (
        <BadgeRow icon={Trophy}>
          <GameTypeBadge gameType={gameType} />
        </BadgeRow>
      )}

      {/* Location with enhanced capacity info */}
      <LocationWithDistance
        location={gameLocation}
        postalCode={postalCode}
        showDistance={true}
        showMapLink={true}
        compact={true}
      />
      {capacity > 0 && (
        <InfoRow icon={MapPin}>
          <span className="text-sm text-muted-foreground">
            Capacity: {capacity} people
          </span>
        </InfoRow>
      )}

      {/* Enhanced Wage Information */}
      <InfoRow icon={DollarSign}>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <LevelBadge level={game.level} />
            <span className="text-sm font-medium">
              {displayWageInfo(payRate, multiplier)}
            </span>
          </div>
          {multiplierReason && multiplier !== 1 && (
            <span className="text-xs text-muted-foreground mt-1">
              {multiplierReason}
            </span>
          )}
        </div>
      </InfoRow>

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