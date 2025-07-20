"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Users, Calendar, MapPin, Trophy, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Game, Team } from "../types"
import { DataTableColumnHeaderAdvanced } from "./DataTableColumnHeaderAdvanced"

export const gameColumns: ColumnDef<Game>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    id: "id",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Game Number" 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const gameId = row.getValue("id") as string
      return (
        <div className="font-mono text-sm">
          #{gameId.slice(-8).toUpperCase()}
        </div>
      )
    },
  },
  {
    accessorKey: "homeTeam",
    id: "homeTeam",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Home Team" 
        searchable={true}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const homeTeam = row.getValue("homeTeam") as Team
      const teamName = `${homeTeam.organization} ${homeTeam.ageGroup} ${homeTeam.gender} ${homeTeam.rank}`
      
      return (
        <div className="font-medium">
          <div className="truncate">{teamName}</div>
          <div className="text-xs text-muted-foreground">
            {homeTeam.organization} • {homeTeam.ageGroup}
          </div>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const team = row.getValue(id) as Team
      const teamName = `${team.organization} ${team.ageGroup} ${team.gender} ${team.rank}`
      return value.some((v: string) => teamName.toLowerCase().includes(v.toLowerCase()))
    },
  },
  {
    accessorKey: "awayTeam",
    id: "awayTeam",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Away Team" 
        searchable={true}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const awayTeam = row.getValue("awayTeam") as Team
      const teamName = `${awayTeam.organization} ${awayTeam.ageGroup} ${awayTeam.gender} ${awayTeam.rank}`
      
      return (
        <div className="font-medium">
          <div className="truncate">{teamName}</div>
          <div className="text-xs text-muted-foreground">
            {awayTeam.organization} • {awayTeam.ageGroup}
          </div>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const team = row.getValue(id) as Team
      const teamName = `${team.organization} ${team.ageGroup} ${team.gender} ${team.rank}`
      return value.some((v: string) => teamName.toLowerCase().includes(v.toLowerCase()))
    },
  },
  {
    accessorKey: "date",
    id: "date",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Date & Time" 
        searchable={false}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      const time = row.original.time
      
      return (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
            {date.toLocaleDateString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {time}
          </div>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue("date"))
      const dateB = new Date(rowB.getValue("date"))
      return dateA.getTime() - dateB.getTime()
    },
    filterFn: (row, id, value) => {
      // Handle both array values (for checkboxes) and date range objects
      if (Array.isArray(value)) {
        const date = new Date(row.getValue("date"))
        const dateString = date.toLocaleDateString()
        return value.includes(dateString)
      }
      
      // Handle date range filtering
      if (value && typeof value === 'object' && (value.startDate || value.endDate)) {
        const rowDate = new Date(row.getValue("date"))
        const { startDate, endDate } = value
        
        if (startDate && endDate) {
          return rowDate >= startDate && rowDate <= endDate
        } else if (startDate) {
          return rowDate >= startDate
        } else if (endDate) {
          return rowDate <= endDate
        }
      }
      
      return true
    },
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Location" 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const location = row.getValue("location") as string
      const postalCode = row.original.postalCode
      
      return (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
            <span className="truncate">{location}</span>
          </div>
          {postalCode && (
            <div className="text-xs text-muted-foreground">
              {postalCode}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "level",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Level" 
        searchable={false}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const level = row.getValue("level") as string
      
      const levelColors = {
        "Recreational": "bg-green-100 text-green-800 border-green-200",
        "Competitive": "bg-yellow-100 text-yellow-800 border-yellow-200", 
        "Elite": "bg-red-100 text-red-800 border-red-200",
      }
      
      return (
        <div className="flex items-center">
          <Trophy className="mr-1 h-3 w-3 text-muted-foreground" />
          <Badge 
            variant="outline" 
            className={levelColors[level as keyof typeof levelColors] || ""}
          >
            {level}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "division",
    id: "division",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Division" 
        searchable={false}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const division = row.getValue("division") as string
      
      return (
        <div className="flex items-center">
          <Trophy className="mr-1 h-3 w-3 text-muted-foreground" />
          <Badge variant="secondary" className="font-mono text-xs">
            {division}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "season",
    id: "season",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Season" 
        searchable={false}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const season = row.getValue("season") as string
      
      return (
        <div className="flex items-center">
          <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">{season}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "wageMultiplier",
    id: "wageMultiplier", 
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Pay Modifier" 
        searchable={false}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const multiplier = parseFloat(row.original.wageMultiplier || "1.0")
      const reason = row.original.wageMultiplierReason
      
      return (
        <div className="space-y-1">
          <div className="flex items-center font-medium">
            <DollarSign className="mr-1 h-3 w-3 text-muted-foreground" />
            {multiplier === 1.0 ? (
              <span className="text-muted-foreground">Standard</span>
            ) : multiplier > 1.0 ? (
              <span className="text-green-600">+{((multiplier - 1) * 100).toFixed(0)}%</span>
            ) : (
              <span className="text-red-600">{((multiplier - 1) * 100).toFixed(0)}%</span>
            )}
          </div>
          {reason && (
            <div className="text-xs text-muted-foreground truncate max-w-[100px]">
              {reason}
            </div>
          )}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const multiplierA = parseFloat(rowA.original.wageMultiplier || "1.0")
      const multiplierB = parseFloat(rowB.original.wageMultiplier || "1.0")
      return multiplierA - multiplierB
    },
    filterFn: (row, id, value) => {
      const multiplier = parseFloat(row.original.wageMultiplier || "1.0")
      const displayValue = multiplier === 1.0 ? "Standard" : 
                          multiplier > 1.0 ? `+${((multiplier - 1) * 100).toFixed(0)}%` :
                          `${((multiplier - 1) * 100).toFixed(0)}%`
      return value.includes(displayValue)
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Status" 
        searchable={false}
        filterable={true}
      />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const assignments = row.original.assignments || []
      const refsNeeded = row.original.refs_needed || 2
      const assignedCount = assignments.length

      // Determine the actual status based on assignments
      let displayStatus = status
      let statusColor = "secondary"

      if (assignedCount >= refsNeeded) {
        displayStatus = "Full"
        statusColor = "default"
      } else if (assignedCount > 0) {
        displayStatus = `Partial (${assignedCount}/${refsNeeded})`
        statusColor = "secondary" 
      } else if (status === "up-for-grabs") {
        displayStatus = "Up for Grabs"
        statusColor = "outline"
      } else {
        displayStatus = "Unassigned"
        statusColor = "destructive"
      }

      return (
        <Badge variant={statusColor as any} className="capitalize">
          {displayStatus}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "notes", // Use notes field as placeholder since assignments doesn't exist
    id: "notes",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Referees" 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      // Since assignments field doesn't exist in API, show placeholder
      return (
        <div className="flex items-center text-muted-foreground">
          <Users className="mr-1 h-3 w-3" />
          <span className="text-sm">None assigned</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      // Since no assignments data, just return true for now
      return true
    },
    enableSorting: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const game = row.original
      const assignments = game.assignments || []
      const refsNeeded = game.refs_needed || 2
      const canAssign = assignments.length < refsNeeded

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(game.id)}
            >
              Copy game ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canAssign && (
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                Assign Referee
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem>
              Edit game
            </DropdownMenuItem>
            {game.status !== "up-for-grabs" && (
              <DropdownMenuItem>
                Mark as up for grabs
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]