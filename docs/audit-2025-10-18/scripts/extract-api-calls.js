#!/usr/bin/env node
/**
 * Frontend API Call Extractor
 *
 * This script systematically extracts all API calls from the frontend codebase
 * to create a comprehensive catalog of required backend endpoints.
 *
 * The frontend is the source of truth for what the backend must implement.
 */

const fs = require('fs');
const path = require('path');

// API patterns to search for
const API_PATTERNS = [
  // Direct API client calls
  /api\.(\w+)\(['"`]([^'"`]+)['"`]/g,
  // Fetch calls
  /fetch\(['"`]([^'"`]+)['"`]/g,
  // Axios calls
  /axios\.(\w+)\(['"`]([^'"`]+)['"`]/g,
  // Request function calls with endpoint strings
  /request<[^>]*>\(['"`]([^'"`]+)['"`]/g,
];

const apiCalls = new Map();
const fileApiCalls = new Map();

/**
 * Extract API calls from a file
 */
function extractFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    const calls = [];

    API_PATTERNS.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1] || 'unknown';
        const endpoint = match[2] || match[1];

        if (endpoint && endpoint.startsWith('/')) {
          calls.push({
            endpoint,
            method: method.toUpperCase(),
            pattern: match[0],
          });

          // Add to global map
          const key = `${method.toUpperCase()} ${endpoint}`;
          if (!apiCalls.has(key)) {
            apiCalls.set(key, {
              endpoint,
              method: method.toUpperCase(),
              files: [],
            });
          }
          apiCalls.get(key).files.push(relativePath);
        }
      }
    });

    if (calls.length > 0) {
      fileApiCalls.set(relativePath, calls);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
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
      // Skip node_modules and .next
      if (file !== 'node_modules' && file !== '.next' && file !== 'out') {
        walkDirectory(filePath, fileCallback);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileCallback(filePath);
    }
  });
}

/**
 * Generate markdown report
 */
function generateReport() {
  let report = '# Frontend API Requirements - Complete Catalog\n\n';
  report += '**Generated**: ' + new Date().toISOString() + '\n';
  report += '**Source**: Frontend codebase (source of truth)\n\n';
  report += '---\n\n';

  report += '## Summary\n\n';
  report += `- **Total Unique Endpoints**: ${apiCalls.size}\n`;
  report += `- **Total Files with API Calls**: ${fileApiCalls.size}\n\n`;

  report += '---\n\n';

  report += '## Endpoints by Category\n\n';

  // Group by base path
  const categories = new Map();
  apiCalls.forEach((data, key) => {
    const endpoint = data.endpoint;
    const category = endpoint.split('/')[1] || 'root';

    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push({ key, ...data });
  });

  // Sort categories
  const sortedCategories = Array.from(categories.entries()).sort();

  sortedCategories.forEach(([category, endpoints]) => {
    report += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    endpoints.sort((a, b) => a.endpoint.localeCompare(b.endpoint));

    endpoints.forEach(endpoint => {
      report += `#### \`${endpoint.method} ${endpoint.endpoint}\`\n\n`;
      report += '**Used in**:\n';
      const uniqueFiles = [...new Set(endpoint.files)];
      uniqueFiles.forEach(file => {
        report += `- ${file}\n`;
      });
      report += '\n';
    });
  });

  report += '---\n\n';

  report += '## Files Using API Calls\n\n';

  const sortedFiles = Array.from(fileApiCalls.entries()).sort();

  sortedFiles.forEach(([file, calls]) => {
    report += `### ${file}\n\n`;
    report += `**Endpoints used**: ${calls.length}\n\n`;

    const uniqueCalls = [...new Set(calls.map(c => `${c.method} ${c.endpoint}`))];
    uniqueCalls.sort();

    uniqueCalls.forEach(call => {
      report += `- \`${call}\`\n`;
    });
    report += '\n';
  });

  return report;
}

/**
 * Generate JSON output
 */
function generateJSON() {
  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEndpoints: apiCalls.size,
      totalFiles: fileApiCalls.size,
    },
    endpoints: Array.from(apiCalls.entries()).map(([key, data]) => ({
      method: data.method,
      endpoint: data.endpoint,
      usedInFiles: [...new Set(data.files)],
    })),
    fileUsage: Array.from(fileApiCalls.entries()).map(([file, calls]) => ({
      file,
      endpoints: calls.map(c => ({
        method: c.method,
        endpoint: c.endpoint,
      })),
    })),
  };

  return JSON.stringify(output, null, 2);
}

// Main execution
console.log('🔍 Scanning frontend for API calls...\n');

const frontendDir = path.join(__dirname, 'frontend');

if (!fs.existsSync(frontendDir)) {
  console.error('❌ Frontend directory not found!');
  process.exit(1);
}

// Walk frontend directory
walkDirectory(frontendDir, extractFromFile);

console.log(`✅ Found ${apiCalls.size} unique API endpoints`);
console.log(`✅ Found ${fileApiCalls.size} files with API calls\n`);

// Generate reports
const markdownReport = generateReport();
const jsonReport = generateJSON();

// Write reports
fs.writeFileSync('FRONTEND_API_REQUIREMENTS.md', markdownReport);
fs.writeFileSync('frontend-api-calls.json', jsonReport);

console.log('📝 Reports generated:');
console.log('   - FRONTEND_API_REQUIREMENTS.md');
console.log('   - frontend-api-calls.json\n');

// Print summary
console.log('📊 Top Categories:');
const categories = new Map();
apiCalls.forEach((data) => {
  const category = data.endpoint.split('/')[1] || 'root';
  categories.set(category, (categories.get(category) || 0) + 1);
});

Array.from(categories.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([category, count]) => {
    console.log(`   ${category.padEnd(20)} ${count} endpoints`);
  });

console.log('\n✨ Done!\n');
