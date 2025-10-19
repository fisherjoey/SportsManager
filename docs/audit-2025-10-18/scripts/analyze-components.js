#!/usr/bin/env node
/**
 * Component Analysis Script
 *
 * Analyzes all frontend components to identify:
 * 1. Components WITH API calls (already connected)
 * 2. Components WITHOUT API calls (potentially disconnected)
 * 3. Components that should have data but don't
 * 4. Pages and their expected data requirements
 */

const fs = require('fs');
const path = require('path');

// Track all components
const componentsWithAPI = new Set();
const componentsWithoutAPI = new Set();
const allComponents = [];

// Keywords that suggest a component should fetch data
const DATA_KEYWORDS = [
  'management', 'dashboard', 'list', 'table', 'form', 'editor',
  'settings', 'profile', 'details', 'view', 'card', 'selector',
  'picker', 'calendar', 'tracker', 'manager', 'admin'
];

// API call patterns
const API_PATTERNS = [
  /api\./i,
  /fetch\(/i,
  /axios\./i,
  /useQuery/i,
  /useMutation/i,
];

/**
 * Check if file contains API calls
 */
function hasAPICall(content) {
  return API_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if component likely needs data
 */
function likelyNeedsData(fileName, content) {
  const lowerName = fileName.toLowerCase();

  // Check filename
  const nameNeedsData = DATA_KEYWORDS.some(keyword => lowerName.includes(keyword));

  // Check for state management (useState, useEffect suggest data handling)
  const hasState = /useState|useEffect|useReducer/.test(content);

  // Check for props that suggest data
  const hasDataProps = /props\.(data|items|users|games|teams|leagues|referees)/.test(content);

  // Check for map/filter operations (suggests list rendering)
  const hasListRendering = /\.map\(|\.filter\(/.test(content);

  return {
    nameNeedsData,
    hasState,
    hasDataProps,
    hasListRendering,
    score: (nameNeedsData ? 2 : 0) + (hasState ? 1 : 0) + (hasDataProps ? 2 : 0) + (hasListRendering ? 1 : 0)
  };
}

/**
 * Extract component info
 */
function analyzeComponent(filePath, content) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);
  const hasAPI = hasAPICall(content);
  const needsData = likelyNeedsData(fileName, content);

  const component = {
    name: fileName,
    path: relativePath,
    hasAPI,
    needsData: needsData.score >= 2,
    dataScore: needsData.score,
    reasons: {
      nameNeedsData: needsData.nameNeedsData,
      hasState: needsData.hasState,
      hasDataProps: needsData.hasDataProps,
      hasListRendering: needsData.hasListRendering,
    },
    // Extract imports to see dependencies
    imports: extractImports(content),
  };

  allComponents.push(component);

  if (hasAPI) {
    componentsWithAPI.add(relativePath);
  } else {
    componentsWithoutAPI.add(relativePath);
  }

  return component;
}

/**
 * Extract import statements
 */
function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Recursively walk directory
 */
function walkDirectory(dir, fileCallback) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'out') {
        walkDirectory(filePath, fileCallback);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileCallback(filePath);
    }
  });
}

/**
 * Analyze pages
 */
function analyzePages() {
  const pagesDir = path.join(__dirname, 'frontend', 'app');
  const pages = [];

  function findPages(dir, route = '') {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('_') && !file.startsWith('.')) {
        const newRoute = route + '/' + file;
        findPages(filePath, newRoute);
      } else if (file === 'page.tsx') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const hasAPI = hasAPICall(content);

        pages.push({
          route: route || '/',
          path: path.relative(process.cwd(), filePath),
          hasAPI,
          content: content.substring(0, 500), // First 500 chars for context
        });
      }
    });
  }

  findPages(pagesDir);
  return pages;
}

/**
 * Generate markdown report
 */
