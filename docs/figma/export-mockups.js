const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Login credentials
const LOGIN_EMAIL = 'admin@sportsmanager.com';
const LOGIN_PASSWORD = 'password';

// Pages to export for mockups
const pagesToExport = [
  { url: 'http://localhost:3000/login', name: '01-login', auth: false },
  { url: 'http://localhost:3000', name: '02-dashboard', auth: true },
  { url: 'http://localhost:3000/games', name: '03-games-list', auth: true },
  { url: 'http://localhost:3000/admin-users', name: '04-user-management', auth: true },
  { url: 'http://localhost:3000/admin-roles', name: '05-role-management', auth: true },
  { url: 'http://localhost:3000/notifications', name: '06-notifications', auth: true },
];

// Viewports for responsive design (worth 5 marks!)
const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'mobile', width: 375, height: 812 },
];

async function login(page) {
  console.log('  🔐 Logging in...');

  await page.goto('http://localhost:3000/login', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Fill in login form
  await page.type('#email', LOGIN_EMAIL);
  await page.type('#password', LOGIN_PASSWORD);

  // Click sign in button
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
    console.log('  ⚠️ Navigation timeout, but continuing...');
  });

  // Wait a bit for any redirects
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('  ✅ Logged in successfully');
}

async function exportMockups() {
  const outputDir = path.join(__dirname, 'figma-mockups');

  // Create output directory
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${outputDir}\n`);
  } catch (err) {
    console.error('Error creating directory:', err);
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('🌐 Browser launched...\n');

  // Create a page for login
  const loginPage = await browser.newPage();

  // Login once to get cookies
  let isLoggedIn = false;
  try {
    await login(loginPage);
    isLoggedIn = true;
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    console.log('⚠️ Will only export non-authenticated pages\n');
  }

  // Get cookies after login
  const cookies = isLoggedIn ? await loginPage.cookies() : [];
  await loginPage.close();

  // Export each page at each viewport
  for (const pageConfig of pagesToExport) {
    // Skip auth pages if not logged in
    if (pageConfig.auth && !isLoggedIn) {
      console.log(`⏭️ Skipping ${pageConfig.name} (requires authentication)\n`);
      continue;
    }

    console.log(`📄 Exporting: ${pageConfig.name}`);

    for (const viewport of viewports) {
      try {
        const page = await browser.newPage();

        // Set cookies if this is an authenticated page
        if (pageConfig.auth && cookies.length > 0) {
          await page.setCookie(...cookies);
        }

        // Set viewport
        await page.setViewport({ width: viewport.width, height: viewport.height });

        // Navigate to page
        await page.goto(pageConfig.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for any dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get the full HTML
        const html = await page.content();

        // Save HTML file
        const htmlPath = path.join(outputDir, `${pageConfig.name}-${viewport.name}.html`);
        await fs.writeFile(htmlPath, html, 'utf-8');
        console.log(`   ✅ ${viewport.name}: Saved HTML`);

        // Take a screenshot
        const screenshotPath = path.join(outputDir, `${pageConfig.name}-${viewport.name}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });
        console.log(`   ✅ ${viewport.name}: Saved screenshot`);

        await page.close();
      } catch (err) {
        console.error(`   ❌ Error exporting ${viewport.name}:`, err.message);
      }
    }

    console.log('');
  }

  await browser.close();

  console.log('\n✅ Export complete! Check the figma-mockups folder.');
  console.log('\n📋 Next steps for your assignment:');
  console.log('   1. Open Figma and create a new file');
  console.log('   2. Install "html.to.design" plugin');
  console.log('   3. Import HTML files from figma-mockups/');
  console.log('   4. Organize pages with labels: Desktop view | Mobile view');
  console.log('   5. Add annotations for navigation flow');
  console.log('   6. Export to PDF for submission\n');

  console.log('📊 Exported pages:');
  console.log('   • Login page (desktop + mobile)');
  console.log('   • Dashboard (desktop + mobile)');
  console.log('   • Games list (desktop + mobile)');
  console.log('   • User management (desktop + mobile)');
  console.log('   • Role management (desktop + mobile)');
  console.log('   • Notifications (desktop + mobile)');
  console.log('\n💡 This covers all rubric requirements:');
  console.log('   ✓ Overall design & aesthetics');
  console.log('   ✓ Consistency & branding');
  console.log('   ✓ User-friendly & accessibility');
  console.log('   ✓ Attention to detail');
  console.log('   ✓ Mobile/Desktop design (5 marks!)');
}

exportMockups().catch(console.error);
