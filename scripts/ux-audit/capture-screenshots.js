/**
 * Automated Screenshot Capture Script
 * Logs in, navigates through all pages, and captures screenshots at different viewports
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = require('./audit-config.json');

// Ensure output directories exist
const screenshotDir = path.resolve(__dirname, '../../', config.output.screenshotDir);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const sessionDir = path.join(screenshotDir, timestamp);

function ensureDirectories() {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
}

async function login(page) {
  console.log('Navigating to login page...');
  await page.goto(`${config.app.url}${config.app.loginPath}`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  console.log('Filling in login credentials...');

  // Wait for login form to be ready
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.type('input[type="email"], input[name="email"]', config.app.credentials.email);
  await page.type('input[type="password"], input[name="password"]', config.app.credentials.password);

  // Click login button
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
  ]);

  console.log(`Waiting ${config.app.waitAfterLogin}ms after login...`);
  await page.waitForTimeout(config.app.waitAfterLogin);

  console.log('Login successful!');
}

async function captureScreenshot(page, route, viewport) {
  const viewportName = viewport.toLowerCase();
  const routeName = route.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `${routeName}_${viewportName}.png`;
  const filepath = path.join(sessionDir, filename);

  console.log(`  📸 Capturing ${route.name} at ${viewportName}...`);

  try {
    // Navigate to the route
    await page.goto(`${config.app.url}${route.path}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for any animations or loading to complete
    await page.waitForTimeout(config.app.screenshotDelay);

    // Take screenshot
    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    console.log(`  ✅ Saved: ${filename}`);

    return {
      success: true,
      route: route.name,
      viewport: viewportName,
      filename,
      filepath
    };
  } catch (error) {
    console.error(`  ❌ Failed to capture ${route.name} at ${viewportName}:`, error.message);
    return {
      success: false,
      route: route.name,
      viewport: viewportName,
      error: error.message
    };
  }
}

async function captureAllPages() {
  console.log('🚀 Starting automated screenshot capture...\n');
  ensureDirectories();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  const results = [];

  try {
    for (const [viewportName, size] of Object.entries(config.viewportSizes)) {
      console.log(`\n📱 Capturing screenshots at ${viewportName} (${size.width}x${size.height})`);

      const page = await browser.newPage();

      // Set viewport size
      await page.setViewport(size);

      // Login once per viewport
      await login(page);

      // Capture each route
      for (const route of config.routes) {
        if (!route.viewports.includes(viewportName)) {
          console.log(`  ⏭️  Skipping ${route.name} (not configured for ${viewportName})`);
          continue;
        }

        const result = await captureScreenshot(page, route, viewportName);
        results.push(result);

        // Wait between pages
        await page.waitForTimeout(config.app.waitBetweenPages);
      }

      await page.close();
    }

    // Save results manifest
    const manifestPath = path.join(sessionDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: {
        url: config.app.url,
        viewports: Object.keys(config.viewportSizes),
        totalRoutes: config.routes.length
      },
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    }, null, 2));

    console.log(`\n✅ Screenshot capture complete!`);
    console.log(`📁 Screenshots saved to: ${sessionDir}`);
    console.log(`📄 Manifest saved to: ${manifestPath}`);

    const summary = results.reduce((acc, r) => {
      acc.total++;
      r.success ? acc.successful++ : acc.failed++;
      return acc;
    }, { total: 0, successful: 0, failed: 0 });

    console.log(`\n📊 Summary: ${summary.successful}/${summary.total} successful, ${summary.failed} failed`);

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
  }

  return results;
}

// Run if called directly
if (require.main === module) {
  captureAllPages()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { captureAllPages };
