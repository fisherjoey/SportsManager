/**
 * @fileoverview Financial Transactions API Routes
 * @description Comprehensive financial transaction management with TypeScript safety
 */

import express, { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { auditMiddleware } from '../middleware/auditTrail';
import {
  AuthenticatedRequest,
  TransactionCreateRequest,
  VendorCreateRequest,
  TransactionQuery,
  VendorQuery,
  DashboardQuery,
  StatusUpdateRequest,
  TransactionListResponse,
  TransactionCreateResponse,
  TransactionDetailResponse,
  VendorListResponse,
  VendorCreateResponse,
  StatusUpdateResponse,
  DashboardResponse,
  ErrorResponse,
  FinancialTransaction,
  TransactionWithDetails,
  Vendor,
  Budget,
  JournalEntry,
  isValidTransactionType,
  isValidTransactionStatus,
  isValidStatusTransition,
  parseMonetaryAmount,
  calculateAvailableBudget,
  generateTransactionPrefix,
  parseQueryParams,
  validateTransactionData,
  validateVendorData,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  STATUS_TRANSITIONS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
} from '../types/financial-transactions';

const router = express.Router();

// Validation schemas
const transactionSchema = Joi.object({
  budget_id: Joi.string().uuid().optional(),
  expense_data_id: Joi.string().uuid().optional(),
  payroll_assignment_id: Joi.string().uuid().optional(),
  transaction_type: Joi.string().valid(...TRANSACTION_TYPES).required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().min(1).max(500).required(),
  transaction_date: Joi.date().required(),
  reference_number: Joi.string().max(100).optional(),
  vendor_id: Joi.string().uuid().optional(),
  debit_account_id: Joi.string().uuid().optional(),
  credit_account_id: Joi.string().uuid().optional(),
  metadata: Joi.object().optional()
});

const vendorSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  contact_name: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  address: Joi.string().max(500).optional(),
  tax_id: Joi.string().max(50).optional(),
  payment_terms: Joi.string().max(100).optional(),
  payment_methods: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  transaction_type: Joi.string().valid(...TRANSACTION_TYPES).optional(),
  status: Joi.string().valid(...TRANSACTION_STATUSES).optional(),
  budget_id: Joi.string().uuid().optional(),
  vendor_id: Joi.string().uuid().optional(),
  date_from: Joi.date().optional(),
  date_to: Joi.date().optional(),
  min_amount: Joi.number().min(0).optional(),
  max_amount: Joi.number().min(0).optional(),
  search: Joi.string().max(100).optional()
});

/**
 * Generate unique transaction number
 */
