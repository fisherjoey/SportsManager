"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Calendar } from "lucide-react"
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
import { Referee } from "../types"
import { DataTableColumnHeaderAdvanced } from "./DataTableColumnHeaderAdvanced"

interface RefereeColumnActions {
  onEditReferee?: (referee: Referee) => void
  onViewProfile?: (referee: Referee) => void
  onManageAvailability?: (referee: Referee) => void
}

export const createRefereeColumns = (actions?: RefereeColumnActions): ColumnDef<Referee>[] => [
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
    accessorKey: "name",
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Name" 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const referee = row.original
      return (
        <div>
          <div className="font-medium text-sm truncate">{referee.name}</div>
          {referee.certificationLevel && (
            <div className="text-xs text-muted-foreground truncate">
              {referee.certificationLevel}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    id: "contact",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Contact" 
        searchable={true}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const referee = row.original
      return (
        <div className="space-y-1">
          <div className="text-sm truncate">{referee.email}</div>
          <div className="text-xs text-muted-foreground truncate">{referee.phone}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "level",
    id: "level",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Level" 
        searchable={false}
        filterable={true}
        filterOptions={[
          { label: "Recreational", value: "Recreational" },
          { label: "Competitive", value: "Competitive" },
          { label: "Elite", value: "Elite" },
        ]}
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
        <Badge 
          variant="outline" 
          className={`text-xs ${levelColors[level as keyof typeof levelColors] || ""}`}
        >
          {level}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "location",
    id: "location",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Location" 
        searchable={true}
        filterable={true}
        filterOptions={[
          { label: "Northwest Calgary", value: "Northwest Calgary" },
          { label: "Northeast Calgary", value: "Northeast Calgary" },
          { label: "Southeast Calgary", value: "Southeast Calgary" },
          { label: "Southwest Calgary", value: "Southwest Calgary" },
          { label: "Downtown Calgary", value: "Downtown Calgary" },
          { label: "Foothills", value: "Foothills" },
          { label: "Bow Valley", value: "Bow Valley" },
          { label: "Fish Creek", value: "Fish Creek" },
          { label: "Olds", value: "Olds" },
        ]}
      />
    ),
    cell: ({ row }) => {
      const location = row.getValue("location") as string
      const referee = row.original
      
      return (
        <div>
          <div className="text-sm font-medium truncate">{location}</div>
          <div className="text-xs text-muted-foreground">
            {referee.maxDistance}km radius
          </div>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "certifications",
    id: "certifications",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Certifications" 
        searchable={false}
        filterable={false}
      />
    ),
    cell: ({ row }) => {
      const certifications = row.getValue("certifications") as string[]
      
      return (
        <div className="space-y-1">
          {certifications.slice(0, 2).map((cert, index) => (
            <div key={index} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md truncate">
              {cert}
            </div>
          ))}
          {certifications.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{certifications.length - 2} more
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "isAvailable",
    id: "isAvailable",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Status" 
        searchable={false}
        filterable={true}
        filterOptions={[
          { label: "Available", value: "true" },
          { label: "Unavailable", value: "false" },
        ]}
      />
    ),
    cell: ({ row }) => {
      const isAvailable = row.getValue("isAvailable") as boolean
      
      return (
        <Badge 
          variant={isAvailable ? "default" : "secondary"}
          className={`text-xs ${isAvailable ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" : "bg-gray-100 text-gray-600 border-gray-200"}`}
        >
          {isAvailable ? "Available" : "Unavailable"}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const isAvailable = row.getValue(id) as boolean
      return value.includes(isAvailable.toString())
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const referee = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-6 w-6 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(referee.id)}
            >
              Copy referee ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => actions?.onViewProfile?.(referee)}>
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions?.onEditReferee?.(referee)}>
              Edit referee
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions?.onManageAvailability?.(referee)}>
              <Calendar className="h-4 w-4 mr-2" />
              Manage availability
            </DropdownMenuItem>
            <DropdownMenuItem>
              Send message
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]