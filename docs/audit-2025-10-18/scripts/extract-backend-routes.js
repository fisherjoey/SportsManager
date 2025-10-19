/**
 * Backend Route Extraction Script
 *
 * This script analyzes all backend route files to create a comprehensive catalog of:
 * - All API endpoints (method + path)
 * - Database tables accessed
 * - Query parameters and body schemas
 * - Authentication/authorization requirements
 * - Cerbos policy checks
 * - Special features (pagination, filtering, etc.)
 *
 * Usage: node extract-backend-routes.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROUTES_DIR = './backend/src/routes';
const OUTPUT_FILE = './BACKEND_ROUTES_CATALOG.md';
const OUTPUT_JSON = './backend-routes-catalog.json';

// Statistics
const stats = {
  totalFiles: 0,
  totalRoutes: 0,
  routesByMethod: {},
  routesByCategory: {},
  databaseTables: new Set(),
  filesWithIssues: [],
};

// Collected data
const routeData = {
  files: [],
  routes: [],
  databaseTables: {},
  summary: {},
};

/**
 * Recursively find all TypeScript route files
 */
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip test directories and node_modules
      if (!file.includes('__tests__') && file !== 'node_modules') {
        findRouteFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Extract route definitions from file content
 */
function extractRoutes(content, filePath) {
  const routes = [];
  const lines = content.split('\n');

  // Patterns to match
  const routePattern = /router\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  const routerPattern = /const\s+(\w+)\s*=\s*express\.Router\(\)/gi;

  // Track line numbers for better reporting
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Match route definitions
    let match;
    const tempPattern = /router\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

    while ((match = tempPattern.exec(line)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];

      // Skip middleware-only routes (no path or just '/')
      if (!path || path === '/' || method === 'USE') {
        continue;
      }

      // Extract additional context from surrounding lines
      const context = extractRouteContext(lines, i);

      routes.push({
        method,
        path,
        lineNumber,
        file: filePath,
        ...context
      });
    }
  }

  return routes;
}

/**
 * Extract context around a route definition
 */
