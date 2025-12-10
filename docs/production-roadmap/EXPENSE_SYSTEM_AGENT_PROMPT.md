# Agent Prompt: Plan Expense Approval Workflow Implementation

## Context

You are working on the SportsManager application - a sports referee management system. The backend is Node.js/Express with TypeScript, PostgreSQL database, and Cerbos for authorization.

**Current State**: The expense system has receipt upload/processing but lacks the expense approval workflow.

**Goal**: Plan the implementation of the missing expense management endpoints.

---

## What Already Exists

### Backend Infrastructure
- Express router at `backend/src/routes/expenses.ts`
- Database connection via Knex (`backend/src/config/database.ts`)
- Authentication middleware: `authenticateToken`
- Authorization middleware: `requireCerbosPermission`
- Approval workflow service: `backend/src/services/ApprovalWorkflowService.ts`
- Payment method service: `backend/src/services/paymentMethodService.ts`

### Existing Endpoints (Receipt Processing)
```
POST /api/expenses/receipts/upload - Upload receipts with OCR processing
GET /api/expenses/receipts - List user's receipts
GET /api/expenses/receipts/:id - Get single receipt details
```

### Existing Types (`backend/src/types/expenses.types.ts`)
- `ExpenseData`, `ExpenseCategory`, `ExpenseReceipt`
- `ApprovalRequest`, `ApprovalDecision`, `ExpenseApproval`
- `ReimbursementCreationRequest`, `ReimbursementStatusUpdateRequest`

### Database Tables That Likely Exist
- `expense_receipts` - Receipt records
- `expense_categories` - Expense categories
- `expense_data` or `expenses` - Main expense records
- `users` - User accounts

---

## What Needs to Be Built

### 1. GET /api/expenses/pending (6 hours)

**Purpose**: Get expenses awaiting approval with filtering

**Query Parameters**:
- `payment_method` ('person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor')
- `urgency` ('low' | 'normal' | 'high' | 'critical')
- `amount_min`, `amount_max` (number)
- `search` (string) - search description, vendor, submitter
- `category` (string - UUID)
- `page`, `limit` (pagination)

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

**Implementation Notes**:
- Filter by status = 'pending_approval'
- Join with vendors, categories, payment methods, users
- Calculate `is_overdue` from approval_deadline
- Include approval history with approver names
- Requires `expense:view` or `expense:approve` permission

---

### 2. POST /api/expenses/:expenseId/approve (6 hours)

**Purpose**: Approve an expense in the workflow

**Request Body**:
```typescript
{
  decision: 'approved'
  notes?: string
  conditions?: string[]  // Optional conditions for approval
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

**Implementation Notes**:
- Verify user is authorized approver for current stage
- Use ApprovalWorkflowService for workflow logic
- Update expense status
- Create approval record
- Trigger notification to submitter
- If fully approved, trigger payment processing
- Requires `expense:approve` permission

---

### 3. POST /api/expenses/:expenseId/reject (4 hours)

**Purpose**: Reject an expense

**Request Body**:
```typescript
{
  decision: 'rejected'
  reason: string  // Required for rejections
  allow_resubmission: boolean
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

**Implementation Notes**:
- Verify user is authorized approver
- Require rejection reason
- Update expense status to 'rejected'
- Create rejection record
- Notify submitter with reason
- Requires `expense:approve` permission

---

### 4. GET /api/expenses/categories (2 hours)

**Purpose**: Get expense categories for dropdowns/filtering

**Response**:
```typescript
{
  success: boolean
  categories: Array<{
    id: string
    name: string
    description?: string
    color: string
    budget_code?: string
    is_active: boolean
    requires_receipt: boolean
    max_amount?: number
  }>
}
```

**Implementation Notes**:
- Return active categories by default
- Include budget allocation info if available
- Cache response (categories change infrequently)
- Requires `expense:view` permission

---

### 5. GET /api/expenses/vendors (2 hours)

**Purpose**: Get vendors for autocomplete/selection

**Query Parameters**:
- `search` (string) - Filter by name
- `limit` (number) - For autocomplete (default 20)

**Response**:
```typescript
{
  success: boolean
  vendors: Array<{
    id: string
    name: string
    contact_email?: string
    payment_terms?: string
    is_preferred: boolean
  }>
}
```

**Implementation Notes**:
- Support typeahead search
- Order preferred vendors first
- Requires `expense:view` permission

---

## Database Schema to Verify/Create

Before implementing, verify these tables exist or create migrations:

```sql
-- Check if these exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('expenses', 'expense_data', 'expense_categories',
                   'expense_approvals', 'expense_vendors', 'payment_methods');
```

**If missing, create migration for**:
- `expenses` or `expense_data` - Main expense records
- `expense_approvals` - Approval history
- `expense_vendors` - Vendor records
- `expense_categories` - Category definitions (may exist)

---

## Authorization Requirements

All endpoints need Cerbos permission checks:

```typescript
// View expenses
requireCerbosPermission({ resource: 'expense', action: 'view' })

// Approve/reject expenses
requireCerbosPermission({ resource: 'expense', action: 'approve' })

// Manage categories/vendors
requireCerbosPermission({ resource: 'expense', action: 'manage' })
```

---

## File Locations

- **Routes**: `backend/src/routes/expenses.ts` (extend existing file)
- **Types**: `backend/src/types/expenses.types.ts` (extend if needed)
- **Services**:
  - `backend/src/services/ApprovalWorkflowService.ts` (existing)
  - May need `backend/src/services/ExpenseService.ts` (new)
- **Migrations**: `backend/migrations/YYYYMMDD_expense_approval_tables.js`

---

## Your Task

1. **Investigate** the current database schema to understand what tables exist
2. **Plan** the implementation in phases:
   - Phase A: Database migrations (if needed)
   - Phase B: Core endpoints (pending, approve, reject)
   - Phase C: Reference endpoints (categories, vendors)
3. **Document** the implementation plan with:
   - Specific files to create/modify
   - Database changes needed
   - Order of implementation
   - Testing strategy
4. **Estimate** effort for each component

**Output Format**: Provide a detailed implementation plan in markdown format that another developer could follow step-by-step.

---

## Constraints

- Use existing patterns from the codebase
- Follow TypeScript strict mode
- All endpoints must have Cerbos authorization
- Use Knex query builder (not raw SQL)
- Include input validation with Joi
- Return consistent response format: `{ success: boolean, data/error, message }`
