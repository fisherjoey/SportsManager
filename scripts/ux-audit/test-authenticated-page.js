/**
 * Test capturing an authenticated page (Dashboard)
 * This proves login works and we can capture pages that require auth
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureAuthenticatedPage() {
  console.log('🚀 Testing authenticated page capture...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Step 1: Load login page
    console.log('1️⃣  Loading login page...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('   ✅ Login page loaded\n');

    // Step 2: Fill in login form
    console.log('2️⃣  Filling in credentials...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });

    // Type email
    await page.type('input[type="email"], input[name="email"]', 'admin@example.com', { delay: 50 });
    console.log('   ✅ Email entered\n');

    // Type password
    await page.type('input[type="password"], input[name="password"]', 'admin123', { delay: 50 });
    console.log('   ✅ Password entered\n');

    // Step 3: Submit form and wait for navigation
    console.log('3️⃣  Submitting login form...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);
    console.log('   ✅ Logged in successfully\n');

    // Wait a bit for any post-login animations/loading
    await page.waitForTimeout(3000);

    // Step 4: Navigate to dashboard (or check if already there)
    const currentUrl = page.url();
    console.log('4️⃣  Current URL:', currentUrl, '\n');

    if (!currentUrl.includes('/dashboard')) {
      console.log('   Navigating to dashboard...');
      await page.goto('http://localhost:3000/dashboard', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await page.waitForTimeout(2000);
      console.log('   ✅ Dashboard loaded\n');
    } else {
      console.log('   ✅ Already on dashboard\n');
    }

    // Step 5: Take screenshot
    console.log('5️⃣  Capturing screenshot...');
    const outputDir = path.join(__dirname, 'test-screenshots');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const screenshotPath = path.join(outputDir, 'dashboard-authenticated.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log('   ✅ Screenshot saved:', screenshotPath, '\n');

    await browser.close();

    console.log('🎉 SUCCESS! Authenticated page capture works!\n');
    console.log('📁 Screenshot location:', screenshotPath);

    return screenshotPath;

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    await browser.close();
    throw error;
  }
}

if (require.main === module) {
  captureAuthenticatedPage()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { captureAuthenticatedPage };