async function generateTransactionNumber(organizationId: number, transactionType: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = generateTransactionPrefix(transactionType);

  const lastTransaction = await db('financial_transactions')
    .where('organization_id', organizationId)
    .where('transaction_number', 'like', `${prefix}-${year}-%`)
    .orderBy('transaction_number', 'desc')
    .first() as any;

  let sequence = 1;
  if (lastTransaction) {
    const lastNumber = lastTransaction.transaction_number.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
}

/**
 * GET /api/financial/transactions
 * List financial transactions with filtering
 * Requires: finance:read permission
 */
router.get('/transactions',
  authenticateToken,
  requireCerbosPermission({
    resource: 'financial_transaction',
    action: 'view'
  }),
  async (req: AuthenticatedRequest, res: Response<TransactionListResponse | ErrorResponse>) => {
    try {
      const { error, value } = querySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;
      const { page, limit, filters } = parseQueryParams(value);

      let query = db('financial_transactions as ft')
        .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
        .leftJoin('budget_categories as bc', 'b.category_id', 'bc.id')
        .leftJoin('vendors as v', 'ft.vendor_id', 'v.id')
        .leftJoin('users as creator', 'ft.created_by', 'creator.id')
        .where('ft.organization_id', organizationId)
        .select(
          'ft.*',
          'b.name as budget_name',
          'bc.name as category_name',
          'bc.color_code as category_color',
          'v.name as vendor_name',
          db.raw('creator.first_name || \' \' || creator.last_name as created_by_name')
        );

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          switch (key) {
            case 'transaction_type':
            case 'status':
            case 'budget_id':
            case 'vendor_id':
              query = query.where(`ft.${key}`, value);
              break;
            case 'date_from':
              query = query.where('ft.transaction_date', '>=', value);
              break;
            case 'date_to':
              query = query.where('ft.transaction_date', '<=', value);
              break;
            case 'min_amount':
              query = query.where('ft.amount', '>=', value);
              break;
            case 'max_amount':
              query = query.where('ft.amount', '<=', value);
              break;
            case 'search':
              query = query.where(function() {
                this.where('ft.description', 'ilike', `%${value}%`)
                  .orWhere('ft.transaction_number', 'ilike', `%${value}%`)
                  .orWhere('ft.reference_number', 'ilike', `%${value}%`)
                  .orWhere('v.name', 'ilike', `%${value}%`);
              });
              break;
          }
        }
      });

      const offset = (page - 1) * limit;
      const [transactions, countResult] = await Promise.all([
        query.clone().orderBy('ft.transaction_date', 'desc').limit(limit).offset(offset),
        query.clone().count('ft.id as total')
      ]);
      const { total } = (countResult as any)[0];

      // Get summary statistics
      const summary = await db('financial_transactions')
        .where('organization_id', organizationId)
        .modify(qb => {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
              switch (key) {
                case 'transaction_type':
                case 'status':
                case 'budget_id':
                case 'vendor_id':
                  qb.where(key, value);
                  break;
                case 'date_from':
                  qb.where('transaction_date', '>=', value);
                  break;
                case 'date_to':
                  qb.where('transaction_date', '<=', value);
                  break;
              }
            }
          });
        })
        .select([
          db.raw('COUNT(*) as total_transactions'),
          db.raw('SUM(CASE WHEN transaction_type IN (\'revenue\') THEN amount ELSE 0 END) as total_revenue'),
          db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') THEN amount ELSE 0 END) as total_expenses'),
          db.raw('SUM(CASE WHEN status = \'posted\' THEN amount ELSE 0 END) as posted_amount'),
          db.raw('SUM(CASE WHEN status IN (\'draft\', \'pending_approval\') THEN amount ELSE 0 END) as pending_amount')
        ])
        .first();

      res.json({
        transactions: transactions as any as TransactionWithDetails[],
        summary: {
          total_transactions: parseInt((summary as any).total_transactions),
          total_revenue: parseMonetaryAmount((summary as any).total_revenue),
          total_expenses: parseMonetaryAmount((summary as any).total_expenses),
          posted_amount: parseMonetaryAmount((summary as any).posted_amount),
          pending_amount: parseMonetaryAmount((summary as any).pending_amount)
        },
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Financial transactions list error:', error);
      res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
  }
);

/**
 * POST /api/financial/transactions
 * Create a new financial transaction
 * Requires: finance:manage permission
 */
router.post('/transactions',
  authenticateToken,
  requireCerbosPermission({
    resource: 'financial_transaction',
    action: 'manage'
  }),
  auditMiddleware({ logAllRequests: true }),
  async (req: AuthenticatedRequest, res: Response<TransactionCreateResponse | ErrorResponse>) => {
    try {
      const { error, value } = transactionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;
      const transactionData = value as TransactionCreateRequest;

      // Additional validation using type-safe validators
      const validationErrors = validateTransactionData(transactionData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation error',
          details: validationErrors.join(', ')
        });
      }

      // Generate transaction number
      const transactionNumber = await generateTransactionNumber(organizationId, transactionData.transaction_type);

      // Validate budget exists if provided
      if (transactionData.budget_id) {
        const budget = await db('budgets')
          .where('id', transactionData.budget_id)
          .where('organization_id', organizationId)
          .first() as any as Budget | undefined;

        if (!budget) {
          return res.status(404).json({ error: 'Budget not found' });
        }

        // Check if budget has sufficient available funds for expenses
        if (transactionData.transaction_type === 'expense') {
          const availableAmount = calculateAvailableBudget(budget);
          if (transactionData.amount > availableAmount) {
            return res.status(400).json({
              error: 'Insufficient budget',
              message: `Transaction amount ($${transactionData.amount}) exceeds available budget ($${availableAmount})`
            });
          }
        }
      }

      // Validate vendor exists if provided
      if (transactionData.vendor_id) {
        const vendor = await db('vendors')
          .where('id', transactionData.vendor_id)
          .where('organization_id', organizationId)
          .first() as any as Vendor | undefined;

        if (!vendor) {
          return res.status(404).json({ error: 'Vendor not found' });
        }
      }

      const [transaction] = await db('financial_transactions')
        .insert({
          ...transactionData,
          organization_id: organizationId,
          transaction_number: transactionNumber,
          created_by: req.user.id
        } as any)
        .returning('*') as any as FinancialTransaction[];

      // Update budget committed amount if this is an expense
      if (transactionData.budget_id && transactionData.transaction_type === 'expense') {
        await db('budgets')
          .where('id', transactionData.budget_id)
          .increment('committed_amount', transactionData.amount);
      }

      // Get the complete transaction with relationships
      const fullTransaction = await db('financial_transactions as ft')
        .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
        .leftJoin('budget_categories as bc', 'b.category_id', 'bc.id')
        .leftJoin('vendors as v', 'ft.vendor_id', 'v.id')
        .where('ft.id', transaction.id)
        .select(
          'ft.*',
          'b.name as budget_name',
          'bc.name as category_name',
          'v.name as vendor_name'
        )
        .first() as any as TransactionWithDetails;

      res.status(201).json({
        message: 'Financial transaction created successfully',
        transaction: fullTransaction
      });
    } catch (error) {
      console.error('Financial transaction creation error:', error);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }
);

