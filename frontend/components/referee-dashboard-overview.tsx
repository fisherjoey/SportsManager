'use client'

import { useState } from 'react'
import { Calendar, Clock, DollarSign, MapPin, User, CheckCircle, CalendarClock, Trophy, ChevronDown } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatsGrid } from '@/components/ui/stats-grid'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { mockGames, Team } from '@/lib/mock-data'
import { useAuth } from '@/components/auth-provider'
import { formatTeamName } from '@/lib/team-utils'

export function RefereeDashboardOverview() {
  const { user } = useAuth()
  const [myGamesOpen, setMyGamesOpen] = useState(true)
  const [availableGamesOpen, setAvailableGamesOpen] = useState(true)

  const handleQuickNavigation = (view: string) => {
    // This would normally navigate to the specific view
    // For now, we'll just log it
    console.log(`Navigating to: ${view}`)
  }

  const myAssignments = mockGames.filter((game) => game.assignedReferees?.includes(user?.name || ''))

  const upcomingAssignments = myAssignments.filter((game) => new Date(game.date) > new Date()).slice(0, 3)

  const availableGames = mockGames.filter((game) => game.status === 'up-for-grabs').slice(0, 3)

  const thisWeekEarnings = myAssignments
    .filter((game) => {
      const gameDate = new Date(game.date)
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return gameDate >= now && gameDate <= weekFromNow
    })
    .reduce((total, game) => total + game.payRate, 0)

  const gamesThisMonth = myAssignments.filter((game) => {
    const gameDate = new Date(game.date)
    const now = new Date()
    return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear()
  }).length

  const stats = [
    {
      title: 'Upcoming Games',
      value: upcomingAssignments.length,
      icon: Calendar,
      color: 'info',
      subtitle: 'Games assigned to you',
      change: {
        value: 12,
        trend: 'positive' as const
      }
    },
    {
      title: 'This Week Earnings',
      value: `$${thisWeekEarnings}`,
      icon: DollarSign,
      color: 'success',
      subtitle: 'Projected earnings',
      change: {
        value: 15,
        trend: 'positive' as const
      }
    },
    {
      title: 'Available Games',
      value: availableGames.length,
      icon: Clock,
      color: 'warning',
      subtitle: 'Games you can pick up',
      change: {
        value: -5,
        trend: 'negative' as const
      }
    },
    {
      title: 'Games This Month',
      value: gamesThisMonth,
      icon: Trophy,
      color: 'primary',
      subtitle: 'Monthly assignments',
      change: {
        value: 8,
        trend: 'positive' as const
      }
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={User}
        title={`Welcome back, ${user?.name}!`}
        description="Here's what's happening with your assignments"
      />

      {/* Stats Grid with staggered animations */}
      <div className="animate-slide-up">
        <StatsGrid items={stats} columns={4} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card variant="interactive" className="animate-slide-up [animation-delay:100ms]">
          <Collapsible open={myGamesOpen} onOpenChange={setMyGamesOpen}>
            <CardHeader>
              <CollapsibleTrigger className="flex items-center justify-between w-full md:cursor-default">
                <div>
                  <CardTitle className="text-left">My Upcoming Games</CardTitle>
                  <CardDescription className="text-left">Your next assigned games</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform md:hidden ${myGamesOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAssignments.map((game, index) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 border rounded-lg animate-fade-in hover:shadow-md transition-shadow cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                  <div>
                    <p className="font-medium">
                      {formatTeamName(game.homeTeam)} vs {formatTeamName(game.awayTeam)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.date).toLocaleDateString()} at {game.time}
                    </p>
                    <p className="text-sm text-muted-foreground">{game.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{game.level}</Badge>
                    <p className="text-sm font-medium mt-1">${game.payRate}</p>
                  </div>
                </div>
              ))}
              {upcomingAssignments.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No upcoming assignments</p>
              )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card variant="interactive" className="animate-slide-up [animation-delay:200ms]">
          <Collapsible open={availableGamesOpen} onOpenChange={setAvailableGamesOpen}>
            <CardHeader>
              <CollapsibleTrigger className="flex items-center justify-between w-full md:cursor-default">
                <div>
                  <CardTitle className="text-left flex items-center gap-2">
                    Available Games
                    {availableGames.length > 0 && (
                      <Badge variant="success" dot dotColor="success" pulse>
                        {availableGames.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-left">Games you can pick up</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform md:hidden ${availableGamesOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {availableGames.map((game, index) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 border rounded-lg border-emerald-200 animate-fade-in hover:shadow-md transition-shadow cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                  <div>
                    <p className="font-medium">
                      {formatTeamName(game.homeTeam)} vs {formatTeamName(game.awayTeam)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.date).toLocaleDateString()} at {game.time}
                    </p>
                    <p className="text-sm text-muted-foreground">{game.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-emerald-600 border-green-600">
                      Available
                    </Badge>
                    <p className="text-sm font-medium mt-1">${game.payRate}</p>
                    <Button size="sm" className="mt-1">
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
              {availableGames.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No available games</p>
              )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </PageLayout>
  )
}
