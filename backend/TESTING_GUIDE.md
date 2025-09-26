# Testing Guide for Cerbos Migration

This guide provides **realistic** testing approaches for the Cerbos authorization migration.

## Quick Testing Options

### ✅ Option 1: Policy Tests (No Backend Needed)

Test Cerbos policies in isolation **without running your backend**:

```bash
# Test all policies
docker run --rm \
  -v $(pwd)/cerbos-policies:/policies:ro \
  ghcr.io/cerbos/cerbos:latest \
  compile --tests=/policies/tests /policies

# Expected output:
# ✓ Game Policy Test Suite: 12/12 tests passed
# ✓ Assignment Policy Test Suite: 12/12 tests passed
```

**What this tests:**
- Policy logic is correct
- Roles and permissions work as expected
- Organization/region isolation works
- Ownership rules work
- Status-based restrictions work

**Doesn't test:**
- Your middleware integration
- Database queries
- Actual HTTP requests

---

### ✅ Option 2: Unit Tests (Mocked, No Dependencies)

Run the middleware tests we already created:

```bash
# Test the middleware
npm test -- requireCerbosPermission.test.ts

# Test auth helpers
npm test -- auth-context.test.ts

# Test integration
npm test -- auth-flow-integration.test.ts
```

**What this tests:**
- Middleware correctly calls Cerbos
- Resource attributes are fetched
- Errors are handled
- Organization/region context is passed

**Doesn't test:**
- Actual Cerbos policies
- Real database data
- Full request/response cycle

---

### ⚠️ Option 3: Manual Testing (Full Stack)

Test with everything running:

#### Step 1: Start Cerbos

```bash
cd /path/to/SportsManager-pre-typescript
docker-compose -f docker-compose.cerbos.yml up -d

# Verify Cerbos is running
curl http://localhost:3592/_cerbos/health

# Should return: {"status":"SERVING"}
```

#### Step 2: Start Backend

```bash
cd backend
npm run dev

# Should see: "Server running on port 3000"
# Should NOT see Cerbos connection errors
```

#### Step 3: Get a Valid JWT Token

You need a real user account and valid JWT. Options:

**A. Use existing admin account:**
```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_admin_password"
  }'

# Copy the token from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**B. Create a test user:**
```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testassignor@test.com",
    "password": "Test123!",
    "name": "Test Assignor",
    "role": "assignor"
  }'
```

#### Step 4: Test Routes

```bash
# Test 1: List games (should work for assignors in their regions)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/games

# Expected: 200 OK with games list

# Test 2: View specific game
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/games/GAME_ID

# Expected: 200 OK if allowed, 403 if not

# Test 3: Create game
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "homeTeam": {
      "organization": "Test Org",
      "ageGroup": "U16",
      "gender": "Boys",
      "rank": 1
    },
    "awayTeam": {
      "organization": "Test Org 2",
      "ageGroup": "U16",
      "gender": "Boys",
      "rank": 2
    },
    "date": "2025-10-01",
    "time": "19:00",
    "location": "Test Field",
    "postalCode": "12345",
    "level": "varsity",
    "gameType": "regular",
    "division": "D1",
    "season": "Fall 2025",
    "payRate": 50,
    "refsNeeded": 3,
    "wageMultiplier": 1
  }' \
  http://localhost:3000/api/games

# Expected: 201 Created if assignor, 403 if referee/guest

# Test 4: Update game
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "New Field"}' \
  http://localhost:3000/api/games/GAME_ID

# Expected: 200 OK if you own the game, 403 if not

# Test 5: Delete game
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/games/GAME_ID

# Expected: 200 OK if you own scheduled game, 403 otherwise
# Error message: "You do not have permission to delete this game"
```

---

### ✅ Option 4: Simulated Test (No Real Requests)

Run a simulation that shows what would happen:

```bash
node backend/test-games-migration.js
```

This shows the migration summary without actually making requests.

---

## Testing Scenarios

### Scenario 1: Assignor in Region North

**Setup:**
- User: assignor@test.com
- Role: Assignor
- Organization: org-sports-league
- Regions: [region-north]

**Expected Behavior:**

| Action | Game Location | Game Creator | Result |
|--------|--------------|--------------|--------|
| List games | Any | Any | ✅ Shows games in region-north only |
| View game | region-north | Any | ✅ Allowed |
| View game | region-south | Any | ❌ 403 Forbidden |
| Create game | region-north | N/A | ✅ Allowed |
| Create game | region-south | N/A | ❌ 403 Forbidden |
| Update game | region-north | Self | ✅ Allowed (if scheduled) |
| Update game | region-north | Other | ❌ 403 Forbidden |
| Update game | region-north | Self | ❌ 403 (if in_progress) |
| Delete game | region-north | Self | ✅ Allowed (if scheduled) |
| Delete game | region-north | Other | ❌ 403 Forbidden |
| Delete game | region-north | Self | ❌ 403 (if in_progress) |

### Scenario 2: Referee in Region North

**Setup:**
- User: referee@test.com
- Role: Referee
- Organization: org-sports-league
- Regions: [region-north]

**Expected Behavior:**

| Action | Game Location | Assigned | Result |
|--------|--------------|----------|--------|
| List games | Any | Any | ✅ Shows games in region-north only |
| View game | region-north | No | ✅ Allowed |
| View game | region-south | No | ❌ 403 Forbidden |
| View game | region-south | Yes | ✅ Allowed (assigned games) |
| Create game | Any | N/A | ❌ 403 Forbidden |
| Update game | Any | Any | ❌ 403 Forbidden |
| Delete game | Any | Any | ❌ 403 Forbidden |

### Scenario 3: Admin in Organization

**Setup:**
- User: admin@test.com
- Role: Admin
- Organization: org-sports-league
- Regions: All

**Expected Behavior:**

| Action | Result |
|--------|--------|
| List games | ✅ Shows ALL games in organization |
| View any game | ✅ Allowed |
| Create game | ✅ Allowed |
| Update any game | ✅ Allowed |
| Delete any game | ✅ Allowed |

### Scenario 4: Cross-Organization Access

**Setup:**
- User: assignor@test.com
- User Org: org-sports-league
- Game Org: org-different

**Expected Behavior:**

| Action | Result |
|--------|--------|
| View game | ❌ 403 Forbidden |
| Update game | ❌ 403 Forbidden |
| Delete game | ❌ 403 Forbidden |

---

## Debugging Failed Tests

### Issue: 403 Forbidden (Unexpected)

**Check:**
1. Is Cerbos running? `curl http://localhost:3592/_cerbos/health`
2. Are policies loaded? Check Cerbos logs: `docker logs sportsmanager-cerbos`
3. Is user's organization set? Check JWT token claims
4. Is user's region set? Check JWT token claims
5. Does game exist? Check database

