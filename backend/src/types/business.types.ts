/**
 * @fileoverview Business logic type definitions
 * @description TypeScript interfaces for business rules, services, workflows,
 * calculations, and domain-specific logic in the Sports Manager application.
 */

import { 
  UUID, 
  Timestamp, 
  UserRole, 
  GameType, 
  Gender, 
  AssignmentStatus,
  User,
  GameEntity,
  AssignmentEntity,
  TeamEntity,
  MentorshipRelationshipEntity,
  MentorshipProgramEntity
} from './index';

// Service layer interfaces
export interface BaseServiceOptions {
  defaultOrderBy?: string;
  defaultOrderDirection: 'asc' | 'desc';
  enableAuditTrail?: boolean;
  enableSoftDelete?: boolean;
  timestampFields?: {
    created: string;
    updated: string;
    deleted?: string;
  };
}

export interface ServiceContext {
  user?: {
    id: UUID;
    role: UserRole;
    permissions: string[];
  };
  transaction?: any; // Knex transaction object
  auditTrail?: boolean;
  skipValidation?: boolean;
  metadata?: Record<string, any>;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    affectedRows?: number;
    executionTime?: number;
    cacheHit?: boolean;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  value?: any;
}

// Game scheduling and assignment logic
export interface GameAssignmentRequest {
  game_id: UUID;
  required_positions: PositionRequirement[];
  preferences?: AssignmentPreferences;
  constraints?: AssignmentConstraints;
  auto_assign?: boolean;
}

export interface PositionRequirement {
  position_id: UUID;
  quantity: number;
  required_level?: string;
  preferred_experience?: number;
  must_have_whistle?: boolean;
  backup_positions?: UUID[];
}

export interface AssignmentPreferences {
  prefer_local_referees?: boolean;
  max_travel_distance?: number;
  prefer_experienced?: boolean;
  avoid_back_to_back?: boolean;
  prefer_consistent_crews?: boolean;
  priority_users?: UUID[];
}

export interface AssignmentConstraints {
  excluded_users?: UUID[];
  required_users?: UUID[];
  max_assignments_per_user_per_day?: number;
  min_rest_hours_between_games?: number;
  respect_availability?: boolean;
  enforce_conflict_rules?: boolean;
}

export interface AssignmentSuggestion {
  user_id: UUID;
  position_id: UUID;
  confidence_score: number;
  reasons: AssignmentReason[];
  conflicts: AssignmentConflict[];
  travel_distance?: number;
  estimated_wage?: number;
}

export interface AssignmentReason {
  type: AssignmentReasonType;
  description: string;
  weight: number;
}

export enum AssignmentReasonType {
  LOCATION = 'location',
  EXPERIENCE = 'experience',
  AVAILABILITY = 'availability',
  PERFORMANCE = 'performance',
  PREFERENCE = 'preference',
  LEVEL_MATCH = 'level_match',
  HISTORY = 'history'
}

export interface AssignmentConflict {
  type: AssignmentConflictType;
  description: string;
  severity: ConflictSeverity;
  resolvable: boolean;
}

