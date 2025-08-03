'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarIcon, Calendar, Users, Clock, AlertTriangle, Sparkles } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { mockGames, Team } from '@/lib/mock-data'
import { useAuth } from '@/components/auth-provider'
import { formatTeamName } from '@/lib/team-utils'

interface CalendarViewProps {
  onDateClick?: (date: string) => void
}

export function CalendarView({ onDateClick }: CalendarViewProps) {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())

  const isAdmin = user?.role === 'admin'
  const relevantGames = isAdmin
    ? mockGames
    : mockGames.filter((game) => game.assignedReferees?.includes(user?.name || '') || game.status === 'up-for-grabs')

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getGamesForDate = (date: Date) => {
    return relevantGames.filter((game) => {
      const gameDate = new Date(game.date)
      return gameDate.toDateString() === date.toDateString()
    })
  }

  const getDailySummary = (date: Date) => {
    const gamesForDay = getGamesForDate(date)
    if (gamesForDay.length === 0) return null

    const startTimes = gamesForDay.map(game => game.startTime).sort()
    const endTimes = gamesForDay.map(game => game.endTime).sort()
    const assigned = gamesForDay.filter(game => game.status === 'assigned').length
    const unassigned = gamesForDay.filter(game => game.status === 'unassigned').length
    const upForGrabs = gamesForDay.filter(game => game.status === 'up-for-grabs').length

    return {
      totalGames: gamesForDay.length,
      startTime: startTimes[0],
      endTime: endTimes[endTimes.length - 1],
      assigned,
      unassigned,
      upForGrabs,
      needsAttention: unassigned > 0 || upForGrabs > 0
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-gray-200"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dailySummary = getDailySummary(date)
      const isToday = date.toDateString() === new Date().toDateString()

      const handleDayClick = () => {
        if (dailySummary && onDateClick) {
          onDateClick(date.toISOString().split('T')[0])
        }
      }

      days.push(
        <div 
          key={day} 
          className={`h-32 border border-gray-200 p-2 ${
            isToday ? 'bg-blue-50 border-blue-300' : ''
          } ${dailySummary?.needsAttention ? 'border-l-4 border-l-red-400' : ''} ${
            dailySummary && onDateClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
          }`}
          onClick={handleDayClick}
        >
          <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : ''}`}>{day}</div>
          {dailySummary ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">{dailySummary.totalGames} games</span>
                {dailySummary.needsAttention && (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                )}
              </div>
              <div className="text-xs text-gray-600">
                {dailySummary.startTime} - {dailySummary.endTime}
              </div>
              <div className="flex space-x-1">
                {dailySummary.assigned > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-700">
                    {dailySummary.assigned}✓
                  </Badge>
                )}
                {dailySummary.unassigned > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 bg-red-100 text-red-700">
                    {dailySummary.unassigned}!
                  </Badge>
                )}
                {dailySummary.upForGrabs > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-700">
                    {dailySummary.upForGrabs}?
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">No games</div>
          )}
        </div>,
      )
    }

    return days
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <PageLayout>
      <PageHeader
        icon={Calendar}
        title="Game Calendar"
        description={isAdmin ? 'Overview of all scheduled games and assignments' : 'Your game assignments and available opportunities'}
      >
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Sparkles className="h-3 w-3 mr-1" />
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Badge>
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                relevantGames.filter((game) => {
                  const gameDate = new Date(game.date)
                  return (
                    gameDate.getMonth() === currentDate.getMonth() &&
                    gameDate.getFullYear() === currentDate.getFullYear()
                  )
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">games scheduled this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                relevantGames.filter((game) => {
                  const gameDate = new Date(game.date)
                  return (
                    gameDate.getMonth() === currentDate.getMonth() &&
                    gameDate.getFullYear() === currentDate.getFullYear() &&
                    game.status === 'assigned'
                  )
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">games with referees assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                relevantGames.filter((game) => {
                  const gameDate = new Date(game.date)
                  return (
                    gameDate.getMonth() === currentDate.getMonth() &&
                    gameDate.getFullYear() === currentDate.getFullYear() &&
                    game.status === 'up-for-grabs'
                  )
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">games available for pickup</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                relevantGames.filter((game) => {
                  const gameDate = new Date(game.date)
                  return (
                    gameDate.getMonth() === currentDate.getMonth() &&
                    gameDate.getFullYear() === currentDate.getFullYear() &&
                    game.status === 'unassigned'
                  )
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">games needing referees</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
            Interactive Calendar
          </CardTitle>
          <CardDescription>
            {isAdmin ? 'All games across the organization with assignment status' : 'Your assigned games and opportunities for additional work'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0 border border-gray-200">
            {dayNames.map((day) => (
              <div
                key={day}
                className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-center font-medium text-sm"
              >
                {day}
              </div>
            ))}
            {renderCalendarDays()}
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium text-gray-700">Legend:</div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-700">3✓</Badge>
                <span>Assigned games</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-700">2?</Badge>
                <span>Up for grabs</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs px-1 py-0 bg-red-100 text-red-700">1!</Badge>
                <span>Unassigned</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1 h-4 bg-red-400"></div>
                <span>Needs attention</span>
              </div>
              {onDateClick && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Clock className="h-3 w-3" />
                  <span>Click days with games to view details</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