function extractRouteContext(lines, routeLineIndex) {
  const context = {
    authentication: false,
    cerbosPermission: null,
    middleware: [],
    databaseTables: [],
    queryParams: [],
    bodySchema: null,
    comments: [],
    hasValidation: false,
    hasPagination: false,
    hasFiltering: false,
  };

  // Look at lines before and after the route definition (up to 20 lines each way)
  const startIdx = Math.max(0, routeLineIndex - 20);
  const endIdx = Math.min(lines.length, routeLineIndex + 100);
  const relevantLines = lines.slice(startIdx, endIdx).join('\n');

  // Check for authentication
  if (relevantLines.includes('authenticateToken') ||
      relevantLines.includes('authenticate')) {
    context.authentication = true;
  }

  // Check for Cerbos permissions
  const cerbosMatch = relevantLines.match(/requireCerbosPermission\s*\(\s*['"`]([^'"`]+)['"`]/i);
  if (cerbosMatch) {
    context.cerbosPermission = cerbosMatch[1];
  }

  // Extract middleware
  const middlewarePattern = /router\.\w+\([^,]+,([^)]+)\)/;
  const mwMatch = relevantLines.match(middlewarePattern);
  if (mwMatch) {
    const mwString = mwMatch[1];
    if (mwString.includes('validateBody')) context.hasValidation = true;
    if (mwString.includes('validateQuery')) context.hasValidation = true;
    if (mwString.includes('validateParams')) context.hasValidation = true;
  }

  // Check for pagination
  if (relevantLines.includes('page') && relevantLines.includes('limit')) {
    context.hasPagination = true;
  }

  // Check for filtering
  if (relevantLines.match(/where|filter|search/i)) {
    context.hasFiltering = true;
  }

  // Extract database tables from various query patterns
  const dbPatterns = [
    /db\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /knex\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /from\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /\.table\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /insert\s+into\s+(\w+)/gi,
    /update\s+(\w+)/gi,
    /delete\s+from\s+(\w+)/gi,
    /join\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  ];

  dbPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(relevantLines)) !== null) {
      const tableName = match[1];
      if (tableName && !tableName.includes('(') && tableName.length < 50) {
        context.databaseTables.push(tableName);
      }
    }
  });

  // Remove duplicates
  context.databaseTables = [...new Set(context.databaseTables)];

  // Extract JSDoc comments
  const commentLines = lines.slice(Math.max(0, routeLineIndex - 10), routeLineIndex);
  const comments = commentLines
    .filter(line => line.trim().startsWith('*') || line.trim().startsWith('//'))
    .map(line => line.trim().replace(/^[\*\/]+\s*/, ''));

  if (comments.length > 0) {
    context.comments = comments;
  }

  return context;
}

/**
 * Extract file-level metadata
 */
function extractFileMetadata(content, filePath) {
  const metadata = {
    filePath,
    description: '',
    imports: [],
    exports: [],
    hasTests: false,
  };

  // Extract file description from JSDoc
  const fileDocMatch = content.match(/\/\*\*\s*\n([^*]|\*[^/])*@fileoverview\s+([^\n]+)/i);
  if (fileDocMatch) {
    metadata.description = fileDocMatch[2].trim();
  } else {
    // Try to get first comment
    const firstCommentMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/);
    if (firstCommentMatch) {
      metadata.description = firstCommentMatch[1].trim();
    }
  }

  // Check if test file exists
  const testPath = filePath.replace('.ts', '.test.ts');
  metadata.hasTests = fs.existsSync(testPath);

  return metadata;
}

/**
 * Determine route category from file path
 */
function getCategoryFromPath(filePath) {
  const relativePath = filePath.replace(/\\/g, '/').split('/routes/')[1];
  if (!relativePath) return 'unknown';

  const parts = relativePath.split('/');

  // If in subdirectory (like admin/), use that as category
  if (parts.length > 1 && parts[0] !== 'backend') {
    return parts[0];
  }

  // Otherwise use filename without extension
  const filename = path.basename(filePath, '.ts');
  return filename;
}

/**
 * Process a single route file
 */
function processRouteFile(filePath) {
  console.log(`Processing: ${filePath}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const metadata = extractFileMetadata(content, filePath);
    const routes = extractRoutes(content, filePath);
    const category = getCategoryFromPath(filePath);

    // Update statistics
    stats.totalFiles++;
    stats.totalRoutes += routes.length;

    routes.forEach(route => {
      // Count by method
      stats.routesByMethod[route.method] = (stats.routesByMethod[route.method] || 0) + 1;

      // Count by category
      stats.routesByCategory[category] = (stats.routesByCategory[category] || 0) + 1;

      // Track database tables
      route.databaseTables.forEach(table => {
        stats.databaseTables.add(table);
        if (!routeData.databaseTables[table]) {
          routeData.databaseTables[table] = [];
        }
        routeData.databaseTables[table].push({
          method: route.method,
          path: route.path,
          file: filePath,
        });
      });

      // Add to routes collection
      routeData.routes.push({
        ...route,
        category,
        fileDescription: metadata.description,
      });
    });

    routeData.files.push({
      ...metadata,
      category,
      routeCount: routes.length,
      routes: routes.map(r => `${r.method} ${r.path}`),
    });

  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    stats.filesWithIssues.push({ file: filePath, error: error.message });
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport() {
  let md = `# Backend Routes Catalog - Current Implementation

**Generated**: ${new Date().toISOString()}
**Branch**: feat/cerbos-only-migration
**Routes Directory**: backend/src/routes

---

## Executive Summary

- **Total Route Files**: ${stats.totalFiles}
- **Total Endpoints**: ${stats.totalRoutes}
- **Database Tables Used**: ${stats.databaseTables.size}
- **Files with Issues**: ${stats.filesWithIssues.length}

### Endpoints by HTTP Method

`;

  // Method breakdown
  Object.entries(stats.routesByMethod)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, count]) => {
      md += `- **${method}**: ${count} endpoints\n`;
    });

  md += `\n### Endpoints by Category\n\n`;

  // Category breakdown
  Object.entries(stats.routesByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      md += `- **${category}**: ${count} endpoints\n`;
    });

  md += `\n---\n\n## Routes by Category\n\n`;

  // Group routes by category
  const routesByCategory = {};
  routeData.routes.forEach(route => {
    if (!routesByCategory[route.category]) {
      routesByCategory[route.category] = [];
    }
    routesByCategory[route.category].push(route);
  });

  // Sort categories alphabetically
  Object.keys(routesByCategory).sort().forEach(category => {
    const routes = routesByCategory[category];

    md += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${routes.length} endpoints)\n\n`;

    if (routes[0].fileDescription) {
      md += `**File Description**: ${routes[0].fileDescription}\n\n`;
    }

    // Sort routes by path
    routes.sort((a, b) => a.path.localeCompare(b.path));

    routes.forEach(route => {
      md += `#### ${route.method} ${route.path}\n\n`;
      md += `- **File**: ${route.file}:${route.lineNumber}\n`;
      md += `- **Authentication**: ${route.authentication ? 'Required' : 'None'}\n`;

      if (route.cerbosPermission) {
        md += `- **Authorization**: Cerbos permission \`${route.cerbosPermission}\`\n`;
      }

      if (route.databaseTables.length > 0) {
        md += `- **Database Tables**: ${route.databaseTables.join(', ')}\n`;
      }

      const features = [];
      if (route.hasValidation) features.push('validation');
      if (route.hasPagination) features.push('pagination');
      if (route.hasFiltering) features.push('filtering');

      if (features.length > 0) {
        md += `- **Features**: ${features.join(', ')}\n`;
      }

      if (route.comments.length > 0) {
        md += `- **Description**: ${route.comments[0]}\n`;
      }

      md += `\n`;
    });

    md += `\n`;
  });

  md += `---\n\n## Database Table Usage Summary\n\n`;

  // Sort tables by usage count
  const tableUsage = Object.entries(routeData.databaseTables)
    .map(([table, routes]) => ({ table, count: routes.length, routes }))
    .sort((a, b) => b.count - a.count);

  tableUsage.forEach(({ table, count, routes }) => {
    md += `### ${table} (${count} endpoints)\n\n`;

    routes.slice(0, 10).forEach(route => {
      md += `- \`${route.method} ${route.path}\`\n`;
    });

    if (routes.length > 10) {
      md += `- ... and ${routes.length - 10} more\n`;
    }

    md += `\n`;
  });

  md += `---\n\n## Route Files Overview\n\n`;

  routeData.files.sort((a, b) => b.routeCount - a.routeCount).forEach(file => {
    md += `### ${path.basename(file.filePath)}\n\n`;
    md += `- **Path**: ${file.filePath}\n`;
    md += `- **Category**: ${file.category}\n`;
    md += `- **Endpoints**: ${file.routeCount}\n`;
    md += `- **Has Tests**: ${file.hasTests ? '✅' : '❌'}\n`;

    if (file.description) {
      md += `- **Description**: ${file.description}\n`;
    }

    md += `\n**Routes**:\n`;
    file.routes.forEach(route => {
      md += `- ${route}\n`;
    });

    md += `\n`;
  });

  if (stats.filesWithIssues.length > 0) {
    md += `---\n\n## Files with Issues\n\n`;

    stats.filesWithIssues.forEach(({ file, error }) => {
      md += `### ${path.basename(file)}\n\n`;
      md += `- **Path**: ${file}\n`;
      md += `- **Error**: ${error}\n\n`;
    });
  }

  md += `---\n\n## Analysis Notes\n\n`;
  md += `### Key Findings\n\n`;
  md += `1. **Most Used Tables**: ${[...tableUsage.slice(0, 5).map(t => t.table)].join(', ')}\n`;
  md += `2. **Largest Route Files**: ${[...routeData.files.slice(0, 3).map(f => path.basename(f.filePath))].join(', ')}\n`;
  md += `3. **Authentication Coverage**: ${Math.round((routeData.routes.filter(r => r.authentication).length / routeData.routes.length) * 100)}% of routes require authentication\n`;
  md += `4. **Cerbos Coverage**: ${Math.round((routeData.routes.filter(r => r.cerbosPermission).length / routeData.routes.length) * 100)}% of routes use Cerbos authorization\n`;

  md += `\n### Missing or Incomplete Implementations\n\n`;
  md += `- Routes without authentication: ${routeData.routes.filter(r => !r.authentication).length}\n`;
  md += `- Routes without Cerbos checks: ${routeData.routes.filter(r => !r.cerbosPermission).length}\n`;
  md += `- Files without tests: ${routeData.files.filter(f => !f.hasTests).length}\n`;

  return md;
}

