import { Request } from 'express';
import { UUID } from 'crypto';

// Base interfaces
export interface AuthenticatedUser {
  id: string;
  email: string;
  organization_id?: string;
  roles?: string[] | Role[];
}

export interface Role {
  id: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  file?: any;
}

// Receipt and Expense interfaces
export interface ExpenseReceipt {
  id: string;
  user_id: string;
  organization_id: string;
  original_filename: string;
  file_path: string;
  file_type: 'image' | 'pdf';
  mime_type: string;
  file_size: number;
  file_hash: string;
  processing_status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'manual_review';
  processing_metadata?: string | ProcessingMetadata;
  raw_ocr_text?: string;
  processed_at?: Date;
  processing_notes?: string;
  processing_time_ms?: number;
  uploaded_at: Date;
  updated_at: Date;
}

export interface ProcessingMetadata {
  description?: string;
  business_purpose?: string;
  project_code?: string;
  department?: string;
  payment_method_id?: string;
  purchase_order_id?: string;
  credit_card_id?: string;
  expense_urgency?: ExpenseUrgency;
  urgency_justification?: string;
}

export interface ExpenseData {
  id: string;
  receipt_id: string;
  user_id: string;
  organization_id: string;
  vendor_name: string;
  total_amount: number;
  transaction_date: Date;
  category_id?: string;
  description?: string;
  business_purpose?: string;
  project_code?: string;
  payment_method_id?: string;
  payment_method_type?: PaymentMethodType;
  purchase_order_id?: string;
  credit_card_id?: string;
  payment_status: PaymentStatus;
  extraction_confidence?: number;
  line_items?: string | LineItem[];
  vendor_invoice_number?: string;
  credit_card_transaction_id?: string;
  expense_urgency?: ExpenseUrgency;
  urgency_justification?: string;
  submission_notes?: string;
  is_reimbursable?: boolean;
  reimbursement_user_id?: string;
  reimbursement_notes?: string;
  credit_card_reconciled?: boolean;
  credit_card_statement_date?: Date;
  reconciled_by?: string;
  reconciled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  color_code?: string;
  description?: string;
  keywords?: string[] | string;
  is_default?: boolean;
  active?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ExpenseApproval {
  id: string;
  expense_data_id: string;
  stage_number: number;
  total_stages: number;
  stage_status: ApprovalStatus;
  required_approvers: string | ApprovalUser[];
  stage_started_at: Date;
  stage_deadline?: Date;
  approval_notes?: string;
  approved_amount?: number;
  rejection_reason?: string;
  required_information?: string[];
  risk_level?: RiskLevel;
  requires_additional_review?: boolean;
  notification_count?: number;
  last_notification_sent?: Date;
  approver_id?: string;
  delegated_to?: string;
  delegated_by?: string;
  delegation_reason?: string;
  delegated_at?: Date;
  escalated_to?: string;
  escalated_at?: Date;
  escalation_reason?: string;
  approved_at?: Date;
  rejected_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalUser {
  id: string;
  name: string;
  email: string;
}

export interface ExpenseReimbursement {
  id: string;
  expense_data_id: string;
  receipt_id: string;
  reimbursement_user_id: string;
  organization_id: string;
  approved_amount: number;
  reimbursed_amount?: number;
  payment_method: ReimbursementPaymentMethod;
  scheduled_pay_date?: Date;
  pay_period?: string;
  processed_by: string;
  processing_notes?: string;
  status: ReimbursementStatus;
  payment_reference?: string;
  paid_date?: Date;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserEarning {
  id: string;
  user_id: string;
  organization_id: string;
  earning_type: EarningType;
  amount: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
  pay_period?: string;
  earned_date: Date;
  pay_date?: Date;
  payment_status: PaymentStatus;
  processed_by?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentMethod {
  id: string;
  organization_id: string;
  name: string;
  type: PaymentMethodType;
  requires_approval?: boolean;
  approval_limit?: number;
  is_active?: boolean;
  created_at: Date;
  updated_at: Date;
}

// Enums and Type Unions
export type ExpenseUrgency = 'low' | 'normal' | 'high' | 'urgent';
export type PaymentMethodType = 'credit_card' | 'debit_card' | 'cash' | 'check' | 'wire_transfer' | 'ach' | 'petty_cash' | 'reimbursement';
export type PaymentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'requires_information';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ReimbursementPaymentMethod = 'payroll' | 'check' | 'direct_deposit' | 'petty_cash';
export type ReimbursementStatus = 'pending' | 'scheduled' | 'paid' | 'cancelled' | 'disputed';
export type EarningType = 'reimbursement' | 'referee_pay' | 'bonus' | 'overtime' | 'other';

// Request/Response DTOs
export interface ReceiptUploadRequest {
  description?: string;
  businessPurpose?: string;
  projectCode?: string;
  department?: string;
  paymentMethodId?: string;
  purchaseOrderId?: string;
  creditCardId?: string;
  expenseUrgency?: ExpenseUrgency;
  urgencyJustification?: string;
}

export interface ReceiptUploadResponse {
  message: string;
  receipt: {
    id: string;
    filename: string;
    size: number;
    uploadedAt: Date;
    status: string;
  };
  processing: {
    success: boolean;
    confidence?: number;
    extractedData?: ExtractedData;
    processingTime?: number;
    warnings?: string[];
    errors?: string[];
    error?: string;
    fallbackMessage?: string;
  };
}

export interface ExtractedData {
  vendor?: string;
  amount?: number;
  date?: Date;
  category?: string;
  confidence?: number;
  items?: LineItem[];
}

export interface ReceiptQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface ReceiptListResponse {
  receipts: FormattedReceipt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FormattedReceipt {
  id: string;
  filename: string;
  originalFilename: string;
  uploadedAt: Date;
  status: string;
  fileType: string;
  fileSize: number;
  ocrText?: string;
  extractedData?: {
    merchant?: string;
    date?: Date;
    amount?: number;
    category?: string;
    confidence?: number;
    items?: LineItem[];
  };
  processedAt?: Date;
  errorMessage?: string;
}

export interface ApprovalRequest {
  status: 'approved' | 'rejected' | 'requires_information';
  notes?: string;
  approvedAmount?: number;
  rejectionReason?: string;
  requiredInformation?: string[];
  paymentDueDate?: Date;
  paymentReference?: string;
}

export interface ApprovalDecision {
  action: 'approved' | 'rejected' | 'requires_information';
  notes?: string;
  approvedAmount?: number;
  rejectionReason?: string;
  requiredInformation?: string[];
}

export interface BulkExpenseRequest {
  paymentMethodId: string;
  expenses: BulkExpenseItem[];
}

export interface BulkExpenseItem {
  receiptId: string;
  amount: number;
  vendorName: string;
  transactionDate: Date;
  categoryId?: string;
  description?: string;
  businessPurpose?: string;
  projectCode?: string;
  creditCardTransactionId?: string;
  vendorInvoiceNumber?: string;
}

export interface PaymentMethodSelectionRequest {
  paymentMethodId: string;
  purchaseOrderId?: string;
  creditCardId?: string;
  expenseUrgency?: ExpenseUrgency;
  urgencyJustification?: string;
  vendorPaymentDetails?: Record<string, any>;
}

export interface ExpenseCreationRequest {
  receiptId: string;
  paymentMethodId: string;
  amount: number;
  vendorName: string;
  transactionDate: Date;
  categoryId?: string;
  description?: string;
  businessPurpose?: string;
  projectCode?: string;
  purchaseOrderId?: string;
  creditCardId?: string;
  expenseUrgency?: ExpenseUrgency;
  urgencyJustification?: string;
}

export interface ReimbursementCreationRequest {
  approvedAmount?: number;
  paymentMethod?: ReimbursementPaymentMethod;
  scheduledPayDate?: Date;
  payPeriod?: string;
  notes?: string;
}

export interface ReimbursementStatusUpdateRequest {
  status: ReimbursementStatus;
  paidAmount?: number;
  paymentReference?: string;
  paidDate?: Date;
  notes?: string;
}

// Processing and Workflow interfaces
export interface ProcessingResult {
  extractedData?: ExtractedData;
  totalProcessingTime: number;
  warnings: string[];
  errors: string[];
}

export interface WorkflowInfo {
  workflowName: string;
  totalStages: number;
  currentStage: number;
  autoApproved: boolean;
  nextApprovers: ApprovalUser[];
  isComplete?: boolean;
  history?: ExpenseApproval[];
}

export interface ApprovalHistoryItem {
  id: string;
  stage: {
    number: number;
    totalStages: number;
    name: string;
    status: ApprovalStatus;
    startedAt: Date;
    deadline?: Date;
    completedAt?: Date;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  decision: {
    status: ApprovalStatus;
    notes?: string;
    approvedAmount?: number;
    rejectionReason?: string;
    decidedAt?: Date;
  };
  delegation?: {
    delegatedTo: { name: string };
    delegatedBy: { name: string };
    reason: string;
    delegatedAt: Date;
  };
  escalation?: {
    escalatedAt: Date;
    reason: string;
  };
  metadata: {
    riskLevel?: RiskLevel;
    requiresAdditionalReview?: boolean;
    notificationCount?: number;
    lastNotificationSent?: Date;
  };
}

// Queue and Job interfaces
export interface QueueJob {
  id: string;
  data: {
    receiptId: string;
    manualTrigger?: boolean;
  };
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

// Error interfaces
export interface ExpenseError extends Error {
  statusCode?: number;
  details?: string;
}

// Database query builder types
export interface ExpenseQueryBuilder {
  where(column: string, value: any): ExpenseQueryBuilder;
  where(column: string, operator: string, value: any): ExpenseQueryBuilder;
  leftJoin(table: string, first: string, second: string): ExpenseQueryBuilder;
  join(table: string, first: string, second: string): ExpenseQueryBuilder;
  select(...columns: string[]): ExpenseQueryBuilder;
  insert(data: Record<string, any>): ExpenseQueryBuilder;
  update(data: Record<string, any>): ExpenseQueryBuilder;
  delete(): ExpenseQueryBuilder;
  returning(columns: string | string[]): ExpenseQueryBuilder;
  first(): Promise<any>;
  limit(count: number): ExpenseQueryBuilder;
  offset(count: number): ExpenseQueryBuilder;
  orderBy(column: string, direction?: 'asc' | 'desc'): ExpenseQueryBuilder;
  clone(): ExpenseQueryBuilder;
  count(column: string): ExpenseQueryBuilder;
  modify(callback: (builder: ExpenseQueryBuilder) => void): ExpenseQueryBuilder;
}

// Service interfaces
export interface ReceiptProcessingService {
  processReceipt(receiptId: string): Promise<ProcessingResult>;
  deleteReceipt(receiptId: string, userId: string): Promise<void>;
}

export interface ApprovalWorkflowService {
  processApprovalDecision(
    approvalId: string,
    decision: ApprovalDecision,
    user: AuthenticatedUser
  ): Promise<ExpenseApproval>;
  getApprovalHistory(expenseId: string): Promise<ApprovalHistoryItem[]>;
  delegateApproval(
    approvalId: string,
    delegateTo: string,
    delegatedBy: string,
    reason: string
  ): Promise<ExpenseApproval>;
  determineWorkflow(
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: AuthenticatedUser
  ): Promise<WorkflowInfo>;
  createApprovalWorkflow(
    expenseId: string,
    workflow: WorkflowInfo,
    user: AuthenticatedUser
  ): Promise<ExpenseApproval[]>;
  getPendingApprovalsForUser(
    userId: string,
    filters?: Record<string, any>
  ): Promise<ExpenseApproval[]>;
}

export interface PaymentMethodService {
  detectPaymentMethod(
    receiptData: Partial<ExpenseData>,
    user: AuthenticatedUser,
    context?: Record<string, any>
  ): Promise<PaymentMethod[]>;
  getPaymentMethodById(
    paymentMethodId: string,
    organizationId: string
  ): Promise<PaymentMethod | null>;
  validatePaymentMethodSelection(
    paymentMethodId: string,
    expenseData: Partial<ExpenseData>,
    user: AuthenticatedUser
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
  getAvailablePaymentMethods(organizationId: string): Promise<PaymentMethod[]>;
}

// =====================================================
// Types for Expense Approval Workflow (Sessions 2-5)
// =====================================================

/**
 * Filters for querying pending expenses
 * Used by Session 2: GET /api/expenses/pending
 */
export interface PendingExpenseFilters {
  payment_method?: string;
  urgency?: ExpenseUrgency;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  category?: string;
  date_from?: Date;
  date_to?: Date;
  submitter_id?: string;
  page?: number;
  limit?: number;
  sort_by?: 'amount' | 'date' | 'urgency' | 'submitter';
  sort_order?: 'asc' | 'desc';
}

/**
 * Detailed pending expense with all related data
 * Used by Session 2: GET /api/expenses/pending/:id
 */
export interface PendingExpenseDetail {
  id: string;
  receipt_id: string;
  user_id: string;
  organization_id: string;
  vendor_name: string;
  total_amount: number;
  transaction_date: Date;
  category: {
    id: string;
    name: string;
    code: string;
    color: string;
  } | null;
  payment_method: {
    id: string;
    name: string;
    type: PaymentMethodType;
  } | null;
  submitter: {
    id: string;
    name: string;
    email: string;
  };
  description?: string;
  business_purpose?: string;
  expense_urgency: ExpenseUrgency;
  urgency_justification?: string;
  receipt: {
    id: string;
    filename: string;
    file_path: string;
    processing_status: string;
  };
  approval_status: ApprovalStatus;
  approval_history: ApprovalHistoryItem[];
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Summary item for pending expenses list
 */
export interface PendingExpenseSummary {
  id: string;
  vendor_name: string;
  total_amount: number;
  transaction_date: Date;
  category_name: string | null;
  category_color: string | null;
  submitter_name: string;
  expense_urgency: ExpenseUrgency;
  payment_method_name: string | null;
  approval_status: ApprovalStatus;
  submitted_at: Date;
  days_pending: number;
}

/**
 * Vendor reference data for dropdowns
 * Used by Session 4: GET /api/expenses/vendors
 */
export interface VendorReference {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_preferred?: boolean;
  active: boolean;
}

/**
 * Category reference data for dropdowns
 * Used by Session 4: GET /api/expenses/categories
 */
export interface CategoryReference {
  id: string;
  name: string;
  code: string;
  color_code: string;
  description?: string;
  requires_approval: boolean;
  approval_threshold?: number;
  active: boolean;
}

/**
 * Payment method reference data for dropdowns
 * Used by Session 4: GET /api/expenses/payment-methods
 */
export interface PaymentMethodReference {
  id: string;
  name: string;
  type: PaymentMethodType;
  description?: string;
  requires_approval: boolean;
  auto_approval_limit?: number;
  is_active: boolean;
}