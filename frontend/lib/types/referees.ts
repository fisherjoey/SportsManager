// Referee-related type definitions

export interface Referee {
  id: string
  name: string
  email: string
  phone: string
  level: 'Recreational' | 'Competitive' | 'Elite' | string
  certificationLevel?: string
  location: string
  postalCode?: string
  certifications: string[]
  preferredPositions: string[]
  preferredDivisions: string[]
  maxDistance: number
  isAvailable: boolean
  experience: number
  standardPayRate: number
  yearsExperience?: number
  evaluationScore?: number
  createdAt?: string
  updatedAt?: string
}

export interface RefereeAvailability {
  id: string
  refereeId: string
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  isRecurring: boolean
  effectiveDate?: string
  expiryDate?: string
}

export interface RefereeAssignment {
  id: string
  refereeId: string
  gameId: string
  position: string
  status: 'assigned' | 'accepted' | 'declined' | 'completed'
  payRate: number
  assignedAt: string
  acceptedAt?: string
  completedAt?: string
  notes?: string
}

export interface RefereeFilters {
  level?: string
  isAvailable?: boolean
  postalCode?: string
  maxDistance?: number
  search?: string
  page?: number
  limit?: number
}