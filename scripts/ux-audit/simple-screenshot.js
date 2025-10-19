/**
 * Simple screenshot capture - just grab the homepage
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureSimple() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(2000);

  const outputDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotPath = path.join(outputDir, 'login-page.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  return screenshotPath;
}

captureSimple()
  .then(p => console.log('Screenshot:', p))
  .catch(e => console.error('Error:', e));
