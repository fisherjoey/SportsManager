/**
 * @fileoverview Database entity type definitions
 * @description TypeScript interfaces for all database entities and their relationships
 * in the Sports Manager application. These types match the PostgreSQL schema exactly.
 */

import { UUID, Timestamp, AuditTrail, UserRole, GameType, Gender, AssignmentStatus, AvailabilityStrategy } from './index';
import { Knex } from 'knex';

// Database connection type
export type Database = Knex;
export { Knex } from 'knex';

// Base database entity with common fields
export interface BaseEntity extends AuditTrail {
  id: UUID;
}

// User-related entities
export interface User extends BaseEntity {
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  phone?: string;
  postal_code?: string;
  max_distance?: number;
  is_available: boolean;
  white_whistle: boolean;
  availability_strategy: AvailabilityStrategy;
  wage_per_game?: number;
  referee_level_id?: UUID;
  is_active: boolean;
  last_login?: Timestamp;
  email_verified: boolean;
  email_verified_at?: Timestamp;
  password_reset_token?: string;
  password_reset_expires?: Timestamp;
}

export interface RefereeLevelEntity extends BaseEntity {
  name: string;
  description?: string;
  allowed_divisions: string[];
  min_experience_years: number;
  max_age_group?: string;
  certification_requirements?: string[];
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  color_code?: string;
}

// Role and Permission entities (RBAC system)
export interface RoleEntity extends BaseEntity {
  name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  color?: string;
  priority: number;
  permissions: string[];
  resource_permissions: Record<string, string[]>;
  settings: RoleSettings;
}

export interface RoleSettings {
  advanced: {
    canManageOwnProfile: boolean;
    canViewOwnAssignments: boolean;
    canModifyAvailability: boolean;
    canViewPayments: boolean;
    requireApprovalForAssignments: boolean;
    maxAssignmentsPerWeek: number | null;
    allowConflictingAssignments: boolean;
    canSelfAssign: boolean;
  };
  profile: {
    visibility: 'public' | 'restricted' | 'private';
    showContactInfo: boolean;
    showLocation: boolean;
    showExperience: boolean;
    showStats: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    assignmentReminders: boolean;
    scheduleUpdates: boolean;
  };
}

export interface UserRoleAssignment extends BaseEntity {
  user_id: UUID;
  role_id: UUID;
  assigned_by: UUID;
  assigned_at: Timestamp;
  is_active: boolean;
  expires_at?: Timestamp;
}

export interface PermissionEntity extends BaseEntity {
  name: string;
  resource: string;
  action: string;
  description?: string;
  is_system: boolean;
}

export interface RolePermission extends BaseEntity {
  role_id: UUID;
  permission_id: UUID;
}

// League and Team entities
export interface LeagueEntity extends BaseEntity {
  name: string;
  description?: string;
  season: string;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  settings: LeagueSettings;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
}

export interface LeagueSettings {
  divisions: string[];
  ageGroups: string[];
  gameTypes: GameType[];
  defaultGameDuration: number;
  refereesPerGame: number;
  allowSubstitutions: boolean;
  playoffs: {
    enabled: boolean;
    format?: string;
    startDate?: Date;
  };
}

export interface TeamEntity extends BaseEntity {
  name: string;
  display_name?: string;
  organization: string;
  age_group: string;
  gender: Gender;
  rank: number;
  league_id: UUID;
  team_number?: string;
  division?: string;
  home_location?: string;
  coach_name?: string;
  coach_email?: string;
  coach_phone?: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  is_active: boolean;
}

// Game-related entities
export interface GameEntity extends BaseEntity {
  home_team_id: UUID;
  away_team_id: UUID;
  date_time: Timestamp;
  location: string;
  field?: string;
  postal_code: string;
  level: string;
  game_type: GameType;
  division: string;
  season: string;
  pay_rate: number;
  refs_needed: number;
  wage_multiplier: number;
  wage_multiplier_reason?: string;
  status: GameStatus;
  weather_conditions?: string;
  field_conditions?: string;
  notes?: string;
  cancelled_at?: Timestamp;
  cancelled_by?: UUID;
  cancellation_reason?: string;
  league_id?: UUID;
}

export enum GameStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed'
}

export interface PositionEntity extends BaseEntity {
  name: string;
  description?: string;
  abbreviation: string;
  sort_order: number;
  is_active: boolean;
  requirements?: string[];
  pay_rate_multiplier: number;
}

