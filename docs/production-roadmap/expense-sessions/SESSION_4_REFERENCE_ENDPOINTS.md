# Session 4: Reference Data Endpoints (Categories & Vendors)

## Context

You are working on the SportsManager application - a sports referee management system. The backend is Node.js/Express with TypeScript, PostgreSQL database, and Cerbos for authorization.

**Overall Goal**: Implement expense approval workflow (5 endpoints total).

**Previous Session**: Session 1 - Database schema and modular ExpenseService foundation.

**This Session**: Implement GET /categories and GET /vendors reference data endpoints.

**Parallel Sessions**: Sessions 2, 3, 4 run in parallel. Each writes to separate files to avoid conflicts.

---

## Your Files (DO NOT modify other session's files)

| Type | File Path |
|------|-----------|
| Service | `backend/src/services/expense/ExpenseReferenceService.ts` |
| Routes | `backend/src/routes/expenses/expenses.reference.routes.ts` |

---

## Prerequisites from Session 1

Verify before starting:
- [ ] `ExpenseServiceBase.ts` exists at `backend/src/services/expense/ExpenseServiceBase.ts`
- [ ] Database tables for categories and vendors exist
- [ ] Types are defined in `backend/src/types/expenses.types.ts`

---

## Schema Details (from Session 1)

**Categories table**: `expense_categories` (21 columns)

| Column | Notes |
|--------|-------|
| `id` | Primary key |
| `name` | Category name |
| `code` | Category code |
| `color_code` | Color (not `color`) |
| `active` | Boolean (not `is_active`) |
| `requires_approval` | Whether requires approval |
| `approval_threshold` | Amount threshold |

**Vendors table**: `vendors` (14 columns)

| Column | Notes |
|--------|-------|
| `id` | Primary key |
| `name` | Vendor name |
| `email` | Contact email (not `contact_email`) |
| `phone` | Contact phone |
| `active` | Boolean (not `is_active`) |

**Note**: `expense_data.vendor_name` is a text field, not a FK to vendors table.

---

## Endpoint Specifications

### GET /api/expenses/categories

**Purpose**: Get expense categories for dropdowns and filtering

**Query Parameters**: None (optionally add `include_inactive=true`)

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

---

### GET /api/expenses/vendors

**Purpose**: Get vendors for autocomplete/selection

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Filter by vendor name (partial match) |
| `limit` | number | Max results (default: 20, max: 100) |

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

---

## Implementation Tasks

### Task 1: Add Validation Schemas

```typescript
const categoriesQuerySchema = Joi.object({
  include_inactive: Joi.boolean().default(false)
});

const vendorsQuerySchema = Joi.object({
  search: Joi.string().max(100),
  limit: Joi.number().integer().min(1).max(100).default(20)
});
```

---

### Task 2: Create ExpenseReferenceService

Create `backend/src/services/expense/ExpenseReferenceService.ts`:

```typescript
import { ExpenseServiceBase } from './ExpenseServiceBase';
import { ExpenseCategory, ExpenseVendor } from '../../types/expenses.types';

export class ExpenseReferenceService extends ExpenseServiceBase {

  async getCategories(includeInactive: boolean = false): Promise<ExpenseCategory[]> {
  // NOTE: Column names from actual schema
  let query = this.db('expense_categories')
    .select(
      'id',
      'name',
      'code',
      'color_code as color',        // Alias to match expected response
      'active as is_active',        // Alias to match expected response
      'requires_approval',
      'approval_threshold as max_amount'
    )
    .orderBy('name', 'asc');

  if (!includeInactive) {
    query = query.where('active', true);  // Column is 'active' not 'is_active'
  }

  return query;
}
```

---

### Task 3: Add getVendors() to ExpenseReferenceService

Add to the same `ExpenseReferenceService` class:

```typescript
  async getVendors(search?: string, limit: number = 20): Promise<ExpenseVendor[]> {
  // NOTE: Table is 'vendors' not 'expense_vendors', column names differ
  let query = this.db('vendors')
    .select(
      'id',
      'name',
      'email as contact_email',     // Alias to match expected response
      'phone'
      // Note: is_preferred may not exist - check schema
    )
    .where('active', true)          // Column is 'active' not 'is_active'
    .orderBy('name', 'asc')
    .limit(limit);

  if (search) {
    query = query.whereILike('name', `%${search}%`);
  }

  return query;
}
}

export const expenseReferenceService = new ExpenseReferenceService();
```

