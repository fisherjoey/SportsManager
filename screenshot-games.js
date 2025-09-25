const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Navigate to the login page
    await page.goto('http://localhost:3000');

    // Wait for login page to load
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Login with demo credentials
    await page.fill('input[type="email"]', 'admin@cmba.ca');
    await page.fill('input[type="password"]', 'password');

    // Click Sign In button
    await page.click('button:has-text("Sign In")');

    // Wait for navigation to complete
    await page.waitForTimeout(2000);

    // Navigate to games page
    await page.goto('http://localhost:3000/?view=games');

    // Wait for games content to load
    await page.waitForTimeout(3000);

    // Try to switch to card view if available
    try {
      const cardViewButton = await page.$('button[aria-label*="card"], button:has(svg[class*="LayoutGrid"])');
      if (cardViewButton) {
        await cardViewButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Card view button not found or already in card view');
    }

    // Take a screenshot
    await page.screenshot({
      path: 'games-page-cards.png',
      fullPage: false
    });

    console.log('Screenshot saved as games-page-cards.png');

    // Also take a full page screenshot
    await page.screenshot({
      path: 'games-page-full.png',
      fullPage: true
    });

    console.log('Full page screenshot saved as games-page-full.png');

    // Keep browser open for manual inspection
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();