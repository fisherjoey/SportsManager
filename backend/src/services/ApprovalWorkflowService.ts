/**
 * @fileoverview Enhanced Approval Workflow Service
 *
 * Handles multi-stage approval routing based on expense amount, payment method, and category.
 * Supports auto-approval, escalation handling, delegation, and comprehensive audit trails.
 *
 * @author Claude Assistant
 * @date 2025-01-23
 */

import db from '../config/database';
import {
  IApprovalWorkflowService,
  WorkflowConfig,
  WorkflowStage,
  ExpenseData,
  PaymentMethod,
  WorkflowUser,
  ApprovalDecision,
  ApprovalRecord,
  WorkflowTemplate,
  PendingApproval,
  ApprovalHistory,
  Approver,
  WorkflowFilters,
  AutoApprovalThresholds,
  EscalationRules,
  StageConditions,
  NotificationConfig,
  WorkflowType,
  PaymentMethodType,
  ApprovalAction,
  ApprovalStatus,
  RiskLevel,
  WorkflowError,
  WorkflowErrorType
} from './types/approvalWorkflow';

/**
 * Enhanced Approval Workflow Service
 * Handles multi-stage approval routing based on expense amount, payment method, and category.
 * Supports auto-approval, escalation handling, delegation, and comprehensive audit trails.
 */
export class ApprovalWorkflowService implements IApprovalWorkflowService {
  public readonly ESCALATION_TIMEOUT_HOURS: number = 48;
  public readonly REMINDER_FREQUENCY_HOURS: number = 24;
  public readonly MAX_REMINDERS: number = 3;
  public readonly HIGH_VALUE_THRESHOLD: number = 1000.00;

  // Auto-approval thresholds by payment method type
  public readonly AUTO_APPROVAL_THRESHOLDS: AutoApprovalThresholds = {
    person_reimbursement: 50.00,
    credit_card: 200.00,
    purchase_order: 0.00, // Always requires approval
    direct_vendor: 100.00
  };

