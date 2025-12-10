/**
 * @fileoverview Expense Service Base Class
 * @description Shared base class for all expense-related services.
 * Provides common database access, utility methods, and notification helpers.
 *
 * Sessions 2, 3, 4 will extend this class for their specific functionality.
 */

import { Knex } from 'knex';
import db from '../../config/database';

export interface NotificationPayload {
  type: 'expense_approved' | 'expense_rejected' | 'expense_pending' | 'expense_info_required';
  expenseId: string;
  message: string;
  amount?: number;
  submittedAt?: Date;
  decidedAt?: Date;
}

export class ExpenseServiceBase {
  protected db: Knex;

  constructor(database?: Knex) {
    this.db = database || db;
  }

  /**
   * Get user's full name by ID
   */
  protected async getUserName(userId: string, trx?: Knex.Transaction): Promise<string> {
    const query = trx ? trx('users') : this.db('users');
    const user = await query.where('id', userId).first();
    return user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown';
  }

  /**
   * Get user's email by ID
   */
  protected async getUserEmail(userId: string, trx?: Knex.Transaction): Promise<string | null> {
    const query = trx ? trx('users') : this.db('users');
    const user = await query.where('id', userId).select('email').first();
    return user?.email || null;
  }

  /**
   * Get organization ID for a user
   */
  protected async getUserOrganizationId(userId: string, trx?: Knex.Transaction): Promise<string | null> {
    const query = trx ? trx('users') : this.db('users');
    const user = await query.where('id', userId).select('organization_id').first();
    return user?.organization_id || null;
  }

  /**
   * Send notification to expense submitter
   * @todo Implement actual notification service (email, in-app, push)
   */
  protected async notifySubmitter(userId: string, notification: NotificationPayload): Promise<void> {
    // TODO: Integrate with actual notification service
    console.log(`[ExpenseNotification] Sending to user ${userId}:`, {
      type: notification.type,
      expenseId: notification.expenseId,
      message: notification.message
    });
  }

  /**
   * Send notification to approver
   * @todo Implement actual notification service
   */
  protected async notifyApprover(approverId: string, notification: NotificationPayload): Promise<void> {
    console.log(`[ExpenseNotification] Sending to approver ${approverId}:`, {
      type: notification.type,
      expenseId: notification.expenseId,
      message: notification.message
    });
  }

  /**
   * Format currency amount for display
   */
  protected formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  /**
   * Parse urgency level to numeric priority (higher = more urgent)
   */
  protected getUrgencyPriority(urgency: string | null | undefined): number {
    const priorities: Record<string, number> = {
      'low': 1,
      'normal': 2,
      'high': 3,
      'urgent': 4,
      'critical': 4  // Map critical to same as urgent for compatibility
    };
    return priorities[urgency || 'normal'] || 2;
  }

  /**
   * Check if user has permission for expense action
   * This is a placeholder - actual permission checks should use Cerbos middleware
   */
  protected async checkExpenseOwnership(
    expenseId: string,
    userId: string,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const query = trx ? trx('expense_data') : this.db('expense_data');
    const expense = await query.where('id', expenseId).select('user_id').first();
    return expense?.user_id === userId;
  }

  /**
   * Get expense with all related data
   */
  protected async getExpenseWithDetails(
    expenseId: string,
    trx?: Knex.Transaction
  ): Promise<any | null> {
    const query = trx ? trx('expense_data') : this.db('expense_data');

    return query
      .leftJoin('expense_receipts', 'expense_data.receipt_id', 'expense_receipts.id')
      .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
      .leftJoin('payment_methods', 'expense_data.payment_method_id', 'payment_methods.id')
      .leftJoin('users', 'expense_data.user_id', 'users.id')
      .where('expense_data.id', expenseId)
      .select(
        'expense_data.*',
        'expense_receipts.original_filename',
        'expense_receipts.file_path',
        'expense_receipts.processing_status',
        'expense_categories.name as category_name',
        'expense_categories.code as category_code',
        'expense_categories.color_code as category_color',
        'payment_methods.name as payment_method_name',
        'payment_methods.type as payment_method_type_name',
        'users.first_name as submitter_first_name',
        'users.last_name as submitter_last_name',
        'users.email as submitter_email'
      )
      .first();
  }

  /**
   * Get current approval status for an expense
   */
  protected async getExpenseApprovalStatus(
    expenseId: string,
    trx?: Knex.Transaction
  ): Promise<{
    status: string;
    approvalId: string | null;
    approverName: string | null;
  } | null> {
    const query = trx ? trx('expense_approvals') : this.db('expense_approvals');

    const approval = await query
      .leftJoin('users', 'expense_approvals.approver_id', 'users.id')
      .where('expense_approvals.expense_data_id', expenseId)
      .orderBy('expense_approvals.created_at', 'desc')
      .select(
        'expense_approvals.id',
        'expense_approvals.status',
        'users.first_name',
        'users.last_name'
      )
      .first();

    if (!approval) return null;

    return {
      status: approval.status,
      approvalId: approval.id,
      approverName: approval.first_name
        ? `${approval.first_name} ${approval.last_name}`.trim()
        : null
    };
  }
}

export default ExpenseServiceBase;
