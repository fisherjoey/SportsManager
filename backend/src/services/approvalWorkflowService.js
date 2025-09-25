const db = require('../config/database');
const crypto = require('crypto');

/**
 * Enhanced Approval Workflow Service
 * 
 * Handles multi-stage approval routing based on expense amount, payment method, and category.
 * Supports auto-approval, escalation handling, delegation, and comprehensive audit trails.
 */
class ApprovalWorkflowService {
  constructor() {
    this.ESCALATION_TIMEOUT_HOURS = 48;
    this.REMINDER_FREQUENCY_HOURS = 24;
    this.MAX_REMINDERS = 3;
    
    // Auto-approval thresholds by payment method type
    this.AUTO_APPROVAL_THRESHOLDS = {
      'person_reimbursement': 50.00,
      'credit_card': 200.00,
      'purchase_order': 0.00, // Always requires approval
      'direct_vendor': 100.00
    };
    
    // High-value thresholds requiring multi-stage approval
    this.HIGH_VALUE_THRESHOLD = 1000.00;
  }

  /**
   * Determine the appropriate approval workflow for an expense
   * @param {Object} expenseData - The expense data
   * @param {Object} paymentMethod - The payment method details
   * @param {Object} user - The user submitting the expense
   * @returns {Promise<Object>} Workflow configuration
   */
  async determineWorkflow(expenseData, paymentMethod, user) {
    const organizationId = user.organization_id || user.id;
    const amount = parseFloat(expenseData.total_amount || 0);
    
    console.log(`Determining workflow for expense: ${expenseData.id}, amount: $${amount}, payment method: ${paymentMethod.type}`);
    
    // For now, always use default workflow logic
    // Custom workflows will be implemented in a future version
    return await this.buildDefaultWorkflow(expenseData, paymentMethod, user);
  }

  /**
   * Build workflow from a custom template
   * @param {Object} template - The workflow template
   * @param {Object} expenseData - The expense data
   * @param {Object} paymentMethod - The payment method details
   * @param {Object} user - The user submitting the expense
   * @returns {Promise<Object>} Workflow configuration
   */
  async buildWorkflowFromTemplate(template, expenseData, paymentMethod, user) {
    const workflowStages = JSON.parse(template.workflow_stages || '[]');
    const amount = parseFloat(expenseData.total_amount || 0);
    
    const stages = [];
    
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
  }

  /**
   * Build default workflow based on business rules
   * @param {Object} expenseData - The expense data
   * @param {Object} paymentMethod - The payment method details
   * @param {Object} user - The user submitting the expense
   * @returns {Promise<Object>} Workflow configuration
   */
  async buildDefaultWorkflow(expenseData, paymentMethod, user) {
    const amount = parseFloat(expenseData.total_amount || 0);
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

    const stages = [];
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
  }

