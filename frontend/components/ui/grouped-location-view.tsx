'use client'

import { MapPin, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GroupedDateSection } from '@/components/ui/grouped-date-section'
import { type Game } from '@/lib/mock-data'

interface DateGroup {
  date: string
  games: Game[]
  totalRefs: number
}

interface LocationGroup {
  location: string
  dates: DateGroup[]
  totalGames: number
  totalRefs: number
}

interface GroupedLocationViewProps {
  locationGroup: LocationGroup
  isExpanded: boolean
  selectedGames: string[]
  expandedDates: Set<string>
  onToggleLocation: () => void
  onToggleDate: (dateKey: string) => void
  onSelectAllInLocation: () => void
  onSelectAllInDate: (location: string, date: string) => void
  onGameSelect: (gameId: string) => void
}

export function GroupedLocationView({
  locationGroup,
  isExpanded,
  selectedGames,
  expandedDates,
  onToggleLocation,
  onToggleDate,
  onSelectAllInLocation,
  onSelectAllInDate,
  onGameSelect
}: GroupedLocationViewProps) {
  const allLocationGames = locationGroup.dates.flatMap(d => d.games)
  const locationSelectedCount = allLocationGames.filter(g => selectedGames.includes(g.id)).length
  const allLocationSelected = allLocationGames.length > 0 && locationSelectedCount === allLocationGames.length

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleLocation}
            className="flex items-center gap-3 flex-1 text-left hover:opacity-70 transition-opacity"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-primary" />
            ) : (
              <ChevronRight className="h-5 w-5 text-primary" />
            )}
            <MapPin className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <CardTitle className="text-lg">{locationGroup.location}</CardTitle>
              <CardDescription>
                {locationGroup.totalGames} games • {locationGroup.totalRefs} referees needed
                {locationGroup.dates.length > 1 && ` • ${locationGroup.dates.length} dates`}
              </CardDescription>
            </div>
          </button>
          <div className="flex items-center space-x-2">
            {locationSelectedCount > 0 && (
              <Badge variant="secondary">
                {locationSelectedCount} selected
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onSelectAllInLocation()
              }}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {allLocationSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {locationGroup.dates.map((dateGroup) => {
            const dateKey = `${locationGroup.location}-${dateGroup.date}`
            const isDateExpanded = expandedDates.has(dateKey)

            return (
              <GroupedDateSection
                key={dateKey}
                dateGroup={dateGroup}
                locationName={locationGroup.location}
                isExpanded={isDateExpanded}
                selectedGames={selectedGames}
                onToggle={() => onToggleDate(dateKey)}
                onSelectAll={() => onSelectAllInDate(locationGroup.location, dateGroup.date)}
                onGameSelect={onGameSelect}
              />
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
