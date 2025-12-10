/**
 * @fileoverview Expense Approval Service
 * @description Handles expense approval and rejection operations.
 * Part of Session 3 implementation for expense approval workflow.
 */

import { Knex } from 'knex';
import { ExpenseServiceBase } from './ExpenseServiceBase';
import { ApprovalWorkflowService } from '../ApprovalWorkflowService';
import {
  NotFoundError,
  AuthorizationError,
  BusinessLogicError
} from '../../utils/errors';

export interface ApprovalData {
  notes?: string;
  conditions?: string[];
}

export interface RejectionData {
  reason: string;
  allow_resubmission: boolean;
}

export interface ApprovalResult {
  id: string;
  status: string;
  current_stage: string | null;
  next_approver: string | null;
  is_fully_approved: boolean;
}

export interface RejectionResult {
  id: string;
  status: 'rejected';
  can_resubmit: boolean;
}

export class ExpenseApprovalService extends ExpenseServiceBase {
  private workflowService: ApprovalWorkflowService;

  constructor(database?: Knex) {
    super(database);
    this.workflowService = new ApprovalWorkflowService();
  }

  /**
   * Approve an expense in the workflow
   * @param expenseId - The expense ID to approve
   * @param approverId - The user ID performing the approval
   * @param data - Approval data including optional notes and conditions
   */
  async approveExpense(
    expenseId: string,
    approverId: string,
    data: ApprovalData
  ): Promise<ApprovalResult> {
    return this.db.transaction(async (trx) => {
      // 1. Fetch the expense and verify it exists
      const expense = await trx('expense_data')
        .where('id', expenseId)
        .first();

      if (!expense) {
        throw new NotFoundError('Expense', expenseId);
      }

      // 2. Check expense is in a valid state for approval
      const validStatuses = ['pending', 'pending_approval', 'submitted'];
      if (!validStatuses.includes(expense.payment_status)) {
        throw new BusinessLogicError(
          `Expense cannot be approved (current status: ${expense.payment_status})`,
          'INVALID_EXPENSE_STATUS',
          { expenseId, currentStatus: expense.payment_status }
        );
      }

      // 3. Get the current approval record for this expense
      const approval = await trx('expense_approvals')
        .where('expense_data_id', expenseId)
        .where('status', 'pending')
        .orderBy('approval_sequence', 'asc')
        .first();

      if (!approval) {
        throw new BusinessLogicError(
          'No pending approval found for this expense',
          'NO_PENDING_APPROVAL',
          { expenseId }
        );
      }

      // 4. Verify user is authorized approver for current stage
      const canApprove = await this.canUserApprove(approval, approverId);

      if (!canApprove) {
        throw new AuthorizationError(
          'You are not authorized to approve this expense at its current stage'
        );
      }

      // 5. Record the approval
      const approvalNotes = data.conditions && data.conditions.length > 0
        ? `${data.notes || ''}\n\nConditions:\n${data.conditions.map(c => `- ${c}`).join('\n')}`.trim()
        : data.notes || null;

      await trx('expense_approvals')
        .where('id', approval.id)
        .update({
          approver_id: approverId,
          status: 'approved',
          approval_notes: approvalNotes,
          approved_at: new Date(),
          updated_at: new Date()
        });

      // 6. Check if there are more pending approvals for this expense
      const nextApproval = await trx('expense_approvals')
        .where('expense_data_id', expenseId)
        .where('status', 'pending')
        .where('approval_sequence', '>', approval.approval_sequence || 1)
        .orderBy('approval_sequence', 'asc')
        .first();

      let isFullyApproved = false;
      let nextApprover: string | null = null;
      let currentStage = `Stage ${approval.approval_sequence || 1}`;

      if (!nextApproval) {
        // No more pending approvals - workflow is complete
        isFullyApproved = true;
        await trx('expense_data')
          .where('id', expenseId)
          .update({
            payment_status: 'approved',
            updated_at: new Date()
          });

        // Trigger payment processing
        await this.triggerPaymentProcessing(expenseId, trx);
        currentStage = 'Complete';
      } else {
        // There's another stage
        currentStage = `Stage ${nextApproval.approval_sequence}`;
        // Try to get next approver name if set
        if (nextApproval.approver_id) {
          const approverUser = await trx('users')
            .where('id', nextApproval.approver_id)
            .first();
          if (approverUser) {
            nextApprover = `${approverUser.first_name} ${approverUser.last_name}`.trim();
          }
        }
      }

      // 7. Send notification to submitter
      await this.notifySubmitter(expense.user_id, {
        type: 'expense_approved',
        expenseId,
        message: isFullyApproved
          ? `Your expense has been fully approved and is queued for payment.`
          : `Your expense has been approved at stage ${approval.approval_sequence || 1}. Awaiting next approval.`
      });

      return {
        id: expenseId,
        status: isFullyApproved ? 'approved' : 'pending_approval',
        current_stage: currentStage,
        next_approver: nextApprover,
        is_fully_approved: isFullyApproved
      };
    });
  }

