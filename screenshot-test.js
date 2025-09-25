const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Navigate to the games page
    await page.goto('http://localhost:3000/?view=games');

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({
      path: 'games-page-screenshot.png',
      fullPage: true
    });

    console.log('Screenshot saved as games-page-screenshot.png');

    // Keep browser open for manual inspection
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();