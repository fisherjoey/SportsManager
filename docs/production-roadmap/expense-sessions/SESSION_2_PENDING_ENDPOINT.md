# Session 2: GET /api/expenses/pending Endpoint

## Context

You are working on the SportsManager application - a sports referee management system. The backend is Node.js/Express with TypeScript, PostgreSQL database, and Cerbos for authorization.

**Overall Goal**: Implement expense approval workflow (5 endpoints total).

**Previous Session**: Database schema investigated, migrations created, modular ExpenseService foundation established.

**This Session**: Implement the GET /api/expenses/pending endpoint.

**Parallel Sessions**: Sessions 2, 3, 4 run in parallel. Each writes to separate files to avoid conflicts.

---

## Your Files (DO NOT modify other session's files)

| Type | File Path |
|------|-----------|
| Service | `backend/src/services/expense/ExpensePendingService.ts` |
| Routes | `backend/src/routes/expenses/expenses.pending.routes.ts` |

---

## Prerequisites from Session 1

Verify before starting:
- [ ] `ExpenseServiceBase.ts` exists at `backend/src/services/expense/ExpenseServiceBase.ts`
- [ ] Database tables exist (no migration needed)
- [ ] Types are defined in `backend/src/types/expenses.types.ts`

---

## Schema Details (from Session 1)

**Main table**: `expense_data` (not `expenses`)

| Column | Notes |
|--------|-------|
| `vendor_name` | Text field, NOT a FK to vendors table |
| `expense_urgency` | Values: 'low', 'normal', 'high', 'urgent' (not 'critical') |
| `payment_status` | Combined with `expense_approvals.status` for workflow state |
| `category_id` | FK to `expense_categories` |
| `payment_method_id` | FK to `payment_methods` |
| `receipt_id` | FK to `expense_receipts` |

**Related tables**: `expense_approvals`, `expense_categories`, `payment_methods`, `vendors`, `expense_receipts`

---

## Endpoint Specification

### GET /api/expenses/pending

**Purpose**: Get expenses awaiting approval with filtering and pagination

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `payment_method` | string | Filter: 'person_reimbursement', 'purchase_order', 'credit_card', 'direct_vendor' |
| `urgency` | string | Filter: 'low', 'normal', 'high', 'urgent' |
| `amount_min` | number | Minimum amount filter |
| `amount_max` | number | Maximum amount filter |
| `search` | string | Search description, vendor, submitter name |
| `category` | string (UUID) | Filter by category ID |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

**Response**:
```typescript
{
  success: boolean
  expenses: Array<{
    id: string
    expense_number: string
    amount: number
    description: string
    vendor_name: string
    category_name: string
    category_color: string
    payment_method_type: string
    payment_method_name: string
    submitted_date: string
    submitted_by_name: string
    submitted_by_email: string
    urgency_level: 'low' | 'normal' | 'high' | 'critical'
    current_approval_stage: string
    approval_deadline: string
    receipt_filename?: string
    business_purpose?: string
    is_overdue: boolean
    approval_history: Array<{
      id: string
      approver_name: string
      decision: 'approved' | 'rejected' | 'pending'
      notes?: string
      decided_at: string
    }>
  }>
  total: number
  page: number
  limit: number
}
```

---

## Implementation Tasks

### Task 1: Add Request Validation

Create Joi schema in route file or validation helper:

```typescript
const pendingExpensesQuerySchema = Joi.object({
  payment_method: Joi.string().valid('person_reimbursement', 'purchase_order', 'credit_card', 'direct_vendor'),
  urgency: Joi.string().valid('low', 'normal', 'high', 'critical'),
  amount_min: Joi.number().min(0),
  amount_max: Joi.number().min(0),
  search: Joi.string().max(100),
  category: Joi.string().uuid(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});
```

---

### Task 2: Create ExpensePendingService

Create `backend/src/services/expense/ExpensePendingService.ts`:

