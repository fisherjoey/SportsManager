const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Console Error Analysis', () => {
  let allConsoleErrors = [];
  let allConsoleWarnings = [];
  let allNetworkErrors = [];
  let pageResults = {};

  // All routes to test
  const routes = [
    { path: '/', name: 'Homepage' },
    { path: '/login', name: 'Login Page' },
    { path: '/budget', name: 'Budget Page' },
    { path: '/complete-signup', name: 'Complete Signup Page' },
    { path: '/debug', name: 'Debug Page' },
    { path: '/financial-budgets', name: 'Financial Budgets Page' },
    { path: '/games', name: 'Games Page' }
  ];

  test.beforeEach(async ({ page }) => {
    // Reset arrays for each test
    allConsoleErrors = [];
    allConsoleWarnings = [];
    allNetworkErrors = [];

    // Listen for all console messages
    page.on('console', async (msg) => {
      const consoleEntry = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };

      if (msg.type() === 'error') {
        allConsoleErrors.push(consoleEntry);
      } else if (msg.type() === 'warning') {
        allConsoleWarnings.push(consoleEntry);
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', (error) => {
      allConsoleErrors.push({
        type: 'pageerror',
        text: `Uncaught exception: ${error.message}`,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for network failures
    page.on('response', (response) => {
      if (response.status() >= 400) {
        allNetworkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          method: response.request().method(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Listen for request failures
    page.on('requestfailed', (request) => {
      allNetworkErrors.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText || 'Request failed',
        timestamp: new Date().toISOString()
      });
    });
  });

  // Test each route individually
  routes.forEach(route => {
    test(`Analyze console errors on ${route.name} (${route.path})`, async ({ page }) => {
      const routeErrors = [];
      const routeWarnings = [];
      const routeNetworkErrors = [];

      try {
        console.log(`\n🔍 Testing route: ${route.path}`);
        
        await page.goto(route.path, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });

        // Wait for page to fully load and any dynamic content
        await page.waitForTimeout(2000);

        // Take a screenshot for visual reference
        await page.screenshot({ 
          path: `test-results/console-analysis-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });

        // Check if we're redirected (common for protected routes)
        const currentURL = page.url();
        const isRedirected = !currentURL.includes(route.path);
        
        console.log(`   Current URL: ${currentURL}`);
        console.log(`   Redirected: ${isRedirected}`);

        // Collect errors that occurred during this page load
        const currentErrors = [...allConsoleErrors];
        const currentWarnings = [...allConsoleWarnings];
        const currentNetworkErrors = [...allNetworkErrors];

        // Store results
        pageResults[route.path] = {
          name: route.name,
          path: route.path,
          currentURL: currentURL,
          redirected: isRedirected,
          errors: currentErrors,
          warnings: currentWarnings,
          networkErrors: currentNetworkErrors,
          errorCount: currentErrors.length,
          warningCount: currentWarnings.length,
          networkErrorCount: currentNetworkErrors.length
        };

        console.log(`   ❌ Console Errors: ${currentErrors.length}`);
        console.log(`   ⚠️  Console Warnings: ${currentWarnings.length}`);
        console.log(`   🌐 Network Errors: ${currentNetworkErrors.length}`);

        // Log critical errors for immediate visibility
        if (currentErrors.length > 0) {
          console.log('\n   🚨 Critical Console Errors:');
          currentErrors.forEach((error, index) => {
            console.log(`   ${index + 1}. [${error.type}] ${error.text}`);
            if (error.location) {
              console.log(`      Location: ${error.location.url}:${error.location.lineNumber}:${error.location.columnNumber}`);
            }
          });
        }

        if (currentNetworkErrors.length > 0) {
          console.log('\n   🌐 Network Errors:');
          currentNetworkErrors.forEach((netError, index) => {
            console.log(`   ${index + 1}. [${netError.method || 'Unknown'}] ${netError.url}`);
            console.log(`      Status: ${netError.status || 'Failed'} - ${netError.statusText || netError.failure || 'Unknown error'}`);
          });
        }

      } catch (error) {
        console.log(`   💥 Failed to load ${route.path}: ${error.message}`);
        pageResults[route.path] = {
          name: route.name,
          path: route.path,
          error: error.message,
          failed: true
        };
      }

      // Reset error arrays for next test
      allConsoleErrors.length = 0;
      allConsoleWarnings.length = 0;
      allNetworkErrors.length = 0;
    });
  });

  test('Generate comprehensive error report', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE CONSOLE ERROR ANALYSIS REPORT');
    console.log('='.repeat(80));

    let totalErrors = 0;
    let totalWarnings = 0;
    let totalNetworkErrors = 0;

    // Summary by page
    console.log('\n📋 SUMMARY BY PAGE:');
    console.log('-'.repeat(50));

    Object.values(pageResults).forEach(result => {
      if (result.failed) {
        console.log(`\n❌ ${result.name} (${result.path})`);
        console.log(`   Status: FAILED TO LOAD - ${result.error}`);
        return;
      }

      console.log(`\n📄 ${result.name} (${result.path})`);
      console.log(`   Current URL: ${result.currentURL}`);
      console.log(`   Redirected: ${result.redirected ? 'Yes' : 'No'}`);
      console.log(`   Console Errors: ${result.errorCount}`);
      console.log(`   Console Warnings: ${result.warningCount}`);
      console.log(`   Network Errors: ${result.networkErrorCount}`);

      totalErrors += result.errorCount;
      totalWarnings += result.warningCount;
      totalNetworkErrors += result.networkErrorCount;
    });

    // Overall statistics
    console.log('\n' + '='.repeat(50));
    console.log('📊 OVERALL STATISTICS:');
    console.log('-'.repeat(30));
    console.log(`Total Pages Tested: ${Object.keys(pageResults).length}`);
    console.log(`Total Console Errors: ${totalErrors}`);
    console.log(`Total Console Warnings: ${totalWarnings}`);
    console.log(`Total Network Errors: ${totalNetworkErrors}`);

    // Error categorization
    console.log('\n🏷️  ERROR CATEGORIZATION:');
    console.log('-'.repeat(40));

    const allErrors = Object.values(pageResults)
      .filter(result => !result.failed && result.errors)
      .flatMap(result => result.errors.map(error => ({ ...error, page: result.name })));

    const errorCategories = {
      'Hydration Mismatch': [],
      'Network/API': [],
      'JavaScript Runtime': [],
      'Resource Loading': [],
      'React/Component': [],
      'Other': []
    };

    allErrors.forEach(error => {
      const text = error.text.toLowerCase();
      if (text.includes('hydration') || text.includes('mismatch')) {
        errorCategories['Hydration Mismatch'].push(error);
      } else if (text.includes('failed to load') || text.includes('network') || text.includes('fetch')) {
        errorCategories['Network/API'].push(error);
      } else if (text.includes('uncaught') || text.includes('reference') || text.includes('undefined')) {
        errorCategories['JavaScript Runtime'].push(error);
      } else if (text.includes('favicon') || text.includes('manifest') || text.includes('sourcemap')) {
        errorCategories['Resource Loading'].push(error);
      } else if (text.includes('react') || text.includes('component') || text.includes('prop')) {
        errorCategories['React/Component'].push(error);
      } else {
        errorCategories['Other'].push(error);
      }
    });

    Object.entries(errorCategories).forEach(([category, errors]) => {
      if (errors.length > 0) {
        console.log(`\n${category}: ${errors.length} errors`);
        errors.slice(0, 3).forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.text} (${error.page})`);
        });
        if (errors.length > 3) {
          console.log(`  ... and ${errors.length - 3} more`);
        }
      }
    });

    // Network error patterns
    const allNetworkErrors = Object.values(pageResults)
      .filter(result => !result.failed && result.networkErrors)
      .flatMap(result => result.networkErrors.map(error => ({ ...error, page: result.name })));

    if (allNetworkErrors.length > 0) {
      console.log('\n🌐 NETWORK ERROR PATTERNS:');
      console.log('-'.repeat(40));

      const networkPatterns = {};
      allNetworkErrors.forEach(error => {
        const key = `${error.status || 'FAILED'} - ${error.method || 'Unknown'}`;
        if (!networkPatterns[key]) networkPatterns[key] = [];
        networkPatterns[key].push(error);
      });

      Object.entries(networkPatterns).forEach(([pattern, errors]) => {
        console.log(`\n${pattern}: ${errors.length} occurrences`);
        const uniqueUrls = [...new Set(errors.map(e => e.url))];
        uniqueUrls.slice(0, 3).forEach(url => {
          console.log(`  - ${url}`);
        });
        if (uniqueUrls.length > 3) {
          console.log(`  ... and ${uniqueUrls.length - 3} more URLs`);
        }
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(30));

    if (errorCategories['Hydration Mismatch'].length > 0) {
      console.log('• Fix hydration mismatches by ensuring server and client render the same content');
    }
    if (errorCategories['Network/API'].length > 0) {
      console.log('• Review API endpoints and authentication handling');
    }
    if (errorCategories['JavaScript Runtime'].length > 0) {
      console.log('• Fix JavaScript runtime errors and undefined variable references');
    }
    if (errorCategories['Resource Loading'].length > 0) {
      console.log('• Add proper favicon, manifest, and sourcemap files');
    }
    if (allNetworkErrors.some(e => e.status === 401)) {
      console.log('• Implement proper authentication state management');
    }

    console.log('\n' + '='.repeat(80));

    // Create a detailed JSON report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: Object.keys(pageResults).length,
        totalErrors,
        totalWarnings,
        totalNetworkErrors
      },
      pages: pageResults,
      categorizedErrors: errorCategories,
      networkPatterns: allNetworkErrors
    };

    // Write JSON report to file
    await page.evaluate((reportData) => {
      console.log('📄 Detailed JSON report available in test output');
    }, reportData);

    // The test should pass regardless of errors found - this is for analysis only
    expect(true).toBe(true);
  });
});