# Backend Refactoring Implementation Plan
## Multi-Agent Parallel Development Strategy

This plan divides the backend refactoring into independent work packages that can be executed by different agents simultaneously without conflicts.

---

## Phase 1: Foundation & Preparation (Week 1)
*Safe for parallel execution - no file conflicts*

### Package 1A: Database Optimization (Agent 1)
**Files to Modify**: Database migration files only
**Dependencies**: None
**Estimated Time**: 2-3 hours

#### Tasks:
1. **Create Performance Indexes Migration**
   ```sql
   -- File: backend/migrations/060_performance_indexes.js
   CREATE INDEX idx_games_date_location ON games(game_date, location);
   CREATE INDEX idx_games_status_date ON games(status, game_date);
   CREATE INDEX idx_assignments_status_date ON game_assignments(status, created_at);
   CREATE INDEX idx_assignments_user_game ON game_assignments(user_id, game_id);
   CREATE INDEX idx_users_role_available ON users(role, is_available);
   CREATE INDEX idx_users_email_role ON users(email, role);
   CREATE INDEX idx_teams_league_rank ON teams(league_id, rank);
   CREATE INDEX idx_budgets_org_period ON budgets(organization_id, budget_period_id);
   CREATE INDEX idx_expenses_status_date ON expense_data(status, transaction_date);
   ```

2. **Create Query Performance Migration**
   ```sql
   -- File: backend/migrations/061_query_optimization.js
   -- Add composite indexes for common WHERE clauses
   CREATE INDEX idx_game_assignments_compound ON game_assignments(game_id, user_id, status);
   CREATE INDEX idx_games_compound ON games(location, game_date, status);
   CREATE INDEX idx_users_compound ON users(role, is_available, organization_id);
   ```

3. **Database Constraint Optimization**
   ```sql
   -- File: backend/migrations/062_constraint_optimization.js
   -- Add foreign key constraints where missing
   -- Add check constraints for data integrity
   ```

#### Deliverables:
- [ ] 3 migration files created
- [ ] Migration test script
- [ ] Performance impact documentation

---

### Package 1B: Shared Utilities Creation (Agent 2)
**Files to Create**: New utility files only
**Dependencies**: None  
**Estimated Time**: 3-4 hours

#### Tasks:
1. **Create Shared Validation Schemas**
   ```typescript
   // File: backend/src/utils/validation-schemas.js
   const userBaseSchema = Joi.object({
     name: Joi.string().required(),
     email: Joi.string().email().required(),
     // ... shared user fields
   });

   const paginationSchema = Joi.object({
     page: Joi.number().integer().min(1).default(1),
     limit: Joi.number().integer().min(1).max(100).default(20)
   });

   module.exports = {
     userBaseSchema,
     refereeSchema: userBaseSchema.keys({
       postal_code: Joi.string().required(),
       max_distance: Joi.number().integer().min(1).max(200).default(25)
     }),
     paginationSchema,
     // ... other shared schemas
   };
   ```

2. **Create Query Builder Utilities**
   ```javascript
   // File: backend/src/utils/query-builders.js
   class QueryBuilder {
     static applyPagination(query, page = 1, limit = 20) {
       const offset = (page - 1) * limit;
       return query.limit(limit).offset(offset);
     }

     static applyCommonFilters(query, filters) {
       // Standard filtering patterns
     }

     static buildCountQuery(baseQuery) {
       // Extract count from complex queries
     }
   }
   ```

3. **Create Response Formatters**
   ```javascript
   // File: backend/src/utils/response-formatters.js
   class ResponseFormatter {
     static success(data, pagination = null) {
       return { success: true, data, pagination };
     }

     static error(message, details = null) {
       return { success: false, error: message, details };
     }

     static paginated(data, pagination) {
       return { success: true, data, pagination };
     }
   }
   ```

#### Deliverables:
- [ ] validation-schemas.js created
- [ ] query-builders.js created  
- [ ] response-formatters.js created
- [ ] Unit tests for utilities
- [ ] Documentation for shared utilities

---

### Package 1C: Service Layer Foundation (Agent 3)
**Files to Create**: New service files only
**Dependencies**: None
**Estimated Time**: 4-5 hours

