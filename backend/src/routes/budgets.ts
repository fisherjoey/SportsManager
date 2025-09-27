/**
 * Budget Management Routes (TypeScript)
 * Comprehensive budget management endpoints with enhanced type safety
 */

import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import db from '../config/database';
import {
  authenticateToken
} from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { auditMiddleware } from '../middleware/auditTrail';
import type {
  BudgetPeriod,
  BudgetCategory,
  Budget,
  BudgetAllocation,
  CreateBudgetPeriodRequest,
  CreateBudgetCategoryRequest,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  CreateBudgetAllocationRequest,
  BudgetQueryFilters,
  BudgetPeriodQueryFilters,
  BudgetCategoryQueryFilters,
  BudgetPeriodsResponse,
  BudgetCategoriesResponse,
  BudgetsResponse,
  BudgetCategoryType,
  BudgetPeriodModel,
  BudgetCategoryModel,
  BudgetModel,
  BudgetAllocationModel
} from '../types/budget.types';

const router = express.Router();

// Enhanced authorization middleware for budget-specific permissions
const checkBudgetAccess = (action: 'read' | 'update' | 'delete' | 'create') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const organizationId = req.user?.organization_id || req.user?.id;
      const budgetId = req.params.id;

      // Validate required user properties
      if (!userId || !organizationId) {
        res.status(401).json({
          error: 'Invalid authentication',
          message: 'User ID and organization ID are required'
        });
        return;
      }

      // Admin and manager have full access
      if (req.user?.roles && (req.user.roles.includes('admin') || req.user.roles.includes('manager'))) {
        return next();
      }

      // For budget-specific operations, check if user has access to that budget
      if (budgetId && action !== 'create') {
        // Validate budget ID format to prevent injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(budgetId)) {
          res.status(400).json({
            error: 'Invalid budget ID format',
            message: 'Budget ID must be a valid UUID'
          });
          return;
        }

        const budget = await db('budgets')
          .where('id', budgetId)
          .where('organization_id', organizationId)
          .first();

        if (!budget) {
          res.status(404).json({
            error: 'Budget not found',
            message: 'Budget does not exist or you do not have access to it'
          });
          return;
        }

        // Check budget status for certain actions
        if (['update', 'delete'].includes(action) && budget.status === 'locked') {
          res.status(403).json({
            error: 'Budget locked',
            message: 'Cannot perform this action on a locked budget'
          });
          return;
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

          res.status(403).json({
            error: 'Insufficient permissions',
            message: `You don't have ${action} permission for this budget`
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Budget access check error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify budget access'
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
    'marketing',
    'travel',
    'utilities',
    'insurance',
    'professional_services',
    'supplies',
    'training',
    'other'
  ).required()
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
router.get('/periods',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'view:list',
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organization_id || req.user?.id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const filters: BudgetPeriodQueryFilters = {
        is_template: req.query.is_template === 'true' ? true : req.query.is_template === 'false' ? false : undefined,
        active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
        search: req.query.search as string,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      // Build base query
      let countQuery = db('budget_periods')
        .where('organization_id', organizationId)
        .count('* as count');

      let query = db('budget_periods')
        .where('organization_id', organizationId)
        .select('*');

      // Apply filters
      if (filters.is_template !== undefined) {
        countQuery = countQuery.where('is_template', filters.is_template);
        query = query.where('is_template', filters.is_template);
      }

      if (filters.active !== undefined) {
        const now = new Date();
        if (filters.active) {
          countQuery = countQuery.where('start_date', '<=', now).where('end_date', '>=', now);
          query = query.where('start_date', '<=', now).where('end_date', '>=', now);
        } else {
          countQuery = countQuery.where(function(this: any) {
            this.where('end_date', '<', now).orWhere('start_date', '>', now);
          });
          query = query.where(function(this: any) {
            this.where('end_date', '<', now).orWhere('start_date', '>', now);
          });
        }
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        countQuery = countQuery.where(function(this: any) {
          this.where('name', 'ilike', searchTerm)
              .orWhere('description', 'ilike', searchTerm);
        });
        query = query.where(function(this: any) {
          this.where('name', 'ilike', searchTerm)
              .orWhere('description', 'ilike', searchTerm);
        });
      }

      // Get total count
      const [{ count }] = await countQuery;

      // Apply pagination and sorting
      const periods: BudgetPeriodModel[] = await query
        .orderBy(filters.sort_by, filters.sort_order)
        .limit(limit)
        .offset(offset);

      const response: BudgetPeriodsResponse = {
        periods: periods.map(period => ({
          ...period,
          start_date: new Date(period.start_date),
          end_date: new Date(period.end_date),
          created_at: new Date(period.created_at),
          updated_at: new Date(period.updated_at)
        })),
        total: parseInt(count),
        page,
        limit
      };

      res.json(response);
    } catch (error) {
      console.error('Budget periods fetch error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch budget periods'
      });
    }
  }
);

