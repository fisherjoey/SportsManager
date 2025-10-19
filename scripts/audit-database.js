#!/usr/bin/env node
/**
 * Comprehensive Database Audit Script
 *
 * Analyzes database health, structure, performance, and best practices
 * Generates detailed audit report with recommendations
 */

const path = require('path');
const fs = require('fs');

// Use pg from backend node_modules
const pgPath = path.join(__dirname, '..', 'backend', 'node_modules', 'pg');
const { Client } = require(pgPath);

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'sports_management'
};

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'audits');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const client = new Client(DB_CONFIG);

// Audit results storage
const auditResults = {
  timestamp: new Date().toISOString(),
  database: DB_CONFIG.database,
  summary: {
    score: 0,
    critical: [],
    warnings: [],
    recommendations: [],
    passed: []
  },
  details: {}
};

async function runDatabaseAudit() {
  console.log('🔍 Starting Comprehensive Database Audit...\n');

  await client.connect();

  // Run all audit checks
  await auditSchemaStructure();
  await auditDataIntegrity();
  await auditPerformance();
  await auditSecurity();
  await auditMaintenance();
  await auditScalability();
  await auditBestPractices();

  await client.end();

  // Calculate overall score
  calculateScore();

  // Generate reports
  generateMarkdownReport();
  generateJSONReport();

  console.log('\n✅ Database Audit Complete!');
  console.log(`📊 Overall Score: ${auditResults.summary.score}/100`);
  console.log(`🔴 Critical Issues: ${auditResults.summary.critical.length}`);
  console.log(`🟡 Warnings: ${auditResults.summary.warnings.length}`);
  console.log(`📁 Report: ${OUTPUT_DIR}/audit-report.md`);
}

async function auditSchemaStructure() {
  console.log('📐 Auditing Schema Structure...');
  const issues = [];

  // Check for tables without primary keys
  const noPKResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables t
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = t.table_name
          AND tc.constraint_type = 'PRIMARY KEY'
      )
  `);

  if (noPKResult.rows.length > 0) {
    issues.push({
      severity: 'critical',
      message: `${noPKResult.rows.length} tables without primary keys`,
      tables: noPKResult.rows.map(r => r.table_name),
      recommendation: 'Add primary keys to all tables for proper indexing and relationships'
    });
  } else {
    auditResults.summary.passed.push('All tables have primary keys');
  }

  // Check for missing foreign key indexes
  const missingFKIndexes = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.tablename = tc.table_name
          AND i.indexdef LIKE '%' || kcu.column_name || '%'
      )
  `);

  if (missingFKIndexes.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${missingFKIndexes.rows.length} foreign keys without indexes`,
      details: missingFKIndexes.rows,
      recommendation: 'Add indexes on foreign key columns for better join performance'
    });
  } else {
    auditResults.summary.passed.push('All foreign keys have indexes');
  }

  // Check for tables with too many columns
  const wideTablesResult = await client.query(`
    SELECT table_name, COUNT(*) as column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
    HAVING COUNT(*) > 30
    ORDER BY column_count DESC
  `);

  if (wideTablesResult.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${wideTablesResult.rows.length} tables with >30 columns (potential normalization issue)`,
      tables: wideTablesResult.rows,
      recommendation: 'Consider splitting wide tables into related entities'
    });
  }

  // Check for orphaned foreign keys (pointing to non-existent tables/columns)
  const orphanedFKs = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name as referenced_table,
      ccu.column_name as referenced_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = ccu.table_name
          AND c.column_name = ccu.column_name
      )
  `);

  if (orphanedFKs.rows.length > 0) {
    issues.push({
      severity: 'critical',
      message: `${orphanedFKs.rows.length} orphaned foreign keys`,
      details: orphanedFKs.rows,
      recommendation: 'Remove or fix foreign key constraints pointing to non-existent columns'
    });
  }

  auditResults.details.schemaStructure = issues;
  issues.forEach(issue => {
    if (issue.severity === 'critical') auditResults.summary.critical.push(issue.message);
    else if (issue.severity === 'warning') auditResults.summary.warnings.push(issue.message);
  });

  console.log(`  ✓ Found ${issues.length} schema issues`);
}

async function auditDataIntegrity() {
  console.log('🔒 Auditing Data Integrity...');
  const issues = [];

  // Check for nullable foreign keys that should probably be NOT NULL
  const nullableFKs = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      c.is_nullable
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.columns c
      ON c.table_name = tc.table_name
      AND c.column_name = kcu.column_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND c.is_nullable = 'YES'
  `);

  if (nullableFKs.rows.length > 0) {
    issues.push({
      severity: 'info',
      message: `${nullableFKs.rows.length} nullable foreign keys (may be intentional)`,
      count: nullableFKs.rows.length,
      recommendation: 'Review if these foreign keys should be required (NOT NULL)'
    });
  }

  // Check for duplicate indexes
  const duplicateIndexes = await client.query(`
    SELECT
      t.tablename,
      STRING_AGG(t.indexname, ', ') as duplicate_indexes,
      t.indexdef
    FROM pg_indexes t
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.indexdef
    HAVING COUNT(*) > 1
  `);

  if (duplicateIndexes.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${duplicateIndexes.rows.length} duplicate indexes found`,
      details: duplicateIndexes.rows,
      recommendation: 'Remove duplicate indexes to save storage and improve write performance'
    });
  } else {
    auditResults.summary.passed.push('No duplicate indexes found');
  }

  // Check for columns that might need uniqueness constraints
  const potentialUniqueColumns = await client.query(`
    SELECT
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('email', 'username', 'slug', 'code', 'token')
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_name = columns.table_name
          AND kcu.column_name = columns.column_name
      )
  `);

  if (potentialUniqueColumns.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${potentialUniqueColumns.rows.length} columns that might need UNIQUE constraints`,
      details: potentialUniqueColumns.rows,
      recommendation: 'Add UNIQUE constraints to email, username, slug, code, token fields'
    });
  }

  auditResults.details.dataIntegrity = issues;
  issues.forEach(issue => {
    if (issue.severity === 'critical') auditResults.summary.critical.push(issue.message);
    else if (issue.severity === 'warning') auditResults.summary.warnings.push(issue.message);
  });

  console.log(`  ✓ Found ${issues.length} data integrity issues`);
}

