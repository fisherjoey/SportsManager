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
export interface Budget {
  id: number;
  organization_id: number;
  budget_period_id: number;
  category_id: number;
  name: string;
  allocated_amount: string | number;
  actual_spent: string | number;
  committed_amount: string | number;
  created_at?: Date;
  updated_at?: Date;
}

export interface BudgetPeriod {
  id: number;
  organization_id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  status: 'active' | 'inactive' | 'closed';
}

export interface BudgetCategory {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  category_type: 'revenue' | 'operating_expenses' | 'capital_expenses' | 'personnel';
  color_code: string;
  sort_order: number;
}

export interface FinancialTransaction {
  id: number;
  organization_id: number;
  transaction_number: string;
  transaction_type: 'revenue' | 'expense' | 'payroll';
  amount: string | number;
  description: string;
  transaction_date: Date;
  budget_id?: number;
  vendor_id?: number;
  status: 'pending' | 'approved' | 'posted' | 'cancelled';
  payroll_transaction_id?: number;
}

export interface Vendor {
  id: number;
  organization_id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

export interface GameAssignment {
  id: number;
  game_id: number;
  user_id: number;
  position: string;
  calculated_wage: string | number;
  payment_status: 'pending' | 'approved' | 'paid';
  payroll_transaction_id?: number;
}

export interface Game {
  id: number;
  organization_id: number;
  home_team_id: number;
  away_team_id: number;
  date: Date;
  time?: string;
  field?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Team {
  id: number;
  organization_id: number;
  name: string;
  display_name?: string;
  league_id?: number;
  team_number?: string;
}

export interface FinancialKPI {
  id: number;
  organization_id: number;
  kpi_name: string;
  kpi_type: 'budget_variance' | 'cash_flow_trend' | 'expense_trend' | 'payroll_efficiency' | 'cost_per_game' | 'revenue_growth' | 'profit_margin' | 'custom';
  current_value?: number;
  target_value?: number;
  calculation_config: Record<string, any>;
  calculation_period_days: number;
  last_calculated_at?: Date;
}

export interface CashFlowForecast {
  id: number;
  organization_id: number;
  forecast_year: number;
  forecast_month: number;
  forecasted_inflow: string | number;
  forecasted_outflow: string | number;
  confidence_level?: number;
}

// Request query parameters
export interface BudgetVarianceQuery {
  period_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  variance_threshold?: string;
}

export interface CashFlowQuery {
  date_from?: string;
  date_to?: string;
  grouping?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  include_forecast?: string;
}

export interface ExpenseAnalysisQuery {
  date_from?: string;
  date_to?: string;
  category_id?: string;
  vendor_id?: string;
  comparison_period?: string;
}

export interface PayrollSummaryQuery {
  date_from?: string;
  date_to?: string;
  referee_id?: string;
  payment_status?: 'all' | 'paid' | 'pending' | 'approved';
}

export interface KPIQuery {
  period_days?: string;
}

// Response data structures
export interface BudgetVarianceItem {
  id: number;
  name: string;
  allocated_amount: number;
  actual_spent: number;
  committed_amount: number;
  available_amount: number;
  variance_amount: number;
  variance_percentage: number;
  utilization_rate: number;
  status_indicator: 'over_budget' | 'under_utilized' | 'on_track';
  category_name: string;
  category_type: string;
  color_code: string;
  period_name: string;
  period_start: Date;
  period_end: Date;
}

export interface CategoryVariance {
  category_name: string;
  category_type: string;
  color_code: string;
  total_allocated: number;
  total_spent: number;
  total_committed: number;
  budget_count: number;
  variance_percentage: number;
  utilization_rate: number;
}

export interface BudgetVarianceSummary {
  total_budgets: number;
  budgets_over_variance: number;
  budgets_under_utilized: number;
  total_allocated: number;
  total_spent: number;
  total_committed: number;
  average_variance: number;
}

export interface BudgetVarianceResponse {
  summary: BudgetVarianceSummary;
  budget_variances: BudgetVarianceItem[];
  category_variances: CategoryVariance[];
  filters: BudgetVarianceQuery;
  generated_at: Date;
}

export interface CashFlowPeriodData {
  period: Date;
  inflow: number;
  outflow: number;
  net_flow: number;
  running_balance: number;
  transaction_count: number;
}

export interface TopCategoryData {
  category_name: string;
  color_code: string;
  total_amount: number;
}

export interface CashFlowSummary {
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  average_monthly_inflow: number;
  average_monthly_outflow: number;
  final_balance: number;
}

export interface CashFlowResponse {
  summary: CashFlowSummary;
  cash_flow_data: CashFlowPeriodData[];
  forecasts: CashFlowForecast[];
  top_revenue_categories: TopCategoryData[];
  top_expense_categories: TopCategoryData[];
  filters: CashFlowQuery;
  generated_at: Date;
}

export interface ExpenseByCategory {
  category_name: string;
  category_type: string;
  color_code: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
  min_amount: number;
  max_amount: number;
}

export interface ExpenseByVendor {
  vendor_name: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
}

export interface MonthlyExpenseTrend {
  month: string;
  total_amount: number;
  transaction_count: number;
}

export interface TopExpense {
  transaction_number: string;
  description: string;
  amount: number;
  transaction_date: Date;
  category_name: string;
  vendor_name: string;
}

export interface ExpenseAnalysisSummary {
  total_expenses: number;
  total_transactions: number;
  average_transaction: number;
  unique_vendors: number;
  categories_used: number;
}

export interface ExpenseComparison {
  previous_period: {
    start_date: Date;
    end_date: Date;
    total_expenses: number;
    total_transactions: number;
  };
  change_amount: number;
  change_percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ExpenseAnalysisResponse {
  summary: ExpenseAnalysisSummary;
  expenses_by_category: ExpenseByCategory[];
  expenses_by_vendor: ExpenseByVendor[];
  monthly_trend: MonthlyExpenseTrend[];
  top_expenses: TopExpense[];
  comparison?: ExpenseComparison;
  filters: ExpenseAnalysisQuery;
  generated_at: Date;
}

export interface PayrollByReferee {
  referee_id: number;
  referee_name: string;
  referee_email: string;
  games_officiated: number;
  total_wages: number;
  average_wage: number;
  games_paid: number;
  wages_paid: number;
  wages_pending: number;
}

export interface MonthlyPayroll {
  month: string;
  total_assignments: number;
  total_wages: number;
  active_referees: number;
}

export interface PaymentStatusBreakdown {
  payment_status: string;
  assignment_count: number;
  total_amount: number;
}

export interface TopEarningGame {
  game_id: number;
  game_date: Date;
  home_team: string;
  away_team: string;
  total_wages: number;
  referee_count: number;
}

export interface PayrollSummaryData {
  total_assignments: number;
  total_wages: number;
  average_wage: number;
  total_referees: number;
  games_covered: number;
  total_paid: number;
  total_pending: number;
}

export interface PayrollSummaryResponse {
  summary: PayrollSummaryData;
  payroll_by_referee: PayrollByReferee[];
  monthly_payroll: MonthlyPayroll[];
  payment_status_breakdown: PaymentStatusBreakdown[];
  top_earning_games: TopEarningGame[];
  filters: PayrollSummaryQuery;
  generated_at: Date;
}

export interface CalculatedKPI {
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CalculatedKPIs {
  budget_utilization_rate?: CalculatedKPI;
  net_cash_flow?: CalculatedKPI;
  expense_variance?: CalculatedKPI;
  cost_per_game?: CalculatedKPI;
  payroll_efficiency?: CalculatedKPI;
}

export interface KPICalculationPeriod {
  days: number;
  start_date: Date;
  end_date: Date;
}

export interface KPIResponse {
  calculated_kpis: CalculatedKPIs;
  stored_kpis: FinancialKPI[];
  calculation_period: KPICalculationPeriod;
  generated_at: Date;
}

// Request body types
export interface ReportConfigData {
  report_name: string;
  report_type: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'budget_variance' | 'expense_summary' | 'payroll_summary' | 'custom';
  report_config: Record<string, any>;
  filters?: Record<string, any>;
  is_template?: boolean;
}

export interface KPIConfigData {
  kpi_name: string;
  kpi_type: 'budget_variance' | 'cash_flow_trend' | 'expense_trend' | 'payroll_efficiency' | 'cost_per_game' | 'revenue_growth' | 'profit_margin' | 'custom';
  target_value?: number;
  calculation_config: Record<string, any>;
  calculation_period_days?: number;
}

export interface KPIConfigResponse {
  message: string;
  kpi: FinancialKPI;
}

export interface ExportResponse {
  message: string;
  report_type: string;
  supported_formats: string[];
}

// Error response
export interface ErrorResponse {
  error: string;
  details?: string;
}

// Type guards
export function isValidReportType(type: string): type is ReportConfigData['report_type'] {
  return ['profit_loss', 'balance_sheet', 'cash_flow', 'budget_variance', 'expense_summary', 'payroll_summary', 'custom'].includes(type);
}

export function isValidKPIType(type: string): type is KPIConfigData['kpi_type'] {
  return ['budget_variance', 'cash_flow_trend', 'expense_trend', 'payroll_efficiency', 'cost_per_game', 'revenue_growth', 'profit_margin', 'custom'].includes(type);
}

export function isValidGrouping(grouping: string): grouping is CashFlowQuery['grouping'] {
  return ['daily', 'weekly', 'monthly', 'quarterly'].includes(grouping);
}

export function isValidPaymentStatus(status: string): status is PayrollSummaryQuery['payment_status'] {
  return ['all', 'paid', 'pending', 'approved'].includes(status);
}

// Utility types for decimal handling
export type DecimalString = string;
export type MonetaryAmount = number;

// Helper functions for monetary calculations
export function parseMonetaryAmount(value: string | number | null | undefined | any): number {
  if (value === null || value === undefined) {return 0;}
  if (typeof value === 'object') {return 0;}
  return typeof value === 'string' ? parseFloat(value) || 0 : Number(value) || 0;
}

export function formatMonetaryAmount(value: number): string {
  return value.toFixed(2);
}

export function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

// Constants
export const VARIANCE_THRESHOLDS = {
  OVER_BUDGET: 10,
  UNDER_UTILIZED: -20
} as const;

export const DEFAULT_PERIODS = {
  CASH_FLOW_MONTHS: 11,
  EXPENSE_ANALYSIS_MONTHS: 2,
  PAYROLL_SUMMARY_MONTHS: 2,
  KPI_CALCULATION_DAYS: 30
} as const;

export const GROUPING_FORMATS = {
  daily: 'YYYY-MM-DD',
  weekly: 'YYYY-"W"WW',
  monthly: 'YYYY-MM',
  quarterly: 'YYYY-"Q"Q'
} as const;