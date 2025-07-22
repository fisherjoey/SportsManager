"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, AlertCircle, Plus } from "lucide-react"
import { mockGames } from "@/lib/mock-data"

export function DashboardOverview() {
  const upcomingGames = mockGames
    .filter((game) => new Date(game.date) > new Date() && game.status === "assigned")
    .slice(0, 5)

  const unassignedGames = mockGames.filter((game) => game.status === "unassigned")
  const upForGrabsGames = mockGames.filter((game) => game.status === "up-for-grabs")

  const stats = [
    {
      title: "Total Games This Week",
      value: mockGames.filter((game) => {
        const gameDate = new Date(game.date)
        const now = new Date()
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return gameDate >= now && gameDate <= weekFromNow
      }).length,
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Unassigned Games",
      value: unassignedGames.length,
      icon: AlertCircle,
      color: "text-red-600",
    },
    {
      title: "Up for Grabs",
      value: upForGrabsGames.length,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      title: "Active Referees",
      value: 12,
      icon: Users,
      color: "text-green-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Game
        </Button>
      </div>

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
            <CardTitle>Upcoming Games</CardTitle>
            <CardDescription>Next 5 scheduled games</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {game.homeTeam.organization} {game.homeTeam.ageGroup} {game.homeTeam.gender} vs {game.awayTeam.organization} {game.awayTeam.ageGroup} {game.awayTeam.gender}
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>Games requiring immediate action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unassignedGames.slice(0, 5).map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200">
                  <div>
                    <p className="font-medium">
                      {game.homeTeam.organization} {game.homeTeam.ageGroup} {game.homeTeam.gender} vs {game.awayTeam.organization} {game.awayTeam.ageGroup} {game.awayTeam.gender}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.date).toLocaleDateString()} at {game.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">Unassigned</Badge>
                    <Button size="sm" className="mt-1">
                      Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
