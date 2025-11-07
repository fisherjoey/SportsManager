const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Import the pages from the test file
const { pages, loginCredentials } = require('./test-all-pages.js');

class FrontendTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.testResults = [];
    this.startTime = null;
    this.totalErrors = 0;
    this.screenshotDir = path.join(__dirname, 'test-screenshots');
  }

  async initialize() {
    console.log('🚀 Initializing Frontend Testing Framework...');

    // Create screenshots directory
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    // Launch browser with comprehensive error capturing
    this.browser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    this.page = await this.context.newPage();

    // Set up error capturing
    this.setupErrorCapturing();

    console.log('✅ Browser initialized successfully');
  }

  setupErrorCapturing() {
    // Capture console errors
    this.page.on('console', async (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        const url = this.page.url();
        const error = {
          type: 'Console Error',
          level: msg.type(),
          message: msg.text(),
          url: url,
          timestamp: new Date().toISOString(),
          location: msg.location()
        };
        this.logError(error);
      }
    });

    // Capture JavaScript exceptions
    this.page.on('pageerror', async (error) => {
      const url = this.page.url();
      const errorData = {
        type: 'JavaScript Exception',
        message: error.message,
        stack: error.stack,
        url: url,
        timestamp: new Date().toISOString()
      };
      this.logError(errorData);
    });

    // Capture network failures
    this.page.on('response', async (response) => {
      const status = response.status();
      if (status >= 400) {
        const url = this.page.url();
        const error = {
          type: 'Network Error',
          status: status,
          statusText: response.statusText(),
          requestUrl: response.url(),
          pageUrl: url,
          timestamp: new Date().toISOString()
        };
        this.logError(error);
      }
    });

    // Capture request failures
    this.page.on('requestfailed', async (request) => {
      const url = this.page.url();
      const error = {
        type: 'Request Failed',
        message: request.failure()?.errorText || 'Unknown request failure',
        requestUrl: request.url(),
        pageUrl: url,
        timestamp: new Date().toISOString()
      };
      this.logError(error);
    });
  }

  logError(error) {
    this.totalErrors++;

    // Find the current test result and add the error
    const currentTest = this.testResults[this.testResults.length - 1];
    if (currentTest) {
      if (!currentTest.errors) {
        currentTest.errors = [];
      }
      currentTest.errors.push(error);
    }

    console.log(`❌ Error captured: ${error.type} - ${error.message || error.statusText}`);
  }

  async login() {
    console.log('🔐 Attempting to login...');

    try {
      await this.page.goto('http://localhost:3000/login', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for login form to be visible
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

      // Fill login credentials
      await this.page.fill('input[type="email"], input[name="email"]', loginCredentials.email);
      await this.page.fill('input[type="password"], input[name="password"]', loginCredentials.password);

      // Submit login form
      await this.page.click('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

      // Wait for navigation after login
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });

      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.log(`❌ Login failed: ${error.message}`);
      this.logError({
        type: 'Login Error',
        message: error.message,
        url: 'http://localhost:3000/login',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async testPage(pageInfo, index) {
    const testResult = {
      index: index + 1,
      name: pageInfo.name,
      url: pageInfo.url,
      status: 'success',
      errors: [],
      loadTime: 0,
      screenshot: null,
      timestamp: new Date().toISOString()
    };

    this.testResults.push(testResult);

    console.log(`\n🔍 Testing ${index + 1}/51: ${pageInfo.name}`);
    console.log(`   URL: ${pageInfo.url}`);

    const startTime = Date.now();

    try {
      // Navigate to the page
      const response = await this.page.goto(pageInfo.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Check if page responded successfully
      if (response && response.status() >= 400) {
        testResult.status = 'failed';
        this.logError({
          type: 'Page Load Error',
          status: response.status(),
          statusText: response.statusText(),
          url: pageInfo.url,
          timestamp: new Date().toISOString()
        });
      }

      // Wait for page to stabilize
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });

      // Additional wait for dynamic content
      await this.page.waitForTimeout(3000);

      testResult.loadTime = Date.now() - startTime;

      // Take screenshot
      const screenshotPath = path.join(this.screenshotDir, `page-${index + 1}-${pageInfo.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`);
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });
      testResult.screenshot = screenshotPath;

      // Check for common error indicators in the page content
      const errorIndicators = await this.page.evaluate(() => {
        const indicators = [];

        // Check for error messages in text content
        const errorTexts = [
          'error', 'Error', 'ERROR',
          'failed', 'Failed', 'FAILED',
          'exception', 'Exception', 'EXCEPTION',
          'unauthorized', 'Unauthorized', 'UNAUTHORIZED',
          'forbidden', 'Forbidden', 'FORBIDDEN',
          '404', '500', '403', '401'
        ];

        const bodyText = document.body ? document.body.textContent || '' : '';
        const lowerBodyText = bodyText.toLowerCase();
        for (const errorText of errorTexts) {
          if (lowerBodyText.includes(errorText.toLowerCase())) {
            indicators.push(`Page contains error text: "${errorText}"`);
          }
        }

        // Check for empty or minimal content
        if (bodyText.trim().length < 50) {
          indicators.push('Page has minimal content (possible render failure)');
        }

        return indicators;
      });

      if (errorIndicators.length > 0) {
        errorIndicators.forEach(indicator => {
          this.logError({
            type: 'Content Error',
            message: indicator,
            url: pageInfo.url,
            timestamp: new Date().toISOString()
          });
        });
      }

      if (testResult.errors.length > 0) {
        testResult.status = 'failed';
        console.log(`   ❌ ${testResult.errors.length} error(s) found`);
      } else {
        console.log(`   ✅ No errors detected (${testResult.loadTime}ms)`);
      }

    } catch (error) {
      testResult.status = 'failed';
      testResult.loadTime = Date.now() - startTime;

      this.logError({
        type: 'Page Test Error',
        message: error.message,
        url: pageInfo.url,
        timestamp: new Date().toISOString()
      });

      console.log(`   ❌ Test failed: ${error.message}`);
    }

    return testResult;
  }

  async runAllTests() {
    this.startTime = Date.now();
    console.log(`\n🧪 Starting comprehensive test of ${pages.length} pages...\n`);

    // Initialize browser
    await this.initialize();

    // Attempt login
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed with tests - login failed');
      await this.cleanup();
      return;
    }

    // Test all pages
    for (let i = 0; i < pages.length; i++) {
      await this.testPage(pages[i], i);

      // Small delay between tests to avoid overwhelming the server
      await this.page.waitForTimeout(1000);
    }

    // Generate report
    await this.generateReport();

    // Cleanup
    await this.cleanup();
  }

  async generateReport() {
    console.log('\n📊 Generating comprehensive error report...');

    const totalTime = Date.now() - this.startTime;
    const successfulPages = this.testResults.filter(r => r.status === 'success' && r.errors.length === 0);
    const pagesWithErrors = this.testResults.filter(r => r.errors.length > 0);

    // Create summary statistics
    const errorTypeStats = {};
    const errorsByPage = {};

    this.testResults.forEach(result => {
      if (result.errors.length > 0) {
        errorsByPage[result.name] = result.errors.length;

        result.errors.forEach(error => {
          if (!errorTypeStats[error.type]) {
            errorTypeStats[error.type] = 0;
          }
          errorTypeStats[error.type]++;
        });
      }
    });

    // Generate Markdown report
    const reportContent = this.generateMarkdownReport({
      totalPages: pages.length,
      successfulPages: successfulPages.length,
      pagesWithErrors: pagesWithErrors.length,
      totalErrors: this.totalErrors,
      totalTime,
      errorTypeStats,
      errorsByPage,
      testResults: this.testResults
    });

    // Write report to file
    const reportPath = path.join(__dirname, 'FRONTEND_ERROR_REPORT.md');
    fs.writeFileSync(reportPath, reportContent);

    console.log(`✅ Report generated: ${reportPath}`);

    // Print summary to console
    this.printSummary({
      totalPages: pages.length,
      successfulPages: successfulPages.length,
      pagesWithErrors: pagesWithErrors.length,
      totalErrors: this.totalErrors,
      totalTime,
      reportPath
    });
  }

  generateMarkdownReport(stats) {
    const { totalPages, successfulPages, pagesWithErrors, totalErrors, totalTime, errorTypeStats, errorsByPage, testResults } = stats;

    return `# Frontend Error Report - Sports Management Application

## Executive Summary

**Test Execution:** ${new Date().toISOString()}
**Total Test Duration:** ${Math.round(totalTime / 1000)}s
**Application URL:** http://localhost:3000

### Results Overview
- **Total Pages Tested:** ${totalPages}
- **Pages Without Errors:** ${successfulPages} (${Math.round((successfulPages / totalPages) * 100)}%)
- **Pages With Errors:** ${pagesWithErrors} (${Math.round((pagesWithErrors / totalPages) * 100)}%)
- **Total Errors Found:** ${totalErrors}

### Error Type Distribution
${Object.entries(errorTypeStats).map(([type, count]) => `- **${type}:** ${count} occurrences`).join('\n')}

### Pages With Most Errors
${Object.entries(errorsByPage)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([page, count]) => `- **${page}:** ${count} errors`)
  .join('\n')}

---

## Detailed Test Results

${testResults.map((result, index) => {
  let section = `### ${result.index}. ${result.name}\n`;
  section += `**URL:** ${result.url}\n`;
  section += `**Status:** ${result.status === 'success' && result.errors.length === 0 ? '✅ PASS' : '❌ FAIL'}\n`;
  section += `**Load Time:** ${result.loadTime}ms\n`;

  if (result.screenshot) {
    section += `**Screenshot:** [View Screenshot](${path.relative(__dirname, result.screenshot)})\n`;
  }

  if (result.errors.length > 0) {
    section += `**Errors Found:** ${result.errors.length}\n\n`;

    result.errors.forEach((error, errorIndex) => {
      section += `#### Error ${errorIndex + 1}: ${error.type}\n`;
      section += `- **Message:** ${error.message || error.statusText || 'No message'}\n`;
      section += `- **Timestamp:** ${error.timestamp}\n`;

      if (error.status) {
        section += `- **HTTP Status:** ${error.status}\n`;
      }

      if (error.requestUrl && error.requestUrl !== error.pageUrl) {
        section += `- **Request URL:** ${error.requestUrl}\n`;
      }

      if (error.stack) {
        section += `- **Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`\n`;
      }

      if (error.location) {
        section += `- **Location:** ${JSON.stringify(error.location)}\n`;
      }

      section += '\n';
    });
  } else {
    section += '**No errors detected** ✅\n\n';
  }

  section += '---\n\n';
  return section;
}).join('')}

## Critical Issues Requiring Immediate Attention

${this.identifyCriticalIssues(testResults)}

## Root Cause Analysis

${this.generateRootCauseAnalysis(errorTypeStats, testResults)}

## Recommendations

${this.generateRecommendations(errorTypeStats, testResults)}

---

*Report generated by Frontend Testing Framework v1.0*
*Test environment: Node.js with Playwright*
*Browser: Chromium (latest)*
`;
  }

  identifyCriticalIssues(testResults) {
    const criticalIssues = [];

    // Check for login failures
    const loginErrors = testResults.flatMap(r => r.errors).filter(e =>
      e.type === 'Login Error' || e.message.includes('login') || e.message.includes('auth')
    );

    if (loginErrors.length > 0) {
      criticalIssues.push('🚨 **Authentication Issues:** Login failures detected that may prevent user access');
    }

    // Check for 500 errors
    const serverErrors = testResults.flatMap(r => r.errors).filter(e =>
      e.status >= 500 || e.message.includes('500')
    );

    if (serverErrors.length > 0) {
      criticalIssues.push('🚨 **Server Errors:** Internal server errors (5xx) found that indicate backend issues');
    }

    // Check for widespread JavaScript errors
    const jsErrors = testResults.flatMap(r => r.errors).filter(e => e.type === 'JavaScript Exception');
    if (jsErrors.length > testResults.length * 0.3) { // More than 30% of pages
      criticalIssues.push('🚨 **Widespread JavaScript Failures:** JavaScript exceptions affecting majority of pages');
    }

    // Check for authorization errors
    const authErrors = testResults.flatMap(r => r.errors).filter(e =>
      e.status === 401 || e.status === 403 || e.message.includes('unauthorized') || e.message.includes('forbidden')
    );

    if (authErrors.length > 0) {
      criticalIssues.push('🚨 **Authorization Issues:** Access control problems detected');
    }

    return criticalIssues.length > 0 ?
      criticalIssues.join('\n\n') :
      '✅ No critical issues identified that require immediate attention.';
  }

  generateRootCauseAnalysis(errorTypeStats, testResults) {
    const analysis = [];

    if (errorTypeStats['Network Error']) {
      analysis.push('**Network Errors:** High number of network failures suggest API endpoints may be unavailable or misconfigured');
    }

    if (errorTypeStats['JavaScript Exception']) {
      analysis.push('**JavaScript Exceptions:** Frontend code issues, possibly due to missing dependencies or runtime errors');
    }

    if (errorTypeStats['Console Error']) {
      analysis.push('**Console Errors:** Development-time errors that escaped to production, affecting user experience');
    }

    if (errorTypeStats['Content Error']) {
      analysis.push('**Content Errors:** Pages failing to render properly, possibly due to data loading issues');
    }

    return analysis.length > 0 ? analysis.join('\n\n') : 'No clear patterns identified in the error data.';
  }

  generateRecommendations(errorTypeStats, testResults) {
    const recommendations = [];

    recommendations.push('### Immediate Actions');
    recommendations.push('1. **Fix Critical Issues:** Address all 🚨 critical issues listed above');
    recommendations.push('2. **Review Authentication:** Ensure login flow works correctly for all user types');
    recommendations.push('3. **Check API Endpoints:** Verify all backend services are running and accessible');

    recommendations.push('\n### Short-term Improvements');
    recommendations.push('1. **Error Handling:** Implement better error boundaries and user-friendly error messages');
    recommendations.push('2. **Performance:** Optimize pages with slow load times (>3000ms)');
    recommendations.push('3. **Monitoring:** Set up real-time error tracking in production');

    recommendations.push('\n### Long-term Strategy');
    recommendations.push('1. **Automated Testing:** Integrate this test suite into CI/CD pipeline');
    recommendations.push('2. **Error Prevention:** Implement TypeScript strict mode and ESLint rules');
    recommendations.push('3. **User Experience:** Add loading states and graceful degradation for failed requests');

    return recommendations.join('\n');
  }

  printSummary(stats) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 FRONTEND TESTING SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Total Pages Tested: ${stats.totalPages}`);
    console.log(`✅ Successful Pages: ${stats.successfulPages} (${Math.round((stats.successfulPages / stats.totalPages) * 100)}%)`);
    console.log(`❌ Pages with Errors: ${stats.pagesWithErrors} (${Math.round((stats.pagesWithErrors / stats.totalPages) * 100)}%)`);
    console.log(`🐛 Total Errors Found: ${stats.totalErrors}`);
    console.log(`⏱️  Total Test Time: ${Math.round(stats.totalTime / 1000)}s`);
    console.log(`📄 Full Report: ${stats.reportPath}`);
    console.log('='.repeat(80));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Cleanup completed');
  }
}

// Main execution
async function main() {
  const tester = new FrontendTester();

  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = FrontendTester;