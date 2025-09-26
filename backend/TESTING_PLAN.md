# Comprehensive Backend Testing Plan

## Overview
This document outlines the complete testing strategy for the Sports Manager backend migration to TypeScript, including database testing, unit tests, and integration tests.

## Testing Infrastructure Setup

### 1. Test Database Configuration
```typescript
// backend/src/config/database.test.ts
// Separate test database configuration
export const testDbConfig = {
  client: 'sqlite3',
  connection: ':memory:',
  useNullAsDefault: true,
  migrations: {
    directory: './src/migrations'
  }
};
```

### 2. Test Utilities
```typescript
// backend/src/test-utils/setup.ts
export const setupTestDb = async () => {
  // Run migrations on test database
  // Seed with test data
};

export const teardownTestDb = async () => {
  // Clean up test database
};

export const createMockRequest = () => {
  // Mock Express request object
};

export const createMockResponse = () => {
  // Mock Express response object
};
```

## Module Testing Plan

### A. Database Layer Tests

#### 1. Database Configuration (`src/config/database.ts`)
```typescript
// backend/src/config/__tests__/database.test.ts
describe('Database Configuration', () => {
  test('validateEnvironment - validates correct environments');
  test('validateEnvironment - throws on invalid environment');
  test('loadDatabaseConfig - loads correct config for environment');
  test('loadDatabaseConfig - throws on missing config');
  test('validateConnection - establishes database connection');
  test('validateConnection - handles connection errors');
  test('healthCheck - returns healthy status when connected');
  test('healthCheck - returns unhealthy status on failure');
  test('closeConnection - properly closes database connection');
  test('withTransaction - handles transactions correctly');
  test('withTransaction - rolls back on error');
  test('validateSchema - checks for required tables');
  test('validateSchema - reports missing tables');
});
```

#### 2. Database Migrations
```typescript
// backend/src/migrations/__tests__/migrations.test.ts
describe('Database Migrations', () => {
  test('All migrations run successfully');
  test('Migrations are reversible');
  test('Schema matches expected structure after migrations');
  test('Foreign key constraints are properly set');
  test('Indexes are created correctly');
});
```

### B. Middleware Tests

#### 1. Authentication Middleware (`src/middleware/auth.ts`)
```typescript
// backend/src/middleware/__tests__/auth.test.ts
describe('Authentication Middleware', () => {
  describe('authenticateToken', () => {
    test('accepts valid JWT token');
    test('rejects missing authorization header');
    test('rejects invalid token format');
    test('rejects expired tokens');
    test('attaches user to request on success');
  });

  describe('requireRole', () => {
    test('allows access with required role');
    test('denies access without required role');
    test('admin bypass works correctly');
    test('handles missing user object');
  });

  describe('requirePermission', () => {
    test('allows access with required permission');
    test('denies access without permission');
    test('checks database for permissions');
    test('handles permission service errors');
  });

  describe('requireAnyPermission', () => {
    test('allows access with any matching permission');
    test('denies access with no matching permissions');
  });

  describe('requireAllPermissions', () => {
    test('requires all specified permissions');
    test('denies if any permission missing');
  });
});
```

#### 2. Sanitization Middleware (`src/middleware/sanitization.ts`)
```typescript
// backend/src/middleware/__tests__/sanitization.test.ts
describe('Sanitization Middleware', () => {
  test('sanitizes HTML in request body');
  test('sanitizes query parameters');
  test('sanitizes nested objects');
  test('preserves non-string values');
  test('handles arrays correctly');
});
```

### C. Service Layer Tests

#### 1. PermissionService (`src/services/PermissionService.ts`)
```typescript
// backend/src/services/__tests__/PermissionService.test.ts
describe('PermissionService', () => {
  describe('hasPermission', () => {
    test('returns true for users with permission');
    test('returns false for users without permission');
    test('checks role-based permissions');
    test('uses cache when available');
    test('handles database errors gracefully');
  });

  describe('getUserPermissions', () => {
    test('retrieves all user permissions');
    test('includes role-based permissions');
    test('caches results appropriately');
    test('handles invalid user IDs');
  });

  describe('assignPermission', () => {
    test('successfully assigns new permission');
    test('handles duplicate assignments');
    test('validates permission exists');
    test('updates cache after assignment');
  });

  describe('revokePermission', () => {
    test('successfully revokes permission');
    test('handles non-existent assignments');
    test('updates cache after revocation');
  });
});
```

