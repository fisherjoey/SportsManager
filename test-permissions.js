const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    console.log('2. Logging in as admin...');
    await page.fill('input[type="email"]', 'admin@cmba.ca');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    console.log('3. Waiting for dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    console.log('4. Navigating to Role Management...');
    await page.goto('http://localhost:3000/dashboard/admin/roles');
    await page.waitForTimeout(2000);
    
    console.log('5. Finding Admin role card...');
    // Click on Manage Permissions for Admin role
    const adminCard = await page.locator('text=Admin').first().locator('..').locator('..');
    await adminCard.locator('button:has-text("Manage Permissions")').click();
    
    console.log('6. Waiting for permissions dialog...');
    await page.waitForTimeout(2000);
    
    // Check what's in the dialog
    const dialogContent = await page.locator('[role="dialog"]').textContent();
    console.log('Dialog content:', dialogContent);
    
    // Check for any error messages in console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
    
    // Check network requests
    page.on('response', response => {
      if (response.url().includes('/api/admin/permissions')) {
        console.log('Permissions API response:', response.status(), response.url());
        response.json().then(data => {
          console.log('Permissions data structure:', JSON.stringify(data, null, 2).substring(0, 500));
        }).catch(() => {});
      }
    });
    
    // Try to interact with permissions
    console.log('7. Looking for permission checkboxes...');
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log('Found checkboxes:', checkboxes);
    
    // Check if there are any loading indicators
    const loading = await page.locator('.animate-spin').count();
    console.log('Loading indicators:', loading);
    
    // Take a screenshot
    await page.screenshot({ path: 'permissions-dialog.png', fullPage: false });
    console.log('Screenshot saved as permissions-dialog.png');
    
    console.log('8. Closing dialog...');
    await page.locator('button:has-text("Cancel")').click();
    
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();