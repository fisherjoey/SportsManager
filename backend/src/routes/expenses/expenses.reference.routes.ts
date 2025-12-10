/**
 * @fileoverview Expense Reference Data Routes
 * @description Route handlers for expense reference data endpoints (categories, vendors).
 * These endpoints provide data for dropdowns, autocomplete, and filtering in the expense UI.
 *
 * Session 4: Reference Data Endpoints
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { expenseReferenceService } from '../../services/expense/ExpenseReferenceService';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';

const router = Router();

// Validation schemas
const categoriesQuerySchema = Joi.object({
  include_inactive: Joi.boolean().default(false)
});

const vendorsQuerySchema = Joi.object({
  search: Joi.string().max(100).allow(''),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

/**
 * GET /api/expenses/categories
 * Get expense categories for dropdowns and filtering
 *
 * Query Parameters:
 * - include_inactive (boolean): Include inactive categories (default: false)
 *
 * Response: { success: boolean, categories: CategoryReference[] }
 */
router.get(
  '/categories',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'view:categories' }),
  async (req: Request, res: Response) => {
    try {
      const { error, value } = categoriesQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const categories = await expenseReferenceService.getCategories(value.include_inactive);

      // Set cache headers - categories change infrequently
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes

      return res.json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      });
    }
  }
);

/**
 * GET /api/expenses/vendors
 * Get vendors for autocomplete/selection with typeahead support
 *
 * Query Parameters:
 * - search (string): Filter vendors by name (case-insensitive partial match)
 * - limit (number): Maximum results to return (default: 20, max: 100)
 *
 * Response: { success: boolean, vendors: VendorReference[] }
 */
router.get(
  '/vendors',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'view:vendors' }),
  async (req: Request, res: Response) => {
    try {
      const { error, value } = vendorsQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const vendors = await expenseReferenceService.getVendors(value.search, value.limit);

      return res.json({
        success: true,
        vendors
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch vendors'
      });
    }
  }
);

export default router;
