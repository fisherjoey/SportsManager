const puppeteer = require('puppeteer');

async function checkPageErrors() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];

  // Capture console messages
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        url: page.url(),
        message: msg.text(),
        location: msg.location()
      });
      console.log(`❌ Error on ${page.url()}: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push({
        url: page.url(),
        message: msg.text()
      });
      console.log(`⚠️ Warning on ${page.url()}: ${msg.text()}`);
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    errors.push({
      url: page.url(),
      message: error.message,
      stack: error.stack
    });
    console.log(`❌ Page Error on ${page.url()}: ${error.message}`);
  });

  // Pages to check (based on sidebar navigation)
  const pages = [
    '/',
    '/admin',
    '/assignor',
    '/referee',
    '/viewer',
    '/league-manager'
  ];

  for (const path of pages) {
    console.log(`\nChecking http://localhost:3003${path}...`);
    try {
      await page.goto(`http://localhost:3003${path}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await page.waitForTimeout(2000); // Wait for any async operations
    } catch (e) {
      console.log(`Failed to load ${path}: ${e.message}`);
    }
  }

  await browser.close();

  console.log('\n=== Summary ===');
  console.log(`Found ${errors.length} errors and ${warnings.length} warnings`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.url}`);
      console.log(`   ${err.message}`);
    });
  }
}

checkPageErrors().catch(console.error);