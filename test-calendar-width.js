const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Navigate directly to calendar with saved session
    await page.goto('http://localhost:3000/?view=calendar');

    // Wait for calendar to load
    await page.waitForTimeout(2000);

    // Check if we need to login
    const needsLogin = await page.$('input[type="email"]');
    if (needsLogin) {
      console.log('Logging in...');
      await page.fill('input[type="email"]', 'admin@cmba.ca');
      await page.fill('input[type="password"]', 'password');
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(2000);

      // Navigate to calendar again
      await page.goto('http://localhost:3000/?view=calendar');
      await page.waitForTimeout(2000);
    }

    // Take screenshots at different viewport widths
    const widths = [1920, 1536, 1280, 1024];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1080 });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `calendar-${width}px.png`,
        fullPage: false
      });
      console.log(`Screenshot saved for ${width}px width`);
    }

    console.log('All screenshots saved!');

    // Keep browser open for manual inspection
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();