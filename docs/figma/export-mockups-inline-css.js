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

// Viewports for responsive design
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

  await page.type('#email', LOGIN_EMAIL);
  await page.type('#password', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('  ✅ Logged in successfully');
}

async function getInlineCSS(page) {
  // Get all computed styles and inline them
  return await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const styleMap = new Map();

    allElements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      const inlineStyle = {};

      // Copy all computed styles
      for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i];
        inlineStyle[prop] = computedStyle.getPropertyValue(prop);
      }

      // Apply inline styles
      let styleString = '';
      for (const [prop, value] of Object.entries(inlineStyle)) {
        styleString += `${prop}:${value};`;
      }
      el.setAttribute('style', styleString);
    });

    // Remove external stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());

    return document.documentElement.outerHTML;
  });
}

async function exportMockups() {
  const outputDir = path.join(__dirname, 'figma-mockups-inline');

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

  const loginPage = await browser.newPage();
  let isLoggedIn = false;

  try {
    await login(loginPage);
    isLoggedIn = true;
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    console.log('⚠️ Will only export non-authenticated pages\n');
  }

  const cookies = isLoggedIn ? await loginPage.cookies() : [];
  await loginPage.close();

  for (const pageConfig of pagesToExport) {
    if (pageConfig.auth && !isLoggedIn) {
      console.log(`⏭️ Skipping ${pageConfig.name} (requires authentication)\n`);
      continue;
    }

    console.log(`📄 Exporting: ${pageConfig.name}`);

    for (const viewport of viewports) {
      try {
        const page = await browser.newPage();

        if (pageConfig.auth && cookies.length > 0) {
          await page.setCookie(...cookies);
        }

        await page.setViewport({ width: viewport.width, height: viewport.height });

        await page.goto(pageConfig.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get HTML with inlined CSS
        const htmlWithInlineCSS = await getInlineCSS(page);

        // Save HTML file
        const htmlPath = path.join(outputDir, `${pageConfig.name}-${viewport.name}.html`);
        await fs.writeFile(htmlPath, htmlWithInlineCSS, 'utf-8');
        console.log(`   ✅ ${viewport.name}: Saved HTML with inline CSS`);

        // Take screenshot
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

  console.log('\n✅ Export complete! Check the figma-mockups-inline folder.');
  console.log('\n📋 These HTML files have ALL CSS inlined and will work with html.to.design!');
  console.log('\n💡 Files saved to: figma-mockups-inline/');
}

exportMockups().catch(console.error);
