"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  FileX, 
  Users, 
  Calendar, 
  MapPin, 
  Trophy,
  Plus,
  Search,
  Filter,
  Inbox
} from "lucide-react"

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: "sm" | "md" | "lg"
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md"
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: "py-8",
      icon: "h-12 w-12",
      title: "text-lg",
      description: "text-sm"
    },
    md: {
      container: "py-12",
      icon: "h-16 w-16", 
      title: "text-xl",
      description: "text-base"
    },
    lg: {
      container: "py-16",
      icon: "h-20 w-20",
      title: "text-2xl", 
      description: "text-lg"
    }
  }

  const classes = sizeClasses[size]

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      classes.container,
      className
    )}>
      <Icon className={cn("text-muted-foreground mb-4", classes.icon)} />
      <h3 className={cn("font-semibold text-foreground mb-2", classes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-muted-foreground mb-6 max-w-md", classes.description)}>
          {description}
        </p>
      )}
      {action && (
        <div className="flex items-center gap-2">
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
          >
            {action.label}
          </Button>
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Specialized empty states for common scenarios
export function NoGamesEmptyState({ onCreateGame }: { onCreateGame?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No games found"
      description="There are no games scheduled yet. Create your first game to get started."
      action={onCreateGame ? {
        label: "Create Game",
        onClick: onCreateGame
      } : undefined}
    />
  )
}

export function NoRefereesEmptyState({ onAddReferee }: { onAddReferee?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No referees found"
      description="There are no referees in the system yet. Add your first referee to get started."
      action={onAddReferee ? {
        label: "Add Referee", 
        onClick: onAddReferee
      } : undefined}
    />
  )
}

export function NoLocationsEmptyState({ onAddLocation }: { onAddLocation?: () => void }) {
  return (
    <EmptyState
      icon={MapPin}
      title="No locations found"
      description="There are no venues configured yet. Add your first location to get started."
      action={onAddLocation ? {
        label: "Add Location",
        onClick: onAddLocation
      } : undefined}
    />
  )
}

export function NoTeamsEmptyState({ onAddTeam }: { onAddTeam?: () => void }) {
  return (
    <EmptyState
      icon={Trophy}
      title="No teams found"
      description="There are no teams in the system yet. Add your first team to get started."
      action={onAddTeam ? {
        label: "Add Team",
        onClick: onAddTeam
      } : undefined}
    />
  )
}

export function NoSearchResultsEmptyState({ 
  onClearFilters,
  searchTerm,
  entityType = "items"
}: { 
  onClearFilters?: () => void
  searchTerm?: string
  entityType?: string
}) {
  return (
    <EmptyState
      icon={Search}
      title={`No ${entityType} found`}
      description={
        searchTerm 
          ? `No ${entityType} match your search "${searchTerm}". Try adjusting your filters or search terms.`
          : `No ${entityType} match your current filters. Try adjusting your filters.`
      }
      action={onClearFilters ? {
        label: "Clear Filters",
        onClick: onClearFilters,
        variant: "outline"
      } : undefined}
      size="sm"
    />
  )
}

export function NoAssignmentsEmptyState({ onAssignReferees }: { onAssignReferees?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No assignments yet"
      description="This game doesn't have any referees assigned yet. Assign referees to get started."
      action={onAssignReferees ? {
        label: "Assign Referees",
        onClick: onAssignReferees
      } : undefined}
      size="sm"
    />
  )
}

// Generic table empty state
export function TableEmptyState({ 
  title, 
  description, 
  onAction,
  actionLabel = "Add New"
}: {
  title: string
  description?: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-4 max-w-md text-sm">{description}</p>
      )}
      {onAction && (
        <Button onClick={onAction} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}