/**
 * Test v3 - Wait for dashboard elements instead of navigation
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testLogin() {
  console.log('🚀 Testing login...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Load login page
    console.log('1️⃣  Loading login page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('   ✅ Loaded\n');

    // Fill credentials
    console.log('2️⃣  Entering credentials...');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', 'admin@refassign.com');
    await page.type('input[type="password"]', 'password');
    console.log('   ✅ Entered\n');

    // Submit and wait for URL change OR dashboard content
    console.log('3️⃣  Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for either URL change or dashboard content to appear
    console.log('   ⏳ Waiting for dashboard to load...');
    await Promise.race([
      page.waitForFunction(() => window.location.pathname !== '/', { timeout: 10000 }),
      page.waitForSelector('nav, [role="navigation"], h1, h2', { timeout: 10000 })
    ]);

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('   ✅ Current URL:', currentUrl, '\n');

    // Take screenshot
    console.log('4️⃣  Capturing screenshot...');
    const outputDir = path.join(__dirname, 'test-screenshots');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const screenshotPath = path.join(outputDir, 'after-login.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('   ✅ Saved:', screenshotPath, '\n');

    await browser.close();

    console.log('🎉 SUCCESS!\n');
    return screenshotPath;

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await browser.close();
    throw error;
  }
}

testLogin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
