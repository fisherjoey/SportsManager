const { chromium } = require('playwright');

async function debugFrontend() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const pages = [
    { name: 'homepage', url: 'http://localhost:3000' },
    { name: 'login', url: 'http://localhost:3000/login' },
    { name: 'expenses', url: 'http://localhost:3000/expenses' },
    { name: 'expense-approvals', url: 'http://localhost:3000/expense-approvals' },
    { name: 'budget', url: 'http://localhost:3000/budget' },
  ];

  console.log('🔍 Starting frontend debugging...\n');

  for (const pageInfo of pages) {
    try {
      console.log(`📄 Testing ${pageInfo.name} at ${pageInfo.url}`);
      
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      
      // Check for errors
      const errors = await page.evaluate(() => {
        return window.console.errors || [];
      });
      
      // Take screenshot
      await page.screenshot({ 
        path: `debug-${pageInfo.name}.png`,
        fullPage: true 
      });
      
      // Get page title and status
      const title = await page.title();
      const url = await page.url();
      
      console.log(`  ✅ Title: ${title}`);
      console.log(`  🔗 Final URL: ${url}`);
      console.log(`  📸 Screenshot saved: debug-${pageInfo.name}.png`);
        
      if (errors.length > 0) {
        console.log(`  ❌ Errors found:`, errors);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ Failed to load ${pageInfo.name}: ${error.message}`);
      console.log('');
    }
  }

  await browser.close();
  console.log('🎯 Frontend debugging complete! Check the debug-*.png files.');
}

debugFrontend().catch(console.error);