/**
 * POST /api/budgets/periods
 * Create a new budget period
 */
router.post('/periods',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'update',
  }),
  auditMiddleware('budget_period_create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = budgetPeriodSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
        return;
      }

      const organizationId = req.user?.organization_id || req.user?.id;
      const periodData: CreateBudgetPeriodRequest = value;

      // Check for overlapping periods
      const overlappingPeriods = await db('budget_periods')
        .where('organization_id', organizationId)
        .where(function(this: any) {
          this.where(function(this: any) {
            this.where('start_date', '<=', periodData.start_date)
                .andWhere('end_date', '>=', periodData.start_date);
          }).orWhere(function(this: any) {
            this.where('start_date', '<=', periodData.end_date)
                .andWhere('end_date', '>=', periodData.end_date);
          }).orWhere(function(this: any) {
            this.where('start_date', '>=', periodData.start_date)
                .andWhere('end_date', '<=', periodData.end_date);
          });
        });

      if (overlappingPeriods.length > 0) {
        res.status(409).json({
          error: 'Overlapping period',
          message: 'Budget period overlaps with existing period',
          conflicting_periods: overlappingPeriods
        });
        return;
      }

      const [newPeriod]: BudgetPeriodModel[] = await db('budget_periods')
        .insert({
          ...periodData,
          organization_id: organizationId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      const response: BudgetPeriod = {
        ...newPeriod,
        start_date: new Date(newPeriod.start_date),
        end_date: new Date(newPeriod.end_date),
        created_at: new Date(newPeriod.created_at),
        updated_at: new Date(newPeriod.updated_at)
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Budget period creation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create budget period'
      });
    }
  }
);

/**
 * GET /api/budgets/categories
 * List budget categories
 */
router.get('/categories',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'view:list',
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organization_id || req.user?.id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const filters: BudgetCategoryQueryFilters = {
        parent_id: req.query.parent_id as string,
        category_type: req.query.category_type as BudgetCategoryType,
        search: req.query.search as string,
        sort_by: req.query.sort_by as string || 'name',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'asc'
      };

      // Build base query
      let countQuery = db('budget_categories')
        .where('organization_id', organizationId)
        .count('* as count');

      let query = db('budget_categories')
        .where('organization_id', organizationId)
        .select('*');

      // Apply filters
      if (filters.parent_id) {
        countQuery = countQuery.where('parent_id', filters.parent_id);
        query = query.where('parent_id', filters.parent_id);
      }

      if (filters.category_type) {
        countQuery = countQuery.where('category_type', filters.category_type);
        query = query.where('category_type', filters.category_type);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        countQuery = countQuery.where(function(this: any) {
          this.where('name', 'ilike', searchTerm)
              .orWhere('code', 'ilike', searchTerm)
              .orWhere('description', 'ilike', searchTerm);
        });
        query = query.where(function(this: any) {
          this.where('name', 'ilike', searchTerm)
              .orWhere('code', 'ilike', searchTerm)
              .orWhere('description', 'ilike', searchTerm);
        });
      }

      // Get total count
      const [{ count }] = await countQuery;

      // Apply pagination and sorting
      const categories: BudgetCategoryModel[] = await query
        .orderBy(filters.sort_by, filters.sort_order)
        .limit(limit)
        .offset(offset);

      const response: BudgetCategoriesResponse = {
        categories: categories.map(category => ({
          ...category,
          category_type: category.category_type as BudgetCategoryType,
          created_at: new Date(category.created_at),
          updated_at: new Date(category.updated_at)
        })),
        total: parseInt(count),
        page,
        limit
      };

      res.json(response);
    } catch (error) {
      console.error('Budget categories fetch error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch budget categories'
      });
    }
  }
);

