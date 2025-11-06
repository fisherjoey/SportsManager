const puppeteer = require('puppeteer');

const pages = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/games',
  '/referees',
  '/assignors',
  '/mentorships',
  '/my-mentees',
  '/settings',
  '/receipt-upload',
  '/analytics',
  '/reporting',
  '/audit-logs'
];

async function checkConsoleErrors() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const allErrors = {};
  const allWarnings = {};
  const allLogs = {};

  // Listen for console messages
  page.on('console', msg => {
    const url = page.url();
    const text = msg.text();
    const type = msg.type();

    if (type === 'error') {
      if (!allErrors[url]) allErrors[url] = [];
      allErrors[url].push(text);
    } else if (type === 'warning') {
      if (!allWarnings[url]) allWarnings[url] = [];
      allWarnings[url].push(text);
    } else if (type === 'log') {
      if (!allLogs[url]) allLogs[url] = [];
      allLogs[url].push(text);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    const url = page.url();
    if (!allErrors[url]) allErrors[url] = [];
    allErrors[url].push(error.message);
  });

  // Listen for request failures
  page.on('requestfailed', request => {
    const url = page.url();
    if (!allErrors[url]) allErrors[url] = [];
    allErrors[url].push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
  });

  console.log('Starting console error check for all pages...\n');

  for (const path of pages) {
    const url = `http://localhost:3000${path}`;
    console.log(`Checking: ${url}`);

    try {
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait a bit for any async operations
      await page.waitForTimeout(2000);

      // Try to capture any client-side errors
      const clientErrors = await page.evaluate(() => {
        const errors = [];
        if (window.errors) errors.push(...window.errors);
        return errors;
      });

      if (clientErrors.length > 0) {
        if (!allErrors[url]) allErrors[url] = [];
        allErrors[url].push(...clientErrors);
      }

    } catch (error) {
      console.log(`  Error loading ${url}: ${error.message}`);
      if (!allErrors[url]) allErrors[url] = [];
      allErrors[url].push(`Navigation error: ${error.message}`);
    }
  }

  await browser.close();

  // Generate report
  console.log('\n========================================');
  console.log('CONSOLE ERROR REPORT');
  console.log('========================================\n');

  if (Object.keys(allErrors).length === 0) {
    console.log('✅ No console errors found on any page!\n');
  } else {
    console.log('❌ ERRORS FOUND:\n');
    for (const [url, errors] of Object.entries(allErrors)) {
      console.log(`\n${url}:`);
      errors.forEach((error, idx) => {
        console.log(`  ${idx + 1}. ${error}`);
      });
    }
  }

  if (Object.keys(allWarnings).length > 0) {
    console.log('\n⚠️ WARNINGS:\n');
    for (const [url, warnings] of Object.entries(allWarnings)) {
      console.log(`\n${url}:`);
      warnings.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total pages checked: ${pages.length}`);
  console.log(`Pages with errors: ${Object.keys(allErrors).length}`);
  console.log(`Pages with warnings: ${Object.keys(allWarnings).length}`);
  console.log(`Total errors: ${Object.values(allErrors).flat().length}`);
  console.log(`Total warnings: ${Object.values(allWarnings).flat().length}`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    pagesChecked: pages,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      totalPages: pages.length,
      pagesWithErrors: Object.keys(allErrors).length,
      pagesWithWarnings: Object.keys(allWarnings).length,
      totalErrors: Object.values(allErrors).flat().length,
      totalWarnings: Object.values(allWarnings).flat().length
    }
  };

  require('fs').writeFileSync(
    'console-error-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Detailed report saved to console-error-report.json');
}

checkConsoleErrors().catch(console.error);