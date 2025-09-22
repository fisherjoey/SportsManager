import express, { Router } from 'express';
import Joi from 'joi';
import db from '../config/database';
import { authenticateToken, requireRole, requireAnyRole } from '../middleware/auth';
import {
  AuthenticatedRequest,
  BudgetVarianceQuery,
  BudgetVarianceResponse,
  CashFlowQuery,
  CashFlowResponse,
  ExpenseAnalysisQuery,
  ExpenseAnalysisResponse,
  PayrollSummaryQuery,
  PayrollSummaryResponse,
  KPIQuery,
  KPIResponse,
  KPIConfigData,
  KPIConfigResponse,
  ExportResponse,
  ErrorResponse,
  parseMonetaryAmount,
  roundPercentage,
  isValidGrouping,
  isValidPaymentStatus,
  VARIANCE_THRESHOLDS,
  DEFAULT_PERIODS,
  MonetaryAmount,
  BudgetVarianceItem,
  CategoryVariance,
  CashFlowPeriodData,
  ExpenseByCategory,
  ExpenseByVendor,
  MonthlyExpenseTrend,
  TopExpense,
  PayrollByReferee,
  MonthlyPayroll,
  PaymentStatusBreakdown,
  TopEarningGame,
  CalculatedKPIs
} from '../types/financial-reports';

const router: Router = express.Router();

// Validation schemas
const reportConfigSchema = Joi.object({
  report_name: Joi.string().min(1).max(100).required(),
  report_type: Joi.string().valid(
    'profit_loss',
    'balance_sheet',
    'cash_flow',
    'budget_variance',
    'expense_summary',
    'payroll_summary',
    'custom'
  ).required(),
  report_config: Joi.object().required(),
  filters: Joi.object().optional(),
  is_template: Joi.boolean().default(false)
});

const kpiConfigSchema = Joi.object({
  kpi_name: Joi.string().min(1).max(100).required(),
  kpi_type: Joi.string().valid(
    'budget_variance',
    'cash_flow_trend',
    'expense_trend',
    'payroll_efficiency',
    'cost_per_game',
    'revenue_growth',
    'profit_margin',
    'custom'
  ).required(),
  target_value: Joi.number().optional(),
  calculation_config: Joi.object().required(),
  calculation_period_days: Joi.number().integer().min(1).default(30)
});

/**
 * GET /api/financial-reports/budget-variance
 * Generate budget variance report
 */