---

### Task 4: Add Route Handlers

Create `backend/src/routes/expenses/expenses.reference.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { expenseReferenceService } from '../../services/expense/ExpenseReferenceService';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/cerbos';
import Joi from 'joi';

const router = Router();

const categoriesQuerySchema = Joi.object({
  include_inactive: Joi.boolean().default(false)
});

const vendorsQuerySchema = Joi.object({
  search: Joi.string().max(100),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Get expense categories
router.get(
  '/categories',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'view' }),
  async (req: Request, res: Response) => {
    try {
      const { error, value } = categoriesQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const categories = await expenseReferenceService.getCategories(value.include_inactive);

      // Set cache headers - categories change infrequently
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes

      return res.json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      });
    }
  }
);

// Get vendors (with typeahead support)
router.get(
  '/vendors',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'view' }),
  async (req: Request, res: Response) => {
    try {
      const { error, value } = vendorsQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const vendors = await expenseReferenceService.getVendors(value.search, value.limit);

      return res.json({
        success: true,
        vendors
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch vendors'
      });
    }
  }
);

export default router;
```

---

### Task 5: Add Types (if missing)

Update `backend/src/types/expenses.types.ts`:

```typescript
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  budget_code?: string;
  is_active: boolean;
  requires_receipt: boolean;
  max_amount?: number;
}

export interface ExpenseVendor {
  id: string;
  name: string;
  contact_email?: string;
  payment_terms?: string;
  is_preferred: boolean;
}
```

---

### Task 6: (Optional) Add Caching Layer

For categories that rarely change, add a simple cache:

```typescript
import NodeCache from 'node-cache';

const categoryCache = new NodeCache({ stdTTL: 300 }); // 5 minute TTL

async getCategories(includeInactive: boolean = false): Promise<ExpenseCategory[]> {
  const cacheKey = `categories_${includeInactive}`;

  const cached = categoryCache.get<ExpenseCategory[]>(cacheKey);
  if (cached) {
    return cached;
  }

  let query = this.db('expense_categories')
    .select(/* ... */)
    .orderBy('name', 'asc');

  if (!includeInactive) {
    query = query.where('is_active', true);
  }

  const categories = await query;
  categoryCache.set(cacheKey, categories);

  return categories;
}

// Method to invalidate cache when categories are updated
invalidateCategoryCache(): void {
  categoryCache.flushAll();
}
```

---

## Test Cases

```bash
# Get all active categories
curl http://localhost:3000/api/expenses/categories \
  -H "Authorization: Bearer <token>"

# Get all categories including inactive
curl "http://localhost:3000/api/expenses/categories?include_inactive=true" \
  -H "Authorization: Bearer <token>"

# Get vendors (no search)
curl http://localhost:3000/api/expenses/vendors \
  -H "Authorization: Bearer <token>"

# Vendor typeahead search
curl "http://localhost:3000/api/expenses/vendors?search=office" \
  -H "Authorization: Bearer <token>"

# Vendor search with limit
curl "http://localhost:3000/api/expenses/vendors?search=sup&limit=5" \
  -H "Authorization: Bearer <token>"
```

---

## Deliverables for This Session

1. **ExpenseReferenceService.ts** - service class with getCategories() and getVendors()
2. **expenses.reference.routes.ts** - route handlers with validation
3. **(Optional)** Caching for categories
4. **Tested** both endpoints

---

## Completion Criteria

Before ending this session, verify:
- [ ] Categories returns correct structure
- [ ] Categories filters inactive by default
- [ ] Vendors supports typeahead search (case-insensitive)
- [ ] Vendors shows preferred vendors first
- [ ] Vendors respects limit parameter
- [ ] Both endpoints require `expense:view` permission
- [ ] Cache headers set for categories (if implemented)

---

## Handoff Notes for Session 5

Document:
- Any database schema quirks discovered
- Caching implementation (if added)

**Files created this session** (for Session 5 to integrate):
- `backend/src/services/expense/ExpenseReferenceService.ts`
- `backend/src/routes/expenses/expenses.reference.routes.ts`
