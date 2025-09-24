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
      variant: 'default' as const,
      className: 'bg-success/10 text-success border-success/20 hover:bg-success/15 dark:bg-success/20 dark:text-success dark:border-success/30',
      icon: CheckCircle
    },
    pending: {
      variant: 'secondary' as const,
      className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 dark:bg-warning/20 dark:text-warning dark:border-warning/30',
      icon: Clock
    },
    failed: {
      variant: 'destructive' as const,
      className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/30',
      icon: XCircle
    },
    in_progress: {
      variant: 'default' as const,
      className: 'bg-info/10 text-info border-info/20 hover:bg-info/15 dark:bg-info/20 dark:text-info dark:border-info/30',
      icon: Clock
    },
    cancelled: {
      variant: 'secondary' as const,
      className: 'bg-muted text-muted-foreground border-muted hover:bg-muted/80 dark:bg-muted dark:text-muted-foreground dark:border-muted',
      icon: XCircle
    },
    available: {
      variant: 'default' as const,
      className: 'bg-success/10 text-success border-success/20 hover:bg-success/15 dark:bg-success/20 dark:text-success dark:border-success/30',
      icon: CheckCircle
    },
    unavailable: {
      variant: 'secondary' as const,
      className: 'bg-muted text-muted-foreground border-muted hover:bg-muted/80 dark:bg-muted dark:text-muted-foreground dark:border-muted',
      icon: XCircle
    },
    assigned: {
      variant: 'default' as const,
      className: 'bg-success/10 text-success border-success/20 hover:bg-success/15 dark:bg-success/20 dark:text-success dark:border-success/30',
      icon: UserCheck
    },
    unassigned: {
      variant: 'destructive' as const,
      className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/30',
      icon: AlertCircle
    },
    full: {
      variant: 'default' as const,
      className: 'bg-success/10 text-success border-success/20 hover:bg-success/15 dark:bg-success/20 dark:text-success dark:border-success/30',
      icon: CheckCircle
    },
    partial: {
      variant: 'secondary' as const,
      className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 dark:bg-warning/20 dark:text-warning dark:border-warning/30',
      icon: UserCheck
    },
    up_for_grabs: {
      variant: 'outline' as const,
      className: 'border-warning/50 text-warning hover:bg-warning/10 dark:border-warning/50 dark:text-warning dark:hover:bg-warning/20',
      icon: AlertCircle
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
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
      className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
    },
    'Competitive': {
      className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 dark:bg-warning/20 dark:text-warning dark:border-warning/30'
    },
    'Elite': {
      className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/30'
    },
    // New referee levels
    'Rookie': {
      className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
    },
    'Junior': {
      className: 'bg-info/10 text-info border-info/20 hover:bg-info/15 dark:bg-info/20 dark:text-info dark:border-info/30'
    },
    'Senior': {
      className: 'bg-accent text-accent-foreground border-accent hover:bg-accent/80 dark:bg-accent dark:text-accent-foreground dark:border-accent'
    },
    // Legacy referee levels
    'Learning': {
      className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
    },
    'Learning+': {
      className: 'bg-info/10 text-info border-info/20 hover:bg-info/15 dark:bg-info/20 dark:text-info dark:border-info/30'
    },
    'Growing': {
      className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 dark:bg-warning/20 dark:text-warning dark:border-warning/30'
    },
    'Growing+': {
      className: 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/25 dark:bg-warning/30 dark:text-warning dark:border-warning/40'
    },
    'Teaching': {
      className: 'bg-accent text-accent-foreground border-accent hover:bg-accent/80 dark:bg-accent dark:text-accent-foreground dark:border-accent'
    },
    'Expert': {
      className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/30'
    }
  }

  const config = levelConfig[level as keyof typeof levelConfig] || {
    className: 'bg-muted text-muted-foreground border-muted hover:bg-muted/80 dark:bg-muted dark:text-muted-foreground dark:border-muted'
  }

  return (
    <Badge 
      variant="outline"
      className={cn(config.className, className)}
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
      className: 'bg-info/10 text-info border-info/20 hover:bg-info/15 dark:bg-info/20 dark:text-info dark:border-info/30'
    },
    'Club': {
      className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
    },
    'Tournament': {
      className: 'bg-accent text-accent-foreground border-accent hover:bg-accent/80 dark:bg-accent dark:text-accent-foreground dark:border-accent'
    },
    'Private Tournament': {
      className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 dark:bg-warning/20 dark:text-warning dark:border-warning/30'
    }
  }

  const config = typeConfig[type as keyof typeof typeConfig] || {
    className: 'bg-muted text-muted-foreground border-muted hover:bg-muted/80 dark:bg-muted dark:text-muted-foreground dark:border-muted'
  }

  return (
    <Badge 
      variant="outline"
      className={cn(config.className, className)}
    >
      {type}
    </Badge>
  )
}