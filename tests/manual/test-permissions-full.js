const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  
  try {
    console.log('1. Navigating to dashboard directly with existing auth...');
    
    // Set the auth token in localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwNjY3OTRjMS1jMmNjLTQ4MGQtYTE1MC01NTMzOThjNDg2MzQiLCJlbWFpbCI6ImFkbWluQGNtYmEuY2EiLCJyb2xlIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJhc3NpZ25tZW50czphcHByb3ZlIiwiYXNzaWdubWVudHM6YXV0b19hc3NpZ24iLCJhc3NpZ25tZW50czpjcmVhdGUiLCJhc3NpZ25tZW50czpkZWxldGUiLCJhc3NpZ25tZW50czpyZWFkIiwiYXNzaWdubWVudHM6dXBkYXRlIiwiY29tbXVuaWNhdGlvbjpicm9hZGNhc3QiLCJjb21tdW5pY2F0aW9uOm1hbmFnZSIsImNvbW11bmljYXRpb246c2VuZCIsImNvbnRlbnQ6Y3JlYXRlIiwiY29udGVudDpkZWxldGUiLCJjb250ZW50OnB1Ymxpc2giLCJjb250ZW50OnJlYWQiLCJjb250ZW50OnVwZGF0ZSIsImZpbmFuY2U6YXBwcm92ZSIsImZpbmFuY2U6Y3JlYXRlIiwiZmluYW5jZTptYW5hZ2UiLCJmaW5hbmNlOnJlYWQiLCJnYW1lczpjcmVhdGUiLCJnYW1lczpkZWxldGUiLCJnYW1lczpwdWJsaXNoIiwiZ2FtZXM6cmVhZCIsImdhbWVzOnVwZGF0ZSIsInJlZmVyZWVzOmV2YWx1YXRlIiwicmVmZXJlZXM6bWFuYWdlIiwicmVmZXJlZXM6cmVhZCIsInJlZmVyZWVzOnVwZGF0ZSIsInJlcG9ydHM6Y3JlYXRlIiwicmVwb3J0czpleHBvcnQiLCJyZXBvcnRzOmZpbmFuY2lhbCIsInJlcG9ydHM6cmVhZCIsInNldHRpbmdzOnJlYWQiLCJzZXR0aW5nczp1cGRhdGUiLCJ1c2VyczpjcmVhdGUiLCJ1c2VyczpyZWFkIiwidXNlcnM6dXBkYXRlIl0sImlhdCI6MTc1NjUxMjQxMiwiZXhwIjoxNzU3MTE3MjEyfQ.uxw2En2s2THHwcKz1GASRg-RGTvuTiauJahi07fEocA');
    });
    
    await page.goto('http://localhost:3000/dashboard/admin/roles');
    console.log('2. Waiting for role cards to load...');
    await page.waitForTimeout(3000);
    
    console.log('3. Looking for Admin role card...');
    // Find the Admin role card and click Manage Permissions
    const adminCard = await page.locator('h3:has-text("Admin")').first();
    if (await adminCard.isVisible()) {
      console.log('Found Admin role card');
      
      // Click the three dots menu
      const menuButton = await adminCard.locator('..').locator('..').locator('button[aria-haspopup="menu"]');
      await menuButton.click();
      console.log('Clicked menu button');
      
      // Click Manage Permissions
      await page.locator('text=Manage Permissions').click();
      console.log('Clicked Manage Permissions');
      
      // Wait for dialog to open
      await page.waitForTimeout(2000);
      
      console.log('4. Checking dialog content...');
      const dialog = await page.locator('[role="dialog"]');
      const isDialogVisible = await dialog.isVisible();
      console.log('Dialog visible:', isDialogVisible);
      
      if (isDialogVisible) {
        // Check for loading state
        const loading = await dialog.locator('.animate-spin').count();
        console.log('Loading spinners:', loading);
        
        // Wait for permissions to load
        await page.waitForTimeout(2000);
        
        // Count checkboxes (permissions)
        const checkboxes = await dialog.locator('input[type="checkbox"]').count();
        console.log('Permission checkboxes found:', checkboxes);
        
        // Get categories
        const categories = await dialog.locator('h4').allTextContents();
        console.log('Permission categories:', categories);
        
        // Check if there are any permissions visible
        if (checkboxes > 0) {
          console.log('✅ SUCCESS: Permissions are now showing!');
          
          // Try to toggle a permission
          const firstCheckbox = await dialog.locator('input[type="checkbox"]').first();
          const wasChecked = await firstCheckbox.isChecked();
          await firstCheckbox.click();
          const isCheckedNow = await firstCheckbox.isChecked();
          console.log(`Toggled first permission: ${wasChecked} -> ${isCheckedNow}`);
          
          // Take a screenshot
          await page.screenshot({ path: 'permissions-working.png' });
          console.log('Screenshot saved as permissions-working.png');
        } else {
          console.log('❌ FAILED: No permissions visible');
          
          // Get dialog text to debug
          const dialogText = await dialog.textContent();
          console.log('Dialog text:', dialogText.substring(0, 200));
        }
        
        // Close dialog
        const cancelButton = await dialog.locator('button:has-text("Cancel")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          console.log('Closed dialog');
        }
      }
    } else {
      console.log('Could not find Admin role card');
    }
    
    console.log('\n5. Testing with a different role (Referee)...');
    const refereeCard = await page.locator('h3:has-text("Referee")').first();
    if (await refereeCard.isVisible()) {
      console.log('Found Referee role card');
      
      // Click the three dots menu
      const menuButton = await refereeCard.locator('..').locator('..').locator('button[aria-haspopup="menu"]');
      await menuButton.click();
      
      // Click Manage Permissions
      await page.locator('text=Manage Permissions').click();
      console.log('Opened permissions for Referee role');
      
      await page.waitForTimeout(2000);
      
      const dialog = await page.locator('[role="dialog"]');
      const checkboxes = await dialog.locator('input[type="checkbox"]').count();
      const checkedBoxes = await dialog.locator('input[type="checkbox"]:checked').count();
      
      console.log(`Referee role: ${checkboxes} total permissions, ${checkedBoxes} assigned`);
      
      // Close dialog
      await dialog.locator('button:has-text("Cancel")').click();
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();