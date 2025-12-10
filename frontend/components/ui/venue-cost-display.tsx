'use client'

import { DollarSign } from 'lucide-react'

import { cn } from '@/lib/utils'

interface VenueCostDisplayProps {
  hourlyRate?: number | string
  gameRate?: number | string
  costNotes?: string
  className?: string
  layout?: 'row' | 'column'
}

export function VenueCostDisplay({
  hourlyRate,
  gameRate,
  costNotes,
  className,
  layout = 'column'
}: VenueCostDisplayProps) {
  const hasHourlyRate = hourlyRate !== undefined && hourlyRate !== null && hourlyRate !== ''
  const hasGameRate = gameRate !== undefined && gameRate !== null && gameRate !== ''
  const hasPricing = hasHourlyRate || hasGameRate

  if (!hasPricing) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Contact for pricing
      </div>
    )
  }

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return numPrice.toFixed(2)
  }

  if (layout === 'row') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          {hasHourlyRate && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span className="font-medium">${formatPrice(hourlyRate)}</span>
              <span className="text-muted-foreground">/hr</span>
            </div>
          )}
          {hasHourlyRate && hasGameRate && (
            <span className="text-muted-foreground">•</span>
          )}
          {hasGameRate && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="font-medium">${formatPrice(gameRate)}</span>
              <span className="text-muted-foreground">/game</span>
            </div>
          )}
        </div>
        {costNotes && (
          <div className="text-xs text-muted-foreground italic">
            {costNotes}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {hasHourlyRate && (
        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="h-3.5 w-3.5 text-green-600 shrink-0" />
          <span className="font-medium">${formatPrice(hourlyRate)}</span>
          <span className="text-muted-foreground">/hr</span>
        </div>
      )}
      {hasGameRate && (
        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="font-medium">${formatPrice(gameRate)}</span>
          <span className="text-muted-foreground">/game</span>
        </div>
      )}
      {costNotes && (
        <div className="text-xs text-muted-foreground italic pt-0.5">
          {costNotes}
        </div>
      )}
    </div>
  )
}
