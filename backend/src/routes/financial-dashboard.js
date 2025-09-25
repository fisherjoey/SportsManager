const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAnyRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');

/**
 * GET /api/financial-dashboard
 * Get comprehensive financial dashboard data
 * Requires: finance:read permission
 */
router.get('/', authenticateToken, requirePermission('finance:read'), asyncHandler(async (req, res) => {
  const { startDate, endDate, period = '30' } = req.query;
  
  // Calculate date range
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));
  
  // Get summary metrics
  const summary = await getSummaryMetrics(start, end);
  
  // Get referee wage information
  const refereeWages = await getRefereeWages(start, end);
  
  // Get expense breakdown by category
  const expenseCategories = await getExpenseBreakdown(start, end);
  
  // Get recent transactions
  const recentTransactions = await getRecentTransactions(10);
  
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
}));

/**
 * Get summary financial metrics
 */
async function getSummaryMetrics(startDate, endDate) {
  try {
    // Calculate total referee wages
    const wageResult = await db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'completed')
      .sum('u.wage_per_game as total_wages')
      .first();
    
    // Calculate total expenses - handle the case where no expenses exist
    let expenseResult = null;
    try {
      expenseResult = await db('expense_data')
        .whereBetween('transaction_date', [startDate, endDate])
        .where('payment_status', 'approved')
        .sum('total_amount as total_expenses')
        .first();
    } catch (error) {
      console.log('No expense data found:', error.message);
      expenseResult = { total_expenses: 0 };
    }
    
    // Calculate game fees (revenue) - use actual fees from database
    let totalRevenue = 0;
    try {
      const gameFeeResult = await db('game_fees as gf')
        .leftJoin('games as g', 'gf.game_id', 'g.id')
        .whereBetween('g.game_date', [startDate, endDate])
        .where('gf.payment_status', 'paid')
        .sum('gf.amount as total_revenue')
        .first();
      
      totalRevenue = parseFloat(gameFeeResult?.total_revenue || 0);
    } catch (error) {
      console.log('No game fees data found, using estimated revenue:', error.message);
      // Fallback to estimated revenue based on game count
      const gameCount = await db('games')
        .whereBetween('game_date', [startDate, endDate])
        .count('id as count')
        .first();
      
      const avgGameFee = 150; // Standard game fee estimate
      totalRevenue = (gameCount?.count || 0) * avgGameFee;
    }
    
    const totalWages = parseFloat(wageResult?.total_wages || 0);
    const totalExpenses = parseFloat(expenseResult?.total_expenses || 0);
    const netIncome = totalRevenue - totalWages - totalExpenses;
    
    // Get game count for reporting
    const gameCount = await db('games')
      .whereBetween('game_date', [startDate, endDate])
      .count('id as count')
      .first();
    
    return {
      totalRevenue,
      totalWages,
      totalExpenses,
      netIncome,
      gameCount: gameCount?.count || 0
    };
  } catch (error) {
    console.error('Error in getSummaryMetrics:', error);
    // Return default values if there's an error
    return {
      totalRevenue: 0,
      totalWages: 0,
      totalExpenses: 0,
      netIncome: 0,
      gameCount: 0
    };
  }
}

/**
 * Get referee wage breakdown
 */
async function getRefereeWages(startDate, endDate) {
  try {
    const wages = await db('game_assignments as ga')
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
      .limit(10);
    
    const totalWages = await db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'completed')
      .sum('u.wage_per_game as total')
      .first();
    
    const pendingWages = await db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'assigned')
      .sum('u.wage_per_game as total')
      .first();
    
    return {
      topReferees: wages,
      totalPaid: parseFloat(totalWages?.total || 0),
      totalPending: parseFloat(pendingWages?.total || 0)
    };
  } catch (error) {
    console.error('Error in getRefereeWages:', error);
    return {
      topReferees: [],
      totalPaid: 0,
      totalPending: 0
    };
  }
}

/**
 * Get expense breakdown by category
 */