  /**
   * Create approval workflow for an expense
   * @param {string} expenseDataId - The expense data ID
   * @param {Object} workflow - The workflow configuration
   * @param {Object} user - The user submitting the expense
   * @returns {Promise<Array>} Created approval records
   */
  async createApprovalWorkflow(expenseDataId, workflow, user) {
    if (workflow.autoApproved) {
      // Auto-approve the expense
      return await this.autoApproveExpense(expenseDataId, workflow, user);
    }

    const approvalRecords = [];
    
    await db.transaction(async (trx) => {
      for (const stage of workflow.stages) {
        const approvalData = {
          expense_data_id: expenseDataId,
          user_id: user.id,
          organization_id: user.organization_id || user.id,
          workflow_id: workflow.workflowId,
          stage_number: stage.stageNumber,
          total_stages: workflow.totalStages,
          is_parallel_approval: workflow.allowParallelApproval,
          required_approvers: JSON.stringify(stage.requiredApprovers),
          stage_status: stage.stageNumber === 1 ? 'pending' : 'pending',
          stage_started_at: stage.stageNumber === 1 ? new Date() : null,
          stage_deadline: stage.stageNumber === 1 ? 
            new Date(Date.now() + (stage.deadlineHours * 60 * 60 * 1000)) : null,
          escalation_hours: stage.escalationHours,
          approval_conditions: JSON.stringify(stage.conditions),
          approval_limit: stage.approvalLimit,
          notification_settings: JSON.stringify(workflow.notificationConfig),
          risk_level: this.calculateRiskLevel(expenseDataId, stage, user),
          requires_additional_review: stage.conditions.requiresBusinessCase || 
                                     stage.conditions.requiresCompetitiveQuotes || false
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
  }

  /**
   * Auto-approve an expense
   * @param {string} expenseDataId - The expense data ID
   * @param {Object} workflow - The workflow configuration
   * @param {Object} user - The user submitting the expense
   * @returns {Promise<Array>} Auto-approval record
   */
  async autoApproveExpense(expenseDataId, workflow, user) {
    const approvalData = {
      expense_data_id: expenseDataId,
      user_id: user.id,
      organization_id: user.organization_id || user.id,
      status: 'approved',
      stage_status: 'approved',
      stage_number: 1,
      total_stages: 1,
      approval_notes: workflow.autoApprovalReason,
      approver_id: null, // System auto-approval
      approved_at: new Date(),
      stage_started_at: new Date(),
      conditions_met: true,
      notification_settings: JSON.stringify({ autoApproval: true }),
      risk_level: 'low'
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
  }

  /**
   * Process an approval decision
   * @param {string} approvalId - The approval record ID
   * @param {Object} decision - The approval decision
   * @param {Object} approver - The user making the decision
   * @returns {Promise<Object>} Updated approval record
   */
  async processApprovalDecision(approvalId, decision, approver) {
    const { action, notes, approvedAmount, rejectionReason, requiredInformation } = decision;
    
    const approval = await db('expense_approvals')
      .where('id', approvalId)
      .first();

    if (!approval) {
      throw new Error('Approval record not found');
    }

    if (approval.stage_status !== 'pending') {
      throw new Error('Approval has already been processed');
    }

    // Validate approver has permission
    const requiredApprovers = JSON.parse(approval.required_approvers || '[]');
    const approverIds = requiredApprovers.map(a => a.id);
    
    if (!approverIds.includes(approver.id)) {
      throw new Error('User is not authorized to approve this expense');
    }

    const updateData = {
      stage_status: action,
      approver_id: approver.id,
      approval_notes: notes,
      approved_amount: approvedAmount || approval.requested_amount,
      rejection_reason: rejectionReason,
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
  }

  /**
   * Progress workflow to next stage or complete
   * @param {Object} approval - The approved stage
   * @returns {Promise<void>}
   */
  async progressWorkflow(approval) {
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
   * @param {Object} approval - The final approval stage
   * @returns {Promise<void>}
   */
  async completeWorkflow(approval) {
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
  }

  /**
   * Start the next stage of approval
   * @param {Object} currentApproval - The current completed stage
   * @returns {Promise<void>}
   */
  async startNextStage(currentApproval) {
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
  }

  /**
   * Reject the entire workflow
   * @param {Object} approval - The rejected stage
   * @returns {Promise<void>}
   */
  async rejectWorkflow(approval) {
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
  }

  /**
   * Delegate approval to another user
   * @param {string} approvalId - The approval record ID
   * @param {string} delegateTo - User ID to delegate to
   * @param {string} delegatedBy - User ID who is delegating
   * @param {string} reason - Reason for delegation
   * @returns {Promise<Object>} Updated approval record
   */
  async delegateApproval(approvalId, delegateTo, delegatedBy, reason) {
    const updateData = {
      delegated_to: delegateTo,
      delegated_by: delegatedBy,
      delegated_at: new Date(),
      delegation_reason: reason,
      stage_status: 'delegated',
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
    
    if (delegateUser && !requiredApprovers.find(a => a.id === delegateTo)) {
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
  }

  /**
   * Handle escalation of overdue approvals
   * @returns {Promise<number>} Number of approvals escalated
   */
  async handleEscalations() {
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
  }

  /**
   * Escalate a specific approval
   * @param {Object} approval - The approval to escalate
   * @returns {Promise<void>}
   */
  async escalateApproval(approval) {
    const escalationRules = JSON.parse(approval.approval_conditions || '{}').escalationRules || {};
    const escalationTarget = await this.determineEscalationTarget(approval, escalationRules);

    if (!escalationTarget) {
      console.log(`No escalation target found for approval ${approval.id}`);
      return;
    }

    await db('expense_approvals')
      .where('id', approval.id)
      .update({
        escalated_to: escalationTarget.id,
        escalated_at: new Date(),
        escalation_reason: `Approval overdue by ${Math.floor((Date.now() - new Date(approval.stage_deadline)) / (1000 * 60 * 60))} hours`,
        stage_status: 'escalated',
        updated_at: new Date()
      });

    // Send escalation notification
    await this.sendEscalationNotification(approval, escalationTarget);
    
    console.log(`Escalated approval ${approval.id} to ${escalationTarget.id}`);
  }

  /**
   * Send approval notification
   * @param {Object} approval - The approval record
   * @param {Object} targetUser - Optional specific user to notify
   * @returns {Promise<void>}
   */
  async sendApprovalNotification(approval, targetUser = null) {
    // This would integrate with your notification system
    // For now, just log the notification
    const requiredApprovers = JSON.parse(approval.required_approvers || '[]');
    const notificationTargets = targetUser ? [targetUser] : requiredApprovers;
    
    console.log(`Sending approval notification for expense ${approval.expense_data_id} to:`, 
      notificationTargets.map(u => u.email || u.id));
    
    // TODO: Integrate with email service, Slack, etc.
  }

  /**
   * Send escalation notification
   * @param {Object} approval - The approval record
   * @param {Object} escalationTarget - The user to escalate to
   * @returns {Promise<void>}
   */
  async sendEscalationNotification(approval, escalationTarget) {
    console.log(`Sending escalation notification for expense ${approval.expense_data_id} to: ${escalationTarget.email}`);
    // TODO: Integrate with notification system
  }

  // Helper methods for getting approvers
  async getManagerApprovers(user) {
    // Get user's direct manager(s) - simplified for testing
    const managers = await db('users')
      .where('role', 'admin') // Use admin as managers for now
      .select('id', 'name', 'email', 'role');

    return managers.map(manager => ({
      id: manager.id,
      name: manager.name || 'Manager',
      email: manager.email,
      role: manager.role
    }));
  }

  async getFinanceApprovers(user) {
    const financeUsers = await db('users')
      .whereIn('role', ['admin'])
      .select('id', 'name', 'email', 'role');

    return financeUsers.map(financeUser => ({
      id: financeUser.id,
      name: financeUser.name || 'Finance User',
      email: financeUser.email,
      role: financeUser.role
    }));
  }

  async getExecutiveApprovers(user) {
    const executives = await db('users')
      .whereIn('role', ['admin'])
      .select('id', 'name', 'email', 'role');

    return executives.map(exec => ({
      id: exec.id,
      name: exec.name || 'Executive',
      email: exec.email,
      role: exec.role
    }));
  }

  async determineEscalationTarget(approval, escalationRules) {
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
  }

  async evaluateStageConditions(conditions, expenseData, paymentMethod, user) {
    // Evaluate whether stage conditions are met
    // This is a simplified implementation
    return true;
  }

  async resolveApprovers(approverRules, user) {
    // Resolve approver rules to actual users
    // This is a simplified implementation
    return await this.getManagerApprovers(user);
  }

  calculateRiskLevel(expenseDataId, stage, user) {
    // Calculate risk level based on various factors
    // This is a simplified implementation
    return 'low';
  }

  /**
   * Get pending approvals for a user
   * @param {string} userId - The user ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Pending approvals
   */
  async getPendingApprovalsForUser(userId, filters = {}) {
    let query = db('expense_approvals')
      .join('expense_data', 'expense_approvals.expense_data_id', 'expense_data.id')
      .join('expense_receipts', 'expense_data.receipt_id', 'expense_receipts.id')
      .leftJoin('users', 'expense_data.user_id', 'users.id')
      .where('expense_approvals.stage_status', 'pending')
      .where(function() {
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
  }

  /**
   * Get approval history for an expense
   * @param {string} expenseDataId - The expense data ID
   * @returns {Promise<Array>} Approval history
   */
  async getApprovalHistory(expenseDataId) {
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
  }
}

module.exports = new ApprovalWorkflowService();