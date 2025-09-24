// Game-related type definitions
// These are the actual types used by the application, not mock data

export interface Team {
  id?: string
  name?: string
  organization: string
  ageGroup: string
  gender: 'Boys' | 'Girls' | string
  rank: number | string
  displayName?: string
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
  level: 'Recreational' | 'Competitive' | 'Elite' | string
  division?: string
  season?: string
  payRate: number | string
  status: 'assigned' | 'unassigned' | 'up-for-grabs' | 'completed' | 'cancelled'
  refsNeeded: number
  wageMultiplier?: number | string
  wageMultiplierReason?: string
  assignedReferees?: string[]
  assignments?: any[]
  notes?: string
  gameType?: string
  createdAt?: string
  updatedAt?: string
}

export interface GameAssignment {
  id: string
  gameId: string
  refereeId: string
  refereeName?: string
  position: string
  status: 'assigned' | 'accepted' | 'declined' | 'completed'
  assignedAt: string
  acceptedAt?: string
  completedAt?: string
}

export interface GameFilters {
  status?: string
  level?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}