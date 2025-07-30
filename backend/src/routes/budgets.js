const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/auditTrail');

// Validation schemas
const budgetPeriodSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  start_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('start_date')).required(),
  is_template: Joi.boolean().default(false)
});

const budgetCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  code: Joi.string().min(1).max(20).required(),
  description: Joi.string().max(500).optional(),
  parent_id: Joi.string().uuid().optional(),
  category_type: Joi.string().valid(
    'revenue',
    'operating_expenses', 
    'payroll',
    'equipment',
    'facilities',
    'travel',
    'marketing',
    'admin',
    'other'
  ).required(),
  color_code: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  sort_order: Joi.number().integer().min(0).default(0)
});

const budgetSchema = Joi.object({
  budget_period_id: Joi.string().uuid().required(),
  category_id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  allocated_amount: Joi.number().min(0).required(),
  variance_rules: Joi.object().optional(),
  seasonal_patterns: Joi.object().optional(),
  owner_id: Joi.string().uuid().optional()
});

const budgetAllocationSchema = Joi.object({
  budget_id: Joi.string().uuid().required(),
  allocation_year: Joi.number().integer().min(2020).max(2100).required(),
  allocation_month: Joi.number().integer().min(1).max(12).required(),
  allocated_amount: Joi.number().min(0).required(),
  notes: Joi.string().max(500).optional()
});

/**
 * GET /api/budgets/periods
 * List budget periods
 */
router.get('/periods', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = db('budget_periods')
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    const offset = (page - 1) * limit;
    const [periods, [{ total }]] = await Promise.all([
      query.clone().limit(limit).offset(offset),
      query.clone().count('id as total')
    ]);

    res.json({
      periods,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Budget periods list error:', error);
    res.status(500).json({ error: 'Failed to retrieve budget periods' });
  }
});

/**
 * POST /api/budgets/periods
 * Create a new budget period
 */
router.post('/periods', 
  authenticateToken, 
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = budgetPeriodSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;
      
      // Check for overlapping periods
      const overlapping = await db('budget_periods')
        .where('organization_id', organizationId)
        .where(function() {
          this.whereBetween('start_date', [value.start_date, value.end_date])
              .orWhereBetween('end_date', [value.start_date, value.end_date])
              .orWhere(function() {
                this.where('start_date', '<=', value.start_date)
                    .andWhere('end_date', '>=', value.end_date);
              });
        })
        .whereNot('status', 'archived')
        .first();

      if (overlapping) {
        return res.status(409).json({
          error: 'Overlapping budget period',
          message: 'A budget period already exists for this date range'
        });
      }

      const [period] = await db('budget_periods')
        .insert({
          ...value,
          organization_id: organizationId,
          created_by: req.user.id
        })
        .returning('*');

      res.status(201).json({
        message: 'Budget period created successfully',
        period
      });
    } catch (error) {
      console.error('Budget period creation error:', error);
      res.status(500).json({ error: 'Failed to create budget period' });
    }
  }
);

/**
 * GET /api/budgets/categories
 * List budget categories with hierarchy
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { type, parent_id, include_inactive = false } = req.query;

    let query = db('budget_categories')
      .where('organization_id', organizationId)
      .orderBy('sort_order')
      .orderBy('name');

    if (!include_inactive) {
      query = query.where('active', true);
    }

    if (type) {
      query = query.where('category_type', type);
    }

    if (parent_id !== undefined) {
      if (parent_id === 'null' || parent_id === '') {
        query = query.whereNull('parent_id');
      } else {
        query = query.where('parent_id', parent_id);
      }
    }

    const categories = await query;

    // If no parent_id filter, organize into hierarchy
    if (parent_id === undefined) {
      const categoryMap = {};
      const rootCategories = [];

      // First pass: create map and identify root categories
      categories.forEach(category => {
        categoryMap[category.id] = { ...category, children: [] };
        if (!category.parent_id) {
          rootCategories.push(categoryMap[category.id]);
        }
      });

      // Second pass: build hierarchy
      categories.forEach(category => {
        if (category.parent_id && categoryMap[category.parent_id]) {
          categoryMap[category.parent_id].children.push(categoryMap[category.id]);
        }
      });

      return res.json({ categories: rootCategories });
    }

    res.json({ categories });
  } catch (error) {
    console.error('Budget categories list error:', error);
    res.status(500).json({ error: 'Failed to retrieve budget categories' });
  }
});

/**
 * POST /api/budgets/categories
 * Create a new budget category
 */