#### Tasks:
1. **Create Base Service Class**
   ```javascript
   // File: backend/src/services/BaseService.js
   class BaseService {
     constructor(tableName, db) {
       this.tableName = tableName;
       this.db = db;
     }

     async findById(id) {
       return this.db(this.tableName).where('id', id).first();
     }

     async create(data) {
       const [created] = await this.db(this.tableName).insert(data).returning('*');
       return created;
     }

     async update(id, data) {
       const [updated] = await this.db(this.tableName)
         .where('id', id)
         .update({ ...data, updated_at: new Date() })
         .returning('*');
       return updated;
     }

     async delete(id) {
       return this.db(this.tableName).where('id', id).del();
     }

     async findWithPagination(filters = {}, page = 1, limit = 20) {
       // Implementation with query builders
     }
   }
   ```

2. **Create User Service Interface**
   ```javascript
   // File: backend/src/services/UserService.js
   const BaseService = require('./BaseService');

   class UserService extends BaseService {
     constructor(db) {
       super('users', db);
     }

     async findByRole(role, filters = {}) {
       // Unified user/referee querying
     }

     async updateAvailability(userId, isAvailable) {
       // Centralized availability management
     }

     async getUserWithRefereeDetails(userId) {
       // Join with referee-specific data
     }

     async bulkUpdateUsers(updates) {
       // Efficient bulk operations
     }
   }
   ```

3. **Create Assignment Service Interface**
   ```javascript
   // File: backend/src/services/AssignmentService.js
   class AssignmentService extends BaseService {
     constructor(db) {
       super('game_assignments', db);
     }

     async createAssignment(assignmentData) {
       // Centralized assignment logic with conflict checking
     }

     async bulkUpdateAssignments(updates) {
       // Single implementation for bulk updates
     }

     async updateGameStatus(gameId) {
       // Centralized game status management
     }
   }
   ```

#### Deliverables:
- [ ] BaseService.js created
- [ ] UserService.js interface created
- [ ] AssignmentService.js interface created
- [ ] GameStateService.js interface created
- [ ] Service factory pattern implemented

---

## Phase 2: Core Refactoring (Week 2)
*Coordinated execution - some dependencies between packages*

### Package 2A: Remove Duplicate Code (Agent 1)
**Files to Modify**: assignments.js only
**Dependencies**: Service layer foundation (Package 1C)
**Estimated Time**: 2-3 hours

#### Tasks:
1. **Remove Duplicate Bulk Update Methods**
   ```javascript
   // File: backend/src/routes/assignments.js
   // REMOVE: Lines 959-1115 (duplicate bulk-update endpoint)
   // REMOVE: Lines 1118-1240 (duplicate bulk-remove endpoint)
   // KEEP: Lines 352-507 (original bulk-update)
   // KEEP: Lines 510-632 (original bulk-remove)
   ```

2. **Consolidate Assignment Status Logic**
   ```javascript
   // Replace scattered status update logic with service calls
   // OLD: Multiple implementations
   // NEW: Single service method call
   const assignment = await AssignmentService.updateStatus(id, status);
   ```

3. **Update Tests**
   ```javascript
   // Update test files to remove duplicate test cases
   // Ensure remaining functionality is properly tested
   ```

#### Deliverables:
- [ ] 450+ lines of duplicate code removed
- [ ] All functionality preserved through service layer
- [ ] Tests updated and passing
- [ ] No breaking changes to API endpoints

---

### Package 2B: Implement User Service (Agent 2)
**Files to Modify**: users.js, referees.js
**Dependencies**: Package 1B (Shared Utilities), Package 1C (Service Foundation)
**Estimated Time**: 4-5 hours

#### Tasks:
1. **Implement UserService Methods**
   ```javascript
   // File: backend/src/services/UserService.js
   async findByRole(role, filters = {}) {
     let query = this.db('users')
       .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
       .select('users.*', 'referee_levels.name as level_name')
       .where('users.role', role);

     return QueryBuilder.applyCommonFilters(query, filters);
   }

   async getUserWithRefereeDetails(userId) {
     return this.db('users')
       .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
       .select('users.*', 'referee_levels.name as level_name')
       .where('users.id', userId)
       .first();
   }
   ```

2. **Refactor users.js Routes**
   ```javascript
   // File: backend/src/routes/users.js
   // BEFORE: Direct database queries
   const users = await db('users').select('id', 'email', 'role');

   // AFTER: Service layer calls
   const users = await UserService.findByRole('all', { includeBasicInfo: true });
   ```

