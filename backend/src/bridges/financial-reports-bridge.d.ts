/**
 * TypeScript declarations for financial-reports-bridge.js
 * Provides type safety for the CommonJS bridge
 */

import { Router } from 'express';
import {
  BudgetVarianceQuery,
  CashFlowQuery,
  ExpenseAnalysisQuery,
  PayrollSummaryQuery,
  KPIQuery,
  BudgetVarianceResponse,
  CashFlowResponse,
  ExpenseAnalysisResponse,
  PayrollSummaryResponse,
  KPIResponse
} from '../types/financial-reports';

declare const financialReportsRouter: Router;

export default financialReportsRouter;

// Query validation functions
export function validateBudgetVarianceQuery(query: any): BudgetVarianceQuery;
export function validateCashFlowQuery(query: any): CashFlowQuery;
export function validateExpenseAnalysisQuery(query: any): ExpenseAnalysisQuery;
export function validatePayrollSummaryQuery(query: any): PayrollSummaryQuery;
export function validateKPIQuery(query: any): KPIQuery;

// Error handling
export function handleReportError(error: Error, reportType: string): {
  error: string;
  details?: string;
  timestamp: string;
};

// Monetary calculation helpers
export function parseAmount(value: string | number | null | undefined): number;
export function formatAmount(value: number): string;
export function calculateVariance(actual: number, budgeted: number): number;
export function roundPercentage(value: number): number;

// Date handling helpers
export function parseDate(dateString: string): Date | null;
export function formatDateRange(startDate: string | Date, endDate: string | Date): {
  start_date: string | null;
  end_date: string | null;
};

// Response transformation helpers
export function transformBudgetVarianceResponse(response: BudgetVarianceResponse): BudgetVarianceResponse & {
  legacy_format: boolean;
  api_version: string;
};

export function transformCashFlowResponse(response: CashFlowResponse): CashFlowResponse & {
  legacy_format: boolean;
  api_version: string;
};

export function transformExpenseAnalysisResponse(response: ExpenseAnalysisResponse): ExpenseAnalysisResponse & {
  legacy_format: boolean;
  api_version: string;
};

export function transformPayrollSummaryResponse(response: PayrollSummaryResponse): PayrollSummaryResponse & {
  legacy_format: boolean;
  api_version: string;
};

export function transformKPIResponse(response: KPIResponse): KPIResponse & {
  legacy_format: boolean;
  api_version: string;
};