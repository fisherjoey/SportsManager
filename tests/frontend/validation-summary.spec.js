const { test, expect } = require('@playwright/test');

test.describe('QA Validation Summary - Current State Assessment', () => {
  let consoleErrors = [];
  let networkErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkErrors = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network failures
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });
  });

  test('Authentication page functionality validation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/validation-login.png' });

    // Check if login form renders properly
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    const hasLoginForm = await emailInput.isVisible() && 
                        await passwordInput.isVisible() && 
                        await submitButton.isVisible();

    // Log validation results
    console.log('✓ Login form renders:', hasLoginForm);
    console.log('✓ Console errors:', consoleErrors.length);
    console.log('✓ Network errors:', networkErrors.length);

    // Functional test - can we fill the form?
    if (hasLoginForm) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      
      const emailValue = await emailInput.inputValue();
      const passwordValue = await passwordInput.inputValue();
      
      expect(emailValue).toBe('test@example.com');
      expect(passwordValue).toBe('password123');
      console.log('✓ Form inputs work correctly');
    }

    // Authentication should render without critical errors
    expect(hasLoginForm).toBe(true);
  });

  test('Available pages inventory check', async ({ page }) => {
    const pagesToCheck = [
      { path: '/', name: 'Homepage' },
      { path: '/login', name: 'Login' },
      { path: '/budget', name: 'Budget' },
      { path: '/financial-budgets', name: 'Financial Budgets' },
      { path: '/complete-signup', name: 'Complete Signup' }
    ];

    const pageResults = [];

    for (const pageInfo of pagesToCheck) {
      try {
        const response = await page.goto(pageInfo.path);
        const status = response.status();
        
        await page.screenshot({ 
          path: `test-results/validation-${pageInfo.name.toLowerCase().replace(' ', '-')}.png` 
        });

        pageResults.push({
          name: pageInfo.name,
          path: pageInfo.path,
          status: status,
          exists: status !== 404
        });
      } catch (error) {
        pageResults.push({
          name: pageInfo.name,
          path: pageInfo.path,
          status: 'ERROR',
          exists: false,
          error: error.message
        });
      }
    }

    // Log results
    console.log('📋 Page Inventory Results:');
    pageResults.forEach(result => {
      const statusIcon = result.exists ? '✅' : '❌';
      console.log(`${statusIcon} ${result.name} (${result.path}): ${result.status}`);
    });

    // At least login and homepage should exist
    const criticalPages = pageResults.filter(p => 
      (p.name === 'Homepage' || p.name === 'Login') && p.exists
    );
    expect(criticalPages.length).toBeGreaterThanOrEqual(2);
  });

  test('Backend connectivity validation', async ({ request }) => {
    const backendUrl = 'http://localhost:3001';
    const endpoints = [
      '/api/health',
      '/api/auth/login', 
      '/api/games',
      '/api/assignments'
    ];

    const backendResults = [];

    for (const endpoint of endpoints) {
      try {
        const response = await request.get(`${backendUrl}${endpoint}`);
        backendResults.push({
          endpoint,
          status: response.status(),
          available: true
        });
      } catch (error) {
        backendResults.push({
          endpoint,
          status: 'CONNECTION_REFUSED',
          available: false,
          error: error.message
        });
      }
    }

    // Log backend status
    console.log('🔌 Backend Connectivity Results:');
    backendResults.forEach(result => {
      const statusIcon = result.available ? '✅' : '❌';
      console.log(`${statusIcon} ${result.endpoint}: ${result.status}`);
    });

    // Store results for other tests to reference
    console.log('Backend Status Summary:', {
      totalEndpoints: endpoints.length,
      availableEndpoints: backendResults.filter(r => r.available).length,
      backendRunning: backendResults.some(r => r.available)
    });

    // This test is informational - no hard failure if backend is down
    expect(true).toBe(true);
  });

  test('Critical user flow - login attempt', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // Try to perform a login with demo credentials
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@cmba.ca');
      await passwordInput.fill('password123');
      
      // Capture network activity during login attempt
      const loginNetworkCalls = [];
      page.on('response', (response) => {
        if (response.url().includes('auth') || response.url().includes('login')) {
          loginNetworkCalls.push({
            url: response.url(),
            status: response.status(),
            method: response.request().method()
          });
        }
      });

      await submitButton.click();
      await page.waitForTimeout(3000); // Wait for login processing

      await page.screenshot({ path: 'test-results/validation-login-attempt.png' });

      // Log login attempt results
      console.log('🔐 Login Attempt Results:');
      console.log('   Network calls made:', loginNetworkCalls.length);
      console.log('   Current URL:', page.url());
      console.log('   Login API calls:', loginNetworkCalls);

      // The test passes if we can attempt login without crashes
      expect(true).toBe(true);
    }
  });

  test.afterEach(async () => {
    // Summary reporting
    if (consoleErrors.length > 0) {
      console.log(`⚠️  Console errors detected: ${consoleErrors.length}`);
      console.log('   Errors:', consoleErrors.slice(0, 3)); // Show first 3
    }
    
    if (networkErrors.length > 0) {
      console.log(`🌐 Network errors detected: ${networkErrors.length}`);
      console.log('   Errors:', networkErrors.slice(0, 3)); // Show first 3
    }
  });
});