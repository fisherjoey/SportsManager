const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');

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
router.get('/budget-variance', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      period_id, 
      category_id, 
      date_from, 
      date_to,
      variance_threshold = 5 // Minimum variance percentage to show
    } = req.query;

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
    if (period_id) budgetQuery = budgetQuery.where('b.budget_period_id', period_id);
    if (category_id) budgetQuery = budgetQuery.where('b.category_id', category_id);

    const budgets = await budgetQuery.orderBy('bc.sort_order').orderBy('b.name');

    // Calculate variance metrics for each budget
    const budgetVariance = [];
    for (const budget of budgets) {
      const allocated = parseFloat(budget.allocated_amount) || 0;
      const spent = parseFloat(budget.actual_spent) || 0;
      const committed = parseFloat(budget.committed_amount) || 0;
      const available = allocated - spent - committed;
      
      const variance = allocated > 0 ? ((spent - allocated) / allocated) * 100 : 0;
      const utilizationRate = allocated > 0 ? (spent / allocated) * 100 : 0;

      // Only include if variance exceeds threshold
      if (Math.abs(variance) >= parseFloat(variance_threshold)) {
        budgetVariance.push({
          ...budget,
          allocated_amount: allocated,
          actual_spent: spent,
          committed_amount: committed,
          available_amount: available,
          variance_amount: spent - allocated,
          variance_percentage: Math.round(variance * 100) / 100,
          utilization_rate: Math.round(utilizationRate * 100) / 100,
          status_indicator: variance > 10 ? 'over_budget' : variance < -20 ? 'under_utilized' : 'on_track'
        });
      }
    }

    // Calculate summary statistics
    const summary = {
      total_budgets: budgets.length,
      budgets_over_variance: budgetVariance.filter(b => b.variance_percentage > 0).length,
      budgets_under_utilized: budgetVariance.filter(b => b.variance_percentage < -20).length,
      total_allocated: budgets.reduce((sum, b) => sum + parseFloat(b.allocated_amount || 0), 0),
      total_spent: budgets.reduce((sum, b) => sum + parseFloat(b.actual_spent || 0), 0),
      total_committed: budgets.reduce((sum, b) => sum + parseFloat(b.committed_amount || 0), 0),
      average_variance: budgetVariance.length > 0 
        ? budgetVariance.reduce((sum, b) => sum + b.variance_percentage, 0) / budgetVariance.length 
        : 0
    };

    // Get category-level variance summary
    const categoryVariance = await db('budgets as b')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('b.organization_id', organizationId)
      .modify(qb => {
        if (period_id) qb.where('b.budget_period_id', period_id);
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
    const categoryVarianceWithCalcs = categoryVariance.map(cat => {
      const allocated = parseFloat(cat.total_allocated) || 0;
      const spent = parseFloat(cat.total_spent) || 0;
      const variance = allocated > 0 ? ((spent - allocated) / allocated) * 100 : 0;
      
      return {
        ...cat,
        variance_percentage: Math.round(variance * 100) / 100,
        utilization_rate: allocated > 0 ? Math.round((spent / allocated) * 100 * 100) / 100 : 0
      };
    });

    res.json({
      summary,
      budget_variances: budgetVariance,
      category_variances: categoryVarianceWithCalcs,
      filters: { period_id, category_id, variance_threshold },
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Budget variance report error:', error);
    res.status(500).json({ error: 'Failed to generate budget variance report' });
  }
});

/**
 * GET /api/financial-reports/cash-flow
 * Generate cash flow report
 */
router.get('/cash-flow', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      date_from, 
      date_to, 
      grouping = 'monthly', // daily, weekly, monthly, quarterly
      include_forecast = false
    } = req.query;

    // Set default date range if not provided
    const endDate = date_to ? new Date(date_to) : new Date();
    const startDate = date_from ? new Date(date_from) : new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);

    // Get actual cash flow data
    let groupByFormat;
    let dateFormat;
    switch (grouping) {
      case 'daily':
        groupByFormat = 'YYYY-MM-DD';
        dateFormat = 'transaction_date';
        break;
      case 'weekly':
        groupByFormat = 'YYYY-"W"WW';
        dateFormat = db.raw("DATE_TRUNC('week', transaction_date)");
        break;
      case 'quarterly':
        groupByFormat = 'YYYY-"Q"Q';
        dateFormat = db.raw("DATE_TRUNC('quarter', transaction_date)");
        break;
      default: // monthly
        groupByFormat = 'YYYY-MM';
        dateFormat = db.raw("DATE_TRUNC('month', transaction_date)");
    }

    const cashFlowData = await db('financial_transactions')
      .where('organization_id', organizationId)
      .where('status', 'posted')
      .whereBetween('transaction_date', [startDate, endDate])
      .select(
        dateFormat + ' as period',
        db.raw('SUM(CASE WHEN transaction_type = \'revenue\' THEN amount ELSE 0 END) as inflow'),
        db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') THEN amount ELSE 0 END) as outflow'),
        db.raw('COUNT(*) as transaction_count')
      )
      .groupBy('period')
      .orderBy('period');

    // Calculate net cash flow and running balance
    let runningBalance = 0;
    const processedCashFlow = cashFlowData.map(row => {
      const inflow = parseFloat(row.inflow) || 0;
      const outflow = parseFloat(row.outflow) || 0;
      const netFlow = inflow - outflow;
      runningBalance += netFlow;

      return {
        period: row.period,
        inflow,
        outflow,
        net_flow: netFlow,
        running_balance: runningBalance,
        transaction_count: parseInt(row.transaction_count)
      };
    });

    // Get cash flow forecasts if requested
    let forecasts = [];
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

    res.json({
      summary,
      cash_flow_data: processedCashFlow,
      forecasts,
      top_revenue_categories: topRevenue,
      top_expense_categories: topExpenses,
      filters: { date_from: startDate, date_to: endDate, grouping },
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Cash flow report error:', error);
    res.status(500).json({ error: 'Failed to generate cash flow report' });
  }
});