async function auditPerformance() {
  console.log('⚡ Auditing Performance...');
  const issues = [];

  try {

  // Check table sizes
  const tableSizes = await client.query(`
    SELECT
      t.schemaname,
      t.tablename,
      pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as size,
      pg_total_relation_size(t.schemaname||'.'||t.tablename) as size_bytes,
      s.n_live_tup
    FROM pg_tables t
    LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
    WHERE t.schemaname = 'public'
    ORDER BY size_bytes DESC
    LIMIT 10
  `);

  auditResults.details.largestTables = tableSizes.rows;

  // Check for tables without indexes (except very small tables and system tables)
  const noIndexes = await client.query(`
    SELECT
      t.tablename,
      pg_size_pretty(pg_total_relation_size(('public.' || t.tablename)::regclass)) as size
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename NOT LIKE 'knex_%'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.tablename = t.tablename
          AND i.schemaname = 'public'
      )
      AND pg_total_relation_size(('public.' || t.tablename)::regclass) > 1024 * 1024
  `);

  if (noIndexes.rows.length > 0) {
    issues.push({
      severity: 'critical',
      message: `${noIndexes.rows.length} tables >1MB without any indexes`,
      details: noIndexes.rows,
      recommendation: 'Add appropriate indexes for query performance'
    });
  }

  // Check for unused indexes
  const unusedIndexes = await client.query(`
    SELECT
      schemaname,
      tablename,
      indexrelname as indexname,
      idx_scan,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND indexrelname NOT LIKE '%_pkey'
    ORDER BY pg_relation_size(indexrelid) DESC
  `);

  if (unusedIndexes.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${unusedIndexes.rows.length} unused indexes (never scanned)`,
      details: unusedIndexes.rows.slice(0, 10),
      recommendation: 'Consider removing unused indexes to improve write performance'
    });
  }

  // Check for sequential scans on large tables
  const seqScans = await client.query(`
    SELECT
      schemaname,
      tablename,
      seq_scan,
      seq_tup_read,
      idx_scan,
      n_live_tup,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND seq_scan > 1000
      AND n_live_tup > 1000
      AND seq_scan > idx_scan * 2
    ORDER BY seq_scan DESC
    LIMIT 10
  `);

  if (seqScans.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${seqScans.rows.length} tables with high sequential scans`,
      details: seqScans.rows,
      recommendation: 'Add indexes to reduce sequential scans on large tables'
    });
  }

  } catch (error) {
    console.log(`  ⚠️  Performance audit had errors: ${error.message}`);
    issues.push({
      severity: 'info',
      message: 'Performance audit partially completed',
      recommendation: 'Some performance checks were skipped due to database version or permissions'
    });
  }

  auditResults.details.performance = issues;
  issues.forEach(issue => {
    if (issue.severity === 'critical') auditResults.summary.critical.push(issue.message);
    else if (issue.severity === 'warning') auditResults.summary.warnings.push(issue.message);
  });

  console.log(`  ✓ Found ${issues.length} performance issues`);
}

