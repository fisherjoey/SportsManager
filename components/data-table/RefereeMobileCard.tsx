'use client'

import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Award,
  Edit,
  Eye,
  MessageSquare,
  Shield,
  Zap
} from 'lucide-react'
const Whistle = Zap // Using Zap icon as whistle substitute

import { 
  BaseEntityCard,
  InfoRow,
  BadgeRow,
  CollapsibleSection
} from '@/components/ui/base-entity-card'
import { 
  LevelBadge,
  AvailabilityBadge
} from '@/components/ui/specialized-badges'
import { Badge } from '@/components/ui/badge'

import { Referee } from './types'

interface RefereeMobileCardProps {
  referee: Referee
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onEditReferee?: (referee: Referee) => void
  onViewProfile?: (referee: Referee) => void
}

export function RefereeMobileCard({ 
  referee, 
  isSelected, 
  onSelect, 
  onEditReferee,
  onViewProfile 
}: RefereeMobileCardProps) {

  const actions = [
    {
      label: 'View profile',
      icon: Eye,
      onClick: () => onViewProfile?.(referee)
    },
    {
      label: 'Edit referee',
      icon: Edit,
      onClick: () => onEditReferee?.(referee)
    },
    {
      label: 'Send message',
      icon: MessageSquare,
      onClick: () => console.log('Send message')
    }
  ]

  const title = (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <span>{referee.name}</span>
      {(referee.should_display_white_whistle || referee.isWhiteWhistle) && (
        <Whistle className="h-3 w-3 text-white fill-current" style={{ filter: 'drop-shadow(0 0 1px #374151)' }} />
      )}
    </div>
  )

  const subtitle = referee.new_referee_level || referee.certificationLevel

  return (
    <BaseEntityCard
      id={referee.id}
      title={title}
      subtitle={subtitle}
      isSelected={isSelected}
      onSelect={onSelect}
      actions={actions}
      copyIdLabel="Copy referee ID"
    >

      {/* Contact Information */}
      <div className="space-y-2">
        <InfoRow icon={Mail}>
          <span className="truncate">{referee.email}</span>
        </InfoRow>
        <InfoRow icon={Phone}>
          <span className="truncate">{referee.phone}</span>
        </InfoRow>
      </div>

      {/* Location */}
      <InfoRow icon={MapPin}>
        <div>
          <span className="font-medium">{referee.location}</span>
          <span className="mx-2">•</span>
          <span>{referee.maxDistance} km radius</span>
        </div>
      </InfoRow>

      {/* Level and Status */}
      <BadgeRow icon={Award}>
        <div className="flex items-center space-x-2">
          <LevelBadge level={referee.new_referee_level || referee.level} />
          <AvailabilityBadge
            isAvailable={referee.isAvailable}
            availabilityText={referee.isAvailable ? 'Available: July 20' : 'Unavailable'}
          />
        </div>
      </BadgeRow>

      {/* Roles */}
      <CollapsibleSection
        icon={Shield}
        label="Roles"
        isEmpty={(referee.role_names || referee.roles || []).length === 0}
        emptyText="None assigned"
      >
        <div className="flex flex-wrap gap-1">
          {(referee.role_names || referee.roles || []).slice(0, 3).map((role, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {role}
            </Badge>
          ))}
          {(referee.role_names || referee.roles || []).length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{(referee.role_names || referee.roles || []).length - 3} more
            </Badge>
          )}
        </div>
      </CollapsibleSection>

      {/* Preferred Positions (Legacy) */}
      {referee.preferredPositions && referee.preferredPositions.length > 0 && (
        <CollapsibleSection
          icon={Award}
          label="Preferred positions"
          isEmpty={false}
        >
          <div className="flex flex-wrap gap-1">
            {referee.preferredPositions.slice(0, 2).map((position, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {position}
              </Badge>
            ))}
            {referee.preferredPositions.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{referee.preferredPositions.length - 2} more
              </Badge>
            )}
          </div>
        </CollapsibleSection>
      )}
    </BaseEntityCard>
  )
}