export enum AssignmentConflictType {
  TIME_OVERLAP = 'time_overlap',
  TRAVEL_TIME = 'travel_time',
  MAX_ASSIGNMENTS = 'max_assignments',
  UNAVAILABLE = 'unavailable',
  LEVEL_MISMATCH = 'level_mismatch',
  BLACKLISTED = 'blacklisted'
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// User availability and scheduling
export interface AvailabilityRule {
  user_id: UUID;
  type: AvailabilityRuleType;
  pattern: AvailabilityPattern;
  effective_from: Date;
  effective_until?: Date;
  priority: number;
}

export enum AvailabilityRuleType {
  RECURRING_WEEKLY = 'recurring_weekly',
  RECURRING_MONTHLY = 'recurring_monthly',
  DATE_RANGE = 'date_range',
  SPECIFIC_DATE = 'specific_date',
  EXCEPTION = 'exception'
}

export interface AvailabilityPattern {
  days_of_week?: number[]; // 0 = Sunday, 6 = Saturday
  dates?: Date[];
  date_ranges?: DateRange[];
  time_ranges?: TimeRange[];
  locations?: string[];
  game_types?: GameType[];
}

export interface DateRange {
  start_date: Date;
  end_date: Date;
}

export interface TimeRange {
  start_time: string; // HH:MM format
  end_time: string;
}

export interface AvailabilityCheck {
  user_id: UUID;
  date: Date;
  time_range?: TimeRange;
  location?: string;
  game_type?: GameType;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: AvailabilityConflict[];
  partial_availability?: TimeRange[];
  notes?: string;
}

export interface AvailabilityConflict {
  type: 'assignment' | 'blackout' | 'recurring' | 'personal';
  description: string;
  conflicting_item_id?: UUID;
  severity: ConflictSeverity;
}

// Payment and wage calculation
export interface WageCalculation {
  base_rate: number;
  multipliers: WageMultiplier[];
  bonuses: WageBonus[];
  deductions: WageDeduction[];
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  currency: string;
}

export interface WageMultiplier {
  type: WageMultiplierType;
  factor: number;
  description: string;
  amount: number;
}

export enum WageMultiplierType {
  LEVEL = 'level',
  GAME_TYPE = 'game_type',
  POSITION = 'position',
  EXPERIENCE = 'experience',
  HOLIDAY = 'holiday',
  OVERTIME = 'overtime',
  TRAVEL = 'travel',
  CUSTOM = 'custom'
}

export interface WageBonus {
  type: WageBonusType;
  amount: number;
  description: string;
}

export enum WageBonusType {
  PERFORMANCE = 'performance',
  LOYALTY = 'loyalty',
  CERTIFICATION = 'certification',
  MENTORSHIP = 'mentorship',
  ADMIN_DUTY = 'admin_duty',
  CUSTOM = 'custom'
}

export interface WageDeduction {
  type: WageDeductionType;
  amount: number;
  description: string;
}

export enum WageDeductionType {
  TAX = 'tax',
  INSURANCE = 'insurance',
  UNION_DUES = 'union_dues',
  EQUIPMENT = 'equipment',
  PENALTY = 'penalty',
  CUSTOM = 'custom'
}

export interface PaymentSchedule {
  id: UUID;
  name: string;
  frequency: PaymentFrequency;
  day_of_month?: number;
  day_of_week?: number;
  cutoff_days: number;
  processing_days: number;
  minimum_amount?: number;
  is_active: boolean;
}

export enum PaymentFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  ON_COMPLETION = 'on_completion'
}

// Performance tracking and analytics
export interface PerformanceMetrics {
  user_id: UUID;
  period_start: Date;
  period_end: Date;
  games_assigned: number;
  games_completed: number;
  games_declined: number;
  games_cancelled: number;
  completion_rate: number;
  decline_rate: number;
  average_rating: number;
  total_ratings: number;
  punctuality_score: number;
  communication_score: number;
  professionalism_score: number;
  total_earnings: number;
  average_earnings_per_game: number;
}

export interface PerformanceRating {
  id: UUID;
  assignment_id: UUID;
  rated_by: UUID;
  rating: number; // 1-5 scale
  categories: PerformanceCategory[];
  comments?: string;
  submitted_at: Timestamp;
}

export interface PerformanceCategory {
  category: PerformanceCategoryType;
  rating: number;
  weight: number;
}

export enum PerformanceCategoryType {
  PUNCTUALITY = 'punctuality',
  COMMUNICATION = 'communication',
  PROFESSIONALISM = 'professionalism',
  KNOWLEDGE = 'knowledge',
  DECISION_MAKING = 'decision_making',
  FITNESS = 'fitness',
  APPEARANCE = 'appearance',
  GAME_MANAGEMENT = 'game_management'
}

