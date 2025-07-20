"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, Users } from "lucide-react"
import { mockGames, mockReferees } from "@/lib/mock-data"
import { useToast } from "@/components/ui/use-toast"
import { useApi, type Referee } from "@/lib/api"
import { DataTable } from "@/components/data-table/DataTable"
import { gameColumns } from "@/components/data-table/columns/game-columns"
import { Game } from "@/components/data-table/types"

export function GameManagement() {
  const [games, setGames] = useState<Game[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const api = useApi()

  // Load real games from backend
  useEffect(() => {
    const loadGames = async () => {
      try {
        const response = await api.getGames()
        setGames(response.data)
      } catch (error) {
        console.error('Error loading games:', error)
        toast({
          title: "Error",
          description: "Failed to load games.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    loadGames()
  }, [])

  // Remove old filtering logic - DataTable will handle this

  const handleCreateGame = (gameData: any) => {
    const newGame = {
      id: (games.length + 1).toString(),
      ...gameData,
      status: "unassigned" as const,
      assignedReferees: [],
    }
    setGames([...games, newGame])
    setIsCreateDialogOpen(false)
    toast({
      title: "Game created",
      description: "New game has been added successfully.",
    })
  }

  const handleAssignReferee = async (gameId: string, refereeId: string) => {
    console.log('Assigning referee:', refereeId, 'to game:', gameId)
    
    try {
      // Try to create the assignment via API
      const response = await api.createAssignment({
        gameId,
        refereeId,
      })
      
      console.log('Assignment created:', response)
      
      // Reload games to get updated data
      const updatedGames = await api.getGames()
      setGames(updatedGames.data)
      
      toast({
        title: "Referee assigned",
        description: "Referee has been assigned to the game.",
      })
    } catch (error) {
      console.error('Error creating assignment:', error)
      
      // Fallback to local state update
      const referee = mockReferees.find((r) => r.id === refereeId)
      if (!referee) {
        toast({
          title: "Error",
          description: "Referee not found.",
          variant: "destructive",
        })
        return
      }

      setGames(
        games.map((game) => {
          if (game.id === gameId) {
            const currentReferees = game.assignedReferees || []
            // Check if referee is already assigned to avoid duplicates
            if (currentReferees.includes(referee.name)) {
              return game // Return unchanged if already assigned
            }
            const updatedReferees = [...currentReferees, referee.name]
            return {
              ...game,
              assignedReferees: updatedReferees,
              status: "assigned" as const,
            }
          }
          return game
        }),
      )

      toast({
        title: "Referee assigned (locally)",
        description: `${referee.name} has been assigned to the game.`,
      })
    }
  }

  const handleMarkUpForGrabs = (gameId: string) => {
    setGames(games.map((game) => (game.id === gameId ? { ...game, status: "up-for-grabs" as const } : game)))
    toast({
      title: "Game marked as available",
      description: "Game is now available for referees to pick up.",
    })
  }

  // Status badge logic moved to DataTable column definition

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Game Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Game
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>Add a new game to the system.</DialogDescription>
            </DialogHeader>
            <GameForm onSubmit={handleCreateGame} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
          <CardDescription>Manage all games and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={gameColumns} 
            data={games} 
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function GameForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    homeTeam: "",
    awayTeam: "",
    date: "",
    time: "",
    location: "",
    level: "",
    payRate: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      payRate: Number.parseFloat(formData.payRate),
    })
    setFormData({
      homeTeam: "",
      awayTeam: "",
      date: "",
      time: "",
      location: "",
      level: "",
      payRate: "",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="homeTeam">Home Team</Label>
          <Input
            id="homeTeam"
            value={formData.homeTeam}
            onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awayTeam">Away Team</Label>
          <Input
            id="awayTeam"
            value={formData.awayTeam}
            onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Recreational">Recreational</SelectItem>
              <SelectItem value="Competitive">Competitive</SelectItem>
              <SelectItem value="Elite">Elite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payRate">Pay Rate ($)</Label>
          <Input
            id="payRate"
            type="number"
            value={formData.payRate}
            onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full">
        Create Game
      </Button>
    </form>
  )
}

function AssignRefereeDialog({ game, onAssign, allGames }: { game: any; onAssign: (gameId: string, refereeId: string) => void; allGames: any[] }) {
  const [selectedReferee, setSelectedReferee] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [availableReferees, setAvailableReferees] = useState<Referee[]>([])
  const [loading, setLoading] = useState(false)
  const api = useApi()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && game.id) {
      fetchAvailableReferees()
    }
  }, [isOpen, game.id])

  const fetchAvailableReferees = async () => {
    setLoading(true)
    try {
      console.log('Fetching available referees for game:', game.id)
      const referees = await api.getAvailableReferees(game.id)
      console.log('API returned referees:', referees)
      setAvailableReferees(referees)
    } catch (error) {
      console.error('Error fetching available referees:', error)
      console.log('Falling back to client-side filtering')
      
      // Fallback to client-side filtering when API fails
      const filteredReferees = mockReferees.filter(referee => {
        // Only show available referees
        if (!referee.isAvailable) return false
        
        // Check if referee is already assigned to a game at the same time
        const gameDate = game.date || game.game_date;
        const gameTime = game.time || game.game_time;
        
        const conflictingGame = allGames.find(g => {
          const gDate = g.date || g.game_date;
          const gTime = g.time || g.game_time;
          
          return g.id !== game.id && 
                 gDate === gameDate && 
                 gTime === gameTime &&
                 (g.assignedReferees?.includes(referee.name) || 
                  g.assignments?.some(a => a.referee_name === referee.name));
        })
        
        return !conflictingGame
      }) as Referee[]
      
      console.log('Filtered referees (fallback):', filteredReferees)
      setAvailableReferees(filteredReferees)
      
      if (filteredReferees.length === 0) {
        toast({
          title: "No Available Referees",
          description: "No referees are available for this time slot.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = () => {
    if (selectedReferee) {
      onAssign(game.id, selectedReferee)
      setSelectedReferee("")
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Users className="h-4 w-4 mr-1" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Referee</DialogTitle>
          <DialogDescription>
            Select an available referee for {game.homeTeam || game.home_team_name} vs {game.awayTeam || game.away_team_name} on {new Date(game.date || game.game_date).toLocaleDateString()} at {game.time || game.game_time}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedReferee} onValueChange={setSelectedReferee} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading referees..." : "Select a referee"} />
            </SelectTrigger>
            <SelectContent>
              {availableReferees.length > 0 ? (
                availableReferees.map((referee) => (
                  <SelectItem key={referee.id} value={referee.id}>
                    {referee.name} - {referee.certificationLevel} ({referee.location || 'No location'})
                  </SelectItem>
                ))
              ) : (
                !loading && (
                  <SelectItem value="" disabled>
                    No available referees for this time slot
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleAssign} disabled={!selectedReferee || loading} className="w-full">
            {loading ? "Loading..." : "Assign Referee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
