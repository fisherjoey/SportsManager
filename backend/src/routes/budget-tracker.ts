// @ts-nocheck

import express from 'express';
const router = express.Router();
import db from '../config/database';
import { authenticateToken, requireAnyRole  } from '../middleware/auth';
import { asyncHandler  } from '../middleware/errorHandling';

/**
 * GET /api/budgets/utilization
 * Get current budget utilization data - simplified version of financial dashboard logic
 */
router.get('/utilization', authenticateToken, requireAnyRole(['admin', 'finance']), asyncHandler(async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  // Mock budget data - in a real app, this would come from a budgets table
  const budgets = [
    {
      id: 1,
      category: 'Referee Wages',
      allocated: 50000,
      spent: 0,
      percentage: 0,
      color: '#0088FE'
    },
    {
      id: 2,
      category: 'Operations', 
      allocated: 10000,
      spent: 0,
      percentage: 0,
      color: '#00C49F'
    },
    {
      id: 3,
      category: 'Equipment',
      allocated: 5000,
      spent: 0,
      percentage: 0,
      color: '#FFBB28'
    },
    {
      id: 4,
      category: 'Administration',
      allocated: 8000,
      spent: 0,
      percentage: 0,
      color: '#FF8042'
    }
  ];
  
  try {
    // Calculate actual referee wage spending
    const wageSpending = await db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .join('users as u', 'ga.user_id', 'u.id')
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
  
  try {
    // Calculate expense spending by category using existing expense_data
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
        budget.spent += parseFloat(expense.total || 0);
        budget.percentage = (budget.spent / budget.allocated) * 100;
      }
    });
  } catch (error) {
    console.log('Error calculating expense spending:', error.message);
  }
  
  // Calculate totals
  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallUtilization = totalSpent / totalAllocated * 100;
  
  res.json({
    budgets,
    summary: {
      totalAllocated,
      totalSpent,
      overallUtilization,
      remainingBudget: totalAllocated - totalSpent,
      categoriesOverBudget: budgets.filter(b => b.percentage > 100).length,
      categoriesNearLimit: budgets.filter(b => b.percentage > 75 && b.percentage <= 100).length
    },
    period: {
      month: currentMonth,
      year: currentYear,
      monthName: new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long' })
    }
  });
}));

/**
 * GET /api/budgets/categories
 * Get simplified budget categories list
 */
router.get('/categories', authenticateToken, requireAnyRole(['admin', 'finance']), asyncHandler(async (req, res) => {
  const categories = [
    { id: 1, name: 'Referee Wages', description: 'Payment to referees for completed games' },
    { id: 2, name: 'Operations', description: 'Day-to-day operational expenses' },
    { id: 3, name: 'Equipment', description: 'Sports equipment and referee gear' },
    { id: 4, name: 'Administration', description: 'Administrative and office expenses' },
    { id: 5, name: 'Marketing', description: 'Marketing and promotional activities' },
    { id: 6, name: 'Travel', description: 'Travel and transportation costs' }
  ];
  
  res.json({ categories });
}));

export default router;