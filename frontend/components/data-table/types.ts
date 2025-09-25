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

export interface RefereeRole {
  id: string
  role_name: string
  permissions?: {
    can_evaluate?: boolean
    can_mentor?: boolean
    can_assign?: boolean
    can_inspect?: boolean
  }
}

export interface Referee {
  id: string
  name: string
  email: string
  phone: string
  // Legacy level field for backward compatibility
  level?: 'Learning' | 'Learning+' | 'Growing' | 'Growing+' | 'Teaching' | 'Expert'
  // New referee level system
  new_referee_level: 'Rookie' | 'Junior' | 'Senior'
  should_display_white_whistle: boolean
  location: string
  postal_code?: string
  // Legacy roles field for backward compatibility
  roles?: string[]
  // New roles system
  referee_roles: RefereeRole[]
  role_names: string[]
  // Permission flags computed by backend
  can_evaluate: boolean
  can_mentor: boolean
  maxDistance: number
  max_distance?: number // Backend field name
  isAvailable: boolean
  is_available?: boolean // Backend field name
  // Legacy white whistle field
  isWhiteWhistle?: boolean
  // Legacy fields that may be removed
  certificationLevel?: string
  certifications?: string[]
  preferredPositions?: string[]
  yearsExperience?: number
  gamesRefereedSeason?: number
  evaluationScore?: number
  notes?: string
  wage_per_game?: number
}

export type GameLevel = 'Recreational' | 'Competitive' | 'Elite'
export type GameType = 'Community' | 'Club' | 'Tournament' | 'Private Tournament'
export type GameStatus = 'unassigned' | 'assigned' | 'up-for-grabs' | 'completed'
export type AssignmentStatus = 'pending' | 'accepted' | 'declined'
// Legacy referee level type for backward compatibility
export type LegacyRefereeLevel = 'Learning' | 'Learning+' | 'Growing' | 'Growing+' | 'Teaching' | 'Expert'

// New referee level system
export type NewRefereeLevel = 'Rookie' | 'Junior' | 'Senior'

// Union type for any referee level
export type RefereeLevel = LegacyRefereeLevel | NewRefereeLevel

// Available referee roles
export type RefereeRoleName = 'Referee' | 'Evaluator' | 'Mentor' | 'Regional Lead' | 'Assignor' | 'Inspector'