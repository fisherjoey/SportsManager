# Comprehensive Test Fixing Plan - Sports Management Application

## Executive Summary

**Current State**: 
- Backend: 91% route coverage, but tests cannot run due to database configuration
- Frontend: 181 failed tests out of 345 total (47% failure rate)
- Integration: No proper API mocking, causing unreliable tests

**Goal**: Achieve 100% functional test coverage with reliable, fast execution

## Critical Issues (Must Fix First)

### 1. Backend Test Database Configuration
**Problem**: Tests fail with "database 'sports_management_test' does not exist"
**Impact**: ALL backend tests are non-functional
**Solution**:

```bash
# Step 1: Create test database
createdb sports_management_test

# Step 2: Create test environment file
# backend/.env.test
DATABASE_URL=postgresql://postgres:password@localhost:5432/sports_management_test
NODE_ENV=test
JWT_SECRET=test-secret-key
```

**Implementation**:
- Create database setup script
- Add to CI/CD pipeline
- Document in README

### 2. Frontend Authentication Test Failures
**Problem**: 181 tests failing due to missing AuthProvider context
**Files Affected**:
- `__tests__/components/budget-tracker.test.tsx`
- `__tests__/auth-provider.test.tsx`
- Component tests requiring authentication

**Solution**:
```typescript
// Create test wrapper utility
const renderWithAuth = (component, options = {}) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>,
    options
  );
};
```

### 3. API Integration Test Infrastructure
**Problem**: No consistent API mocking strategy
**Impact**: Tests make real API calls or use inconsistent mocks

**Solution**: Implement MSW (Mock Service Worker)
```bash
npm install --save-dev msw
```

## Detailed Problem Breakdown

### Backend Testing Problems

| Problem | Severity | Impact | Solution |
|---------|----------|--------|----------|
| Missing test database | CRITICAL | No tests can run | Create database, configure environment |
| 4 routes without tests | HIGH | Missing coverage for calendar, documents, workflows, assets | Write comprehensive tests |
| Test isolation issues | MEDIUM | Tests may affect each other | Implement proper cleanup |
| Slow test execution | LOW | CI/CD delays | Optimize database operations |

### Frontend Testing Problems

| Problem | Severity | Impact | Solution |
|---------|----------|--------|----------|
| AuthProvider missing | CRITICAL | 181 test failures | Wrap components properly |
| No API mocking | CRITICAL | Unreliable tests | Implement MSW |
| Games using mock data | HIGH | Not testing real integration | Connect to actual API |
| Missing E2E flows | HIGH | User journeys untested | Write Playwright tests |
| No error handling tests | MEDIUM | Errors uncaught | Add error scenarios |

## Step-by-Step Implementation Plan

### Phase 1: Fix Critical Infrastructure (Day 1)

#### Step 1.1: Backend Database Setup
```javascript
// backend/scripts/setup-test-db.js
const { exec } = require('child_process');
const knex = require('../src/config/database');

async function setupTestDatabase() {
  console.log('Creating test database...');
  
  // Create database
  exec('createdb sports_management_test', async (error) => {
    if (error && !error.message.includes('already exists')) {
      console.error('Error creating database:', error);
      process.exit(1);
    }
    
    // Run migrations
    console.log('Running migrations...');
    await knex.migrate.latest();
    
    // Seed test data
    console.log('Seeding test data...');
    await knex.seed.run();
    
    console.log('Test database ready!');
    process.exit(0);
  });
}

setupTestDatabase();
```

#### Step 1.2: Frontend Test Wrapper
```typescript
// __tests__/utils/test-helpers.tsx
import { AuthProvider } from '@/components/auth-provider';
import { render } from '@testing-library/react';

export const renderWithProviders = (ui, options = {}) => {
  const AllProviders = ({ children }) => (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
  
  return render(ui, { wrapper: AllProviders, ...options });
};

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin',
  name: 'Test User'
};
```

### Phase 2: Implement API Mocking (Day 2)

#### Step 2.1: MSW Setup
```typescript
// __tests__/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Authentication
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        token: 'mock-jwt-token',
        user: { id: '1', email: 'test@example.com', role: 'admin' }
      })
    );
  }),
  
  // Games
  rest.get('/api/games', (req, res, ctx) => {
    return res(
      ctx.json({
        games: [
          { id: '1', game_number: 'G001', date_time: '2024-01-01', field: 'Field 1' }
        ],
        total: 1
      })
    );
  }),
  
  // Referees
  rest.get('/api/referees', (req, res, ctx) => {
    return res(
      ctx.json({
        referees: [
          { id: '1', name: 'John Doe', email: 'john@example.com', level: 'senior' }
        ],
        total: 1
      })
    );
  })
];

// __tests__/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

#### Step 2.2: Jest Setup Integration
```javascript
// jest.setup.js (add to existing)
import { server } from './__tests__/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Phase 3: Fix Failing Tests (Days 3-4)

