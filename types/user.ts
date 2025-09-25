/**
 * Comprehensive User Data Model for Sports Management System
 * Includes all essential user information based on requirements analysis
 */

export interface Role {
  id: string
  name: string
  description?: string
}

export interface RefereeProfile {
  id: string
  wage_amount: number
  years_experience: number
  evaluation_score?: number
  is_white_whistle: boolean
  show_white_whistle: boolean
  referee_type: Role | null
  capabilities: Role[]
  computed_fields: {
    type_config: any
    capability_count: number
    is_senior: boolean
    is_junior: boolean
    is_rookie: boolean
  }
}

export interface CommunicationPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  preferred_language: 'en' | 'fr' | 'es' | 'other'
  communication_method: 'email' | 'phone' | 'sms'
}

export interface BankingInfo {
  account_holder_name?: string
  account_number?: string
  routing_number?: string
  bank_name?: string
  payment_method: 'direct_deposit' | 'check' | 'cash' | 'e_transfer'
}

export interface User {
  id: string
  
  // Personal Information
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  
  // Address Information
  street_address?: string
  city?: string
  province_state?: string
  postal_zip_code?: string
  country?: string
  
  // Communication Preferences
  communication_preferences?: CommunicationPreferences
  
  // Professional Information
  year_started_refereeing?: number  // Year they started refereeing (e.g., 2018)
  certifications?: string[]
  specializations?: string[]
  availability_status: 'active' | 'inactive' | 'on_break'
  
  // System Information
  organization_id: string
  registration_date: string
  last_login?: string
  profile_completion_percentage: number
  admin_notes?: string
  profile_photo_url?: string
  
  // Emergency Contact
  emergency_contact_name?: string
  emergency_contact_phone?: string
  
  // Banking/Payment Information
  banking_info?: BankingInfo
  
  // Legacy/Current System Fields (for backward compatibility)
  name?: string // Computed from first_name + last_name
  roles?: Role[]  // RBAC roles
  role?: string // Legacy role field
  is_available?: boolean  // Referee availability
  is_active?: boolean  // Might not exist, treat as active if undefined
  is_referee?: boolean  // Enhanced field
  referee_profile?: RefereeProfile | null  // Enhanced field
  created_at?: string // Legacy field
  updated_at?: string
}

// Helper function to get display name
export function getUserDisplayName(user: User): string {
  if (user.name) return user.name
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return fullName || user.email || 'Unknown User'
}

// Helper function to get full address
export function getUserFullAddress(user: User): string {
  const parts = [
    user.street_address,
    user.city,
    user.province_state,
    user.postal_zip_code,
    user.country
  ].filter(Boolean)
  
  return parts.join(', ')
}

// Helper function to calculate years of experience
export function getYearsOfExperience(user: User): number {
  if (!user.year_started_refereeing) return 0
  const currentYear = new Date().getFullYear()
  const experience = currentYear - user.year_started_refereeing
  return Math.max(0, experience) // Ensure non-negative
}

// Helper function to get experience level category
export function getExperienceLevel(user: User): 'new' | 'junior' | 'senior' {
  const years = getYearsOfExperience(user)
  if (years <= 1) return 'new'
  if (years <= 5) return 'junior'
  return 'senior'
}

// Helper function to calculate profile completion
export function calculateProfileCompletion(user: User): number {
  const requiredFields = [
    'first_name',
    'last_name', 
    'email',
    'phone',
    'postal_zip_code'
  ]
  
  const optionalFields = [
    'date_of_birth',
    'street_address',
    'city',
    'province_state',
    'country',
    'emergency_contact_name',
    'emergency_contact_phone',
    'year_started_refereeing'
  ]
  
  let score = 0
  let total = requiredFields.length + optionalFields.length
  
  // Required fields worth more
  requiredFields.forEach(field => {
    if (user[field as keyof User]) score += 2
  })
  
  // Optional fields worth less
  optionalFields.forEach(field => {
    if (user[field as keyof User]) score += 1
  })
  
  return Math.min(100, Math.round((score / (requiredFields.length * 2 + optionalFields.length)) * 100))
}

export type UserAvailabilityStatus = 'active' | 'inactive' | 'on_break'
export type CommunicationMethod = 'email' | 'phone' | 'sms'
export type PreferredLanguage = 'en' | 'fr' | 'es' | 'other'
export type PaymentMethod = 'direct_deposit' | 'check' | 'cash' | 'e_transfer'