async function auditSecurity() {
  console.log('🔐 Auditing Security...');
  const issues = [];

  // Check for columns that should be encrypted (passwords, tokens, etc)
  const sensitiveColumns = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        column_name LIKE '%password%'
        OR column_name LIKE '%token%'
        OR column_name LIKE '%secret%'
        OR column_name LIKE '%api_key%'
      )
      AND data_type NOT LIKE '%bytea%'
  `);

  if (sensitiveColumns.rows.length > 0) {
    const hashColumns = sensitiveColumns.rows.filter(r => r.column_name.includes('hash'));
    const plainColumns = sensitiveColumns.rows.filter(r => !r.column_name.includes('hash'));

    if (hashColumns.length > 0) {
      auditResults.summary.passed.push(`${hashColumns.length} password columns properly named with '_hash'`);
    }

    if (plainColumns.length > 0) {
      issues.push({
        severity: 'warning',
        message: `${plainColumns.length} sensitive columns found (ensure encrypted)`,
        details: plainColumns,
        recommendation: 'Verify these columns store encrypted/hashed values, not plaintext'
      });
    }
  }

  // Check for missing audit columns (created_at, updated_at)
  const missingAuditColumns = await client.query(`
    SELECT table_name
    FROM information_schema.tables t
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'knex_%'
      AND (
        NOT EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_name = t.table_name
            AND c.column_name = 'created_at'
        )
        OR NOT EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_name = t.table_name
            AND c.column_name = 'updated_at'
        )
      )
  `);

  if (missingAuditColumns.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${missingAuditColumns.rows.length} tables without audit timestamps`,
      tables: missingAuditColumns.rows.map(r => r.table_name),
      recommendation: 'Add created_at and updated_at columns for audit trail'
    });
  }

  auditResults.details.security = issues;
  issues.forEach(issue => {
    if (issue.severity === 'critical') auditResults.summary.critical.push(issue.message);
    else if (issue.severity === 'warning') auditResults.summary.warnings.push(issue.message);
  });

  console.log(`  ✓ Found ${issues.length} security issues`);
}

