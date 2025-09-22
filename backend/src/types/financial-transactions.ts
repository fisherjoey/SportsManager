import { Request, Response } from 'express';

// Base interfaces
export interface AuthenticatedUser {
  id: number;
  organization_id?: number;
  role: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// Database models
export interface FinancialTransaction {
  id: number;
  organization_id: number;
  transaction_number: string;
  budget_id?: number;
  expense_data_id?: number;
  payroll_assignment_id?: number;
  transaction_type: 'expense' | 'revenue' | 'payroll' | 'transfer' | 'adjustment' | 'refund';
  amount: string | number;
  description: string;
  transaction_date: Date;
  reference_number?: string;
  vendor_id?: number;
  debit_account_id?: number;
  credit_account_id?: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'cancelled' | 'voided';
  metadata?: Record<string, any>;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
  posted_at?: Date;
}

export interface Vendor {
  id: number;
  organization_id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  payment_methods?: string[];
  metadata?: Record<string, any>;
  active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Budget {
  id: number;
  organization_id: number;
  budget_period_id: number;
  category_id: number;
  name: string;
  allocated_amount: string | number;
  actual_spent: string | number;
  committed_amount: string | number;
  reserved_amount: string | number;
}

export interface BudgetCategory {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  category_type: string;
  color_code: string;
}

export interface ExpenseData {
  id: number;
  organization_id: number;
  vendor_name: string;
  amount: string | number;
  description: string;
}

export interface GameAssignment {
  id: number;
  game_id: number;
  user_id: number;
  calculated_wage: string | number;
  payment_status: string;
}

export interface ChartOfAccounts {
  id: number;
  organization_id: number;
  account_name: string;
  account_code: string;
  account_type: string;
}

export interface JournalEntry {
  id: number;
  transaction_id: number;
  account_id: number;
  debit_amount?: number;
  credit_amount?: number;
  description: string;
  created_at: Date;
}

// Request/Response Types
export interface TransactionCreateRequest {
  budget_id?: string;
  expense_data_id?: string;
  payroll_assignment_id?: string;
  transaction_type: 'expense' | 'revenue' | 'payroll' | 'transfer' | 'adjustment' | 'refund';
  amount: number;
  description: string;
  transaction_date: string | Date;
  reference_number?: string;
  vendor_id?: string;
  debit_account_id?: string;
  credit_account_id?: string;
  metadata?: Record<string, any>;
}

export interface VendorCreateRequest {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  payment_methods?: string[];
  metadata?: Record<string, any>;
}

export interface TransactionQuery {
  page?: string;
  limit?: string;
  transaction_type?: 'expense' | 'revenue' | 'payroll' | 'transfer' | 'adjustment' | 'refund';
  status?: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'cancelled' | 'voided';
  budget_id?: string;
  vendor_id?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: string;
  max_amount?: string;
  search?: string;
}

export interface VendorQuery {
  active?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export interface DashboardQuery {
  period?: string;
}

export interface StatusUpdateRequest {
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'cancelled' | 'voided';
  notes?: string;
}

// Response types
export interface TransactionWithDetails extends FinancialTransaction {
  budget_name?: string;
  category_name?: string;
  category_color?: string;
  vendor_name?: string;
  vendor_contact?: string;
  created_by_name?: string;
  expense_vendor?: string;
  payroll_amount?: number;
  debit_account_name?: string;
  credit_account_name?: string;
}

export interface TransactionSummary {
  total_transactions: number;
  total_revenue: number;
  total_expenses: number;
  posted_amount: number;
  pending_amount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionListResponse {
  transactions: TransactionWithDetails[];
  summary: TransactionSummary;
  pagination: Pagination;
}

export interface TransactionCreateResponse {
  message: string;
  transaction: TransactionWithDetails;
}

export interface TransactionDetailResponse {
  transaction: TransactionWithDetails;
  journal_entries: JournalEntry[];
}

export interface VendorListResponse {
  vendors: Vendor[];
  pagination: Pagination;
}

export interface VendorCreateResponse {
  message: string;
  vendor: Vendor;
}

export interface StatusUpdateResponse {
  message: string;
  transaction: FinancialTransaction;
}

export interface DashboardTransactionSummary {
  total_transactions: number;
  total_revenue: number;
  total_expenses: number;
  pending_approvals: number;
  pending_amount: number;
}

export interface DashboardBudgetSummary {
  total_budgets: number;
  total_allocated: number;
  total_spent: number;
  total_committed: number;
  total_available: number;
}

export interface RecentTransaction {
  id: number;
  transaction_number: string;
  transaction_type: string;
  amount: number;
  description: string;
  transaction_date: Date;
  status: string;
  budget_name?: string;
  vendor_name?: string;
}

export interface TopCategory {
  category_name: string;
  color: string;
  total_amount: number;
  transaction_count: number;
}

export interface CashFlowPoint {
  transaction_date: Date;
  revenue: number;
  expenses: number;
}

export interface DashboardResponse {
  transaction_summary: DashboardTransactionSummary;
  budget_summary: DashboardBudgetSummary;
  recent_transactions: RecentTransaction[];
  top_categories: TopCategory[];
  cash_flow_trend: CashFlowPoint[];
  period_days: number;
}

// Error response
export interface ErrorResponse {
  error: string;
  details?: string;
  message?: string;
  valid?: string[];
}

// Type guards
export function isValidTransactionType(type: string): type is TransactionCreateRequest['transaction_type'] {
  return ['expense', 'revenue', 'payroll', 'transfer', 'adjustment', 'refund'].includes(type);
}

export function isValidTransactionStatus(status: string): status is FinancialTransaction['status'] {
  return ['draft', 'pending_approval', 'approved', 'posted', 'cancelled', 'voided'].includes(status);
}

export function isValidStatusTransition(from: string, to: string): boolean {
  const allowedTransitions: Record<string, string[]> = {
    'draft': ['pending_approval', 'cancelled'],
    'pending_approval': ['approved', 'cancelled'],
    'approved': ['posted', 'cancelled'],
    'posted': ['voided'],
    'cancelled': [],
    'voided': []
  };

  return allowedTransitions[from]?.includes(to) || false;
}

// Utility functions
export function parseMonetaryAmount(value: string | number | null | undefined | any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object') return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : Number(value) || 0;
}

export function formatMonetaryAmount(value: number): string {
  return value.toFixed(2);
}

export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function sanitizeSearchTerm(search: string): string {
  return search.trim().replace(/[%_]/g, '\\$&');
}

export function calculateAvailableBudget(budget: Budget): number {
  const allocated = parseMonetaryAmount(budget.allocated_amount);
  const spent = parseMonetaryAmount(budget.actual_spent);
  const committed = parseMonetaryAmount(budget.committed_amount);
  const reserved = parseMonetaryAmount(budget.reserved_amount);

  return allocated - spent - committed - reserved;
}

export function generateTransactionPrefix(transactionType: string): string {
  const prefixMap: Record<string, string> = {
    expense: 'EXP',
    revenue: 'REV',
    payroll: 'PAY',
    transfer: 'TRF',
    adjustment: 'ADJ',
    refund: 'REF'
  };

  return prefixMap[transactionType] || 'TXN';
}

export function parseQueryParams(query: any): {
  page: number;
  limit: number;
  filters: Record<string, any>;
} {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));

