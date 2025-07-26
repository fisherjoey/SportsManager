"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, AlertCircle, Plus, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"

interface Game {
  id: string
  homeTeam: string | {
    organization: string
    ageGroup: string
    gender: "Boys" | "Girls"
    rank: number
    name?: string
  }
  awayTeam: string | {
    organization: string
    ageGroup: string
    gender: "Boys" | "Girls"
    rank: number
    name?: string
  }
  date: string
  time?: string
  location: string
  level: "Recreational" | "Competitive" | "Elite"
  division?: string
  payRate: string | number
  status: "assigned" | "unassigned" | "up-for-grabs" | "completed" | "cancelled"
  assignments?: any[]
  createdAt: string
  updatedAt: string
}

const getTeamName = (team: any) => {
  if (typeof team === 'string') {
    return team || 'Team'
  }
  if (team && typeof team === 'object' && Object.keys(team).length > 0) {
    if (team.name) return team.name
    const parts = [team.organization, team.ageGroup, team.gender].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Team'
  }
  return 'Team'
}

export function DashboardOverview() {
  const [games, setGames] = useState<Game[]>([])
  const [refereeCount, setRefereeCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch games and referees in parallel using the correct API client methods
        const [gamesResponse, refereesResponse] = await Promise.all([
          apiClient.getGames().catch(err => {
            console.error('Games API error:', err)
            return { data: [] }
          }),
          apiClient.getReferees().catch(err => {
            console.error('Referees API error:', err)
            return { success: true, data: { referees: [] } }
          })
        ])
        
        console.log('Games response:', gamesResponse)
        console.log('Referees response:', refereesResponse)
        
        setGames(gamesResponse.data || [])
        setRefereeCount(refereesResponse.data?.referees?.length || 0)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setError(`Failed to load dashboard data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const upcomingGames = games
    .filter((game) => new Date(game.date) > new Date() && game.status === "assigned")
    .slice(0, 5)

  const unassignedGames = games.filter((game) => game.status === "unassigned")
  const upForGrabsGames = games.filter((game) => game.status === "up-for-grabs")

  const stats = [
    {
      title: "Total Games This Week",
      value: games.filter((game) => {
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
      value: refereeCount,
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
              {upcomingGames.map((game) => {
                const homeTeamName = getTeamName(game.homeTeam)
                const awayTeamName = getTeamName(game.awayTeam)
                
                return (
                  <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {homeTeamName} vs {awayTeamName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(game.date).toLocaleDateString()} at {game.time}
                      </p>
                      <p className="text-sm text-muted-foreground">{game.location}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{game.level}</Badge>
                      <p className="text-sm font-medium mt-1">${typeof game.payRate === 'string' ? game.payRate : game.payRate.toFixed(2)}</p>
                    </div>
                  </div>
                )
              })}
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
              {unassignedGames.slice(0, 5).map((game) => {
                const homeTeamName = getTeamName(game.homeTeam)
                const awayTeamName = getTeamName(game.awayTeam)
                
                return (
                  <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200">
                    <div>
                      <p className="font-medium">
                        {homeTeamName} vs {awayTeamName}
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
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