router.post('/categories',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = budgetCategorySchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Check for duplicate code
      const existing = await db('budget_categories')
        .where('organization_id', organizationId)
        .where('code', value.code)
        .first();

      if (existing) {
        return res.status(409).json({
          error: 'Duplicate category code',
          message: 'A category with this code already exists'
        });
      }

      // Validate parent category exists if provided
      if (value.parent_id) {
        const parent = await db('budget_categories')
          .where('id', value.parent_id)
          .where('organization_id', organizationId)
          .first();

        if (!parent) {
          return res.status(404).json({
            error: 'Parent category not found'
          });
        }
      }

      const [category] = await db('budget_categories')
        .insert({
          ...value,
          organization_id: organizationId
        })
        .returning('*');

      res.status(201).json({
        message: 'Budget category created successfully',
        category
      });
    } catch (error) {
      console.error('Budget category creation error:', error);
      res.status(500).json({ error: 'Failed to create budget category' });
    }
  }
);

/**
 * GET /api/budgets
 * List budgets with filtering and aggregation
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      period_id,
      category_id,
      status,
      owner_id,
      page = 1,
      limit = 20,
      include_allocations = false,
      include_summary = false
    } = req.query;

    let query = db('budgets as b')
      .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .leftJoin('users as owner', 'b.owner_id', 'owner.id')
      .where('b.organization_id', organizationId)
      .select(
        'b.*',
        'bp.name as period_name',
        'bp.start_date as period_start',
        'bp.end_date as period_end',
        'bc.name as category_name',
        'bc.code as category_code',
        'bc.category_type',
        'bc.color_code as category_color',
        db.raw("COALESCE(owner.first_name || ' ' || owner.last_name, 'Unassigned') as owner_name")
      );

    // Apply filters
    if (period_id) query = query.where('b.budget_period_id', period_id);
    if (category_id) query = query.where('b.category_id', category_id);
    if (status) query = query.where('b.status', status);
    if (owner_id) query = query.where('b.owner_id', owner_id);

    // Calculate available amounts
    query = query.select(
      db.raw('(b.allocated_amount - b.committed_amount - b.actual_spent - b.reserved_amount) as calculated_available')
    );

    const offset = (page - 1) * limit;
    const [budgets, [{ total }]] = await Promise.all([
      query.clone().orderBy('bc.sort_order').orderBy('b.name').limit(limit).offset(offset),
      query.clone().count('b.id as total')
    ]);

    // Include allocations if requested
    if (include_allocations && budgets.length > 0) {
      const budgetIds = budgets.map(b => b.id);
      const allocations = await db('budget_allocations')
        .whereIn('budget_id', budgetIds)
        .orderBy('allocation_year')
        .orderBy('allocation_month');

      const allocationMap = {};
      allocations.forEach(allocation => {
        if (!allocationMap[allocation.budget_id]) {
          allocationMap[allocation.budget_id] = [];
        }
        allocationMap[allocation.budget_id].push(allocation);
      });

      budgets.forEach(budget => {
        budget.allocations = allocationMap[budget.id] || [];
      });
    }

    let summary = null;
    if (include_summary) {
      const summaryQuery = db('budgets as b')
        .where('b.organization_id', organizationId);

      if (period_id) summaryQuery.where('b.budget_period_id', period_id);
      if (category_id) summaryQuery.where('b.category_id', category_id);
      if (status) summaryQuery.where('b.status', status);
      if (owner_id) summaryQuery.where('b.owner_id', owner_id);

      [summary] = await summaryQuery
        .select([
          db.raw('COUNT(*) as total_budgets'),
          db.raw('SUM(allocated_amount) as total_allocated'),
          db.raw('SUM(actual_spent) as total_spent'),
          db.raw('SUM(committed_amount) as total_committed'),
          db.raw('SUM(reserved_amount) as total_reserved'),
          db.raw('SUM(allocated_amount - committed_amount - actual_spent - reserved_amount) as total_available')
        ]);
    }

    res.json({
      budgets,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Budgets list error:', error);
    res.status(500).json({ error: 'Failed to retrieve budgets' });
  }
});

/**
 * POST /api/budgets
 * Create a new budget
 */
