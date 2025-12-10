/**
 * @fileoverview Mentorship System Type Definitions
 * @description TypeScript interfaces for the mentorship system including database entities and API responses
 */

/**
 * Database Entities (snake_case - matching database schema)
 */

export interface Mentee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  profile_photo_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  street_address?: string;
  city?: string;
  province_state?: string;
  postal_zip_code?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Mentor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialization?: string;
  bio?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface MentorshipAssignment {
  id: string;
  mentor_id: string;
  mentee_id: string;
  start_date: string;
  end_date?: string | null;
  status: 'active' | 'paused' | 'completed' | 'terminated';
  notes?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface MenteeProfile {
  id: string;
  mentee_id: string;
  current_level?: string | null;
  development_goals?: Record<string, any> | null; // JSONB field
  strengths?: Record<string, any> | null; // JSONB field
  areas_for_improvement?: Record<string, any> | null; // JSONB field
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Statistics and Computed Data
 */

export interface MenteeStats {
  totalGames: number;
  completedGames: number;
  upcomingGames: number;
  mentorshipDays: number;
}

/**
 * API Response Types (camelCase for frontend consumption)
 */

export interface MentorInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string | null;
  bio?: string | null;
}

export interface MenteeProfileResponse {
  // Mentee basic information
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  profilePhotoUrl?: string | null;

  // Address information
  streetAddress?: string | null;
  city?: string | null;
  provinceState?: string | null;
  postalZipCode?: string | null;

  // Emergency contact
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;

  // Profile details
  currentLevel?: string | null;
  developmentGoals?: Record<string, any> | null;
  strengths?: Record<string, any> | null;
  areasForImprovement?: Record<string, any> | null;

  // Mentor information (if assigned)
  mentor?: MentorInfo | null;
  mentorshipStatus?: string | null;
  mentorshipStartDate?: string | null;

  // Statistics
  stats: MenteeStats;
}

/**
 * Database Join Result Types (internal use)
 */

export interface MenteeWithProfile extends Mentee {
  profile_id?: string;
  current_level?: string | null;
  development_goals?: Record<string, any> | null;
  strengths?: Record<string, any> | null;
  areas_for_improvement?: Record<string, any> | null;
}

export interface MenteeWithMentorship extends MenteeWithProfile {
  mentorship_id?: string;
  mentor_id?: string;
  mentorship_status?: string;
  mentorship_start_date?: string;
  mentorship_end_date?: string | null;
  mentor_first_name?: string;
  mentor_last_name?: string;
  mentor_email?: string;
  mentor_specialization?: string;
  mentor_bio?: string;
}

export interface GameAssignment {
  id: string;
  game_id: string;
  referee_id: string;
  role: string;
  status: string;
  game_date?: string;
  game_time?: string;
  created_at?: Date;
  updated_at?: Date;
}
