const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/auditTrail');

// Enhanced authorization middleware for budget-specific permissions
const checkBudgetAccess = (action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id || req.user.id;
      const budgetId = req.params.id;

      // Validate required user properties
      if (!userId || !organizationId) {
        return res.status(401).json({ 
          error: 'Invalid authentication',
          message: 'User ID and organization ID are required' 
        });
      }

      // Admin and manager have full access
      if (req.user.roles && (req.user.roles.includes('admin') || req.user.roles.includes('manager'))) {
        return next();
      }

      // For budget-specific operations, check if user has access to that budget
      if (budgetId && action !== 'create') {
        // Validate budget ID format to prevent injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(budgetId)) {
          return res.status(400).json({ 
            error: 'Invalid budget ID format',
            message: 'Budget ID must be a valid UUID' 
          });
        }

        const budget = await db('budgets')
          .where('id', budgetId)
          .where('organization_id', organizationId)
          .first();

        if (!budget) {
          return res.status(404).json({ 
            error: 'Budget not found',
            message: 'Budget does not exist or you do not have access to it'
          });
        }

        // Check budget status for certain actions
        if (['update', 'delete'].includes(action) && budget.status === 'locked') {
          return res.status(403).json({
            error: 'Budget locked',
            message: 'Cannot perform this action on a locked budget'
          });
        }

        // Check if user is the budget owner
        if (budget.owner_id === userId) {
          return next();
        }

        // Check if user has specific budget permissions
        const permission = await db('user_budget_permissions')
          .where('user_id', userId)
          .where('budget_id', budgetId)
          .where('permission_type', action)
          .where('is_active', true)
          .first();

        if (!permission) {
          // Log security event for audit
          console.warn(`Unauthorized budget access attempt: User ${userId} tried to ${action} budget ${budgetId}`);
          
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            message: `You don't have ${action} permission for this budget`
          });
        }
      }

      next();
    } catch (error) {
      console.error('Budget authorization error:', error);
      res.status(500).json({ 
        error: 'Authorization check failed',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

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

    // Validate and sanitize status parameter to prevent SQL injection
    if (status) {
      const validStatuses = ['draft', 'active', 'closed', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status parameter' });
      }
      query = query.where('status', status);
    }

    const offset = (page - 1) * limit;
    const [periods, [{ total }]] = await Promise.all([
      query.clone().limit(limit).offset(offset),
      db('budget_periods').where('organization_id', organizationId).count('id as total')
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

      // Use transaction for budget period creation
      const [period] = await db.transaction(async (trx) => {
        return await trx('budget_periods')
          .insert({
            ...value,
            organization_id: organizationId,
            created_by: req.user.id
          })
          .returning('*');
      });

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

    // Validate and sanitize type parameter to prevent SQL injection
    if (type) {
      const validTypes = ['revenue', 'operating_expenses', 'payroll', 'equipment', 'facilities', 'travel', 'marketing', 'admin', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid category type parameter' });
      }
      query = query.where('category_type', type);
    }

    // Validate and sanitize parent_id parameter to prevent SQL injection
    if (parent_id !== undefined) {
      if (parent_id === 'null' || parent_id === '') {
        query = query.whereNull('parent_id');
      } else {
        // Validate UUID format to prevent SQL injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(parent_id)) {
          return res.status(400).json({ error: 'Invalid parent_id format' });
        }
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

      // Use transaction for budget category creation
      const [category] = await db.transaction(async (trx) => {
        return await trx('budget_categories')
          .insert({
            ...value,
            organization_id: organizationId
          })
          .returning('*');
      });

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
        db.raw('COALESCE(owner.email, \'Unassigned\') as owner_name')
      );

    // Apply filters with validation to prevent SQL injection
    if (period_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(period_id)) {
        return res.status(400).json({ error: 'Invalid period_id format' });
      }
      query = query.where('b.budget_period_id', period_id);
    }
    if (category_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(category_id)) {
        return res.status(400).json({ error: 'Invalid category_id format' });
      }
      query = query.where('b.category_id', category_id);
    }
    if (status) {
      const validStatuses = ['draft', 'approved', 'active', 'locked', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status parameter' });
      }
      query = query.where('b.status', status);
    }
    if (owner_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(owner_id)) {
        return res.status(400).json({ error: 'Invalid owner_id format' });
      }
      query = query.where('b.owner_id', owner_id);
    }

    // Calculate available amounts
    query = query.select(
      db.raw('(b.allocated_amount - b.committed_amount - b.actual_spent - b.reserved_amount) as calculated_available')
    );

    const offset = (page - 1) * limit;
    
    // Create separate count query without the complex SELECT
    let countQuery = db('budgets as b')
      .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .leftJoin('users as owner', 'b.owner_id', 'owner.id')
      .where('b.organization_id', organizationId);

    // Apply same validated filters to count query
    if (period_id) {
      countQuery = countQuery.where('b.budget_period_id', period_id);
    }
    if (category_id) {
      countQuery = countQuery.where('b.category_id', category_id);
    }
    if (status) {
      countQuery = countQuery.where('b.status', status);
    }
    if (owner_id) {
      countQuery = countQuery.where('b.owner_id', owner_id);
    }
    
    const [budgets, [{ total }]] = await Promise.all([
      query.clone().orderBy('bc.sort_order').orderBy('b.name').limit(limit).offset(offset),
      countQuery.count('b.id as total')
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

      // Apply same validated filters to summary query
      if (period_id) {
        summaryQuery.where('b.budget_period_id', period_id);
      }
      if (category_id) {
        summaryQuery.where('b.category_id', category_id);
      }
      if (status) {
        summaryQuery.where('b.status', status);
      }
      if (owner_id) {
        summaryQuery.where('b.owner_id', owner_id);
      }

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

      // Use transaction for budget creation and allocation setup
      const [budget] = await db.transaction(async (trx) => {
        const [newBudget] = await trx('budgets')
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
              budget_id: newBudget.id,
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

            await trx('budget_allocations').insert(months);
          }
        }

        return [newBudget];
      });

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
          db.raw('COALESCE(owner.email, \'Unassigned\') as owner_name')
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
router.get('/:id', authenticateToken, checkBudgetAccess('read'), async (req, res) => {
  try {
    const budgetId = req.params.id;
    
    // Validate budget ID format to prevent SQL injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(budgetId)) {
      return res.status(400).json({ error: 'Invalid budget ID format' });
    }
    
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
        db.raw('COALESCE(owner.email, \'Unassigned\') as owner_name'),
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
  checkBudgetAccess('update'),
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

      // Use transaction for budget updates
      const [updatedBudget] = await db.transaction(async (trx) => {
        // Check if allocation amount changed and recalculate available amount
        const originalBudget = await trx('budgets')
          .where('id', budgetId)
          .first();

        const updateData = {
          ...value,
          updated_at: trx.fn.now()
        };

        // Recalculate available amount if financial fields changed
        if (value.allocated_amount !== undefined ||
            value.committed_amount !== undefined ||
            value.actual_spent !== undefined ||
            value.reserved_amount !== undefined) {
          
          const allocated = value.allocated_amount ?? originalBudget.allocated_amount;
          const committed = value.committed_amount ?? originalBudget.committed_amount;
          const spent = value.actual_spent ?? originalBudget.actual_spent;
          const reserved = value.reserved_amount ?? originalBudget.reserved_amount;
          
          // Remove the redundant available_amount field - it's calculated
          delete updateData.available_amount;
        }

        return await trx('budgets')
          .where('id', budgetId)
          .update(updateData)
          .returning('*');
      });

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
  checkBudgetAccess('update'),
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

      // Use transaction for budget allocation updates
      const [allocation] = await db.transaction(async (trx) => {
        // Update or insert allocation
        const [result] = await trx('budget_allocations')
          .insert(value)
          .onConflict(['budget_id', 'allocation_year', 'allocation_month'])
          .merge(['allocated_amount', 'notes', 'updated_at'])
          .returning('*');

        // Update budget totals based on allocation changes
        const totalAllocations = await trx('budget_allocations')
          .where('budget_id', budgetId)
          .sum('allocated_amount as total');

        const newTotal = totalAllocations[0]?.total || 0;

        await trx('budgets')
          .where('id', budgetId)
          .update({
            allocated_amount: newTotal,
            updated_at: trx.fn.now()
          });

        return result;
      });

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

/**
 * DELETE /api/budgets/periods/:id
 * Delete budget period with cascade handling
 */
router.delete('/periods/:id',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const periodId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      // Validate period ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(periodId)) {
        return res.status(400).json({ error: 'Invalid period ID format' });
      }

      await db.transaction(async (trx) => {
        // Check if period exists and user has access
        const period = await trx('budget_periods')
          .where('id', periodId)
          .where('organization_id', organizationId)
          .first();

        if (!period) {
          throw new Error('Budget period not found');
        }

        // Check if period has active budgets
        const activeBudgets = await trx('budgets')
          .where('budget_period_id', periodId)
          .whereIn('status', ['active', 'approved'])
          .count('id as count');

        if (parseInt(activeBudgets[0].count) > 0) {
          throw new Error('Cannot delete period with active budgets');
        }

        // Get all budgets in this period for cascade deletion
        const budgetIds = await trx('budgets')
          .where('budget_period_id', periodId)
          .pluck('id');

        if (budgetIds.length > 0) {
          // Delete budget allocations
          await trx('budget_allocations')
            .whereIn('budget_id', budgetIds)
            .del();

          // Delete budget approvals
          await trx('budget_approvals')
            .whereIn('budget_id', budgetIds)
            .del();

          // Delete budgets
          await trx('budgets')
            .where('budget_period_id', periodId)
            .del();
        }

        // Delete the period
        await trx('budget_periods')
          .where('id', periodId)
          .del();
      });

      res.json({
        message: 'Budget period deleted successfully',
        periodId
      });
    } catch (error) {
      console.error('Budget period deletion error:', error);
      if (error.message === 'Budget period not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Cannot delete period with active budgets') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete budget period' });
    }
  }
);

/**
 * DELETE /api/budgets/categories/:id
 * Delete budget category with cascade handling
 */
router.delete('/categories/:id',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const categoryId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      // Validate category ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(categoryId)) {
        return res.status(400).json({ error: 'Invalid category ID format' });
      }

      await db.transaction(async (trx) => {
        // Check if category exists and user has access
        const category = await trx('budget_categories')
          .where('id', categoryId)
          .where('organization_id', organizationId)
          .first();

        if (!category) {
          throw new Error('Budget category not found');
        }

        // Check if category has child categories
        const childCategories = await trx('budget_categories')
          .where('parent_id', categoryId)
          .count('id as count');

        if (parseInt(childCategories[0].count) > 0) {
          throw new Error('Cannot delete category with child categories');
        }

        // Check if category has budgets
        const budgetsCount = await trx('budgets')
          .where('category_id', categoryId)
          .count('id as count');

        if (parseInt(budgetsCount[0].count) > 0) {
          throw new Error('Cannot delete category with existing budgets');
        }

        // Delete the category
        await trx('budget_categories')
          .where('id', categoryId)
          .del();
      });

      res.json({
        message: 'Budget category deleted successfully',
        categoryId
      });
    } catch (error) {
      console.error('Budget category deletion error:', error);
      if (error.message === 'Budget category not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Cannot delete category')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete budget category' });
    }
  }
);

