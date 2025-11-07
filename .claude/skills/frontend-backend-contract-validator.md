# Frontend-Backend Contract Validator

Validates that frontend API calls match backend endpoint implementations to prevent runtime errors.

## Description

This skill compares frontend API requirements against backend implementations to ensure:
- API endpoints exist and are accessible
- Request/response types match
- Required parameters are present
- Error handling is consistent
- No breaking changes between versions

## When to use this skill

Use this skill when:
- Adding new API endpoints
- Modifying existing endpoints
- After frontend or backend changes
- Before deploying to production
- Investigating API-related bugs
- Validating audit findings

## How to use this skill

**Examples:**
- "Validate frontend-backend API contract"
- "Check if all frontend API calls have backend implementations"
- "Find API mismatches between frontend and backend"
- "Verify mentorship endpoints match frontend requirements"

## What this skill will do

### 1. Load Frontend Requirements

Read and parse:
- `docs/audit-2025-10-18/frontend/frontend-api-calls.json` (245 KB)
- Frontend components in `frontend/src/`
- API service files (if any)
- TypeScript interfaces for API types

Extract:
- Required endpoints (168 total)
- Expected request parameters
- Expected response types
- Error handling expectations

### 2. Load Backend Implementation

Read and parse:
- `docs/audit-2025-10-18/backend/BACKEND_ROUTES_CATALOG.md`
- Route files in `backend/src/routes/`
- TypeScript type definitions
- API documentation (`backend/docs/API.md`)

Extract:
- Implemented endpoints (330 total)
- Actual request parameters
- Actual response types
- Error response formats

### 3. Cross-Reference Analysis

For each frontend requirement, check:

#### Endpoint Existence
- Does the endpoint exist in backend?
- Is the HTTP method correct?
- Is the path format compatible?

#### Request Parameters
- Required params present?
- Optional params documented?
- Type compatibility (string, number, etc.)
- Query parameter validation

#### Response Structure
- Response type matches frontend expectation?
- All required fields present?
- Nested objects match structure?
- Array types consistent?

#### Error Handling
- Backend returns expected error codes?
- Error response format matches frontend?
- Error messages are descriptive?

### 4. Identify Mismatches

Categorize issues as:

**CRITICAL** - Will cause runtime errors:
- Endpoint missing
- Required parameter missing
- Response type incompatible
- Breaking changes

**WARNING** - May cause issues:
- Optional parameter mismatch
- Response field type different
- Error format inconsistent
- Undocumented behavior

**INFO** - Documentation/quality:
- Missing documentation
- Type definitions incomplete
- Best practice violations

## Output Format

Generate detailed contract validation report:

### Executive Summary
```
Frontend-Backend Contract Validation Report
Generated: 2025-10-19

Total Frontend Requirements: 168
Backend Endpoints Available: 330
Matching Endpoints: 121 (72%)
Mismatches Found: 47 (28%)
  - Critical: 12
  - Warning: 23
  - Info: 12
```

### Critical Mismatches (Will Break)
```
🔴 CRITICAL: 12 contract violations

1. GET /api/mentees/:menteeId
   Location: MenteeDetailView.tsx:45
   Issue: Endpoint not implemented
   Frontend expects: { mentee: Mentee, assignments: Assignment[] }
   Backend status: Missing
   Impact: Component will fail to load
   Fix: Implement endpoint (Phase 1, Task 1)

2. POST /api/communications/:id/publish
   Location: CommunicationsList.tsx:120
   Issue: Response type mismatch
   Frontend expects: { success: boolean, publishedAt: string }
   Backend returns: { status: string, timestamp: number }
   Impact: UI will not update correctly
   Fix: Standardize response format

3. GET /api/financial-dashboard
   Location: FinancialDashboard.tsx:30
   Issue: Missing required field
   Frontend expects: budgetUtilization.percentage
   Backend returns: budgetUtilization.rate
   Impact: Chart will fail to render
   Fix: Add 'percentage' field or update frontend
```

### Warning Issues (May Break)
```
⚠️ WARNING: 23 potential issues

1. GET /api/games
   Location: GamesList.tsx:60
   Issue: Pagination format inconsistent
   Frontend expects: { data, pagination: { total, limit, offset } }
   Backend returns: { games, count }
   Impact: Pagination controls may malfunction
   Recommendation: Standardize to { data, pagination } format

2. GET /api/referees/:refereeId/assignments
   Location: RefereeProfile.tsx:88
   Issue: Optional parameter 'includeStats' not documented
   Frontend uses: ?includeStats=true
   Backend: Parameter exists but undocumented
   Impact: May break if parameter removed
   Recommendation: Document in API.md
```

