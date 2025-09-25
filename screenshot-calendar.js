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

    // Navigate to calendar page
    await page.goto('http://localhost:3000/?view=calendar');

    // Wait for calendar content to load
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({
      path: 'calendar-improved.png',
      fullPage: false
    });

    console.log('Screenshot saved as calendar-improved.png');

    // Keep browser open for a moment
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();