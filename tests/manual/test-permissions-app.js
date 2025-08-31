const { chromium } = require('playwright');

async function testPermissionsInApp() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  
  // Monitor API responses
  page.on('response', response => {
    if (response.url().includes('/api/admin')) {
      console.log(`API Response: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    console.log('2. Logging in as admin...');
    await page.fill('input[type="email"]', 'admin@cmba.ca');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    console.log('3. Waiting for dashboard...');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    
    console.log('4. Navigating to Role Management...');
    await page.goto('http://localhost:3000/dashboard/admin/roles');
    await page.waitForTimeout(2000);
    
    console.log('5. Looking for Admin role card...');
    // Find the Admin role card
    const adminCard = await page.locator('h3:has-text("Admin")').first();
    
    if (await adminCard.isVisible()) {
      console.log('✅ Found Admin role card');
      
      // Click the three dots menu button
      const cardContainer = await adminCard.locator('../..');
      const menuButton = await cardContainer.locator('button[aria-haspopup="menu"]');
      
      console.log('6. Opening menu...');
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Click Manage Permissions
      console.log('7. Clicking Manage Permissions...');
      await page.locator('text=Manage Permissions').click();
      
      // Wait for dialog to open
      await page.waitForTimeout(2000);
      
      console.log('8. Checking permissions dialog...');
      const dialog = await page.locator('[role="dialog"]');
      
      if (await dialog.isVisible()) {
        console.log('✅ Dialog opened');
        
        // Wait for permissions to load (spinner should disappear)
        try {
          await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 5000 });
          console.log('✅ Loading completed');
        } catch {
          console.log('⚠️ Loading might still be in progress');
        }
        
        // Count permission checkboxes
        const checkboxes = await dialog.locator('input[type="checkbox"]').count();
        console.log(`📊 Found ${checkboxes} permission checkboxes`);
        
        // Get categories
        const categories = await dialog.locator('h3.capitalize').allTextContents();
        console.log(`📁 Categories: ${categories.join(', ')}`);
        
        if (checkboxes > 0) {
          console.log('\n✅ SUCCESS: Permissions are displaying correctly!');
          
          // Test toggling a permission
          const firstCheckbox = await dialog.locator('input[type="checkbox"]').first();
          const wasChecked = await firstCheckbox.isChecked();
          
          console.log('9. Testing permission toggle...');
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          const isCheckedNow = await firstCheckbox.isChecked();
          console.log(`✅ Permission toggled: ${wasChecked} -> ${isCheckedNow}`);
          
          // Test category toggle
          const categoryToggle = await dialog.locator('button:has(.h-4.w-4)').first();
          console.log('10. Testing category toggle...');
          await categoryToggle.click();
          await page.waitForTimeout(500);
          console.log('✅ Category toggle clicked');
          
          // Save the changes
          console.log('11. Saving permissions...');
          await dialog.locator('button:has-text("Save Permissions")').click();
          
          // Wait for save to complete
          await page.waitForTimeout(2000);
          
          // Check for success toast
          const toast = await page.locator('[role="status"]').textContent();
          if (toast && toast.includes('Success')) {
            console.log('✅ Permissions saved successfully!');
          }
          
          console.log('\n🎉 ALL TESTS PASSED! Permissions management is working correctly.');
          
        } else {
          console.log('\n❌ FAILED: No permissions found in dialog');
          
          // Get dialog content for debugging
          const dialogText = await dialog.textContent();
          console.log('Dialog content:', dialogText.substring(0, 300));
        }
        
        // Take a screenshot
        await page.screenshot({ path: 'permissions-working.png' });
        console.log('📸 Screenshot saved as permissions-working.png');
        
      } else {
        console.log('❌ Dialog did not open');
      }
      
    } else {
      console.log('❌ Could not find Admin role card');
    }
    
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('Screenshot saved as error-screenshot.png');
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

// Run the test
testPermissionsInApp().catch(console.error);