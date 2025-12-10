/**
 * @fileoverview Unit tests for ExpenseServices
 * @description Tests for ExpensePendingService, ExpenseApprovalService, and ExpenseReferenceService.
 * Part of Session 5 integration and testing.
 */

import { NotFoundError, AuthorizationError, BusinessLogicError } from '../../../utils/errors';

// Create a stateful mock that can be reset
const mockState = {
  queryBuilder: null as any,
};

// Create a mock query builder
const createMockQueryBuilder = () => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereILike: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orWhereILike: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    clone: jest.fn(),
  };
  chain.clone.mockReturnValue({ ...chain, count: jest.fn().mockResolvedValue([{ count: '0' }]) });
  return chain;
};

// Mock the database - returns the current mock state
jest.mock('../../../config/database', () => {
  const mockDb: any = jest.fn(() => mockState.queryBuilder);
  mockDb.transaction = jest.fn(async (callback: any) => {
    const trxMock = jest.fn(() => mockState.queryBuilder);
    trxMock.schema = { hasTable: jest.fn().mockResolvedValue(false) };
    return callback(trxMock);
  });
  mockDb.schema = { hasTable: jest.fn().mockResolvedValue(false) };
  mockDb.raw = jest.fn();
  return mockDb;
});

// Mock ApprovalWorkflowService
jest.mock('../../ApprovalWorkflowService', () => ({
  ApprovalWorkflowService: jest.fn().mockImplementation(() => ({
    processApprovalDecision: jest.fn(),
    getApprovalHistory: jest.fn(),
  })),
}));

// Import services after mocking
import { ExpensePendingService } from '../ExpensePendingService';
import { ExpenseApprovalService } from '../ExpenseApprovalService';
import { ExpenseReferenceService } from '../ExpenseReferenceService';

