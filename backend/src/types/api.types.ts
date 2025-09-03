/**
 * @fileoverview API request and response type definitions
 * @description TypeScript interfaces for all API endpoints, including request bodies,
 * response formats, query parameters, and route parameters used in the Sports Manager API.
 */

import { 
  UUID, 
  Timestamp, 
  PaginatedResult, 
  PaginationOptions,
  UserRole, 
  GameType, 
  Gender, 
  AssignmentStatus, 
  AvailabilityStrategy,
  User,
  GameEntity,
  AssignmentEntity,
  TeamEntity,
  RoleEntity,
  MentorshipProgramEntity,
  MentorshipRelationshipEntity,
  PaymentEntity
} from './index';

// Standard API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Timestamp;
    requestId?: string;
    version?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

// Authentication API types
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: UUID;
    email: string;
    roles: string[];
    permissions: Array<{
      id: UUID;
      name: string;
      resource: string;
      action: string;
      code?: string;
    }>;
    name?: string;
    phone?: string;
    location?: string;
    postal_code?: string;
    max_distance?: number;
    is_available?: boolean;
    wage_per_game?: number;
    referee_level_id?: UUID;
    year_started_refereeing?: number;
    games_refereed_season?: number;
    evaluation_score?: number;
    notes?: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'admin' | 'referee';
  name?: string; // Required for referees
  phone?: string;
  location?: string;
  postal_code?: string; // Required for referees
  max_distance?: number;
  referee_level_id?: UUID;
  year_started_refereeing?: number;
  notes?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Profile endpoint response