/**
 * GET /api/financial-reports/expense-analysis
 * Generate detailed expense analysis report
 */
router.get('/expense-analysis', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      date_from, 
      date_to, 
      category_id,
      vendor_id,
      comparison_period = false // Compare with previous period
    } = req.query;

    const endDate = date_to ? new Date(date_to) : new Date();
    const startDate = date_from ? new Date(date_from) : new Date(endDate.getFullYear(), endDate.getMonth() - 2, 1);

    // Main expense query
    let expenseQuery = db('financial_transactions as ft')
      .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
      .leftJoin('budget_categories as bc', 'b.category_id', 'bc.id')
      .leftJoin('vendors as v', 'ft.vendor_id', 'v.id')
      .where('ft.organization_id', organizationId)
      .where('ft.transaction_type', 'expense')
      .where('ft.status', 'posted')
      .whereBetween('ft.transaction_date', [startDate, endDate]);

    if (category_id) expenseQuery = expenseQuery.where('b.category_id', category_id);
    if (vendor_id) expenseQuery = expenseQuery.where('ft.vendor_id', vendor_id);

    // Expense by category
    const expensesByCategory = await expenseQuery.clone()
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
      .orderBy('total_amount', 'desc');

    // Expense by vendor
    const expensesByVendor = await expenseQuery.clone()
      .groupBy('v.id', 'v.name')
      .select(
        'v.name as vendor_name',
        db.raw('SUM(ft.amount) as total_amount'),
        db.raw('COUNT(ft.id) as transaction_count'),
        db.raw('AVG(ft.amount) as average_amount')
      )
      .orderBy('total_amount', 'desc')
      .limit(10);

    // Monthly expense trend
    const monthlyTrend = await expenseQuery.clone()
      .select(
        db.raw("TO_CHAR(ft.transaction_date, 'YYYY-MM') as month"),
        db.raw('SUM(ft.amount) as total_amount'),
        db.raw('COUNT(ft.id) as transaction_count')
      )
      .groupBy('month')
      .orderBy('month');

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
    const topExpenses = await expenseQuery.clone()
      .select(
        'ft.transaction_number',
        'ft.description',
        'ft.amount',
        'ft.transaction_date',
        'bc.name as category_name',
        'v.name as vendor_name'
      )
      .orderBy('ft.amount', 'desc')
      .limit(10);

    // Comparison with previous period if requested
    let comparison = null;
    if (comparison_period === 'true') {
      const periodLength = endDate - startDate;
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(prevEndDate - periodLength);

      const [prevSummary] = await db('financial_transactions as ft')
        .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
        .where('ft.organization_id', organizationId)
        .where('ft.transaction_type', 'expense')
        .where('ft.status', 'posted')
        .whereBetween('ft.transaction_date', [prevStartDate, prevEndDate])
        .modify(qb => {
          if (category_id) qb.where('b.category_id', category_id);
          if (vendor_id) qb.where('ft.vendor_id', vendor_id);
        })
        .select(
          db.raw('SUM(ft.amount) as total_expenses'),
          db.raw('COUNT(ft.id) as total_transactions'),
          db.raw('AVG(ft.amount) as average_transaction')
        );

      if (prevSummary) {
        const currentTotal = parseFloat(summary.total_expenses) || 0;
        const prevTotal = parseFloat(prevSummary.total_expenses) || 0;
        const change = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

        comparison = {
          previous_period: {
            start_date: prevStartDate,
            end_date: prevEndDate,
            total_expenses: prevTotal,
            total_transactions: parseInt(prevSummary.total_transactions) || 0
          },
          change_amount: currentTotal - prevTotal,
          change_percentage: Math.round(change * 100) / 100,
          trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable'
        };
      }
    }

    res.json({
      summary: {
        ...summary,
        total_expenses: parseFloat(summary.total_expenses) || 0,
        total_transactions: parseInt(summary.total_transactions) || 0,
        average_transaction: parseFloat(summary.average_transaction) || 0,
        unique_vendors: parseInt(summary.unique_vendors) || 0,
        categories_used: parseInt(summary.categories_used) || 0
      },
      expenses_by_category: expensesByCategory,
      expenses_by_vendor: expensesByVendor,
      monthly_trend: monthlyTrend,
      top_expenses: topExpenses,
      comparison,
      filters: { date_from: startDate, date_to: endDate, category_id, vendor_id },
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Expense analysis report error:', error);
    res.status(500).json({ error: 'Failed to generate expense analysis report' });
  }
});

