# Phase 5: Testing Documentation
**Duration**: 20 minutes
**Goal**: Comprehensively test all fixes and verify the application works without errors

## Overview
This phase provides detailed testing procedures to verify that all fixes have been properly implemented and the application is functioning correctly without console errors.

---

## Test 5.1: Pre-Testing Checklist

### Verify Services Are Running

```bash
# Check backend is running
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# Check frontend is running
curl http://localhost:3002
# Expected: HTML response

# Check database connection
psql -U postgres -h localhost -d sportsmanager -c "SELECT COUNT(*) FROM users;"
# Expected: Number of users
```

### Clear Browser Cache
1. Open Chrome DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

## Test 5.2: API Endpoint Testing

### Create Test Script
**File**: `test-api-endpoints.js`

```javascript
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';
const TEST_TOKEN = 'YOUR_JWT_TOKEN'; // Get from login response

async function testEndpoints() {
  console.log('Testing API Endpoints\n=====================\n');

  const endpoints = [
    {
      name: 'Communications',
      url: '/communications?status=published&limit=10',
      method: 'GET'
    },
    {
      name: 'Users',
      url: '/users',
      method: 'GET'
    },
    {
      name: 'User Roles',
      url: '/users/roles',
      method: 'GET'
    },
    {
      name: 'Mentorships',
      url: '/mentorships/mentees/USER_ID',
      method: 'GET'
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);

      const response = await fetch(`${API_BASE}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const status = response.status;
      let data = null;
      let error = null;

      try {
        data = await response.json();
      } catch (e) {
        error = 'Invalid JSON response';
      }

      const result = {
        endpoint: endpoint.name,
        url: endpoint.url,
        status,
        success: status < 400,
        hasData: !!data,
        error
      };

      results.push(result);

      if (result.success) {
        console.log(`  ✅ ${endpoint.name}: ${status} - OK`);
      } else {
        console.log(`  ❌ ${endpoint.name}: ${status} - FAILED`);
      }

    } catch (error) {
      console.log(`  ❌ ${endpoint.name}: Network error - ${error.message}`);
      results.push({
        endpoint: endpoint.name,
        url: endpoint.url,
        status: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\nSummary\n=======');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\nFailed Endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.endpoint}: ${r.status} ${r.error || ''}`);
    });
  }

  return results;
}

// Run tests
testEndpoints().catch(console.error);
```

### Run API Tests

```bash
node test-api-endpoints.js
```

---

## Test 5.3: Frontend Console Testing

### Automated Page Testing Script
**File**: `test-all-pages.js`

```javascript
const puppeteer = require('puppeteer');