  /**
   * Reject an expense
   * @param expenseId - The expense ID to reject
   * @param approverId - The user ID performing the rejection
   * @param data - Rejection data including reason and resubmission flag
   */
  async rejectExpense(
    expenseId: string,
    approverId: string,
    data: RejectionData
  ): Promise<RejectionResult> {
    return this.db.transaction(async (trx) => {
      // 1. Fetch and validate expense
      const expense = await trx('expense_data')
        .where('id', expenseId)
        .first();

      if (!expense) {
        throw new NotFoundError('Expense', expenseId);
      }

      // 2. Check expense is in a valid state for rejection
      const validStatuses = ['pending', 'pending_approval', 'submitted'];
      if (!validStatuses.includes(expense.payment_status)) {
        throw new BusinessLogicError(
          `Expense cannot be rejected (current status: ${expense.payment_status})`,
          'INVALID_EXPENSE_STATUS',
          { expenseId, currentStatus: expense.payment_status }
        );
      }

      // 3. Get the current approval record
      const approval = await trx('expense_approvals')
        .where('expense_data_id', expenseId)
        .where('status', 'pending')
        .orderBy('approval_sequence', 'asc')
        .first();

      if (!approval) {
        throw new BusinessLogicError(
          'No pending approval found for this expense',
          'NO_PENDING_APPROVAL',
          { expenseId }
        );
      }

      // 4. Verify user is authorized approver
      const canApprove = await this.canUserApprove(approval, approverId);

      if (!canApprove) {
        throw new AuthorizationError(
          'You are not authorized to reject this expense'
        );
      }

      // 5. Record the rejection
      await trx('expense_approvals')
        .where('id', approval.id)
        .update({
          approver_id: approverId,
          status: 'rejected',
          rejection_reason: data.reason,
          rejected_at: new Date(),
          updated_at: new Date()
        });

      // 6. Update all remaining approval stages to cancelled
      await trx('expense_approvals')
        .where('expense_data_id', expenseId)
        .where('approval_sequence', '>', approval.approval_sequence || 1)
        .update({
          status: 'cancelled',
          updated_at: new Date()
        });

      // 7. Update expense status
      const newStatus = data.allow_resubmission ? 'rejected_resubmittable' : 'rejected';
      await trx('expense_data')
        .where('id', expenseId)
        .update({
          payment_status: newStatus,
          updated_at: new Date()
        });

      // 8. Send notification to submitter
      const approverName = await this.getUserName(approverId, trx);
      await this.notifySubmitter(expense.user_id, {
        type: 'expense_rejected',
        expenseId,
        message: data.allow_resubmission
          ? `Your expense has been rejected by ${approverName}. Reason: ${data.reason}. You may resubmit with corrections.`
          : `Your expense has been rejected by ${approverName}. Reason: ${data.reason}`
      });

      return {
        id: expenseId,
        status: 'rejected',
        can_resubmit: data.allow_resubmission
      };
    });
  }

  /**
   * Check if a user can approve a specific approval record
   */
  private async canUserApprove(approval: any, userId: string): Promise<boolean> {
    // Check if user is the designated approver for this record
    if (approval.approver_id === userId) {
      return true;
    }

    // Get user's roles from user_roles/roles tables
    const userRoles = await this.db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.name');

    const roleNames = userRoles.map((r: any) => r.name.toLowerCase().replace(/\s+/g, '_'));

    // Admin roles can approve any expense
    if (roleNames.includes('admin') || roleNames.includes('super_admin')) {
      return true;
    }

    // Approver roles (assignor, assignment_manager) can approve org expenses
    const isApprover = roleNames.some((role: string) =>
      ['assignor', 'assignment_manager'].includes(role)
    );

    if (isApprover && approval.organization_id) {
      const user = await this.db('users')
        .where('id', userId)
        .first();

      if (user && String(user.organization_id) === String(approval.organization_id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Trigger payment processing for a fully approved expense
   */
  private async triggerPaymentProcessing(
    expenseId: string,
    trx: Knex.Transaction
  ): Promise<void> {
    // Queue for payment processing
    // This could insert into a payment_queue table or emit an event
    console.log(`[ExpenseApproval] Payment processing triggered for expense ${expenseId}`);

    // Optional: Insert into payment queue if table exists
    try {
      const tableExists = await trx.schema.hasTable('payment_queue');
      if (tableExists) {
        await trx('payment_queue').insert({
          expense_id: expenseId,
          status: 'pending',
          queued_at: new Date(),
          created_at: new Date()
        });
      }
    } catch (error) {
      // Payment queue is optional, log but don't fail
      console.log(`[ExpenseApproval] Payment queue not available, expense ${expenseId} marked as approved`);
    }
  }
}

// Create and export singleton instance
export const expenseApprovalService = new ExpenseApprovalService();
export default ExpenseApprovalService;
