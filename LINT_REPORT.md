# Lint Report - SportsManager Project

**Generated:** 2025-12-09
**Last Updated:** 2025-12-09 (After Auto-fix Attempt)
**Status:** FAILED - Both backend and frontend have lint errors

---

## Executive Summary

| Component | Total Issues | Errors | Warnings | Status |
|-----------|-------------|--------|----------|--------|
| Backend   | 184         | 184    | 0        | CRITICAL |
| Frontend  | 2701        | 0      | 2701     | NEEDS ATTENTION |

### Auto-fix Results

| Action | Result |
|--------|--------|
| Frontend `next lint --fix` | Some import order & formatting fixed |
| Frontend `prettier --write` | Code formatting standardized |
| Backend `eslint --fix` | **FAILED** - TypeScript parser not configured |

**Note:** Most frontend warnings require manual fixes (unused vars, console statements, `any` types, React hooks deps).

---

## Backend Issues (CRITICAL)

### Root Cause: ESLint Not Configured for TypeScript

The backend ESLint configuration (`eslint.config.js`) only handles `.js` files but the lint command runs against `.ts` files:

```bash
eslint src/ --ext .js,.ts
```

**All 184 errors are TypeScript parsing errors** because ESLint lacks:
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`

### Repair Required

Install TypeScript ESLint dependencies:
```bash
cd backend
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript
```

Update `eslint.config.js` to include TypeScript configuration:
```javascript
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  // Existing JS config...
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript rules here
    }
  }
];
```

### Files Affected (184 files with parsing errors)

#### Configuration Files
- `src/config/aiConfig.ts`
- `src/config/database.ts`
- `src/config/performance.ts`
- `src/config/queue.ts`
- `src/config/redis.ts`

#### Middleware Files
- `src/middleware/auth.ts`
- `src/middleware/cerbos-migration-helpers.ts`
- `src/middleware/errorHandling.ts`
- `src/middleware/performanceMonitor.ts`
- `src/middleware/rateLimiting.ts`
- `src/middleware/requireCerbosPermission.ts`
- `src/middleware/resourcePermissions.ts`
- `src/middleware/responseCache.ts`
- `src/middleware/sanitization.ts`
- `src/middleware/validation.ts`
- `src/middleware/validation-fix.ts`

#### Route Files
- `src/routes/ai-suggestions.ts`
- `src/routes/aiContent.ts`
- `src/routes/auth.ts`
- `src/routes/availability.ts`
- `src/routes/budgets.ts`
- `src/routes/calendar.ts`
- `src/routes/cerbos.ts`
- `src/routes/communication.ts`
- `src/routes/dashboard.ts`
- `src/routes/dashboard-metrics.ts`
- `src/routes/documents.ts`
- `src/routes/expenses.ts`
- `src/routes/financial.ts`
- `src/routes/financialReports.ts`
- `src/routes/financialTransactions.ts`
- `src/routes/games.ts`
- `src/routes/invitations.ts`
- `src/routes/messages.ts`
- `src/routes/notifications.ts`
- `src/routes/organizations.ts`
- `src/routes/payment-calculations.ts`
- `src/routes/pay-rate-schedules.ts`
- `src/routes/payments.ts`
- `src/routes/permissions.ts`
- `src/routes/referees.ts`
- `src/routes/reports.ts`
- `src/routes/resources.ts`
- `src/routes/roles.ts`
- `src/routes/schedule-wizard.ts`
- `src/routes/seasons.ts`
- `src/routes/settings.ts`
- `src/routes/tfa.ts`
- `src/routes/two-factor.ts`
- `src/routes/users.ts`
- `src/routes/venues.ts`

#### Service Files
- `src/services/*.ts` (all service files)

#### Type Definition Files
- `src/types/*.ts` (all type files)

#### Utility Files
- `src/utils/*.ts` (all utility files)

#### Test Files
- `src/__tests__/**/*.ts`
- `src/**/__tests__/*.ts`

---

## Frontend Issues (WARNINGS)

The frontend linting completed but reported **2000+ warnings** across multiple categories.

### Issue Categories

#### 1. Import Order Issues (~400+ instances)
**Rule:** `import/order`

Files affected include virtually all component and page files.

**Example:**
```typescript
// Bad
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import axios from 'axios'

// Good - grouped imports with blank lines
import { useState } from 'react'

import axios from 'axios'

import { Card } from '@/components/ui/card'
```

**Repair:** Run ESLint with `--fix` flag or use an import sorting plugin.

#### 2. Unused Variables (~300+ instances)
**Rules:** `no-unused-vars`, `@typescript-eslint/no-unused-vars`

Common patterns:
- Destructured variables not used: `const { data, error } = ...` where `error` unused
- Imported components not used
- Function parameters not used

**Files with most issues:**
- `app/admin/audit-logs/page.tsx` (Activity, Download, Users imports)
- `app/admin/notifications/broadcast/page.tsx` (estimatedRecipients, setEstimatedRecipients)
- `app/api/resources/categories/route.ts`
- `components/resource-*.tsx` files
- `lib/rbac-scanner.ts`

**Repair:** Remove unused imports/variables or prefix with `_` if intentionally unused.

#### 3. Console Statements (~200+ instances)
**Rule:** `no-console`

Files with console.log statements that should be removed or replaced with proper logging:
- `app/admin/audit-logs/page.tsx`
- `app/admin/notifications/broadcast/page.tsx`
- `app/api/**/*.ts` (API routes)
- `lib/*.ts` (utility files)
- `components/**/*.tsx`

**Repair:** Remove console statements or use a proper logging utility.

#### 4. Trailing Commas (~150+ instances)
**Rule:** `comma-dangle`

The project has inconsistent trailing comma usage.

**Repair:** Run `eslint --fix` or configure Prettier for consistent formatting.

#### 5. Indentation Issues (~100+ instances)
**Rule:** `indent`

Several files have mixed 2-space and 4-space indentation.

**Files affected:**
- `app/admin/notifications/broadcast/page.tsx`
- `lib/theme-colors.ts`
- `components/referee-schedule-view-modal.tsx`
- Many others

**Repair:** Run `eslint --fix` or use Prettier.

#### 6. Explicit `any` Type (~100+ instances)
**Rule:** `@typescript-eslint/no-explicit-any`

Files using `any` type that should be properly typed:
- `lib/types/audit.ts`
- `lib/rbac-config.ts`
- `components/financial/**/*.tsx`
- `lib/toast-utils.ts`

**Repair:** Replace `any` with proper types or use `unknown` with type guards.

#### 7. React Hooks Dependencies (~50+ instances)
**Rule:** `react-hooks/exhaustive-deps`

Components with missing dependencies in useEffect/useCallback/useMemo:
- `app/admin/audit-logs/page.tsx` - missing `loadAuditLogs`
- Various dashboard and data-fetching components

**Repair:** Add missing dependencies or use `useCallback` to memoize functions.

#### 8. Unescaped Entities (~30+ instances)
**Rule:** `react/no-unescaped-entities`

JSX containing unescaped quotes/apostrophes:
```tsx
// Bad
<p>Don't do this</p>

