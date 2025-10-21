# Critical User Flows - Test Guide

**Date**: October 20, 2025
**Purpose**: Manual testing guide for critical user flows with Cerbos authorization
**Test Duration**: ~1 hour
**Part of**: Phase 1: Foundation - Quick Wins (Task 5/5)

---

## Test Accounts Verified ✅

All test accounts exist in database with correct role assignments:

| Email | Password | Role | Status |
|-------|----------|------|--------|
| admin@sportsmanager.com | `admin123` | Super Admin | ✅ Active |
| admin@cmba.ca | `admin123` | Admin | ✅ Active |
| assignor@cmba.ca | `admin123` | Assignment Manager | ✅ Active |
| coordinator@cmba.ca | `admin123` | Referee Coordinator | ✅ Active |
| senior.ref@cmba.ca | `referee123` | Senior Referee | ✅ Active |
| referee@test.com | `referee123` | Junior Referee | ✅ Active |

**Database Verification**: Completed October 20, 2025
**Query Result**: 6/6 users found with correct roles

---

## Prerequisites

### 1. Services Running
```bash
npm run dev
```

Verify all services are running:
- ✅ Frontend: http://localhost:3000
- ✅ Backend API: http://localhost:3001
- ✅ Cerbos: http://localhost:3592

### 2. Health Checks
```bash
# Backend API
curl http://localhost:3001/health

# Cerbos
curl http://localhost:3592/_cerbos/health
```

Expected: Both return `200 OK`

---

## Test Execution Order

Execute tests in this order to verify authorization works correctly:

1. **Test 1**: Super Admin Access (Full Access)
2. **Test 2**: Assignment Manager Access (Scoped Access)
3. **Test 3**: Junior Referee Access (Limited Access)
4. **Test 4**: Permission Edge Cases (Boundary Testing)

---

## Test 1: Super Admin User Flow

**User**: `admin@sportsmanager.com` / `admin123`
**Expected**: Full access to all features

### Steps

#### 1.1 Login
- [ ] Navigate to http://localhost:3000
- [ ] Enter email: `admin@sportsmanager.com`
- [ ] Enter password: `admin123`
- [ ] Click "Login"
- **Expected**: Successful login, redirect to dashboard

**Verify**:
- ✅ No 401 Unauthorized errors
- ✅ User name appears in header ("Super Admin")
- ✅ Dashboard loads with all widgets

#### 1.2 Access Admin Roles Page
- [ ] Navigate to `/admin/roles`
- **Expected**: Page loads successfully

**Verify**:
- ✅ Can view all roles
- ✅ Can create new role button visible
- ✅ No 403 Forbidden errors

#### 1.3 Create New Role
- [ ] Click "Create Role" button
- [ ] Fill in role details:
  - Name: `test_role_admin`
  - Description: `Test role for admin verification`
- [ ] Click "Save"
- **Expected**: Role created successfully

**Verify**:
- ✅ Success message appears
- ✅ New role appears in roles list
- ✅ No authorization errors

#### 1.4 Assign Permissions to Role
- [ ] Click on newly created `test_role_admin`
- [ ] Click "Edit Permissions"
- [ ] Add permissions (if UI allows, or note that Cerbos banner appears)
- **Expected**: Either can assign OR Cerbos banner explains YAML-based permissions

**Verify**:
- ✅ If Cerbos banner: Message explains permissions are in YAML files
- ✅ If permission UI: Can view permission structure
- ✅ No runtime errors

#### 1.5 Cleanup
- [ ] Delete `test_role_admin` if created
- **Expected**: Role deleted successfully

**Test 1 Result**: ⬜ PASS / ⬜ FAIL

---

## Test 2: Assignment Manager User Flow

**User**: `assignor@cmba.ca` / `admin123`
**Expected**: Can create games and assignments, CANNOT access admin features

### Steps

#### 2.1 Login
- [ ] Logout current user
- [ ] Login with `assignor@cmba.ca` / `admin123`
- **Expected**: Successful login

**Verify**:
- ✅ User name appears ("Assignment Manager")
- ✅ Dashboard loads

