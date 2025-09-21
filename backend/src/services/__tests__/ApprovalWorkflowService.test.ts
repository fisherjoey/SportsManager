/**
 * @fileoverview Unit tests for ApprovalWorkflowService
 * @requires jest
 * @requires ../ApprovalWorkflowService
 *
 * Test Coverage:
 * - Workflow determination and configuration
 * - Default and template-based workflow building
 * - Approval workflow creation and processing
 * - Multi-stage approval progression
 * - Auto-approval handling
 * - Delegation and escalation mechanisms
 * - Notification systems
 * - Query and reporting functionality
 * - Error handling and edge cases
 *
 * @author Claude Assistant
 * @date 2025-01-23
 */

import { ApprovalWorkflowService } from '../ApprovalWorkflowService';
import type {
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
  WorkflowFilters
} from '../ApprovalWorkflowService';

// Mock dependencies
jest.mock('../../config/database', () => {
  const mockKnex = {
    transaction: jest.fn(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    first: jest.fn(),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
  };

  // Make mockKnex callable as a function
  const callableMockKnex = jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    first: jest.fn(),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    transaction: jest.fn(),
  }));

  Object.assign(callableMockKnex, mockKnex);
  return callableMockKnex;
});

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService;
  let mockDb: any;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  // Mock data
  const mockUser: WorkflowUser = {
    id: 'user-123',
    organization_id: 'org-456',
    first_name: 'John',
    last_name: 'Doe',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'employee'
  };

  const mockExpenseData: ExpenseData = {
    id: 'expense-789',
    vendor_name: 'Test Vendor',
    total_amount: 150.00,
    description: 'Business lunch',
    transaction_date: new Date('2025-01-15'),
    user_id: 'user-123',
    organization_id: 'org-456'
  };

  const mockPaymentMethod: PaymentMethod = {
    id: 'payment-101',
    type: 'credit_card',
    requires_approval: false,
    approval_limit: 200.00,
    name: 'Corporate Credit Card'
  };

  const mockApprovers: Approver[] = [
    {
      id: 'manager-123',
      name: 'Jane Manager',
      email: 'jane.manager@example.com',
      role: 'manager'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = require('../../config/database');
    service = new ApprovalWorkflowService();

    // Spy on console to test logging behavior
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };

    // Mock database transaction
    mockDb.transaction.mockImplementation(async (callback: any) => {
      const trx = mockDb;
      return await callback(trx);
    });
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Configuration and Constants', () => {
    it('should initialize with correct constants', () => {
      expect(service.ESCALATION_TIMEOUT_HOURS).toBe(48);
      expect(service.REMINDER_FREQUENCY_HOURS).toBe(24);
      expect(service.MAX_REMINDERS).toBe(3);
      expect(service.HIGH_VALUE_THRESHOLD).toBe(1000.00);
      expect(service.AUTO_APPROVAL_THRESHOLDS).toEqual({
        person_reimbursement: 50.00,
        credit_card: 200.00,
        purchase_order: 0.00,
        direct_vendor: 100.00
      });
    });
  });

  describe('Workflow Determination', () => {
    describe('determineWorkflow', () => {
      it('should determine workflow for expense', async () => {
        jest.spyOn(service, 'buildDefaultWorkflow').mockResolvedValue({
          workflowId: null,
          workflowName: 'Default Approval Workflow',
          workflowType: 'default',
          totalStages: 1,
          stages: []
        } as WorkflowConfig);

        const result = await service.determineWorkflow(mockExpenseData, mockPaymentMethod, mockUser);

        expect(result.workflowName).toBe('Default Approval Workflow');
        expect(service.buildDefaultWorkflow).toHaveBeenCalledWith(
          mockExpenseData,
          mockPaymentMethod,
          mockUser
        );
        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('Determining workflow for expense')
        );
      });
    });

    describe('buildDefaultWorkflow', () => {
      it('should build auto-approval workflow for small amounts', async () => {
        const smallExpense = { ...mockExpenseData, total_amount: 25.00 };

        const result = await service.buildDefaultWorkflow(
          smallExpense,
          mockPaymentMethod,
          mockUser
        );

        expect(result).toEqual({
          workflowId: null,
          workflowName: 'Auto-Approval',
          workflowType: 'auto_approval',
          totalStages: 0,
          stages: [],
          autoApproved: true,
          autoApprovalReason: 'Amount $25 is under auto-approval limit of $200'
        });
      });

      it('should build manager approval workflow for medium amounts', async () => {
        jest.spyOn(service, 'getManagerApprovers').mockResolvedValue(mockApprovers);

        const result = await service.buildDefaultWorkflow(
          mockExpenseData,
          mockPaymentMethod,
          mockUser
        );

        expect(result.workflowType).toBe('default');
        expect(result.totalStages).toBe(1);
        expect(result.stages).toHaveLength(1);
        expect(result.stages[0].stageName).toBe('Manager Approval');
        expect(result.stages[0].requiredApprovers).toEqual(mockApprovers);
      });

      it('should build multi-stage workflow for high-value expenses', async () => {
        const highValueExpense = { ...mockExpenseData, total_amount: 2500.00 };

        jest.spyOn(service, 'getManagerApprovers').mockResolvedValue(mockApprovers);
        jest.spyOn(service, 'getFinanceApprovers').mockResolvedValue([
          {
            id: 'finance-123',
            name: 'Finance User',
            email: 'finance@example.com',
            role: 'finance'
          }
        ]);

        const result = await service.buildDefaultWorkflow(
          highValueExpense,
          mockPaymentMethod,
          mockUser
        );

        expect(result.totalStages).toBe(2);
        expect(result.stages[0].stageName).toBe('Manager Approval');
        expect(result.stages[1].stageName).toBe('Finance Review');
      });

      it('should build executive approval workflow for very high amounts', async () => {
        const veryHighExpense = { ...mockExpenseData, total_amount: 7500.00 };

        jest.spyOn(service, 'getManagerApprovers').mockResolvedValue(mockApprovers);
        jest.spyOn(service, 'getFinanceApprovers').mockResolvedValue([]);
        jest.spyOn(service, 'getExecutiveApprovers').mockResolvedValue([
          {
            id: 'exec-123',
            name: 'Executive',
            email: 'exec@example.com',
            role: 'executive'
          }
        ]);

        const result = await service.buildDefaultWorkflow(
          veryHighExpense,
          mockPaymentMethod,
          mockUser
        );

        expect(result.totalStages).toBe(3);
        expect(result.stages[2].stageName).toBe('Executive Approval');
        expect(result.stages[2].allowDelegation).toBe(false);
      });

      it('should handle purchase orders requiring approval', async () => {
        const purchaseOrderPayment = { ...mockPaymentMethod, type: 'purchase_order' as const };
        const smallExpense = { ...mockExpenseData, total_amount: 10.00 };

        jest.spyOn(service, 'getManagerApprovers').mockResolvedValue(mockApprovers);

        const result = await service.buildDefaultWorkflow(
          smallExpense,
          purchaseOrderPayment,
          mockUser
        );

        expect(result.totalStages).toBe(1);
        expect(result.stages[0].stageName).toBe('Manager Approval');
      });
    });

    describe('buildWorkflowFromTemplate', () => {
      const mockTemplate: WorkflowTemplate = {
        id: 'template-123',
        name: 'Custom Approval Template',
        workflow_type: 'template',
        workflow_stages: JSON.stringify([
          {
            name: 'Department Manager',
            description: 'Department manager approval',
            minimum_approvers: 1,
            requires_all_approvers: false,
            approval_limit: 1000,
            can_modify_amount: true,
            stage_deadline_hours: 48,
            escalation_hours: 24,
            approver_rules: { type: 'manager' },
            conditions: { requiresBusinessJustification: true }
          }
        ]),
        default_escalation_hours: 48,
        allow_delegation: true,
        allow_parallel_approval: false,
        notification_config: JSON.stringify({ email: true }),
        send_reminders: true,
        reminder_frequency_hours: 24,
        max_reminders: 3,
        is_active: true,
        organization_id: 'org-456',
        created_at: new Date(),
        updated_at: new Date()
      };

      it('should build workflow from template', async () => {
        jest.spyOn(service, 'evaluateStageConditions').mockResolvedValue(true);
        jest.spyOn(service, 'resolveApprovers').mockResolvedValue(mockApprovers);

        const result = await service.buildWorkflowFromTemplate(
          mockTemplate,
          mockExpenseData,
          mockPaymentMethod,
          mockUser
        );

        expect(result.workflowId).toBe('template-123');
        expect(result.workflowName).toBe('Custom Approval Template');
        expect(result.workflowType).toBe('template');
        expect(result.totalStages).toBe(1);
        expect(result.stages[0].stageName).toBe('Department Manager');
      });

      it('should skip stages that do not meet conditions', async () => {
        jest.spyOn(service, 'evaluateStageConditions').mockResolvedValue(false);

        const result = await service.buildWorkflowFromTemplate(
          mockTemplate,
          mockExpenseData,
          mockPaymentMethod,
          mockUser
        );

        expect(result.totalStages).toBe(0);
        expect(result.stages).toHaveLength(0);
      });
    });
  });

  describe('Approval Workflow Creation', () => {
    describe('createApprovalWorkflow', () => {
      it('should handle auto-approved workflow', async () => {
        const autoApprovedWorkflow: WorkflowConfig = {
          workflowId: null,
          workflowName: 'Auto-Approval',
          workflowType: 'auto_approval',
          totalStages: 0,
          stages: [],
          autoApproved: true,
          autoApprovalReason: 'Amount under threshold'
        };

        const mockApprovalRecord = {
          id: 'approval-123',
          expense_data_id: 'expense-789',
          status: 'approved'
        };

        jest.spyOn(service, 'autoApproveExpense').mockResolvedValue([mockApprovalRecord] as any);

        const result = await service.createApprovalWorkflow(
          'expense-789',
          autoApprovedWorkflow,
          mockUser
        );

        expect(service.autoApproveExpense).toHaveBeenCalledWith(
          'expense-789',
          autoApprovedWorkflow,
          mockUser
        );
        expect(result).toEqual([mockApprovalRecord]);
      });

      it('should create multi-stage approval workflow', async () => {
        const workflow: WorkflowConfig = {
          workflowId: null,
          workflowName: 'Default Workflow',
          workflowType: 'default',
          totalStages: 2,
          stages: [
            {
              stageNumber: 1,
              stageName: 'Manager Approval',
              description: 'Manager approval required',
              requiredApprovers: mockApprovers,
              minimumApprovers: 1,
              requiresAllApprovers: false,
              approvalLimit: 500,
              canModifyAmount: true,
              deadlineHours: 48,
              escalationHours: 24,
              escalationRules: {},
              allowDelegation: true,
              conditions: {}
            },
            {
              stageNumber: 2,
              stageName: 'Finance Review',
              description: 'Finance review',
              requiredApprovers: [],
              minimumApprovers: 1,
              requiresAllApprovers: false,
              approvalLimit: null,
              canModifyAmount: true,
              deadlineHours: 72,
              escalationHours: 48,
              escalationRules: {},
              allowDelegation: true,
              conditions: {}
            }
          ],
          notificationConfig: { email: true }
        };

        const mockInsertResult = { id: 'approval-123' };
        mockDb().insert().returning.mockResolvedValue([mockInsertResult]);

        jest.spyOn(service, 'calculateRiskLevel').mockReturnValue('low');
        jest.spyOn(service, 'sendApprovalNotification').mockResolvedValue();

        const result = await service.createApprovalWorkflow(
          'expense-789',
          workflow,
          mockUser
        );

        expect(mockDb.transaction).toHaveBeenCalled();
        expect(result).toHaveLength(2);
        expect(service.sendApprovalNotification).toHaveBeenCalled();
        expect(consoleSpy.log).toHaveBeenCalledWith(
          'Created 2 approval stages for expense expense-789'
        );
      });
    });

    describe('autoApproveExpense', () => {
      it('should auto-approve expense and update status', async () => {
        const workflow: WorkflowConfig = {
          workflowId: null,
          workflowName: 'Auto-Approval',
          workflowType: 'auto_approval',
          totalStages: 0,
          stages: [],
          autoApproved: true,
          autoApprovalReason: 'Amount under threshold'
        };

        const mockApprovalRecord = { id: 'approval-123' };
        mockDb().insert().returning.mockResolvedValue([mockApprovalRecord]);
        mockDb().where().update.mockResolvedValue(1);

        const result = await service.autoApproveExpense(
          'expense-789',
          workflow,
          mockUser
        );

        expect(result).toEqual([mockApprovalRecord]);
        expect(mockDb().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            expense_data_id: 'expense-789',
            status: 'approved',
            stage_status: 'approved',
            approval_notes: 'Amount under threshold'
          })
        );
        expect(mockDb().where().update).toHaveBeenCalledWith({
          payment_status: 'approved',
          updated_at: expect.any(Date)
        });
      });
    });
  });

  describe('Approval Decision Processing', () => {
    describe('processApprovalDecision', () => {
      const mockApproval: ApprovalRecord = {
        id: 'approval-123',
        expense_data_id: 'expense-789',
        user_id: 'user-123',
        organization_id: 'org-456',
        workflow_id: null,
        stage_number: 1,
        total_stages: 2,
        is_parallel_approval: false,
        required_approvers: JSON.stringify(mockApprovers),
        stage_status: 'pending',
        stage_started_at: new Date(),
        stage_deadline: new Date(),
        escalation_hours: 24,
        approval_conditions: JSON.stringify({}),
        approval_limit: 500,
        notification_settings: JSON.stringify({}),
        risk_level: 'low',
        requires_additional_review: false,
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

      const mockDecision: ApprovalDecision = {
        action: 'approved',
        notes: 'Approved by manager',
        approvedAmount: 150.00
      };

      beforeEach(() => {
        mockDb().where().first.mockResolvedValue(mockApproval);
        mockDb().where().update.mockResolvedValue(1);
      });

      it('should process approval decision successfully', async () => {
        const updatedApproval = { ...mockApproval, stage_status: 'approved' };
        mockDb().where().first.mockResolvedValueOnce(mockApproval)
          .mockResolvedValueOnce(updatedApproval);

        jest.spyOn(service, 'progressWorkflow').mockResolvedValue();

        const result = await service.processApprovalDecision(
          'approval-123',
          mockDecision,
          { ...mockUser, id: 'manager-123' }
        );

        expect(mockDb().where().update).toHaveBeenCalledWith(
          expect.objectContaining({
            stage_status: 'approved',
            approver_id: 'manager-123',
            approval_notes: 'Approved by manager',
            approved_amount: 150.00,
            approved_at: expect.any(Date)
          })
        );
        expect(service.progressWorkflow).toHaveBeenCalledWith(updatedApproval);
      });

      it('should throw error for non-existent approval', async () => {
        mockDb().where().first.mockResolvedValue(null);

        await expect(
          service.processApprovalDecision('invalid-id', mockDecision, mockUser)
        ).rejects.toThrow('Approval record not found');
      });

      it('should throw error for already processed approval', async () => {
        const processedApproval = { ...mockApproval, stage_status: 'approved' };
        mockDb().where().first.mockResolvedValue(processedApproval);

        await expect(
          service.processApprovalDecision('approval-123', mockDecision, mockUser)
        ).rejects.toThrow('Approval has already been processed');
      });

      it('should throw error for unauthorized approver', async () => {
        const unauthorizedUser = { ...mockUser, id: 'unauthorized-user' };

        await expect(
          service.processApprovalDecision('approval-123', mockDecision, unauthorizedUser)
        ).rejects.toThrow('User is not authorized to approve this expense');
      });

      it('should handle rejection decision', async () => {
        const rejectionDecision: ApprovalDecision = {
          action: 'rejected',
          notes: 'Invalid expense',
          rejectionReason: 'Insufficient documentation'
        };

        const updatedApproval = { ...mockApproval, stage_status: 'rejected' };
        mockDb().where().first.mockResolvedValueOnce(mockApproval)
          .mockResolvedValueOnce(updatedApproval);

        jest.spyOn(service, 'rejectWorkflow').mockResolvedValue();

        await service.processApprovalDecision(
          'approval-123',
          rejectionDecision,
          { ...mockUser, id: 'manager-123' }
        );

        expect(mockDb().where().update).toHaveBeenCalledWith(
          expect.objectContaining({
            stage_status: 'rejected',
            rejection_reason: 'Insufficient documentation',
            rejected_at: expect.any(Date)
          })
        );
        expect(service.rejectWorkflow).toHaveBeenCalledWith(updatedApproval);
      });
    });
  });

  describe('Workflow Progression', () => {
    const mockApproval: ApprovalRecord = {
      id: 'approval-123',
      expense_data_id: 'expense-789',
      stage_number: 1,
      total_stages: 2
    } as ApprovalRecord;

    describe('progressWorkflow', () => {
      it('should complete workflow if last stage', async () => {
        const lastStageApproval = { ...mockApproval, stage_number: 2 };
        jest.spyOn(service, 'completeWorkflow').mockResolvedValue();

        await service.progressWorkflow(lastStageApproval);

        expect(service.completeWorkflow).toHaveBeenCalledWith(lastStageApproval);
      });

      it('should start next stage if not last', async () => {
        jest.spyOn(service, 'startNextStage').mockResolvedValue();

        await service.progressWorkflow(mockApproval);

        expect(service.startNextStage).toHaveBeenCalledWith(mockApproval);
      });
    });

    describe('completeWorkflow', () => {
      it('should update expense and approval status to approved', async () => {
        mockDb().where().update.mockResolvedValue(1);

        await service.completeWorkflow(mockApproval);

        expect(mockDb().where().update).toHaveBeenCalledWith({
          payment_status: 'approved',
          updated_at: expect.any(Date)
        });
        expect(consoleSpy.log).toHaveBeenCalledWith(
          'Completed workflow for expense expense-789'
        );
      });
    });

    describe('startNextStage', () => {
      it('should start next stage and send notification', async () => {
        const nextStage = {
          id: 'approval-456',
          stage_number: 2,
          escalation_hours: 48
        };

        mockDb().where().first.mockResolvedValueOnce(nextStage)
          .mockResolvedValueOnce({ ...nextStage, stage_status: 'pending' });
        mockDb().where().update.mockResolvedValue(1);

        jest.spyOn(service, 'sendApprovalNotification').mockResolvedValue();

        await service.startNextStage(mockApproval);

        expect(mockDb().where().update).toHaveBeenCalledWith(
          expect.objectContaining({
            stage_status: 'pending',
            stage_started_at: expect.any(Date),
            stage_deadline: expect.any(Date)
          })
        );
        expect(service.sendApprovalNotification).toHaveBeenCalled();
      });
    });

    describe('rejectWorkflow', () => {
      it('should update expense and all approvals to rejected', async () => {
        mockDb().where().update.mockResolvedValue(1);

        await service.rejectWorkflow(mockApproval);

        expect(mockDb().where().update).toHaveBeenCalledWith({
          payment_status: 'rejected',
          updated_at: expect.any(Date)
        });
        expect(consoleSpy.log).toHaveBeenCalledWith(
          'Rejected workflow for expense expense-789'
        );
      });
    });
  });

  describe('Delegation', () => {
    describe('delegateApproval', () => {
      const mockApproval = {
        id: 'approval-123',
        required_approvers: JSON.stringify(mockApprovers)
      };

      const mockDelegateUser = {
        id: 'delegate-123',
        first_name: 'Alice',
        last_name: 'Delegate',
        email: 'alice@example.com',
        role: 'manager'
      };

      it('should delegate approval to another user', async () => {
        mockDb().where().first.mockResolvedValueOnce(mockApproval)
          .mockResolvedValueOnce(mockDelegateUser)
          .mockResolvedValueOnce({
            ...mockApproval,
            delegated_to: 'delegate-123',
            stage_status: 'pending'
          });
        mockDb().where().update.mockResolvedValue(1);

        jest.spyOn(service, 'sendApprovalNotification').mockResolvedValue();

        const result = await service.delegateApproval(
          'approval-123',
          'delegate-123',
          'manager-123',
          'Going on vacation'
        );

        expect(mockDb().where().update).toHaveBeenCalledWith(
          expect.objectContaining({
            delegated_to: 'delegate-123',
            delegated_by: 'manager-123',
            delegation_reason: 'Going on vacation',
            stage_status: 'delegated'
          })
        );
        expect(service.sendApprovalNotification).toHaveBeenCalled();
        expect(consoleSpy.log).toHaveBeenCalledWith(
          'Delegated approval approval-123 from manager-123 to delegate-123'
        );
      });
    });
  });

  describe('Escalation', () => {
    describe('handleEscalations', () => {
      it('should escalate overdue approvals', async () => {
        const overdueApprovals = [
          { id: 'approval-1', stage_deadline: new Date(Date.now() - 60000) },
          { id: 'approval-2', stage_deadline: new Date(Date.now() - 120000) }
        ];

        mockDb().where().whereNull.mockResolvedValue(overdueApprovals);
        jest.spyOn(service, 'escalateApproval').mockResolvedValue();

        const result = await service.handleEscalations();

        expect(service.escalateApproval).toHaveBeenCalledTimes(2);
        expect(result).toBe(2);
        expect(consoleSpy.log).toHaveBeenCalledWith('Escalated 2 overdue approvals');
      });

      it('should handle escalation errors gracefully', async () => {
        const overdueApprovals = [
          { id: 'approval-1', stage_deadline: new Date(Date.now() - 60000) }
        ];

        mockDb().where().whereNull.mockResolvedValue(overdueApprovals);
        jest.spyOn(service, 'escalateApproval').mockRejectedValue(new Error('Escalation failed'));

        const result = await service.handleEscalations();

        expect(result).toBe(0);
        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Failed to escalate approval approval-1:',
          expect.any(Error)
        );
      });
    });

    describe('escalateApproval', () => {
      const mockApproval = {
        id: 'approval-123',
        stage_deadline: new Date(Date.now() - 60000),
        approval_conditions: JSON.stringify({ escalationRules: {} })
      };

      it('should escalate approval to determined target', async () => {
        const escalationTarget = {
          id: 'escalation-target',
          email: 'escalation@example.com'
        };

        jest.spyOn(service, 'determineEscalationTarget').mockResolvedValue(escalationTarget as any);
        jest.spyOn(service, 'sendEscalationNotification').mockResolvedValue();
        mockDb().where().update.mockResolvedValue(1);

        await service.escalateApproval(mockApproval as any);

        expect(mockDb().where().update).toHaveBeenCalledWith(
          expect.objectContaining({
            escalated_to: 'escalation-target',
            escalated_at: expect.any(Date),
            escalation_reason: expect.stringContaining('Approval overdue by'),
            stage_status: 'escalated'
          })
        );
        expect(service.sendEscalationNotification).toHaveBeenCalledWith(
          mockApproval,
          escalationTarget
        );
      });

      it('should handle case when no escalation target found', async () => {
        jest.spyOn(service, 'determineEscalationTarget').mockResolvedValue(null);

        await service.escalateApproval(mockApproval as any);

        expect(consoleSpy.log).toHaveBeenCalledWith(
          'No escalation target found for approval approval-123'
        );
      });
    });
  });

  describe('Queries and Reporting', () => {
    describe('getPendingApprovalsForUser', () => {
      it('should get pending approvals for user', async () => {
        const mockPendingApprovals = [
          {
            id: 'approval-1',
            vendor_name: 'Vendor A',
            total_amount: 100,
            submitter_first_name: 'John'
          },
          {
            id: 'approval-2',
            vendor_name: 'Vendor B',
            total_amount: 200,
            submitter_first_name: 'Jane'
          }
        ];

        // Mock the complex query chain
        const mockQueryBuilder = mockDb();
        mockQueryBuilder.join.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.leftJoin.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.whereRaw.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.orWhere.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.orderBy.mockResolvedValue(mockPendingApprovals);

        const result = await service.getPendingApprovalsForUser('user-123');

        expect(result).toEqual(mockPendingApprovals);
        expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith(
          'JSON_EXTRACT(expense_approvals.required_approvers, \'$[*].id\') LIKE ?',
          ['%"user-123"%']
        );
      });

      it('should apply filters correctly', async () => {
        const filters: WorkflowFilters = {
          organizationId: 'org-456',
          urgent: true
        };

        const mockQueryBuilder = mockDb();
        mockQueryBuilder.join.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.leftJoin.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.whereRaw.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.orWhere.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.orderBy.mockResolvedValue([]);

        await service.getPendingApprovalsForUser('user-123', filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'expense_approvals.organization_id',
          'org-456'
        );
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'expense_approvals.stage_deadline',
          '<',
          expect.any(Date)
        );
      });
    });

    describe('getApprovalHistory', () => {
      it('should get approval history for expense', async () => {
        const mockHistory = [
          {
            id: 'approval-1',
            stage_number: 1,
            stage_status: 'approved',
            approver_first_name: 'John'
          },
          {
            id: 'approval-2',
            stage_number: 2,
            stage_status: 'pending',
            approver_first_name: null
          }
        ];

        const mockQueryBuilder = mockDb();
        mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.leftJoin.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.orderBy.mockResolvedValue(mockHistory);

        const result = await service.getApprovalHistory('expense-789');

        expect(result).toEqual(mockHistory);
        expect(mockQueryBuilder.where).toHaveBeenCalledWith('expense_data_id', 'expense-789');
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('expense_approvals.stage_number', 'asc');
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getManagerApprovers', () => {
      it('should get manager approvers', async () => {
        const mockManagers = [
          { id: 'manager-1', name: 'Manager One', email: 'manager1@example.com', role: 'admin' }
        ];

        mockDb().where().select.mockResolvedValue(mockManagers);

        const result = await service.getManagerApprovers(mockUser);

        expect(result).toEqual([
          {
            id: 'manager-1',
            name: 'Manager One',
            email: 'manager1@example.com',
            role: 'admin'
          }
        ]);
      });
    });

    describe('getFinanceApprovers', () => {
      it('should get finance approvers', async () => {
        const mockFinanceUsers = [
          { id: 'finance-1', name: 'Finance User', email: 'finance@example.com', role: 'admin' }
        ];

        mockDb().whereIn().select.mockResolvedValue(mockFinanceUsers);

        const result = await service.getFinanceApprovers(mockUser);

        expect(result).toEqual([
          {
            id: 'finance-1',
            name: 'Finance User',
            email: 'finance@example.com',
            role: 'admin'
          }
        ]);
      });
    });

    describe('calculateRiskLevel', () => {
      it('should calculate risk level', () => {
        const mockStage = {} as WorkflowStage;
        const result = service.calculateRiskLevel('expense-123', mockStage, mockUser);
        expect(result).toBe('low');
      });
    });

    describe('evaluateStageConditions', () => {
      it('should evaluate stage conditions', async () => {
        const result = await service.evaluateStageConditions(
          {},
          mockExpenseData,
          mockPaymentMethod,
          mockUser
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('Notifications', () => {
    describe('sendApprovalNotification', () => {
      it('should send approval notification', async () => {
        const mockApproval = {
          expense_data_id: 'expense-789',
          required_approvers: JSON.stringify(mockApprovers)
        };

        await service.sendApprovalNotification(mockApproval as any);

        expect(consoleSpy.log).toHaveBeenCalledWith(
          'Sending approval notification for expense expense-789 to:',
          ['jane.manager@example.com']
        );
      });

      it('should send notification to specific target user', async () => {
        const mockApproval = {
          expense_data_id: 'expense-789',
          required_approvers: JSON.stringify(mockApprovers)
        };

        const targetUser = { id: 'target-123', email: 'target@example.com' };

        await service.sendApprovalNotification(mockApproval as any, targetUser as any);

        expect(consoleSpy.log).toHaveBeenCalledWith(
          'Sending approval notification for expense expense-789 to:',
          ['target-123']
        );
      });
    });

    describe('sendEscalationNotification', () => {
      it('should send escalation notification', async () => {
        const mockApproval = { expense_data_id: 'expense-789' };
        const escalationTarget = { email: 'escalation@example.com' };

        await service.sendEscalationNotification(mockApproval as any, escalationTarget as any);

        expect(consoleSpy.log).toHaveBeenCalledWith(
          'Sending escalation notification for expense expense-789 to: escalation@example.com'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb().where().first.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.processApprovalDecision('approval-123', { action: 'approved' }, mockUser)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle transaction rollback on error', async () => {
      const workflow: WorkflowConfig = {
        workflowId: null,
        workflowName: 'Test Workflow',
        workflowType: 'default',
        totalStages: 1,
        stages: [
          {
            stageNumber: 1,
            stageName: 'Test Stage',
            description: 'Test',
            requiredApprovers: [],
            minimumApprovers: 1,
            requiresAllApprovers: false,
            approvalLimit: null,
            canModifyAmount: false,
            deadlineHours: 48,
            escalationHours: 24,
            escalationRules: {},
            allowDelegation: false,
            conditions: {}
          }
        ]
      };

      mockDb.transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        service.createApprovalWorkflow('expense-789', workflow, mockUser)
      ).rejects.toThrow('Transaction failed');
    });
  });
});