async function getExpenseBreakdown(startDate, endDate) {
  try {
    const categories = await db('expense_data as ed')
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
      .orderBy('total_amount', 'desc');
    
    // Calculate uncategorized expenses
    const uncategorized = await db('expense_data')
      .whereBetween('transaction_date', [startDate, endDate])
      .where('payment_status', 'approved')
      .whereNull('category_id')
      .select(
        db.raw('COUNT(id) as transaction_count'),
        db.raw('SUM(total_amount) as total_amount'),
        db.raw('AVG(total_amount) as avg_amount')
      )
      .first();
    
    if (uncategorized && uncategorized.total_amount > 0) {
      categories.push({
        id: null,
        name: 'Uncategorized',
        description: 'Expenses without category',
        transaction_count: uncategorized.transaction_count,
        total_amount: uncategorized.total_amount,
        avg_amount: uncategorized.avg_amount
      });
    }
    
    return categories;
  } catch (error) {
    console.error('Error in getExpenseBreakdown:', error);
    return [];
  }
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(limit = 10) {
  try {
    // Get recent expenses
    let expenses = [];
    try {
      expenses = await db('expense_data as ed')
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
        .limit(limit);
    } catch (error) {
      console.log('No expense data found for transactions:', error.message);
    }
    
    // Get recent referee payments (from completed assignments)
    let payments = [];
    try {
      payments = await db('game_assignments as ga')
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
        .limit(limit);
    } catch (error) {
      console.log('No payment data found for transactions:', error.message);
    }
    
    // Combine and sort all transactions
    const allTransactions = [...expenses, ...payments]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
    
    return allTransactions;
  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    return [];
  }
}

/**
 * Get revenue trends
 */
async function getRevenueTrends(startDate, endDate) {
  try {
    // Get daily revenue from actual game fees
    let dailyRevenue = [];
    try {
      dailyRevenue = await db('game_fees as gf')
        .leftJoin('games as g', 'gf.game_id', 'g.id')
        .whereBetween('g.game_date', [startDate, endDate])
        .where('gf.payment_status', 'paid')
        .groupBy('g.game_date')
        .select(
          'g.game_date as date',
          db.raw('COUNT(gf.id) as game_count'),
          db.raw('SUM(gf.amount) as revenue')
        )
        .orderBy('g.game_date');
    } catch (error) {
      console.log('No game fees data found, using estimated revenue:', error.message);
      // Fallback to estimated revenue based on game count
      dailyRevenue = await db('games')
        .whereBetween('game_date', [startDate, endDate])
        .groupBy('game_date')
        .select(
          'game_date as date',
          db.raw('COUNT(id) as game_count'),
          db.raw('COUNT(id) * 150 as revenue') // Using standard game fee estimate
        )
        .orderBy('game_date');
    }
    
    // Get daily expenses - handle missing table gracefully
    let dailyExpenses = [];
    try {
      dailyExpenses = await db('expense_data')
        .whereBetween('transaction_date', [startDate, endDate])
        .where('payment_status', 'approved')
        .groupBy('transaction_date')
        .select(
          'transaction_date as date',
          db.raw('SUM(total_amount) as expenses')
        )
        .orderBy('transaction_date');
    } catch (error) {
      console.log('No expense data for trends:', error.message);
    }
    
    // Get daily referee wages
    const dailyWages = await db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.referee_id', 'u.id')
      .whereBetween('g.date', [startDate, endDate])
      .where('ga.status', 'completed')
      .groupBy('g.date')
      .select(
        'g.date',
        db.raw('SUM(u.wage_per_game) as wages')
      )
      .orderBy('g.date');
    
    // Combine data by date
    const trendMap = new Map();
    
    dailyRevenue.forEach(item => {
      trendMap.set(item.date.toISOString().split('T')[0], {
        date: item.date,
        revenue: parseFloat(item.revenue),
        expenses: 0,
        wages: 0,
        gameCount: item.game_count
      });
    });
    
    dailyExpenses.forEach(item => {
      const dateKey = item.date.toISOString().split('T')[0];
      if (trendMap.has(dateKey)) {
        trendMap.get(dateKey).expenses = parseFloat(item.expenses);
      } else {
        trendMap.set(dateKey, {
          date: item.date,
          revenue: 0,
          expenses: parseFloat(item.expenses),
          wages: 0,
          gameCount: 0
        });
      }
    });
    
    dailyWages.forEach(item => {
      const dateKey = item.date.toISOString().split('T')[0];
      if (trendMap.has(dateKey)) {
        trendMap.get(dateKey).wages = parseFloat(item.wages);
      } else {
        trendMap.set(dateKey, {
          date: item.date,
          revenue: 0,
          expenses: 0,
          wages: parseFloat(item.wages),
          gameCount: 0
        });
      }
    });
    
    // Convert to array and sort
    const trends = Array.from(trendMap.values())
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        ...item,
        netIncome: item.revenue - item.expenses - item.wages
      }));
    
    return trends;
  } catch (error) {
    console.error('Error in getRevenueTrends:', error);
    return [];
  }
}

/**
 * Get budget utilization
 */
