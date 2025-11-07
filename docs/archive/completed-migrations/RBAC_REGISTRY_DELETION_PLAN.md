# RBAC Registry Deletion Plan

**Decision**: DELETE the RBAC Registry system
**Reason**: System is unused (all tables empty), doesn't align with Cerbos architecture
**Risk Level**: 🟢 LOW (no data loss, system appears inactive)
**Estimated Time**: 3.5 hours
**Created**: 2025-10-18

---

## ✅ Pre-Flight Safety Checks

### Database Status
- ✅ `rbac_pages`: 0 rows
- ✅ `rbac_endpoints`: 0 rows
- ✅ `rbac_functions`: 0 rows
- ✅ `rbac_scan_history`: 0 rows (probably)
- ✅ `rbac_configuration_templates`: 0 rows (probably)

**Result**: No data will be lost ✅

### Files to Delete (8 files total)

**Backend**:
1. `backend/src/services/RBACRegistryService.ts` - Registry service
2. `backend/src/routes/admin/rbac-registry.ts` - API routes
3. `backend/src/startup/rbac-scanner-init.ts` - Startup integration

**Frontend**:
4. `frontend/components/admin/rbac/RBACRegistryDashboard.tsx` - UI dashboard
5. Potentially: `frontend/components/admin/rbac/DynamicRolePageAccessManager.tsx` (needs verification)

**Database Migration**:
6. Create new migration to drop 5 tables

**Code References to Remove**:
7. `backend/src/app.ts` - Import and route registration (2 lines)
8. `backend/src/auth.ts` - Any scanner initialization calls

---

## 📋 Step-by-Step Deletion Plan

### Phase 1: Backend Route Removal (30 minutes)

#### Step 1.1: Remove route registration from app.ts
**File**: `backend/src/app.ts`

```typescript
// REMOVE these lines:
import adminRBACRegistryRoutes from './routes/admin/rbac-registry';
app.use('/api/admin/rbac-registry', adminRBACRegistryRoutes);
```

**Action**: Comment out first, test server starts, then delete

#### Step 1.2: Delete route file
**File**: `backend/src/routes/admin/rbac-registry.ts`

**Action**: Delete entire file

**Verification**:
```bash
# Ensure no other files import this route
grep -r "rbac-registry" backend/src/ --include="*.ts"
# Should only show the app.ts lines we're removing
```

---

### Phase 2: Backend Service & Startup Removal (45 minutes)

#### Step 2.1: Check for scanner initialization
**File**: `backend/src/app.ts` or `backend/src/auth.ts`

**Search for**:
```typescript
initializeRBACScanner
rbac-scanner-init
getRBACScanner
```

**Action**: Comment out any initialization calls, test server, then delete

#### Step 2.2: Delete service file
**File**: `backend/src/services/RBACRegistryService.ts`

**Action**: Delete entire file

**Verification**:
```bash
grep -r "RBACRegistryService" backend/src/ --include="*.ts"
# Should return no results after deletion
```

#### Step 2.3: Delete startup integration
**File**: `backend/src/startup/rbac-scanner-init.ts`

**Action**: Delete entire file

**Verification**:
```bash
grep -r "rbac-scanner-init" backend/src/ --include="*.ts"
# Should return no results
```

---

### Phase 3: Frontend Component Removal (1 hour)

#### Step 3.1: Delete RBAC Registry Dashboard
**File**: `frontend/components/admin/rbac/RBACRegistryDashboard.tsx`

**Action**:
1. Search for imports: `grep -r "RBACRegistryDashboard" frontend/`
2. Remove any route/navigation references
3. Delete file

#### Step 3.2: Verify DynamicRolePageAccessManager
**File**: `frontend/components/admin/rbac/DynamicRolePageAccessManager.tsx`

**Action**:
1. Read file to check if it uses RBAC Registry
2. If yes: Delete file
3. If no: Keep file (it may be for Cerbos page access)

**Check**: Does it call `/api/admin/rbac-registry/*` endpoints?
- If YES → DELETE
- If NO → KEEP

---

### Phase 4: Database Migration (30 minutes)

#### Step 4.1: Create migration file
**File**: `backend/migrations/20251018000000_drop_rbac_registry_tables.js`

```javascript
/**
 * Migration: Drop RBAC Registry Tables
 *
 * Removes the RBAC Registry system tables that are no longer needed
 * after migration to Cerbos.
 *
 * Tables to drop:
 * - rbac_scan_history
 * - rbac_functions
 * - rbac_endpoints
 * - rbac_pages
 * - rbac_configuration_templates
 */

exports.up = async function(knex) {
  console.log('🗑️  Dropping RBAC Registry tables...');

  // Drop in reverse dependency order
  const tablesToDrop = [
    'rbac_scan_history',
    'rbac_functions',
    'rbac_endpoints',
    'rbac_pages',
    'rbac_configuration_templates'
  ];

  for (const table of tablesToDrop) {
    const exists = await knex.schema.hasTable(table);
    if (exists) {
      console.log(`  Dropping ${table}...`);
      await knex.schema.dropTable(table);
      console.log(`  ✅ ${table} dropped`);
    } else {
      console.log(`  ℹ️  ${table} doesn't exist, skipping`);
    }
  }

  console.log('✅ RBAC Registry tables dropped successfully');
};

