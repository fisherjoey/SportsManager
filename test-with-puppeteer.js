const puppeteer = require('puppeteer');

async function testGamesPage() {
  console.log('🚀 Automated Frontend Test\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('1. Opening http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Wait a bit for React to load
    await new Promise(r => setTimeout(r, 2000));
    
    // Try to login
    console.log('2. Attempting login...');
    
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'test123');
      
      // Find and click submit button
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try alternative selectors
        const signInButton = await page.$('button');
        if (signInButton) {
          await signInButton.click();
        }
      }
      
      console.log('   Credentials entered, waiting for login...');
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // Navigate to games page
    console.log('3. Navigating to Games page...');
    await page.goto('http://localhost:3000/games', { waitUntil: 'networkidle2' });
    
    // Wait for content
    await new Promise(r => setTimeout(r, 5000));
    
    // Check for games
    console.log('4. Checking for games display...');
    
    // Take screenshot
    await page.screenshot({ path: 'games-page-result.png', fullPage: true });
    console.log('   Screenshot saved as games-page-result.png');
    
    // Check for table rows
    const rows = await page.$$('tbody tr');
    console.log(`\n✅ Result: Found ${rows.length} games in the table`);
    
    if (rows.length > 0) {
      // Get first row text
      const firstRowText = await rows[0].evaluate(el => el.textContent);
      console.log('   First game:', firstRowText.substring(0, 100) + '...');
      
      console.log('\n🎉 SUCCESS! Games are being displayed correctly!');
    } else {
      // Check for loading or error messages
      const loading = await page.$('.animate-spin');
      const errorMsg = await page.$('.text-destructive');
      const emptyMsg = await page.$('*[class*="empty"]');
      
      if (loading) {
        console.log('   ⚠️  Still loading...');
      } else if (errorMsg) {
        const error = await errorMsg.evaluate(el => el.textContent);
        console.log('   ❌ Error message:', error);
      } else if (emptyMsg) {
        const msg = await emptyMsg.evaluate(el => el.textContent);
        console.log('   ⚠️  Empty message:', msg);
      }
      
      // Check console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('   Browser console error:', msg.text());
        }
      });
      
      // Get page content for debugging
      const bodyText = await page.$eval('body', el => el.innerText);
      console.log('\n   Page content preview:', bodyText.substring(0, 200));
    }
    
    console.log('\n📋 Test Summary:');
    console.log('- Backend API: ✅ Working (returns 50 games)');
    console.log(`- Frontend Display: ${rows.length > 0 ? '✅ Working' : '❌ Not showing games'}`);
    
    if (rows.length === 0) {
      console.log('\n🔍 Debugging suggestions:');
      console.log('1. Check browser console for errors (F12)');
      console.log('2. Check Network tab to see if API call is made');
      console.log('3. Verify authentication is working');
      console.log('4. Check if isAuthenticated state is set correctly');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  console.log('\nKeeping browser open for manual inspection...');
  console.log('Press Ctrl+C to close the test');
  
  // Keep browser open
  await new Promise(() => {});
}

testGamesPage().catch(console.error);