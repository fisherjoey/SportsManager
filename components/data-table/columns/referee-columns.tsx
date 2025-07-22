"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Phone, Mail, MapPin, Award, User, Calendar } from "lucide-react"
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
        <div className="font-medium">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{referee.name}</span>
          </div>
          {referee.certificationLevel && (
            <div className="text-xs text-muted-foreground mt-1">
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
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{referee.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{referee.phone}</span>
          </div>
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
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-muted-foreground" />
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
    accessorKey: "location",
    id: "location",
    header: ({ column }) => (
      <DataTableColumnHeaderAdvanced 
        column={column} 
        title="Location" 
        searchable={true}
        filterable={true}
        filterOptions={[
          { label: "Downtown", value: "Downtown" },
          { label: "Westside", value: "Westside" },
          { label: "Northside", value: "Northside" },
          { label: "Eastside", value: "Eastside" },
        ]}
      />
    ),
    cell: ({ row }) => {
      const location = row.getValue("location") as string
      const referee = row.original
      
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{location}</div>
            <div className="text-xs text-muted-foreground">
              {referee.maxDistance} km radius
            </div>
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
            <Badge key={index} variant="secondary" className="text-xs">
              {cert}
            </Badge>
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
          className={isAvailable ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" : "bg-gray-100 text-gray-600 border-gray-200"}
        >
          {isAvailable ? "Available: July 20" : "Unavailable"}
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
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
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