3. **Refactor referees.js Routes**
   ```javascript
   // File: backend/src/routes/referees.js
   // BEFORE: Complex joins and filters
   // AFTER: Service method calls
   const referees = await UserService.findByRole('referee', req.query);
   ```

#### Deliverables:
- [ ] UserService fully implemented
- [ ] users.js refactored to use service
- [ ] referees.js refactored to use service
- [ ] All existing functionality preserved
- [ ] Tests updated for service layer

---

### Package 2C: Implement Assignment Service (Agent 3)
**Files to Modify**: assignments.js
**Dependencies**: Package 1C (Service Foundation), Package 2A (Duplicate Removal)
**Estimated Time**: 5-6 hours

#### Tasks:
1. **Implement AssignmentService Core Methods**
   ```javascript
   // File: backend/src/services/AssignmentService.js
   async createAssignment(assignmentData) {
     return await this.db.transaction(async (trx) => {
       // Conflict detection
       const conflicts = await ConflictDetectionService.checkAssignmentConflicts(assignmentData);
       if (conflicts.hasConflicts) {
         throw new Error('Assignment conflicts detected');
       }

       // Create assignment
       const [assignment] = await trx('game_assignments').insert(assignmentData).returning('*');

       // Update game status
       await this.updateGameStatus(assignmentData.game_id, trx);

       return assignment;
     });
   }

   async bulkUpdateAssignments(updates) {
     // Single implementation for all bulk updates
     return await this.db.transaction(async (trx) => {
       const results = [];
       for (const update of updates) {
         const result = await this.updateAssignmentStatus(update, trx);
         results.push(result);
       }
       return results;
     });
   }

   async updateGameStatus(gameId, trx = this.db) {
     // Centralized game status management
     const activeAssignments = await trx('game_assignments')
       .where('game_id', gameId)
       .whereIn('status', ['pending', 'accepted'])
       .count('* as count')
       .first();

     const game = await trx('games').where('id', gameId).first();
     
     let gameStatus = 'unassigned';
     if (parseInt(activeAssignments.count) >= game.refs_needed) {
       gameStatus = 'assigned';
     } else if (parseInt(activeAssignments.count) > 0) {
       gameStatus = 'assigned'; // Partially assigned
     }

     await trx('games').where('id', gameId).update({ status: gameStatus });
   }
   ```

2. **Refactor assignments.js Routes**
   ```javascript
   // File: backend/src/routes/assignments.js
   // BEFORE: Complex inline logic
   // AFTER: Service method calls
   router.post('/', async (req, res) => {
     try {
       const assignment = await AssignmentService.createAssignment(req.body);
       res.status(201).json(ResponseFormatter.success(assignment));
     } catch (error) {
       res.status(500).json(ResponseFormatter.error(error.message));
     }
   });
   ```

#### Deliverables:
- [ ] AssignmentService fully implemented
- [ ] All assignment routes refactored
- [ ] Game status management centralized
- [ ] Bulk operations consolidated
- [ ] Tests updated and passing

---

### Package 2D: Database Query Optimization (Agent 4)
**Files to Modify**: games.js, teams.js, leagues.js
**Dependencies**: Package 1A (Database Indexes), Package 1B (Query Builders)
**Estimated Time**: 3-4 hours

#### Tasks:
1. **Optimize Games Endpoint Queries**
   ```javascript
   // File: backend/src/routes/games.js
   // Use new indexes and query builders
   let query = db('games')
     .select(/* optimized select list */)
     .leftJoin('teams as home_teams', 'games.home_team_id', 'home_teams.id')
     .leftJoin('teams as away_teams', 'games.away_team_id', 'away_teams.id')
     .leftJoin('leagues', 'games.league_id', 'leagues.id');

   query = QueryBuilder.applyCommonFilters(query, req.query);
   const games = await QueryBuilder.applyPagination(query, page, limit);
   ```

2. **Optimize Teams Aggregation Queries**
   ```javascript
   // File: backend/src/routes/teams.js  
   // Replace expensive COUNT queries with optimized versions
   const teams = await db('teams')
     .select('teams.*', 
       db.raw('COALESCE(game_counts.total_games, 0) as game_count'))
     .leftJoin(
       db('games')
         .select('home_team_id as team_id', db.raw('COUNT(*) as total_games'))
         .groupBy('home_team_id')
         .union(
           db('games')
             .select('away_team_id as team_id', db.raw('COUNT(*) as total_games'))
             .groupBy('away_team_id')
         )
         .as('game_counts'),
       'teams.id', 'game_counts.team_id'
     );
   ```

