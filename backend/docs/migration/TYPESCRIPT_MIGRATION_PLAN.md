# TypeScript Migration Plan - Backend

## Current Status (Phase 4 - Partial)
- ✅ Phase 1: Foundation (types, tsconfig)
- ✅ Phase 2: Core Services (BaseService, AssignmentService, RoleService, UserService)
- ✅ Phase 3: Main Routes (auth, games, assignments, users)
- 🔄 Phase 4: Infrastructure (middleware partially migrated with JS bridges)

## Migration Strategy

### Phase 5: Complete Infrastructure Layer
**Priority: HIGH | Timeline: 2-3 days**

#### 5.1 Config Files Migration
- [ ] `config/database.js` → `database.ts`
- [ ] `config/redis.js` → `redis.ts`
- [ ] `config/queue.js` → `queue.ts`
- [ ] `config/aiConfig.js` → `aiConfig.ts`

#### 5.2 Complete Middleware Migration
- [ ] Remove JS bridge files once TS versions are stable
- [ ] `middleware/rateLimiting.js` → `rateLimiting.ts`
- [ ] `middleware/sanitization.js` → `sanitization.ts`
- [ ] `middleware/performanceMonitor.js` → `performanceMonitor.ts`
- [ ] `middleware/responseCache.js` → `responseCache.ts`
- [ ] `middleware/accessControl.js` → `accessControl.ts`
- [ ] `middleware/permissionCheck.js` → `permissionCheck.ts`
- [ ] `middleware/auditLogger.js` → `auditLogger.ts`
- [ ] `middleware/fileUpload.js` → `fileUpload.ts`

### Phase 6: Critical Services
**Priority: HIGH | Timeline: 3-4 days**

#### 6.1 Core Services
- [ ] `services/CacheService.js` → `CacheService.ts`
- [ ] `services/PermissionService.js` → `PermissionService.ts`
- [ ] `services/RefereeService.js` → `RefereeService.ts`
- [ ] `services/GameStateService.js` → `GameStateService.ts`
- [ ] `services/emailService.js` → `emailService.ts`

#### 6.2 Data Services
- [ ] `services/LocationDataService.js` → `LocationDataService.ts`
- [ ] `services/DistanceCalculationService.js` → `DistanceCalculationService.ts`
- [ ] `services/MentorshipService.js` → `MentorshipService.ts`

### Phase 7: Route Controllers
**Priority: MEDIUM | Timeline: 4-5 days**

#### 7.1 High-Traffic Routes
- [ ] `routes/referees.js` → `referees.ts`
- [ ] `routes/leagues.js` → `leagues.ts`
- [ ] `routes/teams.js` → `teams.ts`
- [ ] `routes/availability.js` → `availability.ts`
- [ ] `routes/calendar.js` → `calendar.ts`

#### 7.2 Admin Routes
- [ ] `routes/admin/permissions.js` → `admin/permissions.ts`
- [ ] `routes/admin/users.js` → `admin/users.ts`
- [ ] `routes/admin/roles.js` → `admin/roles.ts`
- [ ] `routes/admin/access.js` → `admin/access.ts`

### Phase 8: Utility & Helper Files
**Priority: LOW | Timeline: 2 days**

- [ ] Create `utils/` TypeScript utilities
- [ ] Migrate helper functions
- [ ] Update import/export patterns

### Phase 9: Testing & Validation
**Priority: CRITICAL | Timeline: 2 days**

- [ ] Update Jest configuration for TypeScript
- [ ] Migrate test files to TypeScript
- [ ] Ensure all tests pass
- [ ] Performance benchmarking

### Phase 10: Cleanup & Optimization
**Priority: MEDIUM | Timeline: 1 day**

- [ ] Remove all JS bridge files
- [ ] Remove unused dependencies
- [ ] Update package.json scripts
- [ ] Documentation updates

## Breaking Down Into Smaller Tasks

### Immediate Next Steps (Phase 5.1 - Config Files)

#### Task 1: Database Config Migration
```typescript
// Convert database.js to database.ts
// Add proper typing for Knex configuration
// Handle environment variables with type safety
```

#### Task 2: Redis Config Migration
```typescript
// Convert redis.js to redis.ts
// Add Redis client types
// Handle connection options typing
```

#### Task 3: Queue Config Migration
```typescript
// Convert queue.js to queue.ts
// Add Bull queue types
// Type job processors and options
```

#### Task 4: AI Config Migration
```typescript
// Convert aiConfig.js to aiConfig.ts
// Type AI service configurations
// Add model configuration interfaces
```

## Migration Rules

1. **Preserve Functionality**: No breaking changes during migration
2. **Type Safety**: Add comprehensive types, avoid `any`
3. **Incremental**: Use bridge pattern for smooth transition
4. **Testing**: Each migrated file must pass existing tests
5. **Documentation**: Update JSDoc to TSDoc format

## File Conversion Pattern

```typescript
// 1. Create .ts version alongside .js
// 2. Add comprehensive types
// 3. Update imports/exports
// 4. Create bridge .js file (temporary)
// 5. Test thoroughly
// 6. Remove bridge once stable
```

## Success Metrics

- [ ] All backend files converted to TypeScript
- [ ] Zero runtime errors from migration
- [ ] All tests passing
- [ ] Type coverage > 95%
- [ ] No performance degradation
- [ ] Clean build with no warnings

## Risk Mitigation

- Keep JS bridge files during transition
- Test each migration thoroughly
- Commit frequently for easy rollback
- Monitor application logs for errors
- Have rollback plan ready

## Agent Task Distribution

### Agent 1: Config Migration Specialist
- Focus: Phase 5.1 (Config files)
- Skills: TypeScript, Node.js configuration, environment handling

### Agent 2: Middleware Migration Engineer
- Focus: Phase 5.2 (Remaining middleware)
- Skills: Express middleware, TypeScript, async handling

### Agent 3: Service Layer Architect
- Focus: Phase 6 (Critical services)
- Skills: Service patterns, dependency injection, TypeScript

### Agent 4: Route Migration Developer
- Focus: Phase 7 (Routes and controllers)
- Skills: Express routes, REST API, TypeScript

## Timeline Summary

- **Week 1**: Phases 5-6 (Infrastructure & Critical Services)
- **Week 2**: Phases 7-8 (Routes & Utilities)
- **Week 3**: Phases 9-10 (Testing & Cleanup)

Total Estimated Time: 15-20 days for complete migration