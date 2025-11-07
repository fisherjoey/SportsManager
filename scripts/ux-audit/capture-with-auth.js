/**
 * Capture all pages WITH proper authentication
 * 1. Login via API to get JWT token
 * 2. Inject token into browser localStorage
 * 3. Navigate to all pages and capture screenshots
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const config = require('./audit-config.json');

/**
 * Login via API and get JWT token
 */
async function loginViaAPI() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: config.app.credentials.email,
      password: config.app.credentials.password
    });

    const options = {
      hostname: 'localhost',
      port: 3001, // Backend port
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('🔐 Logging in via API...');
    console.log(`   Email: ${config.app.credentials.email}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.token) {
              console.log('   ✅ Login successful! Got token.\n');
              resolve(response.token);
            } else {
              reject(new Error('No token in response'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`Login failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Login request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Capture all pages with authentication
 */
async function captureAllPagesWithAuth() {
  console.log('🚀 Starting authenticated page capture...\n');

  let token;
  try {
    token = await loginViaAPI();
  } catch (error) {
    console.error('❌ Failed to login:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Backend is running (npm run dev:backend)');
    console.error('   2. Credentials in audit-config.json are correct');
    console.error('   3. User exists in database\n');
    throw error;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputDir = path.join(__dirname, 'screenshots', timestamp);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the app first
    console.log('📱 Setting up authentication...');
    await page.goto(config.app.url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Inject the auth token into localStorage
    await page.evaluate((authToken) => {
      localStorage.setItem('auth_token', authToken);
    }, token);

    console.log('   ✅ Auth token injected into browser\n');

    // Now capture each route
    for (const route of config.routes) {
      const routeName = route.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = `${routeName}.png`;
      const filepath = path.join(outputDir, filename);

      console.log(`📸 Capturing: ${route.name} (${route.path})`);

      try {
        // Navigate to the page
        await page.goto(`${config.app.url}${route.path}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for content to load
        await page.waitForTimeout(config.app.screenshotDelay);

        // Check if we're still on login page (auth failed)
        const currentUrl = page.url();
        if (currentUrl === config.app.url + '/' || currentUrl.includes('unauthorized')) {
          console.log(`   ⚠️  Auth issue - might need to refresh token`);
          results.push({
            route: route.name,
            path: route.path,
            success: false,
            reason: 'auth_failed'
          });
          continue;
        }

        // Take screenshot
        await page.screenshot({
          path: filepath,
          fullPage: true
        });

        console.log(`   ✅ Saved: ${filename}`);

        results.push({
          route: route.name,
          path: route.path,
          success: true,
          filename,
          filepath
        });

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        results.push({
          route: route.name,
          path: route.path,
          success: false,
          error: error.message
        });
      }

      // Wait between pages
      await page.waitForTimeout(config.app.waitBetweenPages);
      console.log();
    }

    await browser.close();

    // Save manifest
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      auth: {
        email: config.app.credentials.email,
        tokenUsed: true
      },
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    }, null, 2));

    console.log('✅ Capture complete!');
    console.log(`📁 Screenshots: ${outputDir}`);
    console.log(`📄 Manifest: ${manifestPath}`);

    const summary = results.reduce((acc, r) => {
      r.success ? acc.successful++ : acc.failed++;
      return acc;
    }, { successful: 0, failed: 0 });
    console.log(`📊 ${summary.successful}/${results.length} successful\n`);

    return { results, outputDir, manifestPath };

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await browser.close();
    throw error;
  }
}

if (require.main === module) {
  captureAllPagesWithAuth()
    .then(() => {
      console.log('🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { captureAllPagesWithAuth };
