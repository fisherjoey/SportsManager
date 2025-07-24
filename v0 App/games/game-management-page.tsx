"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Calendar, Clock, MapPin, Users, Edit, Trash2, Eye, Download, Upload } from "lucide-react"
import { mockGames, CMBA_ZONES, type CMBAZone, type DivisionType } from "@/lib/mock-data"
import { useNotifications } from "@/providers/notification-provider"

export function GameManagementPage() {
  const [games, setGames] = useState(mockGames)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZone, setSelectedZone] = useState<CMBAZone | "all">("all")
  const [selectedDivision, setSelectedDivision] = useState<DivisionType | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const { showToast } = useNotifications()

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesZone = selectedZone === "all" || game.zone === selectedZone
    const matchesDivision = selectedDivision === "all" || game.divisionType === selectedDivision
    const matchesStatus = selectedStatus === "all" || game.status === selectedStatus

    return matchesSearch && matchesZone && matchesDivision && matchesStatus
  })

  const handleDeleteGame = (gameId: string) => {
    setGames(games.filter((g) => g.id !== gameId))
    showToast("Game deleted", "The game has been removed from the system.")
  }

  const stats = [
    {
      title: "Total Games",
      value: games.length,
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Unassigned",
      value: games.filter((g) => g.status === "unassigned").length,
      icon: Clock,
      color: "text-red-600",
    },
    {
      title: "Assigned",
      value: games.filter((g) => g.status === "assigned").length,
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "This Week",
      value: games.filter((g) => {
        const gameDate = new Date(g.date)
        const now = new Date()
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return gameDate >= now && gameDate <= weekFromNow
      }).length,
      icon: Calendar,
      color: "text-purple-600",
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Game Management</h2>
          <p className="text-muted-foreground">Manage all CMBA games across zones and divisions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Game
          </Button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Game Directory</CardTitle>
          <CardDescription>Search and filter games across all zones and divisions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedZone} onValueChange={(value) => setSelectedZone(value as CMBAZone | "all")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {CMBA_ZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedDivision}
              onValueChange={(value) => setSelectedDivision(value as DivisionType | "all")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                <SelectItem value="Club">Club</SelectItem>
                <SelectItem value="REC">REC</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="up-for-grabs">Up for Grabs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Games Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Referees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {game.homeTeam} vs {game.awayTeam}
                        </p>
                        <p className="text-sm text-muted-foreground">{game.division}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{new Date(game.date).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {game.time} - {game.endTime}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                        {game.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">{game.divisionType}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {game.ageGroup} {game.gender}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{game.zone}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        {game.assignedReferees.length}/{game.requiredReferees}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          game.status === "assigned"
                            ? "default"
                            : game.status === "partial"
                              ? "secondary"
                              : game.status === "up-for-grabs"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {game.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGame(game.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
