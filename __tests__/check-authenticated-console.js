const CDP = require('chrome-remote-interface');

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

async function checkAuthenticatedConsole() {
  let client;
  const allLogs = {};

  try {
    // Connect to Chrome DevTools
    client = await CDP();
    const { Page, Runtime, Console, Network } = client;

    // Enable necessary domains
    await Promise.all([
      Page.enable(),
      Runtime.enable(),
      Console.enable(),
      Network.enable()
    ]);

    // Track console messages
    const currentLogs = { errors: [], warnings: [], logs: [], network: [] };

    Console.messageAdded(({ message }) => {
      if (message.level === 'error') {
        currentLogs.errors.push(message.text);
      } else if (message.level === 'warning') {
        currentLogs.warnings.push(message.text);
      } else {
        currentLogs.logs.push(message.text);
      }
    });

    // Track runtime exceptions
    Runtime.exceptionThrown(({ exceptionDetails }) => {
      currentLogs.errors.push(`Runtime Exception: ${exceptionDetails.exception?.description || exceptionDetails.text}`);
    });

    // Track network failures
    Network.loadingFailed(({ errorText, type, url }) => {
      currentLogs.network.push(`Failed to load ${type}: ${url} - ${errorText}`);
    });

    // Track network responses for API errors
    Network.responseReceived(({ response }) => {
      if (response.status >= 400) {
        currentLogs.network.push(`HTTP ${response.status} - ${response.url}`);
      }
    });

    console.log('Chrome DevTools Authenticated Console Check\n');
    console.log('========================================\n');

    // First, navigate to login page
    console.log('Navigating to login page...');
    await Page.navigate({ url: 'http://localhost:3000/login' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear logs from login page navigation
    currentLogs.errors = [];
    currentLogs.warnings = [];
    currentLogs.logs = [];
    currentLogs.network = [];

    // Perform login
    console.log(`Logging in as ${credentials.email}...`);

    // Fill in email and password using JavaScript
    await Runtime.evaluate({
      expression: `
        const emailInput = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="email" i]');
        const passwordInput = document.querySelector('input[type="password"], input[name="password"], input[placeholder*="password" i]');

        if (emailInput && passwordInput) {
          emailInput.value = '${credentials.email}';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));

          passwordInput.value = '${credentials.password}';
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

          // Submit the form
          const form = emailInput.closest('form');
          const submitButton = form ? form.querySelector('button[type="submit"], button') : null;

          if (submitButton) {
            submitButton.click();
          } else if (form) {
            form.submit();
          }
        } else {
          console.error('Could not find email or password input fields');
        }
      `
    });

    // Wait for navigation after login
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if login was successful
    const currentUrl = await Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });

    if (currentUrl.result.value.includes('/login')) {
      console.log('⚠️ Login may have failed - still on login page');

      // Capture any login errors
      const loginErrors = [...currentLogs.errors];
      if (loginErrors.length > 0) {
        allLogs['/login'] = {
          errors: loginErrors,
          warnings: currentLogs.warnings,
          logs: currentLogs.logs,
          network: currentLogs.network
        };
      }
    } else {
      console.log('✅ Login successful\n');
    }

    // Now check all protected pages
    for (const path of pages) {
      const url = `http://localhost:3000${path}`;
      console.log(`Checking: ${url}`);

      // Clear previous logs
      currentLogs.errors = [];
      currentLogs.warnings = [];
      currentLogs.logs = [];
      currentLogs.network = [];

      try {
        await Page.navigate({ url });
        await Page.loadEventFired();

        // Wait for any async operations
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check for client-side errors
        const clientErrors = await Runtime.evaluate({
          expression: `
            (() => {
              const errors = [];
              if (window.errors) errors.push(...window.errors);
              // Check if we're redirected to login (unauthorized)
              if (window.location.pathname === '/login') {
                errors.push('Redirected to login - unauthorized access');
              }
              return errors;
            })()
          `,
          returnByValue: true
        });

        if (clientErrors.result && clientErrors.result.value && clientErrors.result.value.length > 0) {
          currentLogs.errors.push(...clientErrors.result.value);
        }

        // Store logs for this page if any issues found
        if (currentLogs.errors.length > 0 || currentLogs.warnings.length > 0 || currentLogs.network.length > 0) {
          allLogs[url] = {
            errors: [...currentLogs.errors],
            warnings: [...currentLogs.warnings],
            logs: [...currentLogs.logs],
            network: [...currentLogs.network]
          };
        }

        console.log(`  ✓ Page loaded`);
        if (currentLogs.errors.length > 0) {
          console.log(`  ❌ ${currentLogs.errors.length} errors found`);
        }
        if (currentLogs.warnings.length > 0) {
          console.log(`  ⚠️  ${currentLogs.warnings.length} warnings found`);
        }
        if (currentLogs.network.length > 0) {
          console.log(`  🌐 ${currentLogs.network.length} network issues`);
        }

      } catch (error) {
        console.log(`  ❌ Failed to load: ${error.message}`);
        allLogs[url] = {
          errors: [`Navigation failed: ${error.message}`],
          warnings: [],
          logs: [],
          network: []
        };
      }
    }

    console.log('\n========================================');
    console.log('DETAILED AUTHENTICATED CONSOLE REPORT');
    console.log('========================================\n');

    // Generate detailed report
    if (Object.keys(allLogs).length === 0) {
      console.log('✅ No console errors found on any authenticated page!\n');
    } else {
      for (const [url, logs] of Object.entries(allLogs)) {
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
    const totalNetworkIssues = Object.values(allLogs).reduce((sum, logs) => sum + logs.network.length, 0);

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Authenticated pages checked: ${pages.length}`);
    console.log(`Pages with issues: ${Object.keys(allLogs).length}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total warnings: ${totalWarnings}`);
    console.log(`Total network issues: ${totalNetworkIssues}`);

    // Save to JSON
    const report = {
      timestamp: new Date().toISOString(),
      credentials: { email: credentials.email },
      pages: pages,
      logs: allLogs,
      summary: {
        totalPages: pages.length,
        pagesWithIssues: Object.keys(allLogs).length,
        totalErrors,
        totalWarnings,
        totalNetworkIssues
      }
    };

    require('fs').writeFileSync(
      'authenticated-console-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Detailed report saved to authenticated-console-report.json');

  } catch (error) {
    console.error('Failed to connect to Chrome DevTools:', error);
    console.log('\nMake sure Chrome is running with remote debugging enabled:');
    console.log('chrome.exe --remote-debugging-port=9222');
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkAuthenticatedConsole().catch(console.error);