# Tomorrow's Action Plan - Start Here

## 🎯 Quick Setup (2 minutes)

**First thing - Enable the pre-commit hook:**

```bash
cd /c/Users/School/OneDrive/Desktop/SportsManager-assigning-logic
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
chmod +x scripts/validate-cerbos-policies.sh
```

✅ **Done! Now you're protected from Cerbos policy errors.**

---

## 🚀 Priority Tasks for Tomorrow

### Task 1: Seed the Docker Database (15 min)

**Problem:** Docker database only has 1 user (admin@sportsmanager.com). Need test data.

**Solution:**

```bash
# Option A: Run seeds in Docker backend
cd deployment
docker-compose -f docker-compose.local.yml up -d
docker exec sportsmanager-backend-local npm run seed

# Option B: Import SQL dump (if seed fails)
docker exec -i sportsmanager-postgres-local psql -U postgres -d sports_management < seed-data/seed_data.sql

# Verify users exist
docker exec sportsmanager-postgres-local psql -U postgres -d sports_management -c "SELECT email, name FROM users;"
```

**Expected Result:**
- Multiple test users (assignor@cmba.ca, coordinator@cmba.ca, etc.)
- Test games, teams, leagues
- At least 3 positions (Referee, Linesman, etc.)

---

### Task 2: Fix Cerbos Authorization (30-60 min)

**Problem:** API returns "Failed to check permissions" for assignment endpoint.

**Debug Steps:**

#### Step 1: Test Cerbos Directly

```bash
# Test super_admin has permission
curl -X POST http://localhost:3592/api/check \
  -H 'Content-Type: application/json' \
  -d '{
    "principal": {
      "id": "test-user",
      "roles": ["super_admin"]
    },
    "resource": {
      "kind": "assignment",
      "id": "test-assignment"
    },
    "actions": ["view:list"]
  }'
```

**Expected:** `"effect": "EFFECT_ALLOW"`

If denied, the problem is in the Cerbos policy files.

#### Step 2: Check Assignment Policy

```bash
# View the policy
cat cerbos-policies/resources/assignment.yaml

# Look for:
# - Does it allow super_admin role?
# - Does it have view:list action?
# - Is the version format correct (underscores, not dots)?
```

#### Step 3: Check Backend Logs

```bash
# Watch Cerbos permission checks
docker logs -f sportsmanager-backend-local | grep -i "cerbos\|permission"

# In another terminal, test the API
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @login-test.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -X GET "http://localhost:3001/api/assignments?limit=3" \
  -H "Authorization: Bearer $TOKEN"
```

**Look for:**
- What principal ID is being sent?
- What roles are being sent?
- What resource/action is being checked?

#### Likely Fix

The super_admin principal policy probably needs to explicitly allow assignment resources. Check:

```yaml
# cerbos-policies/principals/super_admin.yaml
rules:
  - resource: "*"  # Should match ALL resources including assignment
    actions:
      - action: "*"  # Should match ALL actions
        effect: EFFECT_ALLOW
```

If this looks correct, the issue might be in how the backend is calling Cerbos.

---

### Task 3: Test Full Assignment Workflow (30 min)

**Once Cerbos is fixed, test these endpoints:**

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @login-test.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 1. List assignments (should now work with our table join fixes)
curl -X GET "http://localhost:3001/api/assignments?limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Expected: JSON with position_name and referee_level included

# 2. Get available referees for a game
curl -X GET "http://localhost:3001/api/assignments/available-referees/{GAME_ID}" \
  -H "Authorization: Bearer $TOKEN"

# Expected: List of available referees with conflict analysis

# 3. Create an assignment
curl -X POST "http://localhost:3001/api/assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "game_id": "{GAME_ID}",
    "user_id": "{REFEREE_ID}",
    "position_id": "{POSITION_ID}"
  }'