// Mentorship system
export interface MentorshipMatchingCriteria {
  mentor_requirements: MentorRequirements;
  mentee_requirements: MenteeRequirements;
  matching_preferences: MatchingPreferences;
}

export interface MentorRequirements {
  min_experience_years: number;
  required_certifications: string[];
  required_performance_rating: number;
  max_mentees: number;
  preferred_locations?: string[];
  available_time_slots: TimeRange[];
}

export interface MenteeRequirements {
  max_experience_years: number;
  current_level: string;
  target_level: string;
  learning_goals: string[];
  time_commitment: number; // hours per week
  preferred_locations?: string[];
  available_time_slots: TimeRange[];
}

export interface MatchingPreferences {
  location_weight: number;
  experience_weight: number;
  availability_weight: number;
  personality_weight: number;
  specialization_weight: number;
}

export interface MentorshipMatch {
  mentor_id: UUID;
  mentee_id: UUID;
  compatibility_score: number;
  match_reasons: MatchReason[];
  potential_conflicts: string[];
  recommended_program_id?: UUID;
}

export interface MatchReason {
  category: string;
  description: string;
  score: number;
}

export interface MentorshipProgress {
  relationship_id: UUID;
  current_phase: MentorshipPhase;
  completed_objectives: string[];
  pending_objectives: string[];
  next_milestones: MentorshipMilestone[];
  progress_percentage: number;
  estimated_completion: Date;
}

export interface MentorshipPhase {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
  objectives: string[];
  required_sessions: number;
  assessment_criteria: AssessmentCriteria[];
}

export interface MentorshipMilestone {
  id: string;
  name: string;
  description: string;
  target_date: Date;
  status: MilestoneStatus;
  requirements: string[];
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  SKIPPED = 'skipped'
}

export interface AssessmentCriteria {
  category: string;
  weight: number;
  passing_score: number;
  assessment_method: AssessmentMethod;
}

export enum AssessmentMethod {
  OBSERVATION = 'observation',
  WRITTEN_TEST = 'written_test',
  PRACTICAL_TEST = 'practical_test',
  PEER_REVIEW = 'peer_review',
  SELF_ASSESSMENT = 'self_assessment'
}

// Notification and communication
export interface NotificationRule {
  id: UUID;
  name: string;
  trigger: NotificationTrigger;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  is_active: boolean;
  priority: number;
}

export interface NotificationTrigger {
  event_type: NotificationEventType;
  entity_type: string;
  timing: NotificationTiming;
}

export enum NotificationEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  DUE = 'due',
  OVERDUE = 'overdue'
}

export interface NotificationTiming {
  type: 'immediate' | 'scheduled' | 'recurring';
  offset?: number; // minutes before/after trigger
  schedule?: CronSchedule;
}

export interface CronSchedule {
  minute: string;
  hour: string;
  day: string;
  month: string;
  day_of_week: string;
}

export interface NotificationCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null'
}

export interface NotificationAction {
  type: NotificationActionType;
  template_id: UUID;
  recipients: NotificationRecipient[];
  delivery_methods: string[];
  retry_policy?: RetryPolicy;
}

export enum NotificationActionType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
  SLACK = 'slack'
}

export interface NotificationRecipient {
  type: 'user' | 'role' | 'email' | 'webhook';
  identifier: string;
  conditions?: NotificationCondition[];
}

export interface RetryPolicy {
  max_attempts: number;
  retry_delay: number; // seconds
  backoff_factor: number;
  max_delay: number; // seconds
}

// Reporting and analytics
export interface ReportDefinition {
  id: UUID;
  name: string;
  description?: string;
  report_type: ReportType;
  data_sources: DataSource[];
  filters: ReportFilter[];
  grouping: ReportGrouping[];
  sorting: ReportSorting[];
  aggregations: ReportAggregation[];
  formatting: ReportFormatting;
  schedule?: ReportSchedule;
  access_control: ReportAccessControl;
}

