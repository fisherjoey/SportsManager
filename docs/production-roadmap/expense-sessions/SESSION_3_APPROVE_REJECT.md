# Session 3: Approve & Reject Endpoints

## Context

You are working on the SportsManager application - a sports referee management system. The backend is Node.js/Express with TypeScript, PostgreSQL database, and Cerbos for authorization.

**Overall Goal**: Implement expense approval workflow (5 endpoints total).

**Previous Session**: Session 1 - Database schema and modular ExpenseService foundation.

**This Session**: Implement POST /approve and POST /reject endpoints.

**Parallel Sessions**: Sessions 2, 3, 4 run in parallel. Each writes to separate files to avoid conflicts.

---

## Your Files (DO NOT modify other session's files)

| Type | File Path |
|------|-----------|
| Service | `backend/src/services/expense/ExpenseApprovalService.ts` |
| Routes | `backend/src/routes/expenses/expenses.approval.routes.ts` |

---

## Prerequisites from Session 1

Verify before starting:
- [ ] `ExpenseServiceBase.ts` exists at `backend/src/services/expense/ExpenseServiceBase.ts`
- [ ] Database tables exist (no migration needed)
- [ ] ApprovalWorkflowService exists at `backend/src/services/ApprovalWorkflowService.ts`

---

## Schema Details (from Session 1)

**Main table**: `expense_data` (not `expenses`)

| Column | Notes |
|--------|-------|
| `id` | Primary key |
| `user_id` | FK to users (submitter) |
| `payment_status` | Payment workflow state |

**Approvals table**: `expense_approvals`

| Column | Notes |
|--------|-------|
| `expense_data_id` | FK to expense_data (not `expense_id`) |
| `status` | 'pending', 'approved', 'rejected' |
| `approver_id` | FK to users |
| `approval_notes` | Notes (not `notes`) |
| `rejection_reason` | Reason for rejection |

---

## Endpoint Specifications

### POST /api/expenses/:expenseId/approve

**Purpose**: Approve an expense in the workflow

**URL Parameter**: `expenseId` (UUID)

**Request Body**:
```typescript
{
  decision: 'approved'        // Required, must be 'approved'
  notes?: string              // Optional approval notes
  conditions?: string[]       // Optional conditions for approval
}
```

**Response**:
```typescript
{
  success: boolean
  expense: {
    id: string
    status: string
    current_stage: string
    next_approver?: string
    is_fully_approved: boolean
  }
  message: string
}
```

---

### POST /api/expenses/:expenseId/reject

**Purpose**: Reject an expense

**URL Parameter**: `expenseId` (UUID)

**Request Body**:
```typescript
{
  decision: 'rejected'        // Required, must be 'rejected'
  reason: string              // Required - rejection reason
  allow_resubmission: boolean // Whether submitter can resubmit
}
```

**Response**:
```typescript
{
  success: boolean
  expense: {
    id: string
    status: 'rejected'
    can_resubmit: boolean
  }
  message: string
}
```

---

## Implementation Tasks

### Task 1: Add Request Validation Schemas

```typescript
const approveExpenseSchema = Joi.object({
  decision: Joi.string().valid('approved').required(),
  notes: Joi.string().max(1000),
  conditions: Joi.array().items(Joi.string().max(500)).max(10)
});

const rejectExpenseSchema = Joi.object({
  decision: Joi.string().valid('rejected').required(),
  reason: Joi.string().min(10).max(1000).required()
    .messages({ 'string.min': 'Rejection reason must be at least 10 characters' }),
  allow_resubmission: Joi.boolean().required()
});

const expenseIdParamSchema = Joi.object({
  expenseId: Joi.string().uuid().required()
});
```

---

### Task 2: Create ExpenseApprovalService

Create `backend/src/services/expense/ExpenseApprovalService.ts`:

