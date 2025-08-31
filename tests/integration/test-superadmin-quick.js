const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true, // Run in headless mode for speed
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🚀 Testing Super Admin access...\n');
  
  try {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Login
    console.log('🔐 Logging in as zfisher9@gmail.com...');
    await page.fill('input[type="email"]', 'zfisher9@gmail.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('http://localhost:3000/', { timeout: 5000 });
    console.log('✅ Login successful\n');
    
    // Get user info from localStorage
    const userInfo = await page.evaluate(() => {
      const authData = localStorage.getItem('auth_token');
      if (authData) {
        try {
          const parts = authData.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            return {
              email: payload.email,
              role: payload.role,
              roles: payload.roles || [],
              permissionCount: payload.permissions ? payload.permissions.length : 0
            };
          }
        } catch (e) {
          return { error: e.message };
        }
      }
      return null;
    });
    
    console.log('👤 User Info from JWT:');
    console.log(`   Email: ${userInfo.email}`);
    console.log(`   Legacy Role: ${userInfo.role}`);
    console.log(`   Roles Array: ${JSON.stringify(userInfo.roles)}`);
    console.log(`   Permissions: ${userInfo.permissionCount} permissions in token\n`);
    
    // Test navigation to admin pages
    const testResults = [];
    const pagesToTest = [
      { name: 'Admin Roles', view: 'admin-roles' },
      { name: 'Admin Permissions', view: 'admin-permissions' },
      { name: 'Admin Users', view: 'admin-users' },
      { name: 'Games', view: 'games' },
      { name: 'Resources', view: 'resources' },
      { name: 'Leagues', view: 'leagues' },
      { name: 'Communications', view: 'communications' }
    ];
    
    console.log('📄 Testing page access:\n');
    
    for (const testPage of pagesToTest) {
      await page.goto(`http://localhost:3000/?view=${testPage.view}`);
      await page.waitForLoadState('domcontentloaded');
      
      // Check for access denied
      const accessDenied = await page.locator('text="Access Denied"').count();
      const hasAccess = accessDenied === 0;
      
      if (hasAccess) {
        // Get the actual page title to confirm we're on the right page
        const pageTitle = await page.locator('h1').textContent().catch(() => 'No title found');
        console.log(`   ✅ ${testPage.name}: ACCESSIBLE (Title: ${pageTitle})`);
      } else {
        console.log(`   ❌ ${testPage.name}: ACCESS DENIED`);
      }
      
      testResults.push({ page: testPage.name, access: hasAccess });
    }
    
    // Summary
    console.log('\n📊 Summary:');
    const accessible = testResults.filter(r => r.access).length;
    const denied = testResults.filter(r => !r.access).length;
    console.log(`   Accessible: ${accessible}/${testResults.length}`);
    console.log(`   Denied: ${denied}/${testResults.length}`);
    
    if (denied > 0) {
      console.log('\n⚠️  Some pages are still inaccessible to Super Admin!');
      console.log('   This suggests the role checking logic may still have issues.');
    } else {
      console.log('\n✨ All tested pages are accessible to Super Admin!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed.');
  }
})();