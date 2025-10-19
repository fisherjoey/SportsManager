'use client'

import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { type Game } from '@/lib/mock-data'
import { formatTeamName } from '@/lib/team-utils'

interface GroupedGameCardProps {
  game: Game
  isSelected: boolean
  onSelect: (gameId: string) => void
}

export function GroupedGameCard({ game, isSelected, onSelect }: GroupedGameCardProps) {
  const homeTeamName = formatTeamName(game.homeTeam)
  const awayTeamName = formatTeamName(game.awayTeam)

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={() => onSelect(game.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {game.time || game.startTime}
                </div>
                {game.endTime && (
                  <div className="text-xs text-muted-foreground">
                    {game.endTime}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm truncate">
                  {homeTeamName} vs {awayTeamName}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {game.division}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {game.level}
                </Badge>
                <span className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {game.refsNeeded} refs
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                game.status === 'assigned'
                  ? 'default'
                  : game.status === 'up-for-grabs'
                    ? 'secondary'
                    : 'destructive'
              }
              className="text-xs"
            >
              {game.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
