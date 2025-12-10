/**
 * @fileoverview Expense Pending Routes
 * @description Route handlers for fetching pending expenses awaiting approval.
 * Provides filtering, pagination, and approval history for the expense approval workflow.
 *
 * Session 2: GET /api/expenses/pending Endpoint
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { expensePendingService } from '../../services/expense/ExpensePendingService';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';

const router = Router();

// Validation schema for query parameters
const pendingExpensesQuerySchema = Joi.object({
  payment_method: Joi.string().valid(
    'person_reimbursement',
    'purchase_order',
    'credit_card',
    'direct_vendor'
  ),
  urgency: Joi.string().valid('low', 'normal', 'high', 'urgent'),
  amount_min: Joi.number().min(0),
  amount_max: Joi.number().min(0),
  search: Joi.string().max(100).allow(''),
  category: Joi.string().uuid(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

/**
 * GET /api/expenses/pending
 * Get expenses awaiting approval with filtering and pagination
 *
 * Query Parameters:
 * - payment_method (string): Filter by payment method type
 * - urgency (string): Filter by urgency level ('low', 'normal', 'high', 'urgent')
 * - amount_min (number): Minimum amount filter
 * - amount_max (number): Maximum amount filter
 * - search (string): Search description, vendor, or submitter name
 * - category (string): Filter by category ID (UUID)
 * - page (number): Page number (default: 1)
 * - limit (number): Items per page (default: 20, max: 100)
 *
 * Response: {
 *   success: boolean,
 *   expenses: PendingExpense[],
 *   total: number,
 *   page: number,
 *   limit: number
 * }
 */
router.get(
  '/pending',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'view:pending' }),
  async (req: Request, res: Response) => {
    try {
      const { error, value } = pendingExpensesQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const result = await expensePendingService.getPendingExpenses(value);

      return res.json({
        success: true,
        expenses: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pending expenses'
      });
    }
  }
);

export default router;