async function auditMaintenance() {
  console.log('🔧 Auditing Maintenance & Health...');
  const issues = [];

  try {
  // Check bloat estimate
  const bloatResult = await client.query(`
    SELECT
      schemaname,
      relname as tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
      n_live_tup,
      n_dead_tup,
      ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_dead_tup > 1000
      AND n_dead_tup > n_live_tup * 0.1
    ORDER BY dead_ratio DESC
  `);

  if (bloatResult.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${bloatResult.rows.length} tables with high dead tuple ratio (>10%)`,
      details: bloatResult.rows,
      recommendation: 'Run VACUUM ANALYZE on these tables'
    });
  } else {
    auditResults.summary.passed.push('All tables have healthy dead tuple ratios');
  }

  // Check last vacuum/analyze times
  const vacuumCheck = await client.query(`
    SELECT
      schemaname,
      relname as tablename,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze,
      n_live_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_live_tup > 100
      AND (
        last_vacuum IS NULL
        AND last_autovacuum IS NULL
        OR (
          COALESCE(last_vacuum, last_autovacuum) < NOW() - INTERVAL '7 days'
          AND n_live_tup > 10000
        )
      )
  `);

  if (vacuumCheck.rows.length > 0) {
    issues.push({
      severity: 'info',
      message: `${vacuumCheck.rows.length} tables not vacuumed recently`,
      count: vacuumCheck.rows.length,
      recommendation: 'Ensure autovacuum is running or schedule manual VACUUM'
    });
  }

  } catch (error) {
    console.log(`  ⚠️  Maintenance audit had errors: ${error.message}`);
  }

  auditResults.details.maintenance = issues;
  issues.forEach(issue => {
    if (issue.severity === 'critical') auditResults.summary.critical.push(issue.message);
    else if (issue.severity === 'warning') auditResults.summary.warnings.push(issue.message);
  });

  console.log(`  ✓ Found ${issues.length} maintenance issues`);
}

async function auditScalability() {
  console.log('📈 Auditing Scalability...');
  const issues = [];

  try {
  // Check for large tables without partitioning
  const largeTables = await client.query(`
    SELECT
      schemaname,
      relname as tablename,
      n_live_tup,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_live_tup > 100000
    ORDER BY n_live_tup DESC
  `);

  if (largeTables.rows.length > 0) {
    issues.push({
      severity: 'info',
      message: `${largeTables.rows.length} tables with >100k rows (consider partitioning)`,
      details: largeTables.rows,
      recommendation: 'Consider table partitioning for tables with >1M rows'
    });
  }

  // Check for JSONB columns without GIN indexes
  const jsonbWithoutGin = await client.query(`
    SELECT
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.data_type = 'jsonb'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.tablename = c.table_name
          AND i.indexdef LIKE '%gin%'
          AND i.indexdef LIKE '%' || c.column_name || '%'
      )
  `);

  if (jsonbWithoutGin.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${jsonbWithoutGin.rows.length} JSONB columns without GIN indexes`,
      details: jsonbWithoutGin.rows,
      recommendation: 'Add GIN indexes on JSONB columns for better query performance'
    });
  }

  } catch (error) {
    console.log(`  ⚠️  Scalability audit had errors: ${error.message}`);
  }

  auditResults.details.scalability = issues;
  issues.forEach(issue => {
    if (issue.severity === 'critical') auditResults.summary.critical.push(issue.message);
    else if (issue.severity === 'warning') auditResults.summary.warnings.push(issue.message);
  });

  console.log(`  ✓ Found ${issues.length} scalability issues`);
}

async function auditBestPractices() {
  console.log('✨ Auditing Best Practices...');
  const issues = [];

  // Check naming conventions
  const namingIssues = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        column_name ~ '[A-Z]'
        OR column_name LIKE '% %'
      )
    LIMIT 20
  `);

  if (namingIssues.rows.length > 0) {
    issues.push({
      severity: 'info',
      message: `${namingIssues.rows.length} columns with non-standard naming (camelCase or spaces)`,
      count: namingIssues.rows.length,
      recommendation: 'Use snake_case for column names (PostgreSQL convention)'
    });
  }

  // Check for boolean columns without default values
  const booleansWithoutDefaults = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'boolean'
      AND column_default IS NULL
      AND is_nullable = 'YES'
  `);

  if (booleansWithoutDefaults.rows.length > 0) {
    issues.push({
      severity: 'info',
      message: `${booleansWithoutDefaults.rows.length} boolean columns without defaults`,
      count: booleansWithoutDefaults.rows.length,
      recommendation: 'Add DEFAULT true/false to boolean columns for clarity'
    });
  }

  // Check for timestamp columns without timezone
  const timestampsWithoutTZ = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone'
      AND (column_name LIKE '%_at' OR column_name LIKE '%time%')
  `);

  if (timestampsWithoutTZ.rows.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${timestampsWithoutTZ.rows.length} timestamp columns without timezone`,
      details: timestampsWithoutTZ.rows,
      recommendation: 'Use TIMESTAMP WITH TIME ZONE for proper timezone handling'
    });
  }

  auditResults.details.bestPractices = issues;
  issues.forEach(issue => {
    if (issue.severity === 'critical') auditResults.summary.critical.push(issue.message);
    else if (issue.severity === 'warning') auditResults.summary.warnings.push(issue.message);
  });

  console.log(`  ✓ Found ${issues.length} best practice issues`);
}