// Good
<p>Don&apos;t do this</p>
```

#### 9. Anonymous Default Exports (~20+ instances)
**Rule:** `import/no-anonymous-default-export`

Files affected:
- `lib/rbac-config.ts`
- `lib/theme-colors.ts`

**Repair:** Assign to named variable before exporting.

#### 10. Non-null Assertions (~10+ instances)
**Rule:** `@typescript-eslint/no-non-null-assertion`

Usage of `!` operator that should use proper null checks:
- `lib/rbac-scanner.ts`

---

## Repair Priority

### Critical (Must Fix)

1. **Backend TypeScript ESLint Configuration**
   - Without this fix, no TypeScript files can be properly linted
   - Estimated effort: 1 configuration update

### High Priority

2. **Unused Variables** - Dead code should be removed
3. **React Hooks Dependencies** - Can cause bugs and stale closures
4. **Explicit `any` Types** - Type safety issues

### Medium Priority

5. **Console Statements** - Should use proper logging
6. **Import Order** - Code organization
7. **Unescaped Entities** - Potential display issues

### Low Priority (Auto-fixable)

8. **Trailing Commas** - Run `eslint --fix`
9. **Indentation** - Run `eslint --fix`
10. **Anonymous Exports** - Quick manual fixes

---

## Quick Fix Commands

### Frontend (Auto-fix what's possible)
```bash
cd frontend
npm run lint -- --fix
```

### Backend (After TypeScript ESLint is configured)
```bash
cd backend
npm run lint:fix
```

### Format All Code
```bash
# Frontend
cd frontend && npm run format

# Backend
cd backend && npm run format
```

---

## Files Requiring Manual Review

These files have complex issues requiring human review:

| File | Issues | Priority |
|------|--------|----------|
| `lib/rbac-scanner.ts` | 15+ warnings, unused vars, non-null assertions | High |
| `lib/rbac-config.ts` | `any` types, anonymous export | High |
| `app/admin/audit-logs/page.tsx` | 19 warnings, hooks deps | Medium |
| `app/admin/notifications/broadcast/page.tsx` | 30+ warnings | Medium |
| `lib/types/audit.ts` | 7 `any` types | Medium |
| `components/referee-schedule-view-modal.tsx` | Indent issues, unused vars | Low |

---

## Recommended Next Steps

1. **Immediate:** Fix backend ESLint TypeScript configuration
2. **Short-term:** Run auto-fix on frontend, review and commit
3. **Medium-term:** Address unused variables and `any` types
4. **Ongoing:** Add pre-commit hooks to prevent new lint errors