  /**
   * Determine the appropriate approval workflow for an expense
   */
  public async determineWorkflow(
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<WorkflowConfig> {
    const organizationId = user.organization_id || user.id;
    const amount = parseFloat(expenseData.total_amount.toString() || '0');

    console.log(`Determining workflow for expense: ${expenseData.id}, amount: $${amount}, payment method: ${paymentMethod.type}`);

    // For now, always use default workflow logic
    // Custom workflows will be implemented in a future version
    return await this.buildDefaultWorkflow(expenseData, paymentMethod, user);
  }

  /**
   * Build workflow from a custom template
   */
  public async buildWorkflowFromTemplate(
    template: WorkflowTemplate,
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<WorkflowConfig> {
    try {
      const workflowStages = JSON.parse(template.workflow_stages || '[]');
      const amount = parseFloat(expenseData.total_amount.toString() || '0');

      const stages: WorkflowStage[] = [];

      for (let i = 0; i < workflowStages.length; i++) {
        const stageTemplate = workflowStages[i];

        // Skip stages that don't apply to this expense
        if (stageTemplate.conditions) {
          const conditionsMet = await this.evaluateStageConditions(
            stageTemplate.conditions,
            expenseData,
            paymentMethod,
            user
          );
          if (!conditionsMet) {
            continue;
          }
        }

        const approvers = await this.resolveApprovers(stageTemplate.approver_rules, user);

        stages.push({
          stageNumber: i + 1,
          stageName: stageTemplate.name,
          description: stageTemplate.description,
          requiredApprovers: approvers,
          minimumApprovers: stageTemplate.minimum_approvers || 1,
          requiresAllApprovers: stageTemplate.requires_all_approvers || false,
          approvalLimit: stageTemplate.approval_limit,
          canModifyAmount: stageTemplate.can_modify_amount || false,
          deadlineHours: stageTemplate.stage_deadline_hours || template.default_escalation_hours,
          escalationHours: stageTemplate.escalation_hours || (template.default_escalation_hours / 2),
          escalationRules: stageTemplate.escalation_rules || {},
          allowDelegation: template.allow_delegation,
          conditions: stageTemplate.conditions || {}
        });
      }

      return {
        workflowId: template.id,
        workflowName: template.name,
        workflowType: template.workflow_type,
        totalStages: stages.length,
        stages,
        allowParallelApproval: template.allow_parallel_approval,
        notificationConfig: JSON.parse(template.notification_config || '{}'),
        sendReminders: template.send_reminders,
        reminderFrequencyHours: template.reminder_frequency_hours,
        maxReminders: template.max_reminders
      };
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.CONFIGURATION_ERROR,
        'Failed to build workflow from template',
        error as Error,
        { templateId: template.id }
      );
    }
  }

  /**
   * Build default workflow based on business rules
   */
  public async buildDefaultWorkflow(
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<WorkflowConfig> {
    try {
      const amount = parseFloat(expenseData.total_amount.toString() || '0');
      const paymentMethodType = paymentMethod.type;

      console.log(`Building default workflow for amount: $${amount}, type: ${paymentMethodType}`);

      // Check for auto-approval
      const autoApprovalLimit = this.AUTO_APPROVAL_THRESHOLDS[paymentMethodType] || 0;
      if (amount <= autoApprovalLimit && !paymentMethod.requires_approval) {
        return {
          workflowId: null,
          workflowName: 'Auto-Approval',
          workflowType: 'auto_approval',
          totalStages: 0,
          stages: [],
          autoApproved: true,
          autoApprovalReason: `Amount $${amount} is under auto-approval limit of $${autoApprovalLimit}`
        };
      }

      const stages: WorkflowStage[] = [];
      let stageNumber = 1;

      // Stage 1: Manager Approval (always required for amounts > auto-approval)
      if (amount > autoApprovalLimit) {
        const managerApprovers = await this.getManagerApprovers(user);
        stages.push({
          stageNumber: stageNumber++,
          stageName: 'Manager Approval',
          description: 'Direct manager approval required',
          requiredApprovers: managerApprovers,
          minimumApprovers: 1,
          requiresAllApprovers: false,
          approvalLimit: paymentMethodType === 'person_reimbursement' ? 500.00 : 1000.00,
          canModifyAmount: true,
          deadlineHours: 48,
          escalationHours: 24,
          escalationRules: {
            escalateTo: 'senior_manager',
            escalationMessage: 'Manager approval overdue'
          },
          allowDelegation: true,
          conditions: {}
        });
      }

      // Stage 2: Finance Review (for high-value expenses)
      if (amount > this.HIGH_VALUE_THRESHOLD) {
        const financeApprovers = await this.getFinanceApprovers(user);
        stages.push({
          stageNumber: stageNumber++,
          stageName: 'Finance Review',
          description: 'Finance team review for high-value expense',
          requiredApprovers: financeApprovers,
          minimumApprovers: 1,
          requiresAllApprovers: false,
          approvalLimit: null, // No limit for finance
          canModifyAmount: true,
          deadlineHours: 72,
          escalationHours: 48,
          escalationRules: {
            escalateTo: 'finance_director',
            escalationMessage: 'Finance review overdue for high-value expense'
          },
          allowDelegation: true,
          conditions: {
            requiresBusinessJustification: true,
            requiresReceiptValidation: true
          }
        });
      }

      // Stage 3: Executive Approval (for very high-value expenses)
      if (amount > 5000.00) {
        const executiveApprovers = await this.getExecutiveApprovers(user);
        stages.push({
          stageNumber: stageNumber++,
          stageName: 'Executive Approval',
          description: 'Executive approval for significant expenses',
          requiredApprovers: executiveApprovers,
          minimumApprovers: 1,
          requiresAllApprovers: false,
          approvalLimit: null,
          canModifyAmount: false, // Executives can't modify, only approve/reject
          deadlineHours: 120, // 5 days
          escalationHours: 72,
          escalationRules: {
            escalateTo: 'ceo',
            escalationMessage: 'Executive approval required for significant expense'
          },
          allowDelegation: false, // No delegation at executive level
          conditions: {
            requiresBusinessCase: true,
            requiresCompetitiveQuotes: amount > 10000.00
          }
        });
      }

      return {
        workflowId: null,
        workflowName: 'Default Approval Workflow',
        workflowType: 'default',
        totalStages: stages.length,
        stages,
        allowParallelApproval: false,
        notificationConfig: {
          email: true,
          inApp: true,
          slack: false
        },
        sendReminders: true,
        reminderFrequencyHours: this.REMINDER_FREQUENCY_HOURS,
        maxReminders: this.MAX_REMINDERS
      };
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.CONFIGURATION_ERROR,
        'Failed to build default workflow',
        error as Error,
        { expenseId: expenseData.id, amount: expenseData.total_amount }
      );
    }
  }

  /**
   * Create approval workflow for an expense
   */
  public async createApprovalWorkflow(
    expenseDataId: string,
    workflow: WorkflowConfig,
    user: WorkflowUser
  ): Promise<ApprovalRecord[]> {
    try {
      if (workflow.autoApproved) {
        // Auto-approve the expense
        return await this.autoApproveExpense(expenseDataId, workflow, user);
      }

      const approvalRecords: ApprovalRecord[] = [];

      await db.transaction(async (trx) => {
        for (const stage of workflow.stages) {
          const approvalData = {
            expense_data_id: expenseDataId,
            user_id: user.id,
            organization_id: user.organization_id || user.id,
            workflow_id: workflow.workflowId,
            stage_number: stage.stageNumber,
            total_stages: workflow.totalStages,
            is_parallel_approval: workflow.allowParallelApproval || false,
            required_approvers: JSON.stringify(stage.requiredApprovers),
            stage_status: (stage.stageNumber === 1 ? 'pending' : 'pending') as ApprovalStatus,
            stage_started_at: stage.stageNumber === 1 ? new Date() : null,
            stage_deadline: stage.stageNumber === 1 ?
              new Date(Date.now() + (stage.deadlineHours * 60 * 60 * 1000)) : null,
            escalation_hours: stage.escalationHours,
            approval_conditions: JSON.stringify(stage.conditions),
            approval_limit: stage.approvalLimit,
            notification_settings: JSON.stringify(workflow.notificationConfig || {}),
            risk_level: this.calculateRiskLevel(expenseDataId, stage, user),
            requires_additional_review: stage.conditions.requiresBusinessCase ||
              stage.conditions.requiresCompetitiveQuotes || false,
            approver_id: null,
            approved_at: null,
            rejected_at: null,
            approval_notes: null,
            approved_amount: null,
            rejection_reason: null,
            required_information: null,
            delegated_to: null,
            delegated_by: null,
            delegated_at: null,
            delegation_reason: null,
            escalated_to: null,
            escalated_at: null,
            escalation_reason: null,
            conditions_met: null,
            created_at: new Date(),
            updated_at: new Date()
          };

          const [approval] = await trx('expense_approvals')
            .insert(approvalData)
            .returning('*');

          approvalRecords.push(approval);
        }

        // Send notification for first stage
        if (approvalRecords.length > 0) {
          await this.sendApprovalNotification(approvalRecords[0]);
        }
      });

      console.log(`Created ${approvalRecords.length} approval stages for expense ${expenseDataId}`);
      return approvalRecords;
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to create approval workflow',
        error as Error,
        { expenseDataId, workflowType: workflow.workflowType }
      );
    }
  }