describe('ExpenseServices', () => {
  let pendingService: ExpensePendingService;
  let approvalService: ExpenseApprovalService;
  let referenceService: ExpenseReferenceService;
  let mockDb: any;

  // Test data
  const mockExpenseData = {
    id: 'expense-123',
    expense_number: 'EXP-001',
    total_amount: 150.0,
    description: 'Office supplies',
    vendor_name: 'Office Depot',
    category_name: 'Office Supplies',
    category_color: '#3B82F6',
    payment_method_type: 'credit_card',
    payment_method_name: 'Corporate Card',
    created_at: new Date().toISOString(),
    first_name: 'John',
    last_name: 'Doe',
    submitted_by_email: 'john@example.com',
    expense_urgency: 'normal',
    current_approval_stage: '1',
    approval_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    payment_status: 'pending_approval',
    user_id: 'user-123',
  };

  const mockApprovalRecord = {
    id: 'approval-123',
    expense_data_id: 'expense-123',
    stage_number: 1,
    total_stages: 2,
    stage_status: 'pending',
    required_approvers: JSON.stringify([{ id: 'approver-123', name: 'Jane Manager' }]),
    escalation_hours: 48,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Create fresh mock query builder and set it in state
    mockState.queryBuilder = createMockQueryBuilder();
    mockDb = require('../../../config/database');

    // Create fresh service instances
    pendingService = new ExpensePendingService();
    approvalService = new ExpenseApprovalService();
    referenceService = new ExpenseReferenceService();
  });

  describe('ExpensePendingService', () => {
    describe('getPendingExpenses', () => {
      it('returns paginated pending expenses', async () => {
        const qb = mockState.queryBuilder;

        // Setup clone for count query
        const countChain = createMockQueryBuilder();
        qb.clone.mockReturnValue(countChain);
        countChain.count.mockResolvedValue([{ count: '5' }]);

        // Mock the data query chain
        qb.offset.mockReturnThis();
        qb.limit.mockResolvedValue([mockExpenseData]);

        const result = await pendingService.getPendingExpenses({});

        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('applies urgency filter when provided', async () => {
        const qb = mockState.queryBuilder;
        const countChain = createMockQueryBuilder();
        qb.clone.mockReturnValue(countChain);
        countChain.count.mockResolvedValue([{ count: '0' }]);
        qb.offset.mockReturnThis();
        qb.limit.mockResolvedValue([]);

        await pendingService.getPendingExpenses({ urgency: 'high' });

        expect(qb.where).toHaveBeenCalled();
      });

      it('applies amount range filter when provided', async () => {
        const qb = mockState.queryBuilder;
        const countChain = createMockQueryBuilder();
        qb.clone.mockReturnValue(countChain);
        countChain.count.mockResolvedValue([{ count: '0' }]);
        qb.offset.mockReturnThis();
        qb.limit.mockResolvedValue([]);

        await pendingService.getPendingExpenses({ amount_min: 100, amount_max: 500 });

        expect(qb.where).toHaveBeenCalled();
      });

      it('calculates is_overdue correctly for past deadline', async () => {
        const qb = mockState.queryBuilder;
        const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const overdueExpense = { ...mockExpenseData, approval_deadline: pastDeadline };

        const countChain = createMockQueryBuilder();
        qb.clone.mockReturnValue(countChain);
        countChain.count.mockResolvedValue([{ count: '1' }]);
        qb.offset.mockReturnThis();
        qb.limit.mockResolvedValue([overdueExpense]);

        const result = await pendingService.getPendingExpenses({});

        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0].is_overdue).toBe(true);
      });

      it('calculates is_overdue correctly for future deadline', async () => {
        const qb = mockState.queryBuilder;
        const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const onTimeExpense = { ...mockExpenseData, approval_deadline: futureDeadline };

        const countChain = createMockQueryBuilder();
        qb.clone.mockReturnValue(countChain);
        countChain.count.mockResolvedValue([{ count: '1' }]);
        qb.offset.mockReturnThis();
        qb.limit.mockResolvedValue([onTimeExpense]);

        const result = await pendingService.getPendingExpenses({});

        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0].is_overdue).toBe(false);
      });

      it('includes empty approval_history array by default', async () => {
        const qb = mockState.queryBuilder;
        const countChain = createMockQueryBuilder();
        qb.clone.mockReturnValue(countChain);
        countChain.count.mockResolvedValue([{ count: '1' }]);
        qb.offset.mockReturnThis();
        qb.limit.mockResolvedValue([mockExpenseData]);

        const result = await pendingService.getPendingExpenses({});

        expect(result.data[0]).toHaveProperty('approval_history');
        expect(Array.isArray(result.data[0].approval_history)).toBe(true);
      });

      it('returns correct pagination metadata', async () => {
        const qb = mockState.queryBuilder;
        const countChain = createMockQueryBuilder();
        qb.clone.mockReturnValue(countChain);
        countChain.count.mockResolvedValue([{ count: '25' }]);
        qb.offset.mockReturnThis();
        qb.limit.mockResolvedValue([mockExpenseData]);

        const result = await pendingService.getPendingExpenses({ page: 2, limit: 10 });

        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);
        expect(result.total).toBe(25);
      });
    });
  });

  describe('ExpenseApprovalService', () => {
    describe('approveExpense', () => {
      it('successfully approves an expense', async () => {
        const qb = mockState.queryBuilder;

        // Setup the first() chain responses
        qb.first
          .mockResolvedValueOnce(mockExpenseData) // expense lookup
          .mockResolvedValueOnce(mockApprovalRecord) // approval record
          .mockResolvedValueOnce({ role: 'admin' }) // user lookup for canApprove
          .mockResolvedValueOnce(null); // no next stage

        const result = await approvalService.approveExpense('expense-123', 'approver-123', {
          notes: 'Approved',
        });

        expect(result).toBeDefined();
        expect(result.id).toBe('expense-123');
      });

      it('throws NotFoundError for non-existent expense', async () => {
        const qb = mockState.queryBuilder;
        qb.first.mockResolvedValue(null);

        await expect(
          approvalService.approveExpense('non-existent-id', 'approver-123', {})
        ).rejects.toThrow(NotFoundError);
      });

      it('throws BusinessLogicError for already approved expense', async () => {
        const qb = mockState.queryBuilder;
        qb.first.mockResolvedValue({ ...mockExpenseData, payment_status: 'paid' });

        await expect(
          approvalService.approveExpense('expense-123', 'approver-123', {})
        ).rejects.toThrow(BusinessLogicError);
      });

      it('throws BusinessLogicError when no pending approval exists', async () => {
        const qb = mockState.queryBuilder;
        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce(null);

        await expect(
          approvalService.approveExpense('expense-123', 'approver-123', {})
        ).rejects.toThrow(BusinessLogicError);
      });

      it('throws AuthorizationError for unauthorized approver', async () => {
        const qb = mockState.queryBuilder;
        const approvalWithDifferentApprover = {
          ...mockApprovalRecord,
          required_approvers: JSON.stringify([{ id: 'other-user', name: 'Other User' }]),
        };

        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce(approvalWithDifferentApprover)
          .mockResolvedValueOnce({ role: 'employee' });

        await expect(
          approvalService.approveExpense('expense-123', 'unauthorized-user', {})
        ).rejects.toThrow(AuthorizationError);
      });

      it('marks expense as fully approved when on last stage', async () => {
        const qb = mockState.queryBuilder;
        const lastStageApproval = { ...mockApprovalRecord, stage_number: 2, total_stages: 2 };

        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce(lastStageApproval)
          .mockResolvedValueOnce({ role: 'admin' });

        const result = await approvalService.approveExpense('expense-123', 'approver-123', {});

        expect(result.is_fully_approved).toBe(true);
        expect(result.current_stage).toBe('Complete');
      });

      it('advances to next stage when not on last stage', async () => {
        const qb = mockState.queryBuilder;
        const nextStage = {
          ...mockApprovalRecord,
          stage_number: 2,
          required_approvers: JSON.stringify([{ id: 'next-approver', name: 'Next Approver' }])
        };

        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce(mockApprovalRecord) // current stage (1 of 2)
          .mockResolvedValueOnce({ role: 'admin' })
          .mockResolvedValueOnce(nextStage); // next stage

        const result = await approvalService.approveExpense('expense-123', 'approver-123', {});

        expect(result.is_fully_approved).toBe(false);
        expect(result.current_stage).toContain('Stage 2');
      });
    });

    describe('rejectExpense', () => {
      it('successfully rejects an expense', async () => {
        const qb = mockState.queryBuilder;
        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce(mockApprovalRecord)
          .mockResolvedValueOnce({ role: 'admin' })
          .mockResolvedValueOnce({ first_name: 'Jane', last_name: 'Approver' });

        const result = await approvalService.rejectExpense('expense-123', 'approver-123', {
          reason: 'Invalid receipt',
          allow_resubmission: true,
        });

        expect(result.status).toBe('rejected');
        expect(result.can_resubmit).toBe(true);
      });

      it('sets can_resubmit to false when allow_resubmission is false', async () => {
        const qb = mockState.queryBuilder;
        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce(mockApprovalRecord)
          .mockResolvedValueOnce({ role: 'admin' })
          .mockResolvedValueOnce({ first_name: 'Jane', last_name: 'Approver' });

        const result = await approvalService.rejectExpense('expense-123', 'approver-123', {
          reason: 'Policy violation',
          allow_resubmission: false,
        });

        expect(result.can_resubmit).toBe(false);
      });

      it('throws NotFoundError for non-existent expense', async () => {
        const qb = mockState.queryBuilder;
        qb.first.mockResolvedValue(null);

        await expect(
          approvalService.rejectExpense('non-existent-id', 'approver-123', {
            reason: 'Invalid',
            allow_resubmission: false,
          })
        ).rejects.toThrow(NotFoundError);
      });

      it('throws BusinessLogicError when no pending approval exists', async () => {
        const qb = mockState.queryBuilder;
        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce(null);

        await expect(
          approvalService.rejectExpense('expense-123', 'approver-123', {
            reason: 'Invalid',
            allow_resubmission: false,
          })
        ).rejects.toThrow(BusinessLogicError);
      });

      it('throws AuthorizationError for unauthorized rejector', async () => {
        const qb = mockState.queryBuilder;
        qb.first
          .mockResolvedValueOnce(mockExpenseData)
          .mockResolvedValueOnce({
            ...mockApprovalRecord,
            required_approvers: JSON.stringify([{ id: 'other-user' }]),
          })
          .mockResolvedValueOnce({ role: 'employee' });

        await expect(
          approvalService.rejectExpense('expense-123', 'unauthorized-user', {
            reason: 'Invalid',
            allow_resubmission: false,
          })
        ).rejects.toThrow(AuthorizationError);
      });
    });
  });

  describe('ExpenseReferenceService', () => {
    describe('getCategories', () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Office Supplies',
          code: 'OFFICE',
          color_code: '#3B82F6',
          description: 'Office equipment',
          requires_approval: true,
          approval_threshold: 500,
          active: true,
        },
        {
          id: 'cat-2',
          name: 'Travel',
          code: 'TRAVEL',
          color_code: '#8B5CF6',
          description: 'Travel expenses',
          requires_approval: true,
          approval_threshold: 1000,
          active: true,
        },
      ];

      it('returns only active categories by default', async () => {
        const qb = mockState.queryBuilder;
        qb.orderBy.mockResolvedValue(mockCategories);

        const categories = await referenceService.getCategories();

        expect(Array.isArray(categories)).toBe(true);
        expect(qb.where).toHaveBeenCalledWith('active', true);
      });

      it('returns all categories when includeInactive is true', async () => {
        const qb = mockState.queryBuilder;
        const allCategories = [
          ...mockCategories,
          { ...mockCategories[0], id: 'cat-3', name: 'Inactive', active: false },
        ];
        qb.orderBy.mockResolvedValue(allCategories);

        const categories = await referenceService.getCategories(true);

        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBe(3);
      });

      it('orders categories by name', async () => {
        const qb = mockState.queryBuilder;
        qb.orderBy.mockResolvedValue(mockCategories);

        await referenceService.getCategories();

        expect(qb.orderBy).toHaveBeenCalledWith('name', 'asc');
      });
    });

    describe('getVendors', () => {
      const mockVendors = [
        {
          id: 'vendor-1',
          name: 'Office Depot',
          email: 'orders@officedepot.com',
          phone: '555-0100',
          payment_terms: 'Net 30',
          active: true,
        },
        {
          id: 'vendor-2',
          name: 'Staples',
          email: 'orders@staples.com',
          phone: '555-0101',
          payment_terms: 'Net 15',
          active: true,
        },
      ];

      it('returns active vendors', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue(mockVendors);

        const vendors = await referenceService.getVendors();

        expect(Array.isArray(vendors)).toBe(true);
        expect(qb.where).toHaveBeenCalledWith('active', true);
      });

      it('filters by search term when provided', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue([mockVendors[0]]);

        await referenceService.getVendors('Office');

        expect(qb.whereILike).toHaveBeenCalledWith('name', '%Office%');
      });

      it('uses default limit of 20', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue(mockVendors);

        await referenceService.getVendors();

        expect(qb.limit).toHaveBeenCalledWith(20);
      });

      it('respects custom limit parameter', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue([mockVendors[0]]);

        await referenceService.getVendors(undefined, 5);

        expect(qb.limit).toHaveBeenCalledWith(5);
      });

      it('enforces maximum limit of 100', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue([]);

        await referenceService.getVendors(undefined, 200);

        expect(qb.limit).toHaveBeenCalledWith(100);
      });

      it('enforces minimum limit of 1', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue([]);

        await referenceService.getVendors(undefined, 0);

        expect(qb.limit).toHaveBeenCalledWith(1);
      });

      it('orders vendors by name', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue(mockVendors);

        await referenceService.getVendors();

        expect(qb.orderBy).toHaveBeenCalledWith('name', 'asc');
      });

      it('trims search term whitespace', async () => {
        const qb = mockState.queryBuilder;
        qb.limit.mockResolvedValue([mockVendors[0]]);

        await referenceService.getVendors('  Office  ');

        expect(qb.whereILike).toHaveBeenCalledWith('name', '%Office%');
      });
    });
  });

  describe('Error Handling', () => {
    it('propagates database errors from getPendingExpenses', async () => {
      mockState.queryBuilder.select.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(pendingService.getPendingExpenses({})).rejects.toThrow();
    });

    it('propagates transaction errors from approveExpense', async () => {
      mockDb.transaction = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      await expect(
        approvalService.approveExpense('expense-123', 'approver-123', {})
      ).rejects.toThrow('Transaction failed');
    });

    it('propagates database errors from getCategories', async () => {
      mockState.queryBuilder.select.mockImplementation(() => {
        throw new Error('Query failed');
      });

      await expect(referenceService.getCategories()).rejects.toThrow();
    });

    it('propagates database errors from getVendors', async () => {
      mockState.queryBuilder.select.mockImplementation(() => {
        throw new Error('Query failed');
      });

      await expect(referenceService.getVendors()).rejects.toThrow();
    });
  });
});