router.get('/budget-variance', authenticateToken, async (req: AuthenticatedRequest, res: express.Response<BudgetVarianceResponse | ErrorResponse>) => {
  try {
    const organizationId: number = req.user.organization_id || req.user.id;
    const {
      period_id,
      category_id,
      date_from,
      date_to,
      variance_threshold = '5' // Minimum variance percentage to show
    }: BudgetVarianceQuery = req.query;

    let budgetQuery = db('budgets as b')
      .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('b.organization_id', organizationId)
      .select(
        'b.*',
        'bp.name as period_name',
        'bp.start_date as period_start',
        'bp.end_date as period_end',
        'bc.name as category_name',
        'bc.code as category_code',
        'bc.category_type',
        'bc.color_code as category_color'
      );

    // Apply filters
    if (period_id) {
      budgetQuery = budgetQuery.where('b.budget_period_id', period_id);
    }
    if (category_id) {
      budgetQuery = budgetQuery.where('b.category_id', category_id);
    }

    const budgets = await budgetQuery.orderBy('bc.sort_order').orderBy('b.name');

    // Calculate variance metrics for each budget
    const budgetVariance: BudgetVarianceItem[] = [];
    const varianceThresholdNum = parseFloat(variance_threshold);

    for (const budget of budgets) {
      const allocated = parseMonetaryAmount(budget.allocated_amount);
      const spent = parseMonetaryAmount(budget.actual_spent);
      const committed = parseMonetaryAmount(budget.committed_amount);
      const available = allocated - spent - committed;

      const variance = allocated > 0 ? ((spent - allocated) / allocated) * 100 : 0;
      const utilizationRate = allocated > 0 ? (spent / allocated) * 100 : 0;

      // Only include if variance exceeds threshold
      if (Math.abs(variance) >= varianceThresholdNum) {
        budgetVariance.push({
          ...budget,
          allocated_amount: allocated,
          actual_spent: spent,
          committed_amount: committed,
          available_amount: available,
          variance_amount: spent - allocated,
          variance_percentage: roundPercentage(variance),
          utilization_rate: roundPercentage(utilizationRate),
          status_indicator: variance > VARIANCE_THRESHOLDS.OVER_BUDGET ? 'over_budget' :
                          variance < VARIANCE_THRESHOLDS.UNDER_UTILIZED ? 'under_utilized' : 'on_track'
        });
      }
    }

    // Calculate summary statistics
    const summary = {
      total_budgets: budgets.length,
      budgets_over_variance: budgetVariance.filter(b => b.variance_percentage > 0).length,
      budgets_under_utilized: budgetVariance.filter(b => b.variance_percentage < VARIANCE_THRESHOLDS.UNDER_UTILIZED).length,
      total_allocated: budgets.reduce((sum, b) => sum + parseMonetaryAmount(b.allocated_amount), 0),
      total_spent: budgets.reduce((sum, b) => sum + parseMonetaryAmount(b.actual_spent), 0),
      total_committed: budgets.reduce((sum, b) => sum + parseMonetaryAmount(b.committed_amount), 0),
      average_variance: budgetVariance.length > 0
        ? budgetVariance.reduce((sum, b) => sum + b.variance_percentage, 0) / budgetVariance.length
        : 0
    };

    // Get category-level variance summary
    const categoryVariance = await db('budgets as b')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('b.organization_id', organizationId)
      .modify(qb => {
        if (period_id) {
          qb.where('b.budget_period_id', period_id);
        }
      })
      .groupBy('bc.id', 'bc.name', 'bc.category_type', 'bc.color_code')
      .select(
        'bc.name as category_name',
        'bc.category_type',
        'bc.color_code',
        db.raw('SUM(b.allocated_amount) as total_allocated'),
        db.raw('SUM(b.actual_spent) as total_spent'),
        db.raw('SUM(b.committed_amount) as total_committed'),
        db.raw('COUNT(b.id) as budget_count')
      )
      .orderBy('total_allocated', 'desc');

    // Add variance calculations to category summary
    const categoryVarianceWithCalcs: CategoryVariance[] = categoryVariance.map(cat => {
      const allocated = parseMonetaryAmount(cat.total_allocated);
      const spent = parseMonetaryAmount(cat.total_spent);
      const variance = allocated > 0 ? ((spent - allocated) / allocated) * 100 : 0;

      return {
        ...cat,
        total_allocated: allocated,
        total_spent: spent,
        total_committed: parseMonetaryAmount(cat.total_committed),
        budget_count: parseInt(cat.budget_count) || 0,
        variance_percentage: roundPercentage(variance),
        utilization_rate: allocated > 0 ? roundPercentage((spent / allocated) * 100) : 0
      };
    });

    const response: BudgetVarianceResponse = {
      summary,
      budget_variances: budgetVariance,
      category_variances: categoryVarianceWithCalcs,
      filters: { period_id, category_id, variance_threshold },
      generated_at: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Budget variance report error:', error);
    res.status(500).json({ error: 'Failed to generate budget variance report' });
  }
});

/**
 * GET /api/financial-reports/cash-flow
 * Generate cash flow report
 */
router.get('/cash-flow', authenticateToken, async (req: AuthenticatedRequest, res: express.Response<CashFlowResponse | ErrorResponse>) => {
  try {
    const organizationId: number = req.user.organization_id || req.user.id;
    const {
      date_from,
      date_to,
      grouping = 'monthly', // daily, weekly, monthly, quarterly
      include_forecast = 'false'
    }: CashFlowQuery = req.query;

    // Validate grouping parameter
    if (!isValidGrouping(grouping)) {
      return res.status(400).json({ error: 'Invalid grouping parameter' });
    }

    // Set default date range if not provided
    const endDate = date_to ? new Date(date_to) : new Date();
    const startDate = date_from ? new Date(date_from) : new Date(endDate.getFullYear(), endDate.getMonth() - DEFAULT_PERIODS.CASH_FLOW_MONTHS, 1);

    // Get actual cash flow data
    let groupByFormat: string;
    let dateFormat: any;
    switch (grouping) {
    case 'daily':
      groupByFormat = 'YYYY-MM-DD';
      dateFormat = 'transaction_date';
      break;
    case 'weekly':
      groupByFormat = 'YYYY-"W"WW';
      dateFormat = db.raw('DATE_TRUNC(\'week\', transaction_date)');
      break;
    case 'quarterly':
      groupByFormat = 'YYYY-"Q"Q';
      dateFormat = db.raw('DATE_TRUNC(\'quarter\', transaction_date)');
      break;
    default: // monthly
      groupByFormat = 'YYYY-MM';
      dateFormat = db.raw('DATE_TRUNC(\'month\', transaction_date)');
    }

    const cashFlowData = await db('financial_transactions')
      .where('organization_id', organizationId)
      .where('status', 'posted')
      .whereBetween('transaction_date', [startDate, endDate])
      .select(
        `${dateFormat} as period`,
        db.raw('SUM(CASE WHEN transaction_type = \'revenue\' THEN amount ELSE 0 END) as inflow'),
        db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') THEN amount ELSE 0 END) as outflow'),
        db.raw('COUNT(*) as transaction_count')
      )
      .groupBy('period')
      .orderBy('period');

    // Calculate net cash flow and running balance
    let runningBalance = 0;
    const processedCashFlow: CashFlowPeriodData[] = cashFlowData.map(row => {
      const inflow = parseMonetaryAmount(row.inflow);
      const outflow = parseMonetaryAmount(row.outflow);
      const netFlow = inflow - outflow;
      runningBalance += netFlow;

      return {
        period: row.period,
        inflow,
        outflow,
        net_flow: netFlow,
        running_balance: runningBalance,
        transaction_count: parseInt(row.transaction_count) || 0
      };
    });

    // Get cash flow forecasts if requested
    let forecasts: any[] = [];
    if (include_forecast === 'true') {
      forecasts = await db('cash_flow_forecasts')
        .where('organization_id', organizationId)
        .where('forecast_year', '>=', startDate.getFullYear())
        .where('forecast_year', '<=', endDate.getFullYear())
        .orderBy('forecast_year')
        .orderBy('forecast_month');
    }

    // Calculate summary statistics
    const summary = {
      total_inflow: processedCashFlow.reduce((sum, row) => sum + row.inflow, 0),
      total_outflow: processedCashFlow.reduce((sum, row) => sum + row.outflow, 0),
      net_cash_flow: processedCashFlow.reduce((sum, row) => sum + row.net_flow, 0),
      average_monthly_inflow: processedCashFlow.length > 0
        ? processedCashFlow.reduce((sum, row) => sum + row.inflow, 0) / processedCashFlow.length
        : 0,
      average_monthly_outflow: processedCashFlow.length > 0
        ? processedCashFlow.reduce((sum, row) => sum + row.outflow, 0) / processedCashFlow.length
        : 0,
      final_balance: runningBalance
    };

    // Get top revenue and expense categories
    const topRevenue = await db('financial_transactions as ft')
      .join('budgets as b', 'ft.budget_id', 'b.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('ft.organization_id', organizationId)
      .where('ft.transaction_type', 'revenue')
      .where('ft.status', 'posted')
      .whereBetween('ft.transaction_date', [startDate, endDate])
      .groupBy('bc.id', 'bc.name', 'bc.color_code')
      .select(
        'bc.name as category_name',
        'bc.color_code',
        db.raw('SUM(ft.amount) as total_amount')
      )
      .orderBy('total_amount', 'desc')
      .limit(5);

    const topExpenses = await db('financial_transactions as ft')
      .join('budgets as b', 'ft.budget_id', 'b.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('ft.organization_id', organizationId)
      .where('ft.transaction_type', 'expense')
      .where('ft.status', 'posted')
      .whereBetween('ft.transaction_date', [startDate, endDate])
      .groupBy('bc.id', 'bc.name', 'bc.color_code')
      .select(
        'bc.name as category_name',
        'bc.color_code',
        db.raw('SUM(ft.amount) as total_amount')
      )
      .orderBy('total_amount', 'desc')
      .limit(5);

    const response: CashFlowResponse = {
      summary,
      cash_flow_data: processedCashFlow,
      forecasts,
      top_revenue_categories: topRevenue.map(cat => ({
        category_name: cat.category_name,
        color_code: cat.color_code,
        total_amount: parseMonetaryAmount(cat.total_amount)
      })),
      top_expense_categories: topExpenses.map(cat => ({
        category_name: cat.category_name,
        color_code: cat.color_code,
        total_amount: parseMonetaryAmount(cat.total_amount)
      })),
      filters: { date_from: startDate.toISOString(), date_to: endDate.toISOString(), grouping },
      generated_at: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Cash flow report error:', error);
    res.status(500).json({ error: 'Failed to generate cash flow report' });
  }
});

/**
 * GET /api/financial-reports/expense-analysis
 * Generate detailed expense analysis report
 */
router.get('/expense-analysis', authenticateToken, async (req: AuthenticatedRequest, res: express.Response<ExpenseAnalysisResponse | ErrorResponse>) => {
  try {
    const organizationId: number = req.user.organization_id || req.user.id;
    const {
      date_from,
      date_to,
      category_id,
      vendor_id,
      comparison_period = 'false' // Compare with previous period
    }: ExpenseAnalysisQuery = req.query;

    const endDate = date_to ? new Date(date_to) : new Date();
    const startDate = date_from ? new Date(date_from) : new Date(endDate.getFullYear(), endDate.getMonth() - DEFAULT_PERIODS.EXPENSE_ANALYSIS_MONTHS, 1);

    // Main expense query
    let expenseQuery = db('financial_transactions as ft')
      .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
      .leftJoin('budget_categories as bc', 'b.category_id', 'bc.id')
      .leftJoin('vendors as v', 'ft.vendor_id', 'v.id')
      .where('ft.organization_id', organizationId)
      .where('ft.transaction_type', 'expense')
      .where('ft.status', 'posted')
      .whereBetween('ft.transaction_date', [startDate, endDate]);

    if (category_id) {
      expenseQuery = expenseQuery.where('b.category_id', category_id);
    }
    if (vendor_id) {
      expenseQuery = expenseQuery.where('ft.vendor_id', vendor_id);
    }

    // Expense by category
    const expensesByCategory: ExpenseByCategory[] = await expenseQuery.clone()
      .groupBy('bc.id', 'bc.name', 'bc.category_type', 'bc.color_code')
      .select(
        'bc.name as category_name',
        'bc.category_type',
        'bc.color_code',
        db.raw('SUM(ft.amount) as total_amount'),
        db.raw('COUNT(ft.id) as transaction_count'),
        db.raw('AVG(ft.amount) as average_amount'),
        db.raw('MIN(ft.amount) as min_amount'),
        db.raw('MAX(ft.amount) as max_amount')
      )
      .orderBy('total_amount', 'desc')
      .then(results => results.map(row => ({
        category_name: row.category_name || 'Uncategorized',
        category_type: row.category_type || 'operating_expenses',
        color_code: row.color_code || '#808080',
        total_amount: parseMonetaryAmount(row.total_amount),
        transaction_count: parseInt(row.transaction_count) || 0,
        average_amount: parseMonetaryAmount(row.average_amount),
        min_amount: parseMonetaryAmount(row.min_amount),
        max_amount: parseMonetaryAmount(row.max_amount)
      })));

    // Expense by vendor
    const expensesByVendor: ExpenseByVendor[] = await expenseQuery.clone()
      .groupBy('v.id', 'v.name')
      .select(
        'v.name as vendor_name',
        db.raw('SUM(ft.amount) as total_amount'),
        db.raw('COUNT(ft.id) as transaction_count'),
        db.raw('AVG(ft.amount) as average_amount')
      )
      .orderBy('total_amount', 'desc')
      .limit(10)
      .then(results => results.map(row => ({
        vendor_name: row.vendor_name || 'Unknown Vendor',
        total_amount: parseMonetaryAmount(row.total_amount),
        transaction_count: parseInt(row.transaction_count) || 0,
        average_amount: parseMonetaryAmount(row.average_amount)
      })));

    // Monthly expense trend
    const monthlyTrend: MonthlyExpenseTrend[] = await expenseQuery.clone()
      .select(
        db.raw('TO_CHAR(ft.transaction_date, \'YYYY-MM\') as month'),
        db.raw('SUM(ft.amount) as total_amount'),
        db.raw('COUNT(ft.id) as transaction_count')
      )
      .groupBy('month')
      .orderBy('month')
      .then(results => results.map(row => ({
        month: row.month,
        total_amount: parseMonetaryAmount(row.total_amount),
        transaction_count: parseInt(row.transaction_count) || 0
      })));

    // Expense summary
    const [summary] = await expenseQuery.clone()
      .select(
        db.raw('SUM(ft.amount) as total_expenses'),
        db.raw('COUNT(ft.id) as total_transactions'),
        db.raw('AVG(ft.amount) as average_transaction'),
        db.raw('COUNT(DISTINCT ft.vendor_id) as unique_vendors'),
        db.raw('COUNT(DISTINCT b.category_id) as categories_used')
      );

    // Top single expenses
    const topExpenses: TopExpense[] = await expenseQuery.clone()
      .select(
        'ft.transaction_number',
        'ft.description',
        'ft.amount',
        'ft.transaction_date',
        'bc.name as category_name',
        'v.name as vendor_name'
      )
      .orderBy('ft.amount', 'desc')
      .limit(10)
      .then(results => results.map(row => ({
        transaction_number: row.transaction_number,
        description: row.description,
        amount: parseMonetaryAmount(row.amount),
        transaction_date: new Date(row.transaction_date),
        category_name: row.category_name || 'Uncategorized',
        vendor_name: row.vendor_name || 'Unknown Vendor'
      })));

    // Comparison with previous period if requested
    let comparison = null;
    if (comparison_period === 'true') {
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

      const [prevSummary] = await db('financial_transactions as ft')
        .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
        .where('ft.organization_id', organizationId)
        .where('ft.transaction_type', 'expense')
        .where('ft.status', 'posted')
        .whereBetween('ft.transaction_date', [prevStartDate, prevEndDate])
        .modify(qb => {
          if (category_id) {
            qb.where('b.category_id', category_id);
          }
          if (vendor_id) {
            qb.where('ft.vendor_id', vendor_id);
          }
        })
        .select(
          db.raw('SUM(ft.amount) as total_expenses'),
          db.raw('COUNT(ft.id) as total_transactions'),
          db.raw('AVG(ft.amount) as average_transaction')
        );

      if (prevSummary) {
        const currentTotal = parseMonetaryAmount(summary.total_expenses);
        const prevTotal = parseMonetaryAmount(prevSummary.total_expenses);
        const change = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

        comparison = {
          previous_period: {
            start_date: prevStartDate,
            end_date: prevEndDate,
            total_expenses: prevTotal,
            total_transactions: parseInt(prevSummary.total_transactions) || 0
          },
          change_amount: currentTotal - prevTotal,
          change_percentage: roundPercentage(change),
          trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable'
        };
      }
    }

    const response: ExpenseAnalysisResponse = {
      summary: {
        total_expenses: parseMonetaryAmount(summary.total_expenses),
        total_transactions: parseInt(summary.total_transactions) || 0,
        average_transaction: parseMonetaryAmount(summary.average_transaction),
        unique_vendors: parseInt(summary.unique_vendors) || 0,
        categories_used: parseInt(summary.categories_used) || 0
      },
      expenses_by_category: expensesByCategory,
      expenses_by_vendor: expensesByVendor,
      monthly_trend: monthlyTrend,
      top_expenses: topExpenses,
      comparison,
      filters: { date_from: startDate.toISOString(), date_to: endDate.toISOString(), category_id, vendor_id },
      generated_at: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Expense analysis report error:', error);
    res.status(500).json({ error: 'Failed to generate expense analysis report' });
  }
});

/**
 * GET /api/financial-reports/payroll-summary
 * Generate payroll summary report
 */
router.get('/payroll-summary', authenticateToken, async (req: AuthenticatedRequest, res: express.Response<PayrollSummaryResponse | ErrorResponse>) => {
  try {
    const organizationId: number = req.user.organization_id || req.user.id;
    const {
      date_from,
      date_to,
      referee_id,
      payment_status = 'all' // all, paid, pending, approved
    }: PayrollSummaryQuery = req.query;

    // Validate payment status
    if (!isValidPaymentStatus(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status parameter' });
    }

    const endDate = date_to ? new Date(date_to) : new Date();
    const startDate = date_from ? new Date(date_from) : new Date(endDate.getFullYear(), endDate.getMonth() - DEFAULT_PERIODS.PAYROLL_SUMMARY_MONTHS, 1);

    // Base payroll query
    let payrollQuery = db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as ref', 'ga.user_id', 'ref.id')
      .leftJoin('financial_transactions as ft', 'ga.payroll_transaction_id', 'ft.id')
      .where('g.organization_id', organizationId)
      .whereBetween('g.date', [startDate, endDate]);

    if (referee_id) {
      payrollQuery = payrollQuery.where('ga.user_id', referee_id);
    }
    if (payment_status !== 'all') {
      payrollQuery = payrollQuery.where('ga.payment_status', payment_status);
    }

    // Payroll by referee
    const payrollByReferee: PayrollByReferee[] = await payrollQuery.clone()
      .groupBy('ref.id', 'ref.first_name', 'ref.last_name', 'ref.email')
      .select(
        'ref.id as referee_id',
        db.raw('ref.first_name || \' \' || ref.last_name as referee_name'),
        'ref.email as referee_email',
        db.raw('COUNT(ga.id) as games_officiated'),
        db.raw('SUM(ga.calculated_wage) as total_wages'),
        db.raw('AVG(ga.calculated_wage) as average_wage'),
        db.raw('COUNT(CASE WHEN ga.payment_status = \'paid\' THEN 1 END) as games_paid'),
        db.raw('SUM(CASE WHEN ga.payment_status = \'paid\' THEN ga.calculated_wage ELSE 0 END) as wages_paid'),
        db.raw('SUM(CASE WHEN ga.payment_status IN (\'pending\', \'approved\') THEN ga.calculated_wage ELSE 0 END) as wages_pending')
      )
      .orderBy('total_wages', 'desc')
      .then(results => results.map(row => ({
        referee_id: row.referee_id,
        referee_name: row.referee_name,
        referee_email: row.referee_email,
        games_officiated: parseInt(row.games_officiated) || 0,
        total_wages: parseMonetaryAmount(row.total_wages),
        average_wage: parseMonetaryAmount(row.average_wage),
        games_paid: parseInt(row.games_paid) || 0,
        wages_paid: parseMonetaryAmount(row.wages_paid),
        wages_pending: parseMonetaryAmount(row.wages_pending)
      })));

    // Monthly payroll trend
    const monthlyPayroll: MonthlyPayroll[] = await payrollQuery.clone()
      .select(
        db.raw('TO_CHAR(g.date, \'YYYY-MM\') as month'),
        db.raw('COUNT(ga.id) as total_assignments'),
        db.raw('SUM(ga.calculated_wage) as total_wages'),
        db.raw('COUNT(DISTINCT ga.user_id) as active_referees')
      )
      .groupBy('month')
      .orderBy('month')
      .then(results => results.map(row => ({
        month: row.month,
        total_assignments: parseInt(row.total_assignments) || 0,
        total_wages: parseMonetaryAmount(row.total_wages),
        active_referees: parseInt(row.active_referees) || 0
      })));

    // Payment status breakdown
    const paymentStatusBreakdown: PaymentStatusBreakdown[] = await payrollQuery.clone()
      .groupBy('ga.payment_status')
      .select(
        'ga.payment_status',
        db.raw('COUNT(ga.id) as assignment_count'),
        db.raw('SUM(ga.calculated_wage) as total_amount')
      )
      .orderBy('total_amount', 'desc')
      .then(results => results.map(row => ({
        payment_status: row.payment_status,
        assignment_count: parseInt(row.assignment_count) || 0,
        total_amount: parseMonetaryAmount(row.total_amount)
      })));

    // Summary statistics
    const [summary] = await payrollQuery.clone()
      .select(
        db.raw('COUNT(ga.id) as total_assignments'),
        db.raw('SUM(ga.calculated_wage) as total_wages'),
        db.raw('AVG(ga.calculated_wage) as average_wage'),
        db.raw('COUNT(DISTINCT ga.user_id) as total_referees'),
        db.raw('COUNT(DISTINCT g.id) as games_covered'),
        db.raw('SUM(CASE WHEN ga.payment_status = \'paid\' THEN ga.calculated_wage ELSE 0 END) as total_paid'),
        db.raw('SUM(CASE WHEN ga.payment_status IN (\'pending\', \'approved\') THEN ga.calculated_wage ELSE 0 END) as total_pending')
      );

    // Top earning games/positions
    const topEarningGames: TopEarningGame[] = await payrollQuery.clone()
      .join('teams as home_team', 'g.home_team_id', 'home_team.id')
      .join('teams as away_team', 'g.away_team_id', 'away_team.id')
      .select(
        'g.id as game_id',
        'g.date as game_date',
        'home_team.name as home_team',
        'away_team.name as away_team',
        db.raw('SUM(ga.calculated_wage) as total_wages'),
        db.raw('COUNT(ga.id) as referee_count')
      )
      .groupBy('g.id', 'g.date', 'home_team.name', 'away_team.name')
      .orderBy('total_wages', 'desc')
      .limit(10)
      .then(results => results.map(row => ({
        game_id: row.game_id,
        game_date: new Date(row.game_date),
        home_team: row.home_team,
        away_team: row.away_team,
        total_wages: parseMonetaryAmount(row.total_wages),
        referee_count: parseInt(row.referee_count) || 0
      })));

    const response: PayrollSummaryResponse = {
      summary: {
        total_assignments: parseInt(summary.total_assignments) || 0,
        total_wages: parseMonetaryAmount(summary.total_wages),
        average_wage: parseMonetaryAmount(summary.average_wage),
        total_referees: parseInt(summary.total_referees) || 0,
        games_covered: parseInt(summary.games_covered) || 0,
        total_paid: parseMonetaryAmount(summary.total_paid),
        total_pending: parseMonetaryAmount(summary.total_pending)
      },
      payroll_by_referee: payrollByReferee,
      monthly_payroll: monthlyPayroll,
      payment_status_breakdown: paymentStatusBreakdown,
      top_earning_games: topEarningGames,
      filters: { date_from: startDate.toISOString(), date_to: endDate.toISOString(), referee_id, payment_status },
      generated_at: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Payroll summary report error:', error);
    res.status(500).json({ error: 'Failed to generate payroll summary report' });
  }
});

/**
 * GET /api/financial-reports/kpis
 * Get financial KPIs dashboard
 */
router.get('/kpis', authenticateToken, async (req: AuthenticatedRequest, res: express.Response<KPIResponse | ErrorResponse>) => {
  try {
    const organizationId: number = req.user.organization_id || req.user.id;
    const { period_days = DEFAULT_PERIODS.KPI_CALCULATION_DAYS.toString() }: KPIQuery = req.query;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - parseInt(period_days));

    // Calculate key financial KPIs
    const kpis: CalculatedKPIs = {};

    // Budget utilization rate
    const budgetUtilization = await db('budgets as b')
      .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
      .where('b.organization_id', organizationId)
      .where('bp.status', 'active')
      .select(
        db.raw('SUM(b.allocated_amount) as total_allocated'),
        db.raw('SUM(b.actual_spent) as total_spent')
      )
      .first();

    if (budgetUtilization && parseMonetaryAmount(budgetUtilization.total_allocated) > 0) {
      const allocated = parseMonetaryAmount(budgetUtilization.total_allocated);
      const spent = parseMonetaryAmount(budgetUtilization.total_spent);
      kpis.budget_utilization_rate = {
        value: (spent / allocated) * 100,
        unit: '%',
        target: 85,
        trend: 'stable' // This would be calculated from historical data
      };
    }

    // Cash flow trend
    const cashFlowCurrent = await db('financial_transactions')
      .where('organization_id', organizationId)
      .where('status', 'posted')
      .where('transaction_date', '>=', periodStart)
      .select(
        db.raw('SUM(CASE WHEN transaction_type = \'revenue\' THEN amount ELSE 0 END) as revenue'),
        db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') THEN amount ELSE 0 END) as expenses')
      )
      .first();

    if (cashFlowCurrent) {
      const netCashFlow = parseMonetaryAmount(cashFlowCurrent.revenue) - parseMonetaryAmount(cashFlowCurrent.expenses);
      kpis.net_cash_flow = {
        value: netCashFlow,
        unit: '$',
        target: 0,
        trend: netCashFlow > 0 ? 'up' : 'down'
      };
    }

    // Expense variance (actual vs budget)
    const expenseVariance = await db('budgets as b')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('b.organization_id', organizationId)
      .where('bc.category_type', 'operating_expenses')
      .select(
        db.raw('SUM(b.allocated_amount) as budgeted'),
        db.raw('SUM(b.actual_spent) as actual')
      )
      .first();

    if (expenseVariance && parseMonetaryAmount(expenseVariance.budgeted) > 0) {
      const budgeted = parseMonetaryAmount(expenseVariance.budgeted);
      const actual = parseMonetaryAmount(expenseVariance.actual);
      const variance = ((actual - budgeted) / budgeted) * 100;
      kpis.expense_variance = {
        value: variance,
        unit: '%',
        target: 0,
        trend: variance > 0 ? 'up' : 'down'
      };
    }

    // Cost per game
    const costPerGame = await db('financial_transactions as ft')
      .join('budgets as b', 'ft.budget_id', 'b.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('ft.organization_id', organizationId)
      .where('ft.status', 'posted')
      .where('ft.transaction_date', '>=', periodStart)
      .where('bc.category_type', 'operating_expenses')
      .select(db.raw('SUM(ft.amount) as total_expenses'))
      .first();

    const gameCount = await db('games')
      .where('organization_id', organizationId)
      .where('date', '>=', periodStart)
      .count('id as total')
      .first();

    if (costPerGame && gameCount && parseInt(gameCount.total as string) > 0) {
      const totalExpenses = parseMonetaryAmount(costPerGame.total_expenses);
      const totalGames = parseInt(gameCount.total as string);
      kpis.cost_per_game = {
        value: totalExpenses / totalGames,
        unit: '$',
        target: 150, // This would be configurable
        trend: 'stable'
      };
    }

    // Payroll efficiency (payroll cost as % of total expenses)
    const payrollEfficiency = await db('financial_transactions')
      .where('organization_id', organizationId)
      .where('status', 'posted')
      .where('transaction_date', '>=', periodStart)
      .select(
        db.raw('SUM(CASE WHEN transaction_type = \'payroll\' THEN amount ELSE 0 END) as payroll'),
        db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') THEN amount ELSE 0 END) as total_expenses')
      )
      .first();

    if (payrollEfficiency && parseMonetaryAmount(payrollEfficiency.total_expenses) > 0) {
      const payroll = parseMonetaryAmount(payrollEfficiency.payroll);
      const totalExpenses = parseMonetaryAmount(payrollEfficiency.total_expenses);
      kpis.payroll_efficiency = {
        value: (payroll / totalExpenses) * 100,
        unit: '%',
        target: 60,
        trend: 'stable'
      };
    }

    // Get stored KPIs from database
    const storedKpis = await db('financial_kpis')
      .where('organization_id', organizationId)
      .orderBy('last_calculated_at', 'desc');

    const response: KPIResponse = {
      calculated_kpis: kpis,
      stored_kpis: storedKpis,
      calculation_period: {
        days: parseInt(period_days),
        start_date: periodStart,
        end_date: new Date()
      },
      generated_at: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Financial KPIs error:', error);
    res.status(500).json({ error: 'Failed to calculate financial KPIs' });
  }
});

/**
 * POST /api/financial-reports/kpis
 * Create or update a KPI configuration
 */
router.post('/kpis',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  async (req: AuthenticatedRequest, res: express.Response<KPIConfigResponse | ErrorResponse>) => {
    try {
      const { error, value } = kpiConfigSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId: number = req.user.organization_id || req.user.id;
      const kpiData: KPIConfigData = value;

      const [kpi] = await db('financial_kpis')
        .insert({
          ...kpiData,
          organization_id: organizationId
        })
        .onConflict(['organization_id', 'kpi_name'])
        .merge()
        .returning('*');

      res.status(201).json({
        message: 'KPI configured successfully',
        kpi
      });
    } catch (error) {
      console.error('KPI configuration error:', error);
      res.status(500).json({ error: 'Failed to configure KPI' });
    }
  }
);

/**
 * GET /api/financial-reports/export/:type
 * Export financial report as CSV
 */
router.get('/export/:type', authenticateToken, async (req: AuthenticatedRequest, res: express.Response<ExportResponse | ErrorResponse>) => {
  try {
    const reportType: string = req.params.type;
    const organizationId: number = req.user.organization_id || req.user.id;

    // This would implement CSV export functionality
    // For now, return a message indicating the feature
    const response: ExportResponse = {
      message: 'Export functionality would be implemented here',
      report_type: reportType,
      supported_formats: ['csv', 'excel', 'pdf']
    };

    res.json(response);
  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;