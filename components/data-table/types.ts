import { ColumnDef, Row } from "@tanstack/react-table"
import { ComponentType } from "react"

export interface Team {
  organization: string // "Okotoks", "NW", "Calgary", etc.
  ageGroup: string // "U11", "U13", "U15", "U18", etc.
  gender: "Boys" | "Girls"
  rank: number // 1, 2, 3, etc.
}

export interface Game {
  id: string
  homeTeam: Team
  awayTeam: Team
  date: string
  time: string
  location: string
  postalCode?: string
  level: string
  division: string // "U11 Division 1", "U13 Division 2", etc.
  season: string // "Winter 2025", "Fall 2024", etc.
  payRate: string
  status: string
  refsNeeded: number
  wageMultiplier: string
  wageMultiplierReason?: string
  assignments?: Assignment[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Assignment {
  referee_name: string
  position_name: string
  status: string
}

export interface GameFilters {
  globalSearch: string
  dateRange: { from?: Date; to?: Date }
  levels: string[]
  payRange: { min: number; max: number }
  statuses: string[]
  refereeSearch: string
  locations: string[]
  hasReferees: boolean | null
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  filterableColumns?: FilterableColumn<TData>[]
  searchableColumns?: SearchableColumn<TData>[]
  newRowLink?: string
  deleteRowsAction?: (rows: Row<TData>[]) => Promise<void>
}

export interface FilterableColumn<TData> {
  id: keyof TData
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export interface SearchableColumn<TData> {
  id: keyof TData
  title: string
  placeholder?: string
}

export type GameLevel = "Recreational" | "Competitive" | "Elite"
export type GameStatus = "unassigned" | "assigned" | "up-for-grabs" | "completed"
export type AssignmentStatus = "pending" | "accepted" | "declined"