export interface ProfileResponse {
  user: {
    id: UUID;
    email: string;
    roles: string[];
    permissions: Array<{
      id: UUID;
      name: string;
      resource: string;
      action: string;
      code?: string;
    }>;
    name?: string;
    phone?: string;
    location?: string;
    postal_code?: string;
    max_distance?: number;
    is_available?: boolean;
    wage_per_game?: number;
    referee_level_id?: UUID;
    year_started_refereeing?: number;
    games_refereed_season?: number;
    evaluation_score?: number;
    notes?: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
}

// Permissions refresh response
export interface RefreshPermissionsResponse {
  success: boolean;
  data: {
    permissions: Array<{
      id: UUID;
      name: string;
      resource: string;
      action: string;
      code?: string;
    }>;
  };
  message: string;
}

// User API types
export interface UserProfile {
  id: UUID;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  postal_code?: string;
  max_distance?: number;
  is_available: boolean;
  white_whistle: boolean;
  availability_strategy: AvailabilityStrategy;
  wage_per_game?: number;
  referee_level?: {
    id: UUID;
    name: string;
    description?: string;
  };
  roles: RoleEntity[];
  permissions: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login?: Timestamp;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  phone?: string;
  postal_code?: string;
  max_distance?: number;
  is_available?: boolean;
  white_whistle?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  postal_code?: string;
  max_distance?: number;
  is_available?: boolean;
  white_whistle?: boolean;
  availability_strategy?: AvailabilityStrategy;
}

export interface AdminUpdateUserRequest extends UpdateUserRequest {
  role?: UserRole;
  wage_per_game?: number;
}

export interface UserListQuery extends PaginationOptions {
  role?: UserRole;
  is_available?: boolean;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UserListResponse extends PaginatedResult<UserProfile> {}

// Game API types
export interface TeamInfo {
  organization: string;
  ageGroup: string;
  gender: Gender;
  rank: number;
}

export interface CreateGameRequest {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  date: string; // ISO date
  time: string; // HH:MM format
  location: string;
  postalCode: string;
  level: string;
  gameType?: GameType;
  division: string;
  season: string;
  payRate: number;
  refsNeeded?: number;
  wageMultiplier?: number;
  wageMultiplierReason?: string;
}

export interface UpdateGameRequest {
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;
  date?: string;
  time?: string;
  location?: string;
  postalCode?: string;
  level?: string;
  gameType?: GameType;
  division?: string;
  season?: string;
  payRate?: number;
  refsNeeded?: number;
  wageMultiplier?: number;
  wageMultiplierReason?: string;
}

export interface GameResponse {
  id: UUID;
  homeTeam: TeamInfo & { id?: UUID; display_name?: string };
  awayTeam: TeamInfo & { id?: UUID; display_name?: string };
  dateTime: Timestamp;
  location: string;
  field?: string;
  postalCode: string;
  level: string;
  gameType: GameType;
  division: string;
  season: string;
  payRate: number;
  refsNeeded: number;
  wageMultiplier: number;
  wageMultiplierReason?: string;
  status: string;
  assignments: AssignmentResponse[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GameListQuery extends PaginationOptions {
  date_from?: string;
  date_to?: string;
  level?: string;
  division?: string;
  season?: string;
  location?: string;
  status?: string;
  assigned?: boolean;
  user_id?: UUID;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface GameListResponse extends PaginatedResult<GameResponse> {}

// Assignment API types
export interface CreateAssignmentRequest {
  game_id: UUID;
  user_id: UUID;
  position_id: UUID;
  assigned_by?: UUID;
  status?: AssignmentStatus;
  calculated_wage?: number;
}

export interface UpdateAssignmentRequest {
  status?: AssignmentStatus;
  calculated_wage?: number;
  decline_reason?: string;
  rating?: number;
  feedback?: string;
}

export interface AssignmentResponse {
  id: UUID;
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
  user: {
    id: UUID;
    name: string;
    email: string;
    phone?: string;
  };
  position: {
    id: UUID;
    name: string;
    abbreviation: string;
  };
  game?: GameResponse;
  assigner?: {
    id: UUID;
    name: string;
    email: string;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface BulkAssignmentRequest {
  assignments: CreateAssignmentRequest[];
}

export interface AssignmentListQuery extends PaginationOptions {
  game_id?: UUID;
  user_id?: UUID;
  status?: AssignmentStatus;
  date_from?: string;
  date_to?: string;
  position_id?: UUID;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AssignmentListResponse extends PaginatedResult<AssignmentResponse> {}

// Team API types
export interface CreateTeamRequest {
  name: string;
  display_name?: string;
  organization: string;
  age_group: string;
  gender: Gender;
  rank: number;
  league_id?: UUID;
  team_number?: string;
  division?: string;
  home_location?: string;
  coach_name?: string;
  coach_email?: string;
  coach_phone?: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
}

export interface UpdateTeamRequest extends Partial<CreateTeamRequest> {}

export interface TeamResponse {
  id: UUID;
  name: string;
  display_name?: string;
  organization: string;
  age_group: string;
  gender: Gender;
  rank: number;
  league_id?: UUID;
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
  league?: {
    id: UUID;
    name: string;
    season: string;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TeamListQuery extends PaginationOptions {
  league_id?: UUID;
  organization?: string;
  age_group?: string;
  gender?: Gender;
  division?: string;
  is_active?: boolean;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface TeamListResponse extends PaginatedResult<TeamResponse> {}

// League API types
export interface CreateLeagueRequest {
  name: string;
  description?: string;
  season: string;
  start_date: string;
  end_date: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  settings: {
    divisions: string[];
    ageGroups: string[];
    gameTypes: GameType[];
    defaultGameDuration: number;
    refereesPerGame: number;
    allowSubstitutions: boolean;
    playoffs: {
      enabled: boolean;
      format?: string;
      startDate?: string;
    };
  };
}

export interface UpdateLeagueRequest extends Partial<CreateLeagueRequest> {}

export interface LeagueResponse {
  id: UUID;
  name: string;
  description?: string;
  season: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  settings: {
    divisions: string[];
    ageGroups: string[];
    gameTypes: GameType[];
    defaultGameDuration: number;
    refereesPerGame: number;
    allowSubstitutions: boolean;
    playoffs: {
      enabled: boolean;
      format?: string;
      startDate?: string;
    };
  };
  teams_count?: number;
  games_count?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface LeagueListQuery extends PaginationOptions {
  season?: string;
  is_active?: boolean;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface LeagueListResponse extends PaginatedResult<LeagueResponse> {}

// Role and Permission API types
export interface CreateRoleRequest {
  name: string;
  description?: string;
  color?: string;
  priority: number;
  permissions: string[];
  resource_permissions?: Record<string, string[]>;
  settings?: {
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
  };
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {}

export interface RoleResponse {
  id: UUID;
  name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  color?: string;
  priority: number;
  permissions: string[];
  resource_permissions: Record<string, string[]>;
  settings: CreateRoleRequest['settings'];
  user_count?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AssignRoleRequest {
  user_id: UUID;
  role_id: UUID;
  expires_at?: string;
}

export interface RoleAssignmentResponse {
  id: UUID;
  user_id: UUID;
  role_id: UUID;
  assigned_by: UUID;
  assigned_at: Timestamp;
  is_active: boolean;
  expires_at?: Timestamp;
  user: {
    id: UUID;
    name: string;
    email: string;
  };
  role: {
    id: UUID;
    name: string;
    color?: string;
  };
  assigner: {
    id: UUID;
    name: string;
    email: string;
  };
}

// Availability API types
export interface CreateAvailabilityRequest {
  date: string;
  is_available: boolean;
  time_slots?: {
    start_time: string;
    end_time: string;
    available: boolean;
  }[];
  notes?: string;
}

export interface UpdateAvailabilityRequest extends Partial<CreateAvailabilityRequest> {}

export interface AvailabilityResponse {
  id: UUID;
  user_id: UUID;
  date: string;
  is_available: boolean;
  time_slots?: {
    start_time: string;
    end_time: string;
    available: boolean;
  }[];
  notes?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AvailabilityListQuery extends PaginationOptions {
  user_id?: UUID;
  date_from?: string;
  date_to?: string;
  is_available?: boolean;
  search?: string;
}

// Mentorship API types
export interface CreateMentorshipProgramRequest {
  name: string;
  description?: string;
  level: string;
  duration_weeks: number;
  max_mentees: number;
  requirements?: string[];
  learning_objectives?: string[];
  enrollment_deadline?: string;
  start_date: string;
  end_date: string;
}

export interface MentorshipProgramResponse {
  id: UUID;
  name: string;
  description?: string;
  level: string;
  duration_weeks: number;
  max_mentees: number;
  requirements?: string[];
  learning_objectives?: string[];
  is_active: boolean;
  enrollment_deadline?: string;
  start_date: string;
  end_date: string;
  current_mentees?: number;
  available_spots?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CreateMentorshipRelationshipRequest {
  mentor_id: UUID;
  mentee_id: UUID;
  program_id: UUID;
}

export interface MentorshipRelationshipResponse {
  id: UUID;
  mentor_id: UUID;
  mentee_id: UUID;
  program_id: UUID;
  status: string;
  started_at: Timestamp;
  completed_at?: Timestamp;
  progress_percentage: number;
  mentor_feedback?: string;
  mentee_feedback?: string;
  next_session_date?: string;
  total_sessions_completed: number;
  mentor: {
    id: UUID;
    name: string;
    email: string;
  };
  mentee: {
    id: UUID;
    name: string;
    email: string;
  };
  program: {
    id: UUID;
    name: string;
    level: string;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Payment API types
export interface PaymentResponse {
  id: UUID;
  user_id: UUID;
  game_id?: UUID;
  assignment_id?: UUID;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: string;
  reference_number?: string;
  notes?: string;
  tax_amount?: number;
  fees?: number;
  net_amount: number;
  user: {
    id: UUID;
    name: string;
    email: string;
  };
  game?: {
    id: UUID;
    homeTeam: TeamInfo;
    awayTeam: TeamInfo;
    dateTime: Timestamp;
    location: string;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PaymentListQuery extends PaginationOptions {
  user_id?: UUID;
  game_id?: UUID;
  status?: string;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaymentListResponse extends PaginatedResult<PaymentResponse> {}

// Statistics and Analytics API types
export interface UserStatisticsResponse {
  total_games_assigned: number;
  total_games_completed: number;
  total_games_declined: number;
  completion_rate: number;
  average_rating: number;
  total_earnings: number;
  games_this_month: number;
  games_next_month: number;
  favorite_positions: {
    position: string;
    count: number;
  }[];
  monthly_activity: {
    month: string;
    games: number;
    earnings: number;
  }[];
}

export interface SystemStatisticsResponse {
  total_users: number;
  total_games: number;
  total_assignments: number;
  active_referees: number;
  upcoming_games: number;
  completion_rate: number;
  user_growth: {
    period: string;
    new_users: number;
  }[];
  game_statistics: {
    total_games: number;
    completed_games: number;
    cancelled_games: number;
    average_refs_per_game: number;
  };
}

// File upload types
export interface FileUploadResponse {
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  url: string;
  upload_date: Timestamp;
}

// Route parameter types
export interface RouteParams {
  id: UUID;
}

export interface UserRouteParams extends RouteParams {
  userId?: UUID;
}

export interface GameRouteParams extends RouteParams {
  gameId?: UUID;
}

export interface AssignmentRouteParams extends RouteParams {
  assignmentId?: UUID;
}

export interface RoleRouteParams extends RouteParams {
  roleId?: UUID;
}