3. **Add Query Result Caching**
   ```javascript
   // File: backend/src/utils/query-cache.js
   class QueryCache {
     static cache = new Map();
     
     static async get(key, queryFn, ttl = 300000) { // 5 minutes default
       if (this.cache.has(key)) {
         const { data, expires } = this.cache.get(key);
         if (Date.now() < expires) {
           return data;
         }
       }
       
       const data = await queryFn();
       this.cache.set(key, { data, expires: Date.now() + ttl });
       return data;
     }
   }
   ```

#### Deliverables:
- [ ] Games queries optimized
- [ ] Teams aggregation queries optimized  
- [ ] Query result caching implemented
- [ ] Performance benchmarks documented
- [ ] Cache invalidation strategy

---

## Phase 3: Advanced Features (Week 3)
*Independent execution - minimal conflicts*

### Package 3A: API Documentation (Agent 1)
**Files to Create**: Documentation files only
**Dependencies**: All previous packages completed
**Estimated Time**: 4-5 hours

#### Tasks:
1. **Generate OpenAPI Specification**
   ```yaml
   # File: backend/docs/api-spec.yaml
   openapi: 3.0.0
   info:
     title: Sports Management API
     version: 1.0.0
   paths:
     /api/assignments:
       get:
         summary: Get assignments with filtering
         parameters:
           - name: game_id
             in: query
             schema:
               type: string
               format: uuid
   ```

2. **Create API Documentation**
   ```markdown
   # File: backend/docs/API.md
   ## Assignments API
   
   ### GET /api/assignments
   Retrieve assignments with optional filtering.
   
   **Parameters:**
   - `game_id` (uuid): Filter by specific game
   - `status` (string): Filter by assignment status
   ```

3. **Generate Postman Collection**
   ```json
   {
     "info": { "name": "Sports Management API" },
     "item": [
       {
         "name": "Assignments",
         "item": [
           {
             "name": "Get Assignments",
             "request": {
               "method": "GET",
               "url": "{{baseUrl}}/api/assignments"
             }
           }
         ]
       }
     ]
   }
   ```

#### Deliverables:
- [ ] OpenAPI specification complete
- [ ] API documentation created
- [ ] Postman collection generated
- [ ] Documentation website setup

---

### Package 3B: Error Handling Enhancement (Agent 2)
**Files to Modify**: All route files
**Dependencies**: Package 1B (Response Formatters)
**Estimated Time**: 3-4 hours

#### Tasks:
1. **Create Enhanced Error Handler**
   ```javascript
   // File: backend/src/middleware/enhanced-error-handling.js
   class ApiError extends Error {
     constructor(message, statusCode = 500, details = null) {
       super(message);
       this.statusCode = statusCode;
       this.details = details;
       this.isOperational = true;
     }
   }

   const errorHandler = (err, req, res, next) => {
     // Enhanced error logging and response formatting
   };
   ```

2. **Standardize Error Responses**
   ```javascript
   // Replace inconsistent error handling across all routes
   // BEFORE: res.status(500).json({ error: 'Failed' });
   // AFTER: throw new ApiError('Operation failed', 500, { details });
   ```

3. **Add Request Validation Middleware**
   ```javascript
   // File: backend/src/middleware/validation.js
   const validateRequest = (schema) => {
     return (req, res, next) => {
       const { error, value } = schema.validate(req.body);
       if (error) {
         throw new ApiError('Validation failed', 400, error.details);
       }
       req.body = value;
       next();
     };
   };
   ```

#### Deliverables:
- [ ] Enhanced error handling implemented
- [ ] All routes use consistent error responses
- [ ] Request validation middleware added
- [ ] Error logging improved

---

### Package 3C: Performance Monitoring (Agent 3)
**Files to Create**: New monitoring files
**Dependencies**: Package 1A (Database Indexes)
**Estimated Time**: 3-4 hours

#### Tasks:
1. **Enhanced Performance Middleware**
   ```javascript
   // File: backend/src/middleware/advanced-performance.js
   const performanceMonitor = (req, res, next) => {
     const start = process.hrtime.bigint();
     
     res.on('finish', () => {
       const duration = Number(process.hrtime.bigint() - start) / 1000000; // ms
       
       // Log slow queries
       if (duration > 1000) {
         console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
       }
       
       // Store metrics
       MetricsCollector.record(req.path, duration, res.statusCode);
     });
     
     next();
   };
   ```