export enum ReportType {
  TABULAR = 'tabular',
  CHART = 'chart',
  DASHBOARD = 'dashboard',
  EXPORT = 'export'
}

export interface DataSource {
  table: string;
  alias?: string;
  joins?: JoinDefinition[];
  conditions?: QueryCondition[];
}

export interface JoinDefinition {
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  on: string;
}

export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface ReportFilter {
  field: string;
  label: string;
  type: FilterType;
  required: boolean;
  default_value?: any;
  options?: FilterOption[];
}

export enum FilterType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  BOOLEAN = 'boolean',
  USER = 'user'
}

export interface FilterOption {
  value: any;
  label: string;
  group?: string;
}

export interface ReportGrouping {
  field: string;
  label?: string;
  order: number;
}

export interface ReportSorting {
  field: string;
  direction: 'ASC' | 'DESC';
  order: number;
}

export interface ReportAggregation {
  field: string;
  function: AggregationFunction;
  alias?: string;
}

export enum AggregationFunction {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  DISTINCT_COUNT = 'COUNT_DISTINCT'
}

export interface ReportFormatting {
  page_size?: number;
  currency_format?: string;
  date_format?: string;
  number_format?: string;
  show_totals?: boolean;
  show_subtotals?: boolean;
}

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  day_of_week?: number;
  day_of_month?: number;
  time: string; // HH:MM format
  timezone: string;
  recipients: string[];
  format: ExportFormat;
}

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly'
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

export interface ReportAccessControl {
  roles: UserRole[];
  users: UUID[];
  public: boolean;
  department_restricted?: string[];
}

// Integration and external services
export interface ExternalServiceConfig {
  service_name: string;
  base_url: string;
  api_key?: string;
  authentication: AuthenticationMethod;
  rate_limits: RateLimitConfig;
  timeout: number; // seconds
  retry_policy: ExternalServiceRetryPolicy;
  health_check: HealthCheckConfig;
}

export enum AuthenticationMethod {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  BEARER_TOKEN = 'bearer_token',
  BASIC_AUTH = 'basic_auth',
  CUSTOM = 'custom'
}

export interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
}

export interface ExternalServiceRetryPolicy {
  max_attempts: number;
  base_delay: number; // milliseconds
  max_delay: number; // milliseconds
  backoff_strategy: BackoffStrategy;
  retryable_status_codes: number[];
}

export enum BackoffStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  JITTER = 'jitter'
}

export interface HealthCheckConfig {
  enabled: boolean;
  endpoint: string;
  interval: number; // seconds
  timeout: number; // seconds
  expected_status: number;
}

// Workflow and state management
export interface WorkflowDefinition {
  id: UUID;
  name: string;
  description?: string;
  entity_type: string;
  initial_state: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  rules: WorkflowRule[];
  is_active: boolean;
}

export interface WorkflowState {
  id: string;
  name: string;
  description?: string;
  is_final: boolean;
  actions: StateAction[];
  notifications: string[];
  permissions: string[];
}

export interface StateAction {
  type: StateActionType;
  config: Record<string, any>;
  conditions?: ActionCondition[];
}

export enum StateActionType {
  SEND_EMAIL = 'send_email',
  CREATE_TASK = 'create_task',
  UPDATE_FIELD = 'update_field',
  CALL_WEBHOOK = 'call_webhook',
  SCHEDULE_JOB = 'schedule_job'
}

export interface ActionCondition {
  field: string;
  operator: string;
  value: any;
}

export interface WorkflowTransition {
  from_state: string;
  to_state: string;
  trigger: TransitionTrigger;
  conditions: TransitionCondition[];
  actions: TransitionAction[];
  required_permissions: string[];
}

export interface TransitionTrigger {
  type: 'manual' | 'automatic' | 'scheduled' | 'event';
  event_name?: string;
  schedule?: CronSchedule;
}

export interface TransitionCondition {
  field: string;
  operator: string;
  value: any;
}

export interface TransitionAction {
  type: string;
  config: Record<string, any>;
}

