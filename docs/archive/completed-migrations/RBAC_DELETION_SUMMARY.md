# RBAC Registry Deletion Summary

**Date**: 2025-10-18
**Status**: ✅ **READY TO EXECUTE**
**Risk**: 🟢 LOW (system inactive, no data loss)

---

## ✅ What Will Be Deleted

### Backend Files (3 files):
1. `backend/src/routes/admin/rbac-registry.ts` - API routes
2. `backend/src/services/RBACRegistryService.ts` - Service logic
3. `backend/src/startup/rbac-scanner-init.ts` - Startup scanner

### Frontend Files (1 file):
4. `frontend/components/admin/rbac/RBACRegistryDashboard.tsx` - UI dashboard

### Database Tables (5 tables - ALL EMPTY):
5. `rbac_pages` - 0 rows
6. `rbac_endpoints` - 0 rows
7. `rbac_functions` - 0 rows
8. `rbac_scan_history` - 0 rows
9. `rbac_configuration_templates` - 0 rows

### Code References (2 lines in app.ts):
10. Import statement for rbac-registry routes
11. Route registration for /api/admin/rbac-registry

---

## 🚀 How to Execute

### Option A: Automated Script (RECOMMENDED)

```bash
# Make script executable
chmod +x delete-rbac-registry.sh

# Run deletion
./delete-rbac-registry.sh

# Run migration
cd backend && npm run migrate:latest
```

### Option B: Manual Steps

```bash
# 1. Edit backend/src/app.ts - comment out these 2 lines:
#    import adminRBACRegistryRoutes from './routes/admin/rbac-registry';
#    app.use('/api/admin/rbac-registry', adminRBACRegistryRoutes);

# 2. Delete backend files
rm backend/src/routes/admin/rbac-registry.ts
rm backend/src/services/RBACRegistryService.ts
rm backend/src/startup/rbac-scanner-init.ts

# 3. Delete frontend files
rm frontend/components/admin/rbac/RBACRegistryDashboard.tsx

# 4. Create migration (see RBAC_REGISTRY_DELETION_PLAN.md for content)
# Copy migration content to: backend/migrations/20251018000000_drop_rbac_registry_tables.js

# 5. Run migration
cd backend && npm run migrate:latest
```

---

## ✅ Verification Checklist

After execution, verify:

```bash
# 1. No references remain
grep -r "RBACRegistry" backend/src/ --include="*.ts"
# Expected: No results

grep -r "rbac-registry" backend/src/ --include="*.ts"
# Expected: No results (or only commented lines in app.ts)

# 2. Backend builds
cd backend && npm run build
# Expected: Success, no errors

# 3. Database tables dropped
PGPASSWORD=postgres123 "C:/Program Files/PostgreSQL/17/bin/psql.exe" -U postgres -h localhost -p 5432 -d sports_management -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'rbac_%' ORDER BY tablename;"
# Expected: Only role_* tables remain, no rbac_pages/endpoints/functions/scan_history/configuration_templates

# 4. Server starts
npm run dev
# Expected: No errors, starts normally

# 5. Test API endpoints
curl http://localhost:3001/api/admin/roles
# Expected: 200 OK

curl http://localhost:3001/api/admin/rbac-registry/stats
# Expected: 404 Not Found (deleted!)
```

---

## 📊 Impact

### Immediate Benefits:
- ✅ **-3.5 hours** from implementation roadmap
- ✅ **-4 files** removed from codebase
- ✅ **-5 tables** removed from database
- ✅ **Reduced complexity** - clearer Cerbos-only architecture

### No Negative Impact:
- ❌ **No data loss** (all tables empty)
- ❌ **No broken features** (system was inactive)
- ❌ **No user impact** (UI was unused)

---

## 🔄 Rollback (If Needed)

If something goes wrong:

```bash
# Restore files
git checkout HEAD -- backend/src/app.ts
git checkout HEAD -- backend/src/routes/admin/rbac-registry.ts
git checkout HEAD -- backend/src/services/RBACRegistryService.ts
git checkout HEAD -- backend/src/startup/rbac-scanner-init.ts
git checkout HEAD -- frontend/components/admin/rbac/RBACRegistryDashboard.tsx

# Rollback migration
cd backend && npm run migrate:rollback

# Restart
npm run dev
```

---

## 📝 Post-Deletion Updates

After successful deletion:

### 1. Update RBAC_CERBOS_MIGRATION_STATUS.md
Add section:
```markdown
## RBAC Registry System - DELETED 2025-10-18

**Status**: ✅ Permanently removed
**Reason**: System was unused (all tables empty), doesn't align with Cerbos
**Impact**: -3.5 hours from roadmap, reduced complexity
```

### 2. Update IMPLEMENTATION_ROADMAP.md
Reduce estimates:
- P0 Critical: 51 hours (was 59)
- Total: 218 hours (was 249)

### 3. Git Commit
```bash
git add .
git commit -m "feat: Remove unused RBAC Registry system

- Deleted 4 unused files (routes, service, startup, frontend)
- Dropped 5 empty database tables
- System was inactive since Cerbos migration
- Saves 3.5 hours from implementation roadmap
- Reduces codebase complexity"
```

---

## ✅ Success Criteria

Deletion is successful when:
- ✅ All 4 files deleted
- ✅ All 5 tables dropped
- ✅ Backend builds without errors
- ✅ Server starts without errors
- ✅ /api/admin/rbac-registry/* returns 404
- ✅ All other endpoints still work
- ✅ No broken imports/references

---

**Ready to execute? Run `./delete-rbac-registry.sh`**