  /**
   * Auto-approve an expense
   */
  public async autoApproveExpense(
    expenseDataId: string,
    workflow: WorkflowConfig,
    user: WorkflowUser
  ): Promise<ApprovalRecord[]> {
    try {
      const approvalData = {
        expense_data_id: expenseDataId,
        user_id: user.id,
        organization_id: user.organization_id || user.id,
        workflow_id: workflow.workflowId,
        status: 'approved' as ApprovalStatus,
        stage_status: 'approved' as ApprovalStatus,
        stage_number: 1,
        total_stages: 1,
        is_parallel_approval: false,
        required_approvers: JSON.stringify([]),
        approval_notes: workflow.autoApprovalReason,
        approver_id: null, // System auto-approval
        approved_at: new Date(),
        stage_started_at: new Date(),
        stage_deadline: null,
        escalation_hours: 0,
        approval_conditions: JSON.stringify({}),
        approval_limit: null,
        conditions_met: true,
        notification_settings: JSON.stringify({ autoApproval: true }),
        risk_level: 'low' as RiskLevel,
        requires_additional_review: false,
        rejected_at: null,
        approved_amount: null,
        rejection_reason: null,
        required_information: null,
        delegated_to: null,
        delegated_by: null,
        delegated_at: null,
        delegation_reason: null,
        escalated_to: null,
        escalated_at: null,
        escalation_reason: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [approval] = await db('expense_approvals')
        .insert(approvalData)
        .returning('*');

      // Update expense status
      await db('expense_data')
        .where('id', expenseDataId)
        .update({
          payment_status: 'approved',
          updated_at: new Date()
        });

      console.log(`Auto-approved expense ${expenseDataId}: ${workflow.autoApprovalReason}`);
      return [approval];
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to auto-approve expense',
        error as Error,
        { expenseDataId }
      );
    }
  }

