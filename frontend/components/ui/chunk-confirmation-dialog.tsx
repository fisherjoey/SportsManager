'use client'

import { AlertTriangle, MapPin, Calendar } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'

interface ChunkWarning {
  type: 'mixed-location' | 'mixed-date' | 'mixed-both'
  locations: string[]
  dates: string[]
  gameCount: number
}

interface ChunkConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warning: ChunkWarning | null
  onConfirm: () => void
}

export function ChunkConfirmationDialog({
  open,
  onOpenChange,
  warning,
  onConfirm
}: ChunkConfirmationDialogProps) {
  if (!warning) return null

  const getTitle = () => {
    if (warning.type === 'mixed-both') return 'Mixed Locations and Dates'
    if (warning.type === 'mixed-location') return 'Multiple Locations'
    return 'Multiple Dates'
  }

  const getDescription = () => {
    if (warning.type === 'mixed-both') {
      return `You're creating a chunk with ${warning.gameCount} games across ${warning.locations.length} different locations and ${warning.dates.length} different dates. This may make it difficult to assign to a single referee.`
    }
    if (warning.type === 'mixed-location') {
      return `You're creating a chunk with ${warning.gameCount} games across ${warning.locations.length} different locations. This may make it difficult to assign to a single referee.`
    }
    return `You're creating a chunk with ${warning.gameCount} games across ${warning.dates.length} different dates. This may make it difficult to assign to a single referee.`
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{getDescription()}</p>

            <div className="space-y-3 p-3 bg-muted rounded-lg">
              {(warning.type === 'mixed-location' || warning.type === 'mixed-both') && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Locations:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {warning.locations.map((location) => (
                      <Badge key={location} variant="outline">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(warning.type === 'mixed-date' || warning.type === 'mixed-both') && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Dates:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {warning.dates.map((date) => (
                      <Badge key={date} variant="outline">
                        {new Date(date).toLocaleDateString()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Are you sure you want to create this chunk?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
          >
            Create Chunk Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
