const https = require('http');
const fs = require('fs').promises;
const path = require('path');

// Pages to export - these will be basic HTML fetches
const pagesToExport = [
  { url: 'http://localhost:3000/login', name: 'login' },
  { url: 'http://localhost:3000/games', name: 'games' },
  { url: 'http://localhost:3000/admin-users', name: 'admin-users' },
  { url: 'http://localhost:3000/admin-roles', name: 'admin-roles' },
  { url: 'http://localhost:3000/notifications', name: 'notifications' },
  { url: 'http://localhost:3000', name: 'dashboard' },
];

async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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

  console.log('📄 Fetching HTML from pages...\n');

  for (const page of pagesToExport) {
    try {
      console.log(`Exporting: ${page.name} from ${page.url}`);

      const html = await fetchHTML(page.url);

      // Save HTML file
      const htmlPath = path.join(outputDir, `${page.name}.html`);
      await fs.writeFile(htmlPath, html, 'utf-8');
      console.log(`   ✅ Saved: ${htmlPath}`);
    } catch (err) {
      console.error(`   ❌ Error exporting ${page.name}:`, err.message);
    }
  }

  console.log('\n✅ Export complete! Check the figma-exports folder.');
  console.log('\n📋 Next steps:');
  console.log('   1. Open Figma');
  console.log('   2. Install the "html.to.design" plugin from:');
  console.log('      https://www.figma.com/community/plugin/1159123024924461424/html-to-design');
  console.log('   3. Use the plugin to import HTML files from figma-exports/');
  console.log('\n⚠️  Note: This simple version fetches the initial HTML.');
  console.log('   For fully rendered React components with styles, use export-html.js with Puppeteer.');
}

exportHTML().catch(console.error);
