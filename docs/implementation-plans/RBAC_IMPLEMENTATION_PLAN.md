# Role-Based Access Control (RBAC) Implementation Plan

## Executive Summary
This document outlines the phased implementation of a comprehensive Role-Based Access Control system for the Sports Management application. The system will replace the current hardcoded `admin`/`referee` role system with a flexible, GUI-manageable permission system.

## Impact Analysis

### Components That Will Change
1. **Database Schema** - New tables for roles, permissions, and mappings
2. **Authentication Middleware** - Enhanced permission checking
3. **API Routes** - All routes need permission decorators
4. **Frontend Auth Context** - Updated to handle new permission system
5. **User Components** - Modified to check specific permissions

### Components That Will NOT Change
1. **JWT Token Structure** - Backward compatible with `roles` array
2. **Login/Logout Flow** - Same authentication process
3. **Basic Component Structure** - Only permission checks change
4. **Existing Features** - All features remain, just with better access control

## Migration Strategy
The implementation will be **backward compatible** during the transition:
- Keep existing `role` field temporarily
- New system reads both old and new role data
- Gradual migration of components
- Zero downtime deployment

---

## Phase 1: Database Foundation (Day 1)
**Goal**: Create the database schema and migration scripts

### Tasks:
1. Create migration for new RBAC tables
   - `roles` table
   - `permissions` table
   - `role_permissions` junction table
   - `user_roles` junction table
   
2. Seed default roles and permissions
   - Super Admin (all permissions)
   - Admin (organization management)
   - Assignment Manager
   - Referee Coordinator
   - Senior Referee
   - Referee

3. Create migration script for existing users
   - Map `role: 'admin'` → Admin role
   - Map `role: 'referee'` → Referee role
   - Maintain backward compatibility

### Files to Create:
- `backend/migrations/[timestamp]_create_rbac_tables.js`
- `backend/seeds/01_default_roles_permissions.js`
- `backend/scripts/migrate_existing_roles.js`

### Tests to Add:
- Role creation and validation
- Permission assignment
- User role assignment
- Migration script testing

---

## Phase 2: Backend API Layer (Day 2)
**Goal**: Implement role and permission management APIs

### Tasks:
1. Create role management service
   - CRUD operations for roles
   - Permission assignment to roles
   - Role activation/deactivation

2. Create permission checking service
   - Get user permissions
   - Check specific permissions
   - Cache permissions for performance

3. Update authentication middleware
   - Add `requirePermission()` middleware
   - Add `requireAnyPermission()` middleware
   - Maintain backward compatibility with `requireRole()`

### Files to Create:
- `backend/src/services/RoleService.js`
- `backend/src/services/PermissionService.js`
- `backend/src/routes/admin/roles.js`
- `backend/src/routes/admin/permissions.js`
- `backend/src/middleware/permissions.js`

### Files to Modify:
- `backend/src/middleware/auth.js` - Add new permission methods
- `backend/src/routes/auth.js` - Include permissions in JWT

### Tests to Add:
- Permission middleware tests
- Role API endpoint tests
- Permission caching tests
- Backward compatibility tests

---

## Phase 3: Frontend Role Management UI (Day 3-4)
**Goal**: Create admin interface for managing roles and permissions

### Tasks:
1. Create role management dashboard
   - List all roles with user counts
   - Create/edit/delete roles
   - Visual permission matrix

2. Create user role assignment interface
   - View user's current roles
   - Add/remove roles
   - Bulk role assignment

3. Create permission builder
   - Visual permission selector
   - Category-based organization
   - Permission templates

### Files to Create:
```
components/admin/rbac/
├── RoleManagementDashboard.tsx
├── RoleEditor.tsx
├── PermissionMatrix.tsx
├── UserRoleManager.tsx
├── RoleCard.tsx
├── PermissionSelector.tsx
└── RoleAuditLog.tsx
```

### Files to Modify:
- `components/admin-dashboard.tsx` - Add role management section
- `components/app-sidebar.tsx` - Add role management menu item

### Tests to Add:
- Role management UI tests
- Permission matrix interaction tests
- User assignment flow tests

---

## Phase 4: Frontend Permission Integration (Day 5)
**Goal**: Update frontend components to use new permission system

### Tasks:
1. Update AuthProvider
   - Fetch user permissions on login
   - Add `hasPermission()` method
   - Add `hasAnyPermission()` method
   - Cache permissions locally

2. Create permission guard components
   - `<RequirePermission>` wrapper
   - `<RequireAnyPermission>` wrapper
   - Permission-based rendering