#### 2. UserService (`src/services/UserService.ts`)
```typescript
// backend/src/services/__tests__/UserService.test.ts
describe('UserService', () => {
  describe('createUser', () => {
    test('creates user with hashed password');
    test('validates required fields');
    test('handles duplicate emails');
    test('assigns default role');
  });

  describe('authenticateUser', () => {
    test('authenticates with correct credentials');
    test('rejects invalid password');
    test('handles non-existent user');
    test('generates valid JWT token');
  });

  describe('updateUser', () => {
    test('updates user fields');
    test('prevents unauthorized updates');
    test('validates update data');
    test('handles concurrent updates');
  });

  describe('deleteUser', () => {
    test('soft deletes user');
    test('cascades to related records');
    test('prevents self-deletion');
  });
});
```

#### 3. MentorshipService (`src/services/MentorshipService.ts`)
```typescript
// backend/src/services/__tests__/MentorshipService.test.ts
describe('MentorshipService', () => {
  describe('createMentorship', () => {
    test('creates mentorship relationship');
    test('validates mentor qualifications');
    test('prevents duplicate relationships');
    test('sends notification emails');
  });

  describe('getMentorshipSessions', () => {
    test('retrieves all sessions for mentorship');
    test('filters by date range');
    test('includes game details');
    test('handles pagination');
  });

  describe('recordFeedback', () => {
    test('saves feedback to database');
    test('validates feedback content');
    test('updates mentee progress');
    test('triggers notifications');
  });
});
```

### D. Route/Controller Tests

#### 1. Games Routes (`src/routes/games.ts`)
```typescript
// backend/src/routes/__tests__/games.test.ts
describe('Games Routes', () => {
  describe('GET /games', () => {
    test('returns all games for authenticated user');
    test('filters by date range');
    test('filters by status');
    test('handles pagination');
    test('requires authentication');
  });

  describe('POST /games', () => {
    test('creates new game');
    test('validates required fields');
    test('checks for conflicts');
    test('assigns default values');
    test('requires admin role');
  });

  describe('PUT /games/:id', () => {
    test('updates existing game');
    test('validates update data');
    test('prevents unauthorized updates');
    test('handles concurrent updates');
    test('logs audit trail');
  });

  describe('DELETE /games/:id', () => {
    test('soft deletes game');
    test('cascades to assignments');
    test('requires admin permission');
    test('prevents deletion of past games');
  });
});
```

#### 2. Calendar Routes (`src/routes/calendar.ts`)
```typescript
// backend/src/routes/__tests__/calendar.test.ts
describe('Calendar Routes', () => {
  describe('POST /calendar/upload', () => {
    test('accepts valid ICS file');
    test('parses calendar events');
    test('creates games from events');
    test('handles duplicate events');
    test('validates file format');
    test('returns import summary');
  });

  describe('GET /calendar/export', () => {
    test('exports games as ICS');
    test('filters by user permissions');
    test('includes all required fields');
    test('handles date ranges');
  });
});
```

### E. Utility Function Tests

#### 1. Query Builders (`src/utils/query-builders.ts`)
```typescript
// backend/src/utils/__tests__/query-builders.test.ts
describe('Query Builders', () => {
  describe('buildFilterQuery', () => {
    test('builds correct WHERE clauses');
    test('handles multiple filters');
    test('escapes special characters');
    test('handles null values');
  });

  describe('buildPaginationQuery', () => {
    test('adds correct LIMIT and OFFSET');
    test('validates page numbers');
    test('handles edge cases');
  });

  describe('buildSortQuery', () => {
    test('adds ORDER BY clause');
    test('handles multiple sort fields');
    test('validates sort directions');
  });
});
```

#### 2. ICS Parser (`src/utils/ics-parser.ts`)
```typescript
// backend/src/utils/__tests__/ics-parser.test.ts
describe('ICS Parser', () => {
  describe('parseICSFile', () => {
    test('parses valid ICS content');
    test('extracts event properties');
    test('handles recurring events');
    test('handles timezones correctly');
    test('validates required fields');
  });

  describe('generateICS', () => {
    test('creates valid ICS format');
    test('includes all event properties');
    test('handles special characters');
    test('sets correct headers');
  });
});
```

### F. Integration Tests

#### 1. Database Integration Tests
```typescript
// backend/src/__tests__/integration/database.test.ts
describe('Database Integration', () => {
  describe('Transaction Management', () => {
    test('commits successful transactions');
    test('rolls back failed transactions');
    test('handles nested transactions');
    test('manages connection pool');
  });

  describe('Query Performance', () => {
    test('uses indexes efficiently');
    test('handles large datasets');
    test('optimizes JOIN queries');
    test('manages connection timeouts');
  });

  describe('Data Integrity', () => {
    test('enforces foreign key constraints');
    test('maintains referential integrity');
    test('handles cascade operations');
    test('validates unique constraints');
  });
});
```