/**
 * GET /api/financial-reports/payroll-summary
 * Generate payroll summary report
 */
router.get('/payroll-summary', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      date_from, 
      date_to,
      referee_id,
      payment_status = 'all' // all, paid, pending, approved
    } = req.query;

    const endDate = date_to ? new Date(date_to) : new Date();
    const startDate = date_from ? new Date(date_from) : new Date(endDate.getFullYear(), endDate.getMonth() - 2, 1);

    // Base payroll query
    let payrollQuery = db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as ref', 'ga.user_id', 'ref.id')
      .leftJoin('financial_transactions as ft', 'ga.payroll_transaction_id', 'ft.id')
      .where('g.organization_id', organizationId)
      .whereBetween('g.date', [startDate, endDate]);

    if (referee_id) payrollQuery = payrollQuery.where('ga.user_id', referee_id);
    if (payment_status !== 'all') {
      payrollQuery = payrollQuery.where('ga.payment_status', payment_status);
    }

    // Payroll by referee
    const payrollByReferee = await payrollQuery.clone()
      .groupBy('ref.id', 'ref.first_name', 'ref.last_name', 'ref.email')
      .select(
        'ref.id as referee_id',
        db.raw("ref.first_name || ' ' || ref.last_name as referee_name"),
        'ref.email as referee_email',
        db.raw('COUNT(ga.id) as games_officiated'),
        db.raw('SUM(ga.calculated_wage) as total_wages'),
        db.raw('AVG(ga.calculated_wage) as average_wage'),
        db.raw('COUNT(CASE WHEN ga.payment_status = \'paid\' THEN 1 END) as games_paid'),
        db.raw('SUM(CASE WHEN ga.payment_status = \'paid\' THEN ga.calculated_wage ELSE 0 END) as wages_paid'),
        db.raw('SUM(CASE WHEN ga.payment_status IN (\'pending\', \'approved\') THEN ga.calculated_wage ELSE 0 END) as wages_pending')
      )
      .orderBy('total_wages', 'desc');

    // Monthly payroll trend
    const monthlyPayroll = await payrollQuery.clone()
      .select(
        db.raw("TO_CHAR(g.date, 'YYYY-MM') as month"),
        db.raw('COUNT(ga.id) as total_assignments'),
        db.raw('SUM(ga.calculated_wage) as total_wages'),
        db.raw('COUNT(DISTINCT ga.user_id) as active_referees')
      )
      .groupBy('month')
      .orderBy('month');

    // Payment status breakdown
    const paymentStatusBreakdown = await payrollQuery.clone()
      .groupBy('ga.payment_status')
      .select(
        'ga.payment_status',
        db.raw('COUNT(ga.id) as assignment_count'),
        db.raw('SUM(ga.calculated_wage) as total_amount')
      )
      .orderBy('total_amount', 'desc');

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
    const topEarningGames = await payrollQuery.clone()
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
      .limit(10);

    res.json({
      summary: {
        ...summary,
        total_assignments: parseInt(summary.total_assignments) || 0,
        total_wages: parseFloat(summary.total_wages) || 0,
        average_wage: parseFloat(summary.average_wage) || 0,
        total_referees: parseInt(summary.total_referees) || 0,
        games_covered: parseInt(summary.games_covered) || 0,
        total_paid: parseFloat(summary.total_paid) || 0,
        total_pending: parseFloat(summary.total_pending) || 0
      },
      payroll_by_referee: payrollByReferee,
      monthly_payroll: monthlyPayroll,
      payment_status_breakdown: paymentStatusBreakdown,
      top_earning_games: topEarningGames,
      filters: { date_from: startDate, date_to: endDate, referee_id, payment_status },
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Payroll summary report error:', error);
    res.status(500).json({ error: 'Failed to generate payroll summary report' });
  }
});