2. **Database Query Performance Monitoring**
   ```javascript
   // File: backend/src/utils/query-performance.js
   const monitorQuery = (query, context) => {
     const start = Date.now();
     return query.then(result => {
       const duration = Date.now() - start;
       if (duration > 500) {
         console.warn(`Slow query in ${context}: ${duration}ms`);
       }
       return result;
     });
   };
   ```

3. **Performance Dashboard Endpoint**
   ```javascript
   // Enhancement to backend/src/routes/performance.js
   router.get('/detailed-stats', async (req, res) => {
     const stats = {
       queryPerformance: await getQueryStats(),
       endpointPerformance: await getEndpointStats(),
       resourceUsage: await getResourceStats(),
       recommendations: await generateRecommendations()
     };
     res.json(stats);
   });
   ```

#### Deliverables:
- [ ] Advanced performance monitoring
- [ ] Query performance tracking
- [ ] Performance dashboard enhanced
- [ ] Automated performance alerts

---

## Phase 4: Testing & Deployment (Week 4)
*Parallel testing and deployment preparation*

### Package 4A: Comprehensive Testing (Agent 1)
**Files to Create**: Test files
**Dependencies**: All previous packages
**Estimated Time**: 6-8 hours

#### Tasks:
1. **Service Layer Unit Tests**
   ```javascript
   // File: backend/tests/services/UserService.test.js
   describe('UserService', () => {
     test('findByRole should return filtered users', async () => {
       const users = await UserService.findByRole('referee', { is_available: true });
       expect(users).toHaveLength(expectedCount);
       expect(users[0]).toHaveProperty('level_name');
     });
   });
   ```

2. **Integration Tests for Refactored Endpoints**
   ```javascript
   // File: backend/tests/integration/assignments-refactored.test.js
   describe('Assignments API (Refactored)', () => {
     test('bulk update should work with new service', async () => {
       const response = await request(app)
         .post('/api/assignments/bulk-update')
         .send({ updates: testUpdates })
         .expect(200);
       
       expect(response.body.success).toBe(true);
     });
   });
   ```

3. **Performance Test Suite**
   ```javascript
   // File: backend/tests/performance/query-performance.test.js
   describe('Query Performance', () => {
     test('games endpoint should respond within 500ms', async () => {
       const start = Date.now();
       await request(app).get('/api/games?page=1&limit=50');
       const duration = Date.now() - start;
       expect(duration).toBeLessThan(500);
     });
   });
   ```

#### Deliverables:
- [ ] Service layer tests (90%+ coverage)
- [ ] Integration tests for all refactored endpoints
- [ ] Performance test suite
- [ ] Load testing scenarios

---

### Package 4B: Migration Strategy (Agent 2)
**Files to Create**: Migration and deployment scripts
**Dependencies**: All previous packages
**Estimated Time**: 4-5 hours

#### Tasks:
1. **Database Migration Script**
   ```bash
   #!/bin/bash
   # File: scripts/migrate-database.sh
   
   echo "Starting database migration..."
   
   # Backup current database
   npm run db:backup
   
   # Run performance index migrations
   npm run migrate:up 060_performance_indexes.js
   npm run migrate:up 061_query_optimization.js
   npm run migrate:up 062_constraint_optimization.js
   
   echo "Database migration completed"
   ```

2. **Code Deployment Strategy**
   ```bash
   #!/bin/bash
   # File: scripts/deploy-refactored-backend.sh
   
   # Zero-downtime deployment strategy
   # 1. Deploy new code alongside old
   # 2. Update load balancer gradually  
   # 3. Monitor performance metrics
   # 4. Rollback capability
   ```

3. **Rollback Procedures**
   ```bash
   #!/bin/bash
   # File: scripts/rollback-deployment.sh
   
   # Quick rollback if issues detected
   # 1. Restore previous code version
   # 2. Rollback database migrations if needed
   # 3. Clear caches
   # 4. Notify team
   ```

#### Deliverables:
- [ ] Migration scripts created
- [ ] Deployment strategy documented
- [ ] Rollback procedures ready
- [ ] Monitoring alerts configured

---

### Package 4C: Documentation & Training (Agent 3)
**Files to Create**: Documentation files
**Dependencies**: All previous packages
**Estimated Time**: 3-4 hours

