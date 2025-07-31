const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    if (msg.text().includes('Receipt') || msg.text().includes('Line Items')) {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });
  
  // Listen for API responses
  page.on('response', async response => {
    if (response.url().includes('/api/expenses/receipts/') && !response.url().includes('/download')) {
      console.log('API Response URL:', response.url());
      try {
        const responseData = await response.json();
        console.log('API Response Data:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }
  });
  
  try {
    // Navigate to the budget page
    await page.goto('http://localhost:3000/budget');
    await page.waitForTimeout(2000);
    
    // Check if we need to sign in
    const signInButton = page.locator('button:has-text("Sign In")');
    if (await signInButton.isVisible()) {
      console.log('Need to sign in first...');
      // Let's navigate to login or look for receipts in a different way
      await page.goto('http://localhost:3000');
      await page.waitForTimeout(2000);
    }
    
    // Look for the receipt and click View
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      console.log('Clicking View button...');
      await viewButton.click();
      
      // Wait for the modal to open and API call to complete
      await page.waitForTimeout(3000);
      
      // Check if line items section exists
      const lineItemsSection = page.locator('text=Line Items');
      const lineItemsExists = await lineItemsSection.isVisible();
      console.log('Line Items section visible:', lineItemsExists);
      
      if (!lineItemsExists) {
        console.log('Line Items section not found - checking modal content...');
        const modalContent = await page.locator('[role="dialog"]').textContent();
        console.log('Modal content includes:', modalContent.substring(0, 500));
      }
    } else {
      console.log('No View button found');
      // List all buttons to see what's available
      const buttons = await page.locator('button').all();
      console.log('Available buttons:', await Promise.all(buttons.map(b => b.textContent())));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();