  const filters: Record<string, any> = {};

  // Parse and validate filters
  if (query.transaction_type && isValidTransactionType(query.transaction_type)) {
    filters.transaction_type = query.transaction_type;
  }

  if (query.status && isValidTransactionStatus(query.status)) {
    filters.status = query.status;
  }

  if (query.budget_id && isValidUUID(query.budget_id)) {
    filters.budget_id = query.budget_id;
  }

  if (query.vendor_id && isValidUUID(query.vendor_id)) {
    filters.vendor_id = query.vendor_id;
  }

  if (query.date_from) {
    const date = new Date(query.date_from);
    if (!isNaN(date.getTime())) {
      filters.date_from = date;
    }
  }

  if (query.date_to) {
    const date = new Date(query.date_to);
    if (!isNaN(date.getTime())) {
      filters.date_to = date;
    }
  }

  if (query.min_amount) {
    const amount = parseFloat(query.min_amount);
    if (!isNaN(amount) && amount >= 0) {
      filters.min_amount = amount;
    }
  }

  if (query.max_amount) {
    const amount = parseFloat(query.max_amount);
    if (!isNaN(amount) && amount >= 0) {
      filters.max_amount = amount;
    }
  }

  if (query.search && typeof query.search === 'string') {
    filters.search = sanitizeSearchTerm(query.search);
  }