/**
 * GET /api/financial/transactions/:id
 * Get detailed transaction information
 * Requires: finance:read permission
 */
router.get('/transactions/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'financial_transaction',
    action: 'view'
  }),
  async (req: AuthenticatedRequest, res: Response<TransactionDetailResponse | ErrorResponse>) => {
    try {
      const transactionId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      const transaction = await db('financial_transactions as ft')
        .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
        .leftJoin('budget_categories as bc', 'b.category_id', 'bc.id')
        .leftJoin('vendors as v', 'ft.vendor_id', 'v.id')
        .leftJoin('users as creator', 'ft.created_by', 'creator.id')
        .leftJoin('expense_data as ed', 'ft.expense_data_id', 'ed.id')
        .leftJoin('game_assignments as ga', 'ft.payroll_assignment_id', 'ga.id')
        .leftJoin('chart_of_accounts as debit_acc', 'ft.debit_account_id', 'debit_acc.id')
        .leftJoin('chart_of_accounts as credit_acc', 'ft.credit_account_id', 'credit_acc.id')
        .where('ft.id', transactionId)
        .where('ft.organization_id', organizationId)
        .select(
          'ft.*',
          'b.name as budget_name',
          'bc.name as category_name',
          'bc.color_code as category_color',
          'v.name as vendor_name',
          'v.contact_name as vendor_contact',
          db.raw('creator.first_name || \' \' || creator.last_name as created_by_name'),
          'ed.vendor_name as expense_vendor',
          'ga.calculated_wage as payroll_amount',
          'debit_acc.account_name as debit_account_name',
          'credit_acc.account_name as credit_account_name'
        )
        .first() as any as TransactionWithDetails | undefined;

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Get related journal entries if any
      const journalEntries = await db('journal_entries')
        .where('transaction_id', transactionId)
        .orderBy('created_at', 'desc') as any as JournalEntry[];

      res.json({
        transaction,
        journal_entries: journalEntries
      });
    } catch (error) {
      console.error('Transaction detail error:', error);
      res.status(500).json({ error: 'Failed to retrieve transaction details' });
    }
  }
);

/**
 * PUT /api/financial/transactions/:id/status
 * Update transaction status
 * Requires: finance:approve permission
 */
router.put('/transactions/:id/status',
  authenticateToken,
  requireCerbosPermission({
    resource: 'financial_transaction',
    action: 'approve'
  }),
  auditMiddleware({ logAllRequests: true }),
  async (req: AuthenticatedRequest, res: Response<StatusUpdateResponse | ErrorResponse>) => {
    try {
      const transactionId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;
      const { status, notes } = req.body as StatusUpdateRequest;

      if (!isValidTransactionStatus(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          valid: [...TRANSACTION_STATUSES]
        });
      }

      const transaction = await db('financial_transactions')
        .where('id', transactionId)
        .where('organization_id', organizationId)
        .first() as any as FinancialTransaction | undefined;

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Business logic for status transitions
      const currentStatus = transaction.status;
      if (!isValidStatusTransition(currentStatus, status)) {
        return res.status(400).json({
          error: 'Invalid status transition',
          message: `Cannot change status from ${currentStatus} to ${status}`
        });
      }

      const updateData: Partial<FinancialTransaction> = {
        status,
        updated_at: db.fn.now() as any
      };

      if (status === 'posted') {
        updateData.posted_at = db.fn.now() as any;

        // Move from committed to actual spent for expenses
        if (transaction.budget_id && transaction.transaction_type === 'expense') {
          await db('budgets')
            .where('id', transaction.budget_id)
            .increment('actual_spent', parseMonetaryAmount(transaction.amount))
            .decrement('committed_amount', parseMonetaryAmount(transaction.amount));
        }
      }

      if (status === 'cancelled' || status === 'voided') {
        // Remove from budget commitments
        if (transaction.budget_id && transaction.transaction_type === 'expense') {
          const amount = parseMonetaryAmount(transaction.amount);
          if (currentStatus === 'posted') {
            await db('budgets')
              .where('id', transaction.budget_id)
              .decrement('actual_spent', amount);
          } else {
            await db('budgets')
              .where('id', transaction.budget_id)
              .decrement('committed_amount', amount);
          }
        }
      }

      const [updatedTransaction] = await db('financial_transactions')
        .where('id', transactionId)
        .update(updateData as any)
        .returning('*') as any as FinancialTransaction[];

      res.json({
        message: `Transaction ${status} successfully`,
        transaction: updatedTransaction
      });
    } catch (error) {
      console.error('Transaction status update error:', error);
      res.status(500).json({ error: 'Failed to update transaction status' });
    }
  }
);

