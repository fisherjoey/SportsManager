# Session Summary: Cerbos Authorization Fix

**Date**: September 27, 2025
**Issue**: Super Admin getting "Access Denied" (403 Forbidden) on all API endpoints

---

## Problem Identified

Super Admin account (`admin@refassign.com`) was unable to access any API endpoints except games and assignments, receiving 403 Forbidden errors on:
- `/api/users`
- `/api/teams`
- `/api/leagues`
- And 35+ other endpoints

---

## Root Cause Analysis

After extensive debugging, found **two critical issues**:

### Issue 1: Cerbos Storage Configuration
**Problem**: Cerbos was configured to use SQLite database storage instead of loading YAML policy files

**Evidence**:
```
{"log.level":"info","log.logger":"cerbos.sqlite3","message":"Initializing sqlite3 storage","DSN":"file:/data/cerbos.db?_fk=true"}
```

**Impact**: All the YAML policy files in `cerbos/policies/` were being completely ignored

### Issue 2: Invalid Policy File Format
**Problem**: Policy files had multiple YAML documents (separated by `---`) which the disk driver doesn't support

**Evidence**:
```json
{
  "error": "more than one YAML document detected",
  "file": "default_resource.yaml"
}
```

**Impact**: Even after fixing storage, policies wouldn't load

---

## Changes Made

### 1. Fixed Cerbos Configuration
**File**: `cerbos/config/config.yaml`

**Before**:
```yaml
storage:
  driver: "sqlite3"
  sqlite3:
    dsn: "file:/data/cerbos.db?_fk=true"
```

**After**:
```yaml
storage:
  driver: "disk"
  disk:
    directory: "/policies"
    watchForChanges: true
```

### 2. Removed Invalid Policy Files
Backed up files with multiple YAML documents:
- `cerbos/policies/default_resource.yaml` → `default_resource.yaml.bak`
- `cerbos/policies/principal_admin.yaml` → `principal_admin.yaml.bak`
- `cerbos/policies/_schemas.yaml` → `_schemas.yaml.bak`

### 3. Created User Policy
**New File**: `cerbos/policies/user.yaml`

```yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "user"
  rules:
    - actions:
        - view
        - view:list
        - view:details
        - view:stats
        - view:roles
        - create
        - update
        - delete
        - manage
      effect: EFFECT_ALLOW
      roles:
        - admin
        - super_admin
```

### 4. Added Debug Logging
**File**: `backend/src/services/CerbosAuthService.ts` (lines 89-97)

Added console logging to see what's being sent to Cerbos:
```typescript
console.log('[CERBOS CHECK] Request:', JSON.stringify({
  principal: { id: principal.id, roles: principal.roles },
  resource: { kind: resource.kind, id: resource.id },
  action
}, null, 2));

const response = await this.client.checkResource(request);

console.log('[CERBOS CHECK] Response allowed:', response.isAllowed(action));
```

### 5. Added Debug Logging (Backend)
**File**: `backend/src/utils/cerbos-helpers.ts` (line 40)

```typescript
console.log('[CERBOS DEBUG] Principal roles:', roles, 'for user:', user.email);
```

### 6. Restarted Cerbos
```bash
docker restart sportsmanager-cerbos
```

---

## Results

### Before Fix
```bash
$ curl http://localhost:3001/api/users -H "Authorization: Bearer $TOKEN"
{"error":"Forbidden","message":"You do not have permission to perform this action"}
```

### After Fix
```bash
$ curl http://localhost:3001/api/users -H "Authorization: Bearer $TOKEN"
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "066794c1-c2cc-480d-a150-553398c48634",
        "email": "admin@cmba.ca",
        "name": "CMBA Admin",
        "roles": ["Super Admin", "Admin", ...]
      }
    ]
  }
}
```

### Cerbos Status
```bash
$ docker logs sportsmanager-cerbos | grep "Found.*policies"
{"log.level":"info","message":"Found 3 executable policies"}
```

---

## Current State

### ✅ Working
- Cerbos loads policies from YAML files (disk storage)
- Super Admin can access: `/api/users`, `/api/games`, `/api/assignments`
- 3 resource policies active: `user`, `game`, `assignment`
- Debug logging enabled for troubleshooting

### ❌ Not Yet Working
- 38 other resources still return 403 Forbidden
- Missing policy files for: teams, leagues, locations, tournaments, expenses, budgets, reports, etc.

---

## Next Steps (For New Session)

### Immediate Action Required
Create 38 missing policy files for remaining resources.

**Two Options**:

1. **Automated** (Recommended):
   ```bash
   ./create_cerbos_policies.sh
   ```

2. **Manual**:
   Follow step-by-step instructions in `CERBOS_POLICY_CREATION_PLAN.md`