```typescript
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { ExpenseServiceBase } from './ExpenseServiceBase';
import { ApprovalWorkflowService } from '../ApprovalWorkflowService';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { ApprovalResult, RejectionResult } from '../../types/expenses.types';

export class ExpenseApprovalService extends ExpenseServiceBase {

  async approveExpense(
  expenseId: string,
  approverId: string,
  data: { notes?: string; conditions?: string[] }
): Promise<ApprovalResult> {
  return this.db.transaction(async (trx) => {
    // 1. Fetch the expense and verify it exists
    // NOTE: Main table is expense_data
    const expense = await trx('expense_data')
      .where('id', expenseId)
      .first();

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== 'pending_approval') {
      throw new BadRequestError(`Expense is not pending approval (status: ${expense.status})`);
    }

    // 2. Verify user is authorized approver for current stage
    // Use ApprovalWorkflowService to check
    const workflowService = new ApprovalWorkflowService(trx);
    const canApprove = await workflowService.canUserApprove(expenseId, approverId);

    if (!canApprove) {
      throw new ForbiddenError('You are not authorized to approve this expense at its current stage');
    }

    // 3. Record/update the approval
    // NOTE: Column names differ from original spec
    await trx('expense_approvals')
      .where('expense_data_id', expenseId)
      .update({
        approver_id: approverId,
        status: 'approved',
        approval_notes: data.notes,
        updated_at: new Date()
      });

    // 4. Advance workflow and check if fully approved
    const workflowResult = await workflowService.advanceWorkflow(expenseId);

    // 5. Update expense payment_status
    const newStatus = workflowResult.isFullyApproved ? 'approved' : 'pending';
    await trx('expense_data')
      .where('id', expenseId)
      .update({
        payment_status: newStatus,
        updated_at: new Date()
      });

    // 6. If fully approved, trigger payment processing
    if (workflowResult.isFullyApproved) {
      await this.triggerPaymentProcessing(expenseId, trx);
    }

    // 7. Send notification to submitter
    await this.notifySubmitter(expense.user_id, {  // Column is user_id not submitted_by
      type: 'expense_approved',
      expenseId,
      approverName: await this.getUserName(approverId, trx),
      isFullyApproved: workflowResult.isFullyApproved
    });

    return {
      id: expenseId,
      status: newStatus,
      current_stage: workflowResult.currentStage,
      next_approver: workflowResult.nextApprover,
      is_fully_approved: workflowResult.isFullyApproved
    };
  });
}

private async triggerPaymentProcessing(expenseId: string, trx: Knex.Transaction): Promise<void> {
  // Queue for payment processing - implement based on your payment system
  // Could insert into a payment_queue table or emit an event
  console.log(`Payment processing triggered for expense ${expenseId}`);
}
```

---

### Task 3: Add rejectExpense() to ExpenseApprovalService

Add to the same `ExpenseApprovalService` class:

```typescript
  async rejectExpense(
  expenseId: string,
  approverId: string,
  data: { reason: string; allow_resubmission: boolean }
): Promise<RejectionResult> {
  return this.db.transaction(async (trx) => {
    // 1. Fetch and validate expense
    // NOTE: Main table is expense_data
    const expense = await trx('expense_data')
      .where('id', expenseId)
      .first();

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== 'pending_approval') {
      throw new BadRequestError(`Expense is not pending approval (status: ${expense.status})`);
    }

    // 2. Verify user is authorized approver
    const workflowService = new ApprovalWorkflowService(trx);
    const canApprove = await workflowService.canUserApprove(expenseId, approverId);

    if (!canApprove) {
      throw new ForbiddenError('You are not authorized to reject this expense');
    }

    // 3. Record/update the rejection
    // NOTE: Column names differ from original spec
    await trx('expense_approvals')
      .where('expense_data_id', expenseId)
      .update({
        approver_id: approverId,
        status: 'rejected',
        rejection_reason: data.reason,
        updated_at: new Date()
      });

    // 4. Update expense payment_status
    await trx('expense_data')
      .where('id', expenseId)
      .update({
        payment_status: 'rejected',
        updated_at: new Date()
      });

    // 5. Send notification to submitter
    await this.notifySubmitter(expense.user_id, {  // Column is user_id not submitted_by
      type: 'expense_rejected',
      expenseId,
      reason: data.reason,
      canResubmit: data.allow_resubmission,
      approverName: await this.getUserName(approverId, trx)
    });

    return {
      id: expenseId,
      status: 'rejected',
      can_resubmit: data.allow_resubmission
    };
  });
}
}

export const expenseApprovalService = new ExpenseApprovalService();
```

---

### Task 4: Add Route Handlers

