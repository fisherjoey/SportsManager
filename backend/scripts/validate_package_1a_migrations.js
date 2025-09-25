#!/usr/bin/env node

/**
 * Validation Script for Package 1A Database Optimization Migrations
 * 
 * This script validates that the three migration files are properly structured
 * and ready for deployment without actually running them against the database.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Package 1A Database Optimization Migrations...\n');

const migrations = [
  '060_performance_indexes.js',
  '061_query_optimization.js', 
  '062_constraint_optimization.js'
];

let allValid = true;

for (const migrationFile of migrations) {
  console.log(`📄 Validating ${migrationFile}...`);
  
  try {
    // Check if file exists
    const filePath = path.join(__dirname, migrationFile);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File ${migrationFile} does not exist`);
      allValid = false;
      continue;
    }
    
    // Load the migration
    const migration = require(filePath);
    
    // Check required functions exist
    if (typeof migration.up !== 'function') {
      console.log(`❌ ${migrationFile}: Missing or invalid 'up' function`);
      allValid = false;
    } else {
      console.log(`✅ ${migrationFile}: Valid 'up' function`);
    }
    
    if (typeof migration.down !== 'function') {
      console.log(`❌ ${migrationFile}: Missing or invalid 'down' function`);
      allValid = false;
    } else {
      console.log(`✅ ${migrationFile}: Valid 'down' function`);
    }
    
    // Check function parameters
    const upParams = migration.up.toString().match(/\(([^)]*)\)/)[1];
    const downParams = migration.down.toString().match(/\(([^)]*)\)/)[1];
    
    if (!upParams.includes('knex')) {
      console.log(`⚠️  ${migrationFile}: 'up' function should accept knex parameter`);
    }
    
    if (!downParams.includes('knex')) {
      console.log(`⚠️  ${migrationFile}: 'down' function should accept knex parameter`);
    }
    
    // Check for async/await or Promise return
    const upCode = migration.up.toString();
    const downCode = migration.down.toString();
    
    if (!upCode.includes('async') && !upCode.includes('return') && !upCode.includes('Promise')) {
      console.log(`⚠️  ${migrationFile}: 'up' function should be async or return a Promise`);
    }
    
    console.log(`✅ ${migrationFile}: Structure validation passed\n`);
    
  } catch (error) {
    console.log(`❌ ${migrationFile}: Failed to load - ${error.message}`);
    allValid = false;
  }
}

// Check file naming convention
console.log('📋 Checking naming conventions...');
for (const migrationFile of migrations) {
  if (!/^\d{3}_[a-z_]+\.js$/.test(migrationFile)) {
    console.log(`⚠️  ${migrationFile}: Doesn't follow standard naming convention`);
  } else {
    console.log(`✅ ${migrationFile}: Follows naming convention`);
  }
}

// Summary
console.log('\n📊 Validation Summary:');
if (allValid) {
  console.log('✅ All Package 1A migrations are valid and ready for deployment');
  console.log('\n🚀 Deployment recommendations:');
  console.log('1. Run migrations during low-traffic periods');
  console.log('2. Monitor database performance after each migration');
  console.log('3. Use "CREATE INDEX CONCURRENTLY" for minimal downtime');
  console.log('4. Have rollback procedures ready');
  console.log('\n📋 Migration order:');
  migrations.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration}`);
  });
  process.exit(0);
} else {
  console.log('❌ Some migrations have validation issues - please review and fix');
  process.exit(1);
}