function generateReport(pages) {
  let report = '# Component Analysis Report\n\n';
  report += '**Generated**: ' + new Date().toISOString() + '\n\n';
  report += '---\n\n';

  report += '## Summary\n\n';
  report += `- **Total Components**: ${allComponents.length}\n`;
  report += `- **Components WITH API calls**: ${componentsWithAPI.size}\n`;
  report += `- **Components WITHOUT API calls**: ${componentsWithoutAPI.size}\n`;
  report += `- **Total Pages**: ${pages.length}\n\n`;

  // Disconnected components that likely need data
  const disconnected = allComponents.filter(c => !c.hasAPI && c.needsData);
  report += `- **⚠️ Potentially Disconnected Components**: ${disconnected.length}\n\n`;

  report += '---\n\n';

  report += '## ⚠️ Priority Review: Components Without API Calls (Likely Need Data)\n\n';
  report += 'These components appear to need data but have no API calls detected:\n\n';

  disconnected
    .sort((a, b) => b.dataScore - a.dataScore)
    .forEach(component => {
      report += `### ${component.name}\n\n`;
      report += `**Path**: \`${component.path}\`\n\n`;
      report += `**Data Score**: ${component.dataScore}/6\n\n`;
      report += '**Indicators**:\n';
      if (component.reasons.nameNeedsData) report += '- ✓ Filename suggests data management\n';
      if (component.reasons.hasState) report += '- ✓ Uses React state\n';
      if (component.reasons.hasDataProps) report += '- ✓ Receives data props\n';
      if (component.reasons.hasListRendering) report += '- ✓ Renders lists/arrays\n';
      report += '\n**Action Required**: Review this component to determine required API endpoints\n\n';
      report += '---\n\n';
    });

  report += '## Pages Analysis\n\n';

  const pagesWithAPI = pages.filter(p => p.hasAPI);
  const pagesWithoutAPI = pages.filter(p => !p.hasAPI);

  report += `### Pages WITH API Calls (${pagesWithAPI.length})\n\n`;
  pagesWithAPI.forEach(page => {
    report += `- **${page.route}** - \`${page.path}\`\n`;
  });
  report += '\n';

  report += `### ⚠️ Pages WITHOUT API Calls (${pagesWithoutAPI.length})\n\n`;
  report += 'These pages may need API integration:\n\n';
  pagesWithoutAPI.forEach(page => {
    report += `- **${page.route}** - \`${page.path}\`\n`;
  });
  report += '\n---\n\n';

  report += '## Components WITH API Calls\n\n';
  const connected = allComponents.filter(c => c.hasAPI);
  connected.forEach(component => {
    report += `- **${component.name}** - \`${component.path}\`\n`;
  });
  report += '\n---\n\n';

  report += '## All Components WITHOUT API Calls\n\n';
  report += `Total: ${componentsWithoutAPI.size} components\n\n`;

  const unconnected = allComponents.filter(c => !c.hasAPI);
  unconnected.forEach(component => {
    const flag = component.needsData ? '⚠️' : '✓';
    report += `- ${flag} **${component.name}** (score: ${component.dataScore}) - \`${component.path}\`\n`;
  });
  report += '\n';

  return report;
}

// Main execution
console.log('🔍 Analyzing components...\n');

const frontendDir = path.join(__dirname, 'frontend');

if (!fs.existsSync(frontendDir)) {
  console.error('❌ Frontend directory not found!');
  process.exit(1);
}

// Analyze components
walkDirectory(frontendDir, (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    analyzeComponent(filePath, content);
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
});

// Analyze pages
const pages = analyzePages();

console.log(`✅ Analyzed ${allComponents.length} components`);
console.log(`✅ Found ${componentsWithAPI.size} components with API calls`);
console.log(`✅ Found ${componentsWithoutAPI.size} components without API calls`);
console.log(`✅ Analyzed ${pages.length} pages\n`);

// Generate report
const report = generateReport(pages);

// Write report
fs.writeFileSync('COMPONENT_ANALYSIS.md', report);

console.log('📝 Report generated: COMPONENT_ANALYSIS.md\n');

// Print key findings
const disconnected = allComponents.filter(c => !c.hasAPI && c.needsData);
console.log(`⚠️  ${disconnected.length} components likely need API integration`);
console.log(`✅ ${componentsWithAPI.size} components already have API calls`);
console.log(`ℹ️  ${componentsWithoutAPI.size - disconnected.length} components don't appear to need APIs\n`);

console.log('✨ Done!\n');