/**
 * GET /api/financial/vendors
 * List vendors
 * Requires: finance:read permission
 */
router.get('/vendors',
  authenticateToken,
  requireCerbosPermission({
    resource: 'financial_transaction',
    action: 'view'
  }),
  async (req: AuthenticatedRequest, res: Response<VendorListResponse | ErrorResponse>) => {
    try {
      const organizationId = req.user.organization_id || req.user.id;
      const { active = 'true', search, page = '1', limit = '20' } = req.query as VendorQuery;

      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), MAX_PAGE_SIZE);

      let query = db('vendors')
        .where('organization_id', organizationId)
        .orderBy('name');

      if (active !== undefined) {
        query = query.where('active', active === 'true');
      }

      if (search) {
        query = query.where(function() {
          this.where('name', 'ilike', `%${search}%`)
            .orWhere('contact_name', 'ilike', `%${search}%`)
            .orWhere('email', 'ilike', `%${search}%`);
        });
      }

      const offset = (pageNum - 1) * limitNum;
      const [vendors, countResult] = await Promise.all([
        query.clone().limit(limitNum).offset(offset),
        query.clone().count('id as total')
      ]);
      const { total } = (countResult as any)[0];

      res.json({
        vendors: vendors as any as Vendor[],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(total),
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Vendors list error:', error);
      res.status(500).json({ error: 'Failed to retrieve vendors' });
    }
  }
);

/**
 * POST /api/financial/vendors
 * Create a new vendor
 * Requires: finance:manage permission
 */
router.post('/vendors',
  authenticateToken,
  requireCerbosPermission({
    resource: 'financial_transaction',
    action: 'manage'
  }),
  auditMiddleware({ logAllRequests: true }),
  async (req: AuthenticatedRequest, res: Response<VendorCreateResponse | ErrorResponse>) => {
    try {
      const { error, value } = vendorSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;
      const vendorData = value as VendorCreateRequest;

      // Additional validation using type-safe validators
      const validationErrors = validateVendorData(vendorData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation error',
          details: validationErrors.join(', ')
        });
      }

      // Check for duplicate vendor name
      const existing = await db('vendors')
        .where('organization_id', organizationId)
        .where('name', vendorData.name)
        .first() as any as Vendor | undefined;

      if (existing) {
        return res.status(409).json({
          error: 'Duplicate vendor name',
          message: 'A vendor with this name already exists'
        });
      }

      const [vendor] = await db('vendors')
        .insert({
          ...vendorData,
          organization_id: organizationId
        } as any)
        .returning('*') as any as Vendor[];

      res.status(201).json({
        message: 'Vendor created successfully',
        vendor
      });
    } catch (error) {
      console.error('Vendor creation error:', error);
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  }
);

/**
 * GET /api/financial/dashboard
 * Get financial dashboard data
 * Requires: finance:read permission
 */