# Expected: Assignment created with wage calculation
```

---

## 📝 What We Fixed Today

✅ **Assignment system:**
- Uncommented table joins (positions, referee_levels)
- Fixed hardcoded position ID
- Clarified login "error" (bash escaping)

✅ **Cerbos validation:**
- Fixed version format error
- Created 4-layer validation system
- Pre-commit hook prevents future errors

✅ **Documentation:**
- 6 comprehensive guides (1,700+ lines)
- Complete setup instructions
- Troubleshooting guides

**All committed in 5 clean commits!**

---

## 🔍 Known Issues (What Still Needs Work)

1. **Cerbos Authorization** ⚠️ BLOCKING
   - super_admin being denied access to assignments
   - Backend returns "Failed to check permissions"
   - **Priority: HIGH** - Must fix before testing workflow

2. **Empty Docker Database** ⚠️ BLOCKING
   - Only 1 user exists
   - No games, teams, or assignments
   - **Priority: HIGH** - Need seed data for testing

3. **Assignment Workflow Testing** ℹ️ PENDING
   - Can't test until above 2 are fixed
   - **Priority: MEDIUM** - Test after Cerbos + seeds

---

## 🎓 Quick Reference

### Commands You'll Use

```bash
# Start environment
cd deployment
docker-compose -f docker-compose.local.yml up -d

# Check status
docker ps --filter name=sportsmanager

# View logs
docker logs -f sportsmanager-backend-local
docker logs -f sportsmanager-cerbos-local

# Validate Cerbos policies
npm run validate:cerbos

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @login-test.json

# Restart services
docker-compose -f deployment/docker-compose.local.yml restart backend
docker-compose -f deployment/docker-compose.local.yml restart cerbos
```

### Test Credentials

**Current working user:**
- Email: `admin@sportsmanager.com`
- Password: `admin123`

**After seeding, these should also work:**
- `assignor@cmba.ca` / `admin123`
- `coordinator@cmba.ca` / `admin123`
- `senior.ref@cmba.ca` / `referee123`

---

## 📚 Documentation Links

**Quick References:**
- `QUICK_ACTIONS.md` - Quick command reference
- `cerbos-policies/VALIDATION_GUIDE.md` - Cerbos rules

**Complete Guides:**
- `docs/FIXES_2025-10-21.md` - Today's fixes explained
- `docs/CERBOS_VALIDATION_SETUP.md` - Validation system setup
- `docs/SESSION_SUMMARY_2025-10-21.md` - Complete session summary

**Deployment:**
- `deployment/README.local.md` - Docker environment guide

---

## ✅ Success Criteria for Tomorrow

By end of tomorrow, you should have:

1. ✅ Pre-commit hook enabled
2. ✅ Docker database seeded with test data
3. ✅ Cerbos authorization working for assignments
4. ✅ All assignment API endpoints tested
5. ✅ Documented any remaining issues

**Estimated Time:** 2-3 hours

---

## 🚨 If You Get Stuck

### Cerbos Won't Start
```bash
# Check policy validation
npm run validate:cerbos

# View errors
docker logs sportsmanager-cerbos-local

# Common fix: version format
# Change: version: "1.0"
# To: version: "1_0"
```

### Backend Errors
```bash
# Rebuild container
cd deployment
docker-compose -f docker-compose.local.yml up -d --build backend

# Check logs
docker logs sportsmanager-backend-local
```

### Database Issues
```bash
# Connect to database
docker exec -it sportsmanager-postgres-local psql -U postgres -d sports_management

# Check tables
\dt

# Check users
SELECT email, name FROM users;
```

---

## 💡 Pro Tips

1. **Keep logs open** in a separate terminal while testing
2. **Validate Cerbos policies** before every commit (pre-commit hook does this automatically)
3. **Test one endpoint at a time** - easier to debug
4. **Save curl commands** in a file for easy reuse
5. **Document issues** as you find them

---

## 🎯 The Big Picture

**Today's Goal:** Get assignment system fully working

**Steps:**
1. ✅ Fix code issues (DONE TODAY)
2. ⏳ Fix authorization (TODO TOMORROW)
3. ⏳ Test workflow (TODO TOMORROW)
4. ⏳ Document findings (TODO TOMORROW)

**You're 50% done!** The hard part (finding and fixing bugs) is complete. Tomorrow is just testing and verification.

---

## 🚀 Let's Go!

**Start here:**
```bash
cd /c/Users/School/OneDrive/Desktop/SportsManager-assigning-logic

# Enable pre-commit hook (2 seconds)
git config core.hooksPath .githooks

# Start environment (30 seconds)
cd deployment
docker-compose -f docker-compose.local.yml up -d

# Seed database (2 minutes)
docker exec sportsmanager-backend-local npm run seed

# Test login (5 seconds)
cd ..
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d @login-test.json
```

**If that all works, you're ready to tackle the Cerbos authorization issue!**

Good luck! 🎉
