#!/usr/bin/env node

/**
 * Full Automated UX/UI Audit Orchestration
 * Runs the complete audit workflow:
 * 1. Captures screenshots of all pages
 * 2. Runs UX/UI analysis
 * 3. Generates comprehensive reports
 *
 * Requires no user input - fully automated
 */

const { captureAllPages } = require('./capture-screenshots');
const { runAudit } = require('./analyze-ux');
const { generateReports } = require('./generate-report');
const fs = require('fs');
const path = require('path');

const config = require('./audit-config.json');

async function runFullAudit() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║        🔍 AUTOMATED UX/UI AUDIT SYSTEM                   ║');
  console.log('║                                                           ║');
  console.log('║  This will run a comprehensive audit of the application  ║');
  console.log('║  No user input required - sit back and relax!            ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const startTime = Date.now();
  let screenshotManifestPath = null;
  let auditResultsPath = null;

  try {
    // STEP 1: Capture Screenshots
    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 1/3: Capturing Screenshots');
    console.log('═══════════════════════════════════════════════════════════\n');

    const screenshotResults = await captureAllPages();

    // Find the manifest file
    const screenshotDir = path.resolve(__dirname, '../../', config.output.screenshotDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const sessionDir = path.join(screenshotDir, timestamp);
    screenshotManifestPath = path.join(sessionDir, 'manifest.json');

    console.log('\n✅ Screenshot capture complete!\n');

    // Wait a bit between steps
    console.log('⏳ Waiting 3 seconds before next step...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // STEP 2: Run UX/UI Analysis
    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 2/3: Running UX/UI Analysis');
    console.log('═══════════════════════════════════════════════════════════\n');

    const auditResults = await runAudit();

    // Find the audit results file
    const reportDir = path.resolve(__dirname, '../../', config.output.reportDir);
    auditResultsPath = path.join(reportDir, `audit-results-${timestamp}.json`);

    console.log('\n✅ UX/UI analysis complete!\n');

    // Wait a bit between steps
    console.log('⏳ Waiting 2 seconds before generating reports...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // STEP 3: Generate Reports
    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 3/3: Generating Reports');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { htmlPath, mdPath } = await generateReports(auditResultsPath, screenshotManifestPath);

    console.log('\n✅ Report generation complete!\n');

    // Final Summary
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 AUDIT COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`⏱️  Total time: ${duration} minutes\n`);

    console.log('📁 Generated Files:');
    console.log(`   📸 Screenshots: ${sessionDir}`);
    console.log(`   📊 Audit Data: ${auditResultsPath}`);
    console.log(`   📄 HTML Report: ${htmlPath}`);
    console.log(`   📝 Markdown Report: ${mdPath}\n`);

    // Load and display summary
    const auditData = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));

    console.log('📊 Audit Summary:');
    console.log(`   • Total Pages Audited: ${auditData.summary.totalPages}`);
    console.log(`   • Total Issues Found: ${auditData.summary.totalIssues}`);
    console.log(`   • High Severity: ${auditData.summary.highSeverity}`);
    console.log(`   • Medium Severity: ${auditData.summary.mediumSeverity}`);
    console.log(`   • Low Severity: ${auditData.summary.lowSeverity}\n`);

    if (auditData.summary.highSeverity > 0) {
      console.log('⚠️  WARNING: High severity issues found! Please review the report.\n');
    } else if (auditData.summary.mediumSeverity > 0) {
      console.log('✅ No high severity issues, but some medium issues to address.\n');
    } else {
      console.log('🎊 Excellent! No high or medium severity issues found!\n');
    }

    console.log('💡 Next Steps:');
    console.log(`   1. Open the HTML report in your browser: ${htmlPath}`);
    console.log('   2. Review the issues and prioritize fixes');
    console.log('   3. Update the codebase to address the issues');
    console.log('   4. Re-run the audit to verify fixes\n');

    console.log('═══════════════════════════════════════════════════════════\n');

    return {
      success: true,
      duration,
      screenshotDir: sessionDir,
      auditResultsPath,
      htmlPath,
      mdPath,
      summary: auditData.summary
    };

  } catch (error) {
    console.error('\n❌ AUDIT FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);

    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure the dev server is running (npm run dev)');
    console.log('   2. Check that the login credentials in audit-config.json are correct');
    console.log('   3. Verify all routes in audit-config.json are accessible');
    console.log('   4. Ensure puppeteer is installed (npm install puppeteer)\n');

    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  runFullAudit()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runFullAudit };
