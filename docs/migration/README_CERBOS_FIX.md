# Cerbos Authorization Fix - Documentation Index

## 🎯 Start Here

You're reading this because Super Admin was getting "403 Forbidden" errors on API calls.

**Good news**: The root cause is fixed. You just need to create the remaining policy files.

---

## 📚 Documentation Files

### 1. **SESSION_SUMMARY.md** ⭐ READ THIS FIRST
- What was broken
- What was fixed
- Current state
- What still needs to be done

### 2. **QUICK_START.md** 🚀 FOR IMMEDIATE ACTION
- TL;DR version
- Quick commands to run
- Simple verification steps

### 3. **CERBOS_POLICY_CREATION_PLAN.md** 📖 COMPLETE TECHNICAL GUIDE
- Detailed explanation of everything
- Step-by-step instructions
- Troubleshooting guide
- Reference materials

### 4. **create_cerbos_policies.sh** 🤖 AUTOMATED SCRIPT
- Run this to create all 38 missing policy files
- Includes verification and testing

---

## ⚡ Quick Start (2 Minutes)

```bash
# 1. Read the summary
cat SESSION_SUMMARY.md

# 2. Run the script
./create_cerbos_policies.sh

# 3. Verify it worked
docker logs sportsmanager-cerbos 2>&1 | grep "Found.*executable policies"
# Should show: "Found 41 executable policies"

# 4. Test an endpoint
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYjViOTRmMy1hNzAwLTRjNTktYTI5Ny01ZGNiNTQzZDM3MmQiLCJlbWFpbCI6ImFkbWluQHJlZmFzc2lnbi5jb20iLCJyb2xlcyI6WyJTdXBlciBBZG1pbiIsIkFkbWluIl0sImlhdCI6MTc1OTAwNzQzMCwiZXhwIjoxNzU5NjEyMjMwfQ.kWjM3-7HEnRKs4FCWW6Nm59nx66bWUZAPOp9xcn7gV8"
curl -s "http://localhost:3001/api/teams" -H "Authorization: Bearer $TOKEN" | head -20
# Should return JSON data (not 403 error)
```

---

## 📊 Current Status

### What's Working ✅
- Cerbos loads policies from YAML files
- Super Admin can access:
  - `/api/users`
  - `/api/games`
  - `/api/assignments`

### What Needs Work ❌
- 38 resources still return 403 Forbidden
- Need to create policy files for:
  - teams, leagues, locations, tournaments
  - expenses, budgets, financial reports
  - documents, communications, content
  - roles, organizations, invitations
  - And 28 more...

---

## 🔍 Quick Diagnosis

### Check if Cerbos is running:
```bash
curl http://localhost:3592/_cerbos/health
```
Expected: `{"status":"SERVING"}`

### Check policy count:
```bash
docker logs sportsmanager-cerbos 2>&1 | grep "Found.*policies" | tail -1
```
Current: `Found 3 executable policies`
Target: `Found 41 executable policies`

### Check for errors:
```bash
docker logs --tail 20 sportsmanager-cerbos | grep -i error
```
Should show no recent errors after running the script.

---

## 🛠️ What Was Fixed

### Problem 1: Wrong Storage Driver
**Before**: Cerbos used SQLite database (ignored YAML files)
```yaml
storage:
  driver: "sqlite3"
```

**After**: Cerbos uses disk storage (reads YAML files)
```yaml
storage:
  driver: "disk"
  disk:
    directory: "/policies"
    watchForChanges: true
```

**File**: `cerbos/config/config.yaml`

### Problem 2: Invalid Policy Format
Multi-document YAML files not supported by disk driver.

**Solution**: Create individual files for each resource
- `user.yaml` ✅
- `game.yaml` ✅ (already existed)
- `assignment.yaml` ✅ (already existed)
- 38 more needed ❌

---

## 🎯 What Needs to Be Done

Create 38 policy files in `cerbos/policies/`:

**Categories**:
- **Core** (6): team, league, location, referee, tournament, post
- **Organization** (4): organization, role, invitation, region
- **Financial** (10): expense, budget, transactions, reports, etc.
- **HR** (2): employee, asset
- **Communication** (3): document, communication, content
- **Mentorship** (2): mentorship, mentee_game
- **Reporting** (2): report, organizational_analytics
- **Config** (5): cerbos_policy, referee_role, referee_level, maintenance, updatable
- **AI** (4): ai_suggestion, historic_pattern, chunk, ai_assignment_rule
- **Scheduling** (1): calendar

