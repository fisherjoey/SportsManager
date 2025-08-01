# Shared Utilities Documentation

This directory contains shared utility files that provide standardized validation, query building, and response formatting across the Sports Management App backend.

## Files Overview

### 1. validation-schemas.js
Provides comprehensive Joi validation schemas for consistent input validation.

### 2. query-builders.js
Contains reusable query building utilities for Knex.js operations.

### 3. response-formatters.js
Offers standardized API response formatting methods.

## Usage Examples

### Validation Schemas

```javascript
const { UserSchemas, GameSchemas, PaginationSchema } = require('./utils/validation-schemas');

// Validate user creation data
const { error, value } = UserSchemas.create.validate(req.body);
if (error) {
  return res.status(422).json({ error: error.details });
}

// Validate pagination parameters
const { error: paginationError, value: pagination } = PaginationSchema.validate(req.query);
```

### Query Builders

```javascript
const { QueryBuilder, QueryHelpers } = require('./utils/query-builders');

// Apply pagination to a query
let query = db('games').select('*');
query = QueryBuilder.applyPagination(query, page, limit);

// Apply filters using filter map
const filterMap = QueryHelpers.getGameFilterMap();
query = QueryBuilder.applyCommonFilters(query, req.query, filterMap);

// Build paginated response with count
const result = await QueryBuilder.buildPaginatedResponse(
  db('games'),
  req.query,
  {
    page: req.query.page,
    limit: req.query.limit,
    allowedSortColumns: QueryHelpers.getGameSortColumns(),
    filterMap: QueryHelpers.getGameFilterMap()
  }
);
```

### Response Formatters

```javascript
const { ResponseFormatter } = require('./utils/response-formatters');

// Send success response
ResponseFormatter.sendSuccess(res, data, 'Operation successful');

// Send paginated response
ResponseFormatter.sendPaginated(res, data, pagination);

// Send validation error
ResponseFormatter.sendValidationError(res, joiError.details);

// Send not found error
ResponseFormatter.sendNotFound(res, 'Game', gameId);

// Use async handler wrapper
router.get('/games', ResponseFormatter.asyncHandler(async (req, res) => {
  const games = await db('games').select();
  return ResponseFormatter.sendSuccess(res, games);
}));
```

## Integration with Existing Routes

### Before (example from games.js)
```javascript
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    let query = db('games').select('*');
    
    if (req.query.status) {
      query = query.where('status', req.query.status);
    }
    
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    const games = await query;
    
    res.json({
      data: games,
      pagination: { page, limit }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});
```

### After (using utilities)
```javascript
const { QueryBuilder, QueryHelpers } = require('../utils/query-builders');
const { ResponseFormatter } = require('../utils/response-formatters');
const { FilterSchemas } = require('../utils/validation-schemas');

router.get('/', ResponseFormatter.asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = FilterSchemas.games.validate(req.query);
  if (error) {
    return ResponseFormatter.sendValidationError(res, error.details);
  }
  
  // Build paginated response
  const result = await QueryBuilder.buildPaginatedResponse(
    db('games'),
    value,
    {
      page: value.page,
      limit: value.limit,
      allowedSortColumns: QueryHelpers.getGameSortColumns(),
      filterMap: QueryHelpers.getGameFilterMap()
    }
  );
  
  return ResponseFormatter.sendPaginated(res, result.data, result.pagination);
}));
```

## Benefits

1. **Consistency**: All routes use the same validation rules and response formats
2. **Maintainability**: Changes to validation or response structure only need to be made in one place
3. **Reusability**: Common patterns are abstracted into reusable functions
4. **Type Safety**: Joi schemas provide runtime type checking
5. **Error Handling**: Standardized error responses across all endpoints
6. **Performance**: Query builders include optimizations like pagination limits
7. **Security**: Input validation prevents common vulnerabilities

## Testing

All utilities include comprehensive unit tests located in `/backend/tests/utils/`:

- `validation-schemas.test.js` - Tests for all validation schemas
- `query-builders.test.js` - Tests for query building utilities  
- `response-formatters.test.js` - Tests for response formatting

Run tests with:
```bash
npm test -- tests/utils/
```

## Filter Maps and Sort Columns

The `QueryHelpers` provides pre-configured filter maps and allowed sort columns for common entities:

- **Games**: `getGameFilterMap()`, `getGameSortColumns()`
- **Referees**: `getRefereeFilterMap()`, `getRefereeSortColumns()`
- **Assignments**: `getAssignmentFilterMap()`, `getAssignmentSortColumns()`

These ensure consistent column mapping and prevent SQL injection through column name validation.