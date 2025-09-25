#!/usr/bin/env node

/**
 * Quick TypeScript Migration Script
 * Run: node quick-migrate.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PRIORITIES = {
  CRITICAL: [
    'src/app.js',
    'src/server.js',
    'src/routes/auth.js',
    'src/routes/users.js',
    'src/routes/games.js',
    'src/routes/assignments.js',
    'src/routes/referees.js',
  ],
  HIGH: [
    'src/middleware/auth.js',
    'src/middleware/errorHandling.js',
    'src/middleware/validation.js',
    'src/config/database.js',
    'src/config/redis.js',
  ],
  MEDIUM: [], // Will be filled with remaining routes
  LOW: []     // Will be filled with test files and utils
};

// Colors for console
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function migrateFile(filePath, addTsNoCheck = false) {
  try {
    const jsFile = filePath;
    const tsFile = filePath.replace('.js', '.ts');

    // Skip if already migrated
    if (fs.existsSync(tsFile)) {
      log(`  ✓ Already migrated: ${path.basename(tsFile)}`, 'yellow');
      return true;
    }

    // Read the JS file
    let content = fs.readFileSync(jsFile, 'utf8');

    // Add @ts-nocheck if requested
    if (addTsNoCheck) {
      content = '// @ts-nocheck\n\n' + content;
    }

    // Basic transformations
    // Convert requires to imports (simple cases)
    content = content.replace(
      /const\s+(\w+)\s*=\s*require\(['"](.+?)['"]\)/g,
      "import $1 from '$2'"
    );

    content = content.replace(
      /const\s*{\s*([^}]+)\s*}\s*=\s*require\(['"](.+?)['"]\)/g,
      "import { $1 } from '$2'"
    );

    // Convert module.exports to export default
    content = content.replace(
      /module\.exports\s*=\s*{/g,
      'export {'
    );

    content = content.replace(
      /module\.exports\s*=\s*/g,
      'export default '
    );

    // Convert exports.something to export const something
    content = content.replace(
      /exports\.(\w+)\s*=\s*async/g,
      'export const $1 = async'
    );

    content = content.replace(
      /exports\.(\w+)\s*=\s*function/g,
      'export function $1'
    );

    content = content.replace(
      /exports\.(\w+)\s*=\s*/g,
      'export const $1 = '
    );

    // Add basic type annotations for common patterns
    if (!addTsNoCheck) {
      // Add types to route handlers
      content = content.replace(
        /async\s*\(\s*req\s*,\s*res\s*,?\s*next?\s*\)/g,
        'async (req: any, res: any, next?: any)'
      );

      // Add types to middleware
      content = content.replace(
        /function\s*\(\s*req\s*,\s*res\s*,\s*next\s*\)/g,
        'function (req: any, res: any, next: any)'
      );
    }

    // Write the TS file
    fs.writeFileSync(tsFile, content);

    // Delete the JS file
    fs.unlinkSync(jsFile);

    log(`  ✓ Migrated: ${path.basename(jsFile)} → ${path.basename(tsFile)}`, 'green');
    return true;
  } catch (error) {
    log(`  ✗ Failed: ${path.basename(filePath)} - ${error.message}`, 'red');
    return false;
  }
}

function getAllJsFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('dist')) {
        traverse(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function categorizeFiles() {
  const allFiles = getAllJsFiles('src');

  // Categorize remaining files
  for (const file of allFiles) {
    const relativePath = path.relative('.', file).replace(/\\/g, '/');

    // Skip if already in critical or high priority
    if (PRIORITIES.CRITICAL.includes(relativePath) ||
        PRIORITIES.HIGH.includes(relativePath)) {
      continue;
    }

    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
      PRIORITIES.LOW.push(relativePath);
    } else if (file.includes('/routes/')) {
      PRIORITIES.MEDIUM.push(relativePath);
    } else {
      PRIORITIES.LOW.push(relativePath);
    }
  }
}

async function main() {
  log('🚀 TypeScript Migration Script', 'green');
  log('================================\n');

  // Check if we're in the backend directory
  if (!fs.existsSync('src')) {
    log('❌ Error: Please run this script from the backend directory', 'red');
    process.exit(1);
  }

  // Categorize all files
  log('📊 Analyzing files...', 'yellow');
  categorizeFiles();

  const stats = {
    critical: PRIORITIES.CRITICAL.length,
    high: PRIORITIES.HIGH.length,
    medium: PRIORITIES.MEDIUM.length,
    low: PRIORITIES.LOW.length,
    total: PRIORITIES.CRITICAL.length + PRIORITIES.HIGH.length +
           PRIORITIES.MEDIUM.length + PRIORITIES.LOW.length
  };

  log(`\nFound ${stats.total} JS files to migrate:`);
  log(`  - Critical: ${stats.critical} files`);
  log(`  - High: ${stats.high} files`);
  log(`  - Medium: ${stats.medium} files`);
  log(`  - Low: ${stats.low} files`);

  // Ask for confirmation
  log('\n⚡ Migration Strategy:', 'yellow');
  log('  1. Critical files: Full migration (with basic types)');
  log('  2. High priority: Full migration (with basic types)');
  log('  3. Medium priority: Migration with @ts-nocheck');
  log('  4. Low priority: Migration with @ts-nocheck');

  log('\nPress Enter to start migration, or Ctrl+C to cancel...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  let migrated = 0;
  let failed = 0;

  // Migrate critical files
  log('\n📌 Migrating CRITICAL files...', 'green');
  for (const file of PRIORITIES.CRITICAL) {
    if (fs.existsSync(file)) {
      if (migrateFile(file, false)) {
        migrated++;
      } else {
        failed++;
      }
    }
  }

  // Migrate high priority files
  log('\n📌 Migrating HIGH priority files...', 'green');
  for (const file of PRIORITIES.HIGH) {
    if (fs.existsSync(file)) {
      if (migrateFile(file, false)) {
        migrated++;
      } else {
        failed++;
      }
    }
  }

  // Migrate medium priority files with @ts-nocheck
  log('\n📌 Migrating MEDIUM priority files (with @ts-nocheck)...', 'yellow');
  for (const file of PRIORITIES.MEDIUM) {
    if (fs.existsSync(file)) {
      if (migrateFile(file, true)) {
        migrated++;
      } else {
        failed++;
      }
    }
  }

  // Migrate low priority files with @ts-nocheck
  log('\n📌 Migrating LOW priority files (with @ts-nocheck)...', 'yellow');
  for (const file of PRIORITIES.LOW) {
    if (fs.existsSync(file)) {
      if (migrateFile(file, true)) {
        migrated++;
      } else {
        failed++;
      }
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'green');
  log(`✅ Migration Complete!`, 'green');
  log(`   Migrated: ${migrated} files`);
  log(`   Failed: ${failed} files`);

  if (failed > 0) {
    log(`\n⚠️  Some files failed to migrate. You may need to handle them manually.`, 'yellow');
  }

  log('\n📝 Next steps:', 'yellow');
  log('  1. Run: npm run build (to check for compilation errors)');
  log('  2. Fix any type errors that appear');
  log('  3. Run: npm run dev (to test the server)');
  log('  4. Test a few endpoints to ensure everything works');
  log('  5. Commit your changes!');
}

// Run the script
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});