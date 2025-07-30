"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, DollarSign, MapPin, User } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { mockGames, Team } from "@/lib/mock-data"
import { useAuth } from "@/components/auth-provider"
import { formatTeamName } from "@/lib/team-utils"

export function RefereeDashboardOverview() {
  const { user } = useAuth()

  const myAssignments = mockGames.filter((game) => game.assignedReferees?.includes(user?.name || ""))

  const upcomingAssignments = myAssignments.filter((game) => new Date(game.date) > new Date()).slice(0, 3)

  const availableGames = mockGames.filter((game) => game.status === "up-for-grabs").slice(0, 3)

  const thisWeekEarnings = myAssignments
    .filter((game) => {
      const gameDate = new Date(game.date)
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return gameDate >= now && gameDate <= weekFromNow
    })
    .reduce((total, game) => total + game.payRate, 0)

  const stats = [
    {
      title: "Upcoming Games",
      value: upcomingAssignments.length,
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "This Week Earnings",
      value: `$${thisWeekEarnings}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Available Games",
      value: availableGames.length,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      title: "Games This Month",
      value: myAssignments.filter((game) => {
        const gameDate = new Date(game.date)
        const now = new Date()
        return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear()
      }).length,
      icon: MapPin,
      color: "text-purple-600",
    },
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={User}
        title={`Welcome back, ${user?.name}!`}
        description="Here's what's happening with your assignments"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Upcoming Games</CardTitle>
            <CardDescription>Your next assigned games</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAssignments.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Games</CardTitle>
            <CardDescription>Games you can pick up</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg border-green-200">
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
                    <Badge variant="outline" className="text-green-600 border-green-600">
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
        </Card>
      </div>
    </PageLayout>
  )
}
