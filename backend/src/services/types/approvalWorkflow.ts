/**
 * @fileoverview TypeScript type definitions for ApprovalWorkflowService
 * Provides comprehensive type safety for approval workflow and state machine operations
 *
 * @author Claude Assistant
 * @date 2025-01-23
 */

/**
 * Approval workflow configuration
 */
export interface WorkflowConfig {
  workflowId: string | null;
  workflowName: string;
  workflowType: WorkflowType;
  totalStages: number;
  stages: WorkflowStage[];
  allowParallelApproval?: boolean;
  notificationConfig?: NotificationConfig;
  sendReminders?: boolean;
  reminderFrequencyHours?: number;
  maxReminders?: number;
  autoApproved?: boolean;
  autoApprovalReason?: string;
}

/**
 * Workflow stage definition
 */
export interface WorkflowStage {
  stageNumber: number;
  stageName: string;
  description: string;
  requiredApprovers: Approver[];
  minimumApprovers: number;
  requiresAllApprovers: boolean;
  approvalLimit: number | null;
  canModifyAmount: boolean;
  deadlineHours: number;
  escalationHours: number;
  escalationRules: EscalationRules;
  allowDelegation: boolean;
  conditions: StageConditions;
}

/**
 * Approver information
 */
export interface Approver {
  id: string;
  name: string;
  email: string;
  role: string;
  delegated?: boolean;
}

/**
 * Escalation rules configuration
 */
export interface EscalationRules {
  escalateTo?: string;
  escalationMessage?: string;
  [key: string]: any;
}

/**
 * Stage conditions for workflow evaluation
 */
export interface StageConditions {
  requiresBusinessJustification?: boolean;
  requiresReceiptValidation?: boolean;
  requiresBusinessCase?: boolean;
  requiresCompetitiveQuotes?: boolean;
  [key: string]: any;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  email?: boolean;
  inApp?: boolean;
  slack?: boolean;
  webhook?: boolean;
  autoApproval?: boolean;
  [key: string]: any;
}

/**
 * Expense data structure
 */
export interface ExpenseData {
  id: string;
  vendor_name?: string;
  total_amount: number | string;
  description?: string;
  transaction_date?: Date | string;
  payment_status?: PaymentStatus;
  user_id: string;
  organization_id?: string;
  receipt_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Payment method information
 */
export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  requires_approval?: boolean;
  approval_limit?: number;
  name?: string;
  description?: string;
}

/**
 * User information for workflow processing
 */
export interface WorkflowUser {
  id: string;
  organization_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  role: string;
  department?: string;
  manager_id?: string;
}

/**
 * Approval decision structure
 */
export interface ApprovalDecision {
  action: ApprovalAction;
  notes?: string;
  approvedAmount?: number;
  rejectionReason?: string;
  requiredInformation?: RequiredInformation[];
}

/**
 * Required information for approval
 */
export interface RequiredInformation {
  type: string;
  description: string;
  required: boolean;
  deadline?: Date;
}

/**
 * Approval record in database
 */
