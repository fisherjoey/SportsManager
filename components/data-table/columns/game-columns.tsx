"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Users, Calendar, MapPin, Trophy, DollarSign, Edit2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { Game, Team } from "../types"
import { DataTableColumnHeaderAdvanced } from "./DataTableColumnHeaderAdvanced"

interface GameColumnActions {
  onAssignReferee?: (game: Game) => void
  onEditGame?: (gameId: string, field: string, value: any) => void
  onEditGameDialog?: (game: Game) => void
}

// Inline editable text component
function EditableText({ 
  value, 
  onSave, 
  placeholder = "Click to edit",
  className = ""
}: {
  value: string
  onSave: (newValue: string) => void
  placeholder?: string
  className?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') handleCancel()
        }}
        autoFocus
        className={`h-8 ${className}`}
      />
    )
  }

  return (
    <div 
      className={`cursor-pointer hover:bg-muted/50 rounded px-2 py-1 group ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span className="truncate">{value || placeholder}</span>
      <Edit2 className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-50" />
    </div>
  )
}

// Inline editable select component
function EditableSelect({ 
  value, 
  options,
  onSave, 
  className = "",
  displayValue,
  badgeVariant,
  badgeClassName
}: {
  value: string
  options: { label: string; value: string }[]
  onSave: (newValue: string) => void
  className?: string
  displayValue?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  badgeClassName?: string
}) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = (newValue: string) => {
    if (newValue !== value) {
      onSave(newValue)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Select value={value} onValueChange={handleSave} onOpenChange={(open) => !open && setIsEditing(false)}>
        <SelectTrigger className={`h-8 ${className}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const displayText = displayValue || options.find(opt => opt.value === value)?.label || value

  if (badgeVariant) {
    return (
      <Badge 
        variant={badgeVariant}
        className={`cursor-pointer hover:opacity-80 group ${badgeClassName || ""}`}
        onClick={() => setIsEditing(true)}
      >
        <span className="truncate">{displayText}</span>
        <Edit2 className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-50" />
      </Badge>
    )
  }

  return (
    <div 
      className={`cursor-pointer hover:bg-muted/50 rounded px-2 py-1 group ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span className="truncate">{displayText}</span>
      <Edit2 className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-50" />
    </div>
  )
}

export const createGameColumns = (actions?: GameColumnActions): ColumnDef<Game>[] => [
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
        title="Game #" 
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
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const homeTeam = row.getValue("homeTeam") as Team
      
      // Handle missing team data
      if (!homeTeam || !homeTeam.organization) {
        return (
          <div className="font-medium text-muted-foreground">
            <div className="truncate">No team data</div>
          </div>
        )
      }
      
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
  },
  {
    accessorKey: "awayTeam",
    id: "awayTeam",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Away Team" 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const awayTeam = row.getValue("awayTeam") as Team
      
      // Handle missing team data
      if (!awayTeam || !awayTeam.organization) {
        return (
          <div className="font-medium text-muted-foreground">
            <div className="truncate">No team data</div>
          </div>
        )
      }
      
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
        dateRangeFilter={true}
      />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      const time = row.original.startTime && row.original.endTime 
        ? `${row.original.startTime} - ${row.original.endTime}` 
        : row.original.time
      
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
      const game = row.original
      
      return (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
            <EditableText
              value={location}
              onSave={(newValue) => actions?.onEditGame?.(game.id, "location", newValue)}
              placeholder="Enter location"
              className="flex-1"
            />
          </div>
          {postalCode && (
            <div className="text-xs text-muted-foreground">
              <EditableText
                value={postalCode}
                onSave={(newValue) => actions?.onEditGame?.(game.id, "postalCode", newValue)}
                placeholder="Postal code"
              />
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
        filterOptions={[
          { label: "Recreational", value: "Recreational", id: "level-recreational" },
          { label: "Competitive", value: "Competitive", id: "level-competitive" },
          { label: "Elite", value: "Elite", id: "level-elite" },
        ]}
      />
    ),
    cell: ({ row }) => {
      const level = row.getValue("level") as string
      const game = row.original
      
      const levelOptions = [
        { label: "Recreational", value: "Recreational" },
        { label: "Competitive", value: "Competitive" },
        { label: "Elite", value: "Elite" },
      ]
      
      const levelColors = {
        "Recreational": "bg-green-100 text-green-800 border-green-200",
        "Competitive": "bg-yellow-100 text-yellow-800 border-yellow-200", 
        "Elite": "bg-red-100 text-red-800 border-red-200",
      }
      
      return (
        <div className="flex items-center">
          <Trophy className="mr-1 h-3 w-3 text-muted-foreground" />
          <EditableSelect
            value={level}
            options={levelOptions}
            onSave={(newValue) => actions?.onEditGame?.(game.id, "level", newValue)}
            badgeVariant="outline"
            badgeClassName={levelColors[level as keyof typeof levelColors] || ""}
          />
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const level = row.getValue(id) as string
      return Array.isArray(value) ? value.includes(level) : value === level
    },
  },
  {
    accessorKey: "gameType",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Game Type" 
        searchable={false}
        filterable={true}
        filterOptions={[
          { label: "Community", value: "Community", id: "type-community" },
          { label: "Club", value: "Club", id: "type-club" },
          { label: "Tournament", value: "Tournament", id: "type-tournament" },
          { label: "Private Tournament", value: "Private Tournament", id: "type-private" },
        ]}
      />
    ),
    cell: ({ row }) => {
      const gameType = row.getValue("gameType") as string
      const game = row.original
      
      const gameTypeOptions = [
        { label: "Community", value: "Community" },
        { label: "Club", value: "Club" },
        { label: "Tournament", value: "Tournament" },
        { label: "Private Tournament", value: "Private Tournament" },
      ]
      
      const typeColors = {
        "Community": "bg-blue-100 text-blue-800 border-blue-200",
        "Club": "bg-purple-100 text-purple-800 border-purple-200", 
        "Tournament": "bg-orange-100 text-orange-800 border-orange-200",
        "Private Tournament": "bg-pink-100 text-pink-800 border-pink-200",
      }
      
      return (
        <div className="flex items-center">
          <Trophy className="mr-1 h-3 w-3 text-muted-foreground" />
          <EditableSelect
            value={gameType || "Community"}
            options={gameTypeOptions}
            onSave={(newValue) => actions?.onEditGame?.(game.id, "gameType", newValue)}
            badgeVariant="outline"
            badgeClassName={typeColors[gameType as keyof typeof typeColors] || typeColors["Community"]}
          />
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const gameType = row.getValue(id) as string
      return Array.isArray(value) ? value.includes(gameType) : value === gameType
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
        filterSections={[
          {
            title: "Age",
            options: [
              { label: "U11", value: "U11", id: "age-u11" },
              { label: "U13", value: "U13", id: "age-u13" },
              { label: "U15", value: "U15", id: "age-u15" },
              { label: "U18", value: "U18", id: "age-u18" },
            ]
          },
          {
            title: "Division #",
            options: [
              { label: "Division 1", value: "Division 1", id: "div-1" },
              { label: "Division 2", value: "Division 2", id: "div-2" },
              { label: "Division 3", value: "Division 3", id: "div-3" },
            ]
          },
          {
            title: "Gender",
            options: [
              { label: "Boys Teams", value: "Boys", id: "gender-boys" },
              { label: "Girls Teams", value: "Girls", id: "gender-girls" },
            ]
          }
        ]}
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
      const division = row.getValue(id) as string
      const homeTeam = row.original.homeTeam
      const awayTeam = row.original.awayTeam
      
      // Group filters by category
      const ageFilters = value.filter((v: string) => ['U11', 'U13', 'U15', 'U18'].includes(v))
      const divisionFilters = value.filter((v: string) => v.includes('Division'))
      const genderFilters = value.filter((v: string) => ['Boys', 'Girls'].includes(v))
      
      // Within each category: OR logic (any match)
      // Between categories: AND logic (all categories must match)
      
      let ageMatch = ageFilters.length === 0 ? true : ageFilters.some((age: string) => division.includes(age))
      let divisionMatch = divisionFilters.length === 0 ? true : divisionFilters.some((div: string) => division.includes(div))
      let genderMatch = genderFilters.length === 0 ? true : genderFilters.some((gender: string) => {
        if (gender === "Boys") return homeTeam?.gender === "Boys" || awayTeam?.gender === "Boys"
        if (gender === "Girls") return homeTeam?.gender === "Girls" || awayTeam?.gender === "Girls"
        return false
      })
      
      return ageMatch && divisionMatch && genderMatch
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
      const game = row.original
      
      const multiplierOptions = [
        { label: "Standard (1.0x)", value: "1.0" },
        { label: "Time and Half (1.5x)", value: "1.5" },
        { label: "Double Time (2.0x)", value: "2.0" },
        { label: "Holiday Rate (2.5x)", value: "2.5" },
        { label: "Reduced (0.8x)", value: "0.8" },
      ]
      
      return (
        <div className="space-y-1">
          <div className="flex items-center font-medium">
            <DollarSign className="mr-1 h-3 w-3 text-muted-foreground" />
            <EditableSelect
              value={multiplier.toString()}
              options={multiplierOptions}
              onSave={(newValue) => actions?.onEditGame?.(game.id, "wageMultiplier", newValue)}
              className="min-w-[80px]"
            />
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[100px]">
            <EditableText
              value={reason || ""}
              onSave={(newValue) => actions?.onEditGame?.(game.id, "wageMultiplierReason", newValue)}
              placeholder="Add reason..."
            />
          </div>
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
      const assignedReferees = row.original.assignedReferees || []
      const refsNeeded = row.original.refsNeeded || row.original.refs_needed || 2
      const assignedCount = Math.max(assignments.length, assignedReferees.length)

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
    accessorKey: "assignedReferees",
    id: "assignedReferees",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Referees" 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const assignedReferees = row.getValue("assignedReferees") as string[] || []
      const refsNeeded = row.original.refsNeeded || row.original.refs_needed || 2
      
      if (assignedReferees.length === 0) {
        return (
          <div className="flex items-center text-muted-foreground">
            <Users className="mr-1 h-3 w-3" />
            <span className="text-sm">None assigned</span>
          </div>
        )
      }
      
      return (
        <div className="space-y-1">
          <div className="flex items-center">
            <Users className="mr-1 h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {assignedReferees.length}/{refsNeeded}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {assignedReferees.join(", ")}
          </div>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const assignedReferees = row.getValue(id) as string[] || []
      const searchTerm = value.toLowerCase()
      return assignedReferees.some(referee => 
        referee.toLowerCase().includes(searchTerm)
      )
    },
    enableSorting: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const game = row.original
      const assignments = game.assignments || []
      const assignedReferees = game.assignedReferees || []
      const refsNeeded = game.refsNeeded || game.refs_needed || 2
      const assignedCount = Math.max(assignments.length, assignedReferees.length)
      const canAssign = assignedCount < refsNeeded

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
              <DropdownMenuItem
                onClick={() => actions?.onAssignReferee?.(game)}
              >
                Assign Referee
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => actions?.onEditGameDialog?.(game)}
            >
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

// Backward compatibility export
export const gameColumns = createGameColumns()