Create `backend/src/routes/expenses/expenses.approval.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { expenseApprovalService } from '../../services/expense/ExpenseApprovalService';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/cerbos';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import Joi from 'joi';

const router = Router();

const approveExpenseSchema = Joi.object({
  decision: Joi.string().valid('approved').required(),
  notes: Joi.string().max(1000),
  conditions: Joi.array().items(Joi.string().max(500)).max(10)
});

const rejectExpenseSchema = Joi.object({
  decision: Joi.string().valid('rejected').required(),
  reason: Joi.string().min(10).max(1000).required()
    .messages({ 'string.min': 'Rejection reason must be at least 10 characters' }),
  allow_resubmission: Joi.boolean().required()
});

const expenseIdParamSchema = Joi.object({
  expenseId: Joi.string().uuid().required()
});

// Approve expense
router.post(
  '/:expenseId/approve',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'approve' }),
  async (req: Request, res: Response) => {
    try {
      // Validate params
      const { error: paramError } = expenseIdParamSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          success: false,
          error: paramError.details[0].message
        });
      }

      // Validate body
      const { error: bodyError, value } = approveExpenseSchema.validate(req.body);
      if (bodyError) {
        return res.status(400).json({
          success: false,
          error: bodyError.details[0].message
        });
      }

      const result = await expenseApprovalService.approveExpense(
        req.params.expenseId,
        req.user.id,
        value
      );

      return res.json({
        success: true,
        expense: result,
        message: result.is_fully_approved
          ? 'Expense fully approved and queued for payment'
          : 'Expense approved, awaiting next approval stage'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return res.status(403).json({ success: false, error: error.message });
      }
      if (error instanceof BadRequestError) {
        return res.status(400).json({ success: false, error: error.message });
      }
      console.error('Error approving expense:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to approve expense'
      });
    }
  }
);

// Reject expense
router.post(
  '/:expenseId/reject',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'approve' }),
  async (req: Request, res: Response) => {
    try {
      // Validate params
      const { error: paramError } = expenseIdParamSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          success: false,
          error: paramError.details[0].message
        });
      }

      // Validate body
      const { error: bodyError, value } = rejectExpenseSchema.validate(req.body);
      if (bodyError) {
        return res.status(400).json({
          success: false,
          error: bodyError.details[0].message
        });
      }

      const result = await expenseApprovalService.rejectExpense(
        req.params.expenseId,
        req.user.id,
        value
      );

      return res.json({
        success: true,
        expense: result,
        message: result.can_resubmit
          ? 'Expense rejected. Submitter may resubmit with corrections.'
          : 'Expense rejected.'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return res.status(403).json({ success: false, error: error.message });
      }
      if (error instanceof BadRequestError) {
        return res.status(400).json({ success: false, error: error.message });
      }
      console.error('Error rejecting expense:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reject expense'
      });
    }
  }
);

export default router;
```

---

### Task 5: Add Error Classes (if not existing)

Check if `backend/src/utils/errors.ts` exists. If not, create it:

```typescript
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}
```

---

### Task 6: Review ApprovalWorkflowService Integration

Check `backend/src/services/ApprovalWorkflowService.ts` for:
- `canUserApprove(expenseId, userId)` method
- `advanceWorkflow(expenseId)` method

If these don't exist, implement them based on the workflow rules.

---

## Test Cases

```bash
# Approve an expense
curl -X POST http://localhost:3000/api/expenses/abc-123/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "approved", "notes": "Looks good"}'

# Approve with conditions
curl -X POST http://localhost:3000/api/expenses/abc-123/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "approved", "conditions": ["Submit original receipt within 5 days"]}'

# Reject an expense
curl -X POST http://localhost:3000/api/expenses/abc-123/reject \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "rejected", "reason": "Missing itemized receipt. Please resubmit with detailed breakdown.", "allow_resubmission": true}'

# Reject without resubmission
curl -X POST http://localhost:3000/api/expenses/abc-123/reject \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "rejected", "reason": "This expense is not within policy guidelines.", "allow_resubmission": false}'
```

---

## Deliverables for This Session

1. **ExpenseApprovalService.ts** - service class with approveExpense() and rejectExpense()
2. **expenses.approval.routes.ts** - route handlers with validation
3. **Error classes** in utils/errors.ts (if not existing)
4. **Tested** both endpoints

---

## Completion Criteria

Before ending this session, verify:
- [ ] Approve endpoint validates authorization
- [ ] Approve advances workflow correctly
- [ ] Approve triggers payment when fully approved
- [ ] Reject requires reason (min 10 chars)
- [ ] Reject allows/disallows resubmission flag
- [ ] Both endpoints send notifications
- [ ] Transaction rollback works on errors
- [ ] Cerbos `expense:approve` permission is checked

---

## Handoff Notes for Session 5

Document:
- How ApprovalWorkflowService integration works
- Any edge cases in the approval flow
- Notification implementation details

**Files created this session** (for Session 5 to integrate):
- `backend/src/services/expense/ExpenseApprovalService.ts`
- `backend/src/routes/expenses/expenses.approval.routes.ts`
- `backend/src/utils/errors.ts` (if created)
