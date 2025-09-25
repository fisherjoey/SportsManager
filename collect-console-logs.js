const CDP = require('chrome-remote-interface');

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

async function collectConsoleLogs() {
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

    // Listen for console messages
    Console.messageAdded(({ message }) => {
      const url = Page.getResourceTree().then(tree => tree.frameTree.frame.url).catch(() => 'unknown');
      if (!allLogs[url]) {
        allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
      }

      if (message.level === 'error') {
        allLogs[url].errors.push(message.text);
      } else if (message.level === 'warning') {
        allLogs[url].warnings.push(message.text);
      } else {
        allLogs[url].logs.push(message.text);
      }
    });

    // Listen for runtime exceptions
    Runtime.exceptionThrown(({ exceptionDetails }) => {
      const url = Page.getResourceTree().then(tree => tree.frameTree.frame.url).catch(() => 'unknown');
      if (!allLogs[url]) {
        allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
      }
      allLogs[url].errors.push(`Runtime Exception: ${exceptionDetails.exception.description || exceptionDetails.text}`);
    });

    // Listen for network failures
    Network.loadingFailed(({ requestId, errorText, type }) => {
      const url = Page.getResourceTree().then(tree => tree.frameTree.frame.url).catch(() => 'unknown');
      if (!allLogs[url]) {
        allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
      }
      allLogs[url].network.push(`Failed to load ${type}: ${errorText}`);
    });

    console.log('Chrome DevTools Console Log Collection\n');
    console.log('========================================\n');

    // Navigate to each page
    for (const path of pages) {
      const url = `http://localhost:3000${path}`;
      console.log(`Navigating to: ${url}`);

      if (!allLogs[url]) {
        allLogs[url] = { errors: [], warnings: [], logs: [], network: [] };
      }

      try {
        await Page.navigate({ url });
        await Page.loadEventFired();

        // Wait for any async operations
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Evaluate page for any client-side errors
        const clientErrors = await Runtime.evaluate({
          expression: `
            (() => {
              const errors = [];
              if (window.errors) errors.push(...window.errors);
              if (window.console && window.console._errors) errors.push(...window.console._errors);
              return errors;
            })()
          `,
          returnByValue: true
        });

        if (clientErrors.result && clientErrors.result.value && clientErrors.result.value.length > 0) {
          allLogs[url].errors.push(...clientErrors.result.value);
        }

        console.log(`  ✓ Page loaded`);
        if (allLogs[url].errors.length > 0) {
          console.log(`  ❌ ${allLogs[url].errors.length} errors found`);
        }
        if (allLogs[url].warnings.length > 0) {
          console.log(`  ⚠️  ${allLogs[url].warnings.length} warnings found`);
        }

      } catch (error) {
        console.log(`  ❌ Failed to load: ${error.message}`);
        allLogs[url].errors.push(`Navigation failed: ${error.message}`);
      }
    }

    console.log('\n========================================');
    console.log('DETAILED CONSOLE LOG REPORT');
    console.log('========================================\n');

    // Generate detailed report
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
        console.log('\n  NETWORK FAILURES:');
        logs.network.forEach((failure, idx) => {
          console.log(`    ${idx + 1}. ${failure}`);
        });
      }
    }

    // Summary
    const totalErrors = Object.values(allLogs).reduce((sum, logs) => sum + logs.errors.length, 0);
    const totalWarnings = Object.values(allLogs).reduce((sum, logs) => sum + logs.warnings.length, 0);
    const totalNetworkFailures = Object.values(allLogs).reduce((sum, logs) => sum + logs.network.length, 0);

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Pages checked: ${pages.length}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total warnings: ${totalWarnings}`);
    console.log(`Total network failures: ${totalNetworkFailures}`);

    // Save to JSON
    const report = {
      timestamp: new Date().toISOString(),
      pages: pages,
      logs: allLogs,
      summary: {
        totalPages: pages.length,
        totalErrors,
        totalWarnings,
        totalNetworkFailures
      }
    };

    require('fs').writeFileSync(
      'chrome-console-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Detailed report saved to chrome-console-report.json');

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

collectConsoleLogs().catch(console.error);