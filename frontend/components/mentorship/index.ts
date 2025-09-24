// Mentorship System Components
export { MentorDashboard } from './MentorDashboard'
export { MenteeSelector, SimpleMenteeSelector } from './MenteeSelector'
export { MenteesList } from './MenteesList'
export { MenteeDetailsView } from './MenteeDetailsView'
export { DocumentManager } from './DocumentManager'

// Re-export types for convenience
export type { 
  Mentor, 
  Mentee, 
  MentorshipAssignment,
  MenteeNote,
  MenteeDocument,
  MentorshipGoal,
  MentorshipSession,
  MentorshipStats,
  DocumentCategory,
  NoteCategory,
  SessionType,
  GoalStatus,
  GoalPriority,
  MenteeLevel,
  LearningStyle,
  CommunicationPreference
} from '@/types/mentorship'