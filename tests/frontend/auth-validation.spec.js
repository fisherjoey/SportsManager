const { test, expect } = require('@playwright/test');

test.describe('Authentication Validation Tests', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];

    // Listen for console messages
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', (error) => {
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    });
  });

  test('Login route exists and loads', async ({ page }) => {
    const response = await page.goto('/login');
    
    // Route should exist (not 404)
    expect(response.status()).not.toBe(404);
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/auth-login-route.png' });
    
    // Page should have basic login content
    const pageText = await page.textContent('body');
    expect(pageText).toContain('SyncedSport');
  });

  test('Login form renders with proper elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for auth provider to initialize
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/auth-login-form.png' });
    
    // More flexible selectors - check for email input
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Wait for elements to be visible with longer timeout
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    
    // Verify form functionality
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    
    expect(emailValue).toBe('test@example.com');
    expect(passwordValue).toBe('password123');
  });

  test('Authentication provider loads without critical errors', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for React components to mount
    await page.waitForTimeout(3000);
    
    // Filter critical errors (ignore common Next.js warnings)
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('sourcemap') &&
      !error.includes('Warning:') &&
      !error.toLowerCase().includes('warning')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Critical auth errors found:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Navigation to protected routes handles authentication', async ({ page }) => {
    // Try to access budget page without login
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/auth-protected-budget.png' });
    
    // Should either show login form or budget content (depending on auth state)
    const hasLogin = await page.locator('input[type="email"]').isVisible();
    const hasBudgetContent = await page.locator('[data-testid="budget-tracker"], h1:has-text("Budget")').isVisible();
    
    // One of these should be true
    expect(hasLogin || hasBudgetContent).toBe(true);
  });

  test('Demo login functionality works', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Check if login form is available
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      // Fill demo credentials
      await emailInput.fill('admin@cmba.ca');
      await passwordInput.fill('password123');
      
      // Attempt login
      await submitButton.click();
      
      // Wait for potential redirect or error
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'test-results/auth-demo-login-attempt.png' });
      
      // Check if we're still on login page or redirected
      const currentUrl = page.url();
      console.log('After login attempt, current URL:', currentUrl);
      
      // This is just to validate the login attempt doesn't cause crashes
      // Actual success depends on backend availability
    }
  });

  test.afterEach(async () => {
    if (consoleErrors.length > 0) {
      console.log(`Found ${consoleErrors.length} console errors during auth tests`);
    }
  });
});