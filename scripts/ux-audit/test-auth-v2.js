/**
 * Test v2 - Try different login approach
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testLogin() {
  const browser = await puppeteer.launch({
    headless: false, // Run visible so we can see what happens
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Enable console logging from the page
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.url().includes('login') || response.url().includes('auth')) {
      console.log(`RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Waiting for email input...');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Check what demo accounts are available
    console.log('\nLooking for demo accounts button...');
    const demoButton = await page.$('button:has-text("Demo Accounts")');
    if (demoButton) {
      console.log('Found demo accounts button, clicking...');
      await demoButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot to see what's available
      const screenshotPath = path.join(__dirname, 'test-screenshots', 'demo-accounts.png');
      await page.screenshot({ path: screenshotPath });
      console.log('Screenshot of demo accounts:', screenshotPath);
    }

    console.log('\nTyping credentials...');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');

    console.log('Clicking submit...');
    await page.click('button[type="submit"]');

    // Wait and see what happens
    console.log('Waiting 10 seconds to see what happens...');
    await page.waitForTimeout(10000);

    console.log('Current URL:', page.url());

    // Take screenshot
    const finalPath = path.join(__dirname, 'test-screenshots', 'after-login-attempt.png');
    await page.screenshot({ path: finalPath, fullPage: true });
    console.log('Final screenshot:', finalPath);

    // Don't close - leave browser open to inspect
    console.log('\nBrowser left open for inspection. Close manually when done.');

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
  }
}

testLogin();