/**
 * GET /api/financial-reports/kpis
 * Get financial KPIs dashboard
 */
router.get('/kpis', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { period_days = 30 } = req.query;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - parseInt(period_days));

    // Calculate key financial KPIs
    const kpis = {};

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

    if (budgetUtilization && budgetUtilization.total_allocated > 0) {
      kpis.budget_utilization_rate = {
        value: (parseFloat(budgetUtilization.total_spent) / parseFloat(budgetUtilization.total_allocated)) * 100,
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
      const netCashFlow = parseFloat(cashFlowCurrent.revenue) - parseFloat(cashFlowCurrent.expenses);
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

    if (expenseVariance && expenseVariance.budgeted > 0) {
      const variance = ((parseFloat(expenseVariance.actual) - parseFloat(expenseVariance.budgeted)) / parseFloat(expenseVariance.budgeted)) * 100;
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

    if (costPerGame && gameCount && parseInt(gameCount.total) > 0) {
      kpis.cost_per_game = {
        value: parseFloat(costPerGame.total_expenses) / parseInt(gameCount.total),
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

    if (payrollEfficiency && parseFloat(payrollEfficiency.total_expenses) > 0) {
      kpis.payroll_efficiency = {
        value: (parseFloat(payrollEfficiency.payroll) / parseFloat(payrollEfficiency.total_expenses)) * 100,
        unit: '%',
        target: 60,
        trend: 'stable'
      };
    }

    // Get stored KPIs from database
    const storedKpis = await db('financial_kpis')
      .where('organization_id', organizationId)
      .orderBy('last_calculated_at', 'desc');

    res.json({
      calculated_kpis: kpis,
      stored_kpis: storedKpis,
      calculation_period: {
        days: parseInt(period_days),
        start_date: periodStart,
        end_date: new Date()
      },
      generated_at: new Date()
    });
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
  async (req, res) => {
    try {
      const { error, value } = kpiConfigSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      const [kpi] = await db('financial_kpis')
        .insert({
          ...value,
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
router.get('/export/:type', authenticateToken, async (req, res) => {
  try {
    const reportType = req.params.type;
    const organizationId = req.user.organization_id || req.user.id;

    // This would implement CSV export functionality
    // For now, return a message indicating the feature
    res.json({
      message: 'Export functionality would be implemented here',
      report_type: reportType,
      supported_formats: ['csv', 'excel', 'pdf']
    });
  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

module.exports = router;