/**
 * POST /api/budgets/categories
 * Create a new budget category
 */
router.post('/categories',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'update',
  }),
  auditMiddleware('budget_category_create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = budgetCategorySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
        return;
      }

      const organizationId = req.user?.organization_id || req.user?.id;
      const categoryData: CreateBudgetCategoryRequest = value;

      // Check for duplicate code
      const existingCategory = await db('budget_categories')
        .where('organization_id', organizationId)
        .where('code', categoryData.code)
        .first();

      if (existingCategory) {
        res.status(409).json({
          error: 'Category code already exists',
          message: `A category with code '${categoryData.code}' already exists`
        });
        return;
      }

      // Validate parent category if specified
      if (categoryData.parent_id) {
        const parentCategory = await db('budget_categories')
          .where('id', categoryData.parent_id)
          .where('organization_id', organizationId)
          .first();

        if (!parentCategory) {
          res.status(400).json({
            error: 'Invalid parent category',
            message: 'Specified parent category does not exist'
          });
          return;
        }
      }

      const [newCategory]: BudgetCategoryModel[] = await db('budget_categories')
        .insert({
          ...categoryData,
          organization_id: organizationId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      const response: BudgetCategory = {
        ...newCategory,
        category_type: newCategory.category_type as BudgetCategoryType,
        created_at: new Date(newCategory.created_at),
        updated_at: new Date(newCategory.updated_at)
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Budget category creation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create budget category'
      });
    }
  }
);

/**
 * GET /api/budgets
 * List budgets with filtering and pagination
 */
router.get('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'view:list',
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organization_id || req.user?.id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const filters: BudgetQueryFilters = {
        period_id: req.query.period_id as string,
        category_id: req.query.category_id as string,
        owner_id: req.query.owner_id as string,
        search: req.query.search as string,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      // Build base query
      let countQuery = db('budgets')
        .where('organization_id', organizationId)
        .count('* as count');

      let query = db('budgets')
        .where('organization_id', organizationId)
        .select('budgets.*');

      // Apply filters
      if (filters.period_id) {
        countQuery = countQuery.where('budget_period_id', filters.period_id);
        query = query.where('budget_period_id', filters.period_id);
      }

      if (filters.category_id) {
        countQuery = countQuery.where('category_id', filters.category_id);
        query = query.where('category_id', filters.category_id);
      }

      if (filters.owner_id) {
        countQuery = countQuery.where('owner_id', filters.owner_id);
        query = query.where('owner_id', filters.owner_id);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        countQuery = countQuery.where(function(this: any) {
          this.where('name', 'ilike', searchTerm)
              .orWhere('description', 'ilike', searchTerm);
        });
        query = query.where(function(this: any) {
          this.where('name', 'ilike', searchTerm)
              .orWhere('description', 'ilike', searchTerm);
        });
      }

      // Get total count
      const [{ count }] = await countQuery;

      // Apply pagination and sorting
      const budgets: BudgetModel[] = await query
        .orderBy(`budgets.${filters.sort_by}`, filters.sort_order)
        .limit(limit)
        .offset(offset);

      const response: BudgetsResponse = {
        budgets: budgets.map(budget => ({
          ...budget,
          created_at: new Date(budget.created_at),
          updated_at: new Date(budget.updated_at)
        })),
        total: parseInt(count),
        page,
        limit
      };

      res.json(response);
    } catch (error) {
      console.error('Budgets fetch error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch budgets'
      });
    }
  }
);

