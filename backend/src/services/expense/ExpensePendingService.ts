/**
 * @fileoverview Expense Pending Service
 * @description Service for retrieving pending expenses awaiting approval.
 * Provides filtering, pagination, and approval history for the expense approval workflow.
 *
 * Session 2: GET /api/expenses/pending Endpoint
 */

import { ExpenseServiceBase } from './ExpenseServiceBase';
import {
  PendingExpenseFilters,
  ApprovalStatus,
  ExpenseUrgency
} from '../../types/expenses.types';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PendingExpense {
  id: string;
  expense_number: string;
  amount: number;
  description: string;
  vendor_name: string;
  category_name: string;
  category_color: string;
  payment_method_type: string;
  payment_method_name: string;
  submitted_date: string;
  submitted_by_name: string;
  submitted_by_email: string;
  urgency_level: ExpenseUrgency;
  current_approval_stage: string;
  approval_deadline: string;
  receipt_filename?: string;
  business_purpose?: string;
  is_overdue: boolean;
  approval_history: ApprovalHistoryEntry[];
}

export interface ApprovalHistoryEntry {
  id: string;
  approver_name: string;
  decision: ApprovalStatus;
  notes?: string;
  decided_at: string;
}

export class ExpensePendingService extends ExpenseServiceBase {
  /**
   * Get pending expenses with filtering and pagination
   * @param filters - Filter criteria and pagination options
   * @returns Paginated list of pending expenses with approval history
   */
  async getPendingExpenses(filters: PendingExpenseFilters): Promise<PaginatedResult<PendingExpense>> {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Build base query with joins
    // NOTE: Main table is expense_data, vendor_name is text field (not FK)
    let query = this.db('expense_data as e')
      .select(
        'e.id',
        'e.id as expense_number', // Using ID as expense number for now
        'e.total_amount as amount',
        'e.description',
        'e.created_at as submitted_date',
        'e.expense_urgency as urgency_level',
        'e.business_purpose',
        'e.vendor_name', // Text field, not from vendors table
        'c.name as category_name',
        'c.color_code as category_color',
        'pm.type as payment_method_type',
        'pm.name as payment_method_name',
        'u.first_name',
        'u.last_name',
        'u.email as submitted_by_email',
        'r.original_filename as receipt_filename',
        'ea.approval_sequence as current_approval_stage',
        'ea.submitted_at as approval_deadline' // Using submitted_at as proxy for deadline
      )
      .leftJoin('expense_categories as c', 'e.category_id', 'c.id')
      .leftJoin('payment_methods as pm', 'e.payment_method_id', 'pm.id')
      .leftJoin('users as u', 'e.user_id', 'u.id')
      .leftJoin('expense_receipts as r', 'e.receipt_id', 'r.id')
      // Join to get pending approval status
      .leftJoin('expense_approvals as ea', 'e.id', 'ea.expense_data_id')
      .where('ea.status', 'pending');

    // Apply filters
    if (filters.payment_method) {
      query = query.where('pm.type', filters.payment_method);
    }
    if (filters.urgency) {
      query = query.where('e.expense_urgency', filters.urgency);
    }
    if (filters.amount_min !== undefined) {
      query = query.where('e.total_amount', '>=', filters.amount_min);
    }
    if (filters.amount_max !== undefined) {
      query = query.where('e.total_amount', '<=', filters.amount_max);
    }
    if (filters.category) {
      query = query.where('e.category_id', filters.category);
    }
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(function () {
        this.whereILike('e.description', searchTerm)
          .orWhereILike('e.vendor_name', searchTerm) // Text field on expense_data
          .orWhereILike('u.first_name', searchTerm)
          .orWhereILike('u.last_name', searchTerm);
      });
    }

    // Get total count - clear select before counting to avoid GROUP BY issues
    const countQuery = query.clone().clearSelect();
    const [countResult] = await countQuery.count('e.id as count');
    const total = parseInt(countResult.count as string, 10);

    // Get paginated results
    const expenses = await query
      .orderBy('ea.submitted_at', 'asc')
      .offset(offset)
      .limit(limit);

    // Fetch approval history for each expense
    const expenseIds = expenses.map((e: any) => e.id);
    const approvalHistory = await this.getApprovalHistoryForExpenses(expenseIds);

    // Map and calculate is_overdue
    const now = new Date();
    const mappedExpenses: PendingExpense[] = expenses.map((e: any) => ({
      id: e.id,
      expense_number: e.expense_number,
      amount: parseFloat(e.amount) || 0,
      description: e.description || '',
      vendor_name: e.vendor_name || '',
      category_name: e.category_name || '',
      category_color: e.category_color || '',
      payment_method_type: e.payment_method_type || '',
      payment_method_name: e.payment_method_name || '',
      submitted_date: e.submitted_date,
      submitted_by_name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Unknown',
      submitted_by_email: e.submitted_by_email || '',
      urgency_level: e.urgency_level || 'normal',
      current_approval_stage: e.current_approval_stage?.toString() || '1',
      approval_deadline: e.approval_deadline,
      receipt_filename: e.receipt_filename,
      business_purpose: e.business_purpose,
      is_overdue: e.approval_deadline ? new Date(e.approval_deadline) < now : false,
      approval_history: approvalHistory[e.id] || []
    }));

    return {
      data: mappedExpenses,
      total,
      page,
      limit
    };
  }

  /**
   * Get approval history for multiple expenses
   * @param expenseIds - Array of expense IDs
   * @returns Map of expense ID to approval history entries
   */
  private async getApprovalHistoryForExpenses(
    expenseIds: string[]
  ): Promise<Record<string, ApprovalHistoryEntry[]>> {
    if (expenseIds.length === 0) {
      return {};
    }

    const history = await this.db('expense_approvals as ea')
      .select(
        'ea.id',
        'ea.expense_data_id as expense_id',
        'ea.status as decision',
        'ea.approval_notes as notes',
        'ea.updated_at as decided_at',
        'u.first_name',
        'u.last_name'
      )
      .leftJoin('users as u', 'ea.approver_id', 'u.id')
      .whereIn('ea.expense_data_id', expenseIds)
      .orderBy('ea.updated_at', 'asc');

    // Group by expense_id
    return history.reduce((acc: Record<string, ApprovalHistoryEntry[]>, item: any) => {
      if (!acc[item.expense_id]) {
        acc[item.expense_id] = [];
      }
      acc[item.expense_id].push({
        id: item.id,
        approver_name: item.first_name
          ? `${item.first_name} ${item.last_name}`.trim()
          : 'Unassigned',
        decision: item.decision,
        notes: item.notes,
        decided_at: item.decided_at
      });
      return acc;
    }, {} as Record<string, ApprovalHistoryEntry[]>);
  }
}

export const expensePendingService = new ExpensePendingService();
