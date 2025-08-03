const approvalWorkflowService = require('../../src/services/approvalWorkflowService');
const db = require('../../src/config/database');

// Mock the notification functions since we don't have real notification service set up
jest.mock('../../src/services/approvalWorkflowService', () => {
  const actual = jest.requireActual('../../src/services/approvalWorkflowService');
  return {
    ...actual,
    sendApprovalNotification: jest.fn().mockResolvedValue(true),
    sendEscalationNotification: jest.fn().mockResolvedValue(true)
  };
});

describe('Approval Workflow Service', () => {
  let testUser, adminUser, managerUser;
  let testPaymentMethod;
  let testExpenseData;

  beforeAll(async () => {
    // Create test users
    const [user] = await db('users').insert({
      email: 'user@example.com',
      password_hash: 'hashed',
      role: 'referee',
      first_name: 'Test',
      last_name: 'User'
    }).returning('*');

    const [admin] = await db('users').insert({
      email: 'admin@example.com',
      password_hash: 'hashed', 
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    }).returning('*');

    const [manager] = await db('users').insert({
      email: 'manager@example.com',
      password_hash: 'hashed',
      role: 'manager',
      first_name: 'Manager',
      last_name: 'User'
    }).returning('*');

    testUser = user;
    adminUser = admin;
    managerUser = manager;

    // Create test payment method
    const [paymentMethod] = await db('payment_methods').insert({
      organization_id: user.id,
      name: 'Test Payment Method',
      type: 'person_reimbursement',
      is_active: true,
      requires_approval: true,
      auto_approval_limit: 100.00,
      created_by: admin.id,
      updated_by: admin.id
    }).returning('*');

    testPaymentMethod = paymentMethod;
  });

  afterAll(async () => {
    // Clean up test data
    await db('expense_approvals').where('organization_id', testUser.id).del();
    await db('expense_data').where('organization_id', testUser.id).del();
    await db('expense_receipts').where('organization_id', testUser.id).del();
    await db('payment_methods').where('organization_id', testUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id, managerUser.id]).del();
  });

  beforeEach(async () => {
    // Clean up approvals before each test
    await db('expense_approvals').where('organization_id', testUser.id).del();
    await db('expense_data').where('organization_id', testUser.id).del();
    await db('expense_receipts').where('organization_id', testUser.id).del();

    // Create test expense data for each test
    const [receipt] = await db('expense_receipts').insert({
      user_id: testUser.id,
      organization_id: testUser.id,
      original_filename: 'test-receipt.jpg',
      file_path: '/tmp/test-receipt.jpg',
      file_type: 'image',
      mime_type: 'image/jpeg',
      file_size: 1024,
      file_hash: 'test-hash',
      processing_status: 'processed'
    }).returning('*');

    const [expenseData] = await db('expense_data').insert({
      receipt_id: receipt.id,
      user_id: testUser.id,
      organization_id: testUser.id,
      vendor_name: 'Test Vendor',
      total_amount: 250.00,
      transaction_date: '2024-01-15',
      payment_method_id: testPaymentMethod.id
    }).returning('*');

    testExpenseData = expenseData;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('determineWorkflow', () => {
    test('should determine auto-approval for low-value expenses', async () => {
      const lowValueExpense = {
        id: testExpenseData.id,
        total_amount: 50.00
      };

      const paymentMethod = {
        type: 'person_reimbursement',
        requires_approval: false
      };

      const workflow = await approvalWorkflowService.determineWorkflow(
        lowValueExpense, 
        paymentMethod, 
        testUser
      );

      expect(workflow.autoApproved).toBe(true);
      expect(workflow.workflowType).toBe('auto_approval');
      expect(workflow.totalStages).toBe(0);
      expect(workflow.autoApprovalReason).toContain('under auto-approval limit');
    });

    test('should create default workflow for medium-value expenses', async () => {
      const mediumValueExpense = {
        id: testExpenseData.id,
        total_amount: 250.00
      };

      const paymentMethod = {
        type: 'person_reimbursement',
        requires_approval: true
      };

      const workflow = await approvalWorkflowService.determineWorkflow(
        mediumValueExpense,
        paymentMethod,
        testUser
      );

      expect(workflow.autoApproved).toBeUndefined();
      expect(workflow.workflowType).toBe('default');
      expect(workflow.totalStages).toBe(1); // Manager approval only
      expect(workflow.stages[0].stageName).toBe('Manager Approval');
    });

    test('should create multi-stage workflow for high-value expenses', async () => {
      const highValueExpense = {
        id: testExpenseData.id,
        total_amount: 1500.00
      };

      const paymentMethod = {
        type: 'direct_vendor',
        requires_approval: true
      };

      const workflow = await approvalWorkflowService.determineWorkflow(
        highValueExpense,
        paymentMethod,
        testUser
      );

      expect(workflow.totalStages).toBe(2); // Manager + Finance
      expect(workflow.stages[0].stageName).toBe('Manager Approval');
      expect(workflow.stages[1].stageName).toBe('Finance Review');
    });

    test('should create executive approval stage for very high-value expenses', async () => {
      const veryHighValueExpense = {
        id: testExpenseData.id,
        total_amount: 7500.00
      };

      const paymentMethod = {
        type: 'purchase_order',
        requires_approval: true
      };

      const workflow = await approvalWorkflowService.determineWorkflow(
        veryHighValueExpense,
        paymentMethod,
        testUser
      );

      expect(workflow.totalStages).toBe(3); // Manager + Finance + Executive
      expect(workflow.stages[2].stageName).toBe('Executive Approval');
      expect(workflow.stages[2].conditions.requiresBusinessCase).toBe(true);
    });
  });

  describe('createApprovalWorkflow', () => {
    test('should auto-approve expense when workflow allows', async () => {
      const autoApprovalWorkflow = {
        autoApproved: true,
        autoApprovalReason: 'Amount under threshold',
        workflowType: 'auto_approval'
      };

      const approvals = await approvalWorkflowService.createApprovalWorkflow(
        testExpenseData.id,
        autoApprovalWorkflow,
        testUser
      );

      expect(approvals).toHaveLength(1);
      expect(approvals[0].status).toBe('approved');
      expect(approvals[0].stage_status).toBe('approved');
      expect(approvals[0].approval_notes).toBe(autoApprovalWorkflow.autoApprovalReason);

      // Verify expense status updated
      const updatedExpense = await db('expense_data')
        .where('id', testExpenseData.id)
        .first();
      expect(updatedExpense.payment_status).toBe('approved');
    });

    test('should create multi-stage approval workflow', async () => {
      const multiStageWorkflow = {
        workflowId: null,
        workflowName: 'Test Workflow',
        workflowType: 'default',
        totalStages: 2,
        stages: [
          {
            stageNumber: 1,
            stageName: 'Manager Approval',
            requiredApprovers: [{ id: adminUser.id, name: 'Admin', role: 'admin' }],
            minimumApprovers: 1,
            deadlineHours: 48,
            escalationHours: 24,
            approvalLimit: 500.00,
            conditions: {}
          },
          {
            stageNumber: 2,
            stageName: 'Finance Review',
            requiredApprovers: [{ id: managerUser.id, name: 'Manager', role: 'manager' }],
            minimumApprovers: 1,
            deadlineHours: 72,
            escalationHours: 48,
            approvalLimit: null,
            conditions: { requiresBusinessJustification: true }
          }
        ],
        notificationConfig: { email: true, inApp: true }
      };

      const approvals = await approvalWorkflowService.createApprovalWorkflow(
        testExpenseData.id,
        multiStageWorkflow,
        testUser
      );

      expect(approvals).toHaveLength(2);
      
      // First stage should be active
      expect(approvals[0].stage_status).toBe('pending');
      expect(approvals[0].stage_started_at).toBeDefined();
      expect(approvals[0].stage_deadline).toBeDefined();
      
      // Second stage should be waiting
      expect(approvals[1].stage_status).toBe('pending');
      expect(approvals[1].stage_started_at).toBeNull();

      // Verify notification was sent for first stage
      expect(approvalWorkflowService.sendApprovalNotification).toHaveBeenCalledWith(approvals[0]);
    });

    test('should set appropriate risk levels and conditions', async () => {
      const workflowWithConditions = {
        workflowType: 'default',
        totalStages: 1,
        stages: [
          {
            stageNumber: 1,
            stageName: 'High Risk Review',
            requiredApprovers: [{ id: adminUser.id, name: 'Admin', role: 'admin' }],
            minimumApprovers: 1,
            deadlineHours: 24,
            escalationHours: 12,
            approvalLimit: 1000.00,
            conditions: {
              requiresBusinessCase: true,
              requiresCompetitiveQuotes: true,
              requiresReceiptValidation: true
            }
          }
        ],
        notificationConfig: { email: true }
      };

      const approvals = await approvalWorkflowService.createApprovalWorkflow(
        testExpenseData.id,
        workflowWithConditions,
        testUser
      );

      expect(approvals[0].approval_conditions).toBeDefined();
      expect(approvals[0].requires_additional_review).toBe(true);
      
      const conditions = JSON.parse(approvals[0].approval_conditions);
      expect(conditions.requiresBusinessCase).toBe(true);
      expect(conditions.requiresCompetitiveQuotes).toBe(true);
    });
  });

  describe('processApprovalDecision', () => {
    let testApproval;

    beforeEach(async () => {
      // Create a test approval record
      const [approval] = await db('expense_approvals').insert({
        expense_data_id: testExpenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 1,
        total_stages: 2,
        stage_status: 'pending',
        required_approvers: JSON.stringify([
          { id: adminUser.id, name: 'Admin User', role: 'admin' }
        ]),
        stage_started_at: new Date(),
        approval_limit: 500.00
      }).returning('*');

      testApproval = approval;
    });

    test('should approve expense successfully', async () => {
      const decision = {
        action: 'approved',
        notes: 'Expense approved for payment',
        approvedAmount: 250.00
      };

      const result = await approvalWorkflowService.processApprovalDecision(
        testApproval.id,
        decision,
        adminUser
      );

      expect(result.stage_status).toBe('approved');
      expect(result.approver_id).toBe(adminUser.id);
      expect(result.approval_notes).toBe(decision.notes);
      expect(result.approved_amount).toBe(decision.approvedAmount);
      expect(result.approved_at).toBeDefined();

      // Verify the approval was processed
      const updated = await db('expense_approvals')
        .where('id', testApproval.id)
        .first();
      expect(updated.stage_status).toBe('approved');
    });

    test('should reject expense successfully', async () => {
      const decision = {
        action: 'rejected',
        notes: 'Insufficient documentation',
        rejectionReason: 'Missing business justification'
      };

      const result = await approvalWorkflowService.processApprovalDecision(
        testApproval.id,
        decision,
        adminUser
      );

      expect(result.stage_status).toBe('rejected');
      expect(result.rejection_reason).toBe(decision.rejectionReason);
      expect(result.rejected_at).toBeDefined();

      // Verify expense status updated to rejected
      const expenseData = await db('expense_data')
        .where('id', testExpenseData.id)
        .first();
      expect(expenseData.payment_status).toBe('rejected');
    });

    test('should reject unauthorized approver', async () => {
      const decision = {
        action: 'approved',
        notes: 'Unauthorized approval attempt'
      };

      await expect(
        approvalWorkflowService.processApprovalDecision(
          testApproval.id,
          decision,
          testUser // Not in required approvers list
        )
      ).rejects.toThrow('User is not authorized to approve this expense');
    });

    test('should reject already processed approval', async () => {
      // First approval
      await approvalWorkflowService.processApprovalDecision(
        testApproval.id,
        { action: 'approved', notes: 'First approval' },
        adminUser
      );

      // Second approval attempt
      const decision = {
        action: 'approved',
        notes: 'Second approval attempt'
      };

      await expect(
        approvalWorkflowService.processApprovalDecision(
          testApproval.id,
          decision,
          adminUser
        )
      ).rejects.toThrow('Approval has already been processed');
    });
  });

  describe('progressWorkflow', () => {
    test('should complete workflow on final stage approval', async () => {
      const [approval] = await db('expense_approvals').insert({
        expense_data_id: testExpenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 2,
        total_stages: 2,
        stage_status: 'approved',
        approver_id: adminUser.id,
        approved_at: new Date()
      }).returning('*');

      await approvalWorkflowService.progressWorkflow(approval);

      // Verify expense is marked as approved
      const expenseData = await db('expense_data')
        .where('id', testExpenseData.id)
        .first();
      expect(expenseData.payment_status).toBe('approved');

      // Verify all approvals marked as approved
      const allApprovals = await db('expense_approvals')
        .where('expense_data_id', testExpenseData.id);
      allApprovals.forEach(approval => {
        expect(approval.status).toBe('approved');
      });
    });

    test('should start next stage on intermediate approval', async () => {
      // Create two-stage workflow
      const approvals = await Promise.all([
        db('expense_approvals').insert({
          expense_data_id: testExpenseData.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          stage_number: 1,
          total_stages: 2,
          stage_status: 'approved',
          approver_id: adminUser.id,
          approved_at: new Date()
        }).returning('*'),
        db('expense_approvals').insert({
          expense_data_id: testExpenseData.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          stage_number: 2,
          total_stages: 2,
          stage_status: 'pending',
          escalation_hours: 48
        }).returning('*')
      ]);

      await approvalWorkflowService.progressWorkflow(approvals[0][0]);

      // Verify second stage was started
      const nextStage = await db('expense_approvals')
        .where('expense_data_id', testExpenseData.id)
        .where('stage_number', 2)
        .first();
      
      expect(nextStage.stage_status).toBe('pending');
      expect(nextStage.stage_started_at).toBeDefined();
      expect(nextStage.stage_deadline).toBeDefined();

      // Verify notification was sent
      expect(approvalWorkflowService.sendApprovalNotification).toHaveBeenCalled();
    });
  });

  describe('delegateApproval', () => {
    let testApproval;

    beforeEach(async () => {
      const [approval] = await db('expense_approvals').insert({
        expense_data_id: testExpenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 1,
        total_stages: 1,
        stage_status: 'pending',
        required_approvers: JSON.stringify([
          { id: adminUser.id, name: 'Admin User', role: 'admin' }
        ])
      }).returning('*');

      testApproval = approval;
    });

    test('should delegate approval successfully', async () => {
      const result = await approvalWorkflowService.delegateApproval(
        testApproval.id,
        managerUser.id,
        adminUser.id,
        'Delegating due to vacation'
      );

      expect(result.delegated_to).toBe(managerUser.id);
      expect(result.delegated_by).toBe(adminUser.id);
      expect(result.delegation_reason).toBe('Delegating due to vacation');
      expect(result.delegated_at).toBeDefined();
      expect(result.stage_status).toBe('pending'); // Reset for delegate

      // Verify delegate was added to required approvers
      const requiredApprovers = JSON.parse(result.required_approvers);
      const delegateApprover = requiredApprovers.find(a => a.id === managerUser.id);
      expect(delegateApprover).toBeDefined();
      expect(delegateApprover.delegated).toBe(true);

      // Verify notification was sent to delegate
      expect(approvalWorkflowService.sendApprovalNotification).toHaveBeenCalled();
    });
  });

  describe('handleEscalations', () => {
    beforeEach(async () => {
      // Create overdue approval
      const pastDeadline = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      
      await db('expense_approvals').insert({
        expense_data_id: testExpenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 1,
        total_stages: 1,
        stage_status: 'pending',
        stage_deadline: pastDeadline,
        required_approvers: JSON.stringify([
          { id: adminUser.id, name: 'Admin User', role: 'admin' }
        ]),
        approval_conditions: JSON.stringify({
          escalationRules: { escalateTo: 'senior_manager' }
        })
      });
    });

    test('should escalate overdue approvals', async () => {
      const escalatedCount = await approvalWorkflowService.handleEscalations();

      expect(escalatedCount).toBe(1);

      // Verify approval was escalated
      const escalatedApproval = await db('expense_approvals')
        .where('expense_data_id', testExpenseData.id)
        .first();
      
      expect(escalatedApproval.stage_status).toBe('escalated');
      expect(escalatedApproval.escalated_at).toBeDefined();
      expect(escalatedApproval.escalation_reason).toContain('overdue');

      // Verify escalation notification was sent
      expect(approvalWorkflowService.sendEscalationNotification).toHaveBeenCalled();
    });

    test('should not escalate already escalated approvals', async () => {
      // First escalation
      await approvalWorkflowService.handleEscalations();

      // Second escalation attempt
      const escalatedCount = await approvalWorkflowService.handleEscalations();

      expect(escalatedCount).toBe(0);
    });
  });

  describe('getPendingApprovalsForUser', () => {
    beforeEach(async () => {
      // Create pending approvals for admin user
      await Promise.all([
        db('expense_approvals').insert({
          expense_data_id: testExpenseData.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          stage_number: 1,
          total_stages: 1,
          stage_status: 'pending',
          required_approvers: JSON.stringify([
            { id: adminUser.id, name: 'Admin User', role: 'admin' }
          ]),
          stage_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
        }),
        db('expense_approvals').insert({
          expense_data_id: testExpenseData.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          stage_number: 1,
          total_stages: 1,
          stage_status: 'pending',
          required_approvers: JSON.stringify([
            { id: adminUser.id, name: 'Admin User', role: 'admin' }
          ]),
          stage_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now (urgent)
        })
      ]);
    });

    test('should get pending approvals for user', async () => {
      const pendingApprovals = await approvalWorkflowService.getPendingApprovalsForUser(
        adminUser.id,
        { organizationId: testUser.id }
      );

      expect(pendingApprovals).toHaveLength(2);
      pendingApprovals.forEach(approval => {
        expect(approval.stage_status).toBe('pending');
        expect(approval.vendor_name).toBe('Test Vendor');
      });
    });

    test('should filter urgent approvals', async () => {
      const urgentApprovals = await approvalWorkflowService.getPendingApprovalsForUser(
        adminUser.id,
        { organizationId: testUser.id, urgent: true }
      );

      expect(urgentApprovals).toHaveLength(1);
      expect(new Date(urgentApprovals[0].stage_deadline).getTime())
        .toBeLessThan(Date.now() + 24 * 60 * 60 * 1000);
    });

    test('should return empty array for user with no pending approvals', async () => {
      const pendingApprovals = await approvalWorkflowService.getPendingApprovalsForUser(
        managerUser.id,
        { organizationId: testUser.id }
      );

      expect(pendingApprovals).toHaveLength(0);
    });
  });

  describe('getApprovalHistory', () => {
    beforeEach(async () => {
      // Create approval history
      await Promise.all([
        db('expense_approvals').insert({
          expense_data_id: testExpenseData.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          stage_number: 1,
          total_stages: 2,
          stage_status: 'approved',
          approver_id: adminUser.id,
          approval_notes: 'First stage approved',
          approved_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }),
        db('expense_approvals').insert({
          expense_data_id: testExpenseData.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          stage_number: 2,
          total_stages: 2,
          stage_status: 'pending',
          required_approvers: JSON.stringify([
            { id: managerUser.id, name: 'Manager User', role: 'manager' }
          ])
        })
      ]);
    });

    test('should get complete approval history', async () => {
      const history = await approvalWorkflowService.getApprovalHistory(testExpenseData.id);

      expect(history).toHaveLength(2);
      expect(history[0].stage_number).toBe(1);
      expect(history[0].stage_status).toBe('approved');
      expect(history[0].approver_first_name).toBe('Admin');
      expect(history[1].stage_number).toBe(2);
      expect(history[1].stage_status).toBe('pending');
    });

    test('should include delegation information if present', async () => {
      // Add delegation info to first approval
      await db('expense_approvals')
        .where('expense_data_id', testExpenseData.id)
        .where('stage_number', 1)
        .update({
          delegated_to: managerUser.id,
          delegated_by: adminUser.id,
          delegation_reason: 'Test delegation'
        });

      const history = await approvalWorkflowService.getApprovalHistory(testExpenseData.id);

      const delegatedApproval = history.find(h => h.stage_number === 1);
      expect(delegatedApproval.delegated_to).toBe(managerUser.id);
      expect(delegatedApproval.delegated_to_first_name).toBe('Manager');
      expect(delegatedApproval.delegated_by_first_name).toBe('Admin');
    });
  });

  describe('Auto-approval thresholds', () => {
    test('should use correct thresholds for different payment method types', async () => {
      const testCases = [
        { type: 'person_reimbursement', amount: 50, shouldAutoApprove: true },
        { type: 'person_reimbursement', amount: 60, shouldAutoApprove: false },
        { type: 'credit_card', amount: 200, shouldAutoApprove: true },
        { type: 'credit_card', amount: 250, shouldAutoApprove: false },
        { type: 'purchase_order', amount: 1, shouldAutoApprove: false },
        { type: 'direct_vendor', amount: 100, shouldAutoApprove: true },
        { type: 'direct_vendor', amount: 150, shouldAutoApprove: false }
      ];

      for (const testCase of testCases) {
        const expenseData = { id: testExpenseData.id, total_amount: testCase.amount };
        const paymentMethod = { type: testCase.type, requires_approval: false };

        const workflow = await approvalWorkflowService.determineWorkflow(
          expenseData,
          paymentMethod,
          testUser
        );

        if (testCase.shouldAutoApprove) {
          expect(workflow.autoApproved).toBe(true);
        } else {
          expect(workflow.autoApproved).toBeUndefined();
          expect(workflow.stages.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Error handling', () => {
    test('should handle non-existent approval ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        approvalWorkflowService.processApprovalDecision(
          fakeId,
          { action: 'approved' },
          adminUser
        )
      ).rejects.toThrow('Approval record not found');
    });

    test('should handle invalid user in delegation', async () => {
      const [approval] = await db('expense_approvals').insert({
        expense_data_id: testExpenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 1,
        total_stages: 1,
        stage_status: 'pending',
        required_approvers: JSON.stringify([
          { id: adminUser.id, name: 'Admin User', role: 'admin' }
        ])
      }).returning('*');

      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      
      const result = await approvalWorkflowService.delegateApproval(
        approval.id,
        fakeUserId,
        adminUser.id,
        'Test delegation'
      );

      // Should handle gracefully - delegate not found, but approval updated
      expect(result.delegated_to).toBe(fakeUserId);
      expect(result.delegated_by).toBe(adminUser.id);
    });

    test('should handle workflow progression with missing next stage', async () => {
      const [approval] = await db('expense_approvals').insert({
        expense_data_id: testExpenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 1,
        total_stages: 2,
        stage_status: 'approved',
        approver_id: adminUser.id,
        approved_at: new Date()
      }).returning('*');

      // No second stage created - should handle gracefully
      await expect(
        approvalWorkflowService.progressWorkflow(approval)
      ).resolves.not.toThrow();
    });
  });
});