export interface WorkflowRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
}

export interface RuleCondition {
  type: 'expression' | 'script';
  expression?: string;
  script?: string;
}

export interface RuleAction {
  type: string;
  config: Record<string, any>;
}

// Tournament system types
export interface TournamentRequest {
  name: string;
  league_id: UUID;
  tournament_type: TournamentType;
  team_ids: UUID[];
  start_date: Date;
  venue?: string;
  time_slots?: string[];
  days_of_week?: number[];
  games_per_day?: number;
  rounds?: number; // For swiss system
  group_size?: number; // For group stage playoffs
  advance_per_group?: number; // For group stage playoffs
  seeding_method?: SeedingMethod;
}

export enum TournamentType {
  ROUND_ROBIN = 'round_robin',
  SINGLE_ELIMINATION = 'single_elimination',
  SWISS_SYSTEM = 'swiss_system',
  GROUP_STAGE_PLAYOFFS = 'group_stage_playoffs'
}

export enum SeedingMethod {
  RANDOM = 'random',
  RANKED = 'ranked',
  CUSTOM = 'custom'
}

export interface TournamentOptions {
  venue: string;
  startDate: Date;
  timeSlots: string[];
  daysOfWeek: number[];
  gamesPerDay: number;
  seedingMethod: SeedingMethod;
  rounds?: number;
  groupSize?: number;
  advancePerGroup?: number;
}

export interface TournamentGame {
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  game_date: string;
  game_time: string;
  location: string;
  venue?: string;
  round: number;
  round_name?: string;
  tournament_type: TournamentType;
  group_id?: number;
  group_name?: string;
  stage?: TournamentStage;
  league_id?: UUID;
  tournament_name?: string;
  level?: string;
  pay_rate?: number;
  refs_needed?: number;
  status?: string;
  postal_code?: string;
}

export enum TournamentStage {
  GROUP_STAGE = 'group_stage',
  PLAYOFFS = 'playoffs',
  FINALS = 'finals'
}

export interface TournamentRound {
  round: number;
  round_name?: string;
  stage?: TournamentStage;
  games: TournamentGame[];
  group_id?: number;
  group_name?: string;
}

export interface TournamentGroup {
  id: number;
  name: string;
  teams: TeamEntity[];
}

export interface TournamentResult {
  type: TournamentType;
  total_games: number;
  total_rounds: number;
  games: TournamentGame[];
  rounds: TournamentRound[];
  groups?: TournamentGroup[];
  summary: TournamentSummary;
}

export interface TournamentSummary {
  teams_count: number;
  format: string;
  estimated_duration_days: number;
  games_per_team?: number;
  byes_added?: number;
  max_games_per_team?: number;
  groups_count?: number;
  teams_per_group?: number;
  advancing_per_group?: number;
  group_stage_games?: number;
  playoff_games?: number;
  rounds?: number;
}

export interface TournamentFormat {
  id: TournamentType;
  name: string;
  description: string;
  min_teams: number;
  max_teams: number;
  pros: string[];
  cons: string[];
  games_formula: string;
  suitable_for: string;
}

export interface TournamentEstimate {
  tournament_type: TournamentType;
  team_count: number;
  estimate: {
    total_games: number;
    estimated_days: number;
    rounds: number;
    games_per_team?: number;
    max_games_per_team?: number;
    byes_needed?: number;
    groups?: number;
    advancing_teams?: number;
    group_stage_games?: number;
    playoff_games?: number;
  };
}

export interface TournamentCreateRequest {
  games: TournamentGame[];
  tournament_name?: string;
}

export interface TournamentCreateResult {
  created: any[];
  summary: {
    requested: number;
    created: number;
    skipped: number;
  };
}

export interface TournamentTeam extends Omit<TeamEntity, 'rank'> {
  rank?: number;
  is_bye?: boolean;
  is_placeholder?: boolean;
  source_game?: TournamentGame;
  wins?: number;
  losses?: number;
  opponents?: string[];
}