'use client'

import React from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  UserCheck,
  Trophy,
  Users
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Status Badge Component
interface StatusBadgeProps {
  status: 'completed' | 'pending' | 'failed' | 'in_progress' | 'cancelled' | 'available' | 'unavailable' | 'assigned' | 'unassigned' | 'full' | 'partial' | 'up_for_grabs'
  children?: React.ReactNode
  className?: string
  showIcon?: boolean
}

export function StatusBadge({ status, children, className, showIcon = false }: StatusBadgeProps) {
  const statusConfig = {
    completed: {
      variant: 'success' as const,
      icon: CheckCircle
    },
    pending: {
      variant: 'warning' as const,
      icon: Clock
    },
    failed: {
      variant: 'destructive' as const,
      icon: XCircle
    },
    in_progress: {
      variant: 'info' as const,
      icon: Clock
    },
    cancelled: {
      variant: 'secondary' as const,
      icon: XCircle
    },
    available: {
      variant: 'success' as const,
      icon: CheckCircle
    },
    unavailable: {
      variant: 'secondary' as const,
      icon: XCircle
    },
    assigned: {
      variant: 'success' as const,
      icon: UserCheck
    },
    unassigned: {
      variant: 'destructive' as const,
      icon: AlertCircle
    },
    full: {
      variant: 'success' as const,
      icon: CheckCircle
    },
    partial: {
      variant: 'warning' as const,
      icon: UserCheck
    },
    up_for_grabs: {
      variant: 'warning' as const,
      icon: AlertCircle
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={className}
    >
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {children || status.replace('_', ' ')}
    </Badge>
  )
}

// Level Badge Component
interface LevelBadgeProps {
  level: 'Recreational' | 'Competitive' | 'Elite' | 'Rookie' | 'Junior' | 'Senior' | 'Learning' | 'Learning+' | 'Growing' | 'Growing+' | 'Teaching' | 'Expert' | string
  children?: React.ReactNode
  className?: string
  showIcon?: boolean
}

export function LevelBadge({ level, children, className, showIcon = false }: LevelBadgeProps) {
  const levelConfig = {
    // Legacy game levels
    'Recreational': {
      variant: 'default' as const
    },
    'Competitive': {
      variant: 'warning' as const
    },
    'Elite': {
      variant: 'destructive' as const
    },
    // New referee levels
    'Rookie': {
      variant: 'default' as const
    },
    'Junior': {
      variant: 'info' as const
    },
    'Senior': {
      variant: 'secondary' as const
    },
    // Legacy referee levels
    'Learning': {
      variant: 'default' as const
    },
    'Learning+': {
      variant: 'info' as const
    },
    'Growing': {
      variant: 'warning' as const
    },
    'Growing+': {
      variant: 'warning' as const
    },
    'Teaching': {
      variant: 'secondary' as const
    },
    'Expert': {
      variant: 'destructive' as const
    }
  }

  const config = levelConfig[level as keyof typeof levelConfig] || {
    variant: 'outline' as const
  }

  return (
    <Badge
      variant={config.variant}
      className={className}
    >
      {showIcon && <Trophy className="mr-1 h-3 w-3" />}
      {children || level}
    </Badge>
  )
}

// Count Badge Component
interface CountBadgeProps {
  count: number
  total?: number
  label?: string
  className?: string
  showIcon?: boolean
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export function CountBadge({ 
  count, 
  total, 
  label, 
  className, 
  showIcon = false,
  variant = 'secondary'
}: CountBadgeProps) {
  const displayText = total 
    ? `${count}/${total}${label ? ` ${label}` : ''}`
    : `${count}${label ? ` ${label}` : ''}`

  const badgeVariant = total 
    ? count >= total 
      ? 'default' 
      : count > 0 
        ? 'secondary' 
        : 'destructive'
    : variant

  return (
    <Badge 
      variant={badgeVariant}
      className={className}
    >
      {showIcon && <Users className="mr-1 h-3 w-3" />}
      {displayText}
    </Badge>
  )
}

// Assignment Status Badge (specific for referee assignments)
interface AssignmentStatusBadgeProps {
  assignedCount: number
  requiredCount: number
  className?: string
}

export function AssignmentStatusBadge({ 
  assignedCount, 
  requiredCount, 
  className 
}: AssignmentStatusBadgeProps) {
  if (assignedCount >= requiredCount) {
    return (
      <StatusBadge status="full" className={className} showIcon>
        Full
      </StatusBadge>
    )
  } else if (assignedCount > 0) {
    return (
      <StatusBadge status="partial" className={className} showIcon>
        Partial ({assignedCount}/{requiredCount})
      </StatusBadge>
    )
  } else {
    return (
      <StatusBadge status="unassigned" className={className} showIcon>
        Unassigned
      </StatusBadge>
    )
  }
}

// Availability Badge (for referees)
interface AvailabilityBadgeProps {
  isAvailable: boolean
  availabilityText?: string
  className?: string
}

export function AvailabilityBadge({ 
  isAvailable, 
  availabilityText, 
  className 
}: AvailabilityBadgeProps) {
  return (
    <StatusBadge 
      status={isAvailable ? 'available' : 'unavailable'} 
      className={className}
      showIcon
    >
      {availabilityText || (isAvailable ? 'Available' : 'Unavailable')}
    </StatusBadge>
  )
}

// Game Type Badge
interface GameTypeBadgeProps {
  type: 'Community' | 'Club' | 'Tournament' | 'Private Tournament' | string
  className?: string
}

export function GameTypeBadge({ type, className }: GameTypeBadgeProps) {
  const typeConfig = {
    'Community': {
      variant: 'info' as const
    },
    'Club': {
      variant: 'default' as const
    },
    'Tournament': {
      variant: 'secondary' as const
    },
    'Private Tournament': {
      variant: 'warning' as const
    }
  }

  const config = typeConfig[type as keyof typeof typeConfig] || {
    variant: 'outline' as const
  }

  return (
    <Badge
      variant={config.variant}
      className={className}
    >
      {type}
    </Badge>
  )
}