Complete list in `CERBOS_POLICY_CREATION_PLAN.md`

---

## 📝 Policy File Template

Each file follows this pattern:

**Filename**: `{resource}.yaml` (e.g., `team.yaml`)

**Content**:
```yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "{resource_name}"
  rules:
    - actions:
        - view
        - view:list
        - view:details
        - view:stats
        - create
        - update
        - delete
        - manage
      effect: EFFECT_ALLOW
      roles:
        - admin
        - super_admin
```

---

## 🚨 Common Issues

### Script won't run
```bash
chmod +x create_cerbos_policies.sh
```

### Cerbos shows "load failures"
Check for syntax errors:
```bash
docker logs sportsmanager-cerbos | grep -A 10 "load_failures"
```

### Still getting 403 errors
1. Restart Cerbos: `docker restart sportsmanager-cerbos`
2. Check policy count matches resource count (41)
3. Verify resource name in code matches policy filename exactly

---

## 🧪 Testing Endpoints

After creating policies, test these key endpoints:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYjViOTRmMy1hNzAwLTRjNTktYTI5Ny01ZGNiNTQzZDM3MmQiLCJlbWFpbCI6ImFkbWluQHJlZmFzc2lnbi5jb20iLCJyb2xlcyI6WyJTdXBlciBBZG1pbiIsIkFkbWluIl0sImlhdCI6MTc1OTAwNzQzMCwiZXhwIjoxNzU5NjEyMjMwfQ.kWjM3-7HEnRKs4FCWW6Nm59nx66bWUZAPOp9xcn7gV8"

# Core resources
curl -s "http://localhost:3001/api/teams" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3001/api/leagues" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3001/api/games" -H "Authorization: Bearer $TOKEN"

# Financial
curl -s "http://localhost:3001/api/expenses" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3001/api/budgets" -H "Authorization: Bearer $TOKEN"

# Organization
curl -s "http://localhost:3001/api/organizations" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3001/api/roles" -H "Authorization: Bearer $TOKEN"
```

All should return JSON data (not 403 errors).

---

## ✅ Success Criteria

- [ ] `create_cerbos_policies.sh` runs without errors
- [ ] Cerbos shows "Found 41 executable policies"
- [ ] No load failures in Cerbos logs
- [ ] All test endpoints return data (not 403)
- [ ] Super Admin can access all pages in frontend

---

## 📞 Need Help?

1. **Check logs**: `docker logs sportsmanager-cerbos | tail -50`
2. **Read troubleshooting**: See `CERBOS_POLICY_CREATION_PLAN.md` section "Troubleshooting"
3. **Verify config**: Ensure `cerbos/config/config.yaml` has disk driver
4. **Check files**: `ls -l cerbos/policies/*.yaml | wc -l` (should be 41)

---

## 📂 Project Structure

```
cerbos/
├── config/
│   └── config.yaml          ← Storage driver configuration
└── policies/
    ├── user.yaml            ← ✅ Working
    ├── game.yaml            ← ✅ Working
    ├── assignment.yaml      ← ✅ Working
    ├── team.yaml            ← ❌ Need to create
    ├── league.yaml          ← ❌ Need to create
    └── ... 36 more          ← ❌ Need to create
```

---

## 🔗 Related Files

- **Backend Config**: `backend/src/services/CerbosAuthService.ts`
- **Helper Functions**: `backend/src/utils/cerbos-helpers.ts`
- **Docker Compose**: `docker-compose.yml` (check Cerbos volume mounts)
- **Route Definitions**: `backend/src/routes/*.ts` (see resource names)

---

## ⏱️ Time Estimate

- **Reading docs**: 5-10 minutes
- **Running script**: 1-2 minutes
- **Verification**: 2-3 minutes
- **Total**: ~15 minutes

---

## 🎓 Learning Resources

- **Cerbos Documentation**: https://docs.cerbos.dev/
- **Policy Examples**: https://github.com/cerbos/cerbos/tree/main/docs/examples
- **Disk Storage**: https://docs.cerbos.dev/cerbos/latest/configuration/storage.html#disk

---

**Ready to start?**

1. Read `SESSION_SUMMARY.md` (2 min)
2. Run `./create_cerbos_policies.sh` (1 min)
3. Test endpoints (2 min)
4. Done! ✅

---

*Last Updated: September 27, 2025*
*Project: SportsManager*
*Location: `C:\Users\School\OneDrive\Desktop\SportsManager-pre-typescript`*