router.get('/dashboard',
  authenticateToken,
  requireCerbosPermission({
    resource: 'financial_transaction',
    action: 'view'
  }),
  async (req: AuthenticatedRequest, res: Response<DashboardResponse | ErrorResponse>) => {
    try {
      const organizationId = req.user.organization_id || req.user.id;
      const { period = '30' } = req.query as DashboardQuery;

      const periodDays = parseInt(period);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - periodDays);

      // Get transaction summary
      const transactionSummary = await db('financial_transactions')
        .where('organization_id', organizationId)
        .where('transaction_date', '>=', dateFrom)
        .select([
          db.raw('COUNT(*) as total_transactions'),
          db.raw('SUM(CASE WHEN transaction_type = \'revenue\' AND status = \'posted\' THEN amount ELSE 0 END) as total_revenue'),
          db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') AND status = \'posted\' THEN amount ELSE 0 END) as total_expenses'),
          db.raw('COUNT(CASE WHEN status = \'pending_approval\' THEN 1 END) as pending_approvals'),
          db.raw('SUM(CASE WHEN status IN (\'draft\', \'pending_approval\') THEN amount ELSE 0 END) as pending_amount')
        ])
        .first() as any;

      // Get budget summary
      const budgetSummary = await db('budgets')
        .join('budget_periods', 'budgets.budget_period_id', 'budget_periods.id')
        .where('budgets.organization_id', organizationId)
        .where('budget_periods.status', 'active')
        .select([
          db.raw('COUNT(*) as total_budgets'),
          db.raw('SUM(allocated_amount) as total_allocated'),
          db.raw('SUM(actual_spent) as total_spent'),
          db.raw('SUM(committed_amount) as total_committed'),
          db.raw('SUM(allocated_amount - actual_spent - committed_amount - reserved_amount) as total_available')
        ])
        .first() as any;

      // Get recent transactions
      const recentTransactions = await db('financial_transactions as ft')
        .leftJoin('budgets as b', 'ft.budget_id', 'b.id')
        .leftJoin('vendors as v', 'ft.vendor_id', 'v.id')
        .where('ft.organization_id', organizationId)
        .select(
          'ft.id',
          'ft.transaction_number',
          'ft.transaction_type',
          'ft.amount',
          'ft.description',
          'ft.transaction_date',
          'ft.status',
          'b.name as budget_name',
          'v.name as vendor_name'
        )
        .orderBy('ft.created_at', 'desc')
        .limit(10);

      // Get top expense categories
      const topCategories = await db('financial_transactions as ft')
        .join('budgets as b', 'ft.budget_id', 'b.id')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .where('ft.organization_id', organizationId)
        .where('ft.transaction_type', 'expense')
        .where('ft.status', 'posted')
        .where('ft.transaction_date', '>=', dateFrom)
        .groupBy('bc.id', 'bc.name', 'bc.color_code')
        .select(
          'bc.name as category_name',
          'bc.color_code as color',
          db.raw('SUM(ft.amount) as total_amount'),
          db.raw('COUNT(*) as transaction_count')
        )
        .orderBy('total_amount', 'desc')
        .limit(5);

      // Get cash flow trend (daily for the period)
      const cashFlowTrend = await db('financial_transactions')
        .where('organization_id', organizationId)
        .where('status', 'posted')
        .where('transaction_date', '>=', dateFrom)
        .select(
          'transaction_date',
          db.raw('SUM(CASE WHEN transaction_type = \'revenue\' THEN amount ELSE 0 END) as revenue'),
          db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') THEN amount ELSE 0 END) as expenses')
        )
        .groupBy('transaction_date')
        .orderBy('transaction_date');

      res.json({
        transaction_summary: {
          total_transactions: parseInt((transactionSummary as any).total_transactions),
          total_revenue: parseMonetaryAmount((transactionSummary as any).total_revenue),
          total_expenses: parseMonetaryAmount((transactionSummary as any).total_expenses),
          pending_approvals: parseInt((transactionSummary as any).pending_approvals),
          pending_amount: parseMonetaryAmount((transactionSummary as any).pending_amount)
        },
        budget_summary: {
          total_budgets: parseInt((budgetSummary as any).total_budgets),
          total_allocated: parseMonetaryAmount((budgetSummary as any).total_allocated),
          total_spent: parseMonetaryAmount((budgetSummary as any).total_spent),
          total_committed: parseMonetaryAmount((budgetSummary as any).total_committed),
          total_available: parseMonetaryAmount((budgetSummary as any).total_available)
        },
        recent_transactions: recentTransactions.map(tx => ({
          ...tx,
          amount: parseMonetaryAmount(tx.amount)
        })),
        top_categories: topCategories.map(cat => ({
          ...cat,
          total_amount: parseMonetaryAmount(cat.total_amount)
        })),
        cash_flow_trend: cashFlowTrend.map(point => ({
          ...point,
          revenue: parseMonetaryAmount(point.revenue),
          expenses: parseMonetaryAmount(point.expenses)
        })),
        period_days: periodDays
      });
    } catch (error) {
      console.error('Financial dashboard error:', error);
      res.status(500).json({ error: 'Failed to retrieve dashboard data' });
    }
  }
);

export default router;