#### 2.2 Access Games Page
- [ ] Navigate to `/games`
- **Expected**: Page loads successfully

**Verify**:
- ✅ Can view games list
- ✅ "Create Game" button is visible
- ✅ No 403 Forbidden errors

#### 2.3 Create Game Assignment
- [ ] Click on a game (or create one if needed)
- [ ] Click "Assign Referee"
- [ ] Select a referee from dropdown
- [ ] Select position
- [ ] Click "Save Assignment"
- **Expected**: Assignment created successfully

**Verify**:
- ✅ Success message appears
- ✅ Assignment appears in game details
- ✅ Referee receives assignment (visible in referee view)

#### 2.4 Attempt Admin Access (Should FAIL)
- [ ] Try to navigate to `/admin/roles`
- **Expected**: 403 Forbidden or redirect

**Verify**:
- ✅ Access denied (403 Forbidden)
- ✅ OR: Redirect to dashboard with error message
- ✅ User CANNOT view admin roles page

#### 2.5 Verify API Endpoint Protection
Open browser console and run:
```javascript
fetch('http://localhost:3001/api/admin/roles', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
```
- **Expected**: 403 Forbidden error

**Verify**:
- ✅ Response: `{ "error": "Forbidden", "message": "Insufficient permissions" }`
- ✅ OR: Similar 403 error message
- ✅ NOT: Success with roles data

**Test 2 Result**: ⬜ PASS / ⬜ FAIL

---

## Test 3: Junior Referee User Flow

**User**: `referee@test.com` / `referee123`
**Expected**: Can view assigned games, accept/decline assignments, CANNOT create games

### Steps

#### 3.1 Login
- [ ] Logout current user
- [ ] Login with `referee@test.com` / `referee123`
- **Expected**: Successful login

**Verify**:
- ✅ User name appears ("Junior Referee")
- ✅ Dashboard shows referee-specific widgets

#### 3.2 View Assigned Games
- [ ] Navigate to `/games` or `/my-assignments`
- **Expected**: Can see assigned games only

**Verify**:
- ✅ Games list loads
- ✅ Shows assignments for this referee
- ✅ No 403 errors

#### 3.3 Accept Assignment
- [ ] Find a pending assignment
- [ ] Click "Accept"
- **Expected**: Assignment status changes to "Accepted"

**Verify**:
- ✅ Success message appears
- ✅ Status updates to "Accepted"
- ✅ Assignment appears in "My Accepted Games" section

#### 3.4 Decline Assignment
- [ ] Find another pending assignment
- [ ] Click "Decline"
- [ ] (Optional) Enter decline reason
- **Expected**: Assignment status changes to "Declined"

**Verify**:
- ✅ Success message appears
- ✅ Status updates to "Declined"
- ✅ Assignment removed from pending list

#### 3.5 Attempt to Create Game (Should FAIL)
- [ ] Try to access "Create Game" button
- [ ] OR: Navigate directly to `/games/create`
- **Expected**: Button hidden OR 403 Forbidden

**Verify**:
- ✅ "Create Game" button is NOT visible
- ✅ OR: Attempting to create returns 403 error
- ✅ User CANNOT create games

#### 3.6 Attempt Admin Access (Should FAIL)
- [ ] Try to navigate to `/admin/roles`
- **Expected**: 403 Forbidden or redirect

**Verify**:
- ✅ Access denied
- ✅ User CANNOT access admin features

**Test 3 Result**: ⬜ PASS / ⬜ FAIL

---

## Test 4: Permission Edge Cases

**Purpose**: Test authorization boundary conditions

### Steps

#### 4.1 Accessing API Without Token
Open browser console (logged out):
```javascript
fetch('http://localhost:3001/api/games')
.then(r => r.json())
.then(console.log)
```
- **Expected**: 401 Unauthorized

**Verify**:
- ✅ Response: `{ "error": "Unauthorized" }` or similar
- ✅ Status: 401

#### 4.2 Accessing Protected Resource Directly
Login as Junior Referee, then in console:
```javascript
fetch('http://localhost:3001/api/admin/roles', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
```
- **Expected**: 403 Forbidden with permission details

