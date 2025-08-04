import { ColumnDef, Row } from '@tanstack/react-table'
import { ComponentType } from 'react'

export interface Team {
  organization: string // "Okotoks", "NW", "Calgary", etc.
  ageGroup: string // "U11", "U13", "U15", "U18", etc.
  gender: 'Boys' | 'Girls'
  rank: number // 1, 2, 3, etc.
}

export interface Game {
  id: string
  homeTeam: Team
  awayTeam: Team
  date: string
  time?: string
  startTime?: string
  endTime?: string
  location: string
  postalCode?: string
  level: string
  gameType: string
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
  gameTypes: string[]
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

export interface Referee {
  id: string
  name: string
  email: string
  phone: string
  level: 'Rookie' | 'Junior' | 'Senior'
  level_name?: string // Backend compatibility
  location: string
  roles: string[]
  maxDistance: number
  isAvailable: boolean
  isWhiteWhistle?: boolean
  should_display_white_whistle?: boolean // Backend calculated field
  postal_code?: string
  yearsExperience?: number
  gamesRefereedSeason?: number
  evaluationScore?: number
  notes?: string
  // Legacy fields for backward compatibility
  certificationLevel?: string
}

export type GameLevel = 'Recreational' | 'Competitive' | 'Elite'
export type GameType = 'Community' | 'Club' | 'Tournament' | 'Private Tournament'
export type GameStatus = 'unassigned' | 'assigned' | 'up-for-grabs' | 'completed'
export type AssignmentStatus = 'pending' | 'accepted' | 'declined'
export type RefereeLevel = 'Rookie' | 'Junior' | 'Senior'