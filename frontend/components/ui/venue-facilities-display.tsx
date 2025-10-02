'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface VenueFacilitiesDisplayProps {
  facilities: string[] | string
  maxVisible?: number
  className?: string
}

export function VenueFacilitiesDisplay({
  facilities,
  maxVisible = 2,
  className
}: VenueFacilitiesDisplayProps) {
  // Parse facilities if it's a JSON string
  const facilitiesArray = Array.isArray(facilities)
    ? facilities
    : facilities
    ? (() => {
        try {
          return JSON.parse(facilities)
        } catch {
          return []
        }
      })()
    : []

  if (!facilitiesArray || facilitiesArray.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No facilities listed
      </div>
    )
  }

  const visibleFacilities = facilitiesArray.slice(0, maxVisible)
  const hiddenFacilities = facilitiesArray.slice(maxVisible)
  const hasMore = hiddenFacilities.length > 0

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleFacilities.map((facility, idx) => (
        <Badge key={idx} variant="outline" className="text-xs">
          {facility}
        </Badge>
      ))}
      {hasMore && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                +{hiddenFacilities.length} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium text-xs">All Facilities:</p>
                <div className="flex flex-wrap gap-1">
                  {facilitiesArray.map((facility, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {facility}
                    </Badge>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