**Verify**:
- ✅ Status: 403
- ✅ Response includes which permission was required
- ✅ Error message is clear: "Insufficient permissions"

#### 4.3 Invalid JWT Token
In browser console:
```javascript
fetch('http://localhost:3001/api/games', {
  headers: {
    'Authorization': 'Bearer invalid.token.here'
  }
})
.then(r => r.json())
.then(console.log)
```
- **Expected**: 401 Unauthorized

**Verify**:
- ✅ Status: 401
- ✅ Error message: "Invalid token" or similar

#### 4.4 User Without Role Tries Access
- [ ] Create a test user without any roles (optional, advanced)
- [ ] Try to access protected resources
- **Expected**: 403 Forbidden

**Verify**:
- ✅ User with no roles cannot access protected features
- ✅ Proper error handling

**Test 4 Result**: ⬜ PASS / ⬜ FAIL

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Super Admin Flow | ⬜ PASS / ⬜ FAIL | |
| Test 2: Assignment Manager Flow | ⬜ PASS / ⬜ FAIL | |
| Test 3: Junior Referee Flow | ⬜ PASS / ⬜ FAIL | |
| Test 4: Edge Cases | ⬜ PASS / ⬜ FAIL | |

**Overall Status**: ⬜ ALL PASSED / ⬜ SOME FAILED

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized on every request
**Cause**: JWT token expired or not set
**Solution**:
- Clear browser localStorage
- Login again
- Check token in localStorage: `console.log(localStorage.getItem('token'))`

### Issue 2: 403 Forbidden for Super Admin
**Cause**: Cerbos policies may not include Super Admin role
**Solution**:
- Check `cerbos-policies/resources/*.yaml`
- Verify Super Admin role is in allowed roles
- Restart Cerbos: `npm run start:cerbos`

### Issue 3: Cerbos not running
**Cause**: Docker not started or Cerbos container stopped
**Solution**:
```bash
npm run start:cerbos
# Wait 5-10 seconds for Cerbos to start
curl http://localhost:3592/_cerbos/health
```

### Issue 4: Database connection errors
**Cause**: PostgreSQL not running
**Solution**:
- Start PostgreSQL service
- Verify connection: `psql -U postgres -d sports_management`

---

## Automated Testing (Future)

This manual test guide should be converted to automated E2E tests in Phase 7:

```javascript
// Example: tests/e2e/critical-user-flows.test.js
describe('Critical User Flows', () => {
  describe('Super Admin', () => {
    it('should access admin roles page', async () => {
      await login('admin@sportsmanager.com', 'admin123');
      await navigate('/admin/roles');
      expect(page).toHaveURL('/admin/roles');
      expect(page).toContainText('Roles Management');
    });

    it('should create new role', async () => {
      // Test implementation
    });
  });

  describe('Assignment Manager', () => {
    it('should NOT access admin roles', async () => {
      await login('assignor@cmba.ca', 'admin123');
      const response = await fetch('/api/admin/roles');
      expect(response.status).toBe(403);
    });
  });

  // ... more tests
});
```

---

## Checklist Before Marking Complete

- [ ] All 6 test users verified in database
- [ ] All services running (Frontend, Backend, Cerbos)
- [ ] Test 1 (Super Admin) executed
- [ ] Test 2 (Assignment Manager) executed
- [ ] Test 3 (Junior Referee) executed
- [ ] Test 4 (Edge Cases) executed
- [ ] Any failures documented with screenshots
- [ ] Results summary completed

---

## Notes & Observations

*Document any issues, unexpected behavior, or observations during testing:*

```
[Add notes here during testing]
```

---

**Test Executed By**: _________________
**Date**: _________________
**Duration**: _________ minutes
**Final Result**: ⬜ PASS / ⬜ FAIL

---

**Next Steps**:
- If **PASS**: Mark Quick Win 5/5 complete, move to Phase 1 database work
- If **FAIL**: Document issues, create bug tickets, fix before proceeding

---

**Part of**: Phase 1: Foundation - Quick Wins (Task 5/5, 1h)
**Reference**: docs/audit-2025-10-18/implementation/PRIORITY_ACTION_CHECKLIST.md
