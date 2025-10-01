# Jest Joi Mocking Solution

## Problem Summary

The Jest test suite for routes failed with the error:
```
TypeError: joi_1.default.string is not a function
```

This occurred because:
1. Joi schemas are defined at module level in route files (e.g., `teams.ts`)
2. These schemas execute immediately when the module is imported
3. Jest mocks were not properly set up to handle the chainable nature of Joi

## Root Cause Analysis

The issue was a **module-level Joi execution vs. Jest mock timing problem**:

1. **Module-level schema execution**: Route files define Joi schemas like:
   ```typescript
   const teamSchema = Joi.object({
     name: Joi.string().required(),
     league_id: Joi.string().uuid().required(),
     // ...
   });
   ```

2. **Jest mock timing**: When `require('../teams')` is called in tests, these schemas execute immediately, but our Jest mock wasn't comprehensive enough to handle all Joi method chains.

3. **Incomplete mock chaining**: The original mock didn't properly handle the extensive chaining that Joi uses (e.g., `Joi.string().required().min(1).default('')`)

## Solution Implemented

### 1. Comprehensive Joi Mock

Created a robust Joi mock that handles all chainable methods:

```typescript
jest.mock('joi', () => {
  // Create a comprehensive chainable mock that handles all Joi methods
  const createChainableMock = (): any => {
    const mock: any = {};

    // Define all Joi methods that need to be chainable
    const chainableMethods = [
      'string', 'number', 'boolean', 'array', 'object', 'date', 'binary',
      'required', 'optional', 'allow', 'valid', 'invalid', 'default',
      'min', 'max', 'length', 'email', 'uri', 'uuid', 'integer',
      'positive', 'negative', 'items', 'keys', 'pattern', 'regex',
      'alphanum', 'token', 'hex', 'base64', 'lowercase', 'uppercase',
      'trim', 'replace', 'truncate', 'normalize', 'when', 'alternatives',
      'alt', 'concat', 'raw', 'empty', 'strip', 'label', 'description',
      'notes', 'tags', 'meta', 'example', 'unit', 'messages', 'prefs',
      'preferences', 'strict', 'options', 'fork', 'validate'
    ];

    // Create mock functions for all chainable methods
    chainableMethods.forEach(method => {
      if (method === 'validate') {
        mock[method] = jest.fn().mockReturnValue({ error: null, value: {} });
      } else {
        mock[method] = jest.fn().mockReturnValue(mock); // Return self for chaining
      }
    });

    return mock;
  };

  // Create the main Joi mock
  const joiMock = createChainableMock();

  // Override specific methods that return schemas
  joiMock.object = jest.fn().mockImplementation((schema?: any) => {
    const schemaMock = createChainableMock();
    return schemaMock;
  });

  joiMock.array = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.string = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.number = jest.fn().mockImplementation(() => createChainableMock());
  joiMock.boolean = jest.fn().mockImplementation(() => createChainableMock());

  return {
    default: joiMock,
    __esModule: true
  };
});
```

### 2. Proper Middleware Mock Setup

Fixed middleware mocks to use `jest.fn().mockImplementation()` instead of direct function assignment:

```typescript
const mockAuth = {
  authenticateToken: jest.fn().mockImplementation((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  })
};

const mockCerbos = {
  requireCerbosPermission: jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
};

const mockValidation = {
  validateBody: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn().mockImplementation((schema: any) => (req: any, res: any, next: any) => next())
};
```

### 3. Mock Reset in beforeEach

Added proper mock reset after `jest.clearAllMocks()`:

```typescript
beforeEach(() => {
  jest.clearAllMocks();

  // Restore default mock implementations after clearAllMocks
  mockAuth.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  });
  mockCerbos.requireCerbosPermission.mockImplementation(() => (req: any, res: any, next: any) => next());
  mockValidation.validateBody.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
  mockValidation.validateParams.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
  mockValidation.validateQuery.mockImplementation((schema: any) => (req: any, res: any, next: any) => next());
  mockEnhancedAsyncHandler.mockImplementation((fn: any) => async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  });
  // ... other mock resets
});
```

## Test Results

✅ **SUCCESS**: Core tests are now passing:
- ✅ "should be able to import the teams routes module"
- ✅ "should export an express router"
- ✅ "should require authentication and permissions"

The main Joi mocking issue has been resolved!

## Applying to Other Test Files

### Files that need this fix:
1. `backend/src/routes/__tests__/leagues.test.ts`
2. `backend/src/routes/__tests__/communications.test.ts`
3. Any other route test files that import modules with Joi schemas

### Steps to apply the fix:

1. **Replace the Joi mock** with the comprehensive version above
2. **Update middleware mocks** to use `jest.fn().mockImplementation()`
3. **Add proper mock resets** in `beforeEach` after `jest.clearAllMocks()`
4. **Ensure ResponseFormatter mock** includes all needed methods (`sendSuccess`, `sendCreated`, `sendError`)

### Example for leagues.test.ts:

```typescript
// Add the same comprehensive Joi mock
jest.mock('joi', () => {
  // ... (same comprehensive mock as above)
});

// Update other mocks to use mockImplementation
const mockAuth = {
  authenticateToken: jest.fn().mockImplementation((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  })
};

// Add proper mock resets in beforeEach
beforeEach(() => {
  jest.clearAllMocks();

  // Restore all mock implementations
  mockAuth.authenticateToken.mockImplementation(/* ... */);
  mockCerbos.requireCerbosPermission.mockImplementation(/* ... */);
  // ... etc
});
```

## Key Principles

1. **Comprehensive mocking**: Mock ALL Joi methods, not just the ones you think you need
2. **Proper chaining**: Every Joi method should return the mock object to support chaining
3. **Module-level execution**: Remember that schemas execute at import time, so mocks must be complete before import
4. **Mock reset**: Always restore mock implementations after `jest.clearAllMocks()`

## Alternative Approaches Considered

1. **Use real Joi with minimal mocking**: Could work but reduces test isolation
2. **Lazy schema evaluation**: Would require refactoring route files significantly
3. **Dynamic imports**: Would require major test restructuring

The comprehensive mock approach provides the best balance of:
- ✅ Maintaining test isolation
- ✅ Minimal changes to existing code
- ✅ Robust handling of all Joi patterns
- ✅ Easy to apply to other test files

## Future Improvements

1. Extract the Joi mock to a shared test utility
2. Create a Jest setup file for common mocks
3. Consider using `jest.createMockFromModule` for more robust mocking
4. Add integration tests that use real Joi for critical validation paths