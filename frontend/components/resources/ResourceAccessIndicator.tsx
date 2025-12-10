'use client'

import React from 'react'
import { 
  Lock, 
  Unlock, 
  Eye, 
  Users, 
  Globe, 
  Shield,
  AlertTriangle,
  Info
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AccessLevel, PermissionSummary } from '@/lib/types/resources'

interface ResourceAccessIndicatorProps {
  accessLevel: AccessLevel
  permissionSummary?: PermissionSummary
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  className?: string
  variant?: 'badge' | 'icon' | 'full'
}

const accessLevelConfig = {
  public: {
    icon: Globe,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    iconColor: 'text-green-600 dark:text-green-400',
    label: 'Public',
    description: 'Available to everyone'
  },
  restricted: {
    icon: Shield,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    label: 'Restricted',
    description: 'Limited to specific roles'
  },
  private: {
    icon: Lock,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Private',
    description: 'Restricted access'
  },
  'role-based': {
    icon: Users,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
    label: 'Role-based',
    description: 'Role-based permissions'
  }
}

const sizeConfig = {
  sm: {
    iconSize: 'w-3 h-3',
    badgeSize: 'text-xs px-2 py-0.5',
    spacing: 'gap-1'
  },
  md: {
    iconSize: 'w-4 h-4',
    badgeSize: 'text-sm px-2.5 py-1',
    spacing: 'gap-2'
  },
  lg: {
    iconSize: 'w-5 h-5',
    badgeSize: 'text-base px-3 py-1.5',
    spacing: 'gap-2'
  }
}

export function ResourceAccessIndicator({
  accessLevel,
  permissionSummary,
  size = 'md',
  showDetails = false,
  className = '',
  variant = 'badge'
}: ResourceAccessIndicatorProps) {
  const config = accessLevelConfig[accessLevel]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  const getTooltipContent = () => {
    if (!permissionSummary) {
      return config.description
    }

    const { total_roles, roles_with_access, restricted_roles, is_public } = permissionSummary

    if (is_public) {
      return 'This resource is publicly accessible to all users'
    }

    if (roles_with_access === 0) {
      return 'No roles have access to this resource'
    }

    return (
      <div className="space-y-2">
        <p className="font-medium">{config.description}</p>
        <div className="text-xs space-y-1">
          <p>{roles_with_access} of {total_roles} roles have access</p>
          {restricted_roles.length > 0 && (
            <div>
              <p className="font-medium">Roles with access:</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                {restricted_roles.slice(0, 5).map((role, index) => (
                  <li key={index}>{role}</li>
                ))}
                {restricted_roles.length > 5 && (
                  <li>... and {restricted_roles.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderIcon = () => (
    <Icon className={`${sizeStyles.iconSize} ${config.iconColor}`} />
  )

  const renderBadge = () => (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeStyles.badgeSize} ${sizeStyles.spacing} font-medium`}
    >
      <Icon className={sizeStyles.iconSize} />
      {config.label}
      {showDetails && permissionSummary && !permissionSummary.is_public && (
        <span className="ml-1">
          ({permissionSummary.roles_with_access}/{permissionSummary.total_roles})
        </span>
      )}
    </Badge>
  )

  const renderFull = () => (
    <div className={`flex items-center ${sizeStyles.spacing} p-2 rounded-md bg-muted/50`}>
      <Icon className={`${sizeStyles.iconSize} ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{config.label}</p>
        {showDetails && permissionSummary && (
          <p className="text-xs text-muted-foreground">
            {permissionSummary.is_public
              ? 'Public access'
              : `${permissionSummary.roles_with_access} of ${permissionSummary.total_roles} roles`}
          </p>
        )}
      </div>
      {accessLevel === 'private' && (
        <AlertTriangle className="w-4 h-4 text-amber-500" />
      )}
    </div>
  )

  const content = () => {
    switch (variant) {
    case 'icon':
      return renderIcon()
    case 'full':
      return renderFull()
    case 'badge':
    default:
      return renderBadge()
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex ${className}`}>
            {content()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Helper component for resource cards
export function ResourceAccessBadge({
  accessLevel,
  permissionSummary,
  className = ''
}: Pick<ResourceAccessIndicatorProps, 'accessLevel' | 'permissionSummary' | 'className'>) {
  return (
    <ResourceAccessIndicator
      accessLevel={accessLevel}
      permissionSummary={permissionSummary}
      size="sm"
      variant="badge"
      className={className}
    />
  )
}

// Helper component for detailed views
export function ResourceAccessDetails({
  accessLevel,
  permissionSummary,
  className = ''
}: Pick<ResourceAccessIndicatorProps, 'accessLevel' | 'permissionSummary' | 'className'>) {
  return (
    <ResourceAccessIndicator
      accessLevel={accessLevel}
      permissionSummary={permissionSummary}
      size="md"
      variant="full"
      showDetails
      className={className}
    />
  )
}

// Helper component for icons only
export function ResourceAccessIcon({
  accessLevel,
  permissionSummary,
  size = 'md',
  className = ''
}: Pick<ResourceAccessIndicatorProps, 'accessLevel' | 'permissionSummary' | 'size' | 'className'>) {
  return (
    <ResourceAccessIndicator
      accessLevel={accessLevel}
      permissionSummary={permissionSummary}
      size={size}
      variant="icon"
      className={className}
    />
  )
}