#### Tasks:
1. **Developer Documentation**
   ```markdown
   # File: backend/docs/DEVELOPMENT.md
   
   ## New Architecture Overview
   
   ### Service Layer
   - BaseService: Common CRUD operations
   - UserService: User and referee management
   - AssignmentService: Assignment operations
   
   ### Best Practices
   - Always use services for business logic
   - Use QueryBuilder for complex queries
   - Use ResponseFormatter for consistent responses
   ```

2. **Migration Guide**
   ```markdown
   # File: backend/docs/MIGRATION_GUIDE.md
   
   ## What Changed
   - Duplicate code removed from assignments.js
   - User/referee operations consolidated
   - Database performance optimized
   
   ## API Changes
   - No breaking changes to external APIs
   - Internal structure improved
   ```

3. **Performance Optimization Guide**
   ```markdown
   # File: backend/docs/PERFORMANCE.md
   
   ## New Performance Features
   - Database indexes added
   - Query result caching
   - Bulk operation optimization
   
   ## Monitoring
   - Use /api/performance/detailed-stats
   - Monitor query performance logs
   ```

#### Deliverables:
- [ ] Developer documentation complete
- [ ] Migration guide created
- [ ] Performance optimization guide
- [ ] Training materials for team

---

## Coordination & Communication Plan

### Daily Coordination (15 minutes)
**Time**: 9:00 AM (or start of work day)
**Participants**: All agents working on packages
**Format**: 
- Agent 1: "Working on Package X, blocked by nothing, will complete by Y"
- Agent 2: "Working on Package Z, need input on ABC from Agent 1"
- Conflict resolution and dependency management

### Weekly Review (30 minutes)
**Time**: End of each week
**Participants**: All agents + project lead
**Format**:
- Demo completed packages
- Review integration points
- Plan next week's dependencies

### Conflict Resolution
**File Conflicts**: Use git feature branches, merge through pull requests
**Dependency Conflicts**: Clearly defined in each package description
**Resource Conflicts**: Database access - use different schemas for testing

---

## Risk Mitigation

### High-Risk Areas
1. **Assignments.js Refactoring**: Critical functionality, high traffic
   - **Mitigation**: Keep old endpoints until new ones tested
   - **Rollback**: Feature flags for old vs new logic

2. **Database Performance**: Indexes could impact write performance  
   - **Mitigation**: Test on staging with production data volume
   - **Rollback**: Drop index scripts prepared

3. **Service Layer Dependencies**: Circular dependency risk
   - **Mitigation**: Clear dependency hierarchy defined
   - **Rollback**: Keep original route logic commented

### Testing Strategy
- **Unit Tests**: Each package includes comprehensive tests
- **Integration Tests**: Cross-package functionality tested
- **Performance Tests**: Before/after benchmarks
- **Load Tests**: Staging environment with production-like load

---

## Success Metrics

### Code Quality
- [ ] Duplicate code reduced by 20%+ (target: 450+ lines removed)
- [ ] Cyclomatic complexity reduced by 15%
- [ ] Test coverage increased to 85%+

### Performance
- [ ] Database query time improved by 30%+
- [ ] API response time improved by 25%+
- [ ] Memory usage optimized by 20%+

### Maintainability  
- [ ] Business logic centralized in services
- [ ] Consistent error handling across all endpoints
- [ ] API documentation coverage 100%

### Reliability
- [ ] Zero breaking changes to external APIs
- [ ] Successful rollback capability tested
- [ ] Performance monitoring alerts functional

---

## Timeline Summary

| Week | Phase | Packages | Agents | Key Deliverables |
|------|-------|----------|---------|------------------|
| 1 | Foundation | 1A, 1B, 1C | 3 | Database indexes, utilities, service foundation |
| 2 | Core Refactoring | 2A, 2B, 2C, 2D | 4 | Duplicate removal, service implementation, optimization |
| 3 | Advanced Features | 3A, 3B, 3C | 3 | Documentation, error handling, monitoring |
| 4 | Testing & Deployment | 4A, 4B, 4C | 3 | Tests, migration, deployment |

**Total Estimated Time**: 60-80 hours across 4 weeks
**Recommended Team Size**: 3-4 agents working in parallel
**Expected Outcome**: 20% code reduction, 30%+ performance improvement, significantly improved maintainability