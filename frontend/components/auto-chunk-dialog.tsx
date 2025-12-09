'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Layers, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AutoChunkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (params: AutoChunkParams) => void
  availableLocations: string[]
  availableLeagues: string[]
}

export interface AutoChunkParams {
  dateRange: {
    start_date: string
    end_date: string
  }
  locations: string[]
  leagues: string[]
  criteria: {
    group_by: 'location_date' | 'date_only' | 'league_date'
    min_games: number
    max_games: number
    max_time_gap: number
  }
}

export function AutoChunkDialog({
  open,
  onOpenChange,
  onConfirm,
  availableLocations,
  availableLeagues,
}: AutoChunkDialogProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<'location_date' | 'date_only' | 'league_date'>('location_date')
  const [minGames, setMinGames] = useState(2)
  const [maxGames, setMaxGames] = useState(10)
  const [maxTimeGap, setMaxTimeGap] = useState(180)

  // Set default date to today
  useEffect(() => {
    if (open && !startDate) {
      const today = new Date().toISOString().split('T')[0]
      setStartDate(today)
      setEndDate(today)
    }
  }, [open, startDate])

  // Select all locations by default
  useEffect(() => {
    if (open && selectedLocations.length === 0 && availableLocations.length > 0) {
      setSelectedLocations(availableLocations)
    }
  }, [open, availableLocations, selectedLocations.length])

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location]
    )
  }

  const toggleAllLocations = () => {
    setSelectedLocations((prev) =>
      prev.length === availableLocations.length ? [] : availableLocations
    )
  }

  const handleConfirm = () => {
    const params: AutoChunkParams = {
      dateRange: {
        start_date: startDate,
        end_date: endDate,
      },
      locations: selectedLocations,
      leagues: selectedLeagues.length > 0 ? selectedLeagues : availableLeagues,
      criteria: {
        group_by: groupBy,
        min_games: minGames,
        max_games: maxGames,
        max_time_gap: maxTimeGap,
      },
    }
    onConfirm(params)
  }

  const isValid = startDate && endDate && selectedLocations.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Auto-Create Chunks
          </DialogTitle>
          <DialogDescription>
            Automatically group unassigned games into chunks for easier bulk assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Date Range</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Locations</Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllLocations}
              >
                {selectedLocations.length === availableLocations.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-md p-3">
              {availableLocations.map((location) => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox
                    id={`location-${location}`}
                    checked={selectedLocations.includes(location)}
                    onCheckedChange={() => toggleLocation(location)}
                  />
                  <label
                    htmlFor={`location-${location}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {location}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Selected: {selectedLocations.length} of {availableLocations.length}
            </p>
          </div>

          {/* Chunking Strategy */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Chunking Strategy</Label>

            <div className="space-y-2">
              <Label htmlFor="group-by">Group By</Label>
              <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                <SelectTrigger id="group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location_date">
                    Location + Date
                    <span className="text-xs text-muted-foreground ml-2">
                      (Same venue, same day)
                    </span>
                  </SelectItem>
                  <SelectItem value="date_only">
                    Date Only
                    <span className="text-xs text-muted-foreground ml-2">
                      (Any location, same day)
                    </span>
                  </SelectItem>
                  <SelectItem value="league_date">
                    League + Date
                    <span className="text-xs text-muted-foreground ml-2">
                      (Same league, same day)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-games">Minimum Games</Label>
                <Select
                  value={minGames.toString()}
                  onValueChange={(value) => setMinGames(parseInt(value))}
                >
                  <SelectTrigger id="min-games">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} game{n !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-games">Maximum Games</Label>
                <Select
                  value={maxGames.toString()}
                  onValueChange={(value) => setMaxGames(parseInt(value))}
                >
                  <SelectTrigger id="max-games">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} games
                      </SelectItem>
                    ))}
                    <SelectItem value="999">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-time-gap">Maximum Time Gap</Label>
              <Select
                value={maxTimeGap.toString()}
                onValueChange={(value) => setMaxTimeGap(parseInt(value))}
              >
                <SelectTrigger id="max-time-gap">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">How Auto-Chunk Works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Only unassigned games will be chunked</li>
                    <li>Games must be on the same date</li>
                    <li>Games must be within the time gap specified</li>
                    <li>You can assign referees to entire chunks quickly</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Create Chunks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
