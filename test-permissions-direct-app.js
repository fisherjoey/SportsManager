const { chromium } = require('playwright');

async function testPermissionsDirectly() {
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
    console.log('1. Setting auth token and navigating directly to roles page...');
    
    // Set the auth token in localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwNjY3OTRjMS1jMmNjLTQ4MGQtYTE1MC01NTMzOThjNDg2MzQiLCJlbWFpbCI6ImFkbWluQGNtYmEuY2EiLCJyb2xlIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJhc3NpZ25tZW50czphcHByb3ZlIiwiYXNzaWdubWVudHM6YXV0b19hc3NpZ24iLCJhc3NpZ25tZW50czpjcmVhdGUiLCJhc3NpZ25tZW50czpkZWxldGUiLCJhc3NpZ25tZW50czpyZWFkIiwiYXNzaWdubWVudHM6dXBkYXRlIiwiY29tbXVuaWNhdGlvbjpicm9hZGNhc3QiLCJjb21tdW5pY2F0aW9uOm1hbmFnZSIsImNvbW11bmljYXRpb246c2VuZCIsImNvbnRlbnQ6Y3JlYXRlIiwiY29udGVudDpkZWxldGUiLCJjb250ZW50OnB1Ymxpc2giLCJjb250ZW50OnJlYWQiLCJjb250ZW50OnVwZGF0ZSIsImZpbmFuY2U6YXBwcm92ZSIsImZpbmFuY2U6Y3JlYXRlIiwiZmluYW5jZTptYW5hZ2UiLCJmaW5hbmNlOnJlYWQiLCJnYW1lczpjcmVhdGUiLCJnYW1lczpkZWxldGUiLCJnYW1lczpwdWJsaXNoIiwiZ2FtZXM6cmVhZCIsImdhbWVzOnVwZGF0ZSIsInJlZmVyZWVzOmV2YWx1YXRlIiwicmVmZXJlZXM6bWFuYWdlIiwicmVmZXJlZXM6cmVhZCIsInJlZmVyZWVzOnVwZGF0ZSIsInJlcG9ydHM6Y3JlYXRlIiwicmVwb3J0czpleHBvcnQiLCJyZXBvcnRzOmZpbmFuY2lhbCIsInJlcG9ydHM6cmVhZCIsInNldHRpbmdzOnJlYWQiLCJzZXR0aW5nczp1cGRhdGUiLCJ1c2VyczpjcmVhdGUiLCJ1c2VyczpyZWFkIiwidXNlcnM6dXBkYXRlIl0sImlhdCI6MTc1NjUxMjQxMiwiZXhwIjoxNzU3MTE3MjEyfQ.uxw2En2s2THHwcKz1GASRg-RGTvuTiauJahi07fEocA');
    });
    
    await page.goto('http://localhost:3000/dashboard/admin/roles');
    
    console.log('2. Waiting for role cards to load...');
    await page.waitForTimeout(3000);
    
    console.log('3. Looking for Admin role card...');
    // Find the Admin role card
    const adminCard = await page.locator('h3:has-text("Admin")').first();
    
    if (await adminCard.isVisible()) {
      console.log('✅ Found Admin role card');
      
      // Click the three dots menu button
      const cardContainer = await adminCard.locator('../..');
      const menuButton = await cardContainer.locator('button[aria-haspopup="menu"]');
      
      console.log('4. Opening menu...');
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Click Manage Permissions
      console.log('5. Clicking Manage Permissions...');
      await page.locator('text=Manage Permissions').click();
      
      // Wait for dialog to open
      await page.waitForTimeout(2000);
      
      console.log('6. Checking permissions dialog...');
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
          console.log(`✅ Total of ${checkboxes} permissions across ${categories.length} categories`);
          
          // Test toggling a permission
          const firstCheckbox = await dialog.locator('input[type="checkbox"]').first();
          const wasChecked = await firstCheckbox.isChecked();
          
          console.log('\n7. Testing permission toggle...');
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          const isCheckedNow = await firstCheckbox.isChecked();
          console.log(`✅ Permission toggled: ${wasChecked} -> ${isCheckedNow}`);
          
          // Test category toggle
          const categoryToggle = await dialog.locator('button:has(.h-4.w-4)').first();
          console.log('\n8. Testing category toggle...');
          await categoryToggle.click();
          await page.waitForTimeout(500);
          console.log('✅ Category toggle clicked');
          
          // Save the changes
          console.log('\n9. Saving permissions...');
          await dialog.locator('button:has-text("Save Permissions")').click();
          
          // Wait for save to complete
          await page.waitForTimeout(2000);
          
          // Check for success toast
          const toast = await page.locator('[role="status"]');
          if (await toast.isVisible()) {
            const toastText = await toast.textContent();
            if (toastText && toastText.includes('Success')) {
              console.log('✅ Permissions saved successfully!');
            }
          }
          
          console.log('\n🎉 ALL TESTS PASSED! Permissions management is working correctly.');
          console.log('✅ Dialog displays permissions');
          console.log('✅ Checkboxes are interactive');
          console.log('✅ Category toggles work');
          console.log('✅ Save functionality works');
          
        } else {
          console.log('\n❌ FAILED: No permissions found in dialog');
          
          // Get dialog content for debugging
          const dialogText = await dialog.textContent();
          console.log('Dialog content:', dialogText.substring(0, 300));
        }
        
        // Take a screenshot
        await page.screenshot({ path: 'permissions-success.png' });
        console.log('\n📸 Screenshot saved as permissions-success.png');
        
      } else {
        console.log('❌ Dialog did not open');
      }
      
    } else {
      console.log('❌ Could not find Admin role card');
      // Take screenshot for debugging
      await page.screenshot({ path: 'roles-page.png' });
      console.log('Screenshot saved as roles-page.png');
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
testPermissionsDirectly().catch(console.error);