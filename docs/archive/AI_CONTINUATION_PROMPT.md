# AI Continuation Prompt

## Context
You are continuing work on a Sports Management application's test infrastructure. The previous session diagnosed and partially fixed critical testing issues. The application has 167 test files that were completely non-functional. We've made progress but significant work remains.

## Current Situation

### What's Working
- Frontend running on http://localhost:3007
- Backend API running on http://localhost:3001  
- Test database exists with core tables (sports_management_test)
- 16 out of 18 auth tests passing in frontend
- All database fix scripts are in backend/scripts/

### What's Broken
- 165 out of 167 test files cannot run
- Backend tests fail due to API response structure mismatch
- No API mocking (MSW not installed)
- 70+ migrations are broken and cause conflicts
- Frontend tests missing AuthProvider context

### Key Files to Review
1. **HANDOVER_DOCUMENT.md** - Complete session summary
2. **TEST_FIXING_PLAN.md** - Step-by-step instructions
3. **MIGRATION_FIX_PLAN.md** - Database migration strategy
4. **backend/scripts/fix-test-database.js** - Working database setup

## Your Primary Objectives

### 1. Fix API Response Mismatch (PRIORITY 1)
The tests expect nested response structure but API returns flat structure:
```javascript
// Tests expect: response.body.data.token
// API returns: response.body.token
```
**Action**: Update tests to match actual API responses, NOT the other way around.

### 2. Implement MSW for API Mocking (PRIORITY 2)
```bash
npm install --save-dev msw
```
Then create mocks in `__tests__/mocks/handlers.js`

### 3. Fix Frontend Test Wrappers (PRIORITY 3)
Create test utilities that wrap components with AuthProvider context.

### 4. Get Backend Tests Running (PRIORITY 4)
After fixing response structure, backend auth tests should pass.

## Important Constraints

### DO NOT
- ❌ Change production code to match old tests
- ❌ Run `knex migrate:latest` (migrations are broken)
- ❌ Delete any test files
- ❌ Modify the database schema

### DO
- ✅ Fix tests to match current API behavior
- ✅ Document actual API responses
- ✅ Create backward compatibility layers if needed
- ✅ Make incremental changes (one test file at a time)

## Technical Details

### Database Access
- **Test DB Name**: sports_management_test
- **Username**: postgres
- **Password**: password
- **Reset Command**: `node backend/scripts/fix-test-database.js`

### Test Execution
```bash
# Frontend tests
npm test

# Backend tests (set environment first)
cd backend
set NODE_ENV=test  # Windows
export NODE_ENV=test  # Mac/Linux
npm test

# E2E tests (currently blocked)
npm run test:frontend
```

### Known Issues
1. Windows environment needs `set` instead of `export`
2. Ports 3000-3006 are in use, app uses 3007
3. Whistle icon doesn't exist in lucide-react (use Zap instead)
4. Test database has no persistence between resets

## Success Criteria

You'll know you're successful when:
1. At least 50% of test files can execute
2. Backend auth tests pass (12 tests)
3. Frontend tests have >70% pass rate
4. API mocking is working with MSW

## Recommended Approach

1. **Start Small**: Fix one backend auth test first
2. **Document Changes**: Update TEST_STATUS_REPORT.md as you progress
3. **Test Incrementally**: Run tests after each change
4. **Commit Frequently**: Use descriptive commit messages

## Additional Context

### Philosophy
The code is working in production. Tests are outdated documentation of old intentions. Update tests to reflect reality, not the other way around. Think of it as updating city planning documents to match the actual city that exists.

### Migration Strategy
There are 70+ broken migrations. Don't try to fix them all. The MIGRATION_FIX_PLAN.md recommends consolidating into a single migration. This is a separate task - focus on tests first.

### Test Statistics
- Total: 167 test files
- Frontend: 17 files (345 individual tests)
- Backend: 112 files 
- E2E: 38 files
- Currently executable: 2 files (1.2%)

## Questions to Consider

1. Should we version the API (v1, v2) to support both response formats?
2. Should we create a test-specific API mode that returns expected format?
3. Should we add contract tests to prevent future divergence?
4. Is it worth fixing all 70+ migrations or just consolidating?

## Your First Task

1. Read HANDOVER_DOCUMENT.md completely
2. Check current test status: `cd backend && npm test` (expect failures)
3. Fix the first auth test by updating response expectations
4. Commit the fix with message: "fix: Update auth tests to match API response structure"

Good luck! The foundation is solid - you just need to align tests with reality.

---

*Note: All previous work is documented in detail. Check the markdown files in the project root for specific plans and strategies.*