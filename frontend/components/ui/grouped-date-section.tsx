'use client'

import { Calendar, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GroupedGameCard } from '@/components/ui/grouped-game-card'
import { type Game } from '@/lib/mock-data'

interface DateGroup {
  date: string
  games: Game[]
  totalRefs: number
}

interface GroupedDateSectionProps {
  dateGroup: DateGroup
  locationName: string
  isExpanded: boolean
  selectedGames: string[]
  onToggle: () => void
  onSelectAll: () => void
  onGameSelect: (gameId: string) => void
}

export function GroupedDateSection({
  dateGroup,
  locationName,
  isExpanded,
  selectedGames,
  onToggle,
  onSelectAll,
  onGameSelect
}: GroupedDateSectionProps) {
  const dateSelectedCount = dateGroup.games.filter(
    g => selectedGames.includes(g.id)
  ).length
  const allDateSelected = dateGroup.games.length > 0 && dateSelectedCount === dateGroup.games.length

  return (
    <div className="border rounded-lg overflow-hidden border-border">
      <div className="bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 flex-1 text-left hover:opacity-70 transition-opacity"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">
                {new Date(dateGroup.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {dateGroup.games.length} games • {dateGroup.totalRefs} referees needed
              </p>
            </div>
          </button>
          <div className="flex items-center space-x-2">
            {dateSelectedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {dateSelectedCount} selected
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onSelectAll()
              }}
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              {allDateSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-2 bg-card">
          {dateGroup.games.map((game) => (
            <GroupedGameCard
              key={game.id}
              game={game}
              isSelected={selectedGames.includes(game.id)}
              onSelect={onGameSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
