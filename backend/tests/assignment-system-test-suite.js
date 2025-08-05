/**
 * Assignment System Test Suite Runner
 * 
 * This script runs all assignment system related tests in the correct order
 * and provides comprehensive coverage reporting.
 */

const { spawn } = require('child_process');
const path = require('path');

const testSuites = [
  {
    name: 'AI Suggestions API Tests',
    file: 'routes/ai-suggestions.test.js',
    description: 'Tests AI-powered assignment suggestions with confidence scoring'
  },
  {
    name: 'Historic Patterns API Tests', 
    file: 'routes/historic-patterns.test.js',
    description: 'Tests pattern recognition and historic assignment repetition'
  },
  {
    name: 'Enhanced Chunks API Tests',
    file: 'routes/chunks.test.js', 
    description: 'Tests improved game chunking with validation and assignment'
  },
  {
    name: 'Assignment System Integration Tests',
    file: 'integration/assignment-system-workflow.test.js',
    description: 'End-to-end workflow tests covering complete assignment scenarios'
  }
];

async function runTestSuite(suite) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running: ${suite.name}`);
    console.log(`📝 ${suite.description}`);
    console.log('─'.repeat(80));

    const testProcess = spawn('npm', ['test', suite.file], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${suite.name} - PASSED`);
        resolve(true);
      } else {
        console.log(`❌ ${suite.name} - FAILED`);
        resolve(false);
      }
    });

    testProcess.on('error', (error) => {
      console.error(`❌ Error running ${suite.name}:`, error);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Assignment System Test Suite');
  console.log('═'.repeat(80));
  console.log('Testing enhanced assignment system with AI integration,');
  console.log('historic patterns, and improved chunk management.');
  console.log('═'.repeat(80));

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of testSuites) {
    try {
      const passed = await runTestSuite(suite);
      results.push({ suite: suite.name, passed });
      
      if (passed) {
        totalPassed++;
      } else {
        totalFailed++;
      }
    } catch (error) {
      results.push({ suite: suite.name, passed: false, error });
      totalFailed++;
    }
  }

  // Summary Report
  console.log(`\n${  '═'.repeat(80)}`);
  console.log('📊 TEST SUITE SUMMARY');
  console.log('═'.repeat(80));

  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.suite}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    }
  });

  console.log(`\n${  '─'.repeat(40)}`);
  console.log(`📈 Total: ${testSuites.length} suites`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📊 Success Rate: ${Math.round(totalPassed / testSuites.length * 100)}%`);

  if (totalFailed === 0) {
    console.log('\n🎉 All assignment system tests passed!');
    console.log('The enhanced assignment system is ready for deployment.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  process.exit(totalFailed === 0 ? 0 : 1);
}

// Feature Coverage Report
function printFeatureCoverage() {
  console.log('\n📋 FEATURE COVERAGE');
  console.log('─'.repeat(50));
  
  const features = [
    '🤖 AI Suggestions with confidence scoring',
    '📊 Factor-based assignment recommendations', 
    '🔄 Historic pattern recognition',
    '📈 Pattern application and repetition',
    '📦 Enhanced game chunk management',
    '🔗 Chunk assignment with conflict detection',
    '⚡ Auto-chunk creation algorithms',
    '🌊 End-to-end workflow integration',
    '⚠️  Conflict detection and resolution',
    '🚀 Performance testing with large datasets'
  ];

  features.forEach(feature => console.log(`   ${feature}`));
}

// Run the test suite
if (require.main === module) {
  printFeatureCoverage();
  runAllTests().catch(error => {
    console.error('Fatal error running test suite:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testSuites
};