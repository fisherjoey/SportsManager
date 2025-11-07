/**
 * Capture a single test screenshot for proof of concept
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const config = require('./audit-config.json');

async function captureTestScreenshot() {
  console.log('📸 Capturing test screenshot...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Login
    console.log('Logging in...');
    await page.goto(`${config.app.url}${config.app.loginPath}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', config.app.credentials.email);
    await page.type('input[type="password"], input[name="password"]', config.app.credentials.password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);
    await page.waitForTimeout(config.app.waitAfterLogin);

    // Navigate to dashboard
    console.log('Navigating to dashboard...');
    await page.goto(`${config.app.url}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(config.app.screenshotDelay);

    // Take screenshot
    const outputDir = path.join(__dirname, 'test-screenshots');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const screenshotPath = path.join(outputDir, 'dashboard-test.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log(`✅ Screenshot saved: ${screenshotPath}\n`);

    await browser.close();
    return screenshotPath;

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    throw error;
  }
}

if (require.main === module) {
  captureTestScreenshot()
    .then((path) => {
      console.log('🎉 Test screenshot complete!');
      console.log(`📁 Path: ${path}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { captureTestScreenshot };
