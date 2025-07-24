/**
 * Comprehensive Test Suite for Invitations System
 * 
 * This file runs all invitation-related tests and provides a summary
 * Run with: npm run test:invitations
 */

const { execSync } = require('child_process');

console.log('🧪 Running Invitations Test Suite...\n');

const testFiles = [
  'tests/services/emailService.test.js',
  'tests/routes/invitations.test.js',
  'tests/integration/invitations-integration.test.js'
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const testFile of testFiles) {
  console.log(`📋 Running ${testFile}...`);
  
  try {
    const output = execSync(`npx jest ${testFile} --verbose --no-coverage`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('✅ PASSED\n');
    
    // Parse test results (simplified)
    const testMatches = output.match(/(\d+) passed/);
    if (testMatches) {
      const tests = parseInt(testMatches[1]);
      totalTests += tests;
      passedTests += tests;
    }
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(error.stdout);
    console.log('\n');
    failedTests++;
  }
}

console.log('🎯 Test Suite Summary:');
console.log(`Total Test Files: ${testFiles.length}`);
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed! Invitations system is working correctly.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the output above.');
  process.exit(1);
}