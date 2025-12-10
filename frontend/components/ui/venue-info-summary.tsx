'use client'

import { Building } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface VenueInfoSummaryProps {
  name: string
  city?: string
  province?: string
  isActive?: boolean
  className?: string
  showStatus?: boolean
}

export function VenueInfoSummary({
  name,
  city,
  province,
  isActive = true,
  className,
  showStatus = false
}: VenueInfoSummaryProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-base truncate">{name}</div>
        {(city || province) && (
          <div className="text-sm text-muted-foreground truncate">
            {city}
            {city && province && ', '}
            {province}
          </div>
        )}
      </div>
      {showStatus && (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className="shrink-0"
        >
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )}
    </div>
  )
}
