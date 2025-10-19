/**
 * Phase 2: Analyze Screenshots and Generate Documentation
 *
 * This script is meant to be run BY Claude Code itself
 * It will:
 * 1. Read the manifest from Phase 1
 * 2. For each screenshot, tell Claude Code to:
 *    - Read the image file
 *    - Analyze with vision
 *    - Write comprehensive UX/UI documentation
 *
 * NOTE: This script outputs instructions for Claude Code to follow
 */

const fs = require('fs');
const path = require('path');

function generateAnalysisInstructions() {
  // Find the most recent screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const dates = fs.readdirSync(screenshotsDir).filter(f => {
    return fs.statSync(path.join(screenshotsDir, f)).isDirectory();
  }).sort().reverse();

  if (dates.length === 0) {
    console.error('❌ No screenshot directories found!');
    console.error('Run Phase 1 first: node full-audit-automated.js');
    process.exit(1);
  }

  const latestDir = path.join(screenshotsDir, dates[0]);
  const manifestPath = path.join(latestDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Manifest not found:', manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const successful = manifest.results.filter(r => r.success);

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     📊 PHASE 2: CLAUDE CODE VISION ANALYSIS              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`Found ${successful.length} screenshots to analyze:\n`);

  successful.forEach((result, index) => {
    console.log(`${index + 1}. ${result.route} - ${result.filename}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('INSTRUCTIONS FOR CLAUDE CODE:\n');
  console.log('For each screenshot below, perform these steps:\n');
  console.log('1. Read the screenshot file using the Read tool');
  console.log('2. Analyze the UI/UX using your vision capabilities');
  console.log('3. Write comprehensive documentation to docs/ux-ui-audit/');
  console.log('4. Include all sections as shown in the template\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Output the file paths for Claude Code to process
  console.log('FILES TO ANALYZE:\n');
  successful.forEach((result, index) => {
    const docNumber = String(index + 1).padStart(2, '0');
    const docName = result.route.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    console.log(`\n## ${index + 1}. ${result.route}`);
    console.log(`Screenshot: ${result.filepath}`);
    console.log(`Output Doc: docs/ux-ui-audit/${docNumber}-${docName}.md`);
    console.log(`URL: ${result.path}`);
  });

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('TEMPLATE FOR EACH DOCUMENT:');
  console.log('═══════════════════════════════════════════════════════════\n');

  const template = `# {Page Name} - UX/UI Audit & Documentation

**Page:** {Name} (\`{path}\`)
**Date Audited:** ${new Date().toISOString().split('T')[0]}
**Viewport:** Desktop (1920x1080)
**Auditor:** Claude Code (AI Vision Analysis)

---

## Overview

{Brief description of page purpose and functionality}

---

## Visual Design Assessment

### ✅ Strengths

1. {Strength 1}
2. {Strength 2}
3. ...

### ⚠️ Areas for Improvement

1. {Issue 1}
2. {Issue 2}
3. ...

---

## Accessibility Analysis

### ✅ Positive Points

{List accessibility wins}

### ❌ Critical Issues

{List WCAG violations}

---

## Component Inventory

{List all major components, their properties, and states}

---

## Layout & Spacing

{Analyze grid, spacing, alignment}

---

## Typography & Colors

{Font sizes, weights, color palette analysis}

---

## Responsive Design Considerations

{How it works on different screens}

---

## User Experience Assessment

### Cognitive Load: {Low/Medium/High}
### Visual Clarity: {Rating}
### Error Prevention: {Assessment}
### Ease of Use: {Assessment}

---

## Performance Considerations

{Images, fonts, bundle size, loading}

---

## Recommendations Priority

### 🔴 High Priority (Fix Now)
### 🟡 Medium Priority (Soon)
### 🔵 Low Priority (Enhancement)

---

## Code Recommendations

\`\`\`tsx
{Example code fixes}
\`\`\`

---

## Testing Checklist

- [ ] {Test item 1}
- [ ] {Test item 2}
- ...

---

## Conclusion

{Summary and overall rating}

**Overall Rating: X/10** ⭐⭐⭐⭐⭐⭐⭐★★★
`;

  console.log(template);
  console.log('\n═══════════════════════════════════════════════════════════\n');

  return {
    latestDir,
    manifestPath,
    screenshots: successful
  };
}

if (require.main === module) {
  generateAnalysisInstructions();
}

module.exports = { generateAnalysisInstructions };
