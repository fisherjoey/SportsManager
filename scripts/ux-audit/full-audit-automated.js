/**
 * FULL AUTOMATED UX/UI AUDIT
 *
 * This script runs completely automated with NO USER INPUT required:
 * 1. Captures screenshots of all pages (with authentication)
 * 2. Saves screenshots to disk
 * 3. Outputs manifest for Claude Code to analyze
 *
 * Claude Code will then:
 * - Read each screenshot
 * - Analyze with vision capabilities
 * - Write comprehensive UX/UI documentation
 */

const { captureAllPagesWithAuth } = require('./capture-with-auth');
const fs = require('fs');
const path = require('path');

async function runFullAutomatedAudit() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║     🤖 FULLY AUTOMATED UX/UI AUDIT SYSTEM                ║');
  console.log('║     Powered by Claude Code Vision Analysis               ║');
  console.log('║                                                           ║');
  console.log('║  Phase 1: Screenshot Capture (Automated)                 ║');
  console.log('║  Phase 2: Vision Analysis (Claude Code)                  ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Phase 1: Capture all screenshots
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PHASE 1: Screenshot Capture');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { results, outputDir, manifestPath } = await captureAllPagesWithAuth();

    // Phase 1 complete
    const captureTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PHASE 1 COMPLETE ✅');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`⏱️  Capture time: ${captureTime} minutes`);
    console.log(`📸 Screenshots saved: ${outputDir}`);
    console.log(`📄 Manifest: ${manifestPath}\n`);

    // Create instructions for Phase 2
    const readmeContent = `# UX/UI Audit - Ready for Analysis

## Phase 1: Screenshot Capture ✅ COMPLETE

**Completed:** ${new Date().toISOString()}
**Duration:** ${captureTime} minutes
**Screenshots:** ${results.filter(r => r.success).length}/${results.length}

## Screenshots Captured

${results.map((r, i) => {
  if (r.success) {
    return `${i + 1}. ✅ **${r.route}** - ${r.filename}`;
  } else {
    return `${i + 1}. ❌ **${r.route}** - ${r.reason || r.error}`;
  }
}).join('\n')}

## Phase 2: Vision Analysis (Next Step)

Claude Code will now analyze each screenshot and generate comprehensive UX/UI documentation.

### For Claude Code:

Please analyze each screenshot in the following order and create detailed documentation:

\`\`\`javascript
const screenshots = ${JSON.stringify(
  results.filter(r => r.success).map(r => ({
    name: r.route,
    path: r.filepath,
    url: r.path
  })),
  null,
  2
)};
\`\`\`

For each screenshot, create a markdown file at:
\`docs/ux-ui-audit/{number}-{route-name}.md\`

Include in each document:
1. Overview & Purpose
2. Visual Design Assessment (strengths & weaknesses)
3. Accessibility Analysis (WCAG compliance)
4. Component Inventory
5. Layout & Spacing
6. Typography & Colors
7. Responsive Design Considerations
8. User Experience Assessment
9. Performance Considerations
10. Priority Recommendations (High/Medium/Low)
11. Code Examples
12. Testing Checklist

## Location

- **Screenshots:** \`${outputDir}\`
- **Manifest:** \`${manifestPath}\`
- **Documentation:** \`docs/ux-ui-audit/\`
`;

    const readmePath = path.join(outputDir, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('NEXT STEP: Claude Code Vision Analysis');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📋 Instructions file created:', readmePath);
    console.log('\n✨ Phase 1 complete! Ready for Claude Code analysis.\n');

    return {
      success: true,
      captureTime,
      results,
      outputDir,
      manifestPath,
      readmePath
    };

  } catch (error) {
    console.error('\n❌ AUDIT FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);

    return {
      success: false,
      error: error.message
    };
  }
}

if (require.main === module) {
  runFullAutomatedAudit()
    .then((result) => {
      if (result.success) {
        console.log('🎉 Automated audit Phase 1 complete!');
        console.log('👁️  Run Claude Code to analyze screenshots and generate documentation.');
        process.exit(0);
      } else {
        console.log('💥 Audit failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runFullAutomatedAudit };
