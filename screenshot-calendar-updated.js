const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Navigate to the calendar page directly
    await page.goto('http://localhost:3000/?view=calendar');

    // Check if we need to login
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 2000 });

      // Login with demo credentials
      await page.fill('input[type="email"]', 'admin@cmba.ca');
      await page.fill('input[type="password"]', 'password');

      // Click Sign In button
      await page.click('button:has-text("Sign In")');

      // Wait for navigation to complete
      await page.waitForTimeout(2000);

      // Navigate back to calendar page
      await page.goto('http://localhost:3000/?view=calendar');
    } catch (e) {
      console.log('Already logged in or login not required');
    }

    // Wait for calendar content to load
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({
      path: 'calendar-full-width.png',
      fullPage: false
    });

    console.log('Screenshot saved as calendar-full-width.png');

    // Keep browser open for a moment
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();