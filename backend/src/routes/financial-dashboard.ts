/**
 * @fileoverview Financial Dashboard API Routes
 * @description Comprehensive financial dashboard with metrics, trends, and analytics
 */

import express, { Response } from 'express';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { asyncHandler } from '../middleware/errorHandling';

import { AuthenticatedRequest } from '../types/auth.types';
import {
  DashboardQueryParams,
  RefereePaymentQueryParams,
  DashboardResponse,
  RefereePaymentResponse,
  ErrorResponse,
  SummaryMetrics,
  RefereeWages,
  TopReferee,
  ExpenseCategory,
  Transaction,
  RevenueTrend,
  BudgetUtilization,
  Budget,
  PendingApprovals,
  RefereePayment,
  RefereePaymentSummary,
  parseMonetaryAmount,
  calculateNetIncome,
  calculatePercentage,
  parseDateRange,
  createTrendMap,
  addToTrendMap,
  convertTrendMapToArray,
  mergeTransactionArrays,
  createDefaultSummaryMetrics,
  createDefaultRefereeWages,
  createDefaultBudgetUtilization,
  createDefaultPendingApprovals,
  createDefaultBudgets,
  validateDashboardQuery,
  validateRefereePaymentQuery,
  DEFAULT_GAME_FEE_ESTIMATE,
  DEFAULT_RECENT_TRANSACTION_LIMIT,
  DEFAULT_TOP_REFEREES_LIMIT
} from '../types/financial-dashboard';

const router = express.Router();

/**
 * GET /api/financial-dashboard
 * Get comprehensive financial dashboard data
 * Requires: finance:read permission
 */
router.get('/',
  authenticateToken,
  requireCerbosPermission({ resource: 'financial_dashboard', action: 'view' }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<DashboardResponse | ErrorResponse>) => {
    const validation = validateDashboardQuery((req as any).query);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.errors.join(', ')
      });
    }

    const { startDate, endDate, period = '30' } = validation.parsed;

    // Calculate date range
    const { start, end } = parseDateRange(startDate, endDate, period);

    // Get summary metrics
    const summary = await getSummaryMetrics(start, end);

    // Get referee wage information
    const refereeWages = await getRefereeWages(start, end);

    // Get expense breakdown by category
    const expenseCategories = await getExpenseBreakdown(start, end);

    // Get recent transactions
    const recentTransactions = await getRecentTransactions(DEFAULT_RECENT_TRANSACTION_LIMIT);

    // Get revenue trends
    const revenueTrends = await getRevenueTrends(start, end);

    // Get budget utilization
    const budgetUtilization = await getBudgetUtilization();

    // Get pending approvals count
    const pendingApprovals = await getPendingApprovals();

    res.json({
      summary,
      refereeWages,
      expenseCategories,
      recentTransactions,
      revenueTrends,
      budgetUtilization,
      pendingApprovals,
      dateRange: { start, end }
    });
  })
);

/**
 * Get summary financial metrics
 */
