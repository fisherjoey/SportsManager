import { Request, Response } from 'express';

// This file uses the AuthenticatedRequest from auth.types.ts
// Re-export for backward compatibility
export { AuthenticatedRequest } from './auth.types';

// Query parameter interfaces
export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
  period?: string;
}

export interface RefereePaymentQueryParams {
  startDate?: string;
  endDate?: string;
  refereeId?: string;
  status?: 'all' | 'paid' | 'pending';
}

// Core data model interfaces
export interface SummaryMetrics {
  totalRevenue: number;
  totalWages: number;
  totalExpenses: number;
  netIncome: number;
  gameCount: number;
}

export interface TopReferee {
  id: number;
  name: string;
  email: string;
  games_count: number;
  total_wages: number;
  avg_wage: number;
}

export interface RefereeWages {
  topReferees: TopReferee[];
  totalPaid: number;
  totalPending: number;
}

export interface ExpenseCategory {
  id: number | null;
  name: string;
  description: string;
  transaction_count: number;
  total_amount: number;
  avg_amount: number;
}

export interface Transaction {
  id: number;
  date: Date;
  amount: number;
  description: string;
  status: string;
  category: string;
  submitted_by: string;
  type: 'expense' | 'payment';
}

export interface RevenueTrend {
  date: Date;
  revenue: number;
  expenses: number;
  wages: number;
  netIncome: number;
  gameCount: number;
}

export interface Budget {
  category: string;
  allocated: number;
  spent: number;
  percentage: number;
}

export interface BudgetUtilization {
  budgets: Budget[];
  totalAllocated: number;
  totalSpent: number;
  overallUtilization: number;
}

export interface PendingApprovals {
  expenses: number;
  assignments: number;
  total: number;
}

export interface RefereePayment {
  assignment_id: number;
  game_id: number;
  game_number: string;
  game_date: Date;
  game_time: string;
  location: string;
  referee_id: number;
  referee_name: string;
  referee_email: string;
  wage_per_game: number;
  assignment_status: string;
  position: string;
  league_name: string;
  payment_status: 'paid' | 'pending';
}

export interface RefereePaymentSummary {
  totalPaid: number;
  totalPending: number;
  totalGames: number;
  uniqueReferees: number;
}

// Response interfaces
export interface DashboardResponse {
  summary: SummaryMetrics;
  refereeWages: RefereeWages;
  expenseCategories: ExpenseCategory[];
  recentTransactions: Transaction[];
  revenueTrends: RevenueTrend[];
  budgetUtilization: BudgetUtilization;
  pendingApprovals: PendingApprovals;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface RefereePaymentResponse {
  payments: RefereePayment[];
  summary: RefereePaymentSummary;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  message?: string;
}

// Database query result interfaces
export interface GameAssignmentQueryResult {
  id: number;
  referee_id: number;
  game_id: number;
  status: string;
  position: string;
}

export interface GameQueryResult {
  id: number;
  game_number: string;
  date: Date;
  game_date: Date;
  time: string;
  location: string;
  league_id: number;
}

export interface UserQueryResult {
  id: number;
  name: string;
  email: string;
  wage_per_game: number;
}

export interface ExpenseDataQueryResult {
  id: number;
  transaction_date: Date;
  total_amount: number;
  description: string;
  payment_status: string;
  category_id: number | null;
  user_id: number;
}

export interface ExpenseCategoryQueryResult {
  id: number;
  name: string;
  description: string;
}

export interface GameFeeQueryResult {
  id: number;
  game_id: number;
  amount: number;
  payment_status: string;
}

export interface LeagueQueryResult {
  id: number;
  name: string;
}

// Aggregation result interfaces
export interface WageSumResult {
  total_wages: number | null;
}

export interface ExpenseSumResult {
  total_expenses: number | null;
}

export interface RevenueSumResult {
  total_revenue: number | null;
}

export interface GameCountResult {
  count: number;
}

export interface CountResult {
  count: number;
}

export interface DailyRevenueResult {
  date: Date;
  game_count: number;
  revenue: number;
}

export interface DailyExpenseResult {
  date: Date;
  expenses: number;
}

export interface DailyWageResult {
  date: Date;
  wages: number;
}

export interface CategoryExpenseResult {
  id: number | null;
  name: string;
  description: string;
  transaction_count: number;
  total_amount: number;
  avg_amount: number;
}

export interface UncategorizedExpenseResult {
  transaction_count: number;
  total_amount: number;
  avg_amount: number;
}

export interface ExpenseSpendingResult {
  name: string;
  total: number;
}

// Utility type guards
export function isValidPaymentStatus(status: string): status is 'all' | 'paid' | 'pending' {
  return ['all', 'paid', 'pending'].includes(status);
}

export function isValidTransactionType(type: string): type is 'expense' | 'payment' {
  return ['expense', 'payment'].includes(type);
}

// Utility functions
export function parseMonetaryAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : Number(value) || 0;
}

export function formatMonetaryAmount(value: number): string {
  return value.toFixed(2);
}

export function formatPercentage(value: number): string {
  return value.toFixed(2) + '%';
}

export function calculateNetIncome(revenue: number, wages: number, expenses: number): number {
  return revenue - wages - expenses;
}

export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

export function parseDateRange(
  startDate?: string,
  endDate?: string,
  period?: string
): { start: Date; end: Date } {
  const end = endDate ? new Date(endDate) : new Date();
  const periodDays = period ? parseInt(period) : 30;
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - (periodDays * 24 * 60 * 60 * 1000));

  return { start, end };
}

