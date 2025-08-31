const { chromium } = require('playwright');

async function testGamesDisplay() {
  console.log('🚀 Starting Games Management Page Test\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to the app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Step 2: Try to login
    console.log('2. Attempting login...');
    
    // Check if we need to login
    const loginButton = await page.$('button:has-text("Sign In")');
    if (loginButton) {
      console.log('   - Found login button, attempting to login');
      
      // Try with admin@cmba.ca
      await page.fill('input[type="email"]', 'admin@cmba.ca');
      await page.fill('input[type="password"]', 'password123');
      await loginButton.click();
      
      // Wait for navigation or error
      await page.waitForTimeout(2000);
      
      // Check if login failed
      const errorMessage = await page.$('.text-destructive');
      if (errorMessage) {
        console.log('   ❌ Login failed with admin@cmba.ca');
        
        // Try with another user
        console.log('   - Trying admin@refassign.com');
        await page.fill('input[type="email"]', 'admin@refassign.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(2000);
      }
    }
    
    // Step 3: Navigate to Games Management
    console.log('3. Navigating to Games Management page...');
    
    // Try to find and click Games link
    const gamesLink = await page.$('a:has-text("Games")');
    if (gamesLink) {
      await gamesLink.click();
    } else {
      // Direct navigation
      await page.goto('http://localhost:3000/games');
    }
    
    await page.waitForTimeout(3000);
    
    // Step 4: Check for games display
    console.log('4. Checking games display...');
    
    // Take a screenshot
    await page.screenshot({ path: 'games-page-test.png' });
    console.log('   - Screenshot saved as games-page-test.png');
    
    // Check if loading spinner is present
    const loadingSpinner = await page.$('.animate-spin');
    if (loadingSpinner) {
      console.log('   ⏳ Loading spinner detected, waiting...');
      await page.waitForTimeout(5000);
    }
    
    // Check for games table
    const gamesTable = await page.$('table');
    const gameRows = await page.$$('tbody tr');
    
    if (gameRows.length > 0) {
      console.log(`   ✅ Found ${gameRows.length} games in the table`);
      
      // Get first game details
      const firstRow = gameRows[0];
      const gameText = await firstRow.textContent();
      console.log('   - First game preview:', gameText.substring(0, 100) + '...');
    } else {
      console.log('   ❌ No games found in table');
      
      // Check for empty message
      const emptyMessage = await page.$('text=/No games found/i');
      if (emptyMessage) {
        console.log('   - "No games found" message is displayed');
      }
    }
    
    // Step 5: Check network requests
    console.log('\n5. Monitoring API calls...');
    
    // Set up request monitoring
    page.on('response', response => {
      if (response.url().includes('/api/games')) {
        console.log(`   - Games API called: ${response.status()} ${response.url()}`);
      }
    });
    
    // Refresh the page to capture network activity
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Step 6: Check browser console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   ❌ Console error:', msg.text());
      }
    });
    
    // Step 7: Check stats display
    console.log('\n6. Checking stats cards...');
    const statsCards = await page.$$('.grid .card');
    console.log(`   - Found ${statsCards.length} stat cards`);
    
    // Get stats values
    const totalGamesElement = await page.$('text=/Total Games/i');
    if (totalGamesElement) {
      const parent = await totalGamesElement.$('xpath=..');
      const valueElement = await parent.$('.text-2xl');
      if (valueElement) {
        const value = await valueElement.textContent();
        console.log(`   - Total Games: ${value}`);
      }
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testGamesDisplay().catch(console.error);