async function getSummaryMetrics(startDate: Date, endDate: Date): Promise<SummaryMetrics> {
  try {
    // Calculate total referee wages
    const wageResult = await (db as any)('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'completed')
      .sum('u.wage_per_game as total_wages')
      .first() as any;

    // Calculate total expenses - handle the case where no expenses exist
    let expenseResult: any = null;
    try {
      expenseResult = await (db as any)('expense_data')
        .whereBetween('transaction_date', [startDate, endDate])
        .where('payment_status', 'approved')
        .sum('total_amount as total_expenses')
        .first() as any;
    } catch (error) {
      console.log('No expense data found:', (error as Error).message);
      expenseResult = { total_expenses: 0 };
    }

    // Calculate game fees (revenue) - use actual fees from database
    let totalRevenue = 0;
    try {
      const gameFeeResult = await (db as any)('game_fees as gf')
        .leftJoin('games as g', 'gf.game_id', 'g.id')
        .whereBetween('g.game_date', [startDate, endDate])
        .where('gf.payment_status', 'paid')
        .sum('gf.amount as total_revenue')
        .first() as any;

      totalRevenue = parseMonetaryAmount(gameFeeResult?.total_revenue);
    } catch (error) {
      console.log('No game fees data found, using estimated revenue:', (error as Error).message);
      // Fallback to estimated revenue based on game count
      const gameCount = await (db as any)('games')
        .whereBetween('game_date', [startDate, endDate])
        .count('id as count')
        .first() as any;

      totalRevenue = (gameCount?.count || 0) * DEFAULT_GAME_FEE_ESTIMATE;
    }

    const totalWages = parseMonetaryAmount(wageResult?.total_wages);
    const totalExpenses = parseMonetaryAmount(expenseResult?.total_expenses);
    const netIncome = calculateNetIncome(totalRevenue, totalWages, totalExpenses);

    // Get game count for reporting
    const gameCount = await (db as any)('games')
      .whereBetween('game_date', [startDate, endDate])
      .count('id as count')
      .first() as any;

    return {
      totalRevenue,
      totalWages,
      totalExpenses,
      netIncome,
      gameCount: gameCount?.count || 0
    };
  } catch (error) {
    console.error('Error in getSummaryMetrics:', error);
    return createDefaultSummaryMetrics();
  }
}

/**
 * Get referee wage breakdown
 */
async function getRefereeWages(startDate: Date, endDate: Date): Promise<RefereeWages> {
  try {
    const wages = await (db as any)('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'completed')
      .groupBy('u.id', 'u.name', 'u.email')
      .select(
        'u.id',
        'u.name',
        'u.email',
        db.raw('COUNT(ga.id) as games_count'),
        db.raw('SUM(u.wage_per_game) as total_wages'),
        db.raw('AVG(u.wage_per_game) as avg_wage')
      )
      .orderBy('total_wages', 'desc')
      .limit(DEFAULT_TOP_REFEREES_LIMIT) as any as TopReferee[];

    const totalWages = await (db as any)('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'completed')
      .sum('u.wage_per_game as total')
      .first() as any;

    const pendingWages = await (db as any)('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'assigned')
      .sum('u.wage_per_game as total')
      .first() as any;

    return {
      topReferees: wages.map(w => ({
        ...w,
        games_count: parseInt(String(w.games_count)),
        total_wages: parseMonetaryAmount(w.total_wages),
        avg_wage: parseMonetaryAmount(w.avg_wage)
      })),
      totalPaid: parseMonetaryAmount(totalWages?.total),
      totalPending: parseMonetaryAmount(pendingWages?.total)
    };
  } catch (error) {
    console.error('Error in getRefereeWages:', error);
    return createDefaultRefereeWages();
  }
}

/**
 * Get expense breakdown by category
 */
async function getExpenseBreakdown(startDate: Date, endDate: Date): Promise<ExpenseCategory[]> {
  try {
    const categories = await (db as any)('expense_data as ed')
      .leftJoin('expense_categories as ec', 'ed.category_id', 'ec.id')
      .whereBetween('ed.transaction_date', [startDate, endDate])
      .where('ed.payment_status', 'approved')
      .groupBy('ec.id', 'ec.name', 'ec.description')
      .select(
        'ec.id',
        'ec.name',
        'ec.description',
        db.raw('COUNT(ed.id) as transaction_count'),
        db.raw('SUM(ed.total_amount) as total_amount'),
        db.raw('AVG(ed.total_amount) as avg_amount')
      )
      .orderBy('total_amount', 'desc') as any[];

    // Calculate uncategorized expenses
    const uncategorized = await (db as any)('expense_data')
      .whereBetween('transaction_date', [startDate, endDate])
      .where('payment_status', 'approved')
      .whereNull('category_id')
      .select(
        db.raw('COUNT(id) as transaction_count'),
        db.raw('SUM(total_amount) as total_amount'),
        db.raw('AVG(total_amount) as avg_amount')
      )
      .first() as any;

    const result: ExpenseCategory[] = categories.map(cat => ({
      id: cat.id,
      name: cat.name || 'Unknown',
      description: cat.description || '',
      transaction_count: parseInt(String(cat.transaction_count)),
      total_amount: parseMonetaryAmount(cat.total_amount),
      avg_amount: parseMonetaryAmount(cat.avg_amount)
    }));

    if (uncategorized && parseMonetaryAmount(uncategorized.total_amount) > 0) {
      result.push({
        id: null,
        name: 'Uncategorized',
        description: 'Expenses without category',
        transaction_count: parseInt(String(uncategorized.transaction_count)),
        total_amount: parseMonetaryAmount(uncategorized.total_amount),
        avg_amount: parseMonetaryAmount(uncategorized.avg_amount)
      });
    }

    return result;
  } catch (error) {
    console.error('Error in getExpenseBreakdown:', error);
    return [];
  }
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(limit: number = DEFAULT_RECENT_TRANSACTION_LIMIT): Promise<Transaction[]> {
  try {
    // Get recent expenses
    let expenses: Transaction[] = [];
    try {
      const expenseResults = await (db as any)('expense_data as ed')
        .leftJoin('expense_categories as ec', 'ed.category_id', 'ec.id')
        .leftJoin('users as u', 'ed.user_id', 'u.id')
        .select(
          'ed.id',
          'ed.transaction_date as date',
          'ed.total_amount as amount',
          'ed.description',
          'ed.payment_status as status',
          'ec.name as category',
          'u.name as submitted_by',
          db.raw("'expense' as type")
        )
        .orderBy('ed.transaction_date', 'desc')
        .limit(limit) as any[];

      expenses = expenseResults.map(exp => ({
        id: exp.id,
        date: new Date(exp.date),
        amount: parseMonetaryAmount(exp.amount),
        description: exp.description || '',
        status: exp.status || '',
        category: exp.category || 'Uncategorized',
        submitted_by: exp.submitted_by || 'Unknown',
        type: 'expense' as const
      }));
    } catch (error) {
      console.log('No expense data found for transactions:', (error as Error).message);
    }

    // Get recent referee payments (from completed assignments)
    let payments: Transaction[] = [];
    try {
      const paymentResults = await (db as any)('game_assignments as ga')
        .join('games as g', 'ga.game_id', 'g.id')
        .join('users as u', 'ga.referee_id', 'u.id')
        .where('ga.status', 'completed')
        .select(
          'ga.id',
          'g.date',
          'u.wage_per_game as amount',
          db.raw("CONCAT('Referee payment - ', u.name, ' for game #', g.game_number) as description"),
          db.raw("'completed' as status"),
          db.raw("'Referee Wages' as category"),
          db.raw("'System' as submitted_by"),
          db.raw("'payment' as type")
        )
        .orderBy('g.date', 'desc')
        .limit(limit) as any[];

      payments = paymentResults.map(pay => ({
        id: pay.id,
        date: new Date(pay.date),
        amount: parseMonetaryAmount(pay.amount),
        description: pay.description || '',
        status: pay.status || '',
        category: pay.category || 'Wages',
        submitted_by: pay.submitted_by || 'System',
        type: 'payment' as const
      }));
    } catch (error) {
      console.log('No payment data found for transactions:', (error as Error).message);
    }

    return mergeTransactionArrays(expenses, payments, limit);
  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    return [];
  }
}

/**
 * Get revenue trends
 */
async function getRevenueTrends(startDate: Date, endDate: Date): Promise<RevenueTrend[]> {
  try {
    // Get daily revenue from actual game fees
    let dailyRevenue: any[] = [];
    try {
      dailyRevenue = await (db as any)('game_fees as gf')
        .leftJoin('games as g', 'gf.game_id', 'g.id')
        .whereBetween('g.game_date', [startDate, endDate])
        .where('gf.payment_status', 'paid')
        .groupBy('g.game_date')
        .select(
          'g.game_date as date',
          db.raw('COUNT(gf.id) as game_count'),
          db.raw('SUM(gf.amount) as revenue')
        )
        .orderBy('g.game_date') as any[];
    } catch (error) {
      console.log('No game fees data found, using estimated revenue:', (error as Error).message);
      // Fallback to estimated revenue based on game count
      dailyRevenue = await (db as any)('games')
        .whereBetween('game_date', [startDate, endDate])
        .groupBy('game_date')
        .select(
          'game_date as date',
          db.raw('COUNT(id) as game_count'),
          db.raw(`COUNT(id) * ${DEFAULT_GAME_FEE_ESTIMATE} as revenue`)
        )
        .orderBy('game_date') as any[];
    }

    // Get daily expenses - handle missing table gracefully
    let dailyExpenses: any[] = [];
    try {
      dailyExpenses = await (db as any)('expense_data')
        .whereBetween('transaction_date', [startDate, endDate])
        .where('payment_status', 'approved')
        .groupBy('transaction_date')
        .select(
          'transaction_date as date',
          db.raw('SUM(total_amount) as expenses')
        )
        .orderBy('transaction_date') as any[];
    } catch (error) {
      console.log('No expense data for trends:', (error as Error).message);
    }

    // Get daily referee wages
    const dailyWages = await (db as any)('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'completed')
      .groupBy('g.date')
      .select(
        'g.date',
        db.raw('SUM(u.wage_per_game) as wages')
      )
      .orderBy('g.date') as any[];

    // Combine data by date using trend map utilities
    const trendMap = createTrendMap();

    dailyRevenue.forEach(item => {
      addToTrendMap(trendMap, new Date(item.date), {
        revenue: parseMonetaryAmount(item.revenue),
        gameCount: parseInt(String(item.game_count || 0))
      });
    });

    dailyExpenses.forEach(item => {
      addToTrendMap(trendMap, new Date(item.date), {
        expenses: parseMonetaryAmount(item.expenses)
      });
    });

    dailyWages.forEach(item => {
      addToTrendMap(trendMap, new Date(item.date), {
        wages: parseMonetaryAmount(item.wages)
      });
    });

    return convertTrendMapToArray(trendMap);
  } catch (error) {
    console.error('Error in getRevenueTrends:', error);
    return [];
  }
}

/**
 * Get budget utilization
 */
async function getBudgetUtilization(): Promise<BudgetUtilization> {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Start with default budget data
    const budgets: Budget[] = createDefaultBudgets();

    // Calculate actual spending for each category
    try {
      const wageSpending = await (db as any)('game_assignments as ga')
        .join('games as g', 'ga.game_id', 'g.id')
        .join('users as u', 'ga.referee_id', 'u.id')
        .whereRaw('EXTRACT(MONTH FROM g.date) = ?', [currentMonth])
        .whereRaw('EXTRACT(YEAR FROM g.date) = ?', [currentYear])
        .where('ga.status', 'completed')
        .sum('u.wage_per_game as total')
        .first() as any;

      if (wageSpending?.total) {
        const spent = parseMonetaryAmount(wageSpending.total);
        budgets[0].spent = spent;
        budgets[0].percentage = calculatePercentage(spent, budgets[0].allocated);
      }
    } catch (error) {
      console.log('Error calculating wage spending:', (error as Error).message);
    }

    // Get expense spending by category - handle missing tables gracefully
    try {
      const expenseSpending = await (db as any)('expense_data as ed')
        .leftJoin('expense_categories as ec', 'ed.category_id', 'ec.id')
        .whereRaw('EXTRACT(MONTH FROM ed.transaction_date) = ?', [currentMonth])
        .whereRaw('EXTRACT(YEAR FROM ed.transaction_date) = ?', [currentYear])
        .where('ed.payment_status', 'approved')
        .groupBy('ec.name')
        .select(
          'ec.name',
          db.raw('SUM(ed.total_amount) as total')
        ) as any[];

      expenseSpending.forEach(expense => {
        const budget = budgets.find(b =>
          b.category.toLowerCase().includes(expense.name?.toLowerCase() || '')
        );
        if (budget) {
          const spent = parseMonetaryAmount(expense.total);
          budget.spent += spent;
          budget.percentage = calculatePercentage(budget.spent, budget.allocated);
        }
      });
    } catch (error) {
      console.log('Error calculating expense spending:', (error as Error).message);
    }

    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

    return {
      budgets,
      totalAllocated,
      totalSpent,
      overallUtilization: calculatePercentage(totalSpent, totalAllocated)
    };
  } catch (error) {
    console.error('Error in getBudgetUtilization:', error);
    return createDefaultBudgetUtilization();
  }
}

/**
 * Get pending approvals count
 */
async function getPendingApprovals(): Promise<PendingApprovals> {
  try {
    let expenseCount = 0;
    try {
      const expenseApprovals = await (db as any)('expense_data')
        .where('payment_status', 'pending')
        .count('id as count')
        .first() as any;
      expenseCount = parseInt(expenseApprovals?.count || '0');
    } catch (error) {
      console.log('No expense approval data:', (error as Error).message);
    }

    let assignmentCount = 0;
    try {
      const assignmentApprovals = await (db as any)('game_assignments')
        .where('status', 'pending')
        .count('id as count')
        .first() as any;
      assignmentCount = parseInt(assignmentApprovals?.count || '0');
    } catch (error) {
      console.log('No assignment approval data:', (error as Error).message);
    }

    return {
      expenses: expenseCount,
      assignments: assignmentCount,
      total: expenseCount + assignmentCount
    };
  } catch (error) {
    console.error('Error in getPendingApprovals:', error);
    return createDefaultPendingApprovals();
  }
}

/**
 * GET /api/financial-dashboard/referee-payments
 * Get detailed referee payment information
 * Requires: finance:read permission
 */
router.get('/referee-payments',
  authenticateToken,
  requireCerbosPermission({ resource: 'financial_dashboard', action: 'view:referee_payments' }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<RefereePaymentResponse | ErrorResponse>) => {
    const validation = validateRefereePaymentQuery((req as any).query);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.errors.join(', ')
      });
    }

    const { startDate, endDate, refereeId, status = 'all' } = validation.parsed;

    let query = (db as any)('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .leftJoin('leagues as l', 'g.league_id', 'l.id')
      .select(
        'ga.id as assignment_id',
        'g.id as game_id',
        'g.game_number',
        'g.date as game_date',
        'g.time as game_time',
        'g.location',
        'u.id as referee_id',
        'u.name as referee_name',
        'u.email as referee_email',
        'u.wage_per_game',
        'ga.status as assignment_status',
        'ga.position',
        'l.name as league_name',
        db.raw("CASE WHEN ga.status = 'completed' THEN 'paid' ELSE 'pending' END as payment_status")
      );

    if (startDate && endDate) {
      query = query.whereBetween('g.date', [startDate, endDate]);
    }

    if (refereeId) {
      query = query.where('u.id', refereeId);
    }

    if (status !== 'all') {
      if (status === 'paid') {
        query = query.where('ga.status', 'completed');
      } else if (status === 'pending') {
        query = query.where('ga.status', 'assigned');
      }
    }

    const paymentResults = await query.orderBy('g.date', 'desc') as any[];

    const payments: RefereePayment[] = paymentResults.map(p => ({
      assignment_id: p.assignment_id,
      game_id: p.game_id,
      game_number: p.game_number || '',
      game_date: new Date(p.game_date),
      game_time: p.game_time || '',
      location: p.location || '',
      referee_id: p.referee_id,
      referee_name: p.referee_name || '',
      referee_email: p.referee_email || '',
      wage_per_game: parseMonetaryAmount(p.wage_per_game),
      assignment_status: p.assignment_status || '',
      position: p.position || '',
      league_name: p.league_name || '',
      payment_status: p.payment_status as 'paid' | 'pending'
    }));

    // Calculate summary
    const summary: RefereePaymentSummary = {
      totalPaid: 0,
      totalPending: 0,
      totalGames: payments.length,
      uniqueReferees: 0
    };

    const uniqueRefereeIds = new Set<number>();

    payments.forEach(payment => {
      if (payment.payment_status === 'paid') {
        summary.totalPaid += payment.wage_per_game;
      } else {
        summary.totalPending += payment.wage_per_game;
      }
      uniqueRefereeIds.add(payment.referee_id);
    });

    summary.uniqueReferees = uniqueRefereeIds.size;

    res.json({
      payments,
      summary
    });
  })
);

export default router;