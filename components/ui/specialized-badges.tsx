"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  UserCheck,
  Trophy,
  Users
} from "lucide-react"

// Status Badge Component
interface StatusBadgeProps {
  status: "completed" | "pending" | "failed" | "in_progress" | "cancelled" | "available" | "unavailable" | "assigned" | "unassigned" | "full" | "partial" | "up_for_grabs"
  children?: React.ReactNode
  className?: string
  showIcon?: boolean
}

export function StatusBadge({ status, children, className, showIcon = false }: StatusBadgeProps) {
  const statusConfig = {
    completed: {
      variant: "default" as const,
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
      icon: CheckCircle
    },
    pending: {
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock
    },
    failed: {
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle
    },
    in_progress: {
      variant: "default" as const,
      className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
      icon: Clock
    },
    cancelled: {
      variant: "secondary" as const,
      className: "bg-gray-100 text-gray-600 border-gray-200",
      icon: XCircle
    },
    available: {
      variant: "default" as const,
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
      icon: CheckCircle
    },
    unavailable: {
      variant: "secondary" as const,
      className: "bg-gray-100 text-gray-600 border-gray-200",
      icon: XCircle
    },
    assigned: {
      variant: "default" as const,
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
      icon: UserCheck
    },
    unassigned: {
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 border-red-200",
      icon: AlertCircle
    },
    full: {
      variant: "default" as const,
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
      icon: CheckCircle
    },
    partial: {
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: UserCheck
    },
    up_for_grabs: {
      variant: "outline" as const,
      className: "border-orange-200 text-orange-800",
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
  level: "Recreational" | "Competitive" | "Elite" | "Rookie" | "Junior" | "Senior" | string
  children?: React.ReactNode
  className?: string
  showIcon?: boolean
}

export function LevelBadge({ level, children, className, showIcon = false }: LevelBadgeProps) {
  const levelConfig = {
    "Recreational": {
      className: "bg-green-100 text-green-800 border-green-200"
    },
    "Competitive": {
      className: "bg-yellow-100 text-yellow-800 border-yellow-200"
    },
    "Elite": {
      className: "bg-red-100 text-red-800 border-red-200"
    },
    "Rookie": {
      className: "bg-blue-100 text-blue-800 border-blue-200"
    },
    "Junior": {
      className: "bg-purple-100 text-purple-800 border-purple-200"
    },
    "Senior": {
      className: "bg-orange-100 text-orange-800 border-orange-200"
    }
  }

  const config = levelConfig[level as keyof typeof levelConfig] || {
    className: "bg-gray-100 text-gray-800 border-gray-200"
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
  variant?: "default" | "secondary" | "outline" | "destructive"
}

export function CountBadge({ 
  count, 
  total, 
  label, 
  className, 
  showIcon = false,
  variant = "secondary"
}: CountBadgeProps) {
  const displayText = total 
    ? `${count}/${total}${label ? ` ${label}` : ''}`
    : `${count}${label ? ` ${label}` : ''}`

  const badgeVariant = total 
    ? count >= total 
      ? "default" 
      : count > 0 
        ? "secondary" 
        : "destructive"
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
      status={isAvailable ? "available" : "unavailable"} 
      className={className}
      showIcon
    >
      {availabilityText || (isAvailable ? "Available" : "Unavailable")}
    </StatusBadge>
  )
}

// Game Type Badge
interface GameTypeBadgeProps {
  type: "Community" | "Club" | "Tournament" | "Private Tournament" | string
  className?: string
}

export function GameTypeBadge({ type, className }: GameTypeBadgeProps) {
  const typeConfig = {
    "Community": {
      className: "bg-blue-100 text-blue-800 border-blue-200"
    },
    "Club": {
      className: "bg-green-100 text-green-800 border-green-200"
    },
    "Tournament": {
      className: "bg-purple-100 text-purple-800 border-purple-200"
    },
    "Private Tournament": {
      className: "bg-orange-100 text-orange-800 border-orange-200"
    }
  }

  const config = typeConfig[type as keyof typeof typeConfig] || {
    className: "bg-gray-100 text-gray-800 border-gray-200"
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