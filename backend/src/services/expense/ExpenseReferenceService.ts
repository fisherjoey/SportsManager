/**
 * @fileoverview Expense Reference Data Service
 * @description Service for retrieving expense reference data (categories, vendors).
 * Used for dropdowns, typeahead, and filtering in the expense approval workflow.
 *
 * Session 4: Reference Data Endpoints
 */

import { ExpenseServiceBase } from './ExpenseServiceBase';
import { CategoryReference, VendorReference } from '../../types/expenses.types';

export class ExpenseReferenceService extends ExpenseServiceBase {
  /**
   * Get expense categories for dropdowns and filtering
   * @param includeInactive - Whether to include inactive categories
   * @returns Array of expense categories
   */
  async getCategories(includeInactive: boolean = false): Promise<CategoryReference[]> {
    let query = this.db('expense_categories')
      .select(
        'id',
        'name',
        'code',
        'color_code',
        'description',
        'requires_approval',
        'approval_threshold',
        'active'
      )
      .orderBy('name', 'asc');

    if (!includeInactive) {
      query = query.where('active', true);
    }

    return query;
  }

  /**
   * Get vendors for autocomplete/selection
   * @param search - Optional search term for filtering by vendor name
   * @param limit - Maximum number of results (default: 20, max: 100)
   * @returns Array of vendors matching the criteria
   */
  async getVendors(search?: string, limit: number = 20): Promise<VendorReference[]> {
    // Ensure limit is within bounds
    const safeLimit = Math.min(Math.max(1, limit), 100);

    let query = this.db('vendors')
      .select(
        'id',
        'name',
        'email',
        'phone',
        'payment_terms',
        'active'
      )
      .where('active', true)
      .orderBy('name', 'asc')
      .limit(safeLimit);

    if (search && search.trim()) {
      // Case-insensitive search on vendor name
      query = query.whereILike('name', `%${search.trim()}%`);
    }

    return query;
  }
}

export const expenseReferenceService = new ExpenseReferenceService();