/**
 * POST /api/budgets
 * Create a new budget
 */
router.post('/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'update',
  }),
  auditMiddleware('budget_create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = budgetSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
        return;
      }

      const organizationId = req.user?.organization_id || req.user?.id;
      const budgetData: CreateBudgetRequest = value;

      // Validate budget period exists and is active
      const budgetPeriod = await db('budget_periods')
        .where('id', budgetData.budget_period_id)
        .where('organization_id', organizationId)
        .first();

      if (!budgetPeriod) {
        res.status(400).json({
          error: 'Invalid budget period',
          message: 'Specified budget period does not exist'
        });
        return;
      }

      // Validate budget category exists
      const budgetCategory = await db('budget_categories')
        .where('id', budgetData.category_id)
        .where('organization_id', organizationId)
        .first();

      if (!budgetCategory) {
        res.status(400).json({
          error: 'Invalid budget category',
          message: 'Specified budget category does not exist'
        });
        return;
      }

      // Check for duplicate budget in the same period and category
      const existingBudget = await db('budgets')
        .where('budget_period_id', budgetData.budget_period_id)
        .where('category_id', budgetData.category_id)
        .where('organization_id', organizationId)
        .first();

      if (existingBudget) {
        res.status(409).json({
          error: 'Duplicate budget',
          message: 'A budget already exists for this period and category combination'
        });
        return;
      }

      const [newBudget]: BudgetModel[] = await db('budgets')
        .insert({
          ...budgetData,
          organization_id: organizationId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      const response: Budget = {
        ...newBudget,
        created_at: new Date(newBudget.created_at),
        updated_at: new Date(newBudget.updated_at)
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Budget creation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create budget'
      });
    }
  }
);

/**
 * GET /api/budgets/:id
 * Get a specific budget
 */
router.get('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'view:list',
  }),
  checkBudgetAccess('read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const budgetId = req.params.id;
      const organizationId = req.user?.organization_id || req.user?.id;

      const budget: BudgetModel = await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .first();

      if (!budget) {
        res.status(404).json({
          error: 'Budget not found',
          message: 'Budget does not exist or you do not have access to it'
        });
        return;
      }

      const response: Budget = {
        ...budget,
        created_at: new Date(budget.created_at),
        updated_at: new Date(budget.updated_at)
      };

      res.json(response);
    } catch (error) {
      console.error('Budget fetch error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch budget'
      });
    }
  }
);

/**
 * PUT /api/budgets/:id
 * Update a budget
 */
router.put('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'update',
  }),
  checkBudgetAccess('update'),
  auditMiddleware('budget_update'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = budgetSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
        return;
      }

      const budgetId = req.params.id;
      const organizationId = req.user?.organization_id || req.user?.id;
      const updateData: UpdateBudgetRequest = value;

      // Check if budget exists and user has access
      const existingBudget = await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .first();

      if (!existingBudget) {
        res.status(404).json({
          error: 'Budget not found',
          message: 'Budget does not exist or you do not have access to it'
        });
        return;
      }

      const [updatedBudget]: BudgetModel[] = await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning('*');

      const response: Budget = {
        ...updatedBudget,
        created_at: new Date(updatedBudget.created_at),
        updated_at: new Date(updatedBudget.updated_at)
      };

      res.json(response);
    } catch (error) {
      console.error('Budget update error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update budget'
      });
    }
  }
);

/**
 * POST /api/budgets/:id/allocations
 * Create budget allocation
 */
router.post('/:id/allocations',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'update',
  }),
  checkBudgetAccess('update'),
  auditMiddleware('budget_allocation_create'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const budgetId = req.params.id;
      const allocationData = {
        ...req.body,
        budget_id: budgetId
      };

      const { error, value } = budgetAllocationSchema.validate(allocationData);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
        return;
      }

      const organizationId = req.user?.organization_id || req.user?.id;

      // Verify budget exists
      const budget = await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .first();

      if (!budget) {
        res.status(404).json({
          error: 'Budget not found',
          message: 'Budget does not exist or you do not have access to it'
        });
        return;
      }

      const validatedData: CreateBudgetAllocationRequest = value;

      const [newAllocation]: BudgetAllocationModel[] = await db('budget_allocations')
        .insert({
          ...validatedData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      const response: BudgetAllocation = {
        ...newAllocation,
        created_at: new Date(newAllocation.created_at),
        updated_at: new Date(newAllocation.updated_at)
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Budget allocation creation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create budget allocation'
      });
    }
  }
);

