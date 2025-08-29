const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set a good viewport size for the screenshot
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // Navigate to the theme demo page (using port 3006 as dev server is running there)
  await page.goto('http://localhost:3006/theme-demo');
  
  // Wait for the page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Extra wait for any animations
  
  // Take a full page screenshot
  await page.screenshot({ 
    path: 'theme-comparison.png',
    fullPage: true 
  });
  
  console.log('Screenshot saved as theme-comparison.png');
  
  // Also take individual theme screenshots by clicking each one
  const themeKeys = ['current', 'cream', 'blueWhite', 'beige', 'greenWhite', 'champagne'];
  
  for (let i = 0; i < themeKeys.length; i++) {
    // Click the select button for each theme
    const buttons = await page.$$('button:has-text("Select This Theme"), button:has-text("Selected")');
    if (buttons[i]) {
      await buttons[i].click();
      await page.waitForTimeout(500);
    }
  }
  
  // Take final screenshot with last theme selected
  await page.screenshot({ 
    path: 'theme-comparison-selected.png',
    fullPage: true 
  });
  
  await browser.close();
})();