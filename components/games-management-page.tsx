"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterableTable, type ColumnDef } from "@/components/ui/filterable-table"
import { Search, Plus, Calendar, Clock, MapPin, Users, Edit, Trash2, Eye, Download, Upload } from "lucide-react"
import { mockGames, type Game } from "@/lib/mock-data"
import { useToast } from "@/components/ui/use-toast"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"

interface GamesManagementPageProps {
  initialDateFilter?: string
}

export function GamesManagementPage({ initialDateFilter }: GamesManagementPageProps = {}) {
  const [games, setGames] = useState<Game[]>(mockGames)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>(initialDateFilter || "all")
  const { toast } = useToast()

  // Update date filter when initialDateFilter prop changes
  useEffect(() => {
    if (initialDateFilter) {
      setSelectedDate(initialDateFilter)
    }
  }, [initialDateFilter])

  const filteredGames = games.filter((game) => {
    const homeTeamName = typeof game.homeTeam === 'object' 
      ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
      : game.homeTeam
    const awayTeamName = typeof game.awayTeam === 'object' 
      ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
      : game.awayTeam

    const matchesSearch =
      homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      awayTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = selectedLevel === "all" || game.level === selectedLevel
    const matchesStatus = selectedStatus === "all" || game.status === selectedStatus
    const matchesDate = selectedDate === "all" || game.date === selectedDate

    return matchesSearch && matchesLevel && matchesStatus && matchesDate
  })

  const handleDeleteGame = (gameId: string) => {
    setGames(games.filter((g) => g.id !== gameId))
    toast({
      title: "Game deleted",
      description: "The game has been removed from the system.",
    })
  }

  const stats = [
    {
      title: selectedDate !== "all" ? "Games This Day" : "Total Games",
      value: filteredGames.length,
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Unassigned",
      value: filteredGames.filter((g) => g.status === "unassigned").length,
      icon: Clock,
      color: "text-red-600",
    },
    {
      title: "Assigned",
      value: filteredGames.filter((g) => g.status === "assigned").length,
      icon: Users,
      color: "text-green-600",
    },
    {
      title: selectedDate !== "all" ? "Up for Grabs" : "This Week",
      value: selectedDate !== "all" 
        ? filteredGames.filter((g) => g.status === "up-for-grabs").length
        : games.filter((g) => {
            const gameDate = new Date(g.date)
            const now = new Date()
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            return gameDate >= now && gameDate <= weekFromNow
          }).length,
      icon: Calendar,
      color: selectedDate !== "all" ? "text-orange-600" : "text-purple-600",
    },
  ]

  // Column definitions for the games table
  const columns: ColumnDef<Game>[] = [
    {
      id: 'game',
      title: 'Game',
      filterType: 'search',
      accessor: (game) => {
        const homeTeamName = typeof game.homeTeam === 'object' 
          ? `${game.homeTeam.organization} ${game.homeTeam.ageGroup} ${game.homeTeam.gender}`
          : game.homeTeam
        const awayTeamName = typeof game.awayTeam === 'object' 
          ? `${game.awayTeam.organization} ${game.awayTeam.ageGroup} ${game.awayTeam.gender}`
          : game.awayTeam
        
        return (
          <div>
            <p className="font-medium">
              {homeTeamName} vs {awayTeamName}
            </p>
            <p className="text-sm text-muted-foreground">{game.division}</p>
          </div>
        )
      }
    },
    {
      id: 'datetime',
      title: 'Date & Time',
      filterType: 'search',
      accessor: (game) => (
        <div>
          <p className="text-sm">{new Date(game.date).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground">
            {game.time || game.startTime} {game.endTime ? `- ${game.endTime}` : ''}
          </p>
        </div>
      )
    },
    {
      id: 'location',
      title: 'Location',
      filterType: 'search',
      accessor: (game) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
          <span className="text-sm">{game.location}</span>
        </div>
      )
    },
    {
      id: 'level',
      title: 'Level',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Levels' },
        { value: 'Recreational', label: 'Recreational' },
        { value: 'Competitive', label: 'Competitive' },
        { value: 'Elite', label: 'Elite' }
      ],
      accessor: (game) => (
        <Badge variant={game.level === 'Elite' ? 'default' : 'secondary'}>
          {game.level}
        </Badge>
      )
    },
    {
      id: 'division',
      title: 'Division',
      filterType: 'search',
      accessor: 'division'
    },
    {
      id: 'referees',
      title: 'Referees',
      filterType: 'search',
      accessor: (game) => (
        <div>
          <p className="text-sm font-medium">
            {game.assignedReferees?.length || 0}/{game.refsNeeded}
          </p>
          <p className="text-xs text-muted-foreground">
            {game.assignedReferees?.join(', ') || 'None assigned'}
          </p>
        </div>
      )
    },
    {
      id: 'status',
      title: 'Status',
      filterType: 'select',
      filterOptions: [
        { value: 'all', label: 'All Status' },
        { value: 'unassigned', label: 'Unassigned' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'up-for-grabs', label: 'Up for Grabs' }
      ],
      accessor: (game) => (
        <Badge
          variant={
            game.status === 'assigned' ? 'default' :
            game.status === 'unassigned' ? 'destructive' :
            'secondary'
          }
        >
          {game.status === 'up-for-grabs' ? 'Up for Grabs' : 
           game.status.charAt(0).toUpperCase() + game.status.slice(1)}
        </Badge>
      )
    },
    {
      id: 'actions',
      title: 'Actions',
      filterType: 'none',
      accessor: (game) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeleteGame(game.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={Calendar}
        title="Game Management"
        description={
          selectedDate !== "all" 
            ? `Games for ${new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}`
            : "Manage all games across divisions and levels"
        }
      >
        {selectedDate !== "all" && (
          <>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              <Calendar className="h-3 w-3 mr-1" />
              Filtered by Date
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDate("all")}
              className="text-gray-600"
            >
              Clear Date Filter
            </Button>
          </>
        )}
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
      </PageHeader>

      <StatsGrid stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Game Directory</CardTitle>
          <CardDescription>Search and filter games across all divisions and levels</CardDescription>
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
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Recreational">Recreational</SelectItem>
                <SelectItem value="Competitive">Competitive</SelectItem>
                <SelectItem value="Elite">Elite</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="up-for-grabs">Up for Grabs</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                type="date"
                placeholder="Filter by date"
                value={selectedDate === "all" ? "" : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || "all")}
                className={`w-[150px] ${
                  selectedDate !== "all" ? "ring-2 ring-blue-500 border-blue-500" : ""
                }`}
              />
              {selectedDate !== "all" && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 bg-blue-100 text-blue-700 text-xs px-1 py-0"
                >
                  Active
                </Badge>
              )}
            </div>
          </div>

          {/* Games Table */}
          <FilterableTable data={filteredGames} columns={columns} emptyMessage="No games found matching your criteria." />
        </CardContent>
      </Card>
    </PageLayout>
  )
}