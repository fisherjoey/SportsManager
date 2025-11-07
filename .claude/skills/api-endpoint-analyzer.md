# API Endpoint Analyzer

Analyzes all backend API endpoints to ensure quality, consistency, and security.

## Description

This skill scans all route files in `backend/src/routes/` and analyzes them for:
- Missing Cerbos authorization
- Duplicate route patterns
- Missing error handling
- Response consistency
- Documentation completeness
- Security vulnerabilities

## When to use this skill

Use this skill when you need to:
- Audit all API endpoints for security and quality
- Identify endpoints missing Cerbos authorization
- Find duplicate or conflicting routes
- Check endpoint documentation coverage
- Validate error handling patterns
- Generate an endpoint quality report

## How to use this skill

Simply invoke the skill with optional parameters:

**Examples:**
- "Analyze all API endpoints"
- "Check which endpoints are missing Cerbos authorization"
- "Find duplicate routes"
- "Generate endpoint quality report"

## What this skill will do

### 1. Scan All Route Files

- Read all TypeScript files in `backend/src/routes/`
- Parse route definitions (GET, POST, PUT, DELETE, PATCH)
- Extract middleware usage
- Identify handler functions

### 2. Authorization Analysis

Check each endpoint for:
- `requireCerbosPermission()` middleware usage
- Proper resource/action definitions
- Authentication middleware (`requireAuth()`)
- Authorization bypass (DISABLE_AUTH flag usage)

**Expected Pattern:**
```typescript
router.get(
  '/api/resource/:id',
  requireAuth,
  requireCerbosPermission('resource', 'view'),
  async (req, res) => { ... }
);
```

### 3. Error Handling Analysis

Verify each endpoint has:
- Try-catch blocks
- Proper error responses (4xx, 5xx)
- Error logging
- Validation error handling
- Database error handling

**Expected Pattern:**
```typescript
try {
  // Logic
  res.json(result);
} catch (error) {
  logger.error('Error message', error);
  res.status(500).json({ error: 'Message' });
}
```

### 4. Route Conflict Detection

Find:
- Duplicate route paths
- Conflicting path parameters
- Overlapping regex patterns
- Method conflicts on same path

### 5. Response Consistency

Check that responses follow project standards:
- Consistent JSON structure
- Proper status codes
- Pagination patterns (limit, offset)
- Error response format

**Expected Response Format:**
```typescript
// Success
{ data: [...], pagination: { total, limit, offset } }

// Error
{ error: 'message', code: 'ERROR_CODE' }
```

### 6. Documentation Check

Verify:
- JSDoc comments on route handlers
- Inline comments for complex logic
- API.md documentation entries
- Request/response type definitions

## Output Format

Generate a comprehensive report with:

### Executive Summary
- Total endpoints analyzed
- Endpoints with issues
- Critical issues count
- Recommendations

### Missing Cerbos Authorization
```
⚠️ CRITICAL: 12 endpoints missing Cerbos authorization

GET /api/games/:id (games.ts:45)
POST /api/assignments (assignments.ts:120)
...
```

### Duplicate Routes
```
⚠️ WARNING: 3 duplicate route patterns

GET /api/users/:id
  - users.ts:30
  - admin/users.ts:15

POST /api/games
  - games.ts:80
  - calendar.ts:220
```

### Missing Error Handling
```
⚠️ WARNING: 8 endpoints without proper error handling

GET /api/referees (referees.ts:60)
  - Missing try-catch block
  - No error logging

PUT /api/teams/:id (teams.ts:140)
  - Generic error response
  - No specific error codes
```

### Response Inconsistencies
```
ℹ️ INFO: 5 endpoints with non-standard responses

GET /api/locations (locations.ts:90)
  - Expected: { data, pagination }
  - Actual: { locations, count }

GET /api/budgets (budgets.ts:45)
  - Missing pagination
```

### Undocumented Endpoints
```
ℹ️ INFO: 15 endpoints missing documentation

POST /api/mentees/:id/analytics (mentees.ts:200)
DELETE /api/communications/:id (communications.ts:180)
...
```

### Quality Score
```
Overall Endpoint Quality: 82/100

✅ Authorization Coverage: 95% (315/330)
⚠️ Error Handling: 78% (258/330)
✅ Documentation: 88% (290/330)
⚠️ Response Consistency: 72% (238/330)
✅ No Route Conflicts: 100%
```

## Recommendations

Based on the analysis, provide:

1. **Immediate Actions** (Critical Issues)
   - Add Cerbos auth to 12 endpoints
   - Fix 3 duplicate routes
   - Add error handling to 8 endpoints

2. **Short-term Improvements** (Warnings)
   - Standardize response formats
   - Add missing documentation
   - Improve error messages

3. **Best Practices** (Suggestions)
   - Use consistent validation patterns
   - Add request/response type definitions
   - Implement API versioning

## Integration with Audit

Cross-reference findings with:
- `docs/audit-2025-10-18/backend/BACKEND_ROUTES_CATALOG.md`
- `docs/audit-2025-10-18/implementation/PRIORITY_ACTION_CHECKLIST.md`

Show which audit tasks are affected by findings.

## Success Criteria

This skill is successful when:
- All 330+ endpoints are analyzed
- Critical security issues are identified
- Actionable recommendations are provided
- Quality score is calculated
- Report is clear and prioritized

## Notes

- Focus on security issues first (missing auth)
- Consider route order (specific before generic)
- Check for deprecated endpoints
- Validate against OpenAPI/Swagger if available
- Compare against frontend requirements (frontend-api-calls.json)