#### 2. API Integration Tests
```typescript
// backend/src/__tests__/integration/api.test.ts
describe('API Integration', () => {
  describe('Authentication Flow', () => {
    test('complete login flow');
    test('token refresh mechanism');
    test('logout and token invalidation');
    test('password reset flow');
  });

  describe('Authorization Flow', () => {
    test('role-based access control');
    test('permission-based access');
    test('resource-level permissions');
    test('admin override functionality');
  });

  describe('Data Flow', () => {
    test('create-read-update-delete cycle');
    test('data validation across layers');
    test('error propagation');
    test('response formatting');
  });
});
```

## Test Execution Strategy

### 1. Unit Test Execution
```bash
# Run all unit tests
npm test

# Run specific module tests
npm test -- --testPathPattern=middleware
npm test -- --testPathPattern=services
npm test -- --testPathPattern=routes

# Run with coverage
npm run test:coverage
```

### 2. Integration Test Execution
```bash
# Run integration tests
npm run test:integration

# Run database-specific tests
npm run test:database

# Run API integration tests
npm run test:api
```

### 3. Continuous Testing
```bash
# Watch mode for development
npm run test:watch

# Pre-commit hook
npm run test:staged

# CI/CD pipeline
npm run test:ci
```

## Coverage Requirements

### Minimum Coverage Targets
- **Overall**: 80%
- **Statements**: 85%
- **Branches**: 75%
- **Functions**: 85%
- **Lines**: 85%

### Critical Path Coverage
- **Authentication/Authorization**: 95%
- **Database Operations**: 90%
- **Payment Processing**: 95%
- **Data Validation**: 90%

## Mock Data and Fixtures

### 1. User Fixtures
```typescript
// backend/src/__tests__/fixtures/users.ts
export const mockAdmin = {
  id: 'admin-123',
  email: 'admin@test.com',
  roles: ['admin']
};

export const mockReferee = {
  id: 'referee-456',
  email: 'referee@test.com',
  roles: ['referee']
};
```

### 2. Database Fixtures
```typescript
// backend/src/__tests__/fixtures/database.ts
export const seedTestData = async (db) => {
  await db('users').insert(testUsers);
  await db('games').insert(testGames);
  await db('teams').insert(testTeams);
};
```

## Test Database Management

### 1. Setup Script
```typescript
// backend/scripts/setup-test-db.ts
import { db } from '../src/config/database';

export const setupTestDatabase = async () => {
  // Create test database
  await db.raw('CREATE DATABASE IF NOT EXISTS sports_manager_test');

  // Run migrations
  await db.migrate.latest();

  // Seed test data
  await db.seed.run();
};
```

### 2. Teardown Script
```typescript
// backend/scripts/teardown-test-db.ts
export const teardownTestDatabase = async () => {
  // Clean all tables
  await db.raw('TRUNCATE TABLE users, games, teams CASCADE');

  // Close connections
  await db.destroy();
};
```

## Performance Testing

### 1. Load Testing
```javascript
// backend/src/__tests__/performance/load.test.js
describe('Load Testing', () => {
  test('handles 100 concurrent requests');
  test('maintains response time under 200ms');
  test('manages database connections efficiently');
  test('handles rate limiting correctly');
});
```

### 2. Stress Testing
```javascript
// backend/src/__tests__/performance/stress.test.js
describe('Stress Testing', () => {
  test('recovers from database connection loss');
  test('handles memory leaks prevention');
  test('manages queue overflow');
  test('implements circuit breaker pattern');
});
```

## Implementation Priority

### Phase 1: Critical Path (Week 1)
1. Database configuration tests
2. Authentication middleware tests
3. Core service tests (User, Permission)
4. Main route tests (auth, games)

### Phase 2: Core Features (Week 2)
1. Additional middleware tests
2. Service layer completion
3. All route tests
4. Basic integration tests

### Phase 3: Comprehensive Coverage (Week 3)
1. Utility function tests
2. Edge case testing
3. Performance tests
4. Full integration test suite

### Phase 4: Optimization (Week 4)
1. Coverage gap analysis
2. Test optimization
3. CI/CD integration
4. Documentation updates

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: testpass
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

## Monitoring and Reporting

### 1. Test Reports
- Jest HTML Reporter for visual reports
- Coverage reports with Istanbul
- Performance metrics with Jest-benchmark

### 2. Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No security vulnerabilities
- Performance benchmarks satisfied

## Maintenance

### Regular Tasks
1. Update test fixtures monthly
2. Review and update mocks quarterly
3. Performance baseline updates
4. Coverage analysis and improvement

### Documentation
1. Test case documentation in code
2. Update this plan with new modules
3. Maintain test data catalog
4. Document known issues and workarounds