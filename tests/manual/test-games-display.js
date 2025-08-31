const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Console Error:', msg.text());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/games')) {
      console.log(`Games API Response: ${response.status()} ${response.statusText()}`);
    }
  });

  try {
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Check if we need to login
    const loginFormExists = await page.locator('input[name="email"]').count() > 0;
    
    if (loginFormExists) {
      console.log('2. Login form detected, logging in...');
      await page.fill('input[name="email"]', 'admin@cmba.ca');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      console.log('   Login submitted');
    }
    
    console.log('3. Navigating to games page...');
    await page.goto('http://localhost:3000/games');
    await page.waitForTimeout(3000);
    
    // Check if still on login page
    const stillOnLogin = await page.locator('input[name="email"]').count() > 0;
    if (stillOnLogin) {
      console.log('   Still on login page, trying to login again...');
      await page.fill('input[name="email"]', 'admin@cmba.ca');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    console.log('4. Checking for games content...');
    
    // Check for loading state
    const loadingExists = await page.locator('text=/Loading games/i').count() > 0;
    console.log(`   Loading state visible: ${loadingExists}`);
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Check for games table or cards
    const tableRows = await page.locator('table tbody tr').count();
    console.log(`   Table rows found: ${tableRows}`);
    
    // Check for any game cards
    const gameCards = await page.locator('[class*="card"]').count();
    console.log(`   Game cards found: ${gameCards}`);
    
    // Check for specific game text
    const hasGamesText = await page.locator('text=/Genesis Centre|Repsol Sport Centre|MNP Community Centre/i').count() > 0;
    console.log(`   Has venue text from DB: ${hasGamesText}`);
    
    // Check for mock data text
    const hasMockText = await page.locator('text=/Central Park Field|Westside Sports Complex/i').count() > 0;
    console.log(`   Has mock venue text: ${hasMockText}`);
    
    // Look for error messages
    const errorMessages = await page.locator('text=/error|failed/i').count();
    console.log(`   Error messages found: ${errorMessages}`);
    
    if (errorMessages > 0) {
      const errors = await page.locator('text=/error|failed/i').allTextContents();
      console.log('   Error texts:', errors);
    }
    
    // Check for "No games found" message
    const noGamesMsg = await page.locator('text=/no games/i').count() > 0;
    console.log(`   "No games" message visible: ${noGamesMsg}`);
    
    // Get all visible text in the main content area
    console.log('\n5. Getting page content...');
    const pageTitle = await page.title();
    console.log(`   Page title: ${pageTitle}`);
    
    // Try to find the main content
    const mainContent = await page.locator('main, [role="main"], .container, .content').first();
    if (await mainContent.count() > 0) {
      const text = await mainContent.innerText();
      console.log('\n   Main content preview (first 500 chars):');
      console.log('   ' + text.substring(0, 500).replace(/\n/g, '\n   '));
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'games-page-test.png', fullPage: true });
    console.log('\n6. Screenshot saved as games-page-test.png');
    
    // Check localStorage for auth token
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    console.log(`\n7. Auth token exists: ${!!authToken}`);
    if (authToken) {
      console.log(`   Token prefix: ${authToken.substring(0, 20)}...`);
    }
    
    // Check network requests
    console.log('\n8. Checking API calls made...');
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Refresh to capture network activity
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log(`   API calls captured: ${apiCalls.length}`);
    apiCalls.forEach(call => {
      console.log(`   - ${call.method} ${call.url}`);
    });
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();