// Assignment entities
export interface AssignmentEntity extends BaseEntity {
  game_id: UUID;
  user_id: UUID;
  position_id: UUID;
  assigned_by?: UUID;
  status: AssignmentStatus;
  calculated_wage?: number;
  accepted_at?: Timestamp;
  declined_at?: Timestamp;
  decline_reason?: string;
  completed_at?: Timestamp;
  rating?: number;
  feedback?: string;
  travel_distance?: number;
  travel_time?: number;
}

// Availability entities
export interface AvailabilityEntity extends BaseEntity {
  user_id: UUID;
  date: Date;
  is_available: boolean;
  time_slots?: TimeSlot[];
  notes?: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface RecurringAvailabilityEntity extends BaseEntity {
  user_id: UUID;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string;
  end_time: string;
  is_available: boolean;
  effective_from: Date;
  effective_until?: Date;
}

// Mentorship entities
export interface MentorshipProgramEntity extends BaseEntity {
  name: string;
  description?: string;
  level: string;
  duration_weeks: number;
  max_mentees: number;
  requirements?: string[];
  learning_objectives?: string[];
  is_active: boolean;
  enrollment_deadline?: Date;
  start_date: Date;
  end_date: Date;
}

export interface MentorshipRelationshipEntity extends BaseEntity {
  mentor_id: UUID;
  mentee_id: UUID;
  program_id: UUID;
  status: MentorshipStatus;
  started_at: Timestamp;
  completed_at?: Timestamp;
  progress_percentage: number;
  mentor_feedback?: string;
  mentee_feedback?: string;
  next_session_date?: Date;
  total_sessions_completed: number;
}

export enum MentorshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface MentorshipSessionEntity extends BaseEntity {
  relationship_id: UUID;
  scheduled_date: Date;
  actual_date?: Date;
  duration_minutes: number;
  location?: string;
  session_type: SessionType;
  objectives?: string[];
  mentor_notes?: string;
  mentee_notes?: string;
  rating?: number;
  status: SessionStatus;
  homework_assigned?: string;
  next_steps?: string;
}

export enum SessionType {
  CLASSROOM = 'classroom',
  ON_FIELD = 'on_field',
  OBSERVATION = 'observation',
  GAME_ASSIGNMENT = 'game_assignment',
  VIRTUAL = 'virtual'
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

// Payment and Financial entities
export interface PaymentEntity extends BaseEntity {
  user_id: UUID;
  game_id?: UUID;
  assignment_id?: UUID;
  amount: number;
  currency: string;
  payment_date: Date;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  reference_number?: string;
  notes?: string;
  tax_amount?: number;
  fees?: number;
  net_amount: number;
}

export enum PaymentMethod {
  CASH = 'cash',
  CHEQUE = 'cheque', 
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  E_TRANSFER = 'e_transfer'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Notification entities
export interface NotificationEntity extends BaseEntity {
  user_id: UUID;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  is_read: boolean;
  read_at?: Timestamp;
  data?: Record<string, any>;
  expires_at?: Timestamp;
  delivery_method: NotificationDeliveryMethod[];
}

export enum NotificationType {
  ASSIGNMENT = 'assignment',
  GAME_UPDATE = 'game_update',
  PAYMENT = 'payment',
  SYSTEM = 'system',
  MENTORSHIP = 'mentorship',
  REMINDER = 'reminder'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationDeliveryMethod {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app'
}

// Audit and System entities
export interface AuditLogEntity extends BaseEntity {
  user_id?: UUID;
  entity_type: string;
  entity_id: UUID;
  action: AuditAction;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  context?: Record<string, any>;
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  VIEW = 'view',
  EXPORT = 'export'
}

export interface SystemSettingEntity extends BaseEntity {
  key: string;
  value: any;
  description?: string;
  is_public: boolean;
  category: string;
  data_type: SettingDataType;
  validation_rules?: Record<string, any>;
}

export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url'
}

// Database view types (for complex queries)
export interface UserWithRolesView extends User {
  roles: RoleEntity[];
  permissions: string[];
  effective_permissions: string[];
}

export interface GameWithTeamsView extends GameEntity {
  home_team: TeamEntity;
  away_team: TeamEntity;
  assignments: (AssignmentEntity & {
    user: Pick<User, 'id' | 'name' | 'email'>;
    position: PositionEntity;
  })[];
  league: LeagueEntity;
}

export interface AssignmentWithDetailsView extends AssignmentEntity {
  game: GameWithTeamsView;
  user: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
  position: PositionEntity;
  assigner?: Pick<User, 'id' | 'name' | 'email'>;
}