router.post('/',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = budgetSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Validate budget period exists and is active
      const period = await db('budget_periods')
        .where('id', value.budget_period_id)
        .where('organization_id', organizationId)
        .first();

      if (!period) {
        return res.status(404).json({
          error: 'Budget period not found'
        });
      }

      // Validate category exists
      const category = await db('budget_categories')
        .where('id', value.category_id)
        .where('organization_id', organizationId)
        .first();

      if (!category) {
        return res.status(404).json({
          error: 'Budget category not found'
        });
      }

      // Check for duplicate budget in same period/category
      const existing = await db('budgets')
        .where('organization_id', organizationId)
        .where('budget_period_id', value.budget_period_id)
        .where('category_id', value.category_id)
        .where('name', value.name)
        .first();

      if (existing) {
        return res.status(409).json({
          error: 'Duplicate budget',
          message: 'A budget with this name already exists for this period and category'
        });
      }

      const [budget] = await db('budgets')
        .insert({
          ...value,
          organization_id: organizationId
        })
        .returning('*');

      // Create monthly allocations if allocated amount > 0
      if (value.allocated_amount > 0) {
        const startDate = new Date(period.start_date);
        const endDate = new Date(period.end_date);
        const months = [];
        
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (current <= endDate) {
          months.push({
            budget_id: budget.id,
            allocation_year: current.getFullYear(),
            allocation_month: current.getMonth() + 1,
            allocated_amount: parseFloat((value.allocated_amount / months.length).toFixed(2))
          });
          current.setMonth(current.getMonth() + 1);
        }

        if (months.length > 0) {
          // Adjust last month to handle rounding
          const totalAllocated = months.reduce((sum, m) => sum + m.allocated_amount, 0);
          const difference = value.allocated_amount - totalAllocated;
          months[months.length - 1].allocated_amount += difference;

          await db('budget_allocations').insert(months);
        }
      }

      // Get the complete budget with relationships
      const fullBudget = await db('budgets as b')
        .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .leftJoin('users as owner', 'b.owner_id', 'owner.id')
        .where('b.id', budget.id)
        .select(
          'b.*',
          'bp.name as period_name',
          'bc.name as category_name',
          'bc.code as category_code',
          db.raw("COALESCE(owner.first_name || ' ' || owner.last_name, 'Unassigned') as owner_name")
        )
        .first();

      res.status(201).json({
        message: 'Budget created successfully',
        budget: fullBudget
      });
    } catch (error) {
      console.error('Budget creation error:', error);
      res.status(500).json({ error: 'Failed to create budget' });
    }
  }
);

/**
 * GET /api/budgets/:id
 * Get detailed budget information
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const budgetId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const budget = await db('budgets as b')
      .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .leftJoin('users as owner', 'b.owner_id', 'owner.id')
      .where('b.id', budgetId)
      .where('b.organization_id', organizationId)
      .select(
        'b.*',
        'bp.name as period_name',
        'bp.start_date as period_start',
        'bp.end_date as period_end',
        'bp.status as period_status',
        'bc.name as category_name',
        'bc.code as category_code',
        'bc.category_type',
        'bc.color_code as category_color',
        db.raw("COALESCE(owner.first_name || ' ' || owner.last_name, 'Unassigned') as owner_name"),
        db.raw('(b.allocated_amount - b.committed_amount - b.actual_spent - b.reserved_amount) as calculated_available')
      )
      .first();

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Get monthly allocations
    const allocations = await db('budget_allocations')
      .where('budget_id', budgetId)
      .orderBy('allocation_year')
      .orderBy('allocation_month');

    // Get recent transactions
    const transactions = await db('financial_transactions')
      .where('budget_id', budgetId)
      .orderBy('transaction_date', 'desc')
      .limit(10);

    // Get budget alerts
    const alerts = await db('budget_alerts')
      .where('budget_id', budgetId)
      .where('is_resolved', false)
      .orderBy('severity', 'desc')
      .orderBy('created_at', 'desc');

    res.json({
      budget,
      allocations,
      recent_transactions: transactions,
      alerts
    });
  } catch (error) {
    console.error('Budget detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve budget details' });
  }
});

/**
 * PUT /api/budgets/:id
 * Update budget
 */
router.put('/:id',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const budgetId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      const { error, value } = budgetSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      // Check if budget exists and user has access
      const existingBudget = await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .first();

      if (!existingBudget) {
        return res.status(404).json({ error: 'Budget not found' });
      }

      // Check if budget is locked
      if (existingBudget.status === 'locked') {
        return res.status(403).json({
          error: 'Budget is locked',
          message: 'Locked budgets cannot be modified'
        });
      }

      const [updatedBudget] = await db('budgets')
        .where('id', budgetId)
        .update({
          ...value,
          updated_at: db.fn.now()
        })
        .returning('*');

      res.json({
        message: 'Budget updated successfully',
        budget: updatedBudget
      });
    } catch (error) {
      console.error('Budget update error:', error);
      res.status(500).json({ error: 'Failed to update budget' });
    }
  }
);

/**
 * POST /api/budgets/:id/allocations
 * Create or update budget allocation
 */
router.post('/:id/allocations',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const budgetId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      const { error, value } = budgetAllocationSchema.validate({
        ...req.body,
        budget_id: budgetId
      });
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      // Verify budget exists and user has access
      const budget = await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .first();

      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }

      const [allocation] = await db('budget_allocations')
        .insert(value)
        .onConflict(['budget_id', 'allocation_year', 'allocation_month'])
        .merge(['allocated_amount', 'notes', 'updated_at'])
        .returning('*');

      res.json({
        message: 'Budget allocation saved successfully',
        allocation
      });
    } catch (error) {
      console.error('Budget allocation error:', error);
      res.status(500).json({ error: 'Failed to save budget allocation' });
    }
  }
);

module.exports = router;