export interface ApprovalRecord {
  id: string;
  expense_data_id: string;
  user_id: string;
  organization_id: string;
  workflow_id: string | null;
  stage_number: number;
  total_stages: number;
  is_parallel_approval: boolean;
  required_approvers: string; // JSON string
  stage_status: ApprovalStatus;
  status?: ApprovalStatus;
  stage_started_at: Date | null;
  stage_deadline: Date | null;
  escalation_hours: number;
  approval_conditions: string; // JSON string
  approval_limit: number | null;
  notification_settings: string; // JSON string
  risk_level: RiskLevel;
  requires_additional_review: boolean;
  approver_id: string | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  approval_notes: string | null;
  approved_amount: number | null;
  rejection_reason: string | null;
  required_information: string | null; // JSON string
  delegated_to: string | null;
  delegated_by: string | null;
  delegated_at: Date | null;
  delegation_reason: string | null;
  escalated_to: string | null;
  escalated_at: Date | null;
  escalation_reason: string | null;
  conditions_met: boolean | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Workflow template for custom workflows
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  workflow_type: WorkflowType;
  workflow_stages: string; // JSON string
  default_escalation_hours: number;
  allow_delegation: boolean;
  allow_parallel_approval: boolean;
  notification_config: string; // JSON string
  send_reminders: boolean;
  reminder_frequency_hours: number;
  max_reminders: number;
  is_active: boolean;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Auto-approval thresholds by payment method
 */
export interface AutoApprovalThresholds {
  person_reimbursement: number;
  credit_card: number;
  purchase_order: number;
  direct_vendor: number;
  [key: string]: number;
}

/**
 * Pending approval with related data
 */
export interface PendingApproval extends ApprovalRecord {
  vendor_name?: string;
  description?: string;
  transaction_date?: Date;
  original_filename?: string;
  submitter_first_name?: string;
  submitter_last_name?: string;
  submitter_email?: string;
}

/**
 * Approval history with user details
 */
export interface ApprovalHistory extends ApprovalRecord {
  approver_first_name?: string;
  approver_last_name?: string;
  approver_email?: string;
  delegated_to_first_name?: string;
  delegated_to_last_name?: string;
  delegated_by_first_name?: string;
  delegated_by_last_name?: string;
}

/**
 * Escalation information
 */
export interface EscalationInfo {
  approvalId: string;
  escalationTarget: WorkflowUser;
  escalationReason: string;
  originalApprovers: Approver[];
  overdueHours: number;
}

/**
 * Delegation information
 */
export interface DelegationInfo {
  approvalId: string;
  delegateTo: string;
  delegatedBy: string;
  reason: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

/**
 * Workflow statistics
 */
export interface WorkflowStats {
  totalApprovals: number;
  pendingApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  escalatedCount: number;
  autoApprovedCount: number;
  averageApprovalTime: number;
  overdueApprovals: number;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  expenseData: ExpenseData;
  paymentMethod: PaymentMethod;
  user: WorkflowUser;
  organizationSettings?: OrganizationSettings;
  customRules?: CustomWorkflowRule[];
}

/**
 * Organization-specific workflow settings
 */
export interface OrganizationSettings {
  autoApprovalThresholds: AutoApprovalThresholds;
  highValueThreshold: number;
  executiveApprovalThreshold: number;
  escalationTimeoutHours: number;
  reminderFrequencyHours: number;
  maxReminders: number;
  enableDelegation: boolean;
  requireReceiptsAbove: number;
}

/**
 * Custom workflow rule
 */
export interface CustomWorkflowRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  isActive: boolean;
}

/**
 * Rule condition for custom workflows
 */
export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

/**
 * Rule action for custom workflows
 */
export interface RuleAction {
  type: ActionType;
  parameters: Record<string, any>;
}

/**
 * Workflow filters for queries
 */
export interface WorkflowFilters {
  organizationId?: string;
  urgent?: boolean;
  status?: ApprovalStatus;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  riskLevel?: RiskLevel;
  amountMin?: number;
  amountMax?: number;
}

/**
 * Enum types
 */
export type WorkflowType = 'default' | 'auto_approval' | 'custom' | 'template' | 'expedited';

export type PaymentMethodType = 'person_reimbursement' | 'credit_card' | 'purchase_order' | 'direct_vendor' | 'corporate_card';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'paid' | 'cancelled';

export type ApprovalAction = 'approved' | 'rejected' | 'needs_info' | 'delegated' | 'escalated';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_info' | 'delegated' | 'escalated' | 'expired';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';

export type LogicalOperator = 'and' | 'or';

export type ActionType = 'skip_stage' | 'add_approver' | 'change_deadline' | 'require_additional_info' | 'auto_approve' | 'escalate_immediately';

/**
 * Error types for workflow operations
 */
export enum WorkflowErrorType {
  INVALID_WORKFLOW = 'INVALID_WORKFLOW',
  APPROVAL_NOT_FOUND = 'APPROVAL_NOT_FOUND',
  UNAUTHORIZED_APPROVER = 'UNAUTHORIZED_APPROVER',
  WORKFLOW_ALREADY_PROCESSED = 'WORKFLOW_ALREADY_PROCESSED',
  ESCALATION_FAILED = 'ESCALATION_FAILED',
  DELEGATION_FAILED = 'DELEGATION_FAILED',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * Custom workflow error
 */
export class WorkflowError extends Error {
  constructor(
    public type: WorkflowErrorType,
    message: string,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

/**
 * Approval workflow service interface
 */
export interface IApprovalWorkflowService {
  // Configuration
  readonly ESCALATION_TIMEOUT_HOURS: number;
  readonly REMINDER_FREQUENCY_HOURS: number;
  readonly MAX_REMINDERS: number;
  readonly AUTO_APPROVAL_THRESHOLDS: AutoApprovalThresholds;
  readonly HIGH_VALUE_THRESHOLD: number;

  // Core workflow methods
  determineWorkflow(
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<WorkflowConfig>;

  buildDefaultWorkflow(
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<WorkflowConfig>;

  buildWorkflowFromTemplate(
    template: WorkflowTemplate,
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<WorkflowConfig>;

  createApprovalWorkflow(
    expenseDataId: string,
    workflow: WorkflowConfig,
    user: WorkflowUser
  ): Promise<ApprovalRecord[]>;

  // Approval processing
  processApprovalDecision(
    approvalId: string,
    decision: ApprovalDecision,
    approver: WorkflowUser
  ): Promise<ApprovalRecord>;

  autoApproveExpense(
    expenseDataId: string,
    workflow: WorkflowConfig,
    user: WorkflowUser
  ): Promise<ApprovalRecord[]>;

  // Workflow progression
  progressWorkflow(approval: ApprovalRecord): Promise<void>;
  completeWorkflow(approval: ApprovalRecord): Promise<void>;
  startNextStage(currentApproval: ApprovalRecord): Promise<void>;
  rejectWorkflow(approval: ApprovalRecord): Promise<void>;

  // Delegation and escalation
  delegateApproval(
    approvalId: string,
    delegateTo: string,
    delegatedBy: string,
    reason: string
  ): Promise<ApprovalRecord>;

  handleEscalations(): Promise<number>;
  escalateApproval(approval: ApprovalRecord): Promise<void>;

  // Notifications
  sendApprovalNotification(approval: ApprovalRecord, targetUser?: WorkflowUser): Promise<void>;
  sendEscalationNotification(approval: ApprovalRecord, escalationTarget: WorkflowUser): Promise<void>;

  // Queries and reporting
  getPendingApprovalsForUser(userId: string, filters?: WorkflowFilters): Promise<PendingApproval[]>;
  getApprovalHistory(expenseDataId: string): Promise<ApprovalHistory[]>;

  // Helper methods
  getManagerApprovers(user: WorkflowUser): Promise<Approver[]>;
  getFinanceApprovers(user: WorkflowUser): Promise<Approver[]>;
  getExecutiveApprovers(user: WorkflowUser): Promise<Approver[]>;
  determineEscalationTarget(approval: ApprovalRecord, escalationRules: EscalationRules): Promise<WorkflowUser | null>;
  evaluateStageConditions(
    conditions: StageConditions,
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<boolean>;
  resolveApprovers(approverRules: any, user: WorkflowUser): Promise<Approver[]>;
  calculateRiskLevel(expenseDataId: string, stage: WorkflowStage, user: WorkflowUser): RiskLevel;
}