```typescript
import { ExpenseServiceBase } from './ExpenseServiceBase';
import { PendingExpenseFilters, PaginatedResult, PendingExpense, ApprovalHistoryItem } from '../../types/expenses.types';

export class ExpensePendingService extends ExpenseServiceBase {

  async getPendingExpenses(filters: PendingExpenseFilters): Promise<PaginatedResult<PendingExpense>> {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  // Build base query with joins
  // NOTE: Main table is expense_data, vendor_name is text field (not FK)
  let query = this.db('expense_data as e')
    .select(
      'e.id',
      'e.total_amount as amount',
      'e.description',
      'e.created_at as submitted_date',
      'e.expense_urgency as urgency_level',
      'e.approval_deadline',
      'e.vendor_name',  // Text field, not from vendors table
      'c.name as category_name',
      'c.color_code as category_color',
      'pm.type as payment_method_type',
      'pm.name as payment_method_name',
      'u.first_name',
      'u.last_name',
      'u.email as submitted_by_email',
      'r.file_path as receipt_filename'
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
    query = query.where('e.amount', '>=', filters.amount_min);
  }
  if (filters.amount_max !== undefined) {
    query = query.where('e.amount', '<=', filters.amount_max);
  }
  if (filters.category) {
    query = query.where('e.category_id', filters.category);
  }
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.where(function() {
      this.whereILike('e.description', searchTerm)
        .orWhereILike('e.vendor_name', searchTerm)  // Text field on expense_data
        .orWhereILike('u.first_name', searchTerm)
        .orWhereILike('u.last_name', searchTerm);
    });
  }

  // Get total count
  const countQuery = query.clone();
  const [{ count }] = await countQuery.count('e.id as count');
  const total = parseInt(count as string, 10);

  // Get paginated results
  const expenses = await query
    .orderBy('e.approval_deadline', 'asc')
    .offset(offset)
    .limit(limit);

  // Fetch approval history for each expense
  const expenseIds = expenses.map(e => e.id);
  const approvalHistory = await this.getApprovalHistoryForExpenses(expenseIds);

  // Map and calculate is_overdue
  const mappedExpenses = expenses.map(e => ({
    ...e,
    submitted_by_name: `${e.first_name} ${e.last_name}`,
    is_overdue: new Date(e.approval_deadline) < new Date(),
    approval_history: approvalHistory[e.id] || []
  }));

  return {
    data: mappedExpenses,
    total,
    page,
    limit
  };
}

private async getApprovalHistoryForExpenses(expenseIds: string[]): Promise<Record<string, ApprovalHistoryItem[]>> {
  if (expenseIds.length === 0) return {};

  const history = await this.db('expense_approvals as ea')
    .select(
      'ea.id',
      'ea.expense_data_id as expense_id',  // Column is expense_data_id
      'ea.status as decision',              // Column is status
      'ea.approval_notes as notes',         // Column is approval_notes
      'ea.updated_at as decided_at',
      'u.first_name',
      'u.last_name'
    )
    .leftJoin('users as u', 'ea.approver_id', 'u.id')
    .whereIn('ea.expense_data_id', expenseIds)
    .orderBy('ea.updated_at', 'asc');

  // Group by expense_id
  return history.reduce((acc, item) => {
    if (!acc[item.expense_id]) acc[item.expense_id] = [];
    acc[item.expense_id].push({
      id: item.id,
      approver_name: `${item.first_name} ${item.last_name}`,
      decision: item.decision,
      notes: item.notes,
      decided_at: item.decided_at
    });
    return acc;
  }, {} as Record<string, ApprovalHistoryItem[]>);
}
}

export const expensePendingService = new ExpensePendingService();
```

---

### Task 3: Add Route Handler

Create `backend/src/routes/expenses/expenses.pending.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { expensePendingService } from '../../services/expense/ExpensePendingService';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/cerbos';
import Joi from 'joi';

const router = Router();

const pendingExpensesQuerySchema = Joi.object({
  payment_method: Joi.string().valid('person_reimbursement', 'purchase_order', 'credit_card', 'direct_vendor'),
  urgency: Joi.string().valid('low', 'normal', 'high', 'urgent'),  // 'urgent' not 'critical'
  amount_min: Joi.number().min(0),
  amount_max: Joi.number().min(0),
  search: Joi.string().max(100),
  category: Joi.string().uuid(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

router.get(
  '/pending',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'view' }),
  async (req: Request, res: Response) => {
    try {
      const { error, value } = pendingExpensesQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const result = await expensePendingService.getPendingExpenses(value);

      return res.json({
        success: true,
        expenses: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pending expenses'
      });
    }
  }
);

export default router;
```

---

### Task 4: Test the Endpoint

Create test requests:

```bash
# Basic request
curl http://localhost:3000/api/expenses/pending \
  -H "Authorization: Bearer <token>"

# With filters
curl "http://localhost:3000/api/expenses/pending?urgency=high&amount_min=100&page=1&limit=10" \
  -H "Authorization: Bearer <token>"

# With search
curl "http://localhost:3000/api/expenses/pending?search=office%20supplies" \
  -H "Authorization: Bearer <token>"
```

---

## Deliverables for This Session

1. **ExpensePendingService.ts** - service class with getPendingExpenses()
2. **expenses.pending.routes.ts** - route handler with validation
3. **Tested** endpoint with various filter combinations

---

## Completion Criteria

Before ending this session, verify:
- [ ] Endpoint returns correct response structure
- [ ] All filters work correctly
- [ ] Pagination works (test page 1, 2, etc.)
- [ ] Search filters description, vendor, and submitter
- [ ] is_overdue calculates correctly
- [ ] approval_history included for each expense
- [ ] Cerbos permission check is in place

---

## Handoff Notes for Session 5

Document:
- Any adjustments made to the database query
- Table/column names if different from expected
- Any edge cases discovered

**Files created this session** (for Session 5 to integrate):
- `backend/src/services/expense/ExpensePendingService.ts`
- `backend/src/routes/expenses/expenses.pending.routes.ts`