async function testAllPages() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  const page = await browser.newPage();
  const errors = {};

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const url = page.url();
      if (!errors[url]) errors[url] = [];
      errors[url].push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    const url = page.url();
    if (!errors[url]) errors[url] = [];
    errors[url].push(error.message);
  });

  // Test credentials
  const credentials = {
    email: 'admin@cmba.ca',
    password: 'password'
  };

  console.log('Starting Page Tests\n==================\n');

  try {
    // 1. Login
    console.log('1. Testing Login...');
    await page.goto('http://localhost:3002/login', {
      waitUntil: 'networkidle0'
    });
    await page.type('input[type="email"]', credentials.email);
    await page.type('input[type="password"]', credentials.password);
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);
    console.log('   ✅ Login successful\n');

    // 2. Test each page
    const pages = [
      { name: 'Dashboard', url: '/?view=dashboard' },
      { name: 'Games', url: '/?view=games' },
      { name: 'Referees', url: '/?view=referees' },
      { name: 'Assignors', url: '/?view=assignors' },
      { name: 'Mentorships', url: '/?view=mentorships' },
      { name: 'My Mentees', url: '/?view=my-mentees' },
      { name: 'Settings', url: '/?view=settings' },
      { name: 'Analytics', url: '/?view=analytics' },
      { name: 'Reporting', url: '/?view=reporting' },
      { name: 'Audit Logs', url: '/?view=audit-logs' }
    ];

    for (let i = 0; i < pages.length; i++) {
      const testPage = pages[i];
      console.log(`${i + 2}. Testing ${testPage.name}...`);

      await page.goto(`http://localhost:3002${testPage.url}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for any async operations
      await page.waitForTimeout(2000);

      const pageErrors = errors[page.url()] || [];
      if (pageErrors.length === 0) {
        console.log(`   ✅ No errors\n`);
      } else {
        console.log(`   ❌ ${pageErrors.length} errors found\n`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }

  // Generate report
  console.log('\n\nTest Report\n===========');

  const totalErrors = Object.values(errors).flat().length;
  const pagesWithErrors = Object.keys(errors).length;

  if (totalErrors === 0) {
    console.log('✅ All pages passed - No console errors!');
  } else {
    console.log(`❌ Found ${totalErrors} errors across ${pagesWithErrors} pages\n`);

    for (const [url, pageErrors] of Object.entries(errors)) {
      console.log(`\n${url}:`);
      pageErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
  }

  await browser.close();
}

testAllPages().catch(console.error);
```

### Run Frontend Tests

```bash
node test-all-pages.js
```

---

## Test 5.4: Database Verification

### Check Role Structure

```sql
-- Connect to database
psql -U postgres -h localhost -d sportsmanager

-- 1. Verify referee roles exist
SELECT name, description
FROM roles
WHERE name LIKE '%Referee%'
ORDER BY name;
-- Expected: 6 referee roles

-- 2. Check users have referee roles
SELECT u.email, r.name as role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'Referee'
LIMIT 5;
-- Expected: Users with Referee role

-- 3. Verify no queries to user_referee_roles
-- Check backend logs for any errors mentioning user_referee_roles
-- Expected: No such errors

-- 4. Check permissions are assigned
SELECT r.name as role_name, COUNT(p.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.name LIKE '%Referee%'
GROUP BY r.name
ORDER BY r.name;
-- Expected: Each role has appropriate permissions
```

---

## Test 5.5: Manual UI Testing

### Test Checklist

#### Dashboard Page
- [ ] Page loads without errors
- [ ] Communications/announcements section shows (even if empty)
- [ ] No 500 errors in network tab
- [ ] Navigation menu works

#### Referees Page
- [ ] Page loads without errors
- [ ] Referee list displays (or shows empty state)
- [ ] Referee badges show correct levels
- [ ] No undefined errors in console

#### Games Page
- [ ] Page loads without errors
- [ ] MenteeSelector doesn't crash
- [ ] Shows "No mentees" message if applicable
- [ ] Game list displays properly

#### Settings Page
- [ ] User profile shows roles correctly
- [ ] Referee level displays if applicable
- [ ] Can update settings without errors

---

## Test 5.6: Performance Testing

### Check Database Connections

```bash
# Check connection count
psql -U postgres -h localhost -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'sportsmanager';"

# Should be reasonable (< 20)
# If too high, indicates connection leak
```

### Check Memory Usage

```bash
# Check Node process memory
tasklist | findstr node

# Should be under 500MB for each process
```

---

## Test 5.7: Error Recovery Testing

### Test Error Handling

1. **Stop backend temporarily**
   ```bash
   # Kill backend process
   taskkill /F /PID [backend_pid]
   ```

2. **Try to navigate frontend pages**
   - Should show error messages, not crash
   - Should have retry buttons where applicable

3. **Restart backend**
   ```bash
   cd backend && npm run dev
   ```

4. **Verify recovery**
   - Retry buttons should work
   - Pages should load normally again

---

## Test 5.8: Integration Testing

### Full User Flow Test

1. **Login as admin**
   - Email: admin@cmba.ca
   - Password: password

2. **Navigate all pages**
   - Each page should load
   - No console errors

3. **Test referee functionality**
   - View referee list
   - Check referee levels display
   - Verify role badges

4. **Test data operations**
   - Try to create/edit if applicable
   - Verify error messages are user-friendly

---

## Expected Test Results

### All Tests Passing
✅ All API endpoints return valid JSON
✅ No 500 errors from any endpoint
✅ All pages load without console errors
✅ Referee roles properly displayed
✅ Error states handled gracefully
✅ Database connections stable
✅ Memory usage normal

### Acceptable Issues
⚠️ Empty data arrays (expected if no data)
⚠️ 404 for missing resources
⚠️ Deprecation warnings
⚠️ Non-critical console.log statements

### Unacceptable Issues
❌ 500 Internal Server errors
❌ Undefined/null reference errors
❌ Page crashes or white screens
❌ Database connection errors
❌ Memory leaks

---

## Test Report Template

```markdown
## Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: Development

### Summary
- Total Tests: X
- Passed: X
- Failed: X
- Skipped: X

### API Tests
| Endpoint | Status | Result |
|----------|--------|--------|
| Communications | 200 | ✅ Pass |
| Users | 200 | ✅ Pass |
| ... | ... | ... |

### Page Tests
| Page | Console Errors | Result |
|------|---------------|--------|
| Dashboard | 0 | ✅ Pass |
| Referees | 0 | ✅ Pass |
| ... | ... | ... |

### Database Tests
- [x] Referee roles created
- [x] Permissions assigned
- [x] User roles migrated
- [x] No user_referee_roles queries

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
- [Recommendation]
- [Recommendation]
```

---

## Troubleshooting Common Issues

### If tests fail:

1. **Check server logs**
   ```bash
   # Backend logs - look for errors
   # Frontend console - check for failed requests
   ```

2. **Verify database state**
   ```sql
   -- Check if migrations ran
   SELECT * FROM migrations ORDER BY run_on DESC LIMIT 5;
   ```

3. **Clear and retry**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check environment variables**
   ```bash
   # Ensure .env files are correct
   cat backend/.env
   cat frontend/.env
   ```

---

## Sign-off Criteria

Before marking implementation as complete:

- [ ] All API endpoints return 200 or appropriate status
- [ ] Zero console errors on all pages
- [ ] Referee role architecture working
- [ ] Database properly migrated
- [ ] All services using shared connections
- [ ] Error handling implemented throughout
- [ ] UI displays roles correctly
- [ ] Performance acceptable (< 2s page loads)
- [ ] Memory usage stable
- [ ] Test report completed and reviewed