/**
 * Main execution
 */
function main() {
  console.log('=== Backend Route Extraction ===\n');
  console.log(`Scanning directory: ${ROUTES_DIR}\n`);

  // Find all route files
  const routeFiles = findRouteFiles(ROUTES_DIR);
  console.log(`Found ${routeFiles.length} route files\n`);

  // Process each file
  routeFiles.forEach(processRouteFile);

  // Generate summary
  routeData.summary = {
    totalFiles: stats.totalFiles,
    totalRoutes: stats.totalRoutes,
    routesByMethod: stats.routesByMethod,
    routesByCategory: stats.routesByCategory,
    databaseTablesCount: stats.databaseTables.size,
    filesWithIssues: stats.filesWithIssues.length,
    generatedAt: new Date().toISOString(),
  };

  // Generate markdown report
  console.log('\nGenerating markdown report...');
  const markdown = generateMarkdownReport();
  fs.writeFileSync(OUTPUT_FILE, markdown);
  console.log(`✅ Markdown report saved to: ${OUTPUT_FILE}`);

  // Save JSON data
  console.log('\nGenerating JSON data...');
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(routeData, null, 2));
  console.log(`✅ JSON data saved to: ${OUTPUT_JSON}`);

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Total Files Processed: ${stats.totalFiles}`);
  console.log(`Total Routes Extracted: ${stats.totalRoutes}`);
  console.log(`Database Tables Found: ${stats.databaseTables.size}`);
  console.log(`Files with Issues: ${stats.filesWithIssues.length}`);
  console.log('\n✅ Extraction complete!');
}

// Run the script
main();