/**
 * DELETE /api/budgets/periods/:id
 * Delete a budget period
 */
router.delete('/periods/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'delete',
  }),
  auditMiddleware('budget_period_delete'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const periodId = req.params.id;
      const organizationId = req.user?.organization_id || req.user?.id;

      // Check if period exists
      const period = await db('budget_periods')
        .where('id', periodId)
        .where('organization_id', organizationId)
        .first();

      if (!period) {
        res.status(404).json({
          error: 'Period not found',
          message: 'Budget period does not exist'
        });
        return;
      }

      // Check for associated budgets
      const associatedBudgets = await db('budgets')
        .where('budget_period_id', periodId)
        .select('id');

      if (associatedBudgets.length > 0) {
        res.status(409).json({
          error: 'Period has associated budgets',
          message: 'Cannot delete period with existing budgets',
          budget_count: associatedBudgets.length
        });
        return;
      }

      await db('budget_periods')
        .where('id', periodId)
        .where('organization_id', organizationId)
        .delete();

      res.json({
        message: 'Budget period deleted successfully',
        deleted_id: periodId
      });
    } catch (error) {
      console.error('Budget period deletion error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete budget period'
      });
    }
  }
);

/**
 * DELETE /api/budgets/categories/:id
 * Delete a budget category
 */
router.delete('/categories/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'delete',
  }),
  auditMiddleware('budget_category_delete'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryId = req.params.id;
      const organizationId = req.user?.organization_id || req.user?.id;

      // Check if category exists
      const category = await db('budget_categories')
        .where('id', categoryId)
        .where('organization_id', organizationId)
        .first();

      if (!category) {
        res.status(404).json({
          error: 'Category not found',
          message: 'Budget category does not exist'
        });
        return;
      }

      // Check for associated budgets
      const associatedBudgets = await db('budgets')
        .where('category_id', categoryId)
        .select('id');

      if (associatedBudgets.length > 0) {
        res.status(409).json({
          error: 'Category has associated budgets',
          message: 'Cannot delete category with existing budgets',
          budget_count: associatedBudgets.length
        });
        return;
      }

      await db('budget_categories')
        .where('id', categoryId)
        .where('organization_id', organizationId)
        .delete();

      res.json({
        message: 'Budget category deleted successfully',
        deleted_id: categoryId
      });
    } catch (error) {
      console.error('Budget category deletion error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete budget category'
      });
    }
  }
);

/**
 * DELETE /api/budgets/:id
 * Delete a budget
 */
router.delete('/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'budget',
    action: 'delete',
  }),
  checkBudgetAccess('delete'),
  auditMiddleware('budget_delete'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const budgetId = req.params.id;
      const organizationId = req.user?.organization_id || req.user?.id;

      // Check if budget exists
      const budget = await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .first();

      if (!budget) {
        res.status(404).json({
          error: 'Budget not found',
          message: 'Budget does not exist'
        });
        return;
      }

      // Check for allocations
      const allocations = await db('budget_allocations')
        .where('budget_id', budgetId)
        .select('id');

      if (allocations.length > 0) {
        res.status(409).json({
          error: 'Budget has allocations',
          message: 'Cannot delete budget with existing allocations',
          allocation_count: allocations.length
        });
        return;
      }

      await db('budgets')
        .where('id', budgetId)
        .where('organization_id', organizationId)
        .delete();

      res.json({
        message: 'Budget deleted successfully',
        deleted_id: budgetId
      });
    } catch (error) {
      console.error('Budget deletion error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete budget'
      });
    }
  }
);

export default router;