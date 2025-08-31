const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console errors and API responses
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`Browser ${msg.type()}:`, msg.text());
    }
  });
  
  let gamesApiResponse = null;
  page.on('response', async response => {
    if (response.url().includes('/api/games')) {
      console.log(`\nGames API called: ${response.status()} ${response.url()}`);
      try {
        const body = await response.text();
        gamesApiResponse = body;
        console.log('Response body preview:', body.substring(0, 200));
      } catch (e) {
        console.log('Could not read response body');
      }
    }
  });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/games');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Filling login form...');
    await page.fill('input[type="email"]', 'admin@cmba.ca');
    await page.fill('input[type="password"]', 'password');
    
    console.log('3. Submitting login...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation after login
    console.log('4. Waiting for post-login navigation...');
    await page.waitForTimeout(5000); // Give time for login and redirect
    
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    // Check if we're authenticated
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    console.log(`5. Auth token exists: ${!!authToken}`);
    
    // If not on games page, navigate there
    if (!currentUrl.includes('/games')) {
      console.log('6. Navigating to games page...');
      await page.goto('http://localhost:3000/games');
      await page.waitForTimeout(3000);
    }
    
    console.log('7. Checking games page content...');
    
    // Check for loading state
    const loadingVisible = await page.locator('text=/loading/i').isVisible().catch(() => false);
    console.log(`   Loading indicator visible: ${loadingVisible}`);
    
    // Wait a bit more for content
    await page.waitForTimeout(2000);
    
    // Look for games table
    const hasTable = await page.locator('table').count() > 0;
    console.log(`   Has table: ${hasTable}`);
    
    if (hasTable) {
      const rows = await page.locator('table tbody tr').count();
      console.log(`   Table rows: ${rows}`);
      
      // Get first few rows' content
      if (rows > 0) {
        console.log('   First row content:');
        const firstRow = await page.locator('table tbody tr').first().innerText();
        console.log('   ', firstRow.replace(/\t/g, ' | '));
      }
    }
    
    // Check for any cards
    const cardCount = await page.locator('[class*="card"]').count();
    console.log(`   Card elements: ${cardCount}`);
    
    // Look for specific text
    const hasDbVenues = await page.locator('text=/Genesis Centre|Repsol|MNP/i').count();
    console.log(`   Database venue mentions: ${hasDbVenues}`);
    
    const hasMockVenues = await page.locator('text=/Central Park|Westside Sports/i').count();
    console.log(`   Mock venue mentions: ${hasMockVenues}`);
    
    // Check for "No games" message
    const noGames = await page.locator('text=/no games/i').count();
    console.log(`   "No games" messages: ${noGames}`);
    
    // Check for error messages
    const errors = await page.locator('text=/error|failed/i').count();
    console.log(`   Error messages: ${errors}`);
    
    // Get main content text
    console.log('\n8. Main content area:');
    const mainArea = await page.locator('main, [role="main"], div:has(table)').first();
    if (await mainArea.count() > 0) {
      const text = await mainArea.innerText();
      const lines = text.split('\n').slice(0, 20);
      lines.forEach(line => {
        if (line.trim()) console.log('   ', line.substring(0, 100));
      });
    }
    
    // Take screenshot
    await page.screenshot({ path: 'games-page-logged-in.png', fullPage: true });
    console.log('\n9. Screenshot saved as games-page-logged-in.png');
    
    // Log the API response if we got one
    if (gamesApiResponse) {
      console.log('\n10. Games API Response:');
      const parsed = JSON.parse(gamesApiResponse);
      console.log('   Data array length:', parsed.data?.length || 0);
      if (parsed.data && parsed.data.length > 0) {
        console.log('   First game:', JSON.stringify(parsed.data[0], null, 2).substring(0, 300));
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'games-error.png' });
  } finally {
    // Keep browser open for a moment to see the result
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();