async function getBudgetUtilization() {
  try {
    // This is a simplified version - would need proper budget tables
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Mock budget data - replace with actual budget queries
    const budgets = [
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
    
    // Calculate actual spending for each category
    try {
      const wageSpending = await db('game_assignments as ga')
        .join('games as g', 'ga.game_id', 'g.id')
        .join('users as u', 'ga.referee_id', 'u.id')
        .whereRaw('EXTRACT(MONTH FROM g.date) = ?', [currentMonth])
        .whereRaw('EXTRACT(YEAR FROM g.date) = ?', [currentYear])
        .where('ga.status', 'completed')
        .sum('u.wage_per_game as total')
        .first();
      
      if (wageSpending?.total) {
        budgets[0].spent = parseFloat(wageSpending.total);
        budgets[0].percentage = (budgets[0].spent / budgets[0].allocated) * 100;
      }
    } catch (error) {
      console.log('Error calculating wage spending:', error.message);
    }
    
    // Get expense spending by category - handle missing tables gracefully
    try {
      const expenseSpending = await db('expense_data as ed')
        .leftJoin('expense_categories as ec', 'ed.category_id', 'ec.id')
        .whereRaw('EXTRACT(MONTH FROM ed.transaction_date) = ?', [currentMonth])
        .whereRaw('EXTRACT(YEAR FROM ed.transaction_date) = ?', [currentYear])
        .where('ed.payment_status', 'approved')
        .groupBy('ec.name')
        .select(
          'ec.name',
          db.raw('SUM(ed.total_amount) as total')
        );
      
      expenseSpending.forEach(expense => {
        const budget = budgets.find(b => 
          b.category.toLowerCase().includes(expense.name?.toLowerCase() || '')
        );
        if (budget) {
          budget.spent += parseFloat(expense.total);
          budget.percentage = (budget.spent / budget.allocated) * 100;
        }
      });
    } catch (error) {
      console.log('Error calculating expense spending:', error.message);
    }
    
    return {
      budgets,
      totalAllocated: budgets.reduce((sum, b) => sum + b.allocated, 0),
      totalSpent: budgets.reduce((sum, b) => sum + b.spent, 0),
      overallUtilization: budgets.reduce((sum, b) => sum + b.spent, 0) / 
                          budgets.reduce((sum, b) => sum + b.allocated, 0) * 100
    };
  } catch (error) {
    console.error('Error in getBudgetUtilization:', error);
    return {
      budgets: [],
      totalAllocated: 0,
      totalSpent: 0,
      overallUtilization: 0
    };
  }
}

/**
 * Get pending approvals count
 */
async function getPendingApprovals() {
  try {
    let expenseCount = 0;
    try {
      const expenseApprovals = await db('expense_data')
        .where('payment_status', 'pending')
        .count('id as count')
        .first();
      expenseCount = parseInt(expenseApprovals?.count || 0);
    } catch (error) {
      console.log('No expense approval data:', error.message);
    }
    
    let assignmentCount = 0;
    try {
      const assignmentApprovals = await db('game_assignments')
        .where('status', 'pending')
        .count('id as count')
        .first();
      assignmentCount = parseInt(assignmentApprovals?.count || 0);
    } catch (error) {
      console.log('No assignment approval data:', error.message);
    }
    
    return {
      expenses: expenseCount,
      assignments: assignmentCount,
      total: expenseCount + assignmentCount
    };
  } catch (error) {
    console.error('Error in getPendingApprovals:', error);
    return {
      expenses: 0,
      assignments: 0,
      total: 0
    };
  }
}

/**
 * GET /api/financial-dashboard/referee-payments
 * Get detailed referee payment information
 * Requires: finance:read permission
 */
router.get('/referee-payments', authenticateToken, requirePermission('finance:read'), asyncHandler(async (req, res) => {
  const { startDate, endDate, refereeId, status = 'all' } = req.query;
  
  let query = db('game_assignments as ga')
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
  
  const payments = await query.orderBy('g.date', 'desc');
  
  // Calculate summary
  const summary = {
    totalPaid: 0,
    totalPending: 0,
    totalGames: payments.length,
    uniqueReferees: new Set()
  };
  
  payments.forEach(payment => {
    if (payment.payment_status === 'paid') {
      summary.totalPaid += parseFloat(payment.wage_per_game);
    } else {
      summary.totalPending += parseFloat(payment.wage_per_game);
    }
    summary.uniqueReferees.add(payment.referee_id);
  });
  
  summary.uniqueReferees = summary.uniqueReferees.size;
  
  res.json({
    payments,
    summary
  });
}));

module.exports = router;