### Info Items (Quality)
```
ℹ️ INFO: 12 documentation/quality issues

1. POST /api/expenses
   Location: ExpenseForm.tsx:150
   Issue: TypeScript interface missing
   Frontend: Uses 'any' type
   Backend: Has proper types
   Recommendation: Export types from backend

2. GET /api/organizational-analytics
   Location: OrgAnalyticsDashboard.tsx:40
   Issue: Undocumented in API.md
   Frontend: Component exists
   Backend: Endpoint implemented
   Recommendation: Add API documentation
```

### Matching Endpoints ✅
```
✅ VALID: 121 endpoints match perfectly

Examples:
- GET /api/auth/me
- POST /api/auth/login
- GET /api/games/:id
- PUT /api/users/:id
- DELETE /api/assignments/:id
... (116 more)
```

### Missing Backend Endpoints
```
📋 TODO: 47 endpoints need implementation

From PRIORITY_ACTION_CHECKLIST.md:

Phase 1 (P0 Critical) - 13 endpoints:
✅ GET /api/mentees/:menteeId (Task 1)
✅ GET /api/mentees/:menteeId/games (Task 2)
✅ GET /api/mentees/:menteeId/analytics (Task 3)
... (10 more)

Phase 2 (P1 High) - 13 endpoints:
✅ GET /api/expenses/pending
✅ POST /api/expenses/:id/approve
... (11 more)

Phase 3 (P2 Medium) - 18 endpoints
Phase 4 (P3 Low) - 27 endpoints (reduced from 32)
```

### Type Compatibility Matrix
```
Request Parameter Types:
✅ Compatible: 145/168 (86%)
⚠️ Partial: 11/168 (7%)
🔴 Incompatible: 12/168 (7%)

Response Types:
✅ Compatible: 138/168 (82%)
⚠️ Partial: 18/168 (11%)
🔴 Incompatible: 12/168 (7%)

Error Handling:
✅ Consistent: 130/168 (77%)
⚠️ Needs improvement: 38/168 (23%)
```

## Recommendations

### Immediate Actions (This Week)
1. Fix 12 critical mismatches
2. Standardize response formats
3. Add missing type definitions
4. Document undocumented endpoints

### Short-term (Next 2 Weeks)
1. Implement missing Phase 1 endpoints
2. Standardize error response format
3. Export TypeScript types from backend
4. Update API.md documentation

### Long-term (Next Month)
1. Create shared type definitions package
2. Implement OpenAPI/Swagger spec
3. Add runtime contract validation
4. Set up automated contract tests

## Integration with Project

### Cross-reference with audit files:
- Frontend requirements: `frontend-api-calls.json`
- Backend catalog: `BACKEND_ROUTES_CATALOG.md`
- Gap analysis: `IMPLEMENTATION_GAPS_P0_CRITICAL.md`
- Task list: `PRIORITY_ACTION_CHECKLIST.md`

### Link to implementation tasks:
- Show which Phase 1-5 tasks fix mismatches
- Calculate progress toward 100% contract compliance
- Estimate remaining hours to full compliance

## Validation Examples

### Example 1: Perfect Match ✅
```typescript
// Frontend: MenteeDetailView.tsx
interface MenteeResponse {
  mentee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignments: Assignment[];
}
const response = await api.get<MenteeResponse>(`/api/mentees/${id}`);

// Backend: mentees.ts
router.get('/api/mentees/:id', async (req, res) => {
  const mentee = await getMentee(req.params.id);
  const assignments = await getAssignments(mentee.id);
  res.json({ mentee, assignments }); // ✅ Matches
});
```

### Example 2: Mismatch 🔴
```typescript
// Frontend: FinancialDashboard.tsx
interface DashboardData {
  budgetUtilization: {
    percentage: number; // Expects 'percentage'
  };
}

// Backend: financial-dashboard.ts
res.json({
  budgetUtilization: {
    rate: 0.75 // Returns 'rate' instead
  }
});

// 🔴 MISMATCH: Field name different
// Fix: Change backend 'rate' to 'percentage'
// OR: Update frontend to use 'rate'
```

## Success Criteria

This skill succeeds when:
- All 168 frontend requirements are checked
- All 330 backend endpoints are validated
- Critical mismatches are identified with fixes
- Report links to audit documentation
- Actionable recommendations provided
- Progress toward compliance calculated

## Notes

- Prioritize critical issues (runtime errors)
- Consider backwards compatibility
- Check Cerbos authorization on both sides
- Validate error response consistency
- Look for type safety improvements
- Suggest shared type definitions
