#!/usr/bin/env node

/**
 * Quick Frontend Testing Script
 *
 * This script runs the comprehensive frontend tests and provides
 * immediate feedback on the testing progress.
 */

const FrontendTester = require('./comprehensive-frontend-test.js');

async function runTests() {
  console.log('🚀 Sports Management App - Frontend Testing Suite');
  console.log('═'.repeat(80));
  console.log('📋 About to test 51 pages with comprehensive error detection');
  console.log('🔍 Monitoring: Console errors, JavaScript exceptions, Network failures');
  console.log('⚙️  Using: Playwright + Chromium browser automation');
  console.log('📊 Output: Detailed Markdown report + Screenshots');
  console.log('═'.repeat(80));

  const tester = new FrontendTester();

  // Handle Ctrl+C gracefully
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Test interrupted by user');
    await tester.cleanup();
    process.exit(0);
  });

  // Handle unexpected errors
  process.on('unhandledRejection', async (error) => {
    console.error('\n❌ Unhandled error during testing:', error);
    await tester.cleanup();
    process.exit(1);
  });

  try {
    await tester.runAllTests();
    console.log('\n🎉 Frontend testing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Fatal error during testing:', error.message);
    await tester.cleanup();
    process.exit(1);
  }
}

// Validate environment before starting
async function validateEnvironment() {
  try {
    // Check if required modules are available
    require('playwright');
    console.log('✅ Playwright is available');
    console.log('✅ Ready to start testing (assuming app is running on http://localhost:3000)');
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    console.log('\n📋 Prerequisites:');
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Start the application: npm run dev (frontend) + npm run dev (backend)');
    console.log('   3. Ensure http://localhost:3000 is accessible');
    process.exit(1);
  }
}

async function main() {
  await validateEnvironment();
  await runTests();
}

if (require.main === module) {
  main();
}