  /**
   * Process an approval decision
   */
  public async processApprovalDecision(
    approvalId: string,
    decision: ApprovalDecision,
    approver: WorkflowUser
  ): Promise<ApprovalRecord> {
    try {
      const { action, notes, approvedAmount, rejectionReason, requiredInformation } = decision;

      const approval = await db('expense_approvals')
        .where('id', approvalId)
        .first();

      if (!approval) {
        throw new WorkflowError(
          WorkflowErrorType.APPROVAL_NOT_FOUND,
          'Approval record not found'
        );
      }

      if (approval.stage_status !== 'pending') {
        throw new WorkflowError(
          WorkflowErrorType.WORKFLOW_ALREADY_PROCESSED,
          'Approval has already been processed'
        );
      }

      // Validate approver has permission
      const requiredApprovers = JSON.parse(approval.required_approvers || '[]');
      const approverIds = requiredApprovers.map((a: Approver) => a.id);

      if (!approverIds.includes(approver.id)) {
        throw new WorkflowError(
          WorkflowErrorType.UNAUTHORIZED_APPROVER,
          'User is not authorized to approve this expense'
        );
      }

      const updateData: Partial<ApprovalRecord> = {
        stage_status: action,
        approver_id: approver.id,
        approval_notes: notes || null,
        approved_amount: approvedAmount || approval.requested_amount || null,
        rejection_reason: rejectionReason || null,
        required_information: requiredInformation ? JSON.stringify(requiredInformation) : null,
        updated_at: new Date()
      };

      if (action === 'approved') {
        updateData.approved_at = new Date();
      } else if (action === 'rejected') {
        updateData.rejected_at = new Date();
      }

      // Update approval record
      await db('expense_approvals')
        .where('id', approvalId)
        .update(updateData);

      const updatedApproval = await db('expense_approvals')
        .where('id', approvalId)
        .first();

      // Process workflow progression
      if (action === 'approved') {
        await this.progressWorkflow(updatedApproval);
      } else if (action === 'rejected') {
        await this.rejectWorkflow(updatedApproval);
      }

      console.log(`Processed approval decision: ${action} for approval ${approvalId} by ${approver.id}`);
      return updatedApproval;
    } catch (error) {
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to process approval decision',
        error as Error,
        { approvalId, action: decision.action }
      );
    }
  }

  /**
   * Progress workflow to next stage or complete
   */
  public async progressWorkflow(approval: ApprovalRecord): Promise<void> {
    const isLastStage = approval.stage_number >= approval.total_stages;

    if (isLastStage) {
      // Complete the workflow
      await this.completeWorkflow(approval);
    } else {
      // Start next stage
      await this.startNextStage(approval);
    }
  }

  /**
   * Complete the entire workflow
   */
  public async completeWorkflow(approval: ApprovalRecord): Promise<void> {
    try {
      // Update expense status to approved
      await db('expense_data')
        .where('id', approval.expense_data_id)
        .update({
          payment_status: 'approved',
          updated_at: new Date()
        });

      // Update overall approval status
      await db('expense_approvals')
        .where('expense_data_id', approval.expense_data_id)
        .update({
          status: 'approved',
          updated_at: new Date()
        });

      console.log(`Completed workflow for expense ${approval.expense_data_id}`);
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to complete workflow',
        error as Error,
        { expenseId: approval.expense_data_id }
      );
    }
  }

  /**
   * Start the next stage of approval
   */
  public async startNextStage(currentApproval: ApprovalRecord): Promise<void> {
    try {
      const nextStageNumber = currentApproval.stage_number + 1;

      const nextStage = await db('expense_approvals')
        .where('expense_data_id', currentApproval.expense_data_id)
        .where('stage_number', nextStageNumber)
        .first();

      if (nextStage) {
        const deadlineHours = nextStage.escalation_hours || this.ESCALATION_TIMEOUT_HOURS;

        await db('expense_approvals')
          .where('id', nextStage.id)
          .update({
            stage_status: 'pending',
            stage_started_at: new Date(),
            stage_deadline: new Date(Date.now() + (deadlineHours * 60 * 60 * 1000)),
            updated_at: new Date()
          });

        // Send notification for next stage
        const updatedNextStage = await db('expense_approvals')
          .where('id', nextStage.id)
          .first();

        await this.sendApprovalNotification(updatedNextStage);

        console.log(`Started next approval stage ${nextStageNumber} for expense ${currentApproval.expense_data_id}`);
      }
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to start next stage',
        error as Error,
        { expenseId: currentApproval.expense_data_id }
      );
    }
  }

  /**
   * Reject the entire workflow
   */
  public async rejectWorkflow(approval: ApprovalRecord): Promise<void> {
    try {
      // Update expense status to rejected
      await db('expense_data')
        .where('id', approval.expense_data_id)
        .update({
          payment_status: 'rejected',
          updated_at: new Date()
        });

      // Update all approval stages to rejected
      await db('expense_approvals')
        .where('expense_data_id', approval.expense_data_id)
        .update({
          status: 'rejected',
          stage_status: 'rejected',
          updated_at: new Date()
        });

      console.log(`Rejected workflow for expense ${approval.expense_data_id}`);
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to reject workflow',
        error as Error,
        { expenseId: approval.expense_data_id }
      );
    }
  }

  /**
   * Delegate approval to another user
   */
  public async delegateApproval(
    approvalId: string,
    delegateTo: string,
    delegatedBy: string,
    reason: string
  ): Promise<ApprovalRecord> {
    try {
      const updateData = {
        delegated_to: delegateTo,
        delegated_by: delegatedBy,
        delegated_at: new Date(),
        delegation_reason: reason,
        stage_status: 'delegated' as ApprovalStatus,
        updated_at: new Date()
      };

      await db('expense_approvals')
        .where('id', approvalId)
        .update(updateData);

      // Update required approvers to include delegate
      const approval = await db('expense_approvals')
        .where('id', approvalId)
        .first();

      const requiredApprovers = JSON.parse(approval.required_approvers || '[]');
      const delegateUser = await db('users').where('id', delegateTo).first();

      if (delegateUser && !requiredApprovers.find((a: Approver) => a.id === delegateTo)) {
        requiredApprovers.push({
          id: delegateUser.id,
          name: `${delegateUser.first_name} ${delegateUser.last_name}`,
          email: delegateUser.email,
          role: delegateUser.role,
          delegated: true
        });

        await db('expense_approvals')
          .where('id', approvalId)
          .update({
            required_approvers: JSON.stringify(requiredApprovers),
            stage_status: 'pending' // Reset to pending for delegate
          });
      }

      // Send notification to delegate
      const updatedApproval = await db('expense_approvals')
        .where('id', approvalId)
        .first();

      await this.sendApprovalNotification(updatedApproval, delegateUser);

      console.log(`Delegated approval ${approvalId} from ${delegatedBy} to ${delegateTo}`);
      return updatedApproval;
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DELEGATION_FAILED,
        'Failed to delegate approval',
        error as Error,
        { approvalId, delegateTo, delegatedBy }
      );
    }
  }

  /**
   * Handle escalation of overdue approvals
   */
  public async handleEscalations(): Promise<number> {
    try {
      const overdueApprovals = await db('expense_approvals')
        .where('stage_status', 'pending')
        .where('stage_deadline', '<', new Date())
        .whereNull('escalated_at');

      let escalatedCount = 0;

      for (const approval of overdueApprovals) {
        try {
          await this.escalateApproval(approval);
          escalatedCount++;
        } catch (error) {
          console.error(`Failed to escalate approval ${approval.id}:`, error);
        }
      }

      console.log(`Escalated ${escalatedCount} overdue approvals`);
      return escalatedCount;
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.ESCALATION_FAILED,
        'Failed to handle escalations',
        error as Error
      );
    }
  }

  /**
   * Escalate a specific approval
   */
  public async escalateApproval(approval: ApprovalRecord): Promise<void> {
    try {
      const escalationRules = JSON.parse(approval.approval_conditions || '{}').escalationRules || {};
      const escalationTarget = await this.determineEscalationTarget(approval, escalationRules);

      if (!escalationTarget) {
        console.log(`No escalation target found for approval ${approval.id}`);
        return;
      }

      const overdueHours = Math.floor((Date.now() - new Date(approval.stage_deadline!).getTime()) / (1000 * 60 * 60));

      await db('expense_approvals')
        .where('id', approval.id)
        .update({
          escalated_to: escalationTarget.id,
          escalated_at: new Date(),
          escalation_reason: `Approval overdue by ${overdueHours} hours`,
          stage_status: 'escalated',
          updated_at: new Date()
        });

      // Send escalation notification
      await this.sendEscalationNotification(approval, escalationTarget);

      console.log(`Escalated approval ${approval.id} to ${escalationTarget.id}`);
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.ESCALATION_FAILED,
        'Failed to escalate approval',
        error as Error,
        { approvalId: approval.id }
      );
    }
  }

  /**
   * Send approval notification
   */
  public async sendApprovalNotification(approval: ApprovalRecord, targetUser?: WorkflowUser): Promise<void> {
    try {
      // This would integrate with your notification system
      // For now, just log the notification
      const requiredApprovers = JSON.parse(approval.required_approvers || '[]');
      const notificationTargets = targetUser ? [targetUser] : requiredApprovers;

      console.log(`Sending approval notification for expense ${approval.expense_data_id} to:`,
        notificationTargets.map((u: any) => u.email || u.id));

      // TODO: Integrate with email service, Slack, etc.
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.NOTIFICATION_FAILED,
        'Failed to send approval notification',
        error as Error,
        { approvalId: approval.id }
      );
    }
  }

  /**
   * Send escalation notification
   */
  public async sendEscalationNotification(approval: ApprovalRecord, escalationTarget: WorkflowUser): Promise<void> {
    try {
      console.log(`Sending escalation notification for expense ${approval.expense_data_id} to: ${escalationTarget.email}`);
      // TODO: Integrate with notification system
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.NOTIFICATION_FAILED,
        'Failed to send escalation notification',
        error as Error,
        { approvalId: approval.id, escalationTargetId: escalationTarget.id }
      );
    }
  }

  // Helper methods for getting approvers
  public async getManagerApprovers(user: WorkflowUser): Promise<Approver[]> {
    try {
      // Get user's direct manager(s) - simplified for testing
      const managers = await db('users')
        .where('role', 'admin') // Use admin as managers for now
        .select('id', 'name', 'email', 'role');

      return managers.map((manager: any) => ({
        id: manager.id,
        name: manager.name || 'Manager',
        email: manager.email,
        role: manager.role
      }));
    } catch (error) {
      console.error('Error getting manager approvers:', error);
      return [];
    }
  }

  public async getFinanceApprovers(user: WorkflowUser): Promise<Approver[]> {
    try {
      const financeUsers = await db('users')
        .whereIn('role', ['admin'])
        .select('id', 'name', 'email', 'role');

      return financeUsers.map((financeUser: any) => ({
        id: financeUser.id,
        name: financeUser.name || 'Finance User',
        email: financeUser.email,
        role: financeUser.role
      }));
    } catch (error) {
      console.error('Error getting finance approvers:', error);
      return [];
    }
  }

  public async getExecutiveApprovers(user: WorkflowUser): Promise<Approver[]> {
    try {
      const executives = await db('users')
        .whereIn('role', ['admin'])
        .select('id', 'name', 'email', 'role');

      return executives.map((exec: any) => ({
        id: exec.id,
        name: exec.name || 'Executive',
        email: exec.email,
        role: exec.role
      }));
    } catch (error) {
      console.error('Error getting executive approvers:', error);
      return [];
    }
  }

  public async determineEscalationTarget(approval: ApprovalRecord, escalationRules: EscalationRules): Promise<WorkflowUser | null> {
    try {
      // Simple escalation logic - in practice this would be more sophisticated
      const requiredApprovers = JSON.parse(approval.required_approvers || '[]');
      const firstApprover = requiredApprovers[0];

      if (firstApprover) {
        // Escalate to admins
        const admin = await db('users')
          .where('role', 'admin')
          .where('organization_id', approval.organization_id)
          .first();
        return admin;
      }

      return null;
    } catch (error) {
      console.error('Error determining escalation target:', error);
      return null;
    }
  }

  public async evaluateStageConditions(
    conditions: StageConditions,
    expenseData: ExpenseData,
    paymentMethod: PaymentMethod,
    user: WorkflowUser
  ): Promise<boolean> {
    // Evaluate whether stage conditions are met
    // This is a simplified implementation
    return true;
  }

  public async resolveApprovers(approverRules: any, user: WorkflowUser): Promise<Approver[]> {
    // Resolve approver rules to actual users
    // This is a simplified implementation
    return await this.getManagerApprovers(user);
  }

  public calculateRiskLevel(expenseDataId: string, stage: WorkflowStage, user: WorkflowUser): RiskLevel {
    // Calculate risk level based on various factors
    // This is a simplified implementation
    return 'low';
  }

  /**
   * Get pending approvals for a user
   */
  public async getPendingApprovalsForUser(userId: string, filters: WorkflowFilters = {}): Promise<PendingApproval[]> {
    try {
      let query = db('expense_approvals')
        .join('expense_data', 'expense_approvals.expense_data_id', 'expense_data.id')
        .join('expense_receipts', 'expense_data.receipt_id', 'expense_receipts.id')
        .leftJoin('users', 'expense_data.user_id', 'users.id')
        .where('expense_approvals.stage_status', 'pending')
        .where(function (this: any) {
          this.whereRaw('JSON_EXTRACT(expense_approvals.required_approvers, \'$[*].id\') LIKE ?', [`%"${userId}"%`])
            .orWhere('expense_approvals.delegated_to', userId);
        })
        .select([
          'expense_approvals.*',
          'expense_data.vendor_name',
          'expense_data.total_amount',
          'expense_data.description',
          'expense_data.transaction_date',
          'expense_receipts.original_filename',
          'users.first_name as submitter_first_name',
          'users.last_name as submitter_last_name',
          'users.email as submitter_email'
        ])
        .orderBy('expense_approvals.stage_deadline', 'asc');

      if (filters.organizationId) {
        query = query.where('expense_approvals.organization_id', filters.organizationId);
      }

      if (filters.urgent) {
        query = query.where('expense_approvals.stage_deadline', '<',
          new Date(Date.now() + (24 * 60 * 60 * 1000))); // Next 24 hours
      }

      return await query;
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to get pending approvals for user',
        error as Error,
        { userId, filters }
      );
    }
  }

  /**
   * Get approval history for an expense
   */
  public async getApprovalHistory(expenseDataId: string): Promise<ApprovalHistory[]> {
    try {
      return await db('expense_approvals')
        .where('expense_data_id', expenseDataId)
        .leftJoin('users as approver', 'expense_approvals.approver_id', 'approver.id')
        .leftJoin('users as delegated_to_user', 'expense_approvals.delegated_to', 'delegated_to_user.id')
        .leftJoin('users as delegated_by_user', 'expense_approvals.delegated_by', 'delegated_by_user.id')
        .select([
          'expense_approvals.*',
          'approver.first_name as approver_first_name',
          'approver.last_name as approver_last_name',
          'approver.email as approver_email',
          'delegated_to_user.first_name as delegated_to_first_name',
          'delegated_to_user.last_name as delegated_to_last_name',
          'delegated_by_user.first_name as delegated_by_first_name',
          'delegated_by_user.last_name as delegated_by_last_name'
        ])
        .orderBy('expense_approvals.stage_number', 'asc');
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorType.DATABASE_ERROR,
        'Failed to get approval history',
        error as Error,
        { expenseDataId }
      );
    }
  }
}

// Export types for external use
export type {
  IApprovalWorkflowService,
  WorkflowConfig,
  WorkflowStage,
  ExpenseData,
  PaymentMethod,
  WorkflowUser,
  ApprovalDecision,
  ApprovalRecord,
  WorkflowTemplate,
  PendingApproval,
  ApprovalHistory,
  Approver,
  WorkflowFilters,
  AutoApprovalThresholds,
  EscalationRules,
  StageConditions,
  NotificationConfig,
  WorkflowType,
  PaymentMethodType,
  ApprovalAction,
  ApprovalStatus,
  RiskLevel
} from './types/approvalWorkflow';

export { WorkflowError, WorkflowErrorType } from './types/approvalWorkflow';

// Create and export singleton instance
export const approvalWorkflowService = new ApprovalWorkflowService();