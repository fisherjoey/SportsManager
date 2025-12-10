'use client'

import { Users, ParkingMeterIcon as Parking } from 'lucide-react'

import { cn } from '@/lib/utils'

interface VenueCapacityDisplayProps {
  capacity?: number | string
  parkingSpaces?: number | string
  className?: string
  layout?: 'row' | 'column'
}

export function VenueCapacityDisplay({
  capacity,
  parkingSpaces,
  className,
  layout = 'row'
}: VenueCapacityDisplayProps) {
  const hasCapacity = capacity !== undefined && capacity !== null && capacity !== ''
  const hasParking = parkingSpaces !== undefined && parkingSpaces !== null && parkingSpaces !== ''

  if (!hasCapacity && !hasParking) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Not specified
      </div>
    )
  }

  if (layout === 'column') {
    return (
      <div className={cn('space-y-2', className)}>
        {hasCapacity && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              <span className="font-medium">{capacity}</span>
              <span className="text-muted-foreground ml-1">capacity</span>
            </span>
          </div>
        )}
        {hasParking && (
          <div className="flex items-center gap-2 text-sm">
            <Parking className="h-4 w-4 text-muted-foreground" />
            <span>
              <span className="font-medium">{parkingSpaces}</span>
              <span className="text-muted-foreground ml-1">parking</span>
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      {hasCapacity && (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="whitespace-nowrap">
            <span className="font-medium">{capacity}</span>
            <span className="text-muted-foreground ml-1">capacity</span>
          </span>
        </div>
      )}
      {hasCapacity && hasParking && (
        <span className="text-muted-foreground">•</span>
      )}
      {hasParking && (
        <div className="flex items-center gap-1.5">
          <Parking className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="whitespace-nowrap">
            <span className="font-medium">{parkingSpaces}</span>
            <span className="text-muted-foreground ml-1">parking</span>
          </span>
        </div>
      )}
    </div>
  )
}
