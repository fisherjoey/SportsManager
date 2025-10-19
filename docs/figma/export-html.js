const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Pages to export - add or remove as needed
const pagesToExport = [
  { url: 'http://localhost:3000/login', name: 'login' },
  { url: 'http://localhost:3000/games', name: 'games' },
  { url: 'http://localhost:3000/admin-users', name: 'admin-users' },
  { url: 'http://localhost:3000/admin-roles', name: 'admin-roles' },
  { url: 'http://localhost:3000/notifications', name: 'notifications' },
  { url: 'http://localhost:3000', name: 'dashboard' },
];

async function exportHTML() {
  const outputDir = path.join(__dirname, 'figma-exports');

  // Create output directory
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${outputDir}`);
  } catch (err) {
    console.error('Error creating directory:', err);
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('🌐 Browser launched...');

  for (const page of pagesToExport) {
    try {
      console.log(`\n📄 Exporting: ${page.name} from ${page.url}`);

      const browserPage = await browser.newPage();

      // Set viewport to common desktop size
      await browserPage.setViewport({ width: 1920, height: 1080 });

      // Navigate to page
      await browserPage.goto(page.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait a bit for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the full HTML
      const html = await browserPage.content();

      // Save HTML file
      const htmlPath = path.join(outputDir, `${page.name}.html`);
      await fs.writeFile(htmlPath, html, 'utf-8');
      console.log(`   ✅ Saved HTML: ${htmlPath}`);

      // Also take a screenshot for reference
      const screenshotPath = path.join(outputDir, `${page.name}.png`);
      await browserPage.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      console.log(`   ✅ Saved screenshot: ${screenshotPath}`);

      await browserPage.close();
    } catch (err) {
      console.error(`   ❌ Error exporting ${page.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('\n✅ Export complete! Check the figma-exports folder.');
  console.log('\n📋 Next steps:');
  console.log('   1. Open Figma');
  console.log('   2. Install the "html.to.design" plugin');
  console.log('   3. Import the HTML files from figma-exports/');
}

exportHTML().catch(console.error);
