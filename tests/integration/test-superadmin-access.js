const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🚀 Starting Super Admin access test...');
  
  try {
    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-screenshots/01-login-page.png' });
    
    // Fill in login form
    console.log('🔐 Logging in as zfisher9@gmail.com...');
    await page.fill('input[type="email"]', 'zfisher9@gmail.com');
    await page.fill('input[type="password"]', 'password'); // Replace with actual password
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    console.log('⏳ Waiting for dashboard to load...');
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-screenshots/02-dashboard.png' });
    
    // Check if sidebar is visible
    console.log('🔍 Checking sidebar visibility...');
    const sidebarVisible = await page.isVisible('[data-sidebar]');
    console.log(`   Sidebar visible: ${sidebarVisible}`);
    
    // Try to navigate to different admin pages
    const pagesToTest = [
      { name: 'Roles', url: '/?view=admin-roles' },
      { name: 'Permissions', url: '/?view=admin-permissions' },
      { name: 'Users', url: '/?view=admin-users' },
      { name: 'Games', url: '/?view=games' },
      { name: 'Resources', url: '/?view=resources' }
    ];
    
    for (const testPage of pagesToTest) {
      console.log(`\n📄 Testing navigation to ${testPage.name}...`);
      
      // Navigate to the page
      await page.goto(`http://localhost:3000${testPage.url}`);
      await page.waitForLoadState('networkidle');
      
      // Check for access denied message
      const accessDenied = await page.locator('text="Access Denied"').isVisible();
      if (accessDenied) {
        console.log(`   ❌ ACCESS DENIED for ${testPage.name}`);
        await page.screenshot({ path: `test-screenshots/denied-${testPage.name.toLowerCase()}.png` });
      } else {
        console.log(`   ✅ Successfully accessed ${testPage.name}`);
        await page.screenshot({ path: `test-screenshots/success-${testPage.name.toLowerCase()}.png` });
        
        // Check page title to confirm we're on the right page
        const pageTitle = await page.textContent('h1');
        console.log(`   Page title: ${pageTitle}`);
      }
      
      // Small delay between navigations
      await page.waitForTimeout(1000);
    }
    
    // Check user info in console
    console.log('\n🔍 Checking user authentication state...');
    const userInfo = await page.evaluate(() => {
      const authData = localStorage.getItem('auth_token');
      if (authData) {
        try {
          // Decode JWT token (basic decode, not verification)
          const parts = authData.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            return {
              hasToken: true,
              userId: payload.userId,
              email: payload.email,
              role: payload.role,
              roles: payload.roles,
              permissions: payload.permissions
            };
          }
        } catch (e) {
          return { hasToken: true, error: 'Failed to decode token' };
        }
      }
      return { hasToken: false };
    });
    
    console.log('User authentication info:');
    console.log(JSON.stringify(userInfo, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-screenshots/error-state.png' });
  }
  
  console.log('\n🏁 Test completed. Browser will remain open for manual inspection.');
  console.log('Press Ctrl+C to close the browser and exit.');
  
  // Keep browser open for manual inspection
  await new Promise(() => {});
})();