**Common Causes:**
- User has no `organizationId` in JWT
- User has no `regionIds` in JWT
- Game is in different organization
- Game is in different region
- Game status prevents action (in_progress can't be updated)

### Issue: 401 Unauthorized

**Check:**
1. Is JWT token valid? Decode at jwt.io
2. Is token not expired?
3. Is `authenticateToken` middleware running?

### Issue: 500 Internal Server Error

**Check:**
1. Is Cerbos reachable? `curl http://localhost:3592/_cerbos/health`
2. Check backend logs for errors
3. Check Cerbos logs: `docker logs sportsmanager-cerbos`
4. Does game exist in database?

**Common Causes:**
- Cerbos not running
- Database query failed (game not found)
- Cerbos policy validation error

---

## Verification Checklist

Before considering testing complete:

- [ ] Cerbos starts successfully
- [ ] Cerbos health check passes
- [ ] Backend starts without Cerbos errors
- [ ] Policy tests pass (24/24 tests)
- [ ] Unit tests pass (62/62 tests)
- [ ] Can get valid JWT token
- [ ] Admin can access all games
- [ ] Assignor can list games in their region
- [ ] Assignor can create games
- [ ] Assignor can update own scheduled games
- [ ] Assignor CANNOT update others' games
- [ ] Assignor CANNOT update in-progress games
- [ ] Assignor can delete own scheduled games
- [ ] Assignor CANNOT delete others' games
- [ ] Assignor CANNOT delete in-progress games
- [ ] Referee can view games in region
- [ ] Referee CANNOT create games
- [ ] Referee CANNOT update games
- [ ] Referee CANNOT delete games
- [ ] Cross-org access is blocked
- [ ] Cross-region access is blocked (for assignors)
- [ ] Error messages are clear

---

## Automated Testing Script

Create this file: `backend/test-cerbos-integration.sh`

```bash
#!/bin/bash

echo "🧪 Testing Cerbos Integration"
echo "=============================="
echo ""

# Check if Cerbos is running
echo "1. Checking Cerbos health..."
if curl -s http://localhost:3592/_cerbos/health | grep -q "SERVING"; then
  echo "   ✅ Cerbos is running"
else
  echo "   ❌ Cerbos is not running"
  echo "   Run: docker-compose -f docker-compose.cerbos.yml up -d"
  exit 1
fi

# Test policies
echo ""
echo "2. Testing Cerbos policies..."
docker run --rm \
  -v $(pwd)/cerbos-policies:/policies:ro \
  ghcr.io/cerbos/cerbos:latest \
  compile --tests=/policies/tests /policies

if [ $? -eq 0 ]; then
  echo "   ✅ All policy tests passed"
else
  echo "   ❌ Policy tests failed"
  exit 1
fi

# Test middleware
echo ""
echo "3. Testing middleware..."
npm test -- requireCerbosPermission.test.ts --silent

if [ $? -eq 0 ]; then
  echo "   ✅ Middleware tests passed"
else
  echo "   ❌ Middleware tests failed"
  exit 1
fi

echo ""
echo "✅ All automated tests passed!"
echo ""
echo "Next: Manual testing with real requests"
echo "See TESTING_GUIDE.md for manual testing steps"
```

Make it executable:
```bash
chmod +x backend/test-cerbos-integration.sh
./backend/test-cerbos-integration.sh
```

---

## Continuous Integration

For CI/CD pipelines:

```yaml
# .github/workflows/test.yml
name: Test Cerbos Integration

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      cerbos:
        image: ghcr.io/cerbos/cerbos:latest
        ports:
          - 3592:3592
        volumes:
          - ./cerbos-policies:/policies:ro
        options: --health-cmd="wget --spider http://localhost:3592/_cerbos/health"

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd backend && npm install

      - name: Test Cerbos policies
        run: |
          docker run --rm \
            -v $(pwd)/cerbos-policies:/policies:ro \
            ghcr.io/cerbos/cerbos:latest \
            compile --tests=/policies/tests /policies

      - name: Test middleware
        run: cd backend && npm test

      - name: Test integration
        run: cd backend && npm test -- auth-flow-integration.test.ts
```

---

## Summary

**Easiest to Hardest:**

1. ✅ **Policy tests** - No setup, tests just the policies
2. ✅ **Unit tests** - No Cerbos/DB, tests middleware logic
3. ⚠️ **Integration tests** - Requires mocked services
4. ⚠️ **Manual tests** - Requires full stack running

**Recommendation:**
Start with #1 and #2, then move to manual testing when ready to verify the full flow.