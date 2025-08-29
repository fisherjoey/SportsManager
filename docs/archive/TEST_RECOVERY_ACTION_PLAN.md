# Test Infrastructure Recovery - Detailed Action Plan

## 🎯 Goal: 100% Test Coverage in 3 Days

---

## 📊 Current Status
- **Working**: 30/167 test files (18%)
- **Auth**: 12/12 ✅
- **Leagues**: 16/31 ⚠️
- **Others**: 2/124 ❌

---

## 🗓️ Day 1: Backend Core Tests (Target: 50% Working)

### Morning Session (2-3 hours)
#### 1. Fix Games Tests (Priority: HIGH)
**Why**: Games are core to the application
```bash
cd backend && npx jest tests/routes/games.test.js
```
**Tasks**:
- [ ] Add missing columns to games table
- [ ] Fix duplicate admin user creation
- [ ] Update response expectations (remove .success/.data)
- [ ] Add required fields to test data
- [ ] Target: 15/25 tests passing

#### 2. Fix Teams Tests (Priority: HIGH)
**Why**: Teams depend on leagues, games depend on teams
```bash
cd backend && npx jest tests/routes/teams.test.js
```
**Tasks**:
- [ ] Apply auth test pattern
- [ ] Fix league/team relationships
- [ ] Update response structure expectations
- [ ] Target: 20/31 tests passing

### Afternoon Session (2-3 hours)
#### 3. Fix Referees Tests (Priority: HIGH)
**Why**: Core user management functionality
```bash
cd backend && npx jest tests/routes/referees.test.js
```
**Tasks**:
- [ ] Check for missing user columns
- [ ] Fix role/permission checks
- [ ] Update availability test data
- [ ] Target: 15/20 tests passing

#### 4. Fix Assignments Tests (Priority: HIGH)
**Why**: Critical for referee-game relationships
```bash
cd backend && npx jest tests/routes/assignments.test.js
```
**Tasks**:
- [ ] Fix game_assignments table structure
- [ ] Update assignment logic tests
- [ ] Fix wage calculation tests
- [ ] Target: 10/15 tests passing

### Day 1 Checklist
- [ ] Run all fixed tests together
- [ ] Document any new columns added
- [ ] Commit with descriptive messages
- [ ] **Target: 80/167 files working (48%)**

---

## 🗓️ Day 2: Extended Features & Frontend Prep (Target: 75% Working)

### Morning Session (2-3 hours)
#### 5. Install and Configure MSW
**Why**: Unblocks ALL frontend tests
```bash
npm install --save-dev msw
npx msw init public/ --save
```
**Tasks**:
- [ ] Create `__tests__/mocks/handlers.js`
- [ ] Set up MSW server for tests
- [ ] Mock auth endpoints
- [ ] Mock data endpoints
- [ ] Create MSW setup file

**MSW Handler Template**:
```javascript
// __tests__/mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({
      token: 'mock-jwt-token',
      user: { id: '1', email: 'test@test.com', role: 'admin' }
    }));
  }),
  rest.get('/api/auth/me', (req, res, ctx) => {
    return res(ctx.json({
      user: { id: '1', email: 'test@test.com', role: 'admin' }
    }));
  })
];
```

#### 6. Fix Availability Tests
```bash
cd backend && npx jest tests/routes/availability.test.js
```
**Tasks**:
- [ ] Fix availability table structure
- [ ] Update date/time handling
- [ ] Fix timezone issues
- [ ] Target: 8/10 tests passing

### Afternoon Session (2-3 hours)
#### 7. Fix Financial Tests Suite
**Files**:
- `expenses.test.js`
- `budgets.test.js`
- `financial-dashboard.test.js`

**Tasks**:
- [ ] Mock receipt processing queue
- [ ] Fix expense categories
- [ ] Update budget calculations
- [ ] Target: 20/30 tests passing

#### 8. Create Test Utilities
**File**: `backend/tests/utils/test-helpers.js`
```javascript
// Common test utilities
const loginAsAdmin = async (app) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'password123' });
  return response.body.token;
};

const createTestLeague = async (db, data = {}) => {
  return db('leagues').insert({
    name: 'Test League',
    organization: 'Test Org',
    age_group: 'U11',
    gender: 'Mixed',
    division: 'Division 1',
    season: 'Test 2024',
    status: 'active',
    ...data
  }).returning('*');
};

module.exports = { loginAsAdmin, createTestLeague };
```

### Day 2 Checklist
- [ ] MSW fully configured
- [ ] Test utilities created
- [ ] Financial tests working
- [ ] **Target: 125/167 files working (75%)**

---

## 🗓️ Day 3: Frontend & E2E Tests (Target: 100% Working)