  return { page, limit, filters };
}

// Business logic helpers
export function shouldUpdateBudgetCommitment(
  transactionType: string,
  currentStatus: string,
  newStatus: string
): { shouldIncrement: boolean; shouldDecrement: boolean } {
  if (transactionType !== 'expense') {
    return { shouldIncrement: false, shouldDecrement: false };
  }

  const shouldIncrement =
    (currentStatus === 'draft' && newStatus === 'pending_approval') ||
    (currentStatus === 'draft' && newStatus === 'approved');

  const shouldDecrement =
    newStatus === 'cancelled' ||
    newStatus === 'voided' ||
    (currentStatus === 'approved' && newStatus === 'posted');

  return { shouldIncrement, shouldDecrement };
}

export function shouldUpdateActualSpent(
  transactionType: string,
  currentStatus: string,
  newStatus: string
): { shouldIncrement: boolean; shouldDecrement: boolean } {
  if (transactionType !== 'expense') {
    return { shouldIncrement: false, shouldDecrement: false };
  }

  const shouldIncrement = newStatus === 'posted';
  const shouldDecrement = currentStatus === 'posted' && (newStatus === 'cancelled' || newStatus === 'voided');

  return { shouldIncrement, shouldDecrement };
}

// Constants
export const TRANSACTION_TYPES = [
  'expense',
  'revenue',
  'payroll',
  'transfer',
  'adjustment',
  'refund'
] as const;

export const TRANSACTION_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'posted',
  'cancelled',
  'voided'
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['pending_approval', 'cancelled'],
  'pending_approval': ['approved', 'cancelled'],
  'approved': ['posted', 'cancelled'],
  'posted': ['voided'],
  'cancelled': [],
  'voided': []
};

// Validation helpers
export function validateTransactionData(data: TransactionCreateRequest): string[] {
  const errors: string[] = [];

  if (!data.transaction_type || !isValidTransactionType(data.transaction_type)) {
    errors.push('Invalid transaction type');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  if (!data.transaction_date) {
    errors.push('Transaction date is required');
  }

  if (data.budget_id && !isValidUUID(data.budget_id)) {
    errors.push('Invalid budget ID format');
  }

  if (data.vendor_id && !isValidUUID(data.vendor_id)) {
    errors.push('Invalid vendor ID format');
  }

  return errors;
}

export function validateVendorData(data: VendorCreateRequest): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Vendor name is required');
  }

  if (data.name && data.name.length > 200) {
    errors.push('Vendor name cannot exceed 200 characters');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.contact_name && data.contact_name.length > 100) {
    errors.push('Contact name cannot exceed 100 characters');
  }

  if (data.phone && data.phone.length > 20) {
    errors.push('Phone number cannot exceed 20 characters');
  }

  if (data.address && data.address.length > 500) {
    errors.push('Address cannot exceed 500 characters');
  }

  if (data.tax_id && data.tax_id.length > 50) {
    errors.push('Tax ID cannot exceed 50 characters');
  }

  return errors;
}