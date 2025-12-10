# Session 1: Database Investigation & Foundation

## Context

You are working on the SportsManager application - a sports referee management system. The backend is Node.js/Express with TypeScript, PostgreSQL database, and Cerbos for authorization.

**Overall Goal**: Implement expense approval workflow (5 endpoints total across multiple sessions).

**This Session**: Investigate existing database schema and create necessary migrations/foundation.

---

## What Already Exists

### Backend Infrastructure
- Express router at `backend/src/routes/expenses.ts`
- Database connection via Knex (`backend/src/config/database.ts`)
- Authentication middleware: `authenticateToken`
- Authorization middleware: `requireCerbosPermission`
- Approval workflow service: `backend/src/services/ApprovalWorkflowService.ts`
- Payment method service: `backend/src/services/paymentMethodService.ts`
- Existing types: `backend/src/types/expenses.types.ts`

### Existing Endpoints (Receipt Processing)
```
POST /api/expenses/receipts/upload - Upload receipts with OCR processing
GET /api/expenses/receipts - List user's receipts
GET /api/expenses/receipts/:id - Get single receipt details
```

---

## Session 1 Tasks

### Task 1: Investigate Current Database Schema

Run these queries to understand what exists:

```sql
-- List all expense-related tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%expense%' OR table_name LIKE '%vendor%' OR table_name LIKE '%approv%';

-- Get column details for each table found
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '<table_name>'
ORDER BY ordinal_position;
```

**Document findings**: Which tables exist? What's their structure?

---

### Task 2: Identify Missing Tables/Columns

Based on the endpoints we need to build, verify these exist:

| Table | Required For | Key Columns Needed |
|-------|--------------|-------------------|
| `expenses` or `expense_data` | All endpoints | id, amount, description, status, submitted_by, submitted_date, vendor_id, category_id, payment_method_id |
| `expense_approvals` | Approval history | id, expense_id, approver_id, decision, notes, decided_at |
| `expense_categories` | Categories endpoint | id, name, color, is_active, requires_receipt, max_amount |
| `expense_vendors` | Vendors endpoint | id, name, contact_email, is_preferred |

---

### Task 3: Create Migrations (if needed)

Create migration file at: `backend/migrations/YYYYMMDDHHMMSS_expense_approval_tables.js`

**Migration should**:
- Only create tables/columns that don't exist
- Use proper foreign key relationships
- Include appropriate indexes for query performance
- Add status enum: `'draft', 'pending_approval', 'approved', 'rejected', 'paid'`
- Add urgency enum: `'low', 'normal', 'high', 'critical'`

---

### Task 4: Create ExpenseService Foundation (Modular Structure)

**IMPORTANT**: We're using a modular structure so Sessions 2, 3, 4 can run in parallel without merge conflicts.

Create base class: `backend/src/services/expense/ExpenseServiceBase.ts`

```typescript
import { Knex } from 'knex';
import db from '../../config/database';

export class ExpenseServiceBase {
  protected db: Knex;

  constructor(database?: Knex) {
    this.db = database || db;
  }

  protected async getUserName(userId: string, trx?: Knex.Transaction): Promise<string> {
    const query = trx ? trx('users') : this.db('users');
    const user = await query.where('id', userId).first();
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown';
  }

  protected async notifySubmitter(userId: string, notification: any): Promise<void> {
    // Implement notification - email, in-app, etc.
    console.log(`Notification sent to user ${userId}:`, notification);
  }
}
```

Create barrel file: `backend/src/services/expense/index.ts`

```typescript
// This file will be updated in Session 5 to combine all services
// For now, just export the base
export { ExpenseServiceBase } from './ExpenseServiceBase';

// These will be added by parallel sessions:
// export { ExpensePendingService } from './ExpensePendingService';
// export { ExpenseApprovalService } from './ExpenseApprovalService';
// export { ExpenseReferenceService } from './ExpenseReferenceService';
```

Create routes barrel: `backend/src/routes/expenses/index.ts`

```typescript
import { Router } from 'express';

const router = Router();

// These will be mounted by Session 5:
// import pendingRoutes from './expenses.pending.routes';
// import approvalRoutes from './expenses.approval.routes';
// import referenceRoutes from './expenses.reference.routes';

// router.use(pendingRoutes);
// router.use(approvalRoutes);
// router.use(referenceRoutes);

export default router;
```

**Directory structure after Session 1**:
```
backend/src/
├── services/
│   └── expense/
│       ├── index.ts                    (barrel - exports all)
│       └── ExpenseServiceBase.ts       (shared base class)
├── routes/
│   └── expenses/
│       └── index.ts                    (barrel - mounts all routes)
└── types/
    └── expenses.types.ts               (shared types)
```

---

### Task 5: Extend Types (if needed)

Review `backend/src/types/expenses.types.ts` and add any missing types:

```typescript
// Add if missing
export interface PendingExpenseFilters {
  payment_method?: string;
  urgency?: 'low' | 'normal' | 'high' | 'critical';
  amount_min?: number;
  amount_max?: number;
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Deliverables for This Session

1. **Schema documentation**: Summary of existing tables and their structure
2. **Migration file**: Creates any missing tables/columns
3. **ExpenseService.ts**: Service class with method stubs
4. **Updated types**: Any new interfaces needed

---

## Completion Criteria

Before ending this session, verify:
- [ ] All expense-related tables are documented
- [ ] Migration runs successfully (if created)
- [ ] ExpenseService.ts compiles without errors
- [ ] Types file has all interfaces needed for upcoming endpoints

---

## Handoff Notes for Sessions 2, 3, 4 (Parallel)

Document the following for the parallel sessions:
- Main expense table name and key columns
- Any quirks or patterns discovered in existing code
- Foreign key relationships between tables

**File ownership for parallel sessions**:
| Session | Service File | Routes File |
|---------|--------------|-------------|
| 2 | `ExpensePendingService.ts` | `expenses.pending.routes.ts` |
| 3 | `ExpenseApprovalService.ts` | `expenses.approval.routes.ts` |
| 4 | `ExpenseReferenceService.ts` | `expenses.reference.routes.ts` |

Session 5 will combine these into the barrel files.