3. Update existing components
   - Replace `hasRole('admin')` with specific permissions
   - Add permission checks to sensitive operations
   - Update navigation based on permissions

### Files to Create:
- `components/auth/PermissionGuard.tsx`
- `components/auth/RequirePermission.tsx`
- `lib/permissions.ts`
- `hooks/usePermissions.ts`

### Files to Modify:
- `components/auth-provider.tsx` - Add permission methods
- `lib/api.ts` - Include permission fetching
- All admin components - Update permission checks

### Tests to Add:
- Permission guard component tests
- Hook integration tests
- Permission caching tests

---

## Phase 5: API Route Protection (Day 6)
**Goal**: Apply granular permissions to all API endpoints

### Tasks:
1. Audit all API routes for required permissions
2. Apply permission middleware to routes
3. Document permission requirements
4. Update API tests with permission checks

### Routes to Update:
```javascript
// Example transformations:
// Before:
router.post('/games', requireRole('admin'), ...)

// After:
router.post('/games', requirePermission('games:create'), ...)
```

### Permission Map:
```
Games:
- GET /games → games:read
- POST /games → games:create
- PUT /games/:id → games:update
- DELETE /games/:id → games:delete

Assignments:
- GET /assignments → assignments:read
- POST /assignments → assignments:create
- PUT /assignments/:id → assignments:update
- DELETE /assignments/:id → assignments:delete

Referees:
- GET /referees → referees:read
- PUT /referees/:id → referees:update

Reports:
- GET /reports → reports:read
- POST /reports → reports:create

Settings:
- GET /settings → settings:read
- PUT /settings → settings:update
```

### Files to Modify:
- All route files in `backend/src/routes/`
- API documentation

### Tests to Update:
- All API integration tests
- Add permission denial tests
- Add multi-permission tests

---

## Phase 6: Testing & Migration (Day 7)
**Goal**: Comprehensive testing and production migration

### Tasks:
1. End-to-end testing
   - User flows with different roles
   - Permission inheritance
   - Edge cases

2. Performance testing
   - Permission caching effectiveness
   - Database query optimization
   - Frontend rendering performance

3. Migration preparation
   - Backup existing data
   - Test migration scripts
   - Prepare rollback plan

4. Documentation
   - Admin user guide
   - Developer documentation
   - Permission reference

### Deliverables:
- Test coverage report (>90%)
- Performance benchmarks
- Migration checklist
- User documentation

---

## Implementation Order

### Critical Path (Must Complete First):
1. Database schema creation
2. Migration scripts
3. Basic permission middleware
4. AuthProvider updates

### Parallel Work (Can Be Done Simultaneously):
- Frontend UI development
- API route updates
- Test writing
- Documentation

### Final Steps:
1. Integration testing
2. Performance optimization
3. Production deployment

---

## Risk Mitigation

### Risks:
1. **Breaking existing functionality**
   - Mitigation: Maintain backward compatibility
   - Keep old role field during transition
   
2. **Performance degradation**
   - Mitigation: Implement permission caching
   - Optimize database queries
   
3. **Complex migration**
   - Mitigation: Phased rollout
   - Comprehensive testing

### Rollback Plan:
1. Database changes are additive (new tables)
2. Middleware has fallback to old system
3. Frontend checks both old and new permissions
4. Can revert to previous version quickly

---

## Success Criteria

### Technical:
- [ ] All tests passing (>90% coverage)
- [ ] No performance regression
- [ ] Zero downtime deployment
- [ ] Backward compatibility maintained

### Functional:
- [ ] Admins can create/edit roles via GUI
- [ ] Permissions are enforced on all endpoints
- [ ] Users see only permitted features
- [ ] Audit trail for all permission changes

### User Experience:
- [ ] Intuitive role management interface
- [ ] Clear permission error messages
- [ ] Fast permission checks (<10ms)
- [ ] Smooth migration for existing users

---

## Timeline

**Total Duration**: 7 working days

- **Day 1**: Database schema and migrations
- **Day 2**: Backend services and APIs
- **Day 3-4**: Frontend role management UI
- **Day 5**: Frontend permission integration
- **Day 6**: API route protection
- **Day 7**: Testing and deployment

---

## Notes

1. **Backward Compatibility**: The system will support both old and new role systems during transition
2. **No Breaking Changes**: Existing functionality continues to work
3. **Incremental Rollout**: Can deploy phases independently
4. **Testing First**: Each phase includes comprehensive tests
5. **Documentation**: Update as we go, not at the end

---

## Next Steps

1. Review and approve this plan
2. Set up development branch
3. Begin Phase 1 implementation
4. Daily progress updates
5. Continuous integration testing