function calculateScore() {
  const critical = auditResults.summary.critical.length;
  const warnings = auditResults.summary.warnings.length;
  const passed = auditResults.summary.passed.length;

  // Scoring: Start at 100, deduct points for issues
  let score = 100;
  score -= critical * 15; // -15 points per critical issue
  score -= warnings * 5;  // -5 points per warning
  score += Math.min(passed * 2, 20); // +2 points per passed check (max +20)

  auditResults.summary.score = Math.max(0, Math.min(100, score));
}

function generateMarkdownReport() {
  const timestamp = new Date().toISOString().split('T')[0];
  let report = `# Database Audit Report\n\n`;
  report += `**Date:** ${auditResults.timestamp}\n`;
  report += `**Database:** ${auditResults.database}\n\n`;

  report += `## Overall Score: ${auditResults.summary.score}/100\n\n`;

  const scoreEmoji = auditResults.summary.score >= 90 ? '🟢' :
                     auditResults.summary.score >= 70 ? '🟡' : '🔴';

  report += `${scoreEmoji} **Health Status:** `;
  if (auditResults.summary.score >= 90) report += 'Excellent\n\n';
  else if (auditResults.summary.score >= 70) report += 'Good\n\n';
  else if (auditResults.summary.score >= 50) report += 'Fair\n\n';
  else report += 'Needs Attention\n\n';

  report += `### Summary\n\n`;
  report += `- 🔴 **Critical Issues:** ${auditResults.summary.critical.length}\n`;
  report += `- 🟡 **Warnings:** ${auditResults.summary.warnings.length}\n`;
  report += `- ✅ **Passed Checks:** ${auditResults.summary.passed.length}\n\n`;

  if (auditResults.summary.critical.length > 0) {
    report += `### 🔴 Critical Issues\n\n`;
    auditResults.summary.critical.forEach((issue, i) => {
      report += `${i + 1}. ${issue}\n`;
    });
    report += `\n`;
  }

  if (auditResults.summary.warnings.length > 0) {
    report += `### 🟡 Warnings\n\n`;
    auditResults.summary.warnings.forEach((issue, i) => {
      report += `${i + 1}. ${issue}\n`;
    });
    report += `\n`;
  }

  // Detailed sections
  for (const [category, issues] of Object.entries(auditResults.details)) {
    if (Array.isArray(issues) && issues.length > 0) {
      report += `## ${category.replace(/([A-Z])/g, ' $1').trim()}\n\n`;

      issues.forEach((issue, i) => {
        report += `### ${i + 1}. ${issue.message}\n\n`;
        report += `**Severity:** ${issue.severity}\n\n`;
        if (issue.recommendation) {
          report += `**Recommendation:** ${issue.recommendation}\n\n`;
        }
        if (issue.tables && issue.tables.length > 0) {
          report += `**Affected Tables:** ${issue.tables.join(', ')}\n\n`;
        }
        if (issue.details && issue.details.length > 0 && issue.details.length <= 5) {
          report += `**Details:**\n\`\`\`json\n${JSON.stringify(issue.details, null, 2)}\n\`\`\`\n\n`;
        } else if (issue.details && issue.details.length > 5) {
          report += `**Details:** ${issue.details.length} items found (see JSON report)\n\n`;
        }
      });
    }
  }

  // Largest tables
  if (auditResults.details.largestTables) {
    report += `## Largest Tables\n\n`;
    report += `| Table | Size | Rows |\n`;
    report += `|-------|------|------|\n`;
    auditResults.details.largestTables.forEach(t => {
      report += `| ${t.tablename} | ${t.size} | ${t.n_live_tup || 'N/A'} |\n`;
    });
    report += `\n`;
  }

  const outputPath = path.join(OUTPUT_DIR, `audit-report-${timestamp}.md`);
  fs.writeFileSync(outputPath, report);
  console.log(`\n📄 Generated: ${outputPath}`);
}

function generateJSONReport() {
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(OUTPUT_DIR, `audit-report-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
  console.log(`📄 Generated: ${outputPath}`);
}

// Run the audit
runDatabaseAudit().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});