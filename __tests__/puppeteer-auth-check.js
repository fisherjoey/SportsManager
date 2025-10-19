const puppeteer = require('puppeteer');

const credentials = {
  email: 'admin@cmba.ca',
  password: 'password'
};

const pages = [
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

async function checkAuthenticatedPages() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const allLogs = {};

  // Listen for console messages
  page.on('console', msg => {
    const url = page.url();
    if (!allLogs[url]) {
      allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
    }

    const text = msg.text();
    const type = msg.type();

    if (type === 'error') {
      allLogs[url].errors.push(text);
    } else if (type === 'warning') {
      allLogs[url].warnings.push(text);
    } else if (type === 'log' && text.includes('Error')) {
      allLogs[url].errors.push(text);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    const url = page.url();
    if (!allLogs[url]) {
      allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
    }
    allLogs[url].errors.push(error.message);
  });

  // Listen for request failures
  page.on('requestfailed', request => {
    const url = page.url();
    if (!allLogs[url]) {
      allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
    }
    const failureText = request.failure() ? request.failure().errorText : 'Unknown';
    allLogs[url].network.push(`Failed to load ${request.url()} - ${failureText}`);
  });

  // Listen for responses to catch API errors
  page.on('response', response => {
    if (response.status() >= 400) {
      const url = page.url();
      if (!allLogs[url]) {
        allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
      }
      allLogs[url].network.push(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  console.log('Puppeteer Authenticated Console Check\n');
  console.log('========================================\n');

  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Perform login
    console.log(`Logging in as ${credentials.email}...`);

    // Type email
    await page.type('input[type="email"], input[name="email"]', credentials.email);

    // Type password
    await page.type('input[type="password"], input[name="password"]', credentials.password);

    // Click submit button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);

    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('❌ Login failed - still on login page');

      // Try to capture error message
      const errorMessage = await page.evaluate(() => {
        const errorElement = document.querySelector('.error, .alert-danger, [role="alert"]');
        return errorElement ? errorElement.textContent : null;
      });

      if (errorMessage) {
        console.log(`Error message: ${errorMessage}`);
      }
    } else {
      console.log('✅ Login successful');
      console.log(`Redirected to: ${currentUrl}\n`);
    }

    // Check all protected pages
    for (const path of pages) {
      const url = `http://localhost:3000${path}`;
      console.log(`Checking: ${url}`);

      try {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for any async operations
        await page.waitForTimeout(2000);

        // Check if redirected to login (unauthorized)
        const finalUrl = page.url();
        if (finalUrl.includes('/login')) {
          console.log(`  ⚠️ Redirected to login - unauthorized`);
          if (!allLogs[url]) {
            allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
          }
          allLogs[url].errors.push('Unauthorized - redirected to login');
        }

        // Count issues for this page
        const pageErrors = allLogs[url]?.errors?.length || 0;
        const pageWarnings = allLogs[url]?.warnings?.length || 0;
        const pageNetwork = allLogs[url]?.network?.length || 0;

        if (pageErrors === 0 && pageWarnings === 0 && pageNetwork === 0) {
          console.log(`  ✅ Page loaded successfully - no issues`);
        } else {
          if (pageErrors > 0) console.log(`  ❌ ${pageErrors} errors`);
          if (pageWarnings > 0) console.log(`  ⚠️  ${pageWarnings} warnings`);
          if (pageNetwork > 0) console.log(`  🌐 ${pageNetwork} network issues`);
        }

      } catch (error) {
        console.log(`  ❌ Failed to load: ${error.message}`);
        if (!allLogs[url]) {
          allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
        }
        allLogs[url].errors.push(`Navigation failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n========================================');
  console.log('DETAILED AUTHENTICATED CONSOLE REPORT');
  console.log('========================================\n');

  const hasIssues = Object.keys(allLogs).some(url => {
    const log = allLogs[url];
    return log.errors.length > 0 || log.warnings.length > 0 || log.network.length > 0;
  });

  if (!hasIssues) {
    console.log('✅ No console errors found on any authenticated page!\n');
  } else {
    for (const [url, logs] of Object.entries(allLogs)) {
      if (logs.errors.length === 0 && logs.warnings.length === 0 && logs.network.length === 0) {
        continue;
      }

      console.log(`\n${url}:`);

      if (logs.errors.length > 0) {
        console.log('\n  ERRORS:');
        logs.errors.forEach((error, idx) => {
          console.log(`    ${idx + 1}. ${error}`);
        });
      }

      if (logs.warnings.length > 0) {
        console.log('\n  WARNINGS:');
        logs.warnings.forEach((warning, idx) => {
          console.log(`    ${idx + 1}. ${warning}`);
        });
      }

      if (logs.network.length > 0) {
        console.log('\n  NETWORK ISSUES:');
        logs.network.forEach((issue, idx) => {
          console.log(`    ${idx + 1}. ${issue}`);
        });
      }
    }
  }

  // Summary
  const totalErrors = Object.values(allLogs).reduce((sum, logs) => sum + logs.errors.length, 0);
  const totalWarnings = Object.values(allLogs).reduce((sum, logs) => sum + logs.warnings.length, 0);
  const totalNetwork = Object.values(allLogs).reduce((sum, logs) => sum + logs.network.length, 0);

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Authenticated pages checked: ${pages.length}`);
  console.log(`Pages with issues: ${Object.keys(allLogs).filter(url => {
    const log = allLogs[url];
    return log.errors.length > 0 || log.warnings.length > 0 || log.network.length > 0;
  }).length}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total warnings: ${totalWarnings}`);
  console.log(`Total network issues: ${totalNetwork}`);

  // Save to JSON
  const report = {
    timestamp: new Date().toISOString(),
    credentials: { email: credentials.email },
    pages: pages,
    logs: allLogs,
    summary: {
      totalPages: pages.length,
      pagesWithIssues: Object.keys(allLogs).filter(url => {
        const log = allLogs[url];
        return log.errors.length > 0 || log.warnings.length > 0 || log.network.length > 0;
      }).length,
      totalErrors,
      totalWarnings,
      totalNetwork
    }
  };

  require('fs').writeFileSync(
    'puppeteer-authenticated-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Detailed report saved to puppeteer-authenticated-report.json');
}

checkAuthenticatedPages().catch(console.error);