/**
 * Capture all pages by navigating directly (bypassing auth for screenshots)
 * In dev mode, pages might render even without proper auth
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const config = require('./audit-config.json');

async function captureAllPages() {
  console.log('🚀 Starting page capture (direct navigation)...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];
  const outputDir = path.join(__dirname, 'screenshots-captured');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture each route
    for (const route of config.routes) {
      const routeName = route.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = `${routeName}.png`;
      const filepath = path.join(outputDir, filename);

      console.log(`📸 Capturing: ${route.name} (${route.path})`);

      try {
        // Navigate directly to the page
        await page.goto(`${config.app.url}${route.path}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for content to load
        await page.waitForTimeout(config.app.screenshotDelay);

        // Check if we got redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl === config.app.url + '/') {
          console.log(`   ⚠️  Redirected to login - page requires auth`);
          results.push({
            route: route.name,
            path: route.path,
            success: false,
            reason: 'requires_auth'
          });
          continue;
        }

        // Take screenshot
        await page.screenshot({
          path: filepath,
          fullPage: true
        });

        console.log(`   ✅ Saved: ${filename}\n`);

        results.push({
          route: route.name,
          path: route.path,
          success: true,
          filename,
          filepath
        });

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        results.push({
          route: route.name,
          path: route.path,
          success: false,
          error: error.message
        });
      }

      // Wait between pages
      await page.waitForTimeout(config.app.waitBetweenPages);
    }

    await browser.close();

    // Save manifest
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    }, null, 2));

    console.log('\n✅ Capture complete!');
    console.log(`📁 Screenshots: ${outputDir}`);
    console.log(`📄 Manifest: ${manifestPath}`);

    const summary = results.reduce((acc, r) => {
      r.success ? acc.successful++ : acc.failed++;
      return acc;
    }, { successful: 0, failed: 0 });
    console.log(`📊 ${summary.successful}/${results.length} successful\n`);

    return results;

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await browser.close();
    throw error;
  }
}

if (require.main === module) {
  captureAllPages()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { captureAllPages };
