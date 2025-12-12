'use client'

import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  ChevronDown, 
  ChevronRight, 
  User, 
  Clock, 
  Monitor,
  MapPin,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Diff
} from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AuditLogEntry as AuditEntry, ACTION_CONFIG } from '@/lib/types/audit'

interface AuditLogEntryProps {
  entry: AuditEntry
  showFullDetails?: boolean
  onUserClick?: (userId: string) => void
  onResourceClick?: (resourceType: string, resourceId: string) => void
  className?: string
}

export function AuditLogEntry({
  entry,
  showFullDetails = false,
  onUserClick,
  onResourceClick,
  className = ''
}: AuditLogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(showFullDetails)
  const actionConfig = ACTION_CONFIG[entry.action]
  const ActionIcon = (() => {
    try {
      return require('lucide-react')[actionConfig.icon] || Monitor
    } catch {
      return Monitor
    }
  })()

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: date.toLocaleString()
    }
  }

  const renderDiff = () => {
    if (!entry.diff) return null

    const { added, removed, modified } = entry.diff

    return (
      <div className="space-y-3">
        {Object.keys(added).length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Added Fields
            </h5>
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
              <pre className="text-xs text-emerald-800 whitespace-pre-wrap">
                {JSON.stringify(added, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {Object.keys(removed).length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Removed Fields
            </h5>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <pre className="text-xs text-red-800 whitespace-pre-wrap">
                {JSON.stringify(removed, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {Object.keys(modified).length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-orange-700 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Modified Fields
            </h5>
            <div className="space-y-2">
              {Object.entries(modified).map(([field, changes]) => (
                <div key={field} className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <div className="font-medium text-xs text-orange-800 mb-2">{field}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-red-600 font-medium mb-1">Previous Value</div>
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <pre className="text-xs text-red-800 whitespace-pre-wrap">
                          {typeof changes.old === 'object' 
                            ? JSON.stringify(changes.old, null, 2)
                            : String(changes.old)
                          }
                        </pre>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-emerald-600 font-medium mb-1">New Value</div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                        <pre className="text-xs text-emerald-800 whitespace-pre-wrap">
                          {typeof changes.new === 'object' 
                            ? JSON.stringify(changes.new, null, 2)
                            : String(changes.new)
                          }
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderMetadata = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-muted-foreground">
      {entry.ip_address && (
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span>IP: {entry.ip_address}</span>
        </div>
      )}
      
      {entry.session_id && (
        <div className="flex items-center gap-2">
          <Monitor className="w-3 h-3" />
          <span>Session: {entry.session_id.substring(0, 8)}...</span>
        </div>
      )}

      {entry.user_agent && (
        <div className="flex items-center gap-2" title={entry.user_agent}>
          <Monitor className="w-3 h-3" />
          <span className="truncate">
            {entry.user_agent.substring(0, 30)}
            {entry.user_agent.length > 30 ? '...' : ''}
          </span>
        </div>
      )}
    </div>
  )

  const timeInfo = formatTimestamp(entry.timestamp)

  return (
    <TooltipProvider>
      <Card className={`transition-colors ${className} ${!entry.success ? 'border-red-200 bg-red-50/30' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* User Avatar */}
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={entry.user?.avatar} alt={entry.user?.name} />
                <AvatarFallback className="text-xs">
                  {entry.user?.name ? entry.user.name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant="outline" 
                    className={`${actionConfig.color} text-xs font-medium`}
                  >
                    <ActionIcon className="w-3 h-3 mr-1" />
                    {actionConfig.label}
                  </Badge>
                  
                  {!entry.success && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}

                  {entry.category && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.category}
                    </Badge>
                  )}
                </div>

                <div className="text-sm text-foreground mb-1">
                  <button
                    onClick={() => onUserClick?.(entry.user_id)}
                    className="font-medium hover:underline text-blue-600"
                  >
                    {entry.user?.name || 'Unknown User'}
                  </button>
                  <span className="mx-2 text-muted-foreground">
                    {actionConfig.description.toLowerCase()}
                  </span>
                  {entry.resource_name && (
                    <button
                      onClick={() => onResourceClick?.(entry.resource_type, entry.resource_id)}
                      className="font-medium hover:underline text-blue-600"
                    >
                      {entry.resource_name}
                    </button>
                  )}
                </div>

                {entry.description && (
                  <p className="text-sm text-muted-foreground mb-2">{entry.description}</p>
                )}

                {!entry.success && entry.error_message && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {entry.error_message}
                  </div>
                )}
              </div>
            </div>

            {/* Timestamp and Expand Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeInfo.relative}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{timeInfo.absolute}</TooltipContent>
              </Tooltip>

              {(entry.details || entry.diff || entry.old_values || entry.new_values) && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>
          </div>
        </CardHeader>

        {(entry.details || entry.diff || entry.old_values || entry.new_values) && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Separator className="mb-4" />

                <div className="space-y-4">
                  {/* Change Diff */}
                  {entry.diff && (
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Diff className="w-4 h-4" />
                        Changes
                      </h4>
                      {renderDiff()}
                    </div>
                  )}

                  {/* Details */}
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Additional Details</h4>
                      <div className="bg-muted/50 rounded-md p-3">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Old/New Values (fallback if no diff) */}
                  {!entry.diff && (entry.old_values || entry.new_values) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {entry.old_values && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-red-700">Previous Values</h4>
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <pre className="text-xs text-red-800 whitespace-pre-wrap overflow-auto">
                              {JSON.stringify(entry.old_values, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {entry.new_values && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-emerald-700">New Values</h4>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                            <pre className="text-xs text-emerald-800 whitespace-pre-wrap overflow-auto">
                              {JSON.stringify(entry.new_values, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div>
                    <Separator className="mb-3" />
                    {renderMetadata()}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>
    </TooltipProvider>
  )
}

// Compact version for table rows
export function AuditLogEntryCompact({
  entry,
  onUserClick,
  onResourceClick,
  className = ''
}: AuditLogEntryProps) {
  const actionConfig = ACTION_CONFIG[entry.action]
  const ActionIcon = (() => {
    try {
      return require('lucide-react')[actionConfig.icon] || Monitor
    } catch {
      return Monitor
    }
  })()
  const timeInfo = formatTimestamp(entry.timestamp)

  return (
    <div className={`flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors ${className}`}>
      {/* Status Indicator */}
      <div className="flex-shrink-0">
        {entry.success ? (
          <CheckCircle className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-600" />
        )}
      </div>

      {/* User Avatar */}
      <Avatar className="w-6 h-6 flex-shrink-0">
        <AvatarImage src={entry.user?.avatar} alt={entry.user?.name} />
        <AvatarFallback className="text-xs">
          {entry.user?.name ? entry.user.name.charAt(0).toUpperCase() : 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Action Badge */}
      <Badge variant="outline" className={`${actionConfig.color} text-xs`}>
        <ActionIcon className="w-3 h-3 mr-1" />
        {actionConfig.label}
      </Badge>

      {/* Description */}
      <div className="flex-1 min-w-0 text-sm">
        <button
          onClick={() => onUserClick?.(entry.user_id)}
          className="font-medium hover:underline text-blue-600"
        >
          {entry.user?.name || 'Unknown User'}
        </button>
        <span className="mx-1 text-muted-foreground">
          {actionConfig.description.toLowerCase()}
        </span>
        {entry.resource_name && (
          <button
            onClick={() => onResourceClick?.(entry.resource_type, entry.resource_id)}
            className="font-medium hover:underline text-blue-600 truncate"
          >
            {entry.resource_name}
          </button>
        )}
      </div>

      {/* Timestamp */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {timeInfo.relative}
            </div>
          </TooltipTrigger>
          <TooltipContent>{timeInfo.absolute}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}