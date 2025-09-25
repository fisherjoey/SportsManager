# Service Layer Architecture

This document explains the foundational service layer architecture for the Sports Management App backend. The service layer centralizes business logic and database operations, following established design patterns for maintainability and scalability.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Pattern](#architecture-pattern)
3. [Service Classes](#service-classes)
4. [Service Factory](#service-factory)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Best Practices](#best-practices)
8. [Integration Guide](#integration-guide)

## Overview

The service layer provides:

- **Centralized Business Logic**: All business rules and operations are encapsulated in service classes
- **Database Abstraction**: Services provide a clean interface to database operations
- **Transaction Support**: Built-in transaction management for complex operations
- **Error Handling**: Consistent error handling patterns across all services
- **Dependency Injection**: Factory pattern for easy service management and testing
- **Extensibility**: Base classes that can be easily extended for specific use cases

## Architecture Pattern

The service layer follows these design patterns:

### Repository Pattern
Each service acts as a repository for its domain entity, providing CRUD operations and business-specific methods.

### Factory Pattern
The `ServiceFactory` class manages service instantiation and provides dependency injection.

### Template Method Pattern
`BaseService` provides a template for common operations that can be customized in derived classes.

### Singleton Pattern
Services are created as singletons through the factory to ensure consistent state.

## Service Classes

### BaseService

The foundational service class providing common CRUD operations.

**Features:**
- Generic CRUD operations (Create, Read, Update, Delete)
- Pagination support with filtering and sorting
- Transaction management
- Hook methods for customization
- Query builder abstraction
- Error handling with meaningful messages

**Key Methods:**
```javascript
// Basic CRUD
findById(id, options)
create(data, options)
update(id, data, options)
delete(id, options)

// Advanced queries
findWithPagination(filters, page, limit, options)
findWhere(conditions, options)
bulkCreate(records, options)

// Transaction support
withTransaction(callback)
```

**Example:**
```javascript
const gameService = new BaseService('games', db, {
  defaultOrderBy: 'game_date',
  defaultOrderDirection: 'asc'
});

const game = await gameService.findById('game123');
const games = await gameService.findWithPagination(
  { status: 'active' }, 
  1, 
  20
);
```

### UserService

Specialized service for user and referee management operations.

**Features:**
- Role-based user queries
- Referee-specific operations
- Availability management
- Bulk user operations
- Integration with referee levels and assignments

**Key Methods:**
```javascript
// Role-based queries
findByRole(role, filters, options)
findAvailableReferees(gameDate, gameTime, options)

// Referee management
createReferee(refereeData, options)
updateAvailability(userId, isAvailable, options)
getUserWithRefereeDetails(userId, options)

// Bulk operations
bulkUpdateUsers(updates, options)
```

**Example:**
```javascript
const userService = new UserService(db);

// Find all available referees for a specific date/time
const availableRefs = await userService.findAvailableReferees(
  '2024-01-15', 
  '19:00',
  { level: 'Elite', maxDistance: 25 }
);

// Update referee availability
await userService.updateAvailability('user123', false);

// Get complete referee profile with stats
const referee = await userService.getUserWithRefereeDetails('user123');
```

### AssignmentService

Specialized service for assignment operations with conflict checking and game status management.

**Features:**
- Assignment creation with conflict detection
- Bulk assignment operations
- Game status updates
- Wage calculations
- Available referee analysis

**Key Methods:**
```javascript
// Assignment operations
createAssignment(assignmentData, options)
bulkUpdateAssignments(updates, options)
bulkRemoveAssignments(assignmentIds, options)

// Status management
updateGameStatus(gameId, options)

// Analysis
getAssignmentsWithDetails(filters, page, limit, options)
getAvailableRefereesForGame(gameId, options)
```

**Example:**
```javascript
const assignmentService = new AssignmentService(db);

// Create assignment with conflict checking
const result = await assignmentService.createAssignment({
  game_id: 'game123',
  user_id: 'user456',
  position_id: 'pos789',
  assigned_by: 'admin123'
});

// Bulk update assignment statuses
const updates = [
  { assignment_id: 'assign1', status: 'accepted' },
  { assignment_id: 'assign2', status: 'declined' }
];
const bulkResult = await assignmentService.bulkUpdateAssignments(updates);

// Get available referees for a game
const available = await assignmentService.getAvailableRefereesForGame('game123');
```

### GameStateService

Service for game status calculation, assignment validation, and conflict analysis.

**Features:**
- Game status calculation with health scoring
- Assignment validation
- Bulk assignment validation
- Referee conflict analysis
- Game scheduling conflict detection

**Key Methods:**
```javascript
// Status calculation
calculateGameStatus(gameId, options)

// Validation
validateAssignment(assignmentData)
validateBulkAssignments(assignments)

// Conflict analysis
getRefereeConflicts(refereeId, dateFrom, dateTo)
```

**Example:**
```javascript
const gameStateService = new GameStateService(db);

// Calculate comprehensive game status
const gameStatus = await gameStateService.calculateGameStatus('game123');
console.log(`Game status: ${gameStatus.status}`);
console.log(`Health score: ${gameStatus.healthScore}/100`);

// Validate an assignment before creation
const validation = await gameStateService.validateAssignment({
  game_id: 'game123',
  user_id: 'user456',
  position_id: 'pos789'
});

if (validation.canAssign) {
  // Proceed with assignment
} else {
  console.log('Assignment conflicts:', validation.errors);
}

// Check referee conflicts across date range
const conflicts = await gameStateService.getRefereeConflicts(
  'user456', 
  '2024-01-01', 
  '2024-01-31'
);
```

## Service Factory

The `ServiceFactory` provides centralized service management with dependency injection.

### Features
- Singleton service instances
- Service registration and discovery
- Multiple service creation
- Health checking
- Transaction-aware service creation

### Usage

```javascript
const { 
  serviceFactory, 
  getServices, 
  getService,
  initializeServices,
  withServiceTransaction 
} = require('./services');

// Get individual service
const userService = serviceFactory.getService('user');
const assignmentService = getService('assignment');

// Get all core services
const services = getServices();
// Returns: { user, assignment, gameState, games, teams, leagues, positions, refereeLevels }

// Initialize services with configuration
const services = initializeServices({
  includeTableServices: true,
  customServices: {
    customService: CustomServiceClass
  }
});

// Use services within a transaction
const result = await withServiceTransaction(async (services, trx) => {
  const user = await services.user.create(userData, { transaction: trx });
  const assignment = await services.assignment.create(assignmentData, { transaction: trx });
  return { user, assignment };
});

// Check service health
const health = await checkServiceHealth();
console.log('System health:', health.overall);
```

### Custom Service Registration

```javascript
class CustomService extends BaseService {
  constructor(db) {
    super('custom_table', db);
  }
  
  async customMethod() {
    // Custom business logic
  }
}

// Register custom service
serviceFactory.registerService('custom', new CustomService(db));

// Use custom service
const customService = serviceFactory.getService('custom');
await customService.customMethod();
```

## Usage Examples

### Basic CRUD Operations

```javascript
const { getService } = require('./services');

const gameService = getService('games');

// Create a game
const game = await gameService.create({
  home_team_id: 'team1',
  away_team_id: 'team2',
  game_date: '2024-01-15',
  game_time: '19:00',
  location: 'Downtown Arena'
});

// Find games with pagination
const result = await gameService.findWithPagination(
  { status: 'assigned' },  // filters
  1,                       // page
  20,                      // limit
  { 
    orderBy: 'game_date',
    orderDirection: 'asc',
    include: ['home_team', 'away_team']
  }
);

// Update a game
const updatedGame = await gameService.update('game123', {
  status: 'completed'
});
```

### Complex Assignment Operations

```javascript
const { getServices } = require('./services');

const { assignment, gameState, user } = getServices();

// Validate assignment before creation
const validation = await gameState.validateAssignment({
  game_id: 'game123',
  user_id: 'user456',
  position_id: 'pos789'
});

if (validation.canAssign) {
  // Create assignment with conflict checking
  const result = await assignment.createAssignment({
    game_id: 'game123',
    user_id: 'user456',
    position_id: 'pos789',
    assigned_by: 'admin123'
  });
  
  console.log('Assignment created:', result.assignment.id);
  console.log('Wage breakdown:', result.wageBreakdown);
  
  if (result.warnings.length > 0) {
    console.log('Warnings:', result.warnings);
  }
} else {
  console.log('Cannot assign:', validation.errors);
}
```

### Transaction Example

```javascript
const { withServiceTransaction } = require('./services');

// Complex operation requiring multiple services
const result = await withServiceTransaction(async (services, trx) => {
  // Create referee
  const referee = await services.user.createReferee({
    name: 'New Referee',
    email: 'new@example.com',
    postal_code: 'M5V 1A1'
  }, { transaction: trx });
  
  // Assign to games
  const assignments = [];
  for (const gameId of gameIds) {
    const assignment = await services.assignment.createAssignment({
      game_id: gameId,
      user_id: referee.id,
      position_id: 'referee_position',
      assigned_by: 'admin123'
    }, { transaction: trx });
    
    assignments.push(assignment);
  }
  
  return { referee, assignments };
});

console.log('Created referee and assignments:', result);
```

## Testing

### Unit Testing Services

Services are designed to be easily testable with mocked database connections:

```javascript
const UserService = require('./UserService');

describe('UserService', () => {
  let userService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      // Mock database methods
      transaction: jest.fn(),
      // Mock query builder
      mockReturnValue: jest.fn(() => mockQueryBuilder)
    };
    
    userService = new UserService(mockDb);
  });

  it('should create referee with proper defaults', async () => {
    // Test implementation
  });
});
```

### Integration Testing

Test services with real database connections:

```javascript
const { initializeServices } = require('./services');
const db = require('../config/database');

describe('Service Integration', () => {
  let services;

  beforeAll(async () => {
    services = initializeServices();
  });

  it('should create and assign referee to game', async () => {
    const referee = await services.user.createReferee({
      name: 'Test Referee',
      email: 'test@example.com',
      postal_code: 'M5V 1A1'
    });

    const assignment = await services.assignment.createAssignment({
      game_id: 'test_game',
      user_id: referee.id,
      position_id: 'test_position'
    });

    expect(assignment.user_id).toBe(referee.id);
  });
});
```

## Best Practices

### Service Design

1. **Single Responsibility**: Each service should handle one domain entity
2. **Consistent Interface**: Use consistent method naming and return patterns
3. **Error Handling**: Always provide meaningful error messages
4. **Transaction Support**: Use transactions for multi-step operations
5. **Validation**: Validate inputs before database operations

### Performance

1. **Query Optimization**: Use efficient queries with proper joins
2. **Pagination**: Always implement pagination for list operations
3. **Bulk Operations**: Provide bulk methods for multiple record operations
4. **Caching**: Consider caching for frequently accessed data
5. **Connection Pooling**: Use database connection pooling

### Error Handling

```javascript
// Good: Specific error messages
try {
  const user = await userService.findById(userId);
} catch (error) {
  if (error.message.includes('not found')) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.status(500).json({ error: 'Internal server error' });
}

// Better: Use specific error types
class UserNotFoundError extends Error {
  constructor(userId) {
    super(`User not found: ${userId}`);
    this.name = 'UserNotFoundError';
    this.statusCode = 404;
  }
}
```

### Configuration

```javascript
// Configure services with options
const userService = new UserService(db, {
  defaultLimit: 25,
  maxLimit: 100,
  enableAuditTrail: true,
  throwOnNotFound: true
});
```

## Integration Guide

### Integrating with Routes

Replace direct database calls in routes with service calls:

```javascript
// Before: Direct database access
router.get('/users/:id', async (req, res) => {
  try {
    const user = await db('users').where('id', req.params.id).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// After: Using service layer
const { getService } = require('../services');

router.get('/users/:id', async (req, res) => {
  try {
    const userService = getService('user');
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
```

### Middleware Integration

```javascript
// Service injection middleware
const { getServices } = require('../services');

const injectServices = (req, res, next) => {
  req.services = getServices();
  next();
};

// Use in routes
router.use(injectServices);

router.post('/assignments', async (req, res) => {
  try {
    const result = await req.services.assignment.createAssignment(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Health Check Integration

```javascript
const { checkServiceHealth } = require('../services');

router.get('/health', async (req, res) => {
  try {
    const health = await checkServiceHealth();
    const statusCode = health.overall === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      overall: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});
```

### Migration Strategy

1. **Phase 1**: Create services alongside existing code
2. **Phase 2**: Update routes to use services while keeping old code
3. **Phase 3**: Remove old database access code
4. **Phase 4**: Add advanced service features (caching, analytics, etc.)

```javascript
// Migration helper
const migrationMode = process.env.USE_SERVICES === 'true';

if (migrationMode) {
  // Use new service layer
  const result = await userService.findById(userId);
} else {
  // Use old direct database access
  const result = await db('users').where('id', userId).first();
}
```

This service layer architecture provides a solid foundation for scalable, maintainable backend development while ensuring consistency across the Sports Management App.