#### Step 3.1: Fix Authentication Tests
```typescript
// __tests__/auth-provider.test.tsx
import { renderWithProviders, mockUser } from './utils/test-helpers';
import { AuthProvider } from '@/components/auth-provider';
import { waitFor } from '@testing-library/react';

describe('AuthProvider', () => {
  test('should login successfully', async () => {
    const { result } = renderWithProviders(
      <TestComponent />
    );
    
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });
    
    await result.current.login('test@example.com', 'password');
    
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });
});
```

#### Step 3.2: Fix Component Tests
```typescript
// __tests__/components/budget-tracker.test.tsx
import { renderWithProviders } from '../utils/test-helpers';
import { BudgetTracker } from '@/components/budget-tracker';
import { screen, waitFor } from '@testing-library/react';

describe('BudgetTracker', () => {
  test('should display budget information', async () => {
    renderWithProviders(<BudgetTracker />);
    
    await waitFor(() => {
      expect(screen.getByText(/Budget Overview/i)).toBeInTheDocument();
    });
    
    // Test budget data loading
    await waitFor(() => {
      expect(screen.getByText(/Total Budget/i)).toBeInTheDocument();
    });
  });
});
```

### Phase 4: Write Missing Tests (Days 5-6)

#### Step 4.1: Backend Route Tests
```javascript
// backend/tests/routes/calendar.test.js
const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb } = require('../helpers');

describe('Calendar Routes', () => {
  beforeAll(setupTestDb);
  afterAll(cleanupTestDb);
  
  describe('GET /api/calendar/events', () => {
    test('should return calendar events', async () => {
      const response = await request(app)
        .get('/api/calendar/events')
        .set('Authorization', 'Bearer test-token')
        .expect(200);
        
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });
  });
  
  describe('POST /api/calendar/events', () => {
    test('should create calendar event', async () => {
      const event = {
        title: 'Test Event',
        date: '2024-01-01',
        type: 'game'
      };
      
      const response = await request(app)
        .post('/api/calendar/events')
        .send(event)
        .set('Authorization', 'Bearer test-token')
        .expect(201);
        
      expect(response.body.title).toBe(event.title);
    });
  });
});
```

#### Step 4.2: Integration Tests
```typescript
// tests/frontend/user-flows/referee-assignment.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Referee Assignment Flow', () => {
  test('should assign referee to game', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to games
    await page.waitForURL('/dashboard');
    await page.click('text=Games');
    
    // Select a game
    await page.click('tr:first-child button:has-text("Assign")');
    
    // Assign referee
    await page.selectOption('select[name="referee"]', 'John Doe');
    await page.click('button:has-text("Confirm Assignment")');
    
    // Verify assignment
    await expect(page.locator('.toast-success')).toContainText('Referee assigned');
  });
});
```

### Phase 5: Continuous Testing Setup (Day 7)

#### Step 5.1: Pre-commit Hook
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:affected"
    }
  }
}
```

#### Step 5.2: CI/CD Test Pipeline
```yaml
# .github/workflows/test-pipeline.yml
name: Test Pipeline
on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sports_management_test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm ci
      - run: cd backend && npm run test:coverage
      
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:frontend
```

## Test Execution Commands

### Backend Tests
```bash
# Setup test database (first time only)
cd backend && node scripts/setup-test-db.js

# Run all tests
cd backend && npm test

# Run with coverage
cd backend && npm run test:coverage

# Run specific test file
cd backend && npm test -- routes/games.test.js

# Run in watch mode
cd backend && npm run test:watch
```

### Frontend Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:frontend

# Debug E2E tests
npm run test:frontend:debug

# Run specific test
npm test -- --testNamePattern="AuthProvider"
```

## Success Metrics

### Week 1 Goals
- [ ] Backend tests running successfully
- [ ] Frontend auth tests fixed
- [ ] API mocking implemented
- [ ] 50% reduction in test failures

### Week 2 Goals
- [ ] All missing backend route tests written
- [ ] Critical E2E flows implemented
- [ ] Test execution time < 5 minutes
- [ ] 95% test success rate

### Month 1 Goals
- [ ] 100% backend route coverage
- [ ] 80% frontend component coverage
- [ ] Full E2E test suite for critical paths
- [ ] Automated test execution in CI/CD

## Testing Best Practices

### DO's
- ✅ Write tests before fixing bugs
- ✅ Test user behavior, not implementation
- ✅ Use descriptive test names
- ✅ Keep tests isolated and independent
- ✅ Mock external dependencies
- ✅ Test error scenarios

### DON'Ts
- ❌ Never delete tests without approval
- ❌ Don't test implementation details
- ❌ Avoid testing third-party libraries
- ❌ Don't use production data in tests
- ❌ Never skip failing tests

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)

## Support

For questions or issues:
- Check test output for specific errors
- Review test helper utilities
- Consult team documentation
- Use `npm run test:debug` for debugging

---

**Document Status**: Ready for Implementation
**Last Updated**: 2024-08-29
**Priority**: CRITICAL - Tests must be functional for reliable deployments