### Documentation Created
1. `CERBOS_POLICY_CREATION_PLAN.md` - Complete technical documentation (25+ pages)
2. `create_cerbos_policies.sh` - Automated script to create all policies
3. `QUICK_START.md` - Quick reference guide
4. `SESSION_SUMMARY.md` - This file

### Expected Outcome
After creating remaining policies:
- Cerbos will show: "Found 41 executable policies"
- Super Admin will have access to all 41 API resource types
- No more 403 Forbidden errors for admin/super_admin roles

---

## Technical Details

### Role Normalization
User roles from database are normalized for Cerbos:
- "Super Admin" → "super_admin"
- "Admin" → "admin"
- Spaces/hyphens converted to underscores
- Converted to lowercase

**Location**: `backend/src/utils/cerbos-helpers.ts:8-11`

### JWT Token (For Testing)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYjViOTRmMy1hNzAwLTRjNTktYTI5Ny01ZGNiNTQzZDM3MmQiLCJlbWFpbCI6ImFkbWluQHJlZmFzc2lnbi5jb20iLCJyb2xlcyI6WyJTdXBlciBBZG1pbiIsIkFkbWluIl0sImlhdCI6MTc1OTAwNzQzMCwiZXhwIjoxNzU5NjEyMjMwfQ.kWjM3-7HEnRKs4FCWW6Nm59nx66bWUZAPOp9xcn7gV8
```

User: `admin@refassign.com`
Roles: `["Super Admin", "Admin"]`
Expires: January 30, 2026

### Database Verification
```sql
-- Check user roles
SELECT u.email, r.name as role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@refassign.com';

-- Result:
-- admin@refassign.com | Super Admin
-- admin@refassign.com | Admin
```

---

## Files Modified

1. `cerbos/config/config.yaml` - Changed storage driver
2. `backend/src/services/CerbosAuthService.ts` - Added debug logging
3. `backend/src/utils/cerbos-helpers.ts` - Added debug logging

## Files Created

1. `cerbos/policies/user.yaml` - User resource policy
2. `CERBOS_POLICY_CREATION_PLAN.md` - Complete documentation
3. `create_cerbos_policies.sh` - Automated script
4. `QUICK_START.md` - Quick reference
5. `SESSION_SUMMARY.md` - This summary

## Files Backed Up

1. `cerbos/policies/default_resource.yaml.bak`
2. `cerbos/policies/principal_admin.yaml.bak`
3. `cerbos/policies/_schemas.yaml.bak`

---

## Testing Commands

### Check Cerbos Health
```bash
curl http://localhost:3592/_cerbos/health
# Expected: {"status":"SERVING"}
```

### Check Policy Count
```bash
docker logs sportsmanager-cerbos 2>&1 | grep "Found.*executable policies" | tail -1
# Current: Found 3 executable policies
# Target: Found 41 executable policies
```

### Test API Endpoint
```bash
TOKEN="<jwt_token_above>"
curl -s -X GET "http://localhost:3001/api/users?page=1&limit=2" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
# Should return user data (not 403 error)
```

### Check for Errors
```bash
docker logs --tail 50 sportsmanager-cerbos | grep -i error
# Should show no load_failures
```

---

## Context for Next Session

When starting a new chat:

1. **Read this file first** to understand what was done
2. **Read QUICK_START.md** for immediate action steps
3. **Read CERBOS_POLICY_CREATION_PLAN.md** for complete technical details
4. **Run the script**: `./create_cerbos_policies.sh`
5. **Verify**: Check that 41 policies are loaded and APIs work

**Project Location**: `C:\Users\School\OneDrive\Desktop\SportsManager-pre-typescript`

**Key Issue**: Authorization is working, just need to create policy files for 38 remaining resources.

---

## Additional Notes

### Why SQLite Was Enabled
Unknown - appears to be default configuration from initial Cerbos setup. The `cerbos/config/config.yaml` had SQLite configured but the project intended to use YAML file-based policies.

### Why Multi-Document YAML Was Used
The `default_resource.yaml` file attempted to define all 41 resource policies in one file using YAML document separators (`---`). While valid YAML, Cerbos disk driver doesn't support this format - each policy must be in a separate file.

### Alternative Solution Considered
Could have kept SQLite storage and migrated policies to database, but disk storage is simpler for development and allows version control of policies.

---

## Success Metrics

- [x] Identified root cause
- [x] Fixed Cerbos configuration
- [x] Created working user policy
- [x] Verified API access works for user resource
- [x] Added debug logging
- [x] Created comprehensive documentation
- [ ] Create remaining 38 policy files (Next session)
- [ ] Verify all 41 resources accessible
- [ ] Clean up debug logging (optional)
- [ ] Remove `.bak` files (after confirmation)

---

**Status**: Ready for policy creation phase
**Blocker**: None - clear path forward
**Time Estimate**: 5-10 minutes to run script + verify