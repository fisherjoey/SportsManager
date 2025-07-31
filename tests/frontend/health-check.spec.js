const { test, expect } = require('@playwright/test');

test.describe('Frontend Health Check', () => {
  let consoleErrors = [];
  let consoleWarnings = [];

  test.beforeEach(async ({ page }) => {
    // Reset error/warning arrays
    consoleErrors = [];
    consoleWarnings = [];

    // Listen for console messages
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', (error) => {
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    });
  });

  test('Homepage loads without console errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    // Check that no critical console errors occurred
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('sourcemap')
    );
    
    if (criticalErrors.length > 0) {
      console.log('🚨 Console errors found:', criticalErrors);
    }
    
    // Expect no critical errors
    expect(criticalErrors.length).toBe(0);
    
    // Check that the page title is set
    await expect(page).toHaveTitle(/Sports Management/i);
  });

  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/login-page.png' });
    
    // Check for essential login elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')).toBeVisible();
    
    // Check for console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('sourcemap')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Budget page loads (if accessible)', async ({ page }) => {
    await page.goto('/budget');
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/budget-page.png' });
    
    // Either should show budget content or redirect to login
    const isLoginPage = await page.locator('input[type="email"], input[name="email"]').isVisible();
    const isBudgetPage = await page.locator('[data-testid="budget"], .budget, h1:has-text("Budget")').isVisible();
    
    expect(isLoginPage || isBudgetPage).toBe(true);
    
    // Check for console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('sourcemap')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Game management page loads (if accessible)', async ({ page }) => {
    await page.goto('/games');
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/games-page.png' });
    
    // Either should show games content or redirect to login
    const isLoginPage = await page.locator('input[type="email"], input[name="email"]').isVisible();
    const isGamesPage = await page.locator('[data-testid="games"], .games, h1:has-text("Game")').isVisible();
    
    expect(isLoginPage || isGamesPage).toBe(true);
    
    // Check for console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('sourcemap')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Network requests complete successfully', async ({ page }) => {
    const failedRequests = [];
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected 404s (favicon, etc.)
    const criticalFailures = failedRequests.filter(req => 
      !req.url.includes('favicon') && 
      !req.url.includes('manifest') &&
      req.status !== 404
    );
    
    if (criticalFailures.length > 0) {
      console.log('🚨 Failed network requests:', criticalFailures);
    }
    
    expect(criticalFailures.length).toBe(0);
  });

  test.afterEach(async () => {
    // Report summary
    if (consoleErrors.length > 0) {
      console.log(`❌ Found ${consoleErrors.length} console errors`);
    }
    if (consoleWarnings.length > 0) {
      console.log(`⚠️  Found ${consoleWarnings.length} console warnings`);
    }
  });
});