# Invitations System Test Suite

Comprehensive unit, integration, and edge case tests for the invitations functionality.

## Test Structure

### 📧 Email Service Tests (`services/emailService.test.js`)
- **Configuration**: Tests initialization with/without API keys
- **Invitation Emails**: Tests email content, formatting, and delivery
- **Password Reset Emails**: Tests reset email functionality
- **Error Handling**: Tests graceful degradation when email service fails

### 🚪 API Route Tests (`routes/invitations.test.js`)
- **Authentication**: Tests admin-only access controls
- **Validation**: Tests input validation and sanitization
- **Business Logic**: Tests invitation creation, completion, and cancellation
- **Error Scenarios**: Tests database errors and edge cases

### 🔄 Integration Tests (`integration/invitations-integration.test.js`)
- **Complete Flow**: Tests full invitation lifecycle from creation to completion
- **Database Operations**: Tests real database interactions
- **User Creation**: Tests user and referee record creation
- **Transaction Handling**: Tests rollback scenarios

### ⚠️ Edge Cases (`edge-cases/invitations-edge-cases.test.js`)
- **Input Boundaries**: Tests maximum lengths, special characters, Unicode
- **Security**: Tests token security, SQL injection attempts
- **Concurrency**: Tests simultaneous requests and race conditions
- **Performance**: Tests large payloads and rapid requests

## Running Tests

### Run All Invitation Tests
```bash
npm run test:invitations
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:invitations:unit

# Integration tests only
npm run test:invitations:integration

# Edge cases only
npm run test:invitations:edge-cases
```

### Run Individual Test Files
```bash
# Email service tests
npx jest tests/services/emailService.test.js

# API route tests
npx jest tests/routes/invitations.test.js

# Integration tests
npx jest tests/integration/invitations-integration.test.js

# Edge cases
npx jest tests/edge-cases/invitations-edge-cases.test.js
```

## Test Coverage

The test suite covers:

### ✅ Functional Testing
- ✅ Invitation creation with validation
- ✅ Email service integration
- ✅ Token generation and validation
- ✅ User account creation
- ✅ Referee profile creation
- ✅ Invitation expiration handling
- ✅ Duplicate prevention
- ✅ Role-based access control

### ✅ Error Handling
- ✅ Database connection failures
- ✅ Email service failures
- ✅ Invalid input validation
- ✅ Expired token handling
- ✅ Transaction rollbacks
- ✅ Concurrent request handling

### ✅ Security Testing
- ✅ Token security validation
- ✅ SQL injection prevention
- ✅ XSS prevention in email content
- ✅ Admin-only endpoint protection
- ✅ Input sanitization

### ✅ Edge Cases
- ✅ Maximum input lengths
- ✅ Special characters and Unicode
- ✅ Malformed tokens
- ✅ Race conditions
- ✅ Network timeouts
- ✅ Memory constraints

## Test Data

### Mock Users
- **Admin User**: `testadmin@test.com` (for integration tests)
- **Referee User**: `referee@test.com` (for permission tests)

### Mock Invitations
- **Valid Token**: `valid-token-123`
- **Expired Token**: `expired-token-456`
- **Used Token**: `used-token-789`

### Mock Emails
- **Pending**: `pending@test.com`
- **Duplicate**: `duplicate@test.com`
- **Unicode**: `unicode@test.com`

## Environment Setup

Tests use mocked dependencies by default:
- **Database**: Mocked with Jest
- **Email Service**: Mocked to prevent actual emails
- **JWT**: Uses test secret key
- **Crypto**: Mocked for predictable tokens

For integration tests, set up test database:
```bash
NODE_ENV=test npm run migrate
NODE_ENV=test npm run seed
```

## Expected Test Results

- **Total Test Files**: 4
- **Estimated Tests**: ~80+ individual test cases
- **Coverage Target**: >95% code coverage
- **Performance**: All tests complete in <30 seconds

## Common Issues and Solutions

### Database Connection Errors
```bash
# Ensure test database is running
npm run migrate:test
npm run seed:test
```

### Email Service Tests Failing
```bash
# Check if Resend mock is properly configured
# Verify environment variables in test setup
```

### JWT Token Issues
```bash
# Ensure JWT_SECRET is set in test environment
export JWT_SECRET=test-secret-key
```

### Integration Test Failures
```bash
# Clear test database and re-seed
npm run test:db:reset
```

## Contributing

When adding new invitation functionality:

1. **Add Unit Tests**: Test individual functions in isolation
2. **Add Integration Tests**: Test complete workflows
3. **Add Edge Cases**: Test boundary conditions and error scenarios
4. **Update Documentation**: Update this README with new test cases

### Test Naming Convention
- **Unit Tests**: `describe('FunctionName', () => { ... })`
- **Integration Tests**: `describe('Complete Flow', () => { ... })`
- **Edge Cases**: `describe('Edge Case Description', () => { ... })`

### Assertions
- Use specific assertions: `expect(result.email).toBe('test@example.com')`
- Test error messages: `expect(response.body.error).toContain('required')`
- Verify side effects: `expect(emailService.send).toHaveBeenCalled()`

## Test Maintenance

- **Weekly**: Run full test suite
- **Before Deployment**: Run integration tests
- **After Changes**: Run affected test categories
- **Monthly**: Review and update edge cases