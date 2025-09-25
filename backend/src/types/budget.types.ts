/**
 * Budget Management Types
 * Comprehensive type definitions for budget-related operations
 */

export interface BudgetPeriod {
  id: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  is_template: boolean;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBudgetPeriodRequest {
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  is_template?: boolean;
}

export interface BudgetCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  category_type: BudgetCategoryType;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export enum BudgetCategoryType {
  REVENUE = 'revenue',
  OPERATING_EXPENSES = 'operating_expenses',
  PAYROLL = 'payroll',
  EQUIPMENT = 'equipment',
  FACILITIES = 'facilities',
  MARKETING = 'marketing',
  TRAVEL = 'travel',
  UTILITIES = 'utilities',
  INSURANCE = 'insurance',
  PROFESSIONAL_SERVICES = 'professional_services',
  SUPPLIES = 'supplies',
  TRAINING = 'training',
  OTHER = 'other'
}

export interface CreateBudgetCategoryRequest {
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  category_type: BudgetCategoryType;
}

export interface Budget {
  id: string;
  budget_period_id: string;
  category_id: string;
  name: string;
  description?: string;
  allocated_amount: number;
  variance_rules?: VarianceRules;
  seasonal_patterns?: SeasonalPatterns;
  owner_id?: string;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface VarianceRules {
  warning_threshold?: number;
  error_threshold?: number;
  auto_approve_threshold?: number;
}

export interface SeasonalPatterns {
  quarterly_distribution?: number[];
  monthly_distribution?: number[];
  peak_months?: number[];
}

export interface CreateBudgetRequest {
  budget_period_id: string;
  category_id: string;
  name: string;
  description?: string;
  allocated_amount: number;
  variance_rules?: VarianceRules;
  seasonal_patterns?: SeasonalPatterns;
  owner_id?: string;
}

export interface UpdateBudgetRequest {
  budget_period_id?: string;
  category_id?: string;
  name?: string;
  description?: string;
  allocated_amount?: number;
  variance_rules?: VarianceRules;
  seasonal_patterns?: SeasonalPatterns;
  owner_id?: string;
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  allocation_year: number;
  allocation_month: number;
  allocated_amount: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBudgetAllocationRequest {
  budget_id: string;
  allocation_year: number;
  allocation_month: number;
  allocated_amount: number;
  notes?: string;
}

export interface BudgetSummary {
  id: string;
  name: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  category: BudgetCategory;
  period: BudgetPeriod;
}

export interface BudgetReport {
  period: BudgetPeriod;
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  categories: BudgetCategorySummary[];
  variance_analysis: VarianceAnalysis[];
}

export interface BudgetCategorySummary {
  category: BudgetCategory;
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  budgets: BudgetSummary[];
}

export interface VarianceAnalysis {
  budget_id: string;
  budget_name: string;
  allocated_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
  status: VarianceStatus;
}

export enum VarianceStatus {
  UNDER_BUDGET = 'under_budget',
  ON_BUDGET = 'on_budget',
  OVER_BUDGET = 'over_budget',
  CRITICAL_VARIANCE = 'critical_variance'
}

export interface BudgetQueryFilters {
  period_id?: string;
  category_id?: string;
  owner_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BudgetPeriodQueryFilters {
  is_template?: boolean;
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BudgetCategoryQueryFilters {
  parent_id?: string;
  category_type?: BudgetCategoryType;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// API Response Types
export interface BudgetPeriodsResponse {
  periods: BudgetPeriod[];
  total: number;
  page: number;
  limit: number;
}

export interface BudgetCategoriesResponse {
  categories: BudgetCategory[];
  total: number;
  page: number;
  limit: number;
}

export interface BudgetsResponse {
  budgets: Budget[];
  total: number;
  page: number;
  limit: number;
}

export interface BudgetAllocationsResponse {
  allocations: BudgetAllocation[];
  total: number;
  page: number;
  limit: number;
}

// Error Types
export interface BudgetError {
  code: string;
  message: string;
  details?: any;
}

export interface BudgetValidationError extends BudgetError {
  field: string;
  value: any;
}

// Database Models
export interface BudgetPeriodModel {
  id: string;
  name: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  is_template: boolean;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetCategoryModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  category_type: string;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetModel {
  id: string;
  budget_period_id: string;
  category_id: string;
  name: string;
  description: string | null;
  allocated_amount: number;
  variance_rules: any | null;
  seasonal_patterns: any | null;
  owner_id: string | null;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetAllocationModel {
  id: string;
  budget_id: string;
  allocation_year: number;
  allocation_month: number;
  allocated_amount: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}