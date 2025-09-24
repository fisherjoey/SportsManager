/**
 * Mentorship System Type Definitions
 * Defines interfaces and types for the mentor-mentee system
 */

import { User } from './user'

export interface MentorshipProgram {
  id: string
  name: string
  description?: string
  start_date: string
  end_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenteeDocument {
  id: string
  mentee_id: string
  mentor_id: string
  title: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  category: 'evaluation' | 'training' | 'certification' | 'feedback' | 'other'
  uploaded_at: string
  uploaded_by: string
  is_private: boolean
  description?: string
}

export interface MenteeNote {
  id: string
  mentee_id: string
  mentor_id: string
  title: string
  content: string
  category: 'performance' | 'development' | 'goal' | 'feedback' | 'general'
  is_private: boolean
  created_at: string
  updated_at: string
  tags?: string[]
}

export interface MentorshipGoal {
  id: string
  mentee_id: string
  mentor_id: string
  title: string
  description: string
  target_date?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  progress_percentage: number
  created_at: string
  updated_at: string
}

export interface MentorshipSession {
  id: string
  mentee_id: string
  mentor_id: string
  session_date: string
  duration_minutes: number
  location?: string
  session_type: 'in_person' | 'virtual' | 'phone' | 'email'
  topics_covered: string[]
  notes?: string
  rating?: number // 1-5 scale
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  created_at: string
  updated_at: string
}

export interface MentorshipAssignment {
  id: string
  mentor_id: string
  mentee_id: string
  program_id?: string
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'paused' | 'terminated'
  assignment_reason?: string
  termination_reason?: string
  created_at: string
  updated_at: string
  mentor?: User
  mentee?: User
  program?: MentorshipProgram
}

export interface Mentee extends User {
  mentorship_assignments: MentorshipAssignment[]
  mentee_profile?: {
    id: string
    user_id: string
    current_level: 'rookie' | 'junior' | 'developing' | 'advanced'
    development_goals: string[]
    strengths: string[]
    areas_for_improvement: string[]
    learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing'
    preferred_communication: 'face_to_face' | 'virtual' | 'phone' | 'email' | 'text'
    availability_notes?: string
    emergency_contact_mentor?: boolean
    created_at: string
    updated_at: string
  }
  notes?: MenteeNote[]
  documents?: MenteeDocument[]
  goals?: MentorshipGoal[]
  sessions?: MentorshipSession[]
  stats?: {
    total_sessions: number
    completed_goals: number
    total_goals: number
    average_rating: number
    last_session_date?: string
    next_session_date?: string
  }
}

export interface Mentor extends User {
  mentorship_assignments: MentorshipAssignment[]
  mentor_profile?: {
    id: string
    user_id: string
    specializations: string[]
    max_mentees: number
    current_mentees_count: number
    mentoring_since: string
    mentoring_style: string[]
    preferred_mentee_level: ('rookie' | 'junior' | 'developing' | 'advanced')[]
    is_accepting_mentees: boolean
    bio?: string
    achievements: string[]
    certifications: string[]
    languages_spoken: string[]
    created_at: string
    updated_at: string
  }
  mentees?: Mentee[]
  stats?: {
    total_mentees: number
    active_mentees: number
    completed_mentorships: number
    total_sessions: number
    average_mentee_rating: number
    success_rate: number
  }
}

export type MentorshipRole = 'mentor' | 'mentee' | 'both'

export interface MentorshipStats {
  total_active_assignments: number
  total_mentors: number
  total_mentees: number
  average_sessions_per_month: number
  completion_rate: number
  satisfaction_rating: number
  most_common_goals: string[]
  recent_achievements: {
    mentee_name: string
    achievement: string
    date: string
  }[]
}

// Helper function to get mentee display status
export function getMenteeStatusColor(status: MentorshipAssignment['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'paused':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'terminated':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Helper function to get mentee progress level
export function getMenteeProgress(mentee: Mentee): {
  level: string
  progress: number
  nextMilestone: string
} {
  const currentLevel = mentee.mentee_profile?.current_level || 'rookie'
  const goals = mentee.goals || []
  const completedGoals = goals.filter(g => g.status === 'completed').length
  const totalGoals = goals.length
  
  const levels = {
    rookie: { progress: 25, next: 'Junior Referee' },
    junior: { progress: 50, next: 'Developing Referee' },
    developing: { progress: 75, next: 'Advanced Referee' },
    advanced: { progress: 100, next: 'Mentor Status' }
  }
  
  const goalProgress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0
  const baseProgress = levels[currentLevel as keyof typeof levels]?.progress || 0
  const overallProgress = Math.min(100, (baseProgress + goalProgress) / 2)
  
  return {
    level: currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1),
    progress: Math.round(overallProgress),
    nextMilestone: levels[currentLevel as keyof typeof levels]?.next || 'Advanced Status'
  }
}

// Helper function to format session duration
export function formatSessionDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export type DocumentCategory = 'evaluation' | 'training' | 'certification' | 'feedback' | 'other'
export type NoteCategory = 'performance' | 'development' | 'goal' | 'feedback' | 'general'
export type SessionType = 'in_person' | 'virtual' | 'phone' | 'email'
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
export type GoalPriority = 'low' | 'medium' | 'high'
export type MenteeLevel = 'rookie' | 'junior' | 'developing' | 'advanced'
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing'
export type CommunicationPreference = 'face_to_face' | 'virtual' | 'phone' | 'email' | 'text'