/**
 * DELETE /api/budgets/:id
 * Delete budget with cascade handling
 */
router.delete('/:id',
  authenticateToken,
  checkBudgetAccess('delete'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const budgetId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      // Validate budget ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(budgetId)) {
        return res.status(400).json({ error: 'Invalid budget ID format' });
      }

      await db.transaction(async (trx) => {
        // Check if budget exists and user has access
        const budget = await trx('budgets')
          .where('id', budgetId)
          .where('organization_id', organizationId)
          .first();

        if (!budget) {
          throw new Error('Budget not found');
        }

        // Check if budget is locked
        if (budget.status === 'locked') {
          throw new Error('Cannot delete locked budget');
        }

        // Check if budget has actual spending
        if (parseFloat(budget.actual_spent) > 0) {
          throw new Error('Cannot delete budget with actual spending');
        }

        // Check if budget has financial transactions
        const transactionCount = await trx('financial_transactions')
          .where('budget_id', budgetId)
          .count('id as count');

        if (parseInt(transactionCount[0].count) > 0) {
          throw new Error('Cannot delete budget with financial transactions');
        }

        // Delete related records in order
        // Delete budget allocations
        await trx('budget_allocations')
          .where('budget_id', budgetId)
          .del();

        // Delete budget approvals
        await trx('budget_approvals')
          .where('budget_id', budgetId)
          .del();

        // Delete budget alerts
        await trx('budget_alerts')
          .where('budget_id', budgetId)
          .del();

        // Delete user budget permissions
        await trx('user_budget_permissions')
          .where('budget_id', budgetId)
          .del();

        // Delete the budget
        await trx('budgets')
          .where('id', budgetId)
          .del();
      });

      res.json({
        message: 'Budget deleted successfully',
        budgetId
      });
    } catch (error) {
      console.error('Budget deletion error:', error);
      if (error.message === 'Budget not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Cannot delete')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete budget' });
    }
  }
);

module.exports = router;