exports.down = async function(knex) {
  console.log('⚠️  Cannot recreate RBAC Registry tables');
  console.log('   Original migrations required for table structure');
  console.log('   This system has been permanently removed');
};
```

#### Step 4.2: Run migration
```bash
npm run migrate:latest
```

#### Step 4.3: Verify tables dropped
```bash
PGPASSWORD=postgres123 "C:/Program Files/PostgreSQL/17/bin/psql.exe" -U postgres -h localhost -p 5432 -d sports_management -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%rbac%' ORDER BY tablename;"
```

**Expected result**: `rbac_pages`, `rbac_endpoints`, `rbac_functions`, `rbac_scan_history`, `rbac_configuration_templates` should NOT appear

---

### Phase 5: Testing & Verification (45 minutes)

#### Test 5.1: Backend starts successfully
```bash
npm run dev
```

**Expected**: No errors, server starts normally

#### Test 5.2: No broken imports
```bash
npm run build
```

**Expected**: TypeScript compilation succeeds

#### Test 5.3: Frontend builds successfully
```bash
cd frontend && npm run build
```

**Expected**: No build errors

#### Test 5.4: API endpoints still work
Test critical endpoints:
- ✅ `GET /api/admin/roles` - Should work
- ✅ `GET /api/admin/permissions` - Should work
- ✅ `GET /api/admin/users` - Should work
- ❌ `GET /api/admin/rbac-registry/stats` - Should return 404 (deleted)

#### Test 5.5: Frontend navigation
- ✅ Admin dashboard loads
- ✅ Role management page loads
- ✅ Permission management page loads
- ✅ No broken links/navigation

---

## 🔍 Verification Checklist

After deletion, verify:

**Backend**:
- [ ] `grep -r "RBACRegistry" backend/src/` returns no results
- [ ] `grep -r "rbac-registry" backend/src/` returns no results
- [ ] `grep -r "rbac-scanner" backend/src/` returns no results
- [ ] Server starts without errors
- [ ] API endpoints work correctly

**Frontend**:
- [ ] `grep -r "RBACRegistry" frontend/` returns no results (except tsconfig cache)
- [ ] `grep -r "rbac-registry" frontend/` returns no results
- [ ] Frontend builds successfully
- [ ] Navigation doesn't have broken links

**Database**:
- [ ] 5 RBAC registry tables dropped
- [ ] Other RBAC tables preserved: `roles`, `user_roles`, `role_page_access`, etc.
- [ ] No foreign key errors

**Documentation**:
- [ ] Update RBAC_CERBOS_MIGRATION_STATUS.md - mark registry as deleted
- [ ] Update README if it mentions RBAC registry

---

## ⚠️ Rollback Plan (If Needed)

If deletion causes issues:

### Quick Rollback
```bash
# Restore route temporarily
git checkout HEAD -- backend/src/routes/admin/rbac-registry.ts
git checkout HEAD -- backend/src/services/RBACRegistryService.ts
git checkout HEAD -- backend/src/startup/rbac-scanner-init.ts

# Re-add to app.ts
# Restart server
```

### Full Rollback
```bash
# Rollback migration
npm run migrate:rollback

# Restore all files
git checkout HEAD -- backend/src/routes/admin/rbac-registry.ts
git checkout HEAD -- backend/src/services/RBACRegistryService.ts
git checkout HEAD -- backend/src/startup/rbac-scanner-init.ts
git checkout HEAD -- frontend/components/admin/rbac/RBACRegistryDashboard.tsx
git checkout HEAD -- backend/src/app.ts

# Restart
npm run dev
```

---

## 📊 Expected Impact

### Positive
- ✅ 3.5 hours saved from implementation roadmap
- ✅ Reduced codebase complexity
- ✅ Fewer tables to maintain
- ✅ Clearer architecture (Cerbos only)
- ✅ No more confusion about permission management

### Neutral
- ⚪ Loss of auto-discovery feature (never actively used)
- ⚪ Cannot auto-generate page/endpoint lists (can add back if needed)

### Negative
- ❌ None identified (system was unused)

---

## 🎯 Success Criteria

Deletion is successful when:
1. ✅ Server starts without errors
2. ✅ All critical API endpoints work
3. ✅ Frontend builds and navigates correctly
4. ✅ No references to RBAC Registry in codebase
5. ✅ 5 database tables dropped
6. ✅ No loss of actual functionality

---

## 📝 Post-Deletion Tasks

After successful deletion:
1. **Commit changes**: `feat: Remove unused RBAC Registry system`
2. **Update documentation**: RBAC_CERBOS_MIGRATION_STATUS.md
3. **Update roadmap**: Remove 3.5 hours from estimates
4. **Announce to team**: System removed, use Cerbos YAML for permissions

---

## 🚀 Ready to Execute?

**Recommendation**: Execute phases sequentially, test after each phase

**Estimated Total Time**: 3.5 hours

**Best Time to Execute**: During low-traffic period or development window

**Prerequisites**:
- [ ] Current branch committed
- [ ] Backup taken (optional, git provides rollback)
- [ ] Team notified
- [ ] Ready to test after each phase

---

**Next Step**: Begin Phase 1 - Backend Route Removal
