"use client"

import { MapPin, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateGoogleMapsURL, buildFullAddress } from '@/lib/maps'
import { useDistance } from '@/hooks/use-distance'
import { cn } from '@/lib/utils'

interface LocationWithDistanceProps {
  location: string
  address?: string
  city?: string
  province?: string
  postalCode?: string
  userLocation?: string
  showDistance?: boolean
  showMapLink?: boolean
  className?: string
  compact?: boolean
}

export function LocationWithDistance({
  location,
  address,
  city,
  province,
  postalCode,
  userLocation,
  showDistance = true,
  showMapLink = true,
  className,
  compact = false,
}: LocationWithDistanceProps) {
  // Build full address for distance calculation
  const fullAddress = address && city 
    ? buildFullAddress(address, city, province, postalCode)
    : location

  const { distance, loading, error } = useDistance(fullAddress, {
    enabled: showDistance,
    userLocation,
  })

  const handleOpenMaps = () => {
    const url = generateGoogleMapsURL(fullAddress)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate">{location}</span>
        
        {showDistance && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {distance && !loading && (
              <span>• {distance.duration}</span>
            )}
          </div>
        )}
        
        {showMapLink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenMaps}
            className="h-6 w-6 p-0 shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium">{location}</div>
          {address && (
            <div className="text-sm text-muted-foreground">
              {buildFullAddress(address, city || '', province, postalCode)}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 ml-6">
        {showDistance && (
          <div className="flex items-center gap-2 text-sm">
            {loading && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Calculating...</span>
              </div>
            )}
            
            {distance && !loading && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>{distance.distance}</span>
                <span>•</span>
                <span className="font-medium text-foreground">{distance.duration} drive</span>
              </div>
            )}
            
            {error && !loading && (
              <span className="text-xs text-muted-foreground">
                Distance unavailable
              </span>
            )}
          </div>
        )}

        {showMapLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenMaps}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Open in Maps
          </Button>
        )}
      </div>
    </div>
  )
}