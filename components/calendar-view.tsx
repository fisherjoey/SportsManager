"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { mockGames } from "@/lib/mock-data"
import { useAuth } from "@/components/auth-provider"

export function CalendarView() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())

  const isAdmin = user?.role === "admin"
  const relevantGames = isAdmin
    ? mockGames
    : mockGames.filter((game) => game.assignedReferees?.includes(user?.name || "") || game.status === "up-for-grabs")

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

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
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
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const gamesForDay = getGamesForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()

      days.push(
        <div key={day} className={`h-24 border border-gray-200 p-1 ${isToday ? "bg-blue-50 border-blue-300" : ""}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : ""}`}>{day}</div>
          <div className="space-y-1">
            {gamesForDay.slice(0, 2).map((game) => (
              <div
                key={game.id}
                className={`text-xs p-1 rounded truncate ${
                  game.status === "assigned"
                    ? "bg-green-100 text-green-800"
                    : game.status === "up-for-grabs"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-red-100 text-red-800"
                }`}
                title={`${game.homeTeam} vs ${game.awayTeam} at ${game.time}`}
              >
                {game.homeTeam} vs {game.awayTeam}
              </div>
            ))}
            {gamesForDay.length > 2 && <div className="text-xs text-gray-500">+{gamesForDay.length - 2} more</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold min-w-[200px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
            <p className="text-xs text-muted-foreground">games scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Badge variant="secondary" className="h-4 w-4 p-0"></Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                relevantGames.filter((game) => {
                  const gameDate = new Date(game.date)
                  return (
                    gameDate.getMonth() === currentDate.getMonth() &&
                    gameDate.getFullYear() === currentDate.getFullYear() &&
                    game.status === "assigned"
                  )
                }).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Badge variant="outline" className="h-4 w-4 p-0 border-orange-600"></Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {
                relevantGames.filter((game) => {
                  const gameDate = new Date(game.date)
                  return (
                    gameDate.getMonth() === currentDate.getMonth() &&
                    gameDate.getFullYear() === currentDate.getFullYear() &&
                    game.status === "up-for-grabs"
                  )
                }).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Badge variant="destructive" className="h-4 w-4 p-0"></Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                relevantGames.filter((game) => {
                  const gameDate = new Date(game.date)
                  return (
                    gameDate.getMonth() === currentDate.getMonth() &&
                    gameDate.getFullYear() === currentDate.getFullYear() &&
                    game.status === "unassigned"
                  )
                }).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>
            {isAdmin ? "All games in the system" : "Your assignments and available games"}
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

          <div className="mt-4 flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Assigned</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Unassigned</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