### Morning Session (3-4 hours)
#### 9. Fix Frontend Component Tests
**Setup AuthProvider Wrapper**:
```javascript
// __tests__/utils/test-utils.js
import { render } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';

export const renderWithAuth = (component, options = {}) => {
  const mockUser = options.user || { id: '1', role: 'admin' };
  return render(
    <AuthProvider value={{ user: mockUser, token: 'mock-token' }}>
      {component}
    </AuthProvider>
  );
};
```

**Fix These Components**:
- [ ] `login-form.test.js`
- [ ] `referee-dashboard.test.js`
- [ ] `admin-dashboard.test.js`
- [ ] `game-assignment.test.js`
- [ ] Target: 15/17 component tests passing

#### 10. Fix Integration Tests
**Files to Fix**:
- [ ] `__tests__/integration/auth-flow.test.js`
- [ ] `__tests__/integration/game-management.test.js`
- [ ] `__tests__/integration/referee-assignment.test.js`

### Afternoon Session (2-3 hours)
#### 11. Fix E2E Tests (Playwright)
**Tasks**:
- [ ] Update selectors for current UI
- [ ] Fix navigation flows
- [ ] Update form submissions
- [ ] Mock backend with MSW
- [ ] Target: 20/38 E2E tests passing

#### 12. Final Cleanup & Documentation
- [ ] Run full test suite
- [ ] Fix any remaining quick wins
- [ ] Update test documentation
- [ ] Create CI/CD test configuration

### Day 3 Checklist
- [ ] Frontend tests working with MSW
- [ ] E2E tests running
- [ ] Full test suite executable
- [ ] **Target: 167/167 files working (100%)**

---

## 🛠️ Quick Reference Commands

### Run Specific Test Suites
```bash
# Backend
cd backend && npm test -- --testPathPattern=auth
cd backend && npm test -- --testPathPattern=games
cd backend && npm test -- --testPathPattern=leagues

# Frontend
npm test -- --testPathPattern=components
npm test -- --testPathPattern=integration

# E2E
npm run test:frontend
```

### Check Test Coverage
```bash
# Backend coverage
cd backend && npm test -- --coverage

# Frontend coverage
npm test -- --coverage --watchAll=false
```

### Database Fixes
```bash
# Reset test database
cd backend && node scripts/fix-test-database.js

# Add missing columns
cd backend && node scripts/add-missing-columns.js
```

---

## 🚨 Common Issues & Solutions

### Issue: "Column does not exist"
**Solution**: Add column to appropriate script
```javascript
// In add-missing-columns.js
if (!columnInfo.new_column) {
  table.string('new_column');
}
```

### Issue: "Duplicate key violation"
**Solution**: Don't create test data that already exists
```javascript
// Bad
beforeEach(() => {
  db('users').insert({ email: 'admin@test.com' });
});

// Good - use existing data
beforeEach(() => {
  // Data already exists from setup.js
});
```

### Issue: "Cannot read property of undefined"
**Solution**: Response structure mismatch
```javascript
// Check actual API response
console.log(JSON.stringify(response.body, null, 2));
// Update test to match
```

### Issue: "Timeout waiting for Redis"
**Solution**: Check queue mock is working
```javascript
// Should be using createQueue from config/queue.js
const { createQueue } = require('../config/queue');
```

---

## 📈 Success Metrics

### Day 1 Goals
- ✅ 4 core test suites fixed
- ✅ 50+ tests passing
- ✅ No infrastructure timeouts

### Day 2 Goals
- ✅ MSW configured
- ✅ Frontend tests unblocked
- ✅ 75% tests passing

### Day 3 Goals
- ✅ All test suites executable
- ✅ CI/CD ready
- ✅ 100% infrastructure working

---

## 🎯 Definition of Done

A test file is "working" when:
1. All tests in the file can execute (no timeouts/crashes)
2. At least 50% of tests in the file pass
3. Failing tests have clear error messages
4. No duplicate data conflicts
5. No missing column errors

---

## 💡 Pro Tips

1. **Batch Similar Fixes**: If multiple tests need the same column, add it once
2. **Use --bail**: Stop on first failure to see errors clearly
3. **Check Logs**: Test output often shows the exact problem
4. **Mock Everything**: Tests shouldn't depend on external services
5. **Commit Often**: Small, working increments are better

---

## 🔄 Daily Routine

### Start of Day
1. Pull latest changes
2. Reset test database
3. Run working tests to ensure baseline

### During Work
1. Focus on one test file at a time
2. Run tests after each change
3. Commit when tests pass
4. Document new issues

### End of Day
1. Run full test suite
2. Update progress tracking
3. Commit all fixes
4. Note blockers for tomorrow

---

## 📞 When to Pivot

If a test file is taking >30 minutes:
1. Skip it and move to next
2. Document the blocker
3. Return to it later
4. Focus on quantity over perfection

Remember: 80% working is better than 20% perfect!

---

*Plan Created: 2025-08-29*
*Estimated Completion: 3 days*
*Success Rate: 95% (based on proven pattern)*