export function groupByDate<T extends { date: Date }>(
  items: T[],
  dateKey: keyof T = 'date' as keyof T
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  items.forEach(item => {
    const date = item[dateKey] as Date;
    const dateStr = date.toISOString().split('T')[0];

    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, []);
    }
    grouped.get(dateStr)!.push(item);
  });

  return grouped;
}

export function calculateTotalFromItems<T>(
  items: T[],
  valueKey: keyof T,
  parseValue: (value: T[keyof T]) => number = (v) => parseMonetaryAmount(v as any)
): number {
  return items.reduce((sum, item) => sum + parseValue(item[valueKey]), 0);
}

export function mergeTransactionArrays(
  expenses: Transaction[],
  payments: Transaction[],
  limit: number = 10
): Transaction[] {
  return [...expenses, ...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function createTrendMap(): Map<string, RevenueTrend> {
  return new Map();
}

export function addToTrendMap(
  trendMap: Map<string, RevenueTrend>,
  date: Date,
  data: Partial<Omit<RevenueTrend, 'date'>>
): void {
  const dateKey = date.toISOString().split('T')[0];

  if (trendMap.has(dateKey)) {
    const existing = trendMap.get(dateKey)!;
    Object.assign(existing, data);
  } else {
    trendMap.set(dateKey, {
      date,
      revenue: data.revenue || 0,
      expenses: data.expenses || 0,
      wages: data.wages || 0,
      gameCount: data.gameCount || 0,
      netIncome: 0 // Will be calculated later
    });
  }
}

export function convertTrendMapToArray(trendMap: Map<string, RevenueTrend>): RevenueTrend[] {
  return Array.from(trendMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(item => ({
      ...item,
      netIncome: calculateNetIncome(item.revenue, item.wages, item.expenses)
    }));
}

export function createDefaultSummaryMetrics(): SummaryMetrics {
  return {
    totalRevenue: 0,
    totalWages: 0,
    totalExpenses: 0,
    netIncome: 0,
    gameCount: 0
  };
}

export function createDefaultRefereeWages(): RefereeWages {
  return {
    topReferees: [],
    totalPaid: 0,
    totalPending: 0
  };
}

export function createDefaultBudgetUtilization(): BudgetUtilization {
  return {
    budgets: [],
    totalAllocated: 0,
    totalSpent: 0,
    overallUtilization: 0
  };
}

export function createDefaultPendingApprovals(): PendingApprovals {
  return {
    expenses: 0,
    assignments: 0,
    total: 0
  };
}

export function createDefaultBudgets(): Budget[] {
  return [
    {
      category: 'Referee Wages',
      allocated: 50000,
      spent: 0,
      percentage: 0
    },
    {
      category: 'Operations',
      allocated: 10000,
      spent: 0,
      percentage: 0
    },
    {
      category: 'Equipment',
      allocated: 5000,
      spent: 0,
      percentage: 0
    },
    {
      category: 'Administration',
      allocated: 8000,
      spent: 0,
      percentage: 0
    }
  ];
}

// Constants
export const DEFAULT_PERIOD_DAYS = 30;
export const DEFAULT_GAME_FEE_ESTIMATE = 150;
export const DEFAULT_RECENT_TRANSACTION_LIMIT = 10;
export const DEFAULT_TOP_REFEREES_LIMIT = 10;

export const PAYMENT_STATUSES = ['all', 'paid', 'pending'] as const;
export const TRANSACTION_TYPES = ['expense', 'payment'] as const;
export const ASSIGNMENT_STATUSES = ['assigned', 'completed', 'pending'] as const;
export const EXPENSE_PAYMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;

// Validation helpers
export function validateDashboardQuery(query: any): {
  isValid: boolean;
  errors: string[];
  parsed: DashboardQueryParams;
} {
  const errors: string[] = [];
  const parsed: DashboardQueryParams = {};

  if (query.startDate) {
    const startDate = new Date(query.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    } else {
      parsed.startDate = query.startDate;
    }
  }

  if (query.endDate) {
    const endDate = new Date(query.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date format');
    } else {
      parsed.endDate = query.endDate;
    }
  }

  if (query.period) {
    const period = parseInt(query.period);
    if (isNaN(period) || period < 1 || period > 365) {
      errors.push('Period must be between 1 and 365 days');
    } else {
      parsed.period = query.period;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    parsed
  };
}

export function validateRefereePaymentQuery(query: any): {
  isValid: boolean;
  errors: string[];
  parsed: RefereePaymentQueryParams;
} {
  const errors: string[] = [];
  const parsed: RefereePaymentQueryParams = {};

  if (query.startDate) {
    const startDate = new Date(query.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    } else {
      parsed.startDate = query.startDate;
    }
  }

  if (query.endDate) {
    const endDate = new Date(query.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date format');
    } else {
      parsed.endDate = query.endDate;
    }
  }

  if (query.refereeId) {
    if (typeof query.refereeId !== 'string' || query.refereeId.trim().length === 0) {
      errors.push('Invalid referee ID');
    } else {
      parsed.refereeId = query.refereeId;
    }
  }

  if (query.status) {
    if (!isValidPaymentStatus(query.status)) {
      errors.push(`Invalid status. Must be one of: ${PAYMENT_STATUSES.join(', ')}`);
    } else {
      parsed.status = query.status;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    parsed
  };
}