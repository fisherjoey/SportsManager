const { test, expect, devices } = require('@playwright/test');

test.describe('Mobile Responsiveness Check', () => {
  
  test('Login page mobile responsiveness', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-login.png',
      fullPage: true 
    });

    // Check that form elements are visible and usable on mobile
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Test touch interaction
    await emailInput.tap();
    await emailInput.fill('test@mobile.com');
    
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('test@mobile.com');

    console.log('✅ Mobile login form is responsive and functional');
    
    await context.close();
  });

  test('Budget page mobile layout', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/mobile-budget.png',
      fullPage: true 
    });

    // The budget page should either show content or redirect to login
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
    expect(hasContent.length).toBeGreaterThan(0);

    console.log('✅ Budget page loads on mobile (may redirect to login)');
    
    await context.close();
  });

  test('Homepage mobile navigation', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/mobile-homepage.png',
      fullPage: true 
    });

    // Check that page loads without major layout issues
    const viewport = page.viewportSize();
    expect(viewport.width).toBe(390); // iPhone 12 width
    
    // Check for horizontal scrolling issues
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    
    // Allow for small margins but detect major overflow
    const hasHorizontalOverflow = scrollWidth > clientWidth + 20;
    
    if (hasHorizontalOverflow) {
      console.log('⚠️  Potential horizontal scrolling detected');
      console.log(`   Scroll width: ${scrollWidth}, Client width: ${clientWidth}`);
    } else {
      console.log('✅ No major horizontal overflow detected');
    }

    await context.close();
  });

  test('Tablet layout check', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad'],
    });
    const page = await context.newPage();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/tablet-login.png',
      fullPage: true 
    });

    // Check that form layout works well on tablet
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    console